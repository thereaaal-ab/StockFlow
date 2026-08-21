-- ============================================================================
-- Devis — ce que le client paie, et quelles machines on lui donne
-- ============================================================================
--
-- Un devis Rushorder a trois blocs, chacun avec un rôle économique distinct :
--   · initial   — encaissement unique : services et starter pack
--   · equipment — matériel non éligible au leasing, acheté puis revendu
--   · monthly   — licences ET matériel en leasing
--
-- Le matériel en leasing reste NOTRE propriété : on l'a payé, on le récupère
-- sur les mensualités. C'est là que se joue le retour sur investissement.
--
-- Tous les montants sont HORS TAXES. La TVA n'est ni un gain ni un coût :
-- la compter fausserait la marge. Le taux est stocké pour l'affichage.
--
-- Idempotent. À passer APRÈS 0001 à 0004.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Une machine peut être réservée pour un devis
-- ----------------------------------------------------------------------------
--
-- Sans cet état, on peut promettre la même borne à deux prospects et s'en
-- apercevoir à la livraison. Une machine réservée sort du stock disponible
-- sans être encore sortie du stock physique.

ALTER TABLE hardware_units DROP CONSTRAINT IF EXISTS hardware_units_status_check;
ALTER TABLE hardware_units ADD CONSTRAINT hardware_units_status_check
  CHECK (status IN ('en_stock', 'reserve', 'chez_client', 'vendu', 'sav', 'hs'));

-- ----------------------------------------------------------------------------
-- 2. Le devis
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS quotes (
  id             VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number   TEXT UNIQUE,

  -- Le prospect du pipeline dont ce devis est issu.
  crm_client_id  VARCHAR REFERENCES crm_clients(id) ON DELETE SET NULL,
  -- Rempli à l'acceptation : le client créé à partir de ce devis.
  client_id      VARCHAR REFERENCES clients(id) ON DELETE SET NULL,

  client_name    TEXT NOT NULL,
  contact        TEXT,
  vat_number     TEXT,

  mode           VARCHAR(16) NOT NULL DEFAULT 'leasing'
    CHECK (mode IN ('achat', 'leasing')),
  status         VARCHAR(16) NOT NULL DEFAULT 'brouillon'
    CHECK (status IN ('brouillon', 'envoye', 'accepte', 'refuse')),

  vat_rate       NUMERIC(5, 2) NOT NULL DEFAULT 21.00,
  issued_on      DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until    DATE,
  notes          TEXT,

  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_crm_client_id ON quotes(crm_client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id     ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status        ON quotes(status);

-- ----------------------------------------------------------------------------
-- 3. Les lignes
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS quote_lines (
  id           VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id     VARCHAR NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,

  block        VARCHAR(16) NOT NULL
    CHECK (block IN ('initial', 'equipment', 'monthly')),
  position     INTEGER NOT NULL DEFAULT 0,

  description  TEXT NOT NULL,
  -- Les lignes de service (« Création du Menu ») n'ont pas de référence :
  -- elles ne consomment pas de stock et n'ouvrent pas le choix des machines.
  product_id   VARCHAR REFERENCES products(id) ON DELETE SET NULL,

  quantity     INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price   NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  discount_pct NUMERIC(5, 2) NOT NULL DEFAULT 0
    CHECK (discount_pct >= 0 AND discount_pct <= 100),
  -- « 12 mois », « Permanent » : porté par le devis, pas par le calcul.
  discount_note TEXT,

  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_lines_quote_id   ON quote_lines(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_lines_product_id ON quote_lines(product_id);

COMMENT ON COLUMN quote_lines.unit_price IS 'Prix unitaire HORS TAXES avant remise.';

-- ----------------------------------------------------------------------------
-- 4. Les machines réservées pour une ligne
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS quote_line_units (
  quote_line_id VARCHAR NOT NULL REFERENCES quote_lines(id) ON DELETE CASCADE,
  unit_id       VARCHAR NOT NULL REFERENCES hardware_units(id) ON DELETE CASCADE,
  PRIMARY KEY (quote_line_id, unit_id),
  -- Une machine ne peut être réservée que par un seul devis à la fois.
  UNIQUE (unit_id)
);

-- ----------------------------------------------------------------------------
-- 5. Réserver et libérer
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION reserve_quote_units(
  p_line_id  VARCHAR,
  p_unit_ids VARCHAR[]
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- On libère d'abord les machines précédemment réservées pour cette ligne
  -- et qui ne sont plus dans la sélection.
  UPDATE hardware_units
     SET status = 'en_stock'
   WHERE id IN (
     SELECT unit_id FROM quote_line_units
      WHERE quote_line_id = p_line_id
        AND NOT (unit_id = ANY(p_unit_ids))
   )
     AND status = 'reserve';

  DELETE FROM quote_line_units
   WHERE quote_line_id = p_line_id
     AND NOT (unit_id = ANY(p_unit_ids));

  IF array_length(p_unit_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  IF EXISTS (
    SELECT 1 FROM hardware_units
     WHERE id = ANY(p_unit_ids)
       AND status NOT IN ('en_stock', 'reserve')
  ) THEN
    RAISE EXCEPTION 'Une des machines sélectionnées n''est plus disponible.';
  END IF;

  INSERT INTO quote_line_units (quote_line_id, unit_id)
  SELECT p_line_id, u FROM unnest(p_unit_ids) AS u
  ON CONFLICT (unit_id) DO NOTHING;

  UPDATE hardware_units
     SET status = 'reserve'
   WHERE id = ANY(p_unit_ids)
     AND status = 'en_stock';

  SELECT COUNT(*) INTO v_count FROM quote_line_units WHERE quote_line_id = p_line_id;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

/* Libère toutes les machines d'un devis : refus, ou retour en brouillon. */
CREATE OR REPLACE FUNCTION release_quote_units(p_quote_id VARCHAR)
RETURNS VOID AS $$
BEGIN
  UPDATE hardware_units
     SET status = 'en_stock'
   WHERE status = 'reserve'
     AND id IN (
       SELECT qlu.unit_id
         FROM quote_line_units qlu
         JOIN quote_lines ql ON ql.id = qlu.quote_line_id
        WHERE ql.quote_id = p_quote_id
     );

  DELETE FROM quote_line_units
   WHERE quote_line_id IN (SELECT id FROM quote_lines WHERE quote_id = p_quote_id);
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 6. Une machine réservée peut être affectée à un client
-- ----------------------------------------------------------------------------
--
-- `assign_hardware_units` exigeait « en_stock ». Un devis accepté affecte des
-- machines réservées : on accepte donc les deux états. Le stock disponible
-- n'a pas été décrémenté à la réservation, il l'est bien ici, une seule fois.

CREATE OR REPLACE FUNCTION assign_hardware_units(
  p_unit_ids    VARCHAR[],
  p_client_id   VARCHAR,
  p_mode        VARCHAR DEFAULT 'chez_client',
  p_sale_price  NUMERIC DEFAULT NULL,
  p_date        DATE    DEFAULT CURRENT_DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_mode NOT IN ('vendu', 'chez_client') THEN
    RAISE EXCEPTION 'Mode d''affectation inconnu : %', p_mode;
  END IF;

  IF EXISTS (
    SELECT 1 FROM hardware_units
     WHERE id = ANY(p_unit_ids)
       AND status NOT IN ('en_stock', 'reserve')
  ) THEN
    RAISE EXCEPTION 'Une des unités sélectionnées n''est plus disponible.';
  END IF;

  UPDATE hardware_units
     SET client_id   = p_client_id,
         status      = p_mode,
         deployed_at = p_date,
         sale_price  = COALESCE(p_sale_price, sale_price),
         sold_at     = CASE WHEN p_mode = 'vendu' THEN p_date ELSE sold_at END
   WHERE id = ANY(p_unit_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE products p
     SET stock_actuel = GREATEST(0, COALESCE(p.stock_actuel, 0) - sub.n),
         quantity     = GREATEST(0, COALESCE(p.stock_actuel, 0) - sub.n)
    FROM (
      SELECT product_id, COUNT(*) AS n
        FROM hardware_units
       WHERE id = ANY(p_unit_ids)
       GROUP BY product_id
    ) sub
   WHERE p.id = sub.product_id;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 7. Les totaux du devis, par bloc
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW quote_totals AS
SELECT
  q.id AS quote_id,
  COALESCE(SUM(l.quantity * l.unit_price * (1 - l.discount_pct / 100))
           FILTER (WHERE l.block = 'initial'), 0)   AS total_initial_ht,
  COALESCE(SUM(l.quantity * l.unit_price * (1 - l.discount_pct / 100))
           FILTER (WHERE l.block = 'equipment'), 0) AS total_equipment_ht,
  COALESCE(SUM(l.quantity * l.unit_price * (1 - l.discount_pct / 100))
           FILTER (WHERE l.block = 'monthly'), 0)   AS total_monthly_ht,
  COUNT(l.id)                                       AS line_count
FROM quotes q
LEFT JOIN quote_lines l ON l.quote_id = q.id
GROUP BY q.id;

COMMENT ON VIEW quote_totals IS
  'Totaux HORS TAXES par bloc, remises par ligne appliquées.';

-- ----------------------------------------------------------------------------
-- 8. Les machines réservées comptent dans le consolidé
-- ----------------------------------------------------------------------------
--
-- Une machine réservée est physiquement là mais n'est plus disponible :
-- la noyer dans « en stock » ferait promettre deux fois la même borne.

DROP VIEW IF EXISTS hardware_summary;

CREATE VIEW hardware_summary AS
WITH lot_stats AS (
  SELECT product_id,
         SUM(quantity)             AS lots_quantity,
         SUM(quantity * unit_cost) AS total_invested,
         MIN(unit_cost)            AS unit_cost_min,
         MAX(unit_cost)            AS unit_cost_max,
         COUNT(*)                  AS lot_count,
         MAX(received_at)          AS last_received_at
    FROM hardware_lots
   GROUP BY product_id
),
unit_stats AS (
  SELECT product_id,
         COUNT(*)                                        AS units_total,
         COUNT(*) FILTER (WHERE status = 'en_stock')      AS units_in_stock,
         COUNT(*) FILTER (WHERE status = 'reserve')       AS units_reserved,
         COUNT(*) FILTER (WHERE status = 'chez_client')   AS units_deployed,
         COUNT(*) FILTER (WHERE status = 'vendu')         AS units_sold,
         COUNT(*) FILTER (WHERE status IN ('sav', 'hs'))  AS units_out_of_service
    FROM hardware_units
   GROUP BY product_id
)
SELECT
  p.id AS product_id,
  p.code,
  p.name,
  p.category_id,
  p.tracked_by_unit,
  p.asset_prefix,
  COALESCE(u.units_total, l.lots_quantity, p.hardware_total, 0)  AS quantity_total,
  COALESCE(u.units_in_stock, p.stock_actuel, 0)                  AS quantity_in_stock,
  COALESCE(u.units_deployed, 0)                                  AS quantity_deployed,
  COALESCE(u.units_sold, 0)                                      AS quantity_sold,
  COALESCE(u.units_out_of_service, 0)                            AS quantity_out_of_service,
  COALESCE(l.lot_count, 0)                                       AS lot_count,
  l.last_received_at,
  l.unit_cost_min,
  l.unit_cost_max,
  CASE
    WHEN COALESCE(l.lots_quantity, 0) > 0
      THEN ROUND(l.total_invested / l.lots_quantity, 2)
    ELSE p.purchase_price
  END                                                            AS unit_cost_avg,
  COALESCE(
    l.total_invested,
    COALESCE(p.hardware_total, 0) * COALESCE(p.purchase_price, 0)
  )                                                              AS total_invested,
  COALESCE(u.units_reserved, 0)                                  AS quantity_reserved
FROM products p
LEFT JOIN lot_stats  l ON l.product_id = p.id
LEFT JOIN unit_stats u ON u.product_id = p.id;

-- ----------------------------------------------------------------------------
-- 9. Déclencheurs et RLS
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS update_quotes_updated_at ON quotes;
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS update_quote_lines_updated_at ON quote_lines;
CREATE TRIGGER update_quote_lines_updated_at
  BEFORE UPDATE ON quote_lines
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE quotes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_lines      ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on quotes" ON quotes;
CREATE POLICY "Allow all operations on quotes" ON quotes
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on quote_lines" ON quote_lines;
CREATE POLICY "Allow all operations on quote_lines" ON quote_lines
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on quote_line_units" ON quote_line_units;
CREATE POLICY "Allow all operations on quote_line_units" ON quote_line_units
  FOR ALL USING (true) WITH CHECK (true);
