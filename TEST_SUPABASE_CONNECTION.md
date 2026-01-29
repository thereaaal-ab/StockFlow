# Test de connexion Supabase

## Le problème du dashboard vide

Le dashboard vide peut avoir **2 causes différentes** :

### 1. Problème côté SERVEUR (Drizzle ORM)
- Utilise `SUPABASE_DB_URL` (connexion PostgreSQL directe)
- Pour les migrations, les requêtes serveur, etc.
- **Le serveur démarre** ✅ (on voit les logs), donc ce n'est probablement pas ça

### 2. Problème côté CLIENT (Frontend React)
- Utilise `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- Se connecte via l'API REST de Supabase (pas PostgreSQL direct)
- **C'est probablement ça le problème !**

---

## Test rapide dans la console du navigateur

1. Ouvrez votre app : http://localhost:3000
2. **F12** → **Console**
3. Exécutez ce code :

```javascript
// Test 1: Vérifier la session
const { data: { session } } = await window.supabase.auth.getSession();
console.log('Session:', session ? '✅ Connecté' : '❌ Non connecté');
console.log('User email:', session?.user?.email);

// Test 2: Tester une requête avec la session
const { data: clients, error: clientsError } = await window.supabase
  .from('clients')
  .select('*');
  
console.log('Clients data:', clients);
console.log('Clients error:', clientsError);

// Si vous voyez une erreur, copiez-la ici
```

---

## Vérifications dans Supabase

### 1. Les tables contiennent-elles des données ?

1. https://supabase.com/dashboard/project/trihldwbuukpqesttwnk
2. **Table Editor**
3. Pour chaque table, regardez le nombre de lignes :
   - `clients` : ? lignes
   - `products` : ? lignes
   - `categories` : ? lignes
   - `commissions` : ? lignes

**Si toutes les tables sont vides (0 rows)** → C'est normal que le dashboard soit vide ! Il faut créer des données.

### 2. Les politiques RLS sont-elles correctes ?

1. **Database** → **Policies**
2. Pour chaque table, vérifiez :
   - Il y a une politique avec **Target roles** : `anon, authenticated` (les deux)
   - **Command** : `ALL`
   - **USING** : `true`

---

## Solution selon le problème

| Problème | Solution |
|----------|----------|
| **Tables vides** | Créer des données via Table Editor ou l'app |
| **Erreur "permission denied" ou "403"** | Réexécuter le SQL pour ajouter `authenticated` aux politiques |
| **Erreur "relation does not exist"** | Exécuter `npm run db:push` pour créer les tables |
| **Pas d'erreur mais `[]` (tableau vide)** | Les tables sont vides, créer des données |

---

**Partagez-moi :**
1. Les résultats du test dans la console (session, clients data, clients error)
2. Le nombre de lignes dans chaque table dans Supabase Table Editor
