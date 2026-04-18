# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Next.js + TypeScript web application built for the DesertDev Hackathon.

## Commands

```bash
npm run dev          # Start dev server (listens on 0.0.0.0:3000)
npm run build        # Production build
npm run lint         # ESLint

npm run db:generate  # Generate migrations from schema changes
npm run db:migrate   # Apply migrations to sqlite.db
npm run db:studio    # Open Drizzle Studio (visual DB browser)
```

Add a shadcn component: `npx shadcn@latest add <component>` (e.g. `card`, `dialog`, `input`)

## Dev server on WSL2

Next.js prints a **Network** URL using the Linux VM’s address (often `172.x.x.x`). That address is **not** your PC’s LAN IP, so phones and other computers usually cannot open it.

- **From Windows on the same machine:** open `http://localhost:3000` (or `http://127.0.0.1:3000`). Do not rely on the `172…` URL in the browser on Windows.
- **From another device on your Wi‑Fi (phone, tablet, another PC):** either:
  1. **Mirrored networking (Windows 11, recommended):** create or edit `%UserProfile%\.wslconfig`:
     ```ini
     [wsl2]
     networkingMode=mirrored
     ```
     Then run `wsl --shutdown` in PowerShell and start WSL again. Use your Windows machine’s **Wi‑Fi/LAN IP** (e.g. `http://192.168.1.42:3000`). You may need a Windows Firewall **inbound** rule allowing TCP port **3000** on Private networks.
  2. **Stay on default NAT:** set up **port forwarding** from Windows to the WSL IP (the first address from `wsl hostname -I`). This is more brittle because the WSL IP can change after restarts.

If `localhost:3000` fails from Windows while the dev server is running in WSL, update WSL (`wsl --update`) and try mirrored mode above.

## Architecture

```
app/              # Next.js App Router — pages and API routes
  layout.tsx      # Root layout (Geist font, globals.css)
  page.tsx        # Home page
  api/            # Server-side API routes (add here)
components/
  ui/             # shadcn/ui components (auto-generated, edit freely)
db/
  schema.ts       # Drizzle table definitions — edit this to add tables
  migrations/     # Auto-generated SQL migrations (don't edit manually)
lib/
  db.ts           # Single db instance — import `db` from here
  utils.ts        # shadcn cn() utility
```

**Data flow:** Define tables in `db/schema.ts` → run `db:generate` → run `db:migrate` → import `db` from `lib/db.ts` in Server Components or API routes.

**Server vs Client components:** All components are Server Components by default. Add `"use client"` only when you need `useState`, `useEffect`, event handlers, or browser APIs.

---

## Behavioral Guidelines

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```
