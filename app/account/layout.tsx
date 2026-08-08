import AuthenticatedLocaleShell from "@/components/authenticated-locale-shell";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthenticatedLocaleShell>
      {children}
    </AuthenticatedLocaleShell>
  );
}
