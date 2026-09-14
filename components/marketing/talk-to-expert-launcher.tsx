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
    <div className="lf-marketing-surface fixed bottom-[max(1rem,env(safe-area-inset-bottom))] end-4 z-[70] sm:end-6">
      {isOpen ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label={content.title}
          data-testid="talk-to-expert-panel"
          className={`${styles.panel} mb-3 overflow-hidden rounded-[var(--lf-radius-card)] border border-border bg-surface shadow-[var(--lf-shadow-overlay)]`}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <p className="font-[var(--font-marketing-editorial)] text-xl font-semibold tracking-tight text-foreground">
                {content.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-foreground-muted">
                {content.body}
              </p>
            </div>
            <button
              type="button"
              aria-label={content.close}
              onClick={close}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-[var(--lf-marketing-canvas)] text-foreground transition-colors hover:border-primary/40 hover:text-primary"
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
                <span className="block text-sm font-bold text-foreground">
                  {content.book}
                </span>
                <span
                  className={`${styles.actionBody} mt-0.5 text-xs leading-5 text-foreground-muted`}
                >
                  {content.bookBody}
                </span>
              </span>
              <ArrowUpRight
                size={17}
                aria-hidden="true"
                className={`${styles.actionArrow} shrink-0 text-foreground-subtle transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100`}
              />
            </Link>

            <Link
              href="/contact#whatsapp"
              onClick={close}
              className={`${styles.action} group rounded-xl transition-colors hover:bg-[var(--lf-primary-soft)]`}
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-[var(--lf-marketing-canvas)] text-primary">
                <MessageCircle size={19} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-foreground">
                  {content.whatsapp}
                </span>
                <span
                  className={`${styles.actionBody} mt-0.5 text-xs leading-5 text-foreground-muted`}
                >
                  {content.whatsappBody}
                </span>
              </span>
              <ArrowUpRight
                size={17}
                aria-hidden="true"
                className={`${styles.actionArrow} shrink-0 text-foreground-subtle transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100`}
              />
            </Link>

            <Link
              href="/contact#contact-options"
              onClick={close}
              className={`${styles.action} group rounded-xl transition-colors hover:bg-[var(--lf-primary-soft)]`}
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-[var(--lf-marketing-canvas)] text-primary">
                <MessagesSquare size={19} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-foreground">
                  {content.contact}
                </span>
                <span
                  className={`${styles.actionBody} mt-0.5 text-xs leading-5 text-foreground-muted`}
                >
                  {content.contactBody}
                </span>
              </span>
              <ArrowUpRight
                size={17}
                aria-hidden="true"
                className={`${styles.actionArrow} shrink-0 text-foreground-subtle transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100`}
              />
            </Link>
          </div>
        </div>
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        aria-label={content.trigger}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        data-testid="talk-to-expert-trigger"
        className="group ms-auto inline-flex min-h-12 items-center gap-2 rounded-full border border-primary/25 bg-primary px-4 py-3 text-sm font-bold text-[var(--lf-primary-foreground)] shadow-[var(--lf-shadow-raised)] transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
      >
        <MessageCircle size={19} aria-hidden="true" />
        <span className="hidden sm:inline">{content.trigger}</span>
      </button>
    </div>
  );
}
