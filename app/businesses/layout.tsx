import AuthenticatedLocaleShell from "@/components/authenticated-locale-shell";

type LocaleLayoutProps = {
  children: React.ReactNode;
};

export default function LocaleLayout({
  children,
}: LocaleLayoutProps) {
  return (
    <AuthenticatedLocaleShell>
      {children}
    </AuthenticatedLocaleShell>
  );
}
