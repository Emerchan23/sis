import crypto from "node:crypto"

export function env(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback
  if (v === undefined) {
    throw new Error(`Missing env: ${name}`)
  }
  return v
}

export function uid(): string {
  return crypto.randomUUID()
}

export function isoNow(): string {
  return new Date().toISOString()
}

export function hashPassword(password: string): string {
  const salt = env("PASSWORD_SALT", "erp_local_salt_v1")
  return crypto.createHash("sha256").update(`${salt}:${password}`).digest("hex")
}

export function safeNumber(n: unknown, def = 0): number {
  const v = typeof n === "string" ? Number(n) : typeof n === "number" ? n : def
  return Number.isFinite(v) ? v : def
}