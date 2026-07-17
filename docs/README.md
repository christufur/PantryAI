# Docs

## Published (tracked in git)

| Path | Purpose |
|------|---------|
| `development/` | Shared setup notes (WSL port proxy, LAN, etc.) |

## Local only (gitignored — not pushed to GitHub)

Put personal agent files and historical dumps under **`docs/local/`**. That folder is listed in `.gitignore`, so it stays on your machine (or a private share) without landing in the public repo.

Examples of what belongs there:

- Hackathon handoff / assessment notes
- Wireframes PDFs
- Scratch notes, pitch drafts

Root-level agent files are also gitignored: `CLAUDE.md`, `AGENTS.md`, `.claude/`, `.cursor/`.

### Team workflow

1. **Product code + shared setup docs** → commit and push as usual.
2. **Personal / messy / agent scaffolding** → `docs/local/` or gitignored agent files.
3. If the whole team needs a private doc, use a private channel (Drive, private repo) rather than force-pushing secrets or clutter into the public GitHub remote.
