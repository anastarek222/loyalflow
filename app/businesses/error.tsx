"use client";

import { RouteErrorState } from "@/components/page-layout";

export default function BusinessesError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorState reset={reset} />;
}
