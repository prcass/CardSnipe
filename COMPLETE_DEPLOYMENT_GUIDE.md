# 🚀 CardSnipe: Complete Deployment Guide

This guide walks you through every single step to get CardSnipe running in production. Follow it exactly!

---

## 📋 What You'll Set Up

| Service | Purpose | Cost | Time |
|---------|---------|------|------|
| eBay Developer Account | Get live listing data | Free | 10 min |
| Supabase | Database (PostgreSQL) | Free | 5 min |
| Railway | Host backend + worker | ~$5/mo | 10 min |
| Vercel | Host frontend | Free | 5 min |

**Total time: ~30 minutes**
**Total cost: ~$5/month**

---

## Step 1: Get eBay API Keys (10 min)

### 1.1 Create eBay Developer Account

1. Go to **[developer.ebay.com](https://developer.ebay.com)**
2. Click **"Join"** (top right)
3. Sign in with your eBay account (or create one)
4. Fill out the developer registration form

### 1.2 Create an Application

1. Once registered, go to **[developer.ebay.com/my/keys](https://developer.ebay.com/my/keys)**
2. Click **"Create a keyset"**
3. Select **"Production"** (not Sandbox!)
4. Application Title: `CardSnipe`
5. Click **"Create a keyset"**

### 1.3 Save Your Keys

You'll see two values - **copy these somewhere safe**:
```
App ID (Client ID):     YOUR_CLIENT_ID_HERE
Cert ID (Client Secret): YOUR_CLIENT_SECRET_HERE
```

### 1.4 Configure OAuth Settings

1. On the same page, find your Production keyset
2. Click **"User Tokens"** 
3. Under "OAuth Accepted URL", add: `https://your-app.railway.app/auth/callback`
   (You can update this later)

✅ **Checkpoint: You have your eBay Client ID and Client Secret**

---

## Step 2: Create Supabase Database (5 min)

### 2.1 Sign Up for Supabase

1. Go to **[supabase.com](https://supabase.com)**
2. Click **"Start your project"**
3. Sign in with GitHub (easiest)

### 2.2 Create a New Project

1. Click **"New project"**
2. Fill in:
   - **Name:** `cardsnipe`
   - **Database Password:** Create a strong password → **SAVE THIS!**
   - **Region:** Choose closest to you
3. Click **"Create new project"**
4. Wait 1-2 minutes for setup

### 2.3 Get Your Connection String

1. In your project, go to **Settings** (gear icon) → **Database**
2. Scroll to **"Connection string"**
3. Select **"URI"** tab
4. Copy the connection string - it looks like:
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
```
5. Replace `[YOUR-PASSWORD]` with the password you created

✅ **Checkpoint: You have your DATABASE_URL**

---

## Step 3: Deploy Backend to Railway (10 min)

### 3.1 Sign Up for Railway

1. Go to **[railway.app](https://railway.app)**
2. Click **"Login"** → Sign in with GitHub

### 3.2 Create a New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. If prompted, authorize Railway to access your GitHub

### 3.3 Push Your Code to GitHub First

If you haven't already, push the backend code to GitHub:

```bash
# In your terminal, navigate to the backend folder
cd cardsnipe-production

# Initialize git and push
git init
git add .
git commit -m "Initial commit"
gh repo create cardsnipe-backend --public --push
# Or use: git remote add origin YOUR_GITHUB_REPO_URL && git push -u origin main
```

### 3.4 Deploy on Railway

1. Back in Railway, select your `cardsnipe-backend` repo
2. Click **"Deploy"**

### 3.5 Add Environment Variables

1. Click on your deployed service
2. Go to **"Variables"** tab
3. Click **"Add Variable"** and add these one by one:

```
EBAY_CLIENT_ID        = (your eBay Client ID from Step 1)
EBAY_CLIENT_SECRET    = (your eBay Client Secret from Step 1)
EBAY_ENVIRONMENT      = PRODUCTION
DATABASE_URL          = (your Supabase connection string from Step 2)
NODE_ENV              = production
PORT                  = 3001
```

### 3.6 Run Database Migrations

1. In Railway, click on your service
2. Go to **"Settings"** → **"Deploy"**
3. Set Start Command to:
```
npm run db:migrate && npm start
```
4. Railway will redeploy automatically

### 3.7 Get Your Backend URL

1. Go to **"Settings"** → **"Networking"**
2. Click **"Generate Domain"**
3. Copy your URL (like `cardsnipe-backend-production.up.railway.app`)

✅ **Checkpoint: Your backend is live! Test it:**
```
https://YOUR-RAILWAY-URL/api/stats
```

### 3.8 Add the Worker (Important!)

1. In Railway, click **"New"** → **"Empty Service"**
2. Connect it to the same GitHub repo
3. In Settings, set the Start Command to:
```
npm run worker
```
4. Add the same environment variables as the main service
5. This worker will continuously fetch listings!

---

## Step 4: Deploy Frontend to Vercel (5 min)

### 4.1 Push Frontend to GitHub

```bash
cd cardsnipe-frontend
git init
git add .
git commit -m "Initial commit"
gh repo create cardsnipe-frontend --public --push
```

### 4.2 Deploy on Vercel

1. Go to **[vercel.com](https://vercel.com)**
2. Sign in with GitHub
3. Click **"Add New..."** → **"Project"**
4. Import your `cardsnipe-frontend` repo
5. Vercel auto-detects Vite - just click **"Deploy"**

### 4.3 Add Environment Variable

1. After deployment, go to **Settings** → **Environment Variables**
2. Add:
```
VITE_API_URL = https://YOUR-RAILWAY-URL (from Step 3.7)
```
3. Redeploy for changes to take effect

### 4.4 Get Your Frontend URL

Your app is now live at:
```
https://cardsnipe-frontend.vercel.app
```
(or similar)

✅ **Checkpoint: Your app is fully deployed!**

---

## Step 5: Verify Everything Works

### Test the Backend
```bash
# Should return JSON with stats
curl https://YOUR-RAILWAY-URL/api/stats

# Should return deals
curl https://YOUR-RAILWAY-URL/api/deals
```

### Test the Frontend
1. Visit your Vercel URL
2. You should see the CardSnipe interface
3. The "LIVE" badge should appear (not "DEMO")
4. Deals should populate within a few minutes as the worker runs

---

## 🎉 You're Done!

Your CardSnipe app is now:
- ✅ Fetching real listings from eBay every 5 minutes
- ✅ Calculating deal scores based on market values
- ✅ Showing live auctions with countdown timers
- ✅ Auto-refreshing every 30 seconds

---

## 📊 Monitoring & Logs

### View Backend Logs (Railway)
1. Railway Dashboard → Your service → **"Logs"** tab
2. Look for:
   - `✅ eBay OAuth token refreshed`
   - `🔥 NEW HOT DEAL: ...`
   - `✅ Scan complete. X active listings.`

### View Database (Supabase)
1. Supabase Dashboard → **"Table Editor"**
2. Check the `listings` table for data

---

## 🔧 Troubleshooting

### "DEMO" badge showing instead of "LIVE"
- Check that `VITE_API_URL` is set correctly in Vercel
- Make sure the Railway backend is running
- Check Railway logs for errors

### No deals appearing
- The worker takes 5-10 minutes to complete first scan
- Check Railway worker logs for errors
- Verify eBay API keys are correct

### Database errors
- Confirm DATABASE_URL is correct in Railway
- Check that migrations ran: look for "All tables created" in logs

### eBay API errors
- Verify you're using **Production** keys, not Sandbox
- Check that Client ID and Secret are correct
- eBay rate limits: 5,000 calls/day on free tier

---

## 📈 Next Steps

1. **Add more players** - Edit `worker.js` to monitor more players
2. **Email alerts** - Add SendGrid/Resend for hot deal notifications  
3. **User accounts** - Add authentication for saved watchlists
4. **Mobile app** - Use React Native with the same API
5. **Monetization** - Add eBay affiliate links (eBay Partner Network)

---

## 💰 Cost Breakdown

| Service | Free Tier | What You'll Pay |
|---------|-----------|-----------------|
| Railway | $5 credit/mo | ~$5-10/mo |
| Supabase | 500MB, 2 projects | $0 |
| Vercel | Unlimited | $0 |
| eBay API | 5,000 calls/day | $0 |

**Estimated monthly cost: $5-10**

---

## Need Help?

If you get stuck:
1. Check the logs (Railway for backend, browser console for frontend)
2. Verify all environment variables are set
3. Make sure migrations ran successfully

Good luck! 🃏🚀
