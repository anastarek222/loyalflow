/* eslint-disable @next/next/no-img-element */

import { auth } from "@/auth";
import QrScanner from "@/components/qr-scanner";
import { canPerform } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { getBusinessTheme } from "@/lib/theme";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type ScanPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ScanPage({
  params,
}: ScanPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { slug } = await params;

  const business = await prisma.business.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      primaryColor: true,
      secondaryColor: true,
      themePreset: true,
      cardStyle: true,
      fontFamily: true,
      logoUrl: true,
    },
  });

  if (!business || !business.isActive) {
    notFound();
  }

  const theme =
    getBusinessTheme(business);

  const canAccess = canPerform(
    session.user,
    business.id,
    "LOYALTY_EARN"
  );

  if (!canAccess) {
    redirect("/dashboard");
  }

  return (
    <main
      className="min-h-screen px-4 py-8"
      style={{
        backgroundColor: theme.backgroundColor,
        fontFamily: theme.fontFamily,
      }}
    >
      <div className="mx-auto max-w-xl">
        <Link
          href={`/businesses/${business.slug}`}
          className="text-sm font-medium text-violet-600 hover:text-violet-800"
        >
          ← الرجوع إلى {business.name}
        </Link>

        <header
          className={`mt-5 overflow-hidden border p-5 text-white sm:p-7 ${theme.cardClass} ${theme.borderClass}`}
          style={{
            backgroundColor: theme.primaryColor,
          }}
        >
          <div className="flex items-center gap-4">
            {business.logoUrl ? (
              <img
                src={business.logoUrl}
                alt={`${business.name} logo`}
                className="h-16 w-16 shrink-0 rounded-xl border border-white/20 bg-white object-contain p-2"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white/15 text-2xl font-black">
                {business.name
                  .trim()
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <p className="text-sm text-white/70">
                ماسح LoyalFlow
              </p>

              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
                مسح كارت العميل
              </h1>

              <p
                dir="auto"
                className="mt-1 break-words text-sm text-white/75"
              >
                {business.name}
              </p>
            </div>
          </div>
        </header>

        <section
          className={`mt-6 border bg-white p-5 sm:p-7 ${theme.cardClass} ${theme.borderClass}`}
        >
          <p
            className="mb-6 text-sm leading-7 text-slate-600"
          >
            افتح الكاميرا ووجّهها ناحية QR الموجود على كارت
            العميل. بعد القراءة هيفتح ملف العميل مباشرة لإضافة
            زيارة أو استبدال الهدية.
          </p>

          <QrScanner businessId={business.id} />
        </section>
      </div>
    </main>
  );
}
