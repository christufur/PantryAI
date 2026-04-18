# Run in PowerShell as Administrator on Windows (not inside WSL).
# Forwards TCP on this PC (all interfaces) into WSL so phones/other PCs can hit Next.js.
param(
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"

$principal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host "ERROR: Run this script as Administrator (right-click PowerShell -> Run as administrator)." -ForegroundColor Red
  exit 1
}

$wslRaw = (wsl.exe hostname -I).Trim()
if (-not $wslRaw) {
  Write-Host "ERROR: Could not read WSL IP. Start WSL and your dev server, then try again." -ForegroundColor Red
  exit 1
}
$wslIp = ($wslRaw -split '\s+')[0]

netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=$Port 2>$null
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$Port connectaddress=$wslIp connectport=$Port

Write-Host "Forwarding 0.0.0.0:$Port -> ${wslIp}:$Port"

$ruleName = "WSL2 dev TCP $Port"
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if (-not $existing) {
  New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port | Out-Null
  Write-Host "Added firewall rule: $ruleName"
} else {
  Write-Host "Firewall rule already present: $ruleName"
}

Write-Host ""
Write-Host "On another device, open http://<THIS-PC-LAN-IP>:$Port (see ipconfig on Windows)." -ForegroundColor Green
