# ClusterControl - Start All Services (No Docker Required)
# Run this script from the project root:
#   .\start.ps1
#
# Press Ctrl+C in any terminal to stop that service.
# Run .\stop.ps1 to kill all services at once.

$ROOT = $PSScriptRoot
$JWT_SECRET = "super-secret-dev-key-change-this"
$ADMIN_PASSWORD = "admin123"

# Colors
function Write-Step($msg) { Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "   OK: $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "   WARN: $msg" -ForegroundColor Yellow }

Write-Host @"

  ___  _         _           ___         _             _ 
 / __|| | _  _ _| |_  ___  / __|___ _ _| |_ _ _ ___  | |
| (__ | || || |_  _|/ -_) | (__/ _ \ ' \  _| '_/ _ \ | |
 \___||_| \_,_| |_| \___|  \___\___/_||_\__|_| \___/ |_|

  Distributed Database Cluster - Local Dev Startup
"@ -ForegroundColor Magenta

# ── Prerequisite checks ────────────────────────────────────────────────────
Write-Step "Checking prerequisites..."

$pythonCmd = $null
foreach ($cmd in @("python", "python3", "py")) {
    try {
        $ver = & $cmd --version 2>&1
        if ($ver -match "Python 3\.(1[0-9]|[2-9]\d)") {
            $pythonCmd = $cmd
            Write-OK "Python found: $ver ($cmd)"
            break
        }
    } catch {}
}
if (-not $pythonCmd) {
    Write-Host "ERROR: Python 3.10+ not found. Download from https://python.org" -ForegroundColor Red
    exit 1
}

try {
    $nodeVer = node --version 2>&1
    Write-OK "Node.js found: $nodeVer"
} catch {
    Write-Host "ERROR: Node.js not found. Download from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# ── Read Neon DB URL ────────────────────────────────────────────────────────
Write-Step "Database configuration..."
$DB_URL = $env:DATABASE_URL
if (-not $DB_URL) {
    # Try reading from root .env
    $envFile = Join-Path $ROOT ".env"
    if (Test-Path $envFile) {
        Get-Content $envFile | ForEach-Object {
            if ($_ -match "^NODE1_DATABASE_URL=(.+)$") {
                $DB_URL = $matches[1].Trim()
            }
        }
    }
}
if (-not $DB_URL) {
    Write-Warn "No DATABASE_URL found. DB nodes will start but queries will fail."
    Write-Warn "Set NODE1_DATABASE_URL in .env or run: `$env:DATABASE_URL='your-neon-url'"
    $DB_URL = ""
}

# ── Helper: setup Python venv ──────────────────────────────────────────────
function Setup-Venv($dir) {
    $venvPath = Join-Path $dir "venv"
    if (-not (Test-Path $venvPath)) {
        Write-Host "   Creating venv in $dir..." -ForegroundColor Gray
        & $pythonCmd -m venv $venvPath 2>&1 | Out-Null
    }
    $pip = Join-Path $venvPath "Scripts\pip.exe"
    $reqs = Join-Path $dir "requirements.txt"
    Write-Host "   Installing dependencies..." -ForegroundColor Gray
    & $pip install -q -r $reqs
    return (Join-Path $venvPath "Scripts\uvicorn.exe")
}

# ── Start services ─────────────────────────────────────────────────────────

Write-Step "Setting up Control Plane..."
$cpDir = Join-Path $ROOT "control-plane"
$cpUvicorn = Setup-Venv $cpDir

# Write control plane .env if missing
$cpEnv = Join-Path $cpDir ".env"
if (-not (Test-Path $cpEnv)) {
    @"
JWT_SECRET=$JWT_SECRET
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$ADMIN_PASSWORD
HEARTBEAT_TIMEOUT_SECONDS=30
METRICS_RETENTION_HOURS=24
DATABASE_URL=sqlite+aiosqlite:///./cluster.db
CORS_ORIGINS=["http://localhost:3000"]
"@ | Set-Content $cpEnv
    Write-OK "Created control-plane/.env"
}

$cpProcess = Start-Process -FilePath $cpUvicorn `
    -ArgumentList "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload" `
    -WorkingDirectory $cpDir `
    -PassThru -NoNewWindow `
    -RedirectStandardOutput (Join-Path $ROOT "logs\control-plane.log") `
    -RedirectStandardError  (Join-Path $ROOT "logs\control-plane-err.log")

Write-OK "Control Plane starting (PID $($cpProcess.Id)) → http://localhost:8000"

# Wait for control plane to be ready
Write-Host "   Waiting for Control Plane to be ready..." -ForegroundColor Gray
$ready = $false
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 2
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/cluster/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($resp.StatusCode -eq 200) { $ready = $true; break }
    } catch {}
    Write-Host "   ." -NoNewline -ForegroundColor Gray
}
if ($ready) {
    Write-OK "Control Plane is ready!"
} else {
    Write-Warn "Control Plane didn't respond in time. Nodes may fail to register."
}

# ── Node Agent setup ────────────────────────────────────────────────────────
Write-Step "Setting up Node Agent..."
$nodeDir = Join-Path $ROOT "node-agent"
$nodeUvicorn = Setup-Venv $nodeDir

# Create logs directory
New-Item -ItemType Directory -Force -Path (Join-Path $ROOT "logs") | Out-Null

# Node definitions: Name, Type, Port, ExtraEnv
$nodes = @(
    @{ Name="node-1-primary-db"; Type="primary_db";    Port=8001; Extra=@{ DATABASE_URL=$DB_URL } },
    @{ Name="node-2-replica-db"; Type="replica_db";    Port=8002; Extra=@{ DATABASE_URL=$DB_URL; PRIMARY_DB_URL="http://localhost:8001" } },
    @{ Name="node-3-auth";       Type="auth";           Port=8003; Extra=@{} },
    @{ Name="node-4-file";       Type="file_storage";   Port=8004; Extra=@{ DATA_DIR="./data/node4" } },
    @{ Name="node-5-cache";      Type="cache_search";   Port=8005; Extra=@{ CACHE_DIR="./cache/node5" } }
)

$nodeProcesses = @()

foreach ($node in $nodes) {
    Write-Step "Starting $($node.Name) on port $($node.Port)..."
    
    # Build env block
    $envBlock = @{
        NODE_NAME           = $node.Name
        NODE_TYPE           = $node.Type
        NODE_HOST           = "localhost"
        NODE_PORT           = "$($node.Port)"
        NODE_REGION         = "local"
        CONTROL_PLANE_URL   = "http://localhost:8000"
        JWT_SECRET          = $JWT_SECRET
        HEARTBEAT_INTERVAL  = "10"
    }
    foreach ($k in $node.Extra.Keys) {
        $envBlock[$k] = $node.Extra[$k]
    }

    # Write per-node .env file
    $nodeEnvPath = Join-Path $nodeDir ".env.$($node.Type)"
    $envBlock.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" } | Set-Content $nodeEnvPath

    # Create data/cache dirs
    New-Item -ItemType Directory -Force -Path (Join-Path $nodeDir "data\$($node.Type)") | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $nodeDir "cache\$($node.Type)") | Out-Null

    # Set env vars for this process
    $savedEnv = @{}
    foreach ($k in $envBlock.Keys) {
        $savedEnv[$k] = [System.Environment]::GetEnvironmentVariable($k)
        [System.Environment]::SetEnvironmentVariable($k, $envBlock[$k])
    }

    $proc = Start-Process -FilePath $nodeUvicorn `
        -ArgumentList "agent.main:app", "--host", "0.0.0.0", "--port", "$($node.Port)" `
        -WorkingDirectory $nodeDir `
        -PassThru -NoNewWindow `
        -RedirectStandardOutput (Join-Path $ROOT "logs\$($node.Type).log") `
        -RedirectStandardError  (Join-Path $ROOT "logs\$($node.Type)-err.log")

    # Restore env
    foreach ($k in $savedEnv.Keys) {
        [System.Environment]::SetEnvironmentVariable($k, $savedEnv[$k])
    }

    $nodeProcesses += $proc
    Write-OK "$($node.Name) starting (PID $($proc.Id)) → http://localhost:$($node.Port)"
    Start-Sleep -Milliseconds 500
}

# ── API Gateway ─────────────────────────────────────────────────────────────
Write-Step "Setting up API Gateway..."
$gwDir = Join-Path $ROOT "api-gateway"
$gwUvicorn = Setup-Venv $gwDir

$env:CONTROL_PLANE_URL = "http://localhost:8000"
$env:JWT_SECRET        = $JWT_SECRET
$env:NODE_1_URL        = "http://localhost:8001"
$env:NODE_2_URL        = "http://localhost:8002"
$env:NODE_3_URL        = "http://localhost:8003"
$env:NODE_4_URL        = "http://localhost:8004"
$env:NODE_5_URL        = "http://localhost:8005"

$gwProcess = Start-Process -FilePath $gwUvicorn `
    -ArgumentList "gateway.main:app", "--host", "0.0.0.0", "--port", "9000", "--reload" `
    -WorkingDirectory $gwDir `
    -PassThru -NoNewWindow `
    -RedirectStandardOutput (Join-Path $ROOT "logs\gateway.log") `
    -RedirectStandardError  (Join-Path $ROOT "logs\gateway-err.log")

Write-OK "API Gateway starting (PID $($gwProcess.Id)) → http://localhost:9000"

# ── Dashboard ──────────────────────────────────────────────────────────────
Write-Step "Setting up Dashboard..."
$dashDir = Join-Path $ROOT "dashboard"
$dashEnv = Join-Path $dashDir ".env.local"
if (-not (Test-Path $dashEnv)) {
    "NEXT_PUBLIC_API_URL=http://localhost:8000" | Set-Content $dashEnv
}

Write-Host "   Running npm install (this may take a minute first time)..." -ForegroundColor Gray
Push-Location $dashDir
npm install --silent 2>&1 | Out-Null
$dashProcess = Start-Process -FilePath "npm" `
    -ArgumentList "run", "dev" `
    -WorkingDirectory $dashDir `
    -PassThru -NoNewWindow `
    -RedirectStandardOutput (Join-Path $ROOT "logs\dashboard.log") `
    -RedirectStandardError  (Join-Path $ROOT "logs\dashboard-err.log")
Pop-Location

Write-OK "Dashboard starting (PID $($dashProcess.Id)) → http://localhost:3000"

# ── Save PIDs for stop script ───────────────────────────────────────────────
$allPids = @($cpProcess.Id) + ($nodeProcesses | ForEach-Object { $_.Id }) + @($gwProcess.Id, $dashProcess.Id)
$allPids -join "`n" | Set-Content (Join-Path $ROOT "logs\.pids")

# ── Summary ────────────────────────────────────────────────────────────────
Write-Host "`n" + "─"*60 -ForegroundColor DarkGray
Write-Host @"

  ClusterControl is starting up!

  Dashboard          →  http://localhost:3000
  Control Plane API  →  http://localhost:8000/docs
  API Gateway        →  http://localhost:9000/docs

  Login: admin / $ADMIN_PASSWORD

  Logs are in: .\logs\

  To stop all services, run: .\stop.ps1

"@ -ForegroundColor Green
Write-Host "─"*60 -ForegroundColor DarkGray

# Keep script alive
Write-Host "`nPress Ctrl+C to exit this monitor (services keep running in background)`n" -ForegroundColor DarkGray
Wait-Process -Id $cpProcess.Id
