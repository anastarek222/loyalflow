import "./customers-responsive.css";

export default function CustomersRouteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div data-customers-route="true">{children}</div>;
}
