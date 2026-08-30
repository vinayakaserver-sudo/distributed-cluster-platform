# ClusterControl

A self-managed distributed database platform — Firebase-like backend infrastructure built from multiple cloud nodes. Includes a real-time web dashboard, API gateway, node agent system, and per-node services (database, auth, file storage, cache/search).

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              CLIENT APPLICATIONS            │
└──────────────────┬──────────────────────────┘
                   │  REST / WebSocket
                   ▼
┌─────────────────────────────────────────────┐
│           API GATEWAY  :9000                │
│  • Routes requests to correct node          │
│  • JWT token validation                     │
│  • Health-aware load balancing              │
│  • Automatic failover                       │
└──┬──────────┬──────────┬────────────────────┘
   │          │          │
   ▼          ▼          ▼
[Node 1]   [Node 3]   [Node 4]
Primary    Auth Svc   File Svc
Database   :8003      :8004
:8001
   │
[Node 2]   [Node 5]
Replica    Cache/Search
:8002      :8005

All nodes ◄──────────────► Control Plane :8000
           Heartbeat/WS      Dashboard :3000
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| **Control Plane** | 8000 | Central registry, heartbeat monitor, WebSocket hub |
| **Dashboard** | 3000 | Real-time admin UI (React/Next.js) |
| **API Gateway** | 9000 | Single client endpoint, routing, auth, load balancing |
| **Node 1** | 8001 | Primary PostgreSQL database node |
| **Node 2** | 8002 | Read replica, auto-syncs from Node 1 |
| **Node 3** | 8003 | Authentication service (JWT, user management) |
| **Node 4** | 8004 | File/object storage (S3-compatible API) |
| **Node 5** | 8005 | Cache, full-text search, background jobs |

---

## Quick Start (Local Development)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### 1. Clone and configure
```bash
git clone <your-repo-url>
cd adventurous-bohr

# Copy and edit the environment file
cp .env.example .env
# Edit .env: set your PostgreSQL URLs (see below) and change JWT_SECRET
```

### 2. Start all services
```bash
docker-compose up --build
```

This starts all 8 containers. Wait ~30 seconds for them to initialize.

### 3. Open the dashboard
Visit [http://localhost:3000](http://localhost:3000)

Login with:
- **Username**: `admin` (or what you set in `.env`)
- **Password**: `admin123` (or what you set in `.env`)

### 4. Test the API gateway
```bash
# Register a user (via API gateway → auth node)
curl -X POST http://localhost:9000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "email": "alice@example.com", "password": "secret123"}'

# Login
curl -X POST http://localhost:9000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "secret123"}'

# Use the returned token for authenticated requests
curl http://localhost:9000/gateway/status
```

---

## PostgreSQL Setup (Free Tier)

For Node 1 and Node 2, you need PostgreSQL connection URLs. Options:

### Option A: Neon (Recommended — free, serverless)
1. Sign up at [neon.tech](https://neon.tech)
2. Create a project → get connection string
3. Set `NODE1_DATABASE_URL` in `.env`
4. For Node 2 (replica): create a second database in Neon or use the same URL as read replica

### Option B: Supabase (free 500 MB)
1. Sign up at [supabase.com](https://supabase.com)
2. Settings → Database → Connection String
3. Use direct connection (not pooler) for asyncpg

> **Note**: Without a DATABASE_URL, the DB nodes will start but return errors on DB queries. All other nodes (auth, file, cache) work without PostgreSQL.

---

## Project Structure

```
adventurous-bohr/
├── control-plane/      # FastAPI central management server
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── db.py           # SQLAlchemy models + SQLite
│   │   ├── security.py     # JWT, API keys, bcrypt
│   │   ├── routers/        # auth, nodes, cluster, websocket
│   │   └── services/       # node_manager, heartbeat_monitor, ws_manager
│   ├── Dockerfile
│   └── requirements.txt
│
├── node-agent/         # Lightweight Python agent (runs on each node)
│   ├── agent/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── metrics.py      # psutil-based hardware stats
│   │   ├── registration.py # Self-registration with control plane
│   │   ├── heartbeat.py    # Periodic metric sender
│   │   ├── commands.py     # Command processor (restart, disable, etc.)
│   │   ├── ws_client.py    # Persistent WebSocket to control plane
│   │   ├── service_registry.py
│   │   └── services/
│   │       ├── db_service.py       # Node 1/2: PostgreSQL proxy
│   │       ├── auth_service.py     # Node 3: JWT + user management
│   │       ├── file_service.py     # Node 4: File storage
│   │       └── cache_service.py    # Node 5: Cache + search + jobs
│   ├── Dockerfile
│   └── requirements.txt
│
├── dashboard/          # Next.js 14 admin dashboard
│   ├── src/
│   │   ├── app/            # App router pages
│   │   ├── components/     # NodeCard, MetricGauge, LogViewer, etc.
│   │   ├── hooks/          # useNodes, useClusterStats, useClusterLogs
│   │   └── lib/            # API client, WebSocket client, utils
│   ├── Dockerfile
│   └── package.json
│
├── api-gateway/        # FastAPI reverse proxy + load balancer
│   ├── gateway/
│   │   ├── main.py         # Catch-all proxy handler
│   │   ├── router.py       # Path → node type classification
│   │   ├── auth.py         # JWT validation (local + remote)
│   │   ├── load_balancer.py# Health-aware round-robin
│   │   └── config.py
│   ├── Dockerfile
│   └── requirements.txt
│
├── shared/
│   └── schemas.py      # Shared Pydantic models (node, metrics, commands)
│
├── deploy/
│   └── render.yaml     # Render.com blueprint (free tier deployment)
│
├── docker-compose.yml  # Local dev: all 8 services
├── .env.example        # Environment variables template
└── README.md
```

---

## API Reference

### Control Plane API (`localhost:8000`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/login` | Admin login → JWT |
| GET | `/api/v1/nodes` | List all nodes |
| GET | `/api/v1/nodes/{id}` | Node details + metrics |
| POST | `/api/v1/nodes/{id}/command` | Send command to node |
| POST | `/api/v1/nodes/{id}/heartbeat` | Node heartbeat (internal) |
| GET | `/api/v1/cluster/stats` | Cluster-wide statistics |
| GET | `/api/v1/cluster/logs` | Recent logs from all nodes |
| WS | `/ws/dashboard` | Real-time dashboard feed |
| WS | `/ws/nodes/{id}` | Node agent connection |

### API Gateway (`localhost:9000`)

| Path prefix | Routes to |
|-------------|-----------|
| `/auth/*` | Node 3 (auth service) |
| `/files/*` | Node 4 (file storage) |
| `/search/*` | Node 5 (cache/search) |
| `/cache/*` | Node 5 (cache/search) |
| `/jobs/*` | Node 5 (background jobs) |
| `/db/*` | Node 1 (write) or Node 2 (read) |
| `/data/*` | Same as `/db/*` |

### Node Services (reached via gateway)

**Auth** (`/auth/`):
- `POST /auth/register` — Create user
- `POST /auth/login` — Get JWT
- `POST /auth/validate` — Validate token
- `GET /auth/users/{id}` — User info

**Database** (`/db/`):
- `POST /db/query` — Execute SQL `{sql, params}`
- `GET /db/tables` — List tables
- `GET /db/status` — Connection status

**Files** (`/files/`):
- `POST /files/upload` — Upload file (multipart)
- `GET /files/{id}` — Download file
- `GET /files/` — List all files
- `DELETE /files/{id}` — Delete file

**Cache** (`/cache/`):
- `GET /cache/{key}` — Get cached value
- `PUT /cache/{key}` — Set value `{value, ttl_seconds}`
- `DELETE /cache/{key}` — Delete key

**Search** (`/search/`):
- `POST /search/index` — Index document `{id, title, content}`
- `GET /search?q=query` — Full-text search

**Jobs** (`/jobs/`):
- `POST /jobs` — Submit job `{type, payload}`
- `GET /jobs/{id}` — Job status

---

## Cloud Deployment (Render.com Free Tier)

1. Push this repository to GitHub
2. Go to [render.com](https://render.com) → **New** → **Blueprint**
3. Connect your GitHub repo and select `deploy/render.yaml`
4. Set the one required secret: `NODE1_DATABASE_URL` (your Neon PostgreSQL URL)
5. Deploy — all 8 services start automatically

> **Free tier note**: Render free services spin down after 15 minutes of inactivity. This causes ~30 second cold starts. For production use, upgrade to paid tier or use Railway/Fly.io which have better always-on free tiers.

---

## Scaling to 20+ Nodes

The system is designed for horizontal scaling:

1. **Add a new node**: Deploy another instance of `node-agent` with a different `NODE_TYPE` and `NODE_NAME`. It auto-registers with the control plane on startup.

2. **The control plane** tracks all nodes dynamically — no config changes needed.

3. **The API gateway** syncs its node list from the control plane every 15 seconds and automatically includes new nodes in load balancing.

4. **Dashboard** shows new nodes immediately when they send their first heartbeat.

For **20+ nodes**, consider:
- Upgrading the control plane database from SQLite to PostgreSQL
- Adding a proper consensus algorithm (Raft) for leader election
- Using consistent hashing for data sharding across DB nodes

---

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Control Plane | Python 3.11, FastAPI, SQLAlchemy, aiosqlite |
| Node Agent | Python 3.11, FastAPI, psutil |
| Dashboard | Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui, Recharts |
| API Gateway | Python 3.11, FastAPI, httpx |
| DB Service | asyncpg, PostgreSQL (Neon) |
| Auth Service | PyJWT, bcrypt, aiosqlite |
| File Service | aiofiles, SQLite |
| Cache/Search | diskcache, Whoosh |
| Dev Environment | Docker Compose |
| Cloud Deployment | Render.com |

---

## Contributing

This is a prototype. Key areas for future improvement:
- [ ] Raft consensus for leader election
- [ ] Consistent hash ring for data sharding
- [ ] Automatic data redistribution on node failure
- [ ] Custom binary database engine (Phase 2)
- [ ] SDK clients (Python, JavaScript, Go)
- [ ] Metrics export to Prometheus/Grafana
