"use client";

import {
  ArrowUpRight,
  CalendarDays,
  MessageCircle,
  MessagesSquare,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { SupportedLocale } from "@/lib/i18n/config";

import styles from "./talk-to-expert-launcher.module.css";

const copy = {
  en: {
    trigger: "Talk to an expert",
    teaser: "Book your meeting",
    title: "Talk to Tanee",
    body: "Choose the fastest way to speak with our team.",
    book: "Book a meeting",
    bookBody: "Share your preferred time and how you would like to meet.",
    whatsapp: "WhatsApp us",
    whatsappBody: "Jump straight to the fastest messaging option.",
    contact: "Contact sales",
    contactBody: "See phone, email and the full contact page.",
    close: "Close contact options",
  },
  ar: {
    trigger: "تكلّم مع خبير",
    teaser: "احجز اجتماعك",
    title: "تكلّم مع Tanee",
    body: "اختار أسرع طريقة تتواصل بيها مع فريقنا.",
    book: "احجز اجتماع",
    bookBody: "اختار الوقت المناسب والطريقة اللي تفضّل نتقابل بيها.",
    whatsapp: "كلّمنا على WhatsApp",
    whatsappBody: "روح مباشرة لأسرع وسيلة رسائل مع الفريق.",
    contact: "تواصل مع المبيعات",
    contactBody: "شوف التليفون والإيميل وكل طرق التواصل.",
    close: "إغلاق خيارات التواصل",
  },
} as const;

type TalkToExpertLauncherProps = {
  locale: SupportedLocale;
};

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M12.04 2a9.84 9.84 0 0 0-8.43 14.9L2 22l5.23-1.55A9.97 9.97 0 0 0 12.04 22C17.53 22 22 17.52 22 12S17.53 2 12.04 2Zm0 18.18a8.12 8.12 0 0 1-4.14-1.14l-.3-.18-3.1.92.95-3.02-.2-.31a8.03 8.03 0 0 1-1.25-4.34 8.08 8.08 0 1 1 8.04 8.07Zm4.43-6.05c-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.47-.39-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.65.58.25 1.03.4 1.38.51.58.18 1.1.16 1.52.1.46-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" />
    </svg>
  );
}

export function TalkToExpertLauncher({ locale }: TalkToExpertLauncherProps) {
  const content = copy[locale];
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isOpen]);

  const close = () => setIsOpen(false);

  return (
    <div
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="lf-marketing-surface fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-[70] sm:right-6"
    >
      {isOpen ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label={content.title}
          data-testid="talk-to-expert-panel"
          className={`${styles.panel} mb-3 overflow-hidden rounded-[var(--lf-radius-card)] border border-[var(--lf-border)] bg-[var(--lf-surface)] text-[var(--lf-foreground)] shadow-[var(--lf-shadow-overlay)]`}
        >
          <div className="flex items-start justify-between gap-4 border-b border-[var(--lf-border)] px-5 py-4">
            <div>
              <p className="font-[var(--font-marketing-editorial)] text-xl font-semibold tracking-tight text-[var(--lf-foreground)]">
                {content.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--lf-foreground-muted)]">
                {content.body}
              </p>
            </div>
            <button
              type="button"
              aria-label={content.close}
              onClick={close}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--lf-border)] bg-[var(--lf-marketing-canvas)] text-[var(--lf-foreground)] transition-colors hover:border-primary/40 hover:text-primary"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div
            data-testid="talk-to-expert-actions"
            className={`${styles.actions} grid p-2`}
          >
            <Link
              href="/contact#book-meeting"
              onClick={close}
              className={`${styles.action} group rounded-xl transition-colors hover:bg-[var(--lf-primary-soft)]`}
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-[var(--lf-primary-foreground)]">
                <CalendarDays size={19} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-[var(--lf-foreground)]">
                  {content.book}
                </span>
                <span
                  className={`${styles.actionBody} mt-0.5 text-xs leading-5 text-[var(--lf-foreground-muted)]`}
                >
                  {content.bookBody}
                </span>
              </span>
              <ArrowUpRight
                size={17}
                aria-hidden="true"
                className={`${styles.actionArrow} shrink-0 text-[var(--lf-foreground-subtle)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100`}
              />
            </Link>

            <Link
              href="/contact#whatsapp"
              onClick={close}
              className={`${styles.action} group rounded-xl transition-colors hover:bg-[var(--lf-primary-soft)]`}
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--lf-border)] bg-[var(--lf-marketing-canvas)] text-primary">
                <WhatsAppIcon className="size-[19px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-[var(--lf-foreground)]">
                  {content.whatsapp}
                </span>
                <span
                  className={`${styles.actionBody} mt-0.5 text-xs leading-5 text-[var(--lf-foreground-muted)]`}
                >
                  {content.whatsappBody}
                </span>
              </span>
              <ArrowUpRight
                size={17}
                aria-hidden="true"
                className={`${styles.actionArrow} shrink-0 text-[var(--lf-foreground-subtle)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100`}
              />
            </Link>

            <Link
              href="/contact#contact-options"
              onClick={close}
              className={`${styles.action} group rounded-xl transition-colors hover:bg-[var(--lf-primary-soft)]`}
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--lf-border)] bg-[var(--lf-marketing-canvas)] text-primary">
                <MessagesSquare size={19} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-[var(--lf-foreground)]">
                  {content.contact}
                </span>
                <span
                  className={`${styles.actionBody} mt-0.5 text-xs leading-5 text-[var(--lf-foreground-muted)]`}
                >
                  {content.contactBody}
                </span>
              </span>
              <ArrowUpRight
                size={17}
                aria-hidden="true"
                className={`${styles.actionArrow} shrink-0 text-[var(--lf-foreground-subtle)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100`}
              />
            </Link>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`${styles.teaser} ms-auto mb-2 flex max-w-[13rem] items-center rounded-xl border border-[var(--lf-border)] bg-[var(--lf-surface)] px-3 py-2 text-xs font-bold text-[var(--lf-foreground)] shadow-[var(--lf-shadow-raised)] transition hover:-translate-y-0.5 hover:border-primary/35`}
          data-testid="talk-to-expert-teaser"
        >
          {content.teaser}
        </button>
      )}

      <button
        ref={triggerRef}
        type="button"
        aria-label={content.trigger}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        data-testid="talk-to-expert-trigger"
        className="group ms-auto inline-flex min-h-12 items-center gap-2 rounded-full border border-primary/25 bg-primary px-4 py-3 text-sm font-bold text-[var(--lf-primary-foreground)] shadow-[var(--lf-shadow-raised)] transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lf-foreground)]"
      >
        <MessageCircle size={19} aria-hidden="true" />
        <span className="hidden sm:inline">{content.trigger}</span>
      </button>
    </div>
  );
}
