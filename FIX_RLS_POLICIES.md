# Solution simple : Modifier les politiques RLS existantes

Au lieu de créer de nouvelles politiques, modifions les politiques existantes pour qu'elles s'appliquent aussi au rôle **authenticated**.

## Méthode 1 : Via l'interface Supabase (le plus simple)

1. **Allez sur votre projet** : https://supabase.com/dashboard/project/trihldwbuukpqesttwnk

2. **Database** → **Policies** (dans le menu de gauche)

3. **Pour chaque table** (`clients`, `products`, `categories`, `commissions`) :

   a. Cliquez sur la table (ex: **clients**)
   
   b. Vous verrez la politique existante : **"Allow all operations on clients"**
   
   c. Cliquez sur les **3 points** (⋮) à droite de la politique
   
   d. Cliquez sur **"Edit policy"** ou **"Edit"**
   
   e. Dans **"Target roles"**, vous verrez probablement seulement **"anon"**
   
   f. **Ajoutez** **"authenticated"** dans la liste des rôles cibles
   
   g. Cliquez sur **"Save"**

4. **Répétez** pour les 4 tables : `clients`, `products`, `categories`, `commissions`

---

## Méthode 2 : Via SQL (si l'interface ne fonctionne pas)

Si vous ne pouvez pas modifier via l'interface, utilisez ce SQL dans **SQL Editor** :

```sql
-- Modifier les politiques existantes pour inclure "authenticated"
-- (au lieu de créer de nouvelles politiques)

-- Clients
ALTER POLICY "Allow all operations on clients" ON clients TO authenticated, anon;

-- Products  
ALTER POLICY "Allow all operations on products" ON products TO authenticated, anon;

-- Categories
ALTER POLICY "Allow all operations on categories" ON categories TO authenticated, anon;

-- Commissions
ALTER POLICY "Allow all operations on commissions" ON commissions TO authenticated, anon;
```

---

## Méthode 3 : Recréer les politiques pour les deux rôles

Si les méthodes ci-dessus ne fonctionnent pas, supprimez et recréez les politiques :

```sql
-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Allow all operations on clients" ON clients;
DROP POLICY IF EXISTS "Allow all operations on products" ON products;
DROP POLICY IF EXISTS "Allow all operations on categories" ON categories;
DROP POLICY IF EXISTS "Allow all operations on commissions" ON commissions;

-- Créer de nouvelles politiques pour anon ET authenticated
CREATE POLICY "Allow all operations on clients" ON clients
FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on products" ON products
FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on categories" ON categories
FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on commissions" ON commissions
FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
```

---

## Vérification

Après avoir modifié les politiques :

1. Rechargez votre application : http://localhost:3000
2. Les données devraient maintenant apparaître !

Si ça ne fonctionne toujours pas, ouvrez la **console du navigateur** (F12) et regardez s'il y a des erreurs en rouge.
