import { MarketingConversionReceipt } from "@/components/marketing/marketing-conversion-receipt";

export default function BusinessOnboardingConversionLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <MarketingConversionReceipt
        event="onboarding_start"
        source="super_admin_add_business"
        target="/businesses/new"
      />
      {children}
    </>
  );
}
