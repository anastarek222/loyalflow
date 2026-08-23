import { BusinessSetupStepperVisibility } from "@/components/business-setup-stepper-visibility";

export default function NewBusinessLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div data-business-setup-route="true">
      <BusinessSetupStepperVisibility />
      {children}
    </div>
  );
}
