# Run on Windows in PowerShell (Administrator optional; read-only checks).
# Helps debug why another machine cannot open http://<this-PC-LAN-IP>:3000
param(
  [int]$Port = 3000
)

$ErrorActionPreference = "Continue"

Write-Host "`n=== 1) WSL IPv4 (what portproxy should target) ===" -ForegroundColor Cyan
wsl.exe -e sh -c "echo -n 'eth0: '; ip -4 -brief addr show eth0 2>/dev/null; echo -n 'hostname -I: '; hostname -I" 2>$null

Write-Host "`n=== 2) Windows portproxy rules ===" -ForegroundColor Cyan
$proxyOut = netsh interface portproxy show all
$proxyOut
if ($proxyOut -notmatch ":$Port\b") {
  Write-Host "  (No rule line found for port $Port — run wsl-portproxy.ps1 as Administrator.)" -ForegroundColor Yellow
}

Write-Host "`n=== 3) Firewall rules allowing TCP $Port ===" -ForegroundColor Cyan
Get-NetFirewallPortFilter -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -eq $Port -or "$($_.LocalPort)" -eq "$Port" } |
  ForEach-Object {
    Get-NetFirewallRule -AssociatedNetFirewallPortFilter $_ -ErrorAction SilentlyContinue |
      Select-Object DisplayName, Direction, Action, Enabled, Profile
  } | Format-Table -AutoSize

Write-Host "`n=== 4) IP Helper service (required for portproxy) ===" -ForegroundColor Cyan
Get-Service iphlpsvc -ErrorAction SilentlyContinue | Format-List Name, Status, StartType

Write-Host "`n=== 5) Likely LAN IPv4 addresses on this PC (use one of these from the other device) ===" -ForegroundColor Cyan
Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' } |
  Select-Object InterfaceAlias, IPAddress, PrefixOrigin |
  Format-Table -AutoSize

Write-Host "`n=== 6) Quick reachability from this PC to port $Port ===" -ForegroundColor Cyan
$tcp = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
  Select-Object -First 3 LocalAddress, LocalPort, OwningProcess
if ($tcp) {
  Write-Host "Something is listening on Windows for port $Port (may include portproxy):" -ForegroundColor Green
  $tcp | Format-Table
} else {
  Write-Host "Nothing listening on Windows port $Port yet. Run wsl-portproxy.ps1, then ensure npm run dev is running in WSL." -ForegroundColor Yellow
}

Write-Host "Test from THIS Windows machine (replace IP if needed):" -ForegroundColor Green
Write-Host "  curl.exe -sS -o NUL -w \"HTTP %%{http_code}\n\" http://127.0.0.1:$Port/"
Write-Host "  curl.exe -sS -o NUL -w \"HTTP %%{http_code}\n\"  http://<ip-from-section-5>:$Port/"
Write-Host ""
Write-Host "If (127.0.0.1 works but LAN IP fails) on this PC: firewall or wrong adapter IP." -ForegroundColor Gray
Write-Host "If (both fail on this PC): dev server not running or wrong port." -ForegroundColor Gray
Write-Host "If (LAN works here but not from phone): router AP isolation, different Wi‑Fi/VLAN, or third‑party firewall." -ForegroundColor Gray
