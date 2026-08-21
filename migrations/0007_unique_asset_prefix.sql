-- ============================================================================
-- Un préfixe d'étiquette par référence
-- ============================================================================
--
-- Le numéro d'inventaire est « préfixe + compteur », et le compteur est tenu
-- PAR PRODUIT. Deux références qui partagent un préfixe produisent donc le
-- même numéro : KIOSK_27 et KIOSK_32 donneraient tous deux KIO-0001, et la
-- seconde réception échouerait sur l'unicité de asset_tag — au pire moment,
-- c'est-à-dire une fois le matériel arrivé.
--
-- On l'interdit à la source, sur les seules références suivies à l'unité :
-- les autres n'attribuent jamais d'étiquette.
--
-- Idempotent. À passer APRÈS 0001.
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_asset_prefix_unique
  ON products (asset_prefix)
  WHERE tracked_by_unit AND asset_prefix IS NOT NULL;

COMMENT ON COLUMN products.asset_prefix IS
  'Préfixe des numéros d''inventaire (BRN -> BRN-0042). Unique parmi les références suivies à l''unité : un préfixe partagé produirait deux fois le même numéro.';
