import { spawn } from "node:child_process";
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
const port = process.env.PORT || "3000";

function isWsl() {
  try {
    return /microsoft/i.test(fs.readFileSync("/proc/version", "utf8"));
  } catch {
    return false;
  }
}

function scoreIp(ip) {
  const [a, b] = ip.split(".").map(Number);
  if (a === 192 && b === 168) return 100;
  if (a === 10) return 90;
  if (a === 172 && b === 17) return -1;
  if (a === 172 && b >= 16 && b <= 31) return 40;
  if (a === 172) return 20;
  return 5;
}

function bestLinuxIfaceIp() {
  const skipName = (n) =>
    n === "lo" || n.startsWith("docker") || n.startsWith("br-") || n.startsWith("veth");
  let best = null;
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    if (!addrs || skipName(name)) continue;
    for (const a of addrs) {
      const fam = a.family;
      if (fam !== "IPv4" && fam !== 4) continue;
      if (a.internal) continue;
      const s = scoreIp(a.address);
      if (s < 0) continue;
      if (!best || s > best.score) best = { address: a.address, score: s };
    }
  }
  return best?.address ?? null;
}

function windowsPrivateLanIp() {
  try {
    const ps =
      "[Console]::OutputEncoding=[System.Text.UTF8Encoding]::UTF8; " +
      "(Get-NetIPAddress -AddressFamily IPv4 | " +
      "Where-Object { $_.PrefixOrigin -ne 'WellKnown' -and " +
      "($_.IPAddress -match '^192\\.168\\.' -or $_.IPAddress -match '^10\\.') }) | " +
      "Select-Object -First 1 -ExpandProperty IPAddress";
    const out = execSync(`powershell.exe -NoProfile -Command "${ps}"`, {
      encoding: "utf8",
      timeout: 8000,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(out)) return out;
  } catch {
    /* not WSL / no PowerShell */
  }
  return null;
}

function wslPortProxyScriptWindowsPaths() {
  const ps1Unix = path.join(root, "scripts", "wsl-portproxy.ps1");
  if (!fs.existsSync(ps1Unix)) {
    return { paths: [], unixPath: ps1Unix };
  }
  const paths = [];
  try {
    const w = execSync(`wslpath -w "${ps1Unix}"`, {
      encoding: "utf8",
      timeout: 3000,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (w) paths.push(w);
  } catch {
    /* wslpath missing or failed */
  }
  const distro = process.env.WSL_DISTRO_NAME || "Ubuntu";
  const segs = ps1Unix.split("/").filter(Boolean);
  const unc = "\\\\wsl.localhost\\" + distro + "\\" + segs.join("\\");
  if (!paths.includes(unc)) paths.push(unc);
  const uncLegacy = "\\\\wsl$\\" + distro + "\\" + segs.join("\\");
  if (!paths.includes(uncLegacy)) paths.push(uncLegacy);
  return { paths, unixPath: ps1Unix };
}

function printHints() {
  const winLan = windowsPrivateLanIp();
  const linuxGuess = bestLinuxIfaceIp();
  const lan = isWsl() ? winLan || linuxGuess : linuxGuess;
  const lanHint = lan
    ? `http://${lan}:${port}`
    : `http://<your-LAN-IP>:${port}`;

  console.log(`
  Next.js shows "Network: http://0.0.0.0:${port}" because the server binds to all interfaces.
  That is not a URL you open — use one of these instead:

  • This machine        http://localhost:${port}
  • Other devices (LAN) ${lanHint}
`);

  if (isWsl()) {
    const { paths: ps1Paths, unixPath } = wslPortProxyScriptWindowsPaths();
    const fileArg = ps1Paths[0] ? JSON.stringify(ps1Paths[0]) : JSON.stringify(unixPath);
    const altLine =
      ps1Paths.length > 1
        ? `\n If that fails, try: -File ${JSON.stringify(ps1Paths[1])}`
        : "";
    console.log(`  WSL2: other devices cannot reach the Linux VM (172.x) on your LAN.
  Forward port ${port} on Windows into WSL (again after reboot or if WSL IP changes):

  1. Open PowerShell as Administrator on Windows (not in WSL).
  2. Paste the whole line below (use the printed path — not C:\\Users\\... or "..."):

     powershell.exe -ExecutionPolicy Bypass -File ${fileArg} -Port ${port}${altLine}

  Or in this repo on WSL: npm run wsl:portproxy-path (path for -File)
  If it still fails from another device: npm run wsl:portproxy-diagnose-path, run that .ps1 on Windows.

  Then on the other device open your Windows Wi‑Fi/Ethernet IP from ipconfig, e.g. ${lanHint}
`);
  } else if (linuxGuess) {
    console.log(
      `  If another machine still cannot connect, allow the port on this host (example: sudo ufw allow ${port}/tcp).\n`
    );
  }
}

printHints();

const child = spawn(process.execPath, [nextCli, "dev", "--hostname", "0.0.0.0"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
