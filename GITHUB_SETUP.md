# Adding Project to GitHub

Follow these steps to add your StockFlowAnalytics project to GitHub.

## Step 1: Create a GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **+** icon in the top right corner
3. Select **New repository**
4. Name your repository (e.g., `StockFlowAnalytics`)
5. Choose **Public** or **Private**
6. **DO NOT** initialize with README, .gitignore, or license (we already have these)
7. Click **Create repository**

## Step 2: Add All Files to Git

Run these commands in your terminal (from the project root):

```bash
# Stage all files
git add .

# Commit the changes
git commit -m "Initial commit: StockFlowAnalytics application"
```

## Step 3: Connect to GitHub and Push

After creating the repository on GitHub, you'll see instructions. Use these commands:

```bash
# Add the remote repository (replace YOUR_USERNAME and YOUR_REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Rename branch to main if needed (GitHub uses 'main' by default)
git branch -M main

# Push to GitHub
git push -u origin main
```

## Alternative: Using SSH

If you prefer SSH (and have it set up):

```bash
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## Important Notes

⚠️ **Security**: The `.env` file is already in `.gitignore` and will NOT be pushed to GitHub. This is important because it contains sensitive keys.

✅ **What will be pushed**:
- All source code
- Configuration files
- Deployment files
- Documentation

❌ **What will NOT be pushed** (protected by .gitignore):
- `.env` file (contains sensitive keys)
- `node_modules/` (dependencies)
- `dist/` (build output)
- `.local/` (local development files)

## After Pushing

1. Your code will be on GitHub
2. You can now connect it to deployment platforms (Railway, Render, etc.)
3. Share the repository URL with collaborators
4. Set up GitHub Actions for CI/CD if needed

## Troubleshooting

### If you get "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

### If you need to update the remote URL
```bash
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

### If you get authentication errors
- Use a Personal Access Token instead of password
- Or set up SSH keys for GitHub
- See: https://docs.github.com/en/authentication

