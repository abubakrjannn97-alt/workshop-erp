export async function register() {
  const { assertSafeProductionEnv } = await import("./src/core/shared/env-guard");
  assertSafeProductionEnv();
}
