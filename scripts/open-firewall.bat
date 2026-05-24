@echo off
echo 正在请求管理员权限以开放局域网端口...
powershell -ExecutionPolicy Bypass -File "%~dp0open-firewall.ps1"
pause
