"use client";

import { useEffect, useRef } from "react";

import {
  emitMarketingConversion,
  type MarketingConversionEvent,
} from "@/lib/marketing/conversion-events";

type MarketingConversionReceiptProps = Readonly<{
  event: MarketingConversionEvent;
  source: string;
  target?: string;
}>;

export function MarketingConversionReceipt({
  event,
  source,
  target,
}: MarketingConversionReceiptProps) {
  const emittedRef = useRef(false);

  useEffect(() => {
    if (emittedRef.current) return;
    emittedRef.current = true;
    emitMarketingConversion(event, source, target);
  }, [event, source, target]);

  return null;
}
