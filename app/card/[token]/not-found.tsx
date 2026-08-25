export default function PublicNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 text-center text-slate-950">
      <section className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <div
          aria-hidden="true"
          className="mx-auto mb-4 flex size-10 items-center justify-center rounded-full bg-slate-100 text-lg font-black text-slate-700"
        >
          L
        </div>
        <h1 className="text-xl font-black">
          <span lang="ar" dir="rtl" className="block">
            البطاقة غير متاحة
          </span>
          <span lang="en" dir="ltr" className="mt-1 block text-base">
            Card unavailable
          </span>
        </h1>
        <p lang="ar" dir="rtl" className="mt-3 text-sm leading-6 text-slate-600">
          بطاقة الولاء هذه غير متاحة أو أن الرابط لم يعد صالحًا.
        </p>
        <p lang="en" dir="ltr" className="mt-2 text-sm leading-6 text-slate-600">
          This loyalty card is unavailable or the link is no longer valid.
        </p>
      </section>
    </main>
  );
}
