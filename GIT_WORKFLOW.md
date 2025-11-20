# Git Workflow Guide for StockFlowAnalytics

## Current Git Status

✅ **Repository initialized**  
✅ **Git user configured**: thereaaal-ab (abdouxsniper123@gmail.com)  
✅ **Current branch**: main  
⚠️ **Remote**: Currently set to placeholder URL

## Common Git Commands

### View Status
```bash
git status                    # See what files have changed
git status --short            # Compact status view
git log --oneline             # View commit history
```

### Making Changes
```bash
# Stage files
git add .                     # Add all changes
git add <filename>            # Add specific file

# Commit changes
git commit -m "Your message"  # Commit with message
git commit -am "Message"      # Add and commit in one step (only for tracked files)

# View what will be committed
git diff                      # See unstaged changes
git diff --staged             # See staged changes
```

### Branch Management
```bash
git branch                    # List all branches
git branch <name>             # Create new branch
git checkout <branch>         # Switch to branch
git checkout -b <branch>      # Create and switch to new branch
git merge <branch>            # Merge branch into current branch
```

### Remote Repository (GitHub)

#### Set up GitHub remote (replace with your actual repo URL)
```bash
# Remove placeholder remote
git remote remove origin

# Add your GitHub repository
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Or if you prefer SSH
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git
```

#### Push to GitHub
```bash
git push -u origin main       # First time pushing (sets upstream)
git push                      # Subsequent pushes
```

#### Pull from GitHub
```bash
git pull                      # Pull latest changes
git fetch                     # Fetch without merging
git pull origin main          # Pull from specific remote/branch
```

### Useful Commands
```bash
# View remote repositories
git remote -v

# Update remote URL
git remote set-url origin <new-url>

# Undo changes
git restore <file>            # Discard changes to file
git restore --staged <file>   # Unstage file
git reset HEAD~1              # Undo last commit (keep changes)

# View file history
git log -- <file>             # See commits for specific file
git blame <file>              # See who changed each line
```

## Typical Workflow

### Daily Development
```bash
# 1. Check status
git status

# 2. Make your changes to files

# 3. Stage changes
git add .

# 4. Commit
git commit -m "Description of changes"

# 5. Push to GitHub
git push
```

### Working with Features
```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes and commit
git add .
git commit -m "Add new feature"

# 3. Push branch
git push -u origin feature/new-feature

# 4. Switch back to main
git checkout main

# 5. Merge feature
git merge feature/new-feature

# 6. Push merged changes
git push
```

## Important Notes

⚠️ **Never commit these files** (already in .gitignore):
- `.env` - Contains sensitive keys
- `node_modules/` - Dependencies
- `dist/` - Build output
- `.local/` - Local development files

✅ **Always commit**:
- Source code changes
- Configuration files (except .env)
- Documentation updates
- Deployment files

## Quick Reference

| Action | Command |
|--------|---------|
| Check status | `git status` |
| Add all files | `git add .` |
| Commit | `git commit -m "message"` |
| Push | `git push` |
| Pull | `git pull` |
| View history | `git log --oneline` |
| Create branch | `git checkout -b branch-name` |
| Switch branch | `git checkout branch-name` |

