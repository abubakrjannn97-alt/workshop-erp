const fs = require("fs");
const p = "E:/workshop-erp/src/components/mobile-nav.tsx";
let s = fs.readFileSync(p, "utf8");
s = s.replace("<IconMenu size={18} />", "<IconMenu size={14} />");
fs.writeFileSync(p, s);
console.log("ok");
