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
            {t("تصميم البطاقة المخصصة · تجريبي", "Custom Card artwork · Beta")}
          </p>
          <p className="mt-1 max-w-3xl text-sm text-foreground-muted">
            {t(
              "ارفع الواجهة الأمامية والخلفية معًا. كل عملية رفع ناجحة تنشئ مسودة مقترنة ثابتة لا تتغير. يجب أن يستخدم الجانبان نسبة ID-1 القياسية ونفس أبعاد البكسل تمامًا. عاين الزوج هنا، ثم انشره بشكل صريح. البطاقة المنشورة للعملاء لا تتغير حتى يتم تأكيد النشر.",
              "Upload the Front and Back together. Each successful upload creates one immutable paired draft. Both sides must use the standard ID-1 ratio and identical pixel dimensions. Preview the pair here, then publish it explicitly. The currently published customer card does not change until publishing is confirmed.",
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

      <CustomCardSafeZoneGuide
        isArabic={language === "AR"}
        preview={preview}
      />

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
              "PNG أو JPEG أو WebP. الحد الأقصى 4 ميجابايت إجمالًا للواجهة الأمامية + الخلفية. يجب أن يكون الجانبان بنفس أبعاد البكسل تمامًا وبنسبة ID-1 القياسية (حوالي 1.586:1). لا ينشئ LoyalFlow أيًا من الجانبين تلقائيًا في الوضع المخصص. اترك مساحة رمز QR أعلى يمين الواجهة، ومساحة اسم العميل والرصيد أسفل الواجهة، ومساحة المكافأة والنتيجة أسفل الخلفية. التصميم المرفوع مسؤول عن كل عناصر البراند الأخرى.",
              "PNG, JPEG or WebP. Maximum 4 MB total across Front + Back. Both sides must have exactly the same pixel dimensions and the standard ID-1 ratio (about 1.586:1). LoyalFlow never generates either side in Custom mode. Keep the upper-right QR zone, lower-front customer name and balance zones, and lower-back reward and score zones clear. Uploaded artwork owns every other brand element.",
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
        <details className="mt-5 rounded-xl border border-border bg-white p-4">
          <summary className="cursor-pointer font-black">
            {t(
              `الإصدارات المقترنة المحفوظة (${versions.length})`,
              `Retained paired versions (${versions.length})`,
            )}
          </summary>
          <ul className="mt-3 space-y-2 text-sm">
            {versions.map((version) => (
              <li key={version.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs">{version.id}</span>
                <a
                  href={`/businesses/${encodeURIComponent(slug)}/program?cardDesign=draft&customVersion=${version.id}`}
                  className="font-bold text-primary underline"
                >
                  {t("معاينة الزوج", "Preview pair")}
                </a>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
