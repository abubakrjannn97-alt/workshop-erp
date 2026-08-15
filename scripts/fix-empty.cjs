const fs = require("fs");
const p = require("path").join(__dirname, "../src/app/(app)/page.tsx");
let s = fs.readFileSync(p, "utf8");
s = s.replace("home.noDebts", "crm.noOrders");
fs.writeFileSync(p, s);
console.log("fixed");
