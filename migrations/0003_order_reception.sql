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
