$base='http://127.0.0.1:8000/api'
$form='username=admin&password=sih2024'
$login = Invoke-RestMethod -Uri "$base/auth/token" -Method Post -ContentType 'application/x-www-form-urlencoded' -Body $form
$token = $login.access_token
Write-Host "Token len:" $token.Length
try {
  $resp = Invoke-RestMethod -Uri "$base/public/translate/reverse?icd_name=Abdominal%20distension" -Headers @{Authorization="Bearer $token"}
  $resp | ConvertTo-Json -Depth 6
} catch {
  Write-Host 'Error status:' $_.Exception.Response.StatusCode.value__
  $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
  $body = $reader.ReadToEnd()
  Write-Host 'Body:'
  Write-Host $body
}