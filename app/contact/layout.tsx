import { MarketingConversionReceipt } from "@/components/marketing/marketing-conversion-receipt";

export default function ContactConversionLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <MarketingConversionReceipt
        event="contact"
        source="contact_page_arrival"
        target="/contact"
      />
      {children}
    </>
  );
}
