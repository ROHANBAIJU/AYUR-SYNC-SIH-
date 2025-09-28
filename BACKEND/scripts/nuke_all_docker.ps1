<#
Destructive global Docker cleanup utility.

Purpose:
  Force-remove ALL containers (running or stopped), ALL images (local + pulled),
  ALL user volumes, and ALL user-defined networks on this machine.

USE ONLY IF YOU REALLY WANT A CLEAN SLATE.

After this runs, 'docker compose up --build' will need to re-pull base images
like postgres:15 and rebuild your application images from scratch.

Safeguards:
  1. Requires explicit typed confirmation phrase unless -Force is provided.
  2. Skips built‑in default networks (bridge, host, none).
  3. Accepts opt‑out flags for images or volumes if you only want container reset.

Parameters:
  -Force        : Skip interactive confirmation.
  -SkipImages   : Do NOT delete images.
  -SkipVolumes  : Do NOT delete volumes.
  -DryRun       : Show what would be deleted without deleting.

Examples (PowerShell):
  pwsh ./scripts/nuke_all_docker.ps1              # interactive
  pwsh ./scripts/nuke_all_docker.ps1 -Force       # no prompt, full nuke
  pwsh ./scripts/nuke_all_docker.ps1 -Force -SkipImages
  pwsh ./scripts/nuke_all_docker.ps1 -DryRun

NOTE: This is GLOBAL (not just this project). If you only need to
  reset the AYUR-SYNC stack + its DB volume, prefer reset_stack.ps1.
#>
param(
  [switch]$Force,
  [switch]$SkipImages,
  [switch]$SkipVolumes,
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Section($m){ Write-Host "`n==== $m ====\n" -ForegroundColor Cyan }
function Write-Info($m){ Write-Host "[INFO] $m" -ForegroundColor Green }
function Write-Warn($m){ Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Write-Err($m){ Write-Host "[ERR ] $m" -ForegroundColor Red }

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Err 'Docker CLI not found in PATH.'; exit 1
}

Write-Section 'Inventory'
$containers = @(docker ps -aq 2>$null)
$images     = @()
if (-not $SkipImages) { $images = @(docker images -aq 2>$null | Select-Object -Unique) }
$volumes    = @()
if (-not $SkipVolumes) { $volumes = @(docker volume ls -q 2>$null | Select-Object -Unique) }
$networks   = @(docker network ls -q 2>$null | Select-Object -Unique)
$defaultNetworks = @('bridge','host','none')
$customNetworks = @()
foreach($nid in $networks){
  $name = docker network inspect $nid --format '{{ .Name }}'
  if ($defaultNetworks -notcontains $name) { $customNetworks += $nid }
}

Write-Info ("Containers : {0}" -f $containers.Count)
if (-not $SkipImages)  { Write-Info ("Images     : {0}" -f $images.Count) }
if (-not $SkipVolumes) { Write-Info ("Volumes    : {0}" -f $volumes.Count) }
Write-Info ("Networks   : {0} (custom: {1})" -f $networks.Count, $customNetworks.Count)

if ($DryRun) {
  Write-Warn 'DryRun mode: no deletions will be performed.'
}

if (-not $Force -and -not $DryRun) {
  Write-Warn 'You are about to IRREVERSIBLY DELETE ALL Docker resources on this machine.'
  Write-Warn 'Type the exact phrase: NUKE ALL DOCKER'
  $resp = Read-Host 'Confirmation phrase'
  if ($resp -ne 'NUKE ALL DOCKER') { Write-Err 'Aborted (phrase mismatch).'; exit 1 }
}

if ($containers.Count -gt 0) {
  Write-Section 'Stopping & Removing Containers'
  if ($DryRun) {
    $containers | ForEach-Object { Write-Info "Would remove container $_" }
  } else {
    # Force remove handles stop + rm
    $containers | ForEach-Object { docker rm -f $_ | Out-Null }
    Write-Info 'All containers removed.'
  }
} else { Write-Info 'No containers found.' }

if (-not $SkipImages -and $images.Count -gt 0) {
  Write-Section 'Removing Images'
  if ($DryRun) {
    $images | ForEach-Object { Write-Info "Would remove image $_" }
  } else {
    $images | ForEach-Object { docker rmi -f $_ | Out-Null }
    Write-Info 'All images removed.'
  }
} elseif (-not $SkipImages) { Write-Info 'No images found.' }

if (-not $SkipVolumes -and $volumes.Count -gt 0) {
  Write-Section 'Removing Volumes'
  if ($DryRun) {
    $volumes | ForEach-Object { Write-Info "Would remove volume $_" }
  } else {
    $volumes | ForEach-Object { docker volume rm $_ | Out-Null }
    Write-Info 'All volumes removed.'
  }
} elseif (-not $SkipVolumes) { Write-Info 'No volumes found.' }

if ($customNetworks.Count -gt 0) {
  Write-Section 'Removing Custom Networks'
  if ($DryRun) {
    $customNetworks | ForEach-Object { Write-Info "Would remove network $_" }
  } else {
    $customNetworks | ForEach-Object { docker network rm $_ | Out-Null }
    Write-Info 'Custom networks removed.'
  }
} else { Write-Info 'No custom networks to remove.' }

if (-not $DryRun) {
  Write-Section 'Optional Final Prune (dangling build cache)'
  try {
    docker system prune -f | Out-Null
    Write-Info 'docker system prune completed.'
  } catch { Write-Warn "docker system prune failed: $_" }
}

Write-Section 'Summary'
Write-Info ('Containers deleted : {0}' -f $containers.Count)
if (-not $SkipImages)  { Write-Info ('Images deleted     : {0}' -f $images.Count) }
if (-not $SkipVolumes) { Write-Info ('Volumes deleted    : {0}' -f $volumes.Count) }
Write-Info ('Custom networks    : {0}' -f $customNetworks.Count)
if ($DryRun) { Write-Warn 'This was a DryRun. Re-run without -DryRun to execute.' }
Write-Info 'Done.'
