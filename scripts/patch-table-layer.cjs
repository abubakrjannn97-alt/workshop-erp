const fs = require("fs");
const p = "E:/workshop-erp/src/app/globals.css";
let css = fs.readFileSync(p, "utf8");
const old = `/* Tables — unified across app */
main .ui-card > table,
main .ui-card table,
main section.ui-card table,
main .overflow-hidden.ui-card table {
  width: 100%;
}
main table thead,
main table thead th {
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
main table thead th {
  padding: 5px 8px;
  font-size: 10px;
}
main table tbody td {
  background: transparent;
  border-color: var(--color-border-soft);
  padding: 5px 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
}
main table tbody tr:hover td {
  background: var(--color-surface-soft);
}`;
const neu = `/* Tables — unified across app */
main .ui-card > table,
main .ui-card table,
main section.ui-card table,
main .overflow-hidden.ui-card table {
  width: 100%;
}

main .ui-card:has(> table),
main .ui-card:has(> .ui-table-wrap) {
  padding: 0;
  background: var(--color-surface-soft);
}

main .ui-card > table thead,
main .ui-card .ui-table-wrap thead,
main table thead,
main table thead th {
  background: linear-gradient(180deg, #fcfcfd 0%, #eef1f5 100%);
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

main table thead th {
  padding: 6px 8px;
  font-size: 10px;
  border-bottom: 1px solid var(--color-border-soft);
}

main .ui-card > table tbody tr,
main .ui-card .ui-table-wrap tbody tr {
  background: #ffffff;
}

main .ui-card > table tbody tr + tr td,
main .ui-card .ui-table-wrap tbody tr + tr td {
  border-top: 4px solid var(--color-surface-soft);
}

main table tbody td {
  background: transparent;
  border-color: var(--color-border-soft);
  padding: 5px 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

main table tbody tr:hover td {
  background: #fafbfc;
}`;
if (css.includes(old)) {
  css = css.replace(old, neu);
  fs.writeFileSync(p, css);
  console.log("tables patched");
} else {
  console.log("tables block not found");
}
