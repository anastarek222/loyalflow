import LegacyCustomerDetailsPage from "./legacy-page";

type CustomerDetailsPageProps = {
  params: Promise<{
    slug: string;
    customerId: string;
  }>;
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

/**
 * Keeps the established Customer Profile route while the profile owns the
 * placement of its guarded WhatsApp operational panel. Every delivery still
 * passes through server authority and the durable outbox; no direct wa.me send
 * is restored.
 */
export default async function CustomerDetailsPage(
  props: CustomerDetailsPageProps,
) {
  return <LegacyCustomerDetailsPage {...props} />;
}
