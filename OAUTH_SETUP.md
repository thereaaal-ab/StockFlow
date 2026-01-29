# Configuration OAuth Google avec Supabase

Ce guide explique comment configurer l'authentification Google pour votre application.

## 📋 Prérequis

Vous devez avoir accès au dashboard Supabase du projet : https://supabase.com/dashboard/project/trihldwbuukpqesttwnk

## 🔧 Étape 1 : Configurer les URLs de redirection dans Supabase

1. Allez sur le **Dashboard Supabase** : https://supabase.com/dashboard/project/trihldwbuukpqesttwnk

2. Dans le menu de gauche, cliquez sur **Authentication** > **URL Configuration**

3. Dans la section **Redirect URLs**, ajoutez les URLs suivantes :

   **Pour le développement local :**
   ```
   http://localhost:3000/
   http://localhost:3000
   http://127.0.0.1:3000/
   http://127.0.0.1:3000
   ```

   **Pour la production (si déployé) :**
   ```
   https://votre-domaine.com/
   https://votre-domaine.com
   ```

4. Dans la section **Site URL**, mettez :
   ```
   http://localhost:3000
   ```
   (ou votre URL de production)

5. Cliquez sur **Save**

## 🔐 Étape 2 : Configurer Google OAuth Provider

1. Dans le menu de gauche de Supabase, allez sur **Authentication** > **Providers**

2. Trouvez **Google** dans la liste et cliquez dessus

3. **Activez** Google en cochant "Enable Sign in with Google"

4. Vous aurez besoin d'un **Client ID** et **Client Secret** de Google :

   ### Créer des credentials Google OAuth :
   
   a. Allez sur [Google Cloud Console](https://console.cloud.google.com)
   
   b. Créez un nouveau projet ou sélectionnez un projet existant
   
   c. Allez dans **APIs & Services** > **Credentials**
   
   d. Cliquez sur **Create Credentials** > **OAuth 2.0 Client ID**
   
   e. Configurez l'écran de consentement OAuth si ce n'est pas déjà fait
   
   f. Sélectionnez **Web application** comme type d'application
   
   g. Dans **Authorized JavaScript origins**, ajoutez :
      ```
      http://localhost:3000
      https://trihldwbuukpqesttwnk.supabase.co
      ```
   
   h. Dans **Authorized redirect URIs**, ajoutez :
      ```
      https://trihldwbuukpqesttwnk.supabase.co/auth/v1/callback
      ```
   
   i. Cliquez sur **Create**
   
   j. Copiez le **Client ID** et **Client Secret**

5. Retournez sur Supabase et collez :
   - **Client ID** de Google
   - **Client Secret** de Google

6. Cliquez sur **Save**

## ✅ Étape 3 : Tester l'authentification

1. Assurez-vous que votre serveur de développement tourne :
   ```bash
   npm run dev
   ```

2. Ouvrez votre navigateur sur `http://localhost:3000`

3. Cliquez sur "Continue with Google"

4. Vous devriez être redirigé vers la page de connexion Google

5. Après la connexion, vous devriez être redirigé vers votre application (page d'accueil)

## 🐛 Dépannage

### Erreur 404 après la redirection

**Problème** : Après avoir cliqué sur "Continue with Google", vous obtenez une erreur 404.

**Solutions** :
1. Vérifiez que les URLs de redirection sont bien configurées dans Supabase (voir Étape 1)
2. Assurez-vous que l'URL correspond exactement (avec ou sans `/` à la fin)
3. Vérifiez que le serveur tourne sur le bon port (3000 par défaut)

### Erreur "redirect_uri_mismatch"

**Problème** : Google refuse la connexion avec cette erreur.

**Solution** : Vérifiez que l'URL de redirection dans Google Cloud Console est exactement :
```
https://trihldwbuukpqesttwnk.supabase.co/auth/v1/callback
```

### L'authentification ne fonctionne pas en production

**Problème** : L'authentification fonctionne en local mais pas en production.

**Solution** :
1. Ajoutez votre URL de production dans les **Redirect URLs** de Supabase
2. Ajoutez votre URL de production dans les **Authorized JavaScript origins** de Google Cloud Console
3. N'oubliez pas de définir `VITE_SKIP_AUTH=false` en production

## 📝 Variables d'environnement

Assurez-vous que votre fichier `.env` contient :

```env
VITE_SUPABASE_URL=https://trihldwbuukpqesttwnk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SKIP_AUTH=false  # Active l'authentification
```

## 🔒 Sécurité

- Ne commitez JAMAIS votre **Client Secret** de Google dans Git
- Conservez vos clés d'API en sécurité
- En production, utilisez toujours HTTPS
- Définissez `VITE_SKIP_AUTH=false` en production

## 📚 Ressources

- [Documentation Supabase Auth](https://supabase.com/docs/guides/auth)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
