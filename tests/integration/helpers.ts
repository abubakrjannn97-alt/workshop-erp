export function integrationEnabled() {
  return process.env.RUN_INTEGRATION === "1" && Boolean(process.env.DATABASE_URL);
}
