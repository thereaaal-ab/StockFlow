# Documentation Complète du Repository StockFlow

## 📋 Vue d'ensemble

**StockFlow** est une application web complète de gestion d'inventaire et d'analyse de flux de stock pour la gestion de matériel hardware, de clients et de leurs contrats. L'application permet de suivre les investissements, les revenus, les commissions et fournit des analyses détaillées en temps réel.

---

## 🏗️ Architecture Technique

### Stack Technologique

#### Frontend
- **Framework**: React 18.3.1 avec TypeScript
- **Routing**: Wouter 3.3.5
- **State Management**: TanStack React Query 5.60.5 (pour la gestion des données serveur)
- **UI Components**: 
  - Radix UI (composants accessibles)
  - shadcn/ui (système de design)
  - Tailwind CSS 3.4.17 (styling)
  - Framer Motion 11.13.1 (animations)
- **Formulaires**: React Hook Form 7.55.0 avec validation Zod 3.24.2
- **Graphiques**: Recharts 2.15.2
- **Icons**: Lucide React 0.453.0
- **Build Tool**: Vite 5.4.20

#### Backend
- **Runtime**: Node.js avec Express 4.21.2
- **Base de données**: PostgreSQL via Supabase
- **ORM**: Drizzle ORM 0.39.1
- **Authentification**: Supabase Auth
- **Sessions**: Express Session avec connect-pg-simple

#### Base de Données
- **Provider**: Supabase (PostgreSQL)
- **Migrations**: Drizzle Kit 0.31.4
- **Real-time**: Supabase Realtime Subscriptions

#### Déploiement
- Support pour Railway, Render, Vercel, Heroku, Docker
- Configuration disponible pour chaque plateforme

---

## 📁 Structure du Projet

```
StockFlow/
├── client/                    # Application frontend React
│   ├── src/
│   │   ├── components/        # Composants React réutilisables
│   │   │   ├── ui/           # Composants UI de base (shadcn/ui)
│   │   │   └── ...           # Composants métier
│   │   ├── pages/            # Pages principales de l'application
│   │   ├── hooks/            # Hooks React personnalisés
│   │   ├── lib/              # Utilitaires et helpers
│   │   └── main.tsx          # Point d'entrée React
│   └── public/               # Assets statiques
├── server/                   # Backend Express
│   ├── index.ts             # Serveur Express principal
│   ├── routes.ts            # Définition des routes API
│   ├── db.ts                # Configuration base de données
│   └── supabase.ts          # Client Supabase backend
├── shared/                   # Code partagé
│   └── schema.ts             # Schéma Drizzle ORM
├── migrations/              # Migrations SQL (générées)
└── *.sql                    # Scripts SQL de migration manuels
```

---

## 🗄️ Modèle de Données

### Tables Principales

#### 1. **users**
- `id` (UUID, PK)
- `username` (TEXT, unique)
- `password` (TEXT, hashé)

#### 2. **products** (Matériel Hardware)
- `id` (UUID, PK)
- `code` (VARCHAR, unique) - Code produit
- `name` (TEXT) - Nom du produit
- `quantity` (INTEGER) - Quantité (déprécié, pour compatibilité)
- `hardware_total` (INTEGER) - Quantité totale achetée (ne change jamais)
- `stock_actuel` (INTEGER) - Stock disponible actuel (diminue quand assigné)
- `purchase_price` (NUMERIC) - Prix d'achat
- `selling_price` (NUMERIC) - Prix de vente
- `rent_price` (NUMERIC) - Prix de location
- `profit` (NUMERIC) - Profit calculé
- `total_value` (NUMERIC) - Valeur totale
- `category_id` (VARCHAR, FK) - Référence à categories
- `created_at`, `updated_at` (TIMESTAMP)

#### 3. **categories**
- `id` (UUID, PK)
- `name` (TEXT, unique, lowercase)
- `created_at` (TIMESTAMP)

#### 4. **clients**
- `id` (UUID, PK)
- `client_name` (TEXT)
- `total_sold_amount` (NUMERIC) - Montant total vendu
- `monthly_fee` (NUMERIC) - Frais mensuels
- `product_quantity` (INTEGER) - Quantité de produits
- `months_left` (INTEGER) - Mois restants
- `product_id` (VARCHAR, FK) - Produit principal (legacy)
- `products` (JSONB) - Tableau de produits assignés (nouveau format)
- `starter_pack_price` (NUMERIC) - Prix du starter pack
- `hardware_price` (NUMERIC) - Prix du hardware vendu au client
- `contract_start_date` (DATE) - Date de début du contrat
- `status` (TEXT) - 'active' | 'inactive'
- `created_at`, `updated_at` (TIMESTAMP)

#### 5. **commissions**
- `id` (UUID, PK)
- `month` (DATE) - Mois de la commission
- `amount` (NUMERIC) - Montant de la commission
- `created_at` (TIMESTAMP)

---

## 🎯 Fonctionnalités Principales

### 1. **Dashboard** (`/`)
Vue d'ensemble avec métriques clés :
- **Revenu Mensuel Total** : Somme de tous les frais mensuels clients
- **Revenu Starter Pack** : Somme de tous les starter packs vendus
- **Commissions Total** : Somme de toutes les commissions enregistrées
- **Clients Actifs** : Nombre de clients avec status 'active'
- **Graphique de valeur par client** : Visualisation des investissements
- **Tableau des mouvements récents** : (À implémenter)

### 2. **Gestion du Stock** (`/stock`)
- **Recherche** : Par code ou nom de produit
- **Filtres** : 
  - Tous les statuts
  - En stock
  - Stock bas (< 5 unités)
  - Rupture de stock
- **Affichage** : Tableau avec stock actuel disponible
- **Actions** : Édition et suppression de produits
- **Métrique** : Valeur totale du stock disponible

### 3. **Hardware Total** (`/hardware-total`)
Catalogue complet de tout le matériel acheté :
- **Affichage** : Tous les produits avec `hardware_total` (quantité originale)
- **Recherche** : Par code ou nom
- **Actions** : Ajout, édition, suppression
- **Métrique** : Investissement total (somme de tous les `hardware_total * purchase_price`)

### 4. **Gestion des Clients** (`/clients`)
- **Vue en grille** : Cartes clients avec informations clés
- **Statut visuel** : 
  - 🟢 Vert : Client rentable (investissement couvert)
  - 🔴 Rouge : Client en cours de couverture d'investissement
- **Actions** :
  - Ajouter un nouveau client
  - Voir les détails
  - Modifier un client
  - Supprimer un client
- **Calculs automatiques** :
  - Mois écoulés depuis le début du contrat
  - Investissement total (coûts d'installation)
  - Revenus cumulés
  - Statut de rentabilité

### 5. **Analytics** (`/analytics`)
Analyses approfondies avec graphiques et statistiques :

#### Métriques Globales
- Taux d'utilisation du stock
- Matériel déployé
- Clients actifs
- Valeur déployée totale
- Revenu mensuel/annuel total

#### Graphiques
- **Valeur par Client** : Graphique en barres groupées (coûts d'installation vs revenus collectés)
- **Distribution du Matériel par Catégorie** : Graphique en camembert avec pourcentages
- **Revenus par Catégorie** : Graphique en camembert des revenus
- **Statistiques par Catégorie** : Tableau détaillé avec revenus et mois moyens restants

#### Tableaux
- **Revenus par Client** : Détails complets (Starter Pack, Hardware, Frais Mensuels, Revenu Actuel, Revenu Annuel)
- **Filtrage par catégorie** : Possibilité de filtrer tous les graphiques par catégorie

#### Indicateurs Clés
- Taux de disponibilité (barre de progression)
- Matériel en stock bas (barre de progression)
- Valeur moyenne par client
- Valeur totale

### 6. **Paramètres** (`/settings`)
Gestion administrative :

#### Gestion des Catégories
- **Créer** : Nouvelle catégorie (nom converti en minuscules automatiquement)
- **Modifier** : Édition du nom
- **Supprimer** : Suppression avec confirmation
- **Validation** : Pas de doublons autorisés

#### Gestion des Commissions
- **Créer** : Ajout d'une commission pour un mois spécifique
  - Format de date flexible : YYYY-MM, YYYY-MM-DD, ou YYYY
  - Montant en euros
- **Modifier** : Édition du mois et du montant
- **Supprimer** : Suppression avec confirmation
- **Affichage** : Tableau avec format de date lisible (ex: "janvier 2025")

---

## 💰 Logique de Calcul des Investissements et Revenus

### Calculs Client (dans `clientCalculations.ts`)

#### Investissement Total
```
Investissement = Coûts d'installation uniquement
Coûts d'installation = Somme des prix d'achat de tous les produits hardware assignés
```

#### Revenus

**Premier mois** :
```
Revenu premier mois = Starter Pack + Hardware (prix client) + Frais Mensuels
```

**Mois suivants** :
```
Revenu mensuel = Frais Mensuels uniquement
```

**Revenus cumulés** :
```
Revenus cumulés = Revenu premier mois + (Mois écoulés - 1) × Frais Mensuels
```

#### Cash Flow et Rentabilité

**Mois 1** :
```
Net = Profit One Shot - Coûts d'installation
```

**Si Net ≥ 0** : Client rentable dès le premier mois
**Si Net < 0** : Calcul des mois nécessaires pour couvrir l'investissement

**Mois nécessaires pour couvrir** :
```
Balance restante = -Net (positif)
Mois nécessaires = 1 + (Balance restante / Frais Mensuels)
```

**Date de rentabilité** :
- Si couvert au premier mois : Date de début du contrat
- Sinon : Date de début + (Mois nécessaires - 1) mois

#### Métriques Calculées

Pour chaque client, le système calcule :
- `months_passed` : Mois écoulés depuis le début du contrat
- `total_investment` : Investissement total (coûts d'installation)
- `installation_costs` : Coûts d'installation (négatif)
- `profit_one_shot` : Bénéfices du premier mois
- `profit_mensuel` : Frais mensuels (bénéfice récurrent)
- `total_revenue` : Revenus totaux collectés
- `net_cash_flow` : Flux de trésorerie net (positif - négatif)
- `months_to_cover` : Nombre de mois pour couvrir l'investissement
- `profitability_date` : Date de rentabilité
- `is_profitable` : Boolean (true si net_cash_flow ≥ 0)
- `status` : "profitable" | "covering_investment"

---

## 🔄 Fonctionnalités Temps Réel

L'application utilise **Supabase Realtime** pour les mises à jour automatiques :

- **Clients** : Mise à jour automatique lors de création/modification/suppression
- **Produits** : Synchronisation en temps réel des changements de stock
- **Catégories** : Mise à jour immédiate des modifications
- **Commissions** : Synchronisation automatique

Toutes les données sont rafraîchies automatiquement sans rechargement de page grâce à React Query et les subscriptions Supabase.

---

## 🎨 Interface Utilisateur

### Design System
- **Thème** : Support du mode clair/sombre avec `next-themes`
- **Composants** : shadcn/ui (composants accessibles et modernes)
- **Responsive** : Design adaptatif mobile/tablette/desktop
- **Animations** : Transitions fluides avec Framer Motion

### Navigation
- **Sidebar** : Navigation latérale avec icônes
  - Dashboard
  - Hardware Total
  - Stock
  - Clients
  - Analytics
  - Paramètres
- **Header** : Toggle sidebar + Toggle thème
- **Breadcrumbs** : (À implémenter si nécessaire)

### États de l'Interface
- **Loading** : États de chargement avec spinners
- **Erreurs** : Gestion d'erreurs avec toasts (notifications)
- **Vides** : Messages informatifs pour les listes vides
- **Validation** : Validation des formulaires en temps réel

---

## 🔐 Authentification

- **Provider** : Supabase Auth
- **Protection des routes** : Toutes les pages (sauf Login) nécessitent une authentification
- **Session** : Gestion de session côté serveur avec Express Session
- **Hook** : `useAuth` pour vérifier l'état d'authentification

---

## 📊 Hooks Personnalisés

### `useClients`
- `clients` : Liste des clients
- `isLoading` : État de chargement
- `createClient` : Créer un client
- `updateClient` : Modifier un client
- `deleteClient` : Supprimer un client
- `isCreating`, `isUpdating`, `isDeleting` : États des mutations

### `useProducts`
- `products` : Liste des produits
- `isLoading` : État de chargement
- `createProduct` : Créer un produit
- `updateProduct` : Modifier un produit
- `deleteProduct` : Supprimer un produit

### `useCategories`
- `categories` : Liste des catégories
- `isLoading` : État de chargement
- `createCategory` : Créer une catégorie
- `updateCategory` : Modifier une catégorie
- `deleteCategory` : Supprimer une catégorie

### `useCommissions`
- `commissions` : Liste des commissions
- `totalCommissions` : Somme totale calculée
- `isLoading` : État de chargement
- `createCommission` : Créer une commission
- `updateCommission` : Modifier une commission
- `deleteCommission` : Supprimer une commission

### `useDashboardCounts`
- `counts` : Compteurs agrégés
  - `productCount` : Nombre total de produits
  - `availableStockCount` : Stock disponible
  - `clientCount` : Nombre de clients
  - `totalValue` : Valeur totale

---

## 🗃️ Migrations SQL

Le projet contient plusieurs scripts SQL de migration :

1. `create_categories_table.sql` - Création de la table categories
2. `add_contract_start_date_and_status.sql` - Ajout des champs contrat aux clients
3. `add_hardware_total_and_stock_actuel.sql` - Séparation hardware_total et stock_actuel
4. `add_rent_price_to_products.sql` - Ajout du prix de location
5. `add_starter_pack_and_hardware_price.sql` - Ajout des prix starter pack et hardware
6. `add_products_column_to_clients.sql` - Ajout du champ JSONB products
7. `create_commissions_table.sql` - Création de la table commissions
8. `migrate_category_to_products.sql` - Migration des catégories vers products
9. `fix_clients_table.sql` - Corrections diverses
10. `verify_and_fix_updated_at.sql` - Vérification des triggers updated_at

---

## 🚀 Déploiement

### Variables d'Environnement Requises

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URL=postgresql://...

# Serveur
PORT=5000
NODE_ENV=production
```

### Commandes Disponibles

```bash
# Développement
npm run dev              # Lance le serveur de développement

# Build
npm run build            # Build complet (client + serveur)
npm run build:client     # Build client uniquement

# Production
npm start                # Lance le serveur de production

# Base de données
npm run db:push          # Push le schéma vers la base de données

# Vérification
npm run check            # Vérification TypeScript
```

### Plateformes Supportées

- **Railway** : Configuration via `railway.json`
- **Render** : Configuration via `render.yaml`
- **Vercel** : Configuration via `vercel.json`
- **Heroku** : Via `Procfile`
- **Docker** : Via `Dockerfile`

---

## 📈 Fonctionnalités Avancées

### 1. Gestion Multi-Produits par Client
- Un client peut avoir plusieurs produits hardware assignés
- Chaque produit peut être de type "buy" (achat) ou "rent" (location)
- Suivi de la date d'ajout de chaque produit
- Calculs d'investissement basés sur tous les produits

### 2. Système de Catégories
- Organisation des produits par catégories
- Filtrage des analyses par catégorie
- Statistiques agrégées par catégorie
- Validation automatique (pas de doublons, lowercase)

### 3. Calculs Financiers Automatiques
- Calcul automatique des mois écoulés depuis le début du contrat
- Calcul de la rentabilité en temps réel
- Projection des revenus annuels
- Suivi du cash flow mois par mois

### 4. Visualisations
- Graphiques en barres pour la valeur par client
- Graphiques en camembert pour les distributions
- Tableaux interactifs avec tri et filtres
- Indicateurs visuels (barres de progression, badges de statut)

---

## 🔧 Technologies et Bibliothèques Clés

### Frontend
- **React 18** : Framework UI
- **TypeScript** : Typage statique
- **TanStack Query** : Gestion des données serveur avec cache
- **React Hook Form** : Gestion des formulaires
- **Zod** : Validation de schémas
- **Recharts** : Graphiques et visualisations
- **Tailwind CSS** : Styling utility-first
- **Radix UI** : Composants accessibles
- **Lucide React** : Icônes modernes

### Backend
- **Express** : Framework web Node.js
- **Drizzle ORM** : ORM type-safe
- **Supabase** : BaaS (Backend as a Service)
- **PostgreSQL** : Base de données relationnelle

### Outils
- **Vite** : Build tool rapide
- **Drizzle Kit** : Migrations de base de données
- **ESBuild** : Bundler pour le serveur

---

## 📝 Notes Importantes

### Compatibilité Ascendante
- Le système maintient la compatibilité avec l'ancien champ `product_id` dans clients
- Le champ `quantity` dans products est conservé pour compatibilité mais `stock_actuel` est utilisé
- Migration progressive vers le nouveau format `products` (JSONB)

### Performance
- Utilisation de React Query pour le cache et la synchronisation
- Subscriptions Supabase pour les mises à jour en temps réel
- Calculs côté client pour une réactivité immédiate
- Indexes sur les colonnes fréquemment requêtées

### Sécurité
- RLS (Row Level Security) activé sur Supabase
- Validation des données côté client et serveur
- Gestion sécurisée des sessions
- Variables d'environnement pour les secrets

---

## 🎯 Cas d'Usage Principaux

1. **Gestionnaire de Stock** : Suivre l'inventaire hardware, ajouter/modifier/supprimer des produits
2. **Gestionnaire de Clients** : Créer et gérer les clients, assigner du matériel, suivre les contrats
3. **Analyste Financier** : Analyser les investissements, revenus, rentabilité par client et catégorie
4. **Administrateur** : Gérer les catégories, suivre les commissions, configurer le système

---

## 📚 Documentation Additionnelle

- `IMPLEMENTATION_SUMMARY.md` : Résumé des fonctionnalités implémentées par priorité
- `DEPLOYMENT.md` : Guide de déploiement détaillé
- `SUPABASE_SETUP.md` : Configuration Supabase
- `GIT_WORKFLOW.md` : Workflow Git recommandé
- `design_guidelines.md` : Guidelines de design

---

## 🔮 Améliorations Futures Possibles

- [ ] Système de notifications pour stock bas
- [ ] Export Excel/PDF des rapports
- [ ] Historique des mouvements de stock
- [ ] Graphiques de tendances temporelles
- [ ] Système de permissions utilisateurs
- [ ] API REST complète documentée
- [ ] Tests unitaires et d'intégration
- [ ] Mode hors-ligne avec synchronisation
- [ ] Notifications push pour événements importants
- [ ] Dashboard personnalisable

---

## 📞 Support

Pour toute question ou problème, consultez :
- La documentation Supabase : https://supabase.com/docs
- La documentation React Query : https://tanstack.com/query
- La documentation Drizzle ORM : https://orm.drizzle.team

---

**Dernière mise à jour** : 2025

