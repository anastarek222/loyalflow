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

  let canReverseEarn = false;

  if (session?.user) {
    if (session.user.role === "SUPER_ADMIN") {
      canReverseEarn = true;
    } else if (session.user.role === "OWNER" && session.user.businessId) {
      const business = await prisma.business.findUnique({
        where: { slug },
        select: { id: true },
      });
      canReverseEarn = business?.id === session.user.businessId;
    }
  }

  return (
    <>
      {children}
      {canReverseEarn ? (
        <Link
          href={`/businesses/${slug}/customers/${customerId}/reversal`}
          className="fixed bottom-5 end-5 z-40 inline-flex min-h-11 items-center rounded-[var(--lf-radius-input)] border border-warning/30 bg-warning-subtle px-4 py-3 text-sm font-bold text-foreground shadow-lg transition hover:bg-warning/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning/50"
        >
          Refund / Void
        </Link>
      ) : null}
    </>
  );
}
