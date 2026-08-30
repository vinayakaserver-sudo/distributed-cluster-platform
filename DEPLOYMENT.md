# 🌐 Multi-Cloud Free Tier Deployment Guide

Deploy your distributed cluster across **Vercel**, **Render**, and **Railway** for maximum resilience, zero cost, and global distribution.

---

## 🗺️ Recommended Multi-Cloud Distribution

```
┌────────────────────────────────────────────────────────┐
│                   VERCEL (Free Edge)                   │
│  • Dashboard Web UI (Next.js 14)                       │
│  • Zero cold starts, global CDN edge                   │
│  • https://your-cluster-dashboard.vercel.app           │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS / WSS
                           ▼
┌────────────────────────────────────────────────────────┐
│                   RENDER.COM (Free Web)                │
│  • Control Plane (FastAPI + SQLite registry)           │
│  • API Gateway (Reverse proxy & load balancer)         │
│  • Auto-restarts, public HTTPS endpoints               │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
      Private / Public HTTP      Private / Public HTTP
               ▼                          ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│       RAILWAY / RENDER       │ │            NEON              │
│  • Node 1 (Primary DB Proxy) │ │  • Serverless PostgreSQL     │
│  • Node 2 (Replica DB Proxy) │ │  • Free Tier in Singapore    │
│  • Node 3 (Auth Service)     │ │  • aws-ap-southeast-1        │
│  • Node 4 (File Storage)     │ └──────────────────────────────┘
│  • Node 5 (Cache & Search)   │
└──────────────────────────────┘
```

---

## Step 1: Push Project to GitHub

Make sure your repository is pushed to GitHub:

```powershell
git init
git add .
git commit -m "feat: complete distributed cluster platform"
# Create a new repo on github.com then run:
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy Control Plane on Render

1. Go to [render.com](https://render.com) and log in with GitHub.
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository.
4. Fill in the configuration:
   - **Name:** `cluster-control-plane`
   - **Root Directory:** `control-plane`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free
5. In **Environment Variables**, add:
   - `JWT_SECRET` = `(generate a random 32-character string)`
   - `ADMIN_USERNAME` = `admin`
   - `ADMIN_PASSWORD` = `(your custom password)`
   - `HEARTBEAT_TIMEOUT_SECONDS` = `45`
   - `METRICS_RETENTION_HOURS` = `24`
   - `DATABASE_URL` = `sqlite+aiosqlite:///./cluster.db`
   - `CORS_ORIGINS` = `["*"]`
6. Click **Create Web Service**.
7. **Copy your Control Plane URL** (e.g. `https://cluster-control-plane.onrender.com`).

---

## Step 3: Deploy Dashboard on Vercel

1. Go to [vercel.com](https://vercel.com) and log in with GitHub.
2. Click **Add New...** → **Project**.
3. Import your GitHub repository.
4. Under **Configure Project**:
   - **Framework Preset:** `Next.js`
   - **Root Directory:** Click Edit and select `dashboard`
5. Expand **Environment Variables** and add:
   - `NEXT_PUBLIC_API_URL` = `https://cluster-control-plane.onrender.com` *(use your Render URL from Step 2)*
6. Click **Deploy**.
7. In ~60 seconds, your dashboard will be live at `https://your-project.vercel.app`!

---

## Step 4: Deploy API Gateway on Render

1. On Render, click **New +** → **Web Service**.
2. Connect your repo:
   - **Name:** `cluster-api-gateway`
   - **Root Directory:** `api-gateway`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn gateway.main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free
3. In **Environment Variables**, add:
   - `CONTROL_PLANE_URL` = `https://cluster-control-plane.onrender.com`
   - `JWT_SECRET` = `(same JWT_SECRET from Step 2)`
4. Click **Create Web Service**.

---

## Step 5: Deploy Nodes on Railway or Render

You can deploy the 5 nodes across **Railway** and/or **Render** to distribute workloads.

### Deploying a Node on Railway:
1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
2. Select your repository.
3. In service **Settings**:
   - **Root Directory:** `/node-agent`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn agent.main:app --host 0.0.0.0 --port $PORT`
4. In **Variables**, add:
   - `NODE_NAME` = `node-3-auth` *(or node-1, node-2, etc.)*
   - `NODE_TYPE` = `auth` *(or primary_db, replica_db, file_storage, cache_search)*
   - `NODE_REGION` = `railway-us-west`
   - `CONTROL_PLANE_URL` = `https://cluster-control-plane.onrender.com`
   - `JWT_SECRET` = `(same JWT_SECRET from Step 2)`
   - *(For node-1/node-2)* `DATABASE_URL` = `(your Neon PostgreSQL connection string)`
5. Click **Deploy**.
6. The node will automatically register itself with your Control Plane on boot!

---

## ⚡ 1-Click Full Stack via Render Blueprint

If you prefer to deploy everything to Render in one click:
1. In Render, click **New +** → **Blueprint**.
2. Select your repo and choose `deploy/render.yaml`.
3. Fill in your Neon `DATABASE_URL` when prompted.
4. Render will automatically provision all 8 services and wire up internal URLs.
