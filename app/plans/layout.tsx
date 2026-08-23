import AuthenticatedLocaleShell from "@/components/authenticated-locale-shell";

export default function PlansLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedLocaleShell>{children}</AuthenticatedLocaleShell>;
}
