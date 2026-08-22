/** Client-side navigation stack (session) for one-step «back» to the previous in-app page. */

const KEY = "erp:nav-stack";

export function readNavStack(): string[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function writeNavStack(stack: string[]) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(stack.slice(-40)));
}

/** Full path including search, e.g. /warehouse?view=raw */
export function currentNavPath(pathname: string, search: string) {
  if (!search) return pathname;
  return `${pathname}?${search.replace(/^\?/, "")}`;
}

/**
 * Record navigation. Pops when landing on the previous stack entry (browser/history back).
 */
export function trackNavPath(fullPath: string) {
  const stack = readNavStack();
  if (stack.length === 0) {
    writeNavStack([fullPath]);
    return;
  }
  const top = stack[stack.length - 1];
  if (top === fullPath) return;

  if (stack.length >= 2 && stack[stack.length - 2] === fullPath) {
    writeNavStack(stack.slice(0, -1));
    return;
  }

  stack.push(fullPath);
  writeNavStack(stack);
}

/** Previous in-app page from session stack, or null if unknown. */
export function previousNavPath(currentFullPath: string): string | null {
  const stack = readNavStack();
  if (stack.length < 2) return null;
  if (stack[stack.length - 1] === currentFullPath) {
    return stack[stack.length - 2] ?? null;
  }
  return stack[stack.length - 2] ?? null;
}

/** Target for back: real previous page, else logical parent fallback. */
export function resolveHistoryBack(currentFullPath: string, fallbackHref: string | null): string | null {
  return previousNavPath(currentFullPath) ?? fallbackHref;
}
