/** Slug rules for WORKSHOP_DOMAIN / src/domains/{slug}. */
const DOMAIN_SLUG_RE = /^[a-z][a-z0-9_-]{1,31}$/;

export function validateDomainSlug(slug: string): { ok: true } | { ok: false; error: string } {
  const trimmed = slug.trim();
  if (!trimmed) return { ok: false, error: "Domain slug is required." };
  if (trimmed === "facade") {
    return { ok: false, error: 'Reserved slug "facade" — use the existing Facade domain package.' };
  }
  if (!DOMAIN_SLUG_RE.test(trimmed)) {
    return {
      ok: false,
      error:
        'Slug must start with a letter, use lowercase letters/digits/underscore/hyphen only, length 2–32.',
    };
  }
  return { ok: true };
}

export function toScaffoldIds(slug: string) {
  const parts = slug.split(/[-_]/).filter(Boolean);
  const pascal = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
  const upper = slug.replace(/-/g, "_").toUpperCase();
  return { slug, pascal, upper, constPrefix: upper };
}
