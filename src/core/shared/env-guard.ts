/** AUTH_BYPASS is allowed only outside production. */
export function isAuthBypassEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.AUTH_BYPASS === "1";
}

/** Fail fast at startup if production is misconfigured. */
export function assertSafeProductionEnv() {
  if (process.env.NODE_ENV !== "production") return;

  if (process.env.AUTH_BYPASS === "1") {
    throw new Error(
      "FATAL: AUTH_BYPASS=1 is forbidden when NODE_ENV=production. Remove AUTH_BYPASS from production environment.",
    );
  }
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    throw new Error("FATAL: AUTH_SECRET must be set and at least 32 characters in production.");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("FATAL: DATABASE_URL must be set in production.");
  }
}
