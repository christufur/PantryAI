# WSL Port Proxy for DesertDev Hackathon

This project runs **Next.js on port 3000 inside WSL2**. Phones, tablets, and other PCs on your LAN cannot reach the Linux VM address (`172.x.x.x`) directly. We use a **Windows port proxy** so traffic to your PC’s LAN IP (and `localhost`) is forwarded into WSL.

This repo already ships scripts for that setup. This document explains **why** it exists, what **`svchost` / IP Helper** means when you see it in Task Manager, and **how to recreate or remove** the rule.

## Why we need this

When you run:

```bash
npm run dev
```

Next.js listens on `0.0.0.0:3000` inside WSL. That works fine from WSL itself, but:

| From | Problem |
|------|---------|
| **Windows browser** on the same PC | `http://localhost:3000` may fail with connection refused if WSL localhost forwarding is not working |
| **Phone / another PC on Wi‑Fi** | The `172…` “Network” URL Next.js prints is the WSL VM — not routable from your LAN |
| **iPhone camera / barcode** | Needs `https://<LAN-IP>:3000` (`npm run dev:https`); still requires LAN reachability into WSL |

The fix: Windows listens on `0.0.0.0:3000` and forwards to the current WSL IP (e.g. `172.22.11.100:3000`). You then open:

- `http://localhost:3000` from Windows
- `http://<your-PC-LAN-IP>:3000` from your phone (HTTP)
- `https://<your-PC-LAN-IP>:3000` from your phone (HTTPS, for camera APIs)

## Why Task Manager shows `svchost`

Windows implements `netsh interface portproxy` through the **IP Helper** service (`iphlpsvc`). That service runs inside **`svchost.exe`**.

So if you run:

```powershell
netstat -ano | findstr :3000
tasklist /svc /fi "PID eq <pid>"
```

you may see `svchost.exe` hosting **`iphlpsvc`**. That is expected — it is not a mystery process blocking your port. It is Windows carrying out the forwarding rule you (or `wsl-portproxy.ps1`) configured.

**Do not disable IP Helper** just to free port 3000. Remove the `portproxy` rule instead.

## What the rule looks like

After setup, `netsh interface portproxy show all` should show something like:

```
Listen on ipv4:             Connect to ipv4:
Address         Port        Address         Port
--------------- ----------  --------------- ----------
0.0.0.0         3000        172.22.11.100   3000
```

- **Listen** `0.0.0.0:3000` — all interfaces (localhost + LAN)
- **Connect** `172.22.11.100:3000` — current WSL eth0 address

The WSL IP can change after `wsl --shutdown`, a reboot, or a WSL update. Re-run the setup script when forwarding stops working.

## Recommended setup (use the repo scripts)

### 1. Start the dev server in WSL

```bash
cd ~/code/desertdevhackathon
npm run dev
# or for phone camera: npm run dev:https
```

### 2. Run the port-proxy script on Windows (Administrator)

From WSL, print the Windows path to the script:

```bash
npm run wsl:portproxy-path
```

Copy that path, then in **Windows PowerShell as Administrator** (not inside WSL):

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\...\desertdevhackathon\scripts\wsl-portproxy.ps1"
```

The script:

1. Ensures **IP Helper** (`iphlpsvc`) is running
2. Reads the current WSL IPv4 from `eth0` / `hostname -I`
3. Adds `netsh interface portproxy` for port **3000** (default)
4. Adds a Windows Firewall inbound rule: **WSL2 dev TCP 3000**

Custom port:

```powershell
powershell -ExecutionPolicy Bypass -File "...\wsl-portproxy.ps1" -Port 3000
```

### 3. Verify

From **Windows** PowerShell:

```powershell
curl.exe -I http://127.0.0.1:3000
```

From your phone (same Wi‑Fi): `http://<LAN-IP>:3000` (use `ipconfig` on Windows for the Wi‑Fi IPv4 address).

### 4. Diagnose LAN issues

```bash
npm run wsl:portproxy-diagnose-path
```

Run that `.ps1` on Windows. It checks WSL IP, portproxy rules, firewall, IP Helper, and local listeners.

## Manual setup (if you cannot use the script)

**Administrator PowerShell on Windows.** WSL must be running.

```powershell
$wslIp = (wsl hostname -I).Trim().Split(" ")[0]
netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=3000
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=3000 connectaddress=$wslIp connectport=3000
New-NetFirewallRule -DisplayName "WSL2 dev TCP 3000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000
netsh interface portproxy show all
```

## Remove the proxy rule

When you no longer need LAN/Windows forwarding (or port 3000 is conflicting with another app), run **Administrator PowerShell**:

```powershell
netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0
Remove-NetFirewallRule -DisplayName "WSL2 dev TCP 3000" -ErrorAction SilentlyContinue
netsh interface portproxy show all
```

Confirm port 3000 is free:

```powershell
netstat -ano | findstr :3000
```

## Alternative: WSL mirrored networking

On Windows 11 you may avoid `portproxy` entirely by using mirrored networking in `%UserProfile%\.wslconfig`:

```ini
[wsl2]
networkingMode=mirrored
```

Then `wsl --shutdown` and restart WSL. Use your PC’s LAN IP directly. See `CLAUDE.md` → **Dev server on WSL2** for details. If mirrored mode works on your machine, you may not need this proxy at all.

## Troubleshooting

| Symptom | Likely cause | Fix |
|--------|--------------|-----|
| `connection refused` on Windows | Dev server not running in WSL | `npm run dev` in WSL first |
| Worked yesterday, broken today | WSL IP changed | Re-run `scripts/wsl-portproxy.ps1` |
| Port 3000 owned by `svchost` | Active `portproxy` rule | `netsh interface portproxy show all`; delete or refresh rule |
| `127.0.0.1` works, LAN IP fails | Firewall | Re-run `wsl-portproxy.ps1` or check Windows Firewall |
| Phone cannot connect | AP isolation / different VLAN | Same Wi‑Fi; try diagnose script |
| Camera APIs fail on phone | HTTP is not a secure origin | `npm run dev:https`, open `https://<LAN-IP>:3000` |

## Quick reference

```bash
# WSL
npm run dev
npm run wsl:portproxy-path              # Windows path to setup script
npm run wsl:portproxy-diagnose-path     # Windows path to diagnose script
```

```powershell
# Windows (Administrator) — setup
powershell -ExecutionPolicy Bypass -File "<path-from-wsl:portproxy-path>"

# Windows (Administrator) — remove
netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0
```

## Related docs in this repo

- [CLAUDE.md](../../CLAUDE.md) — WSL2 dev server, mirrored networking, HTTPS for phone camera
- [`scripts/wsl-portproxy.ps1`](../../scripts/wsl-portproxy.ps1) — setup (portproxy + firewall)
- [`scripts/wsl-portproxy-diagnose.ps1`](../../scripts/wsl-portproxy-diagnose.ps1) — read-only diagnostics
- [`scripts/dev.mjs`](../../scripts/dev.mjs) — prints LAN hints when you start `npm run dev`
