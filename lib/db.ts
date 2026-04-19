import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/db/schema";

/** Walk up until package.json is found (stable even when process.cwd() is wrong in dev). */
function findPackageRoot(startDir: string): string | null {
  let dir = path.resolve(startDir);
  for (let i = 0; i < 40; i++) {
    if (existsSync(path.join(dir, "package.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

function getProjectRoot(): string {
  const fromCwd = findPackageRoot(process.cwd());
  if (fromCwd) return fromCwd;
  try {
    const fromModule = findPackageRoot(path.dirname(fileURLToPath(import.meta.url)));
    if (fromModule) return fromModule;
  } catch {
    /* import.meta.url unavailable in some bundles */
  }
  return process.cwd();
}

function resolveSqliteFilePath(): string {
  if (process.env.SQLITE_PATH) {
    return path.resolve(process.env.SQLITE_PATH);
  }
  return path.join(getProjectRoot(), "sqlite.db");
}

const MIGRATIONS = [
  "db/migrations/0000_spotty_red_hulk.sql",
  "db/migrations/0001_meal_plan_columns.sql",
];

/** Apply all migrations in order. CREATE TABLE uses IF NOT EXISTS; ALTER TABLE errors are swallowed (column already exists). */
function applyBaselineSchema(sqlite: Database.Database) {
  const root = getProjectRoot();
  for (const rel of MIGRATIONS) {
    const migrationPath = path.join(root, rel);
    if (!existsSync(migrationPath)) {
      if (rel.includes("0000_")) {
        throw new Error(`SQLite baseline migration missing: ${migrationPath}. Run from project root.`);
      }
      continue; // optional migrations may not exist yet
    }
    const raw = readFileSync(migrationPath, "utf8");
    const statements = raw
      .split(/-->\s*statement-breakpoint\s*/g)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.replace(/CREATE TABLE `/g, "CREATE TABLE IF NOT EXISTS `"));

    for (const stmt of statements) {
      try {
        sqlite.exec(stmt);
      } catch (err: unknown) {
        // Ignore "duplicate column name" — migration already applied
        if (
          typeof err === "object" && err !== null &&
          "message" in err &&
          typeof (err as { message: unknown }).message === "string" &&
          (err as { message: string }).message.includes("duplicate column name")
        ) continue;
        throw err;
      }
    }
  }
}

type G = typeof globalThis & {
  __desertdevSqlite?: Database.Database;
  __desertdevSqliteResolvedPath?: string;
};

const g = globalThis as G;

function openOrReuseSqlite(): Database.Database {
  if (g.__desertdevSqlite) {
    return g.__desertdevSqlite;
  }
  const dbPath = resolveSqliteFilePath();
  g.__desertdevSqlite = new Database(dbPath);
  g.__desertdevSqliteResolvedPath = dbPath;
  applyBaselineSchema(g.__desertdevSqlite);
  return g.__desertdevSqlite;
}

/** Idempotent; creates all core tables if missing. Call from API routes after HMR. */
export function ensureSqliteSchema() {
  applyBaselineSchema(openOrReuseSqlite());
}

/** @deprecated alias for ensureSqliteSchema */
export function ensureShelfLifeTable() {
  ensureSqliteSchema();
}

/** Path of the DB file actually opened (not only what resolve would pick). */
export function getSqlitePath(): string {
  return g.__desertdevSqliteResolvedPath ?? resolveSqliteFilePath();
}

const sqlite = openOrReuseSqlite();
export const db = drizzle(sqlite, { schema });
