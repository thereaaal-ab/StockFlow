# Debug : Dashboard vide après authentification

## Vérifications à faire

### 1. Vérifier la console du navigateur

1. Ouvrez votre application : http://localhost:3000
2. Appuyez sur **F12** pour ouvrir les DevTools
3. Allez dans l'onglet **Console**
4. Regardez s'il y a des **erreurs en rouge**
5. Copiez toutes les erreurs et partagez-les

### 2. Vérifier le Network (requêtes)

1. Dans DevTools, allez dans l'onglet **Network**
2. Rechargez la page (F5)
3. Filtrez par **Fetch/XHR**
4. Cherchez les requêtes vers Supabase (elles contiennent `supabase.co` dans l'URL)
5. Cliquez sur une requête (ex: vers `/rest/v1/clients`)
6. Regardez l'onglet **Response** :
   - Si vous voyez `[]` → Les tables sont vides
   - Si vous voyez une erreur → Copiez le message d'erreur
   - Si vous voyez des données → Le problème est ailleurs

### 3. Vérifier que les données existent dans Supabase

1. Allez sur : https://supabase.com/dashboard/project/trihldwbuukpqesttwnk
2. **Table Editor** (menu de gauche)
3. Vérifiez chaque table :
   - **clients** → Y a-t-il des lignes ?
   - **products** → Y a-t-il des lignes ?
   - **categories** → Y a-t-il des lignes ?
   - **commissions** → Y a-t-il des lignes ?

### 4. Vérifier les politiques RLS

1. **Database** → **Policies**
2. Pour chaque table, vérifiez que la politique existe et contient :
   - **Target roles** : `anon, authenticated` (les deux doivent être présents)
   - **Command** : `ALL`
   - **USING** : `true`
   - **WITH CHECK** : `true`

### 5. Tester une requête manuelle dans la console

Dans la console du navigateur (F12 → Console), tapez :

```javascript
// Test de connexion Supabase
const { data, error } = await window.supabase?.from('clients').select('*');
console.log('Clients:', data);
console.log('Error:', error);
```

Si `window.supabase` n'existe pas, essayez :

```javascript
// Importer le client Supabase
import { supabase } from './lib/supabase';
const { data, error } = await supabase.from('clients').select('*');
console.log('Clients:', data);
console.log('Error:', error);
```

### 6. Vérifier la session utilisateur

Dans la console du navigateur :

```javascript
// Vérifier si vous êtes bien connecté
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
console.log('User:', session?.user);
```

Si `session` est `null`, vous n'êtes pas vraiment connecté malgré l'apparence.

---

## Solutions possibles

### Si les tables sont vides dans Supabase
→ Les données n'existent pas. Il faut les créer via l'application ou les importer.

### Si les requêtes retournent une erreur 403 ou "permission denied"
→ Les politiques RLS ne sont pas correctes. Réexécutez le SQL de `FIX_RLS_POLICIES.md`.

### Si les requêtes retournent `[]` mais les tables contiennent des données
→ Problème de filtrage ou de politique RLS trop restrictive.

### Si la session est null
→ Problème d'authentification. Essayez de vous déconnecter et reconnecter.

---

**Partagez-moi les résultats de ces vérifications pour que je puisse vous aider plus précisément !**
