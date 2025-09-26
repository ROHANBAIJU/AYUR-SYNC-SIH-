$base='http://127.0.0.1:8000/api'
$form='username=admin&password=sih2024'
$login = Invoke-RestMethod -Uri "$base/auth/token" -Method Post -ContentType 'application/x-www-form-urlencoded' -Body $form
$t = $login.access_token
$h = @{ Authorization = "Bearer $t" }
Invoke-RestMethod -Uri "$base/public/translate?icd_name=Abdominal%20distension" -Headers $h | ConvertTo-Json -Depth 4