-- ============================================================================
-- Affectation du matériel aux clients — quelle machine, à quel coût réel
-- ============================================================================
--
-- Le besoin : deux bornes identiques n'ont pas coûté pareil (1000 € et 950 €).
-- Quand on installe chez un client où il faut être compétitif, on veut choisir
-- CELLE à 950 € — et retrouver ensuite le coût exact de cette installation,
-- pas une moyenne.
--
-- Les colonnes existent déjà sur hardware_units (client_id, deployed_at,
-- sale_price, sold_at). Ce fichier ajoute les gestes et la vue de synthèse.
--
-- Idempotent : réexécutable sans dégât. À passer APRÈS 0001.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Affecter des unités précises à un client
-- ----------------------------------------------------------------------------
--
-- Une seule transaction : les unités changent de statut, sont rattachées au
-- client, reçoivent leur prix de vente réel, et le stock disponible de la
-- référence est décrémenté d'autant.
--
-- p_mode : 'vendu' quand la machine devient la propriété du client,
--          'chez_client' quand elle reste à nous (location, dépôt).

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

  -- On refuse d'affecter une unité déjà placée ailleurs : une machine ne peut
  -- pas être chez deux clients à la fois.
  IF EXISTS (
    SELECT 1 FROM hardware_units
     WHERE id = ANY(p_unit_ids)
       AND status <> 'en_stock'
  ) THEN
    RAISE EXCEPTION 'Une des unités sélectionnées n''est plus en stock.';
  END IF;

  UPDATE hardware_units
     SET client_id   = p_client_id,
         status      = p_mode,
         deployed_at = p_date,
         sale_price  = COALESCE(p_sale_price, sale_price),
         sold_at     = CASE WHEN p_mode = 'vendu' THEN p_date ELSE sold_at END
   WHERE id = ANY(p_unit_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Le stock disponible de chaque référence suit le départ des machines.
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
-- 2. Reprendre une unité — retour au stock
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION release_hardware_unit(p_unit_id VARCHAR)
RETURNS VOID AS $$
DECLARE
  v_product_id VARCHAR;
BEGIN
  SELECT product_id INTO v_product_id FROM hardware_units WHERE id = p_unit_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unité introuvable : %', p_unit_id;
  END IF;

  UPDATE hardware_units
     SET client_id   = NULL,
         status      = 'en_stock',
         deployed_at = NULL,
         sale_price  = NULL,
         sold_at     = NULL
   WHERE id = p_unit_id;

  UPDATE products
     SET stock_actuel = COALESCE(stock_actuel, 0) + 1,
         quantity     = COALESCE(stock_actuel, 0) + 1
   WHERE id = v_product_id;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 3. Ce que chaque client nous coûte réellement
-- ----------------------------------------------------------------------------
--
-- Le coût est la somme des coûts de lot des machines effectivement posées
-- chez lui — pas une moyenne, pas le prix catalogue.

CREATE OR REPLACE VIEW client_hardware_costs AS
SELECT
  u.client_id,
  COUNT(*)                                              AS units_count,
  SUM(l.unit_cost)                                      AS hardware_cost_real,
  SUM(COALESCE(u.sale_price, 0))                        AS hardware_revenue,
  SUM(COALESCE(u.sale_price, 0)) - SUM(l.unit_cost)     AS hardware_margin,
  COUNT(*) FILTER (WHERE u.status = 'vendu')            AS units_sold,
  COUNT(*) FILTER (WHERE u.status = 'chez_client')      AS units_on_loan
FROM hardware_units u
JOIN hardware_lots l ON l.id = u.lot_id
WHERE u.client_id IS NOT NULL
  AND u.status IN ('vendu', 'chez_client')
GROUP BY u.client_id;

COMMENT ON VIEW client_hardware_costs IS
  'Coût de revient réel du matériel posé chez chaque client, et marge dégagée dessus.';

-- ----------------------------------------------------------------------------
-- 4. Les unités disponibles, de la moins chère à la plus chère
-- ----------------------------------------------------------------------------
--
-- L'ordre est le geste métier : quand il faut être compétitif, on propose
-- d'abord la machine qui nous a coûté le moins cher.

CREATE OR REPLACE VIEW available_hardware_units AS
SELECT
  u.id,
  u.product_id,
  u.lot_id,
  u.asset_tag,
  u.serial_number,
  p.code        AS product_code,
  p.name        AS product_name,
  l.unit_cost,
  l.received_at,
  l.supplier
FROM hardware_units u
JOIN hardware_lots l ON l.id = u.lot_id
JOIN products p      ON p.id = u.product_id
WHERE u.status = 'en_stock'
ORDER BY u.product_id, l.unit_cost ASC, u.asset_tag ASC;

COMMENT ON VIEW available_hardware_units IS
  'Les machines en stock, la moins chère en premier : c''est celle qu''on propose quand il faut serrer le prix.';
