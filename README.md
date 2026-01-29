# StockFlow - Gestion d'Inventaire

Application de gestion d'inventaire matériel avec suivi client, analytics et système multi-utilisateurs.

## 🚀 Démarrage rapide

### Prérequis

- Node.js 20+ 
- npm ou yarn
- Compte Supabase (pour la base de données)

### Installation

1. **Cloner le repository**
```bash
git clone <repository-url>
cd StockFlow
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**

Copiez le fichier `.env.example` vers `.env` :
```bash
cp .env.example .env
```

Puis éditez `.env` et configurez les variables :

```env
# Supabase Configuration
SUPABASE_URL=https://ptuosweivwyiwmguxagx.supabase.co
VITE_SUPABASE_URL=https://ptuosweivwyiwmguxagx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_DB_URL=postgresql://postgres.ptuosweivwyiwmguxagx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# Server Configuration
PORT=3210
NODE_ENV=development

# Authentication Configuration
VITE_SKIP_AUTH=true  # Set to "false" to require authentication
```

### Configuration de l'authentification

La variable `VITE_SKIP_AUTH` contrôle l'authentification :

- **`VITE_SKIP_AUTH=true`** : Désactive l'authentification (utile pour le développement local sans Google OAuth)
- **`VITE_SKIP_AUTH=false`** : Active l'authentification (recommandé pour la production)

⚠️ **Important** : En production, mettez toujours `VITE_SKIP_AUTH=false` pour protéger votre application.

### Obtenir la chaîne de connexion Supabase

1. Allez sur votre [dashboard Supabase](https://supabase.com/dashboard/project/ptuosweivwyiwmguxagx)
2. Naviguez vers **Settings** > **Database**
3. Dans **Connection string**, sélectionnez **URI**
4. Copiez la chaîne complète et remplacez `SUPABASE_DB_URL` dans `.env`

### Lancer l'application

**Mode développement :**
```bash
npm run dev
```

L'application sera disponible sur `http://localhost:3210`

**Build pour production :**
```bash
npm run build
npm start
```

### Créer les tables dans Supabase

```bash
npm run db:push
```

## 📁 Structure du projet

```
StockFlow/
├── client/              # Application React frontend
│   ├── src/
│   │   ├── components/  # Composants réutilisables
│   │   ├── pages/       # Pages de l'application
│   │   ├── hooks/       # Hooks React personnalisés
│   │   └── lib/         # Utilitaires
│   └── index.html
├── server/              # Backend Express
│   ├── index.ts         # Serveur principal
│   ├── routes.ts        # Routes API
│   └── db.ts            # Configuration base de données
├── shared/              # Code partagé
│   └── schema.ts        # Schéma Drizzle ORM
└── .env                 # Variables d'environnement (ne pas commiter)
```

## 🔧 Scripts disponibles

- `npm run dev` - Démarre le serveur de développement
- `npm run build` - Build pour la production
- `npm start` - Lance le serveur de production
- `npm run check` - Vérification TypeScript
- `npm run db:push` - Push le schéma vers la base de données

## 📚 Documentation

Pour plus de détails, consultez :
- [DOCUMENTATION_REPO.md](./DOCUMENTATION_REPO.md) - Documentation technique complète
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Guide de déploiement

## 🛠️ Technologies utilisées

### Frontend
- React 18 + TypeScript
- TanStack Query (React Query)
- Tailwind CSS + shadcn/ui
- Recharts (graphiques)
- Wouter (routing)

### Backend
- Express.js
- Drizzle ORM
- Supabase (PostgreSQL + Auth)
- Vite (dev server + build)

## 🔐 Sécurité

- Le fichier `.env` est dans `.gitignore` et ne doit jamais être commité
- La clé `SUPABASE_SERVICE_ROLE_KEY` ne doit JAMAIS être exposée au frontend
- En production, définissez toujours `VITE_SKIP_AUTH=false`

## 📝 Licence

MIT
