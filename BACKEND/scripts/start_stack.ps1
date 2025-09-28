<#
Starts (or recreates) the AYUR-SYNC backend Docker stack (API + Postgres).

Intended usage right AFTER a full global docker cleanup (nuke) OR on a fresh
machine, but safe to run any time (idempotent – uses docker compose).

Actions:
 1. Validate docker & docker compose availability
 2. Ensure we are in BACKEND directory (where docker-compose.yml lives)
 3. (Optional) build images (with or without --no-cache)
 4. Bring stack up with `docker compose up -d`
 5. Wait for Postgres health (uses container healthcheck)
 6. Show concise container status & recent API logs
 7. (Optional) follow API logs

Parameters:
  -NoCache      : Build images without using the layer cache
  -SkipBuild    : Skip build step (compose will use existing images)
  -FollowLogs   : After successful start, stream ayur-sync-api logs (Ctrl+C to stop)
  -Recreate     : Force recreation of containers (adds --force-recreate)

Examples:
  pwsh ./scripts/start_stack.ps1
  pwsh ./scripts/start_stack.ps1 -NoCache
  pwsh ./scripts/start_stack.ps1 -SkipBuild -FollowLogs
  pwsh ./scripts/start_stack.ps1 -Recreate -NoCache -FollowLogs

NOTE: Unlike reset_stack.ps1 this script is NON-DESTRUCTIVE – it does NOT drop
  the named volume `postgres_data`. Use reset_stack.ps1 if you need a wipe.
#>
param(
  [switch]$NoCache,
  [switch]$SkipBuild,
  [switch]$FollowLogs,
  [switch]$Recreate,
  [switch]$ForceBuild,          # Force build even if images exist
  [switch]$RunMigrations,       # Run idempotent DB migrations after DB healthy
  [switch]$SeedData,            # Run optional data seeding script (migrate_csv_to_db.py) if present
  [switch]$Smoke,               # Run smoke tests (ingestion + delete endpoints)
  [switch]$WaitSetup            # Wait until background setup inside container prints completion line
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Section($m){ Write-Host "`n==== $m ====\n" -ForegroundColor Cyan }
function Write-Info($m){ Write-Host "[INFO] $m" -ForegroundColor Green }
function Write-Warn($m){ Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Write-Err($m){ Write-Host "[ERR ] $m" -ForegroundColor Red }

# --- Pre-flight: docker present? ---
Write-Section 'Pre-flight Checks'
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Err 'Docker CLI not found in PATH.'
  exit 1
}

# Determine compose capability
$composeOk = $false
try {
  docker compose version *>$null
  $composeOk = $true
} catch {}
if (-not $composeOk) {
  Write-Err 'The newer `docker compose` command is required (plugin or CLI v2).'
  exit 1
}
Write-Info 'Docker & compose available.'

# --- Locate docker-compose.yml ---
$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = (Resolve-Path (Join-Path $scriptDir '..')).Path
Set-Location $backendDir
if (-not (Test-Path './docker-compose.yml')) { Write-Err 'docker-compose.yml missing in BACKEND dir.'; exit 1 }
Write-Info "Working directory: $backendDir"

function Invoke-DCompose {
  param([string[]]$ComposeArgs)
  if (-not $ComposeArgs -or $ComposeArgs.Count -eq 0) { Write-Err 'Invoke-DCompose called with no arguments'; throw 'No compose args'; }
  & docker compose -f docker-compose.yml @ComposeArgs
  if ($LASTEXITCODE -ne 0) { throw "docker compose command failed: $ComposeArgs" }
}

# Initial lightweight existence check (will be overridden by robust version below)
function Test-ImageExists($image){ $id = docker image ls $image -q 2>$null; return -not [string]::IsNullOrEmpty($id) }
function Test-ContainerExists($name){ docker ps -a --format '{{.Names}}' | Select-String -SimpleMatch $name *>$null }
function Exec-InApi { param([string[]]$Cmd) docker exec ayur-sync-api @Cmd }

# Robust silent image existence (avoid terminating error under -ErrorAction Stop)
function Test-ImageExists($image) {
  $id = docker image ls $image -q 2>$null
  return -not [string]::IsNullOrEmpty($id)
}

# --- Build (optional) ---
Write-Section 'Build Phase'
$mustBuild = $false
if ($ForceBuild) { $mustBuild = $true }
if (-not (Test-ImageExists 'ayur-sync-api:latest')) { Write-Info 'API image missing -> will build'; $mustBuild = $true }
if (-not (Test-ContainerExists 'ayur-sync-api')) { Write-Info 'API container absent (fresh stack)' }

if ($SkipBuild -and -not $mustBuild) {
  Write-Warn 'Skipping build (user specified -SkipBuild and no forced build conditions)'
} else {
  if ($SkipBuild -and $mustBuild) { Write-Warn '-SkipBuild ignored because build is required' }
  $buildArgs = @('build')
  if ($NoCache) { $buildArgs += '--no-cache' }
  Write-Info ('Running: docker compose {0}' -f ($buildArgs -join ' '))
  try { Invoke-DCompose $buildArgs } catch { Write-Err "Build failed: $_"; exit 1 }
}

# --- Up Services ---
Write-Section 'Starting Containers'
$upArgs = @('up','-d')
if ($Recreate) { $upArgs += '--force-recreate' }
Write-Info ('Running: docker compose {0}' -f ($upArgs -join ' '))
try { Invoke-DCompose $upArgs } catch { Write-Err "Compose up failed: $_"; exit 1 }

# --- Wait for DB Health ---
Write-Section 'Waiting for Postgres Health'
$maxWait = 180
$elapsed = 0
while ($true) {
  $inspect = docker inspect ayur-sync-db --format '{{json .State.Health.Status}}' 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Warn 'DB container not yet present...'; Start-Sleep -Seconds 2; $elapsed += 2
  } else {
    try { $status = ($inspect | ConvertFrom-Json) } catch { $status = 'unknown' }
    Write-Info "DB Health: $status"
    if ($status -eq 'healthy') { break }
    Start-Sleep -Seconds 3; $elapsed += 3
  }
  if ($elapsed -ge $maxWait) { Write-Err 'Timed out waiting for Postgres health.'; exit 1 }
}

# --- Optional: Run migrations (idempotent) ---
if ($RunMigrations) {
  Write-Section 'Running Migrations'
  try {
    Exec-InApi @('python','scripts/migrate_add_ingestion_definitions.py')
  } catch { Write-Warn "Migration script failed: $_" }
}

# --- Optional: Seed data ---
if ($SeedData) {
  Write-Section 'Data Seeding'
  if (Test-Path './scripts/migrate_csv_to_db.py') {
    try { Exec-InApi @('python','scripts/migrate_csv_to_db.py') } catch { Write-Warn "Seeding failed: $_" }
  } else {
    Write-Warn 'migrate_csv_to_db.py not found; skipping seeding.'
  }
}

# --- Optional: Wait for background setup inside container ---
if ($WaitSetup) {
  Write-Section 'Waiting for In-Container Setup Completion'
  $setupTimeout = 300
  $poll = 0
  while ($poll -lt $setupTimeout) {
    $log = ''
    try {
      # Capture both stdout/stderr to avoid a NativeCommandError surfacing under StrictMode
      $log = docker logs ayur-sync-api --tail 80 2>&1 | Out-String
    } catch {
      Write-Warn 'Log retrieval not ready yet (container starting)'
    }

    if ($log -match '\[SETUP\] All setup tasks complete') { Write-Info 'Background setup completed.'; break }

    # Lightweight HTTP readiness probe – if API answers on /docs we can proceed even if setup line missed
    $apiReady = $false
    try {
      $ping = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:8000/docs' -Method Get -TimeoutSec 2 -ErrorAction Stop
      if ($ping.StatusCode -ge 200 -and $ping.StatusCode -lt 500) { $apiReady = $true }
    } catch {}
    if ($apiReady) { Write-Info 'API HTTP endpoint responsive (proceeding without explicit setup completion line).'; break }

    Start-Sleep -Seconds 3
    $poll += 3
  }
  if ($poll -ge $setupTimeout) { Write-Warn 'Timed out waiting for background setup completion.' }
}

# --- Summary ---
Write-Section 'Container Status'
docker ps --filter 'name=ayur-sync' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

Write-Section 'Recent API Logs (tail 60)'
try {
  $oldPref = $ErrorActionPreference
  $ErrorActionPreference = 'SilentlyContinue'
  $recent = docker logs --tail 60 ayur-sync-api 2>&1 | Out-String
  $ErrorActionPreference = $oldPref
  # Clear any non-terminating NativeCommandError records generated
  if ($Error.Count -gt 0) { $Error.Clear() }
  $recent -split "`r?`n" | ForEach-Object { if ($_ -and $_.Trim().Length -gt 0) { Write-Host $_ } }
} catch {
  Write-Warn "Could not fetch recent logs: $_"
}

Write-Info 'Stack start complete.'
Write-Info 'API will continue initializing any background tasks. Monitor logs for readiness.'

if ($Smoke) {
  Write-Section 'Running Smoke Tests'
  # Acquire admin token automatically
  $envFile = Join-Path $backendDir '.env'
  $adminUser = $null; $adminPass = $null
  if (Test-Path $envFile) {
    foreach ($line in Get-Content $envFile) {
      if ($line -match '^ADMIN_USERNAME=') { $adminUser = ($line -replace '^ADMIN_USERNAME=','').Trim('"') }
      if ($line -match '^ADMIN_PASSWORD=') { $adminPass = ($line -replace '^ADMIN_PASSWORD=','').Trim('"') }
    }
  }
  if (-not $adminUser -or -not $adminPass) { Write-Warn 'Could not parse ADMIN credentials from .env; skipping smoke tests.' }
  else {
    Write-Info "Attempting token retrieval for admin user '$adminUser'"
    $token = $null
    for ($i=0; $i -lt 40 -and -not $token; $i++) {
      try {
        $body = @{ username=$adminUser; password=$adminPass }
        $resp = Invoke-RestMethod -Method Post -Uri 'http://localhost:8000/api/auth/token' -Body $body -ContentType 'application/x-www-form-urlencoded' -ErrorAction Stop
        $token = $resp.access_token
        if ($token) { Write-Info 'Obtained admin access token.'; break }
      } catch {
        Start-Sleep -Seconds 3
      }
    }
    if (-not $token) { Write-Warn 'Failed to obtain admin token; skipping smoke tests.' }
    else {
      try { docker exec -e ADMIN_TOKEN=$token ayur-sync-api python scripts/smoke_ingestion_new_fields.py } catch { Write-Warn 'Ingestion smoke test failed.' }
      try { docker exec -e ADMIN_TOKEN=$token ayur-sync-api python scripts/test_delete_endpoints.py } catch { Write-Warn 'Delete endpoints smoke test failed.' }
    }
  }
}

if ($FollowLogs) {
  Write-Section 'Following API Logs (Ctrl+C to stop)'
  docker logs -f ayur-sync-api
}

Write-Info 'Done.'
