import type { ReactNode } from "react";
import Link from "next/link";

import { DirectionText } from "@/components/i18n/direction-text";
import { PlatformBrandIdentity } from "@/components/platform-brand-identity";

type PublicStateShellProps = {
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  actionHref?: string;
  actionEn?: string;
  actionAr?: string;
  extra?: ReactNode;
};

export function PublicStateShell({
  titleEn,
  titleAr,
  descriptionEn,
  descriptionAr,
  actionHref,
  actionEn,
  actionAr,
  extra,
}: PublicStateShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-subtle px-4 py-10 text-center text-foreground sm:px-6">
      <section className="w-full max-w-md rounded-[var(--lf-radius-card)] border border-border bg-surface p-7 shadow-[var(--lf-shadow-raised)] sm:p-8">
        <div className="mb-6 flex justify-center">
          <Link
            href="/"
            aria-label="Tanee"
            className="inline-flex min-h-11 items-center rounded-[var(--lf-radius-input)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lf-focus)]"
          >
            <PlatformBrandIdentity
              showMark={false}
              themeAdaptiveWordmark
              wordmarkClassName="h-7 w-auto max-w-36"
              wordmarkSize="marketing"
              textClassName="text-lg font-black text-foreground"
            />
          </Link>
        </div>

        <h1 className="text-2xl font-black text-foreground">
          <DirectionText en={titleEn} ar={titleAr} />
        </h1>
        <p className="mt-3 text-sm leading-7 text-foreground-muted">
          <DirectionText en={descriptionEn} ar={descriptionAr} />
        </p>

        {extra ? <div className="mt-5">{extra}</div> : null}

        {actionHref && actionEn && actionAr ? (
          <Link
            href={actionHref}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-[var(--lf-radius-input)] bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary-hover"
          >
            <DirectionText en={actionEn} ar={actionAr} />
          </Link>
        ) : null}
      </section>
    </main>
  );
}
