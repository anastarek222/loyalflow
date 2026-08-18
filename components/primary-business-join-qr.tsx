/* eslint-disable @next/next/no-img-element */

import CopyLinkButton from "@/components/copy-link-button";
import { getRequestBaseUrl } from "@/lib/app-url";
import {
  businessJoinPath,
  businessJoinUrl,
} from "@/lib/customers/business-join-link";
import type { AppLanguage } from "@/lib/i18n";
import Link from "next/link";
import * as QRCode from "qrcode";

type Props = {
  businessName: string;
  slug: string;
  language: AppLanguage;
};

export async function PrimaryBusinessJoinQr({
  businessName,
  slug,
  language,
}: Props) {
  const baseUrl = await getRequestBaseUrl();
  const joinPath = businessJoinPath(slug);
  const joinUrl = businessJoinUrl(baseUrl, slug);
  const t = (ar: string, en: string) => (language === "AR" ? ar : en);

  let qrCode: string | null = null;
  try {
    qrCode = await QRCode.toDataURL(joinUrl, {
      width: 360,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#111827",
        light: "#FFFFFFFF",
      },
    });
  } catch {
    // The canonical join URL remains usable and copyable if QR generation fails.
  }

  return (
    <section
      id="business-join"
      aria-labelledby="business-join-heading"
      className="mb-8 scroll-mt-24 overflow-hidden rounded-[var(--lf-radius-card)] border border-primary/15 bg-white shadow-sm"
      data-primary-business-join-qr
    >
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="p-5 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
            {t("انضمام العملاء", "Customer joining")}
          </p>
          <h2
            id="business-join-heading"
            className="mt-1 text-xl font-black text-foreground"
          >
            {t("كود QR الأساسي للنشاط", "Primary Business QR")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground-muted">
            {t(
              `هذا هو كود الانضمام الأساسي لـ ${businessName}. عند مسحه يفتح نموذج التسجيل الحالي، وبعد إكمال التسجيل يُنشأ كارت الولاء الرقمي مباشرة.`,
              `This is ${businessName}'s primary join QR. Scanning it opens the existing registration flow, and the digital loyalty card is created immediately after registration completes.`,
            )}
          </p>

          <div className="mt-5 rounded-xl border border-border bg-surface-subtle p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-foreground-subtle">
              {t("رابط الانضمام الأساسي", "Primary join link")}
            </p>
            <p
              dir="ltr"
              className="mt-2 break-all font-mono text-xs leading-5 text-foreground"
            >
              {joinUrl}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <CopyLinkButton
                value={joinUrl}
                language={language}
                label={t("نسخ رابط الانضمام", "Copy join link")}
                copiedLabel={t("تم نسخ الرابط", "Join link copied")}
                className="inline-flex min-h-11 items-center rounded-[var(--lf-radius-input)] bg-primary px-4 text-sm font-bold text-white transition hover:bg-primary-hover"
              />
              <Link
                href={joinPath}
                className="inline-flex min-h-11 items-center rounded-[var(--lf-radius-input)] border border-border bg-white px-4 text-sm font-bold text-foreground transition hover:border-primary/30 hover:text-primary"
              >
                {t("فتح صفحة الانضمام", "Open join page")}
              </Link>
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-foreground-subtle">
            {t(
              "هذا الكود لا يخص فرعًا أو حملة أو إحالة؛ يظل مسار الانضمام الأساسي الوحيد للنشاط.",
              "This QR is not branch-, campaign-, or referral-specific; it remains the business's single primary join path.",
            )}
          </p>
        </div>

        <div className="flex items-center justify-center border-t border-border bg-surface-subtle p-6 lg:border-s lg:border-t-0">
          {qrCode ? (
            <img
              src={qrCode}
              alt={t(
                `كود QR للانضمام إلى ${businessName}`,
                `QR code to join ${businessName}`,
              )}
              className="aspect-square w-full max-w-56 rounded-2xl border border-border bg-white p-3 shadow-sm"
            />
          ) : (
            <div className="flex aspect-square w-full max-w-56 items-center justify-center rounded-2xl border border-dashed border-border bg-white p-5 text-center text-sm font-semibold text-foreground-muted">
              {t(
                "تعذر إنشاء صورة QR الآن. رابط الانضمام بالأعلى ما زال متاحًا للنسخ والفتح.",
                "The QR image could not be generated right now. The join link above is still available to copy or open.",
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
