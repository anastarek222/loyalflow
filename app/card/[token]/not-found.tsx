export default function CardNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-center text-white">
      <section className="max-w-sm rounded-3xl border border-white/15 bg-white/10 p-7">
        <h1 className="text-xl font-black">Card unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-white/75">This loyalty card is unavailable or the link is no longer valid.</p>
      </section>
    </main>
  );
}
