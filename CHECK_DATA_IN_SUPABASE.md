# Vérifier les données dans Supabase

## Étape 1 : Vérifier que les tables contiennent des données

1. Allez sur : https://supabase.com/dashboard/project/trihldwbuukpqesttwnk
2. **Table Editor** (menu de gauche)
3. Pour chaque table, vérifiez le nombre de lignes :

### Table `clients`
- Cliquez sur **clients**
- Regardez en haut : vous devriez voir "**X rows**" (où X est un nombre)
- **Si X = 0** → La table est vide, c'est normal que le dashboard soit vide !
- **Si X > 0** → Les données existent, le problème vient d'ailleurs

### Répétez pour :
- **products** → Combien de lignes ?
- **categories** → Combien de lignes ?
- **commissions** → Combien de lignes ?

---

## Étape 2 : Si les tables sont vides

**C'est normal !** Le dashboard est vide car il n'y a pas encore de données.

### Solution : Créer des données de test

#### Option A : Via l'interface Supabase (le plus simple)

1. Dans **Table Editor**, cliquez sur **clients**
2. Cliquez sur **"Insert row"** ou **"+"**
3. Remplissez au moins :
   - `client_name` : "Client Test"
   - `total_sold_amount` : 1000
   - `monthly_fee` : 50
   - `product_quantity` : 5
   - `months_left` : 12
   - `status` : "active"
4. Cliquez sur **"Save"**

Répétez pour créer quelques clients, produits, catégories.

#### Option B : Via votre application

1. Dans votre app, allez sur **Clients**
2. Cliquez sur **"Ajouter un client"**
3. Remplissez le formulaire et sauvegardez

---

## Étape 3 : Si les tables contiennent des données mais le dashboard est vide

Alors le problème vient des politiques RLS ou des requêtes.

### Vérifier les politiques RLS

1. **Database** → **Policies**
2. Pour chaque table (`clients`, `products`, `categories`, `commissions`) :
   - Cliquez sur la table
   - Vérifiez qu'il y a une politique avec :
     - **Target roles** : `anon, authenticated` (les deux doivent être présents)
     - **Command** : `ALL`
     - **USING** : `true`

### Tester une requête SQL directe

Dans **SQL Editor** de Supabase, exécutez :

```sql
-- Tester si vous pouvez lire les données en tant qu'utilisateur authentifié
SELECT * FROM clients LIMIT 5;
SELECT * FROM products LIMIT 5;
SELECT * FROM categories LIMIT 5;
SELECT * FROM commissions LIMIT 5;
```

**Si ces requêtes retournent des données** → Les politiques RLS fonctionnent, le problème vient du code React.

**Si ces requêtes retournent une erreur** → Les politiques RLS ne sont pas correctes.

---

## Étape 4 : Vérifier les erreurs dans la console du navigateur

1. Ouvrez votre app : http://localhost:3000
2. **F12** → **Console**
3. Regardez s'il y a des **erreurs en rouge**
4. Cherchez des erreurs comme :
   - `Failed to fetch clients: ...`
   - `permission denied`
   - `403 Forbidden`
   - `RLS policy violation`

---

## Résumé

| Situation | Solution |
|-----------|----------|
| **Tables vides** | Créer des données (via Table Editor ou l'app) |
| **Tables avec données mais dashboard vide** | Vérifier les politiques RLS + erreurs console |
| **Erreurs 403/permission denied** | Réexécuter le SQL pour ajouter `authenticated` aux politiques |
| **Pas d'erreurs mais données vides** | Vérifier les hooks React (useClients, useProducts, etc.) |

**Dites-moi ce que vous trouvez dans Table Editor : combien de lignes dans chaque table ?** 📊
