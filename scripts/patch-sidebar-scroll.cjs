const fs = require("fs");
const path = require("path");

const shellPath = path.join(__dirname, "../src/components/app-shell.tsx");
let shell = fs.readFileSync(shellPath, "utf8");
shell = shell.replace(
  '<main className="min-w-0 flex-1 px-4 py-3 pb-24 lg:px-4 lg:py-4 lg:pb-8">{children}</main>',
  '<main className="min-w-0 flex-1 overflow-y-auto px-3 py-3 pb-24 lg:px-3 lg:py-3 lg:pb-4">{children}</main>',
);
fs.writeFileSync(shellPath, shell);
console.log("app-shell main patched");

const cssPath = path.join(__dirname, "../src/app/globals.css");
let css = fs.readFileSync(cssPath, "utf8");
const oldCss = `aside {
  overflow: hidden;
  scrollbar-width: none;
}
aside::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}`;
const newCss = `aside,
aside nav {
  overflow: hidden !important;
  scrollbar-width: none;
}
aside::-webkit-scrollbar,
aside nav::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}`;
if (css.includes(oldCss)) {
  css = css.replace(oldCss, newCss);
  fs.writeFileSync(cssPath, css);
  console.log("globals.css patched");
} else {
  console.log("globals.css pattern not found");
}
