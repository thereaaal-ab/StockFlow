-- ============================================================================
-- Import de devis PDF — la mémoire des rapprochements
-- ============================================================================
--
-- Un devis Rushorder nomme ses lignes en langage commercial : « Licence POS
-- Rushorder », « Kiosk 32 (AKSW-32) ». Le catalogue, lui, a ses propres codes.
-- Le rapprochement automatique en retrouve la plupart — le code entre
-- parenthèses est une clé sûre — mais pas toutes.
--
-- Cette table retient les rapprochements faits à la main : un libellé mappé
-- une fois n'est plus jamais redemandé.
--
-- Idempotent. À passer APRÈS 0005.
-- ============================================================================

CREATE TABLE IF NOT EXISTS quote_line_aliases (
  id           VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Le libellé du PDF, normalisé : minuscules, sans accents ni ponctuation.
  -- C'est la forme sur laquelle on cherche, pour que « Licence POS Rushorder »
  -- et « licence pos rushorder » soient le même alias.
  normalized   TEXT NOT NULL UNIQUE,
  -- Le libellé d'origine, gardé pour l'affichage et le débogage.
  label        TEXT NOT NULL,

  -- NULL = ligne de service assumée : on a décidé qu'elle ne correspond à
  -- aucune référence, et on ne redemandera plus.
  product_id   VARCHAR REFERENCES products(id) ON DELETE CASCADE,

  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE quote_line_aliases IS
  'Mémoire des rapprochements libellé de devis → référence catalogue.';

CREATE INDEX IF NOT EXISTS idx_quote_line_aliases_product_id
  ON quote_line_aliases(product_id);

DROP TRIGGER IF EXISTS update_quote_line_aliases_updated_at ON quote_line_aliases;
CREATE TRIGGER update_quote_line_aliases_updated_at
  BEFORE UPDATE ON quote_line_aliases
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE quote_line_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on quote_line_aliases" ON quote_line_aliases;
CREATE POLICY "Allow all operations on quote_line_aliases" ON quote_line_aliases
  FOR ALL USING (true) WITH CHECK (true);

-- Le numéro de devis vient du PDF : deux imports du même fichier ne doivent
-- pas créer deux devis.
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS source_file TEXT;

COMMENT ON COLUMN quotes.source_file IS
  'Nom du PDF importé, le cas échéant.';
