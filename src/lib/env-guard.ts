/** AUTH_BYPASS is allowed only outside production. */
export function isAuthBypassEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.AUTH_BYPASS === "1";
}

/** Fail fast at startup if production is misconfigured. */
export function assertSafeProductionEnv() {
  if (process.env.NODE_ENV === "production" && process.env.AUTH_BYPASS === "1") {
    throw new Error(
      "FATAL: AUTH_BYPASS=1 is forbidden when NODE_ENV=production. Remove AUTH_BYPASS from production environment.",
    );
  }
}
