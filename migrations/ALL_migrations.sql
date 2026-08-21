-- ==========================================================================
-- StockFlow — migrations 0001 à 0005, dans l'ordre.
--
-- À coller dans Supabase → SQL Editor → New query → Run.
--
-- POUR TESTER SANS RIEN ÉCRIRE : décommentez le BEGIN ci-dessous et le
-- ROLLBACK tout en bas. Postgres exécutera tout puis annulera. Si aucune
-- erreur n'apparaît, recommentez les deux lignes et relancez pour de bon.
-- ==========================================================================

-- BEGIN;


-- ========================================================================
-- FICHIER : migrations/0001_hardware_tracking.sql
-- ========================================================================

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


-- ========================================================================
-- FICHIER : migrations/0002_client_hardware.sql
-- ========================================================================

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


-- ========================================================================
-- FICHIER : migrations/0003_order_reception.sql
-- ========================================================================

-- ============================================================================
-- La commande alimente le matériel — réception d'une commande en un geste
-- ============================================================================
--
-- Le flux voulu : on commande 10 bornes pour un prix TOTAL. Le coût unitaire
-- se déduit (total ÷ quantité). Quand la carte passe en « Reçu », le lot est
-- créé, les machines sont numérotées, et le stock monte. Commandes est le
-- point d'entrée ; Hardware Total en est la conséquence.
--
-- Un kanban invite à re-glisser une carte par erreur : la réception est donc
-- IDEMPOTENTE (deux passages en « Reçu » ne créent pas deux lots) et
-- réversible tant qu'aucune machine n'est partie.
--
-- Idempotent. À passer APRÈS 0001 et 0002.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. La commande sait ce qu'elle commande, et si elle a déjà été reçue
-- ----------------------------------------------------------------------------

-- Sans référence catalogue, une commande ne peut pas alimenter le stock :
-- `item` est du texte libre, on ne sait pas quel produit incrémenter.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS product_id VARCHAR REFERENCES products(id) ON DELETE SET NULL;

-- Le garde-fou anti-doublon : rempli à la réception, il interdit d'en créer
-- une deuxième.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS received_lot_id VARCHAR REFERENCES hardware_lots(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);

COMMENT ON COLUMN orders.product_id IS
  'Référence catalogue commandée. Obligatoire pour que la réception alimente le stock.';
COMMENT ON COLUMN orders.received_lot_id IS
  'Lot créé à la réception. Non nul = déjà reçue : une seconde réception est refusée.';

-- ----------------------------------------------------------------------------
-- 2. Réceptionner une commande
-- ----------------------------------------------------------------------------
--
-- Le coût unitaire est déduit du prix total : c'est la saisie naturelle quand
-- on paie une facture globale pour dix machines.

CREATE OR REPLACE FUNCTION receive_order(
  p_order_id    VARCHAR,
  p_received_at DATE DEFAULT CURRENT_DATE
)
RETURNS hardware_lots AS $$
DECLARE
  v_order     orders;
  v_lot       hardware_lots;
  v_unit_cost NUMERIC(12, 2);
BEGIN
  -- Verrou : deux passages simultanés en « Reçu » ne peuvent pas créer
  -- deux lots pour la même commande.
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable : %', p_order_id;
  END IF;

  -- Déjà reçue : on rend le lot existant sans rien recréer. Re-glisser la
  -- carte dans « Reçu » ne double donc pas le stock.
  IF v_order.received_lot_id IS NOT NULL THEN
    SELECT * INTO v_lot FROM hardware_lots WHERE id = v_order.received_lot_id;
    RETURN v_lot;
  END IF;

  IF v_order.product_id IS NULL THEN
    RAISE EXCEPTION
      'Cette commande n''est reliée à aucune référence du catalogue : impossible de savoir quel stock alimenter.';
  END IF;

  IF v_order.total_price IS NULL OR v_order.total_price <= 0 THEN
    RAISE EXCEPTION
      'Le prix total de la commande est manquant : le coût unitaire ne peut pas être calculé.';
  END IF;

  -- Le point d'entrée du coût : le total payé, divisé par la quantité.
  -- Arrondi au centime ; le reliquat éventuel de quelques centimes sur le
  -- total du lot est le prix de cet arrondi et reste noté dans la commande.
  v_unit_cost := ROUND(v_order.total_price / v_order.quantity, 2);

  v_lot := receive_hardware_lot(
    v_order.product_id,
    v_order.quantity,
    v_unit_cost,
    v_order.supplier,
    v_order.id,
    p_received_at,
    NULL,
    v_order.notes
  );

  UPDATE orders
     SET received_lot_id = v_lot.id,
         status          = 'recu'
   WHERE id = p_order_id;

  RETURN v_lot;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 3. Annuler une réception — pour la carte glissée par erreur
-- ----------------------------------------------------------------------------
--
-- On refuse d'annuler si une machine du lot a déjà quitté le stock : elle est
-- chez un client, la supprimer effacerait une donnée vraie.

CREATE OR REPLACE FUNCTION unreceive_order(p_order_id VARCHAR)
RETURNS VOID AS $$
DECLARE
  v_order   orders;
  v_lot     hardware_lots;
  v_gone    INTEGER;
  v_tracked BOOLEAN;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable : %', p_order_id;
  END IF;

  IF v_order.received_lot_id IS NULL THEN
    RETURN;  -- rien à annuler
  END IF;

  SELECT * INTO v_lot FROM hardware_lots WHERE id = v_order.received_lot_id;

  SELECT COUNT(*) INTO v_gone
    FROM hardware_units
   WHERE lot_id = v_order.received_lot_id
     AND status <> 'en_stock';

  IF v_gone > 0 THEN
    RAISE EXCEPTION
      'Impossible d''annuler la réception : % machine(s) de ce lot ont déjà quitté le stock.', v_gone;
  END IF;

  SELECT tracked_by_unit INTO v_tracked FROM products WHERE id = v_lot.product_id;

  -- Rendre le compteur d'étiquettes : les numéros libérés seront réattribués
  -- à la prochaine réception plutôt que laissés en trou.
  IF v_tracked THEN
    UPDATE products
       SET unit_counter = GREATEST(0, unit_counter - v_lot.quantity)
     WHERE id = v_lot.product_id;
  END IF;

  UPDATE products
     SET hardware_total = GREATEST(0, COALESCE(hardware_total, 0) - v_lot.quantity),
         stock_actuel   = GREATEST(0, COALESCE(stock_actuel, 0) - v_lot.quantity),
         quantity       = GREATEST(0, COALESCE(stock_actuel, 0) - v_lot.quantity)
   WHERE id = v_lot.product_id;

  -- Les unités partent avec le lot (ON DELETE CASCADE).
  DELETE FROM hardware_lots WHERE id = v_order.received_lot_id;

  UPDATE orders SET received_lot_id = NULL WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql;


-- ========================================================================
-- FICHIER : migrations/0004_resale_tag.sql
-- ========================================================================

-- ============================================================================
-- Distinguer un coût fixe d'un achat destiné à la revente
-- ============================================================================
--
-- Un fond de roulement, c'est ce qui est fixe : loyer, comptable, électricité.
-- Acheter deux tablettes pour les revendre à un client est aussi une facture,
-- mais ce n'est pas une charge fixe — la marquer comme telle fausserait le
-- calcul du mois.
--
-- On la marque donc pour ce qu'elle est, et un seul interrupteur en haut de
-- la page l'inclut ou l'exclut de la vue. La donnée ne bouge pas ; c'est le
-- regard qui change.
--
-- Idempotent.
-- ============================================================================

ALTER TABLE recurring_financial_entries
  ADD COLUMN IF NOT EXISTS is_resale BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN recurring_financial_entries.is_resale IS
  'Achat destiné à la revente (matériel acheté pour un client). Exclu du fond de roulement par défaut : ce n''est pas une charge fixe.';

CREATE INDEX IF NOT EXISTS idx_recurring_entries_is_resale
  ON recurring_financial_entries(is_resale) WHERE is_resale = TRUE;


-- ========================================================================
-- FICHIER : migrations/0005_quotes.sql
-- ========================================================================

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


-- ROLLBACK;
