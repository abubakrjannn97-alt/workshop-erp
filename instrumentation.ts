export async function register() {
  const { assertSafeProductionEnv } = await import("./src/lib/env-guard");
  assertSafeProductionEnv();
}
