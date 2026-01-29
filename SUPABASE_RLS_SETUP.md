# Configuration des politiques RLS Supabase

Maintenant que vous avez accès au dashboard Supabase, vous pouvez configurer les politiques d'accès aux données.

## 🔒 Qu'est-ce que RLS (Row Level Security) ?

RLS est un système de sécurité de Supabase qui contrôle qui peut accéder à quelles données. Par défaut, si RLS est activé, **personne ne peut accéder aux données** sans une politique explicite.

## 🚀 Configuration rapide pour le développement

### Option A : Désactiver RLS temporairement (le plus simple)

⚠️ **Attention** : À utiliser UNIQUEMENT en développement local !

1. Allez sur https://supabase.com/dashboard/project/trihldwbuukpqesttwnk
2. Allez dans **Table Editor**
3. Pour chaque table (`clients`, `products`, `categories`, `commissions`) :
   - Cliquez sur la table
   - En haut à droite, cliquez sur l'icône de bouclier avec "RLS enabled"
   - Désactivez RLS en décochant "Enable RLS"
   - Confirmez

**Avantages** : Accès immédiat aux données, simple
**Inconvénients** : Pas sécurisé, ne pas utiliser en production

### Option B : Créer des politiques RLS pour l'accès anonyme (recommandé)

1. Allez sur https://supabase.com/dashboard/project/trihldwbuukpqesttwnk
2. Allez dans **Authentication** > **Policies**
3. Pour chaque table, créez ces politiques :

#### Pour la table `clients` :

**Politique SELECT (lecture)** :
- Nom : `Allow anonymous select on clients`
- Policy command : `SELECT`
- Target roles : `anon`, `authenticated`
- USING expression : `true`

**Politique INSERT (création)** :
- Nom : `Allow anonymous insert on clients`
- Policy command : `INSERT`
- Target roles : `anon`, `authenticated`
- WITH CHECK expression : `true`

**Politique UPDATE (modification)** :
- Nom : `Allow anonymous update on clients`
- Policy command : `UPDATE`
- Target roles : `anon`, `authenticated`
- USING expression : `true`
- WITH CHECK expression : `true`

**Politique DELETE (suppression)** :
- Nom : `Allow anonymous delete on clients`
- Policy command : `DELETE`
- Target roles : `anon`, `authenticated`
- USING expression : `true`

#### Répétez pour les autres tables :
- `products`
- `categories`
- `commissions`

## 🔐 Configuration pour la production (avec authentification)

Une fois Google OAuth configuré, modifiez les politiques pour vérifier l'authentification :

### Exemple pour `clients` en production :

**SELECT** :
```sql
auth.uid() IS NOT NULL
```

**INSERT/UPDATE/DELETE** :
```sql
auth.uid() IS NOT NULL
```

Cela permet uniquement aux utilisateurs **authentifiés** d'accéder aux données.

## 📝 Script SQL rapide (copier-coller)

Vous pouvez exécuter ce script dans **SQL Editor** de Supabase pour créer toutes les politiques d'un coup :

```sql
-- Politiques pour clients
CREATE POLICY "Allow anonymous access to clients" ON clients
FOR ALL USING (true) WITH CHECK (true);

-- Politiques pour products
CREATE POLICY "Allow anonymous access to products" ON products
FOR ALL USING (true) WITH CHECK (true);

-- Politiques pour categories
CREATE POLICY "Allow anonymous access to categories" ON categories
FOR ALL USING (true) WITH CHECK (true);

-- Politiques pour commissions
CREATE POLICY "Allow anonymous access to commissions" ON commissions
FOR ALL USING (true) WITH CHECK (true);
```

⚠️ **Note** : Ces politiques permettent un accès complet anonyme. C'est OK pour le développement local, mais **changez-les en production** !

## ✅ Vérifier que ça fonctionne

1. Après avoir créé les politiques, rechargez votre application : http://localhost:3000
2. Avec `VITE_SKIP_AUTH=true`, vous devriez maintenant voir les données
3. Si vous ne voyez toujours rien, vérifiez que les tables contiennent des données dans le **Table Editor**

## 🔍 Dépannage

### Toujours pas de données après avoir créé les politiques ?

1. **Vérifiez que RLS est activé** sur les tables
2. **Vérifiez que les politiques sont bien créées** dans Authentication > Policies
3. **Vérifiez que les tables contiennent des données** dans Table Editor
4. **Regardez la console du navigateur** (F12) pour voir les erreurs
5. **Vérifiez les variables d'environnement** dans `.env` (URL et clés Supabase)

### Erreur "relation does not exist" ?

Les tables n'ont pas été créées. Exécutez :
```bash
npm run db:push
```

## 🛡️ Sécurité en production

Avant de déployer en production :

1. ✅ Activez l'authentification : `VITE_SKIP_AUTH=false`
2. ✅ Configurez Google OAuth (voir `OAUTH_SETUP.md`)
3. ✅ Modifiez les politiques RLS pour vérifier `auth.uid() IS NOT NULL`
4. ✅ Ne désactivez JAMAIS RLS en production

## 📚 Ressources

- [Documentation Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Exemples de politiques RLS](https://supabase.com/docs/guides/auth/row-level-security#policy-examples)
