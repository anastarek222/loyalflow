import AuthenticatedLocaleShell from "@/components/authenticated-locale-shell";

export default function OperationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedLocaleShell>{children}</AuthenticatedLocaleShell>;
}
