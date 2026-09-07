"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

function LocalizedText({ ar, en }: { ar: string; en: string }) {
  return (
    <>
      <span className="hidden rtl:inline">{ar}</span>
      <span className="rtl:hidden">{en}</span>
    </>
  );
}

export function FirstRunWhatsAppSetup() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (searchParams.get("setup") !== "whatsapp") return null;

  const match = pathname.match(/^\/businesses\/([^/]+)\/?$/);
  if (!match) return null;

  const businessPath = `/businesses/${match[1]}`;
  const sheetSync = searchParams.get("sheetSync");
  const finishHref = sheetSync
    ? `${businessPath}?sheetSync=${encodeURIComponent(sheetSync)}`
    : businessPath;

  return (
    <section
      data-first-run-whatsapp-setup
      className="mx-auto mb-4 w-full max-w-7xl rounded-[var(--lf-radius-card)] border border-primary/20 bg-white p-5 shadow-sm sm:p-6"
    >
      <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">
        <LocalizedText ar="إكمال إعداد النشاط" en="Finish business setup" />
      </p>
      <h2 className="mt-2 text-xl font-black text-foreground">
        <LocalizedText
          ar="جهّز WhatsApp الخاص بالنشاط"
          en="Set up this business's WhatsApp"
        />
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground-muted">
        <LocalizedText
          ar="كل نشاط يستخدم اتصال WhatsApp الخاص به فقط. اربط رقم النشاط من المسار الرسمي، ثم خصّص رسائل Welcome وBalance Update وReward. نفس النص المحفوظ يُستخدم للإرسال اليدوي والتلقائي بدون نسخة ثانية."
          en="Each business uses only its own WhatsApp connection. Connect the business number through the official flow, then customize Welcome, Balance Update, and Reward. The same saved copy is used for manual and automatic delivery with no second version."
        />
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link
          data-first-run-whatsapp-connect
          href={`${businessPath}/settings/whatsapp?onboarding=1`}
          className="flex min-h-12 items-center justify-center rounded-[var(--lf-radius-input)] bg-primary px-4 py-3 text-center text-sm font-bold text-white hover:bg-primary-hover"
        >
          <LocalizedText
            ar="ربط WhatsApp الخاص بالنشاط"
            en="Connect business WhatsApp"
          />
        </Link>
        <Link
          data-first-run-whatsapp-messages
          href={`${businessPath}/program#customer-messages`}
          className="flex min-h-12 items-center justify-center rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 py-3 text-center text-sm font-bold text-foreground hover:border-primary/30"
        >
          <LocalizedText
            ar="تخصيص الرسائل الثلاث"
            en="Customize the 3 messages"
          />
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs leading-5 text-foreground-subtle">
          <LocalizedText
            ar="لو إعداد Meta غير متاح الآن، تقدر تكمل استخدام Tanee وترجع لنفس الإعداد لاحقًا."
            en="If Meta setup is not available yet, you can continue using Tanee and return to the same setup later."
          />
        </p>
        <Link
          data-first-run-whatsapp-finish
          href={finishHref}
          className="inline-flex min-h-11 items-center rounded-[var(--lf-radius-input)] px-4 text-sm font-semibold text-primary hover:bg-primary-subtle"
        >
          <LocalizedText ar="المتابعة إلى النشاط" en="Continue to business" />
        </Link>
      </div>
    </section>
  );
}
