import { auth } from "@/auth";
import { redirect } from "next/navigation";

import { loginAction } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const errorValue = params.error;

  const hasError =
    errorValue === "invalid" ||
    (Array.isArray(errorValue) && errorValue.includes("invalid"));

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12">
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />

      <section className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.07] p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-2xl font-black text-white">
            L
          </div>

          <h1 className="text-3xl font-bold text-white">LoyalFlow</h1>

          <p className="mt-2 text-sm text-slate-400">
            Loyalty cards management
          </p>
        </div>

        {hasError && (
          <div className="mb-5 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            الإيميل أو كلمة المرور غير صحيحة.
          </div>
        )}

        <form action={loginAction} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Email address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="name@example.com"
              className="auth-input w-full rounded-xl border border-white/10 px-4 py-3 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={10}
              autoComplete="current-password"
              placeholder="Enter your password"
              className="auth-input w-full rounded-xl border border-white/10 px-4 py-3 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-3 font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:scale-[1.01] active:scale-[0.99]"
          >
            Sign in
          </button>
        </form>

        <p className="mt-7 text-center text-xs text-slate-500">
          LoyalFlow Agency Management System
        </p>
      </section>
    </main>
  );
}
