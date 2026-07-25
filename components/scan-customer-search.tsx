"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { scanUiCopy } from "@/lib/scan/copy";
import {
  getScanCustomerSearchErrorCode,
  SCAN_CUSTOMER_SEARCH_MIN_LENGTH,
} from "@/lib/scan/customer-search";
import type { AppLanguage } from "@/lib/i18n";

type ScanCustomerSearchProps = { businessId: string; language: AppLanguage };
type SearchResult = { id: string; name: string; phone: string; customerCode: string; url: string };

export default function ScanCustomerSearch({ businessId, language }: ScanCustomerSearchProps) {
  const copy = scanUiCopy(language);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "empty" | "error" | "results">("idle");
  const requestSequenceRef = useRef(0);
  const activeQueryRef = useRef<string | null>(null);
  const queryIsTooShort = query.trim().length < SCAN_CUSTOMER_SEARCH_MIN_LENGTH;
  const displayedResults = queryIsTooShort ? [] : results;
  const displayedState = queryIsTooShort ? "idle" : state;

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < SCAN_CUSTOMER_SEARCH_MIN_LENGTH) {
      requestSequenceRef.current += 1;
      activeQueryRef.current = null;
      return;
    }
    if (activeQueryRef.current === normalizedQuery) return;

    const sequence = ++requestSequenceRef.current;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      if (activeQueryRef.current === normalizedQuery) return;
      activeQueryRef.current = normalizedQuery;
      setState("loading");
      try {
        const params = new URLSearchParams({ businessId, query: normalizedQuery });
        const response = await fetch(`/api/scan/customers?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const body: unknown = await response.json().catch(() => null);
        if (sequence !== requestSequenceRef.current) return;
        if (!response.ok || !isSearchResponse(body)) {
          getScanCustomerSearchErrorCode(body);
          setResults([]);
          setState("error");
          return;
        }
        setResults(body.results);
        setState(body.results.length ? "results" : "empty");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (sequence === requestSequenceRef.current) {
          setResults([]);
          setState("error");
        }
      } finally {
        if (sequence === requestSequenceRef.current) activeQueryRef.current = null;
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [businessId, query]);

  function clearSearch() {
    requestSequenceRef.current += 1;
    activeQueryRef.current = null;
    setQuery("");
    setResults([]);
    setState("idle");
  }

  return (
    <section aria-labelledby="scan-customer-search-heading" className="mt-8 border-t border-border pt-6">
      <h2 id="scan-customer-search-heading" className="text-lg font-bold text-foreground">{copy.customerSearchHeading}</h2>
      <p className="mt-1 text-sm text-foreground-muted">{copy.customerSearchDescription}</p>
      <div className="mt-4 flex gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="scanCustomerSearch" className="sr-only">{copy.customerSearchLabel}</label>
          <input id="scanCustomerSearch" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.customerSearchPlaceholder} autoComplete="off" className="min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 text-black placeholder:text-foreground-subtle outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20" />
        </div>
        {query && <button type="button" onClick={clearSearch} className="min-h-11 shrink-0 rounded-[var(--lf-radius-input)] border border-border px-4 text-sm font-semibold text-foreground-muted hover:bg-surface-subtle">{copy.clearCustomerSearch}</button>}
      </div>
      <p className="mt-2 text-xs text-foreground-subtle">{copy.customerSearchMinimum}</p>
      <div aria-live="polite" aria-busy={displayedState === "loading"} className="mt-4">
        {displayedState === "loading" && <p role="status" className="text-sm text-foreground-muted">{copy.customerSearching}</p>}
        {displayedState === "empty" && <p role="status" className="rounded-[var(--lf-radius-input)] bg-surface-subtle px-4 py-4 text-sm text-foreground-muted">{copy.customerSearchEmpty}</p>}
        {displayedState === "error" && <p role="alert" className="rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-4 text-sm text-danger">{copy.customerSearchError}</p>}
        {displayedState === "results" && <ul className="space-y-2" aria-label={copy.customerSearchHeading}>
          {displayedResults.map((customer) => <li key={customer.id}><Link href={customer.url} className="flex min-h-11 items-center justify-between gap-4 rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 text-sm hover:border-primary/30 hover:bg-primary-subtle focus:outline-none focus:ring-4 focus:ring-primary/20" aria-label={`${copy.customerSearchOpen}: ${customer.name}`}><span className="min-w-0"><span className="block truncate font-semibold text-foreground" dir="auto">{customer.name}</span><span className="block text-xs text-foreground-subtle" dir="ltr">{customer.phone} · {customer.customerCode}</span></span><span className="shrink-0 font-semibold text-primary">{copy.customerSearchOpen}</span></Link></li>)}
        </ul>}
      </div>
    </section>
  );
}

function isSearchResponse(value: unknown): value is { ok: true; results: SearchResult[] } {
  return typeof value === "object" && value !== null && "ok" in value && value.ok === true && "results" in value && Array.isArray(value.results);
}
