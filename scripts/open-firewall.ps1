#Requires -RunAsAdministrator
$port = 3848
$name = "2048 Game LAN ($port)"

$existing = Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "防火墙规则已存在，无需重复添加。" -ForegroundColor Green
} else {
  New-NetFirewallRule `
    -DisplayName $name `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort $port `
    -Action Allow `
    -Profile Any | Out-Null
  Write-Host "已添加防火墙入站规则，允许 TCP $port 端口。" -ForegroundColor Green
}

Write-Host ""
Write-Host "手机请用浏览器访问（不要用微信内置浏览器）：" -ForegroundColor Cyan
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
  $_.IPAddress -match '^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)'
} | ForEach-Object {
  Write-Host "  http://$($_.IPAddress):$port"
}
Write-Host ""
pause
