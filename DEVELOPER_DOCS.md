# 📚 VKCloud Developer Documentation & API Guide

Welcome to **VKCloud** — the distributed serverless cloud platform (Firebase & Supabase alternative).

This guide walks you through connecting your web, mobile, or backend applications to VKCloud to use:
- **🗄️ PostgreSQL Database** (Dedicated isolated schema per developer)
- **👤 User Authentication** (Register & authenticate your own app users with JWT)
- **📁 Object Storage** (Upload images, documents, and stream downloads)
- **⚡ In-Memory Cache & Search** (Fast key-value cache with TTL & full-text search)

---

## 🚀 1. Quickstart (5-Minute Onboarding)

### Step 1: Create your Developer Account
1. Open the [VKCloud Console](https://vkcloud.vercel.app/register).
2. Create your account with your username and password.
3. Your dedicated PostgreSQL schema (e.g. `tenant_yourusername`) is automatically created!

### Step 2: Get your Project API Credentials
In your [Console → API Keys](https://vkcloud.vercel.app/console/api-keys):
- **Gateway Endpoint:** `https://cluster-api-gateway.onrender.com`
- **Publishable Key:** `vk_pub_yourusername_...`
- **Secret Key:** `vk_sec_...`

---

## 🗄️ 2. PostgreSQL Database Guide

Every developer receives their own **completely isolated PostgreSQL schema** inside Neon PostgreSQL (Singapore Region: `ap-southeast-1`).

### Querying your Database via JavaScript / TypeScript
```javascript
const response = await fetch("https://cluster-api-gateway.onrender.com/db/query", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_JWT_TOKEN",
    "Content-Type": "application/json",
    "X-Tenant-Schema": "tenant_yourusername" // Routes query to your private schema
  },
  body: JSON.stringify({
    sql: "CREATE TABLE IF NOT EXISTS notes (id SERIAL PRIMARY KEY, title TEXT, content TEXT);"
  })
});

const result = await response.json();
console.log("Created table:", result);
```

### Querying your Database via Python
```python
import httpx

headers = {
    "Authorization": "Bearer YOUR_JWT_TOKEN",
    "Content-Type": "application/json",
    "X-Tenant-Schema": "tenant_yourusername"
}

# Insert Row
query_payload = {
    "sql": "INSERT INTO notes (title, content) VALUES ($1, $2) RETURNING *;",
    "params": ["My First Note", "Stored in isolated Neon schema!"]
}

res = httpx.post("https://cluster-api-gateway.onrender.com/db/query", json=query_payload, headers=headers)
print("Inserted:", res.json())
```

---

## 👤 3. User Authentication Guide

You can register and authenticate end-users for your web & mobile apps.

### Register an End-User
```bash
curl -X POST "https://cluster-api-gateway.onrender.com/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alex_customer",
    "email": "alex@example.com",
    "password": "SecurePassword123"
  }'
```

### User Sign In & JWT Issuance
```bash
curl -X POST "https://cluster-api-gateway.onrender.com/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alex_customer",
    "password": "SecurePassword123"
  }'
```
**Response:**
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "expires_in": 604800,
  "username": "alex_customer"
}
```

---

## 📁 4. Object Storage Guide

Upload files directly to permanent cloud storage with zero egress fees.

### Upload a File (cURL / Form-Data)
```bash
curl -X POST "https://cluster-api-gateway.onrender.com/files/upload" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@./profile.png"
```

**Response:**
```json
{
  "file_id": "8f3b20c9-9482-411a-829d-4028fa99cba1",
  "filename": "profile.png",
  "size": 245100,
  "provider": "neon_postgres",
  "url": "https://cluster-api-gateway.onrender.com/files/8f3b20c9-9482-411a-829d-4028fa99cba1"
}
```

### Download or Preview File
Simply navigate to `https://cluster-api-gateway.onrender.com/files/{file_id}` or embed it in an `<img>` tag!

---

## ⚡ 5. Fast Key-Value Cache & Search

### Set a Key with TTL (Expiration)
```bash
curl -X PUT "https://cluster-api-gateway.onrender.com/cache/user_session_99" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "active_user_data", "ttl_seconds": 3600}'
```

### Get a Cached Key
```bash
curl -X GET "https://cluster-api-gateway.onrender.com/cache/user_session_99" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🛡️ Multi-Tenant Architecture Overview

```
                          [ Client Applications ]
                                     │
                                     ▼
                    [ VKCloud API Gateway (:9000) ]
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
  [ Node 3 (Auth) ]         [ Node 1 / 2 (DB) ]         [ Node 4 (Storage) ]
   • User accounts           • Neon PostgreSQL           • Permanent Storage
   • JWT Token Minting       • tenant_user_a schema      • Direct streaming
                             • tenant_user_b schema
```

---

## 🤝 Support & Status
- **Cluster Control Dashboard:** [distributed-cluster-platform.vercel.app](https://distributed-cluster-platform.vercel.app)
- **Developer SaaS Console:** [vkcloud.vercel.app](https://vkcloud.vercel.app)
