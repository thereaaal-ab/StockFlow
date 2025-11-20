# Deployment Guide

This guide covers deploying StockFlowAnalytics to various platforms.

## Prerequisites

1. Ensure all environment variables are set (see `.env.example`)
2. Build the application: `npm run build`
3. Test locally: `npm run start`

## Environment Variables Required

- `SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_URL` - Same as SUPABASE_URL (for frontend)
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key (safe for frontend)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (backend only, never expose)
- `SUPABASE_DB_URL` - PostgreSQL connection string from Supabase
- `PORT` - Server port (default: 5000, most platforms set this automatically)
- `NODE_ENV` - Set to `production` in production

## Deployment Options

### Option 1: Railway (Recommended)

1. Sign up at [railway.app](https://railway.app)
2. Create a new project
3. Connect your GitHub repository
4. Add environment variables in the Railway dashboard
5. Railway will automatically detect and deploy using `railway.json`

**Note:** Railway automatically sets the `PORT` environment variable.

### Option 2: Render

1. Sign up at [render.com](https://render.com)
2. Create a new Web Service
3. Connect your GitHub repository
4. Use the following settings:
   - **Build Command:** `npm run build`
   - **Start Command:** `npm run start`
5. Add all environment variables in the Render dashboard
6. Deploy

**Note:** Render uses port 10000 by default (configured in `render.yaml`).

### Option 3: Docker (Any Platform)

1. Build the Docker image:
   ```bash
   docker build -t stockflow-analytics .
   ```

2. Run the container:
   ```bash
   docker run -p 5000:5000 --env-file .env stockflow-analytics
   ```

3. For cloud platforms (AWS, Google Cloud, Azure, DigitalOcean):
   - Push to a container registry
   - Deploy using their container services

### Option 4: Vercel

**Note:** Vercel is optimized for serverless. For a full-stack Express app, Railway or Render are better options.

If you still want to use Vercel:
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project root
3. Add environment variables when prompted
4. The `vercel.json` configuration will handle routing

### Option 5: Heroku

1. Install Heroku CLI
2. Create a Heroku app: `heroku create your-app-name`
3. Set environment variables: `heroku config:set KEY=value`
4. Deploy: `git push heroku main`

**Note:** Heroku requires a `Procfile`:
```
web: npm run start
```

## Post-Deployment Checklist

- [ ] Verify all environment variables are set correctly
- [ ] Test the application is accessible
- [ ] Check that API routes are working
- [ ] Verify database connections
- [ ] Test authentication (if applicable)
- [ ] Check CORS settings if accessing from different domains
- [ ] Monitor logs for any errors

## Troubleshooting

### Port Issues
- Most platforms set `PORT` automatically
- If you see port binding errors, ensure the app listens on `0.0.0.0` (already configured)

### Database Connection Issues
- Verify `SUPABASE_DB_URL` is correct
- Check that your Supabase project allows connections from your deployment platform
- Ensure SSL is enabled for production connections

### Build Failures
- Ensure all dependencies are in `package.json`
- Check that build scripts work locally first
- Review platform-specific build logs

### Environment Variables Not Working
- Verify variables are set in the platform's dashboard
- Check that `VITE_` prefixed variables are available at build time
- Restart the application after adding new variables

