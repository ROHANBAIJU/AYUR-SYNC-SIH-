param()
$ErrorActionPreference='Stop'
$base='http://127.0.0.1:8000/api'
# Acquire token (reuse if cached). Use known admin creds (password: sih2024)
$tokenPath = Join-Path $PSScriptRoot 'token.txt'
if(Test-Path $tokenPath){ $token = Get-Content $tokenPath -ErrorAction SilentlyContinue }
if(-not $token -or $token.Length -lt 10){
  $form = 'username=admin&password=sih2024'
  $resp = Invoke-RestMethod -Method Post -Uri "$base/auth/token" -ContentType 'application/x-www-form-urlencoded' -Body $form
  $token = $resp.access_token
  Set-Content -Path $tokenPath -Value $token
}
$headers = @{ Authorization = "Bearer $token" }
Write-Host '=== CodeSystem Read (ayurveda) ==='
$cs = Invoke-RestMethod -Uri "$base/fhir/CodeSystem/ayurveda" -Headers $headers
$cs | ConvertTo-Json -Depth 8
Write-Host '=== CodeSystem $lookup (SM43) ==='
$lookupUrl = "$base/fhir/CodeSystem/`$lookup?system=ayurveda&code=" + [uri]::EscapeDataString('SM43')
$lookup = Invoke-RestMethod -Uri $lookupUrl -Headers $headers
$lookup | ConvertTo-Json -Depth 8
