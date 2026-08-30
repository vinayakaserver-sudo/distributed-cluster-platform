export function getSdkSnippets(gatewayUrl: string, apiKey: string) {
  return {
    javascript: `// 1. Install VKCloud Web SDK
npm install @vkcloud/client

// 2. Initialize in your React / Next.js / Node app
import { createClient } from '@vkcloud/client';

const vk = createClient('${gatewayUrl}', '${apiKey || "YOUR_API_KEY"}');

// ── Auth: Sign Up a User
const { user, token } = await vk.auth.signUp({
  email: 'developer@example.com',
  password: 'SecurePassword123'
});

// ── Database: Query PostgreSQL Tables
const { data, error } = await vk.db.query('SELECT * FROM users WHERE active = true;');
console.log('Users:', data);

// ── Storage: Upload Files directly to Cloud
const file = event.target.files[0];
const { file_id, url } = await vk.storage.upload(file);
console.log('Public URL:', url);

// ── Cache: Set Fast Key-Value Cache
await vk.cache.set('user_profile_123', JSON.stringify(user), { ttl: 3600 });
const cached = await vk.cache.get('user_profile_123');`,

    python: `# 1. Install VKCloud Python SDK
pip install vkcloud-py

# 2. Connect to your cluster
from vkcloud import VKCloud

vk = VKCloud(endpoint="${gatewayUrl}", api_key="${apiKey || "YOUR_API_KEY"}")

# ── Auth: Sign In
session = vk.auth.sign_in(username="alice", password="SecurePassword123")

# ── Database: Execute SQL Query
records = vk.db.query("SELECT * FROM products ORDER BY price DESC LIMIT 10")
for item in records:
    print(item["name"], item["price"])

# ── Storage: Upload a file
upload = vk.storage.upload("./document.pdf")
print("Uploaded to:", upload["url"])

# ── Cache: Fast Key-Value
vk.cache.set("leaderboard_top", "Player1", ttl_seconds=600)`,

    flutter: `// 1. In pubspec.yaml
dependencies:
  vkcloud_flutter: ^1.0.0

// 2. Initialize in Dart
import 'package:vkcloud_flutter/vkcloud.dart';

final vk = VKCloud(
  baseUrl: '${gatewayUrl}',
  apiKey: '${apiKey || "YOUR_API_KEY"}',
);

// Sign In
final auth = await vk.auth.signIn(
  username: 'mobile_user',
  password: 'Password123',
);

// Fetch Data
final results = await vk.db.query('SELECT * FROM orders WHERE user_id = 1');`,

    curl: `# ── Authenticate & Get Token
curl -X POST "${gatewayUrl}/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{"username": "admin", "password": "admin123"}'

# ── Execute PostgreSQL Query
curl -X POST "${gatewayUrl}/db/query" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"sql": "SELECT * FROM information_schema.tables;"}'

# ── Upload File
curl -X POST "${gatewayUrl}/files/upload" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -F "file=@./image.png"

# ── Fast Cache Key
curl -X PUT "${gatewayUrl}/cache/my_key" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"value": "Hello from VKCloud", "ttl_seconds": 3600}'`
  };
}
