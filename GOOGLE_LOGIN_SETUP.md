# Configurer la connexion Google pour VOTRE projet Supabase

Votre application utilise le projet Supabase **trihldwbuukpqesttwnk**. Pour que "Continuer avec Google" fonctionne, il faut configurer Google OAuth **sur ce projet**.

---

## Étape 1 : URLs de redirection dans Supabase

1. Allez sur **votre** projet : https://supabase.com/dashboard/project/trihldwbuukpqesttwnk  
2. Menu de gauche : **Authentication** → **URL Configuration**  
3. Section **Redirect URLs** : ajoutez ces URLs (une par ligne) :
   ```
   http://localhost:3000/
   http://localhost:3000
   http://127.0.0.1:3000/
   http://127.0.0.1:3000
   ```
4. **Site URL** : mettez `http://localhost:3000`  
5. Cliquez sur **Save**

---

## Étape 2 : Créer les credentials Google (Google Cloud Console)

1. Allez sur https://console.cloud.google.com  
2. Créez un projet ou sélectionnez un projet existant  
3. Menu **APIs & Services** → **Credentials**  
4. **Create Credentials** → **OAuth 2.0 Client ID**  
5. Si demandé, configurez l’écran de consentement OAuth (nom de l’app, email de support, etc.)  
6. Type d’application : **Web application**  
7. **Name** : par ex. "StockFlow Inventaire Pro"  
8. **Authorized JavaScript origins** : ajoutez :
   ```
   http://localhost:3000
   https://trihldwbuukpqesttwnk.supabase.co
   ```
9. **Authorized redirect URIs** : ajoutez **exactement** :
   ```
   https://trihldwbuukpqesttwnk.supabase.co/auth/v1/callback
   ```
   (Utilisez l’URL de **votre** projet Supabase, pas l’ancien.)  
10. **Create**  
11. Copiez le **Client ID** et le **Client Secret**

---

## Étape 3 : Activer Google dans Supabase

1. Retour sur https://supabase.com/dashboard/project/trihldwbuukpqesttwnk  
2. **Authentication** → **Providers**  
3. Cliquez sur **Google**  
4. **Enable Sign in with Google** : activé  
5. Collez le **Client ID** et le **Client Secret** de l’étape 2  
6. **Save**

---

## Étape 4 : Activer l’authentification dans l’app

1. Dans votre fichier **`.env`**, mettez :
   ```env
   VITE_SKIP_AUTH=false
   ```
2. Dans **`client/src/App.tsx`**, remettez la lecture depuis l’env (au lieu du `true` en dur) :
   - Remplacez `const SKIP_AUTH = true;` par  
     `const SKIP_AUTH = import.meta.env.VITE_SKIP_AUTH === 'true';`
3. Redémarrez le serveur : `npm run dev`  
4. Ouvrez http://localhost:3000  
5. Cliquez sur **Continuer avec Google** : vous devez être redirigé vers Google puis revenir sur le dashboard.

---

## Résumé

| Où | Quoi |
|----|------|
| **Supabase (trihldwbuukpqesttwnk)** | Redirect URLs + Site URL + Provider Google avec Client ID/Secret |
| **Google Cloud Console** | OAuth Client ID (Web) + origines + redirect URI `.../auth/v1/callback` |
| **Votre .env** | `VITE_SKIP_AUTH=false` + projet déjà configuré |
| **App.tsx** | Utiliser `import.meta.env.VITE_SKIP_AUTH === 'true'` au lieu de `true` en dur |

Une fois ces étapes faites, la connexion Google est liée à **votre** projet et à **votre** compte Google.
