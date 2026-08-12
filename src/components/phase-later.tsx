export function PhaseLater({ phase, title }: { phase: string; title: string }) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-white p-8">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--titan-dark)]">{phase}</p>
      <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
        Раздел предусмотрен ТЗ. Сейчас выполняется PHASE 1 — Foundation. Этот модуль
        подключается строго в своей фазе, без обходных экранов и фиктивных цифр.
      </p>
    </section>
  );
}
