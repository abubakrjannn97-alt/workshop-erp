const fs = require("fs");
const path = require("path");

const cssPath = path.join(__dirname, "../src/app/globals.css");
let css = fs.readFileSync(cssPath, "utf8");
css = css.replace(
  `main table thead th {
  padding: 8px 12px;
  font-size: 11px;
}
main table tbody td {
  background: transparent;
  border-color: var(--color-border-soft);
  padding: 8px 12px;
  font-size: 13px;
  color: var(--color-text-secondary);
}`,
  `main table thead th {
  padding: 5px 8px;
  font-size: 10px;
}
main table tbody td {
  background: transparent;
  border-color: var(--color-border-soft);
  padding: 5px 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
}`,
);
css = css.replace(
  `.st-badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  border-radius: 999px;
  padding: 0 8px;
  font-size: 11px;`,
  `.st-badge {
  display: inline-flex;
  align-items: center;
  height: 18px;
  border-radius: 999px;
  padding: 0 6px;
  font-size: 10px;`,
);
if (!css.includes("main .ui-card > h2")) {
  css += `

main .ui-card > h2,
main .ui-card > .section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-primary);
}
`;
}
fs.writeFileSync(cssPath, css);
console.log("globals patched");
