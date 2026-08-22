import { hasPermission } from "@core/rbac/permissions";

/** Shop-floor UI: only production, stats, salary, profile — no dashboard/warehouse tabs. */
export function hasWorkerShell(roleCode: string, permissions: string[]): boolean {
  if (roleCode === "worker") return true;
  if (roleCode !== "employee") return false;
  if (
    hasPermission(permissions, roleCode, "crm.view") ||
    hasPermission(permissions, roleCode, "orders.view")
  ) {
    return false;
  }
  return (
    hasPermission(permissions, roleCode, "production.view") ||
    hasPermission(permissions, roleCode, "production.report")
  );
}

const WORKER_SHELL_PATHS = new Set(["/me", "/me/stats", "/me/salary", "/me/profile"]);

export function workerShellAllowsPath(pathname: string): boolean {
  if (WORKER_SHELL_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/api/")) return true;
  return false;
}
