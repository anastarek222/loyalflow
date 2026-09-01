import { publishCustomCardArtworkAction } from "@/app/businesses/[slug]/program/custom-card-publish-action";
import { uploadCustomCardDraftCommandAction } from "@/app/businesses/[slug]/program/custom-card-upload-action";
import { ConfirmedSubmitButton } from "@/components/confirmed-submit-button";
import { CustomCardExperienceStatus } from "@/components/custom-card-experience-status";
import { CustomCardSafeZoneGuide } from "@/components/custom-card-safe-zone-guide";
import {
  LoyaltyCard,
  type LoyaltyCardProps,
} from "@/components/loyalty-card";
import { getAuthenticatedRequestContext } from "@/lib/auth/authenticated-request-context";
import type { CustomCardArtworkVersion } from "@/lib/cards/custom-card-storage";
import { normalizeLanguage } from "@/lib/i18n";
import prisma from "@/lib/prisma";

type Props = {
  slug: string;
  selectedVersion?: string;
  status?: string;
  versions: CustomCardArtworkVersion[];
  storageConfigured: boolean;
  preview: Pick<
    LoyaltyCardProps,
    | "businessName"
    | "primaryColor"
    | "secondaryColor"
    | "customerName"
    | "customerId"
    | "balance"
    | "loyaltyMode"
    | "unitName"
    | "currency"
    | "rewardName"
    | "rewardThreshold"
  >;
};

export async function CustomCardArtworkManager({
  slug,
  selectedVersion,
  status,
  versions,
  storageConfigured,
  preview,
}: Props) {
  const requestContext = await getAuthenticatedRequestContext();
  const language = normalizeLanguage(requestContext?.user?.language);
  const t = (ar: string, en: string) => (language === "AR" ? ar : en);
  const selected = versions.find((version) => version.id === selectedVersion);
  const businessTimezone = await prisma.business.findUnique({
    where: { slug },
    select: { timezone: true },
  });
  const savedVersionFormatter = new Intl.DateTimeFormat(
    language === "AR" ? "ar-EG" : "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: businessTimezone?.timezone || "UTC",
    },
  );
  const uploadCustomArtwork = uploadCustomCardDraftCommandAction.bind(null, slug);
  const publishCustomArtwork = publishCustomCardArtworkAction.bind(null, slug);
  const selectedArtwork = selected
    ? {
        ...preview,
        designMode: "CUSTOM",
        customDesignEnabled: true,
        customFrontArtworkUrl: `/api/businesses/${encodeURIComponent(slug)}/custom-card-artwork/${selected.id}/front`,
        customBackArtworkUrl: `/api/businesses/${encodeURIComponent(slug)}/custom-card-artwork/${selected.id}/back`,
      }
    : null;

  return (
    <section className="mb-5 rounded-2xl border border-primary/20 bg-primary/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-black">
            {t("تصميم البطاقة المخصصة", "Custom Card artwork")}
          </p>
          <p className="mt-1 max-w-3xl text-sm text-foreground-muted">
            {t(
              "ارفع الواجهة الأمامية والخلفية معًا، ثم عاين الزوج وانشره بعد الموافقة.",
              "Upload Front and Back together, then preview the pair and publish it after approval.",
            )}
          </p>
        </div>
        <span className="rounded-full border border-primary/20 bg-white px-3 py-1 text-xs font-black text-primary">
          {t("للمشرف العام فقط", "Super Admin only")}
        </span>
      </div>

      <CustomCardExperienceStatus
        isArabic={language === "AR"}
        status={status}
      />

      <details className="group mt-4 rounded-xl border border-border bg-white p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-black marker:content-none">
          <span>{t("متطلبات التصميم", "Artwork requirements")}</span>
          <span
            aria-hidden="true"
            className="text-lg text-foreground-muted transition group-open:rotate-180"
          >
            ↓
          </span>
        </summary>
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-sm leading-6 text-foreground-muted">
            {t(
              "كل رفع ناجح ينشئ مسودة أمامية + خلفية ثابتة. يجب أن يكون الجانبان بنفس أبعاد البكسل وبنسبة ID-1 القياسية. لا تتغير بطاقة العميل الحالية حتى تنشر الزوج صراحةً.",
              "Each successful upload creates an immutable Front + Back draft. Both sides need identical pixel dimensions and the standard ID-1 ratio. The currently published customer card does not change until publishing is confirmed.",
            )}
          </p>
          <CustomCardSafeZoneGuide
            isArabic={language === "AR"}
            preview={preview}
          />
          <p className="mt-4 text-xs leading-5 text-foreground-muted">
            {t(
              "PNG أو JPEG أو WebP. الحد الأقصى 4 ميجابايت للواجهة الأمامية + الخلفية، بنسبة ID-1 حوالي 1.586:1. لا ينشئ تاني أيًا من الجانبين تلقائيًا في الوضع المخصص. اترك مناطق QR واسم العميل والرصيد والمكافأة والنتيجة خالية.",
              "Use PNG, JPEG, or WebP. Maximum 4 MB total across Front + Back, at the ID-1 ratio of about 1.586:1. Tanee never generates either side in Custom mode. Keep the QR, customer name, balance, reward, and score zones clear.",
            )}
          </p>
        </div>
      </details>

      {!storageConfigured ? (
        <p className="mt-4 rounded-xl border border-warning/30 bg-warning-subtle p-3 text-sm font-bold">
          {t(
            "Vercel Blob غير متصل بهذه البيئة. يظل التصميم الحالي دون تغيير وتُرفض عمليات الرفع بأمان.",
            "Vercel Blob is not connected to this environment. Existing artwork remains unchanged and uploads fail closed.",
          )}
        </p>
      ) : (
        <form action={uploadCustomArtwork} className="mt-5 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold">
              {t("الواجهة الأمامية · مطلوبة", "Front artwork · required")}
              <input
                required
                name="customCardFrontFile"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="mt-2 block w-full rounded-xl border border-border bg-white px-3 py-3 text-sm"
              />
            </label>
            <label className="text-sm font-bold">
              {t("الواجهة الخلفية · مطلوبة", "Back artwork · required")}
              <input
                required
                name="customCardBackFile"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="mt-2 block w-full rounded-xl border border-border bg-white px-3 py-3 text-sm"
              />
            </label>
          </div>
          <p className="text-xs text-foreground-muted">
            {t(
              "PNG أو JPEG أو WebP · الملفان معًا بحد أقصى 4 ميجابايت · نفس أبعاد البكسل.",
              "PNG, JPEG, or WebP · 4 MB combined · identical pixel dimensions.",
            )}
          </p>
          <button
            type="submit"
            className="w-fit rounded-[var(--lf-radius-input)] bg-primary px-5 py-3 font-black text-[var(--lf-primary-foreground)]"
          >
            {t("إنشاء مسودة الأمامية + الخلفية", "Create Front + Back draft")}
          </button>
        </form>
      )}

      {selected && selectedArtwork ? (
        <div className="mt-6 rounded-2xl border border-border bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-black">{t("معاينة المسودة", "Draft preview")}</p>
              <p className="mt-1 font-mono text-xs text-foreground-muted">
                {selected.id}
              </p>
            </div>
            <form action={publishCustomArtwork}>
              <input type="hidden" name="customVersion" value={selected.id} />
              <ConfirmedSubmitButton
                label={t(
                  "نشر زوج الأمامية + الخلفية",
                  "Publish this Front + Back pair",
                )}
                confirmMessage={t(
                  "نشر زوج الأمامية + الخلفية هذا على جميع بطاقات العملاء لهذا النشاط؟ سيتم استبدال الزوج المنشور حاليًا.",
                  "Publish this Front + Back pair to all customer cards for this business? The currently published pair will be replaced.",
                )}
                className="rounded-[var(--lf-radius-input)] bg-emerald-600 px-5 py-3 font-black text-white"
              />
            </form>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-foreground-muted">
                {t("الأمامية", "front")}
              </p>
              <LoyaltyCard {...selectedArtwork} side="front" />
            </div>
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-foreground-muted">
                {t("الخلفية", "back")}
              </p>
              <LoyaltyCard {...selectedArtwork} side="back" />
            </div>
          </div>

          <p className="mt-3 text-xs text-foreground-muted">
            {t(
              "هذه معاينة فعلية لنفس عارض بطاقة العميل، وتشمل أماكن رمز QR واسم العميل والرصيد والمكافأة والنتيجة قبل النشر.",
              "This is a runtime-accurate preview from the customer-card renderer, including the QR, customer name, balance, reward and score zones before publishing.",
            )}
          </p>

          <p className="mt-4 rounded-xl border border-border bg-surface-subtle p-3 text-xs text-foreground-muted">
            {t(
              "النشر إجراء منفصل يتطلب التأكيد. رفع المسودة أو معاينتها لا يغيّر البطاقة الظاهرة للعملاء.",
              "Publishing is a separate confirmed action. Uploading or previewing a draft never changes the customer-facing card.",
            )}
          </p>
        </div>
      ) : null}

      {versions.length > 0 ? (
        <details
          className="mt-5 rounded-xl border border-border bg-white p-4"
          data-testid="custom-card-retained-library"
        >
          <summary className="cursor-pointer font-black">
            {t(
              `مكتبة التصميمات المحفوظة (${versions.length})`,
              `Saved Custom Card library (${versions.length})`,
            )}
          </summary>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground-muted">
            {t(
              "كل زوج محفوظ يظل متاحًا لإعادة الاستخدام. يمكنك الاحتفاظ بالتصميم الأساسي وتصميمات موسمية ثم معاينة أي نسخة وإعادة نشرها لاحقًا. نشر نسخة يغيّر البطاقة النشطة فقط ولا يحذف النسخ المحفوظة الأخرى.",
              "Every saved Front + Back pair remains reusable. Keep an evergreen design alongside seasonal alternatives, preview any saved version, and publish it again later. Publishing switches the active customer card without deleting the other retained versions.",
            )}
          </p>
          <ul className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {versions.map((version, index) => {
              const previewing = selectedVersion === version.id;
              return (
                <li
                  key={version.id}
                  className="rounded-xl border border-border bg-surface-subtle p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-black text-foreground">
                        {t(
                          `تصميم محفوظ ${versions.length - index}`,
                          `Saved design ${versions.length - index}`,
                        )}
                      </p>
                      <p className="mt-1 text-xs text-foreground-muted">
                        {savedVersionFormatter.format(version.uploadedAt)}
                      </p>
                    </div>
                    {previewing ? (
                      <span className="shrink-0 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-black text-primary">
                        {t("تتم معاينته", "Previewing")}
                      </span>
                    ) : null}
                  </div>
                  <p
                    className="mt-2 truncate font-mono text-[10px] text-foreground-muted"
                    title={version.id}
                  >
                    {version.id}
                  </p>
                  <a
                    href={`/businesses/${encodeURIComponent(slug)}/program?cardDesign=draft&customVersion=${version.id}`}
                    className="mt-3 inline-flex min-h-10 items-center rounded-lg font-bold text-primary underline"
                  >
                    {t("معاينة واختيار هذا التصميم", "Preview and select this design")}
                  </a>
                </li>
              );
            })}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
