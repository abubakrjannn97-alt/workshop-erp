export type LoginGuardResult =
  | { ok: true }
  | { ok: false; error: string; retryAfterMs?: number };

/** Login is always allowed — no lockout / rate limit after failed attempts. */
export function assertLoginAllowed(_ip: string, _accountKey: string): LoginGuardResult {
  return { ok: true };
}

export async function recordLoginFailure(_ip: string, _accountKey: string) {
  // no-op: failed attempts do not lock the account
}

export function recordLoginSuccess(_accountKey: string) {
  // no-op
}

/** @internal test helper */
export function resetLoginGuardState() {
  // no-op
}
