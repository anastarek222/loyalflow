"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { Gift, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getPublicExperienceCopy } from "@/lib/customer-experience/public-copy";
import type { AppLanguage } from "@/lib/i18n";

const HIGHLIGHT_STORAGE_PREFIX = "loyalflow:customer-highlights:v1";
const HIGHLIGHT_EVENT_PREFIX = "loyalflow:customer-highlights-change";
const MAX_SEEN_HIGHLIGHTS = 20;

type CustomerHighlightItem = {
  key: string;
  kind: "OFFER" | "REWARD";
  title: string;
  description: string | null;
};

type CustomerNewHighlightsProps = {
  scope: string;
  items: readonly CustomerHighlightItem[];
  language: AppLanguage;
};

function parseSeenKeys(value: string) {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((key): key is string => typeof key === "string")
      .slice(0, MAX_SEEN_HIGHLIGHTS);
  } catch {
    return [];
  }
}

export function CustomerNewHighlights({
  scope,
  items,
  language,
}: CustomerNewHighlightsProps) {
  const copy = getPublicExperienceCopy(language);
  const storageKey = `${HIGHLIGHT_STORAGE_PREFIX}:${scope}`;
  const eventName = `${HIGHLIGHT_EVENT_PREFIX}:${scope}`;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const onStorage = (event: StorageEvent) => {
        if (event.key === storageKey) onStoreChange();
      };
      window.addEventListener("storage", onStorage);
      window.addEventListener(eventName, onStoreChange);

      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(eventName, onStoreChange);
      };
    },
    [eventName, storageKey],
  );
  const getSnapshot = useCallback(() => {
    try {
      return window.localStorage.getItem(storageKey) ?? "[]";
    } catch {
      return "[]";
    }
  }, [storageKey]);
  const storedValue = useSyncExternalStore(subscribe, getSnapshot, () => "[]");
  const [sessionSeenKeys, setSessionSeenKeys] = useState<string[]>([]);
  const seenKeys = useMemo(
    () => [...new Set([...sessionSeenKeys, ...parseSeenKeys(storedValue)])],
    [sessionSeenKeys, storedValue],
  );
  const current = items.find((item) => !seenKeys.includes(item.key));

  if (!current) return null;

  const dismiss = () => {
    setSessionSeenKeys((currentKeys) => [
      current.key,
      ...currentKeys.filter((key) => key !== current.key),
    ]);
    const nextSeenKeys = [
      current.key,
      ...seenKeys.filter((key) => key !== current.key),
    ].slice(0, MAX_SEEN_HIGHLIGHTS);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextSeenKeys));
      window.dispatchEvent(new Event(eventName));
    } catch {
      // Optional seen-state must never block the public card.
    }
  };

  const isOffer = current.kind === "OFFER";
  const Icon = isOffer ? Sparkles : Gift;

  return (
    <section
      role="status"
      aria-label={copy.newForYou}
      className="lf-card-reveal mb-4 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-amber-50 px-4 py-4 shadow-sm sm:px-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-wide text-violet-700">
            {isOffer ? copy.newOffer : copy.newReward}
          </p>
          <h2 dir="auto" className="mt-1 font-black text-slate-950">
            {current.title}
          </h2>
          {current.description ? (
            <p dir="auto" className="mt-1 text-sm leading-6 text-slate-600">
              {current.description}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          onClick={dismiss}
          aria-label={copy.dismissHighlight}
          className="-m-1 size-11 shrink-0 text-slate-500 hover:bg-white hover:text-slate-950"
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}
