import { rateLimit } from "@/lib/rate-limit";
import { notifyRoles } from "@/lib/control";

const ACCOUNT_WINDOW_MS = 10 * 60 * 1000;
const ACCOUNT_LIMIT = 5;
const IP_WINDOW_MS = 60 * 1000;
const IP_LIMIT = 10;
const LOCK_MS = 15 * 60 * 1000;
const NOTIFY_AFTER_FAILURES = 5;

type LockEntry = { lockedUntil: number; notified: boolean };
type FailureEntry = { count: number; firstAt: number };

const accountLocks = new Map<string, LockEntry>();
const failureStreaks = new Map<string, FailureEntry>();
const notifyCooldown = new Map<string, number>();

function normalizeAccountKey(raw: string) {
  return raw.trim().toLowerCase();
}

function lockKey(accountKey: string) {
  return normalizeAccountKey(accountKey);
}

export type LoginGuardResult =
  | { ok: true }
  | { ok: false; error: string; retryAfterMs?: number };

export function assertLoginAllowed(ip: string, accountKey: string): LoginGuardResult {
  const account = lockKey(accountKey);
  const now = Date.now();

  const locked = accountLocks.get(account);
  if (locked && locked.lockedUntil > now) {
    return {
      ok: false,
      error: "Аккаунт временно заблокирован из‑за множества неудачных попыток. Подождите 15 минут.",
      retryAfterMs: locked.lockedUntil - now,
    };
  }

  const ipCheck = rateLimit(`login-ip:${ip}`, IP_LIMIT, IP_WINDOW_MS);
  if (!ipCheck.ok) {
    return {
      ok: false,
      error: "Слишком много попыток входа с вашего адреса. Подождите минуту.",
      retryAfterMs: ipCheck.retryAfterMs,
    };
  }

  const accountCheck = rateLimit(`login-account:${account}`, ACCOUNT_LIMIT, ACCOUNT_WINDOW_MS);
  if (!accountCheck.ok) {
    return {
      ok: false,
      error: "Слишком много попыток входа. Подождите несколько минут.",
      retryAfterMs: accountCheck.retryAfterMs,
    };
  }

  return { ok: true };
}

async function notifyOwnersSuspiciousLogin(accountKey: string, ip: string) {
  const key = lockKey(accountKey);
  const last = notifyCooldown.get(key) ?? 0;
  if (Date.now() - last < LOCK_MS) return;
  notifyCooldown.set(key, Date.now());

  try {
    await notifyRoles(["owner"], {
      type: "security",
      title: "Подозрительные попытки входа",
      body: `Много неудачных попыток входа: ${accountKey} (IP: ${ip}). Аккаунт временно заблокирован.`,
    });
  } catch {
    // Lockout must succeed even if notification delivery fails.
  }
}

export async function recordLoginFailure(ip: string, accountKey: string) {
  const account = lockKey(accountKey);
  const now = Date.now();
  const streak = failureStreaks.get(account);

  if (!streak || now - streak.firstAt > ACCOUNT_WINDOW_MS) {
    failureStreaks.set(account, { count: 1, firstAt: now });
    return;
  }

  streak.count += 1;
  if (streak.count >= NOTIFY_AFTER_FAILURES) {
    accountLocks.set(account, { lockedUntil: now + LOCK_MS, notified: true });
    failureStreaks.delete(account);
    await notifyOwnersSuspiciousLogin(accountKey, ip);
  }
}

export function recordLoginSuccess(accountKey: string) {
  const account = lockKey(accountKey);
  failureStreaks.delete(account);
  accountLocks.delete(account);
}

/** @internal test helper */
export function resetLoginGuardState() {
  accountLocks.clear();
  failureStreaks.clear();
  notifyCooldown.clear();
}
