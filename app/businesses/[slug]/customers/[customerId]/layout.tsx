import type { ReactNode } from "react";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";

type CustomerLayoutProps = {
  children: ReactNode;
  params: Promise<{ slug: string; customerId: string }>;
};

export default async function CustomerLayout({
  children,
  params,
}: CustomerLayoutProps) {
  const session = await auth();
  const { slug, customerId } = await params;

  let canReverseLoyalty = false;

  if (session?.user) {
    if (session.user.role === "SUPER_ADMIN") {
      canReverseLoyalty = true;
    } else if (session.user.role === "OWNER" && session.user.businessId) {
      const business = await prisma.business.findUnique({
        where: { slug },
        select: { id: true },
      });
      canReverseLoyalty = business?.id === session.user.businessId;
    }
  }

  return (
    <>
      {children}
      {canReverseLoyalty ? (
        <div
          data-customer-reversal-actions="true"
          className="mx-auto mt-4 flex w-full max-w-7xl flex-col items-stretch gap-2 px-4 pb-4 sm:flex-row sm:justify-end sm:px-8 lg:fixed lg:bottom-5 lg:end-5 lg:z-40 lg:m-0 lg:w-auto lg:max-w-none lg:flex-col lg:px-0 lg:pb-0"
        >
          <Link
            href={`/businesses/${slug}/customers/${customerId}/redemption-reversal`}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--lf-radius-input)] border border-danger/20 bg-white px-4 py-3 text-sm font-bold text-danger shadow-lg transition hover:bg-danger-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
          >
            Reverse redemption
          </Link>
          <Link
            href={`/businesses/${slug}/customers/${customerId}/reversal`}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--lf-radius-input)] border border-warning/30 bg-warning-subtle px-4 py-3 text-sm font-bold text-foreground shadow-lg transition hover:bg-warning/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning/50"
          >
            Refund / Void
          </Link>
        </div>
      ) : null}
    </>
  );
}
