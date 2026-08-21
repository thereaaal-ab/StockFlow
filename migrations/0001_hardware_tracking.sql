-- ============================================================================
-- Suivi du matériel à l'unité — lots d'acquisition et unités physiques
-- ============================================================================
--
-- Le problème résolu : `products.purchase_price` était unique par référence.
-- Recevoir 3 bornes à 1200 € après en avoir acheté 10 à 1000 € écrasait le
-- coût des dix premières. Le coût est une propriété de l'ACHAT, pas de la
-- référence : il descend donc sur le lot, et chaque machine physique remonte
-- à son lot.
--
-- Idempotent : réexécutable sans dégât.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Produits : le drapeau de suivi et le compteur d'étiquettes
-- ----------------------------------------------------------------------------

-- Suivi à l'unité : vrai pour une borne ou un POS (on colle un ID dessus),
-- faux pour un câble ou une multiprise (on compte, on n'étiquette pas).
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS tracked_by_unit BOOLEAN NOT NULL DEFAULT FALSE;

-- Préfixe des numéros d'inventaire de la référence : BRN -> BRN-0042.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS asset_prefix VARCHAR(8);

-- Dernier numéro attribué pour cette référence. Incrémenté sous verrou de
-- ligne par receive_hardware_lot() : deux réceptions simultanées ne peuvent
-- pas produire deux fois la même étiquette.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS unit_counter INTEGER NOT NULL DEFAULT 0;

-- Préfixe par défaut : les trois premières lettres du code produit.
UPDATE products
SET asset_prefix = UPPER(SUBSTRING(REGEXP_REPLACE(code, '[^A-Za-z0-9]', '', 'g') FROM 1 FOR 3))
WHERE asset_prefix IS NULL;

-- ----------------------------------------------------------------------------
-- 2. Lots d'acquisition — c'est ici que vit le coût
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hardware_lots (
  id            VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    VARCHAR NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- La commande qui a fait entrer le lot, si elle existe dans le kanban.
  order_id      VARCHAR REFERENCES orders(id) ON DELETE SET NULL,
  supplier      TEXT,

  quantity      INTEGER NOT NULL CHECK (quantity > 0),

  -- Coût de revient réel d'une unité de ce lot, transport et douane inclus.
  -- C'est la valeur saisie telle quelle : 1000 € pour le premier lot,
  -- 1200 € pour le suivant si l'avion a coûté cher.
  unit_cost     NUMERIC(12, 2) NOT NULL CHECK (unit_cost >= 0),

  received_at   DATE NOT NULL DEFAULT CURRENT_DATE,
  reference     TEXT,   -- n° de facture ou de bon de livraison
  notes         TEXT,   -- « +200 €/unité de fret aérien », par exemple

  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE hardware_lots IS
  'Une réception de matériel à un coût donné. Le coût unitaire est figé : il ne bouge plus jamais après coup.';

CREATE INDEX IF NOT EXISTS idx_hardware_lots_product_id  ON hardware_lots(product_id);
CREATE INDEX IF NOT EXISTS idx_hardware_lots_order_id    ON hardware_lots(order_id);
CREATE INDEX IF NOT EXISTS idx_hardware_lots_received_at ON hardware_lots(received_at DESC);

-- ----------------------------------------------------------------------------
-- 3. Unités physiques — une ligne par machine, une étiquette par ligne
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hardware_units (
  id             VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     VARCHAR NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  lot_id         VARCHAR NOT NULL REFERENCES hardware_lots(id) ON DELETE CASCADE,

  -- Le numéro collé sur la machine. Unique dans tout le parc.
  asset_tag      VARCHAR(32) NOT NULL UNIQUE,
  -- Le numéro de série du constructeur, saisi plus tard s'il est utile.
  serial_number  TEXT,

  status         VARCHAR(20) NOT NULL DEFAULT 'en_stock'
    CHECK (status IN ('en_stock', 'chez_client', 'vendu', 'sav', 'hs')),

  client_id      VARCHAR REFERENCES clients(id) ON DELETE SET NULL,
  deployed_at    DATE,

  -- Le prix réel de la vente, saisi au moment où elle se fait. NULL tant que
  -- l'unité n'est pas vendue.
  sale_price     NUMERIC(12, 2) CHECK (sale_price IS NULL OR sale_price >= 0),
  sold_at        DATE,

  notes          TEXT,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE hardware_units IS
  'Une machine physique. Son coût se lit sur son lot, son prix de vente sur elle-même.';
COMMENT ON COLUMN hardware_units.asset_tag IS
  'Numéro d''inventaire imprimé et collé sur la machine (ex. BRN-0042).';

CREATE INDEX IF NOT EXISTS idx_hardware_units_product_id ON hardware_units(product_id);
CREATE INDEX IF NOT EXISTS idx_hardware_units_lot_id     ON hardware_units(lot_id);
CREATE INDEX IF NOT EXISTS idx_hardware_units_status     ON hardware_units(status);
CREATE INDEX IF NOT EXISTS idx_hardware_units_client_id  ON hardware_units(client_id);

-- ----------------------------------------------------------------------------
-- 4. updated_at automatique
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_hardware_lots_updated_at ON hardware_lots;
CREATE TRIGGER update_hardware_lots_updated_at
  BEFORE UPDATE ON hardware_lots
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS update_hardware_units_updated_at ON hardware_units;
CREATE TRIGGER update_hardware_units_updated_at
  BEFORE UPDATE ON hardware_units
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ----------------------------------------------------------------------------
-- 5. Réception d'un lot — le lot et ses étiquettes, en une transaction
-- ----------------------------------------------------------------------------
--
-- Réceptionner 10 bornes à 1000 € crée le lot ET les 10 unités numérotées.
-- Le verrou de ligne sur products garantit qu'aucune étiquette n'est
-- attribuée deux fois, même si deux réceptions partent en même temps.

CREATE OR REPLACE FUNCTION receive_hardware_lot(
  p_product_id  VARCHAR,
  p_quantity    INTEGER,
  p_unit_cost   NUMERIC,
  p_supplier    TEXT    DEFAULT NULL,
  p_order_id    VARCHAR DEFAULT NULL,
  p_received_at DATE    DEFAULT CURRENT_DATE,
  p_reference   TEXT    DEFAULT NULL,
  p_notes       TEXT    DEFAULT NULL
)
RETURNS hardware_lots AS $$
DECLARE
  v_lot      hardware_lots;
  v_tracked  BOOLEAN;
  v_prefix   VARCHAR(8);
  v_start    INTEGER;
  i          INTEGER;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'La quantité reçue doit être supérieure à zéro.';
  END IF;

  -- Verrou : le compteur d'étiquettes ne peut pas être lu par deux
  -- réceptions concurrentes avant d'être incrémenté.
  SELECT tracked_by_unit,
         COALESCE(asset_prefix,
                  UPPER(SUBSTRING(REGEXP_REPLACE(code, '[^A-Za-z0-9]', '', 'g') FROM 1 FOR 3))),
         unit_counter
    INTO v_tracked, v_prefix, v_start
    FROM products
   WHERE id = p_product_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produit introuvable : %', p_product_id;
  END IF;

  INSERT INTO hardware_lots (
    product_id, order_id, supplier, quantity, unit_cost, received_at, reference, notes
  ) VALUES (
    p_product_id, p_order_id, p_supplier, p_quantity, p_unit_cost, p_received_at, p_reference, p_notes
  )
  RETURNING * INTO v_lot;

  -- Une ligne et une étiquette par machine, uniquement si la référence est
  -- suivie à l'unité. Sinon le lot suffit : on compte, on n'étiquette pas.
  IF v_tracked THEN
    FOR i IN 1..p_quantity LOOP
      INSERT INTO hardware_units (product_id, lot_id, asset_tag)
      VALUES (
        p_product_id,
        v_lot.id,
        v_prefix || '-' || LPAD((v_start + i)::TEXT, 4, '0')
      );
    END LOOP;

    UPDATE products
       SET unit_counter = v_start + p_quantity,
           asset_prefix = v_prefix
     WHERE id = p_product_id;
  END IF;

  -- Le stock consolidé de la fiche produit suit la réception.
  UPDATE products
     SET hardware_total = COALESCE(hardware_total, 0) + p_quantity,
         stock_actuel   = COALESCE(stock_actuel, 0) + p_quantity,
         quantity       = COALESCE(stock_actuel, 0) + p_quantity
   WHERE id = p_product_id;

  RETURN v_lot;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 6. La vue consolidée de Hardware Total
-- ----------------------------------------------------------------------------
--
-- Par référence : ce qu'on possède, ce qui est disponible, ce que ça a coûté,
-- et la fourchette de coût quand plusieurs lots ne valaient pas le même prix.

CREATE OR REPLACE VIEW hardware_summary AS
WITH lot_stats AS (
  SELECT product_id,
         SUM(quantity)                        AS lots_quantity,
         SUM(quantity * unit_cost)            AS total_invested,
         MIN(unit_cost)                       AS unit_cost_min,
         MAX(unit_cost)                       AS unit_cost_max,
         COUNT(*)                             AS lot_count,
         MAX(received_at)                     AS last_received_at
    FROM hardware_lots
   GROUP BY product_id
),
unit_stats AS (
  SELECT product_id,
         COUNT(*)                                              AS units_total,
         COUNT(*) FILTER (WHERE status = 'en_stock')            AS units_in_stock,
         COUNT(*) FILTER (WHERE status = 'chez_client')         AS units_deployed,
         COUNT(*) FILTER (WHERE status = 'vendu')               AS units_sold,
         COUNT(*) FILTER (WHERE status IN ('sav', 'hs'))        AS units_out_of_service
    FROM hardware_units
   GROUP BY product_id
)
SELECT
  p.id                                   AS product_id,
  p.code,
  p.name,
  p.category_id,
  p.tracked_by_unit,
  p.asset_prefix,

  -- Suivi à l'unité : la vérité, c'est le compte des machines. Sinon, c'est
  -- la somme des lots, avec repli sur les compteurs historiques de la fiche.
  COALESCE(u.units_total, l.lots_quantity, p.hardware_total, 0)      AS quantity_total,
  COALESCE(u.units_in_stock, p.stock_actuel, 0)                      AS quantity_in_stock,
  COALESCE(u.units_deployed, 0)                                      AS quantity_deployed,
  COALESCE(u.units_sold, 0)                                          AS quantity_sold,
  COALESCE(u.units_out_of_service, 0)                                AS quantity_out_of_service,

  COALESCE(l.lot_count, 0)                                           AS lot_count,
  l.last_received_at,
  l.unit_cost_min,
  l.unit_cost_max,

  -- Coût moyen pondéré par les quantités de chaque lot. Repli sur le prix
  -- d'achat historique de la fiche tant qu'aucun lot n'a été saisi.
  CASE
    WHEN COALESCE(l.lots_quantity, 0) > 0
      THEN ROUND(l.total_invested / l.lots_quantity, 2)
    ELSE p.purchase_price
  END                                                                AS unit_cost_avg,

  COALESCE(
    l.total_invested,
    COALESCE(p.hardware_total, 0) * COALESCE(p.purchase_price, 0)
  )                                                                  AS total_invested
FROM products p
LEFT JOIN lot_stats  l ON l.product_id = p.id
LEFT JOIN unit_stats u ON u.product_id = p.id;

COMMENT ON VIEW hardware_summary IS
  'Vue consolidée de Hardware Total : quantités, coût moyen pondéré et fourchette de coût par référence.';

-- ----------------------------------------------------------------------------
-- 7. RLS — même politique que le reste du schéma
-- ----------------------------------------------------------------------------

ALTER TABLE hardware_lots  ENABLE ROW LEVEL SECURITY;
ALTER TABLE hardware_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on hardware_lots" ON hardware_lots;
CREATE POLICY "Allow all operations on hardware_lots" ON hardware_lots
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on hardware_units" ON hardware_units;
CREATE POLICY "Allow all operations on hardware_units" ON hardware_units
  FOR ALL USING (true) WITH CHECK (true);
