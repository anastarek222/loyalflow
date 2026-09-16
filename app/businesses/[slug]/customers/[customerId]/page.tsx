import LegacyCustomerDetailsPage from "./legacy-page";
import CustomerWhatsAppPanel from "./whatsapp-panel";

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
 * Keeps the established Customer Profile intact while WA-4 moves WhatsApp
 * delivery onto the durable outbox/history contract. The legacy page no longer
 * renders direct wa.me links, so every send is checked by the server authority.
 */
export default async function CustomerDetailsPage(
  props: CustomerDetailsPageProps,
) {
  return (
    <>
      <LegacyCustomerDetailsPage {...props} />
      <CustomerWhatsAppPanel {...props} />
    </>
  );
}
