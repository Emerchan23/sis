import crypto from "node:crypto";
export function env(name, fallback) {
    const v = process.env[name] ?? fallback;
    if (v === undefined) {
        throw new Error(`Missing env: ${name}`);
    }
    return v;
}
export function uid() {
    return crypto.randomUUID();
}
export function isoNow() {
    return new Date().toISOString();
}
export function hashPassword(password) {
    const salt = env("PASSWORD_SALT", "erp_local_salt_v1");
    return crypto.createHash("sha256").update(`${salt}:${password}`).digest("hex");
}
export function safeNumber(n, def = 0) {
    const v = typeof n === "string" ? Number(n) : typeof n === "number" ? n : def;
    return Number.isFinite(v) ? v : def;
}
