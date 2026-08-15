const fs = require("fs");
const p = "E:/workshop-erp/src/app/(app)/page.tsx";
let s = fs.readFileSync(p, "utf8");

if (!s.includes('RevealList')) {
  s = s.replace(
    'import { QuickAction } from "@/components/quick-action";\nimport { orderNo } from "@/lib/format";',
    'import { QuickAction } from "@/components/quick-action";\nimport { RevealList } from "@/components/reveal-list";\nimport { orderNo } from "@/lib/format";',
  );
}

s = s.replace("const shownAlerts = alerts.slice(0, 6);", "const shownAlerts = alerts;");

s = s.replace(
`          {shownAlerts.length === 0 ? (
            <p className="text-[13px] text-[#98A2B3]">{t("home.noAlerts")}</p>
          ) : (
            <ul className="divide-y divide-[#EEF0F3]">
              {shownAlerts.map((a, i) => (
                <li key={\`\${a.href}-\${i}\`}>
                  <Link
                    href={a.href}
                    className="flex min-h-9 items-center gap-2.5 py-1.5 transition-colors hover:opacity-80"
                  >
                    <span className={\`h-2 w-2 shrink-0 rounded-full \${dot[a.tone]}\`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-[#101828]">{a.title}</span>
                      {a.detail ? (
                        <span className="block truncate text-[11px] text-[#98A2B3]">{a.detail}</span>
                      ) : null}
                    </span>
                    {a.amount ? (
                      <span
                        className={\`shrink-0 font-mono text-[12px] tabular-nums \${a.amountDanger ? "font-semibold text-[#EF4444]" : "text-[#101828]"}\`}
                      >
                        {a.amount}
                      </span>
                    ) : (
                      <span className="shrink-0 text-[#CBD5E1]">→</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}`,
`          {shownAlerts.length === 0 ? (
            <p className="text-[12px] text-[#98A2B3]">{t("home.noAlerts")}</p>
          ) : (
            <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={5}>
              {shownAlerts.map((a, i) => (
                <li key={\`\${a.href}-\${i}\`}>
                  <Link
                    href={a.href}
                    className="flex min-h-7 items-center gap-2 py-1 transition-colors hover:opacity-80"
                  >
                    <span className={\`h-1.5 w-1.5 shrink-0 rounded-full \${dot[a.tone]}\`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-medium text-[#101828]">{a.title}</span>
                      {a.detail ? (
                        <span className="block truncate text-[11px] text-[#98A2B3]">{a.detail}</span>
                      ) : null}
                    </span>
                    {a.amount ? (
                      <span
                        className={\`shrink-0 font-mono text-[12px] tabular-nums \${a.amountDanger ? "font-semibold text-[#EF4444]" : "text-[#101828]"}\`}
                      >
                        {a.amount}
                      </span>
                    ) : (
                      <span className="shrink-0 text-[#CBD5E1]">→</span>
                    )}
                  </Link>
                </li>
              ))}
            </RevealList>
          )}`,
);

s = s.replace(
`          {recentOrders.length === 0 ? (
            <p className="text-[13px] text-[#98A2B3]">{t("crm.noOrders")}</p>
          ) : (
            <table className="w-full min-w-[32rem] text-[13px]">
              <thead>
                <tr className="border-b border-[#EEF0F3] text-[11px] font-medium uppercase tracking-wide text-[#98A3B8]">
                  <th className="pb-2 text-left font-medium">{t("home.col.order")}</th>
                  <th className="pb-2 text-left font-medium">{t("home.col.customer")}</th>
                  <th className="pb-2 text-left font-medium">{t("home.col.date")}</th>
                  <th className="pb-2 text-right font-medium">{t("home.col.amount")}</th>
                  <th className="pb-2 text-left font-medium">{t("home.col.status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF0F3]">
                {recentOrders.map((o) => (
                  <tr key={o.id} className="h-9">`,
`          {recentOrders.length === 0 ? (
            <p className="text-[12px] text-[#98A2B3]">{t("crm.noOrders")}</p>
          ) : (
            <table className="w-full min-w-[32rem] text-[12px]">
              <thead>
                <tr className="border-b border-[#EEF0F3] text-[10px] font-medium uppercase tracking-wide text-[#98A2B3]">
                  <th className="pb-1.5 text-left font-medium">{t("home.col.order")}</th>
                  <th className="pb-1.5 text-left font-medium">{t("home.col.customer")}</th>
                  <th className="pb-1.5 text-left font-medium">{t("home.col.date")}</th>
                  <th className="pb-1.5 text-right font-medium">{t("home.col.amount")}</th>
                  <th className="pb-1.5 text-left font-medium">{t("home.col.status")}</th>
                </tr>
              </thead>
              <RevealList as="tbody" moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={5} className="divide-y divide-[#EEF0F3]">
                {recentOrders.map((o) => (
                  <tr key={o.id} className="h-8">`,
);

s = s.replace(
`                ))}
              </tbody>
            </table>
          )}
        </DashPanel>

        <DashPanel title={t("home.quickActions")}`,
`                ))}
              </RevealList>
            </table>
          )}
        </DashPanel>

        <DashPanel title={t("home.quickActions")}`,
);

s = s.replace('gap-3 lg:grid-cols-5', 'gap-2 lg:grid-cols-5');
s = s.replace('gap-3 lg:grid-cols-5', 'gap-2 lg:grid-cols-5');

fs.writeFileSync(p, s);
console.log("home patched", s.includes("RevealList"));
