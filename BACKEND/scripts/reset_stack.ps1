<#
Resets the local Docker stack (API + Postgres) for the AYUR-SYNC backend.

Actions:
 1. docker compose down (including volumes) – DROPS ALL DB DATA
 2. (Optional) docker system prune prompt
 3. Rebuild images (with optional --no-cache)
 4. Bring stack up (-d)
 5. Wait for DB health + show concise status
 6. (Optional) stream logs

Parameters:
  -NoCache      : Rebuild images without cache
  -SkipBuild    : Skip the build step (just recreate containers/volumes)
  -FollowLogs   : After healthy, attach to API container logs (Ctrl+C to exit)
  -Prune        : Run `docker system prune -f` after shutdown (aggressive cleanup)

Usage Examples (PowerShell):
  pwsh ./scripts/reset_stack.ps1
  pwsh ./scripts/reset_stack.ps1 -NoCache
  pwsh ./scripts/reset_stack.ps1 -FollowLogs
  pwsh ./scripts/reset_stack.ps1 -NoCache -Prune -FollowLogs

NOTE: This script is destructive (wipes postgres_data volume). Use only in dev.
#>
param(
    [switch]$NoCache,
    [switch]$SkipBuild,
    [switch]$FollowLogs,
    [switch]$Prune
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Section($msg){ Write-Host "`n==== $msg ====\n" -ForegroundColor Cyan }
function Write-Warn($msg){ Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Info($msg){ Write-Host "[INFO] $msg" -ForegroundColor Green }
function Write-Err($msg){ Write-Host "[ERR ] $msg" -ForegroundColor Red }

# Ensure we run from BACKEND directory (where docker-compose.yml lives)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendRoot = (Resolve-Path (Join-Path $scriptDir '..')).Path
Set-Location $backendRoot

if (-not (Test-Path './docker-compose.yml')) {
    Write-Err 'docker-compose.yml not found in current directory. Aborting.'
    exit 1
}

Write-Section 'Destructive Reset Confirmation'
Write-Warn 'This will DROP the postgres_data volume (all database data lost).'
$resp = Read-Host 'Type YES to continue, anything else to abort'
if ($resp -ne 'YES') { Write-Err 'Aborted by user.'; exit 1 }

function Invoke-DockerCompose {
    param([string[]]$Args)
    # Prefer new CLI syntax `docker compose` if available
    $cmd = 'docker'
    $composeArgs = @('compose') + $Args
    try {
        & $cmd $composeArgs
    } catch {
        Write-Err "docker compose command failed: $_"
        throw
    }
}

Write-Section 'Stopping & Removing Containers + Volumes'
Invoke-DockerCompose @('down','--volumes','--remove-orphans')

if ($Prune) {
    Write-Section 'Docker System Prune'
    docker system prune -f | Out-Null
    Write-Info 'System prune completed.'
}

if (-not $SkipBuild) {
    Write-Section 'Building Images'
    $buildArgs = @('build')
    if ($NoCache) { $buildArgs += '--no-cache' }
    Invoke-DockerCompose $buildArgs
} else {
    Write-Warn 'Skipping build step per -SkipBuild'
}

Write-Section 'Starting Stack'
Invoke-DockerCompose @('up','-d')

Write-Section 'Waiting for DB Health'
$maxWait = 180
$elapsed = 0
while ($true) {
    $inspect = docker inspect ayur-sync-db --format '{{json .State.Health.Status}}' 2>$null
    if ($LASTEXITCODE -ne 0) { Write-Warn 'DB container not yet available...'; Start-Sleep -Seconds 2; $elapsed+=2; if ($elapsed -ge $maxWait) { Write-Err 'Timed out waiting for DB container.'; exit 1 }; continue }
    $status = ($inspect | ConvertFrom-Json)
    Write-Info "DB Health: $status"
    if ($status -eq 'healthy') { break }
    Start-Sleep -Seconds 3
    $elapsed += 3
    if ($elapsed -ge $maxWait) { Write-Err 'Timed out waiting for healthy DB.'; exit 1 }
}

Write-Section 'Container Status Summary'
docker ps --filter 'name=ayur-sync' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

Write-Section 'Recent API Logs (first 40 lines)'
docker logs --tail 40 ayur-sync-api 2>$null | ForEach-Object { Write-Host $_ }

Write-Info 'Reset complete.'
Write-Info 'API should become ready once background setup script finishes (watch logs for [SETUP] messages).'

if ($FollowLogs) {
    Write-Section 'Following API Logs (Ctrl+C to detach)'
    docker logs -f ayur-sync-api
}

Write-Info 'Done.'
