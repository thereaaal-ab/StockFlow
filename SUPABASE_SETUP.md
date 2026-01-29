# Supabase Setup Guide

This project is configured to use Supabase as the database. Follow these steps to complete the setup:

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Project URL
SUPABASE_URL=https://ptuosweivwyiwmguxagx.supabase.co

# Frontend Supabase Configuration (safe to expose)
VITE_SUPABASE_URL=https://ptuosweivwyiwmguxagx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0dW9zd2Vpdnd5aXdtZ3V4YWd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NzI3ODMsImV4cCI6MjA3OTE0ODc4M30.7OBus8MSO1QxxcInr42fovMgfg92VMBAH5oWq2dq4a4

# Backend Supabase Configuration (NEVER expose to frontend)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0dW9zd2Vpdnd5aXdtZ3V4YWd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzU3Mjc4MywiZXhwIjoyMDc5MTQ4NzgzfQ.B7cw-QChn1GAQXDy-tFm5JGJFYNl8ltcxKdcoqP-Nfg

# Database Connection String (Postgres URI)
# Get this from: Supabase Dashboard > Settings > Database > Connection string
# Select "URI" mode and copy the connection string
# Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
SUPABASE_DB_URL=postgresql://postgres.ptuosweivwyiwmguxagx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# Server Configuration
PORT=5000
NODE_ENV=development
```

## Getting the Database Connection String

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/ptuosweivwyiwmguxagx
2. Navigate to **Settings** > **Database**
3. Scroll down to **Connection string**
4. Select **URI** mode
5. Copy the connection string (it will include your database password)
6. Replace `[YOUR-PASSWORD]` in the `.env` file with the actual connection string

## Security Notes

⚠️ **IMPORTANT**: 
- The **anon key** is safe to use in the frontend (it's already in `client/src/lib/supabase.ts`)
- The **service role key** should NEVER be exposed to the frontend - it has admin privileges
- The **database connection string** contains your database password - keep it secure

## Usage

### Server-Side (Backend)
- Use `db` from `server/db.ts` for Drizzle ORM queries
- Use `supabaseAdmin` from `server/supabase.ts` for admin operations

### Client-Side (Frontend)
- Use `supabase` from `client/src/lib/supabase.ts` for client-side operations
- This uses the anon key and respects Row Level Security (RLS) policies

## Running Migrations

After setting up the database connection string, you can push your schema to Supabase:

```bash
npm run db:push
```

This will create the tables defined in `shared/schema.ts` in your Supabase database.

