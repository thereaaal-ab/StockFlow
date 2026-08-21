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
