export function PrintFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 bg-white p-2 text-sm print:p-0">
      <script
        dangerouslySetInnerHTML={{ __html: "window.addEventListener('load',()=>window.print())" }}
      />
      <h1 className="text-2xl font-semibold">{title}</h1>
      {subtitle ? <p className="text-slate-600">{subtitle}</p> : null}
      {children}
    </div>
  );
}
