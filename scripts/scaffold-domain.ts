#!/usr/bin/env tsx
/**
 * Phase 6.2 — Domain scaffold generator.
 * Creates a new domain package skeleton without registry integration (Phase 6.3).
 *
 * Usage:
 *   npm run domain:scaffold -- bakery --display "Bakery Production"
 *   npm run domain:scaffold -- bakery --dry-run
 */
import fs from "node:fs";
import path from "node:path";
import { buildScaffoldFiles } from "./scaffold-domain/templates";
import { validateDomainSlug } from "./scaffold-domain/validate";

const ROOT = path.resolve(__dirname, "..");

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  let display: string | undefined;
  let dryRun = false;
  let rawCode = "RAW";
  let fgCode = "FG";
  let productionScheme: string | undefined;
  let defaultSaleUnit = "PCS";
  let defaultOutputUnit = "PCS";
  let defaultOutputPerBase = 1;
  let defaultCategory: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--display" && argv[i + 1]) {
      display = argv[++i];
      continue;
    }
    if (arg === "--category" && argv[i + 1]) {
      defaultCategory = argv[++i];
      continue;
    }
    if (arg === "--raw" && argv[i + 1]) {
      rawCode = argv[++i];
      continue;
    }
    if (arg === "--fg" && argv[i + 1]) {
      fgCode = argv[++i];
      continue;
    }
    if (arg === "--pay-scheme" && argv[i + 1]) {
      productionScheme = argv[++i];
      continue;
    }
    if (arg === "--sale-unit" && argv[i + 1]) {
      defaultSaleUnit = argv[++i];
      continue;
    }
    if (arg === "--output-unit" && argv[i + 1]) {
      defaultOutputUnit = argv[++i];
      continue;
    }
    if (arg === "--output-per-base" && argv[i + 1]) {
      defaultOutputPerBase = Number(argv[++i]);
      continue;
    }
    if (arg.startsWith("-")) {
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
    }
    positional.push(arg);
  }

  return {
    slug: positional[0],
    display,
    dryRun,
    rawCode,
    fgCode,
    productionScheme,
    defaultSaleUnit,
    defaultOutputUnit,
    defaultOutputPerBase,
    defaultCategory,
  };
}

function titleCase(slug: string) {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.slug) {
    console.error(`Usage: npm run domain:scaffold -- <slug> [--display "Name"] [--dry-run]

Options:
  --display "Name"       Human-readable domain title
  --category "Cat"       Default product category (default: title from slug)
  --raw RAW              Raw warehouse code (default: RAW)
  --fg FG                Finished goods warehouse code (default: FG)
  --pay-scheme CODE      Payroll production scheme code
  --sale-unit CODE       Default sale unit symbol
  --output-unit CODE     Default output unit symbol
  --output-per-base N    Default output per recipe base
  --dry-run              Print files without writing
`);
    process.exit(1);
  }

  const slugCheck = validateDomainSlug(args.slug);
  if (!slugCheck.ok) {
    console.error(slugCheck.error);
    process.exit(1);
  }

  const slug = args.slug.trim();
  const displayName = args.display?.trim() || titleCase(slug);
  const defaultCategory = args.defaultCategory?.trim() || displayName;
  const productionScheme = args.productionScheme?.trim() || `production_${slug}`;

  const targetDir = path.join(ROOT, "src", "domains", slug);
  if (fs.existsSync(targetDir)) {
    console.error(`Domain directory already exists: ${targetDir}`);
    process.exit(1);
  }

  const files = buildScaffoldFiles({
    slug,
    displayName,
    defaultCategory,
    rawCode: args.rawCode,
    fgCode: args.fgCode,
    productionScheme,
    defaultSaleUnit: args.defaultSaleUnit,
    defaultOutputUnit: args.defaultOutputUnit,
    defaultOutputPerBase: Number.isFinite(args.defaultOutputPerBase) ? args.defaultOutputPerBase : 1,
  });

  console.log(`Scaffolding domain "${slug}" (${displayName})…`);
  console.log(`Files: ${Object.keys(files).length}`);

  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(ROOT, rel);
    if (args.dryRun) {
      console.log(`\n--- ${rel} ---\n${content.slice(0, 400)}${content.length > 400 ? "\n…" : ""}`);
      continue;
    }
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    if (fs.existsSync(abs)) {
      console.error(`Refusing to overwrite existing file: ${rel}`);
      process.exit(1);
    }
    fs.writeFileSync(abs, content, "utf8");
    console.log(`  + ${rel}`);
  }

  if (args.dryRun) {
    console.log("\nDry run complete — no files written.");
    return;
  }

  console.log(`
Done. Register this domain in src/domains/registry.ts (Phase 6.3).
See src/domains/${slug}/SCAFFOLD.md for next steps.
`);
}

main();
