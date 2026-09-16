import { BusinessLogoImage } from "@/components/business-logo-image";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

type ExistingMembershipPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ExistingMembershipPage({
  params,
}: ExistingMembershipPageProps) {
  const { slug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      logoUrl: true,
      cardDefaultLanguage: true,
      isActive: true,
    },
  });

  if (!business?.isActive) {
    notFound();
  }

  const isArabic = business.cardDefaultLanguage === "AR";
  const copy = isArabic
    ? {
        eyebrow: "عضويتك موجودة بالفعل",
        title: "مش محتاج تسجل من جديد.",
        body: "لحماية كارت الولاء، لن نعرض رابط الكارت باستخدام رقم الهاتف فقط.",
        savedTitle: "لو كنت حفظت الكارت قبل كده",
        savedBody:
          "افتح رابط الكارت من سجل المتصفح أو من الاختصار الذي حفظته على جهازك.",
        staffTitle: "لو رابط الكارت مش معاك",
        staffBody: `اطلب من أحد موظفي ${business.name} فتح ملفك وإعادة مشاركة رابط الكارت من شاشة العميل.`,
        back: "العودة لصفحة التسجيل",
      }
    : {
        eyebrow: "Your membership already exists",
        title: "You do not need to register again.",
        body: "To protect your loyalty card, we will not reveal its private link using a phone number alone.",
        savedTitle: "If you saved your card before",
        savedBody:
          "Open the card link from your browser history or the shortcut you saved on your device.",
        staffTitle: "If you no longer have the card link",
        staffBody: `Ask a ${business.name} staff member to open your customer profile and share your card link again.`,
        back: "Back to registration",
      };

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-subtle px-4 py-10">
      <section className="w-full max-w-lg rounded-[var(--lf-radius-panel)] border border-border bg-white p-6 shadow-sm sm:p-8">
        {business.logoUrl ? (
          <BusinessLogoImage
            src={business.logoUrl}
            alt={business.name}
            className="mb-5 size-12 rounded-[var(--lf-radius-input)]"
          />
        ) : null}

        <p className="text-sm font-semibold text-primary">{copy.eyebrow}</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">{copy.title}</h1>
        <p className="mt-3 text-sm leading-6 text-foreground-muted">{copy.body}</p>

        <div className="mt-6 space-y-3">
          <div className="rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle p-4">
            <h2 className="font-semibold text-foreground">{copy.savedTitle}</h2>
            <p className="mt-1 text-sm leading-6 text-foreground-muted">
              {copy.savedBody}
            </p>
          </div>
          <div className="rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle p-4">
            <h2 className="font-semibold text-foreground">{copy.staffTitle}</h2>
            <p className="mt-1 text-sm leading-6 text-foreground-muted">
              {copy.staffBody}
            </p>
          </div>
        </div>

        <Link
          href={`/join/${business.slug}`}
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-[var(--lf-radius-input)] bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          {copy.back}
        </Link>
      </section>
    </main>
  );
}
