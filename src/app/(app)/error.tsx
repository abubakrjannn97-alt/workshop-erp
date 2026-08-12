"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-white p-6">
      <h1 className="text-lg font-semibold">Ошибка</h1>
      <p className="mt-2 text-sm text-slate-600">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
      >
        Повторить
      </button>
    </div>
  );
}
