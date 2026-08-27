import { MarketingConversionReceipt } from "@/components/marketing/marketing-conversion-receipt";

export default function GetStartedConversionLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <MarketingConversionReceipt
        event="cta"
        source="get_started_arrival"
        target="/get-started"
      />
      {children}
    </>
  );
}
