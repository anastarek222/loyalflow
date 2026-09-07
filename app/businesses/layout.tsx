import AuthenticatedLocaleShell from "@/components/authenticated-locale-shell";
import { FirstRunWhatsAppSetup } from "@/components/first-run-whatsapp-setup";

type LocaleLayoutProps = {
  children: React.ReactNode;
};

export default function LocaleLayout({
  children,
}: LocaleLayoutProps) {
  return (
    <AuthenticatedLocaleShell>
      <FirstRunWhatsAppSetup />
      {children}
    </AuthenticatedLocaleShell>
  );
}
