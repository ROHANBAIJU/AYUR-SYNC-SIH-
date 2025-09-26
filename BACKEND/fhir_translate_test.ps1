$ErrorActionPreference='Stop'
$base='http://127.0.0.1:8000/api'
$form='username=admin&password=sih2024'
$resp=Invoke-RestMethod -Uri "$base/auth/token" -Method Post -ContentType 'application/x-www-form-urlencoded' -Body $form
$tok=$resp.access_token
$h=@{Authorization="Bearer $tok"}
Write-Host '=== FHIR ConceptMap $translate (AdhmAnam) ==='
$url = "$base/fhir/ConceptMap/`$translate?system=ayurveda&code=AdhmAnam"
Invoke-RestMethod -Uri $url -Headers $h | ConvertTo-Json -Depth 8
