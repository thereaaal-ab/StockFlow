# StockFlow

A modern inventory and client management system built with React, TypeScript, and Supabase.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Supabase account and project

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Project URL
SUPABASE_URL=your_supabase_project_url

# Frontend Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend Supabase Configuration
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database Connection String
SUPABASE_DB_URL=your_postgresql_connection_string

# Server Configuration
PORT=5000
NODE_ENV=development
```

**Where to find these values:**
- Go to your Supabase project dashboard
- **Project URL**: Settings → API → Project URL
- **Anon Key**: Settings → API → Project API keys → `anon` `public`
- **Service Role Key**: Settings → API → Project API keys → `service_role` `secret`
- **Database URL**: Settings → Database → Connection string → URI mode

### 3. Database Setup

Run the database schema in your Supabase SQL Editor:

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Open the `database_schema.sql` file
4. Copy and paste the entire content into the SQL Editor
5. Click "Run" to execute

### 4. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5000`

### 5. Authentication

The app uses Google OAuth for authentication. Make sure to:

1. Enable Google provider in Supabase: Authentication → Providers → Google
2. Configure your Google OAuth credentials
3. Add redirect URLs in Supabase: `http://localhost:5000` (and your production URL if applicable)

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run start` - Start the production server
- `npm run check` - Run TypeScript type checking
- `npm run db:push` - Push database schema changes to Supabase

## Features

- 📦 **Inventory Management** - Track products, stock levels, and hardware
- 👥 **Client Management** - Manage clients, contracts, and subscriptions
- 📊 **Analytics Dashboard** - View revenue, commissions, and key metrics
- 🎨 **Modern UI** - Built with React, TypeScript, and Tailwind CSS
- 🔐 **Secure Authentication** - Google OAuth integration via Supabase

## Project Structure

```
├── client/          # Frontend React application
├── server/          # Backend Express server
├── shared/          # Shared TypeScript schemas
├── database_schema.sql  # Complete database schema
└── .env            # Environment variables (create this)
```

## Troubleshooting

**Environment variables not loading?**
- Make sure the `.env` file is in the root directory
- Restart the dev server after creating/updating `.env`
- Check that all `VITE_` prefixed variables are set for frontend

**Database connection issues?**
- Verify your `SUPABASE_DB_URL` is correct
- Check that your Supabase project is active
- Ensure the database schema has been run

**Authentication not working?**
- Verify Google OAuth is enabled in Supabase
- Check redirect URLs are configured correctly
- Ensure your Google OAuth credentials are valid

## License

MIT

