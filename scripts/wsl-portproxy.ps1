# Run in PowerShell as Administrator on Windows (not inside WSL).
# Forwards TCP on this PC (all interfaces) into WSL so phones/other PCs can hit Next.js.
param(
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"

function Get-LanIPv4Guess {
  $candidates = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.PrefixOrigin -ne "WellKnown" -and
      ($_.IPAddress -match '^192\.168\.' -or $_.IPAddress -match '^10\.')
    } |
    Select-Object -First 1 -ExpandProperty IPAddress
  if ($candidates) { return $candidates }
  return "<LAN-IP>"
}

$principal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host "ERROR: Run this script as Administrator (right-click PowerShell -> Run as administrator)." -ForegroundColor Red
  exit 1
}

# Portproxy is handled by the IP Helper service; ensure it is running.
try {
  $iphlp = Get-Service -Name iphlpsvc -ErrorAction Stop
  if ($iphlp.Status -ne "Running") {
    Start-Service -Name iphlpsvc
    Write-Host "Started service: iphlpsvc (IP Helper)"
  }
  if ($iphlp.StartType -eq "Disabled") {
    Set-Service -Name iphlpsvc -StartupType Manual
  }
} catch {
  Write-Host "WARNING: Could not verify/start iphlpsvc (IP Helper). Portproxy may not work until this service runs." -ForegroundColor Yellow
}

function Get-WslDistroIPv4 {
  # Prefer eth0 (WSL2); fall back to first token from hostname -I.
  $fromEth0 = (wsl.exe -e sh -c "ip -4 -brief addr show eth0 2>/dev/null | awk '{print `$3}' | cut -d/ -f1" 2>$null).Trim()
  if ($fromEth0 -match '^\d{1,3}(\.\d{1,3}){3}$') {
    return $fromEth0
  }
  $wslRaw = (wsl.exe hostname -I).Trim()
  if (-not $wslRaw) {
    return $null
  }
  $first = ($wslRaw -split '\s+')[0]
  if ($first -match '^\d{1,3}(\.\d{1,3}){3}$') {
    return $first
  }
  return $null
}

$wslIp = Get-WslDistroIPv4
if (-not $wslIp) {
  Write-Host "ERROR: Could not read WSL IPv4. Open WSL, then run: wsl.exe hostname -I" -ForegroundColor Red
  exit 1
}

netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=$Port 2>$null
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$Port connectaddress=$wslIp connectport=$Port

Write-Host "Forwarding 0.0.0.0:$Port -> ${wslIp}:$Port"

$ruleName = "WSL2 dev TCP $Port"
Remove-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port -Profile Domain, Private, Public | Out-Null
Write-Host "Firewall allow rule (all profiles): $ruleName"

Write-Host ""
Write-Host "=== portproxy (should show connect to $wslIp) ===" -ForegroundColor Cyan
netsh interface portproxy show all

Write-Host ""
Write-Host "Verify from Windows before testing a phone:" -ForegroundColor Green
Write-Host "  1) npm run dev is running in WSL."
Write-Host "  2) In PowerShell: curl.exe http://127.0.0.1:$Port  -I"
Write-Host "  3) In PowerShell:  curl.exe http://$(Get-LanIPv4Guess):$Port  -I   (your LAN IP; see ipconfig)"
Write-Host ""
Write-Host "On another device use: http://<THIS-PC-LAN-IP-from-ipconfig>:$Port"
