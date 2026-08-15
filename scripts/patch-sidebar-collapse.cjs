const fs = require("fs");
const path = require("path");

const sidebarPath = path.join(__dirname, "../src/components/sidebar.tsx");
let s = fs.readFileSync(sidebarPath, "utf8");

const marker = 'onClick={toggle}';
if (s.includes(marker) && !s.includes('{t("nav.collapse")}</span>')) {
  s = s.replace(
    `<button
          type="button"
          onClick={toggle}
          className={\`rounded-xl p-2 text-[var(--color-text-muted)] hover:bg-white/5 hover:text-white \${linkFocus}\`}
          title={collapsed ? t("nav.expand") : t("nav.collapse")}
          aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
          aria-expanded={!collapsed}
        >
          <ChevronsLeft size={18} strokeWidth={1.5} className={collapsed ? "rotate-180" : undefined} />
        </button>`,
    `<button
          type="button"
          onClick={toggle}
          className={\`flex items-center gap-1.5 rounded-xl text-[#64748B] hover:bg-white/5 hover:text-white \${collapsed ? "p-2" : "px-2 py-1.5"} \${linkFocus}\`}
          title={collapsed ? t("nav.expand") : t("nav.collapse")}
          aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
          aria-expanded={!collapsed}
        >
          <ChevronsLeft size={16} strokeWidth={1.5} className={collapsed ? "rotate-180" : undefined} />
          {!collapsed ? <span className="text-[12px] font-medium">{t("nav.collapse")}</span> : null}
        </button>`,
  );
  fs.writeFileSync(sidebarPath, s);
  console.log("sidebar patched");
} else {
  console.log("sidebar already patched or marker not found");
}
