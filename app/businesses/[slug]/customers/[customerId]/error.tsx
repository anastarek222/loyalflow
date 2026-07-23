"use client";

import Link from "next/link";

import { PageErrorState } from "@/components/page-layout";
import { customerUiCopy } from "@/lib/customers/ui-copy";

function getAuthenticatedLanguage() {
  if (typeof document === "undefined") return "AR";
  return document.querySelector("[data-app-language]")?.getAttribute("data-app-language") === "EN" ? "EN" : "AR";
}

export default function CustomerDetailsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const copy = customerUiCopy(getAuthenticatedLanguage());
  return <PageErrorState title={copy.customerLoadError} description={copy.customerLoadErrorDescription} onRetry={reset} backAction={<Link href="/dashboard" className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-primary">{copy.dashboard}</Link>} />;
}
