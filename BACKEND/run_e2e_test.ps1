# End-to-end test script
$ErrorActionPreference = 'Stop'

$base = 'http://127.0.0.1:8000/api'
Write-Host "Base: $base"

# Login
$form = 'username=admin&password=sih2024'
$loginResp = Invoke-RestMethod -Uri "$base/auth/token" -Method Post -ContentType 'application/x-www-form-urlencoded' -Body $form
$token = $loginResp.access_token
if(-not $token){ throw 'Login failed - no token' }
Write-Host "Token acquired length:" $token.Length

$authHeader = @{ Authorization = "Bearer $token" }

function Show-Step($name){ Write-Host "`n=== $name ===" -ForegroundColor Cyan }

# 1. Debug ICD mappings for Abdominal distension
Show-Step 'Debug ICD Mappings (Abdominal distension)'
$debug = Invoke-RestMethod -Uri "$base/admin/debug/icd-mappings?icd_name=Abdominal%20distension" -Headers $authHeader
$debug | ConvertTo-Json -Depth 6

# 2. Force verify (idempotent) primary Ayurveda mapping if needed
Show-Step 'Force Verify Ayurveda mapping'
$forceBody = '{"icd_name":"Abdominal distension","system":"ayurveda","term":"AdhmAnam","code":"SM43","reason":"e2e"}'
Invoke-RestMethod -Uri "$base/admin/force-verify" -Method Post -ContentType 'application/json' -Body $forceBody -Headers $authHeader | ConvertTo-Json -Depth 4

# 3. Refresh release snapshot
Show-Step 'Refresh Release v1-submission'
Invoke-RestMethod -Uri "$base/admin/conceptmap/releases/v1-submission/refresh" -Method Post -Headers $authHeader | ConvertTo-Json -Depth 4

# 4. List releases
Show-Step 'List Releases'
Invoke-RestMethod -Uri "$base/admin/conceptmap/releases" -Headers $authHeader | ConvertTo-Json -Depth 4

# 5. Public forward translate by ICD name
Show-Step 'Public Forward Translate (icd_name)'
Invoke-RestMethod -Uri "$base/public/translate?icd_name=Abdominal%20distension" -Headers $authHeader | ConvertTo-Json -Depth 6

# 6. FHIR ConceptMap $translate using term fallback (AdhmAnam)
Show-Step 'FHIR ConceptMap $translate'
$translateUrl = "$base/fhir/ConceptMap/`$translate?system=ayurveda&code=AdhmAnam"
Invoke-RestMethod -Uri $translateUrl -Headers $authHeader | ConvertTo-Json -Depth 6

# 7. FHIR ValueSet $expand ayurveda
Show-Step 'FHIR ValueSet $expand'
$expandUrl = "$base/fhir/ValueSet/`$expand?system=ayurveda&count=5"
Invoke-RestMethod -Uri $expandUrl -Headers $authHeader | ConvertTo-Json -Depth 6

# 8. Provenance for mapping (latest release)
Show-Step 'FHIR Provenance'
Invoke-RestMethod -Uri "$base/fhir/provenance/conceptmap?icd_name=Abdominal%20distension" -Headers $authHeader | ConvertTo-Json -Depth 6

# 9. Reverse translate via public endpoint
Show-Step 'Public Reverse Translate'
Invoke-RestMethod -Uri "$base/public/translate/reverse?icd_name=Abdominal%20distension" -Headers $authHeader | ConvertTo-Json -Depth 6

# 10. FHIR CodeSystem read (ayurveda)
Show-Step 'FHIR CodeSystem Read (ayurveda)'
Invoke-RestMethod -Uri "$base/fhir/CodeSystem/ayurveda" -Headers $authHeader | ConvertTo-Json -Depth 4

# 11. FHIR CodeSystem $lookup (SM43)
Show-Step 'FHIR CodeSystem $lookup (SM43)'
$lookupUrl = "$base/fhir/CodeSystem/`$lookup?system=ayurveda&code=SM43"
Invoke-RestMethod -Uri $lookupUrl -Headers $authHeader | ConvertTo-Json -Depth 6

Write-Host "`nE2E sequence complete." -ForegroundColor Green
