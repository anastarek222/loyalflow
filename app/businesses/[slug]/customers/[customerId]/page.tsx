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
 * delivery onto the durable outbox/history contract. Legacy direct wa.me links
 * are hidden so opted-out customers cannot bypass canonical consent state.
 */
export default async function CustomerDetailsPage(props: CustomerDetailsPageProps) {
  return (
    <>
      <style>{`
        .wa4-profile-shell a[href^="https://wa.me/"] {
          display: none !important;
        }
        .wa4-profile-shell section:has(> a[href^="https://wa.me/"]) {
          display: none !important;
        }
      `}</style>
      <div className="wa4-profile-shell">
        <LegacyCustomerDetailsPage {...props} />
      </div>
      <CustomerWhatsAppPanel {...props} />
    </>
  );
}
