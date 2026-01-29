# Quick Deployment Guide - StockFlowAnalytics

## 🚀 Deploy to Railway (Easiest - Recommended)

### Step 1: Sign up for Railway
1. Go to [railway.app](https://railway.app)
2. Click **"Start a New Project"**
3. Sign up with your GitHub account (recommended for easy repo connection)

### Step 2: Create New Project
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Find and select your repository: `thereaaal-ab/StockFlow`
4. Railway will automatically detect your project

### Step 3: Add Environment Variables
1. In your Railway project, go to the **Variables** tab
2. Add these environment variables (get values from your `.env` file):

```
SUPABASE_URL=https://ptuosweivwyiwmguxagx.supabase.co
VITE_SUPABASE_URL=https://ptuosweivwyiwmguxagx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0dW9zd2Vpdnd5aXdtZ3V4YWd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NzI3ODMsImV4cCI6MjA3OTE0ODc4M30.7OBus8MSO1QxxcInr42fovMgfg92VMBAH5oWq2dq4a4
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0dW9zd2Vpdnd5aXdtZ3V4YWd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzU3Mjc4MywiZXhwIjoyMDc5MTQ4NzgzfQ.B7cw-QChn1GAQXDy-tFm5JGJFYNl8ltcxKdcoqP-Nfg
SUPABASE_DB_URL=postgresql://postgres.ptuosweivwyiwmguxagx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
NODE_ENV=production
```

⚠️ **Important**: Replace `[YOUR-PASSWORD]` in `SUPABASE_DB_URL` with your actual Supabase database password.

### Step 4: Deploy
1. Railway will automatically start building and deploying
2. Watch the build logs in the **Deployments** tab
3. Once deployed, Railway will provide you with a URL (e.g., `https://your-app.railway.app`)

### Step 5: Access Your App
- Your app will be live at the Railway-provided URL
- You can set a custom domain in Railway settings if needed

---

## 🌐 Alternative: Deploy to Render

### Step 1: Sign up
1. Go to [render.com](https://render.com)
2. Sign up with GitHub

### Step 2: Create Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository: `thereaaal-ab/StockFlow`
3. Configure:
   - **Name**: `stockflow-analytics` (or any name)
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: Leave empty (root)
   - **Environment**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm run start`

### Step 3: Add Environment Variables
Add the same environment variables as Railway (see Step 3 above)

### Step 4: Deploy
1. Click **"Create Web Service"**
2. Render will build and deploy automatically
3. Your app will be at: `https://your-app.onrender.com`

---

## 📋 Environment Variables Checklist

Before deploying, make sure you have these values ready:

- [ ] `SUPABASE_URL` - Your Supabase project URL
- [ ] `VITE_SUPABASE_URL` - Same as above
- [ ] `VITE_SUPABASE_ANON_KEY` - From Supabase dashboard
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - From Supabase dashboard (Settings > API)
- [ ] `SUPABASE_DB_URL` - Database connection string (Settings > Database)
- [ ] `NODE_ENV` - Set to `production`

---

## ✅ After Deployment

1. **Test your app**: Visit the provided URL
2. **Check logs**: Monitor for any errors
3. **Test features**: Make sure database connections work
4. **Update CORS** (if needed): If you have frontend issues, check Supabase CORS settings

---

## 🆘 Troubleshooting

### Build fails?
- Check build logs in Railway/Render dashboard
- Ensure all dependencies are in `package.json`
- Verify `npm run build` works locally first

### App won't start?
- Check environment variables are all set
- Verify `SUPABASE_DB_URL` has correct password
- Check logs for specific error messages

### Database connection errors?
- Verify `SUPABASE_DB_URL` is correct
- Check Supabase allows connections from your deployment platform
- Ensure SSL is enabled (already configured in code)

---

## 🎉 Success!

Once deployed, your app will be accessible from anywhere in the world!


