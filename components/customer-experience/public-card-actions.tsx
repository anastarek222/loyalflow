"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, Share2, X } from "lucide-react";
import { getPublicExperienceCopy } from "@/lib/customer-experience/public-copy";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
type Props = {
  cardUrl: string;
  businessName: string;
  customerName: string;
  language: "AR" | "EN";
  primaryColor: string;
};

export function PublicCardActions({
  cardUrl,
  businessName,
  customerName,
  language,
  primaryColor,
}: Props) {
  const copy = getPublicExperienceCopy(language);
  const [notice, setNotice] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [canShowInstall, setCanShowInstall] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      setInstalled(standalone);
      const ios =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      setCanShowInstall(ios);
    });
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setCanShowInstall(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setShowHelp(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function copyLink() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(cardUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = cardUrl;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        if (!copied) throw new Error("copy failed");
      }
      setNotice(copy.copied);
    } catch {
      setNotice(copy.shareFailed);
    }
  }
  async function share() {
    if (!navigator.share) return copyLink();
    try {
      await navigator.share({
        title: businessName,
        text: `${copy.share}: ${customerName}`,
        url: cardUrl,
      });
      setNotice(null);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError")
        setNotice(copy.shareCancelled);
      else setNotice(copy.shareFailed);
    }
  }
  async function install() {
    if (installed || !canShowInstall) return;
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setNotice(null);
      else setNotice(copy.shareCancelled);
      setInstallPrompt(null);
      return;
    }
    setShowHelp(true);
  }
  const isIOS =
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
  return (
    <section
      className="mt-4 rounded-2xl border border-white/80 bg-white/85 p-2 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.5)] backdrop-blur sm:p-3"
      aria-label={copy.share}
    >
      <div
        className={`grid grid-cols-2 gap-2 ${canShowInstall ? "sm:grid-cols-3" : ""}`}
      >
        <button
          type="button"
          aria-label={copy.share}
          onClick={share}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white shadow-sm transition hover:brightness-95"
          style={{ backgroundColor: primaryColor }}
        >
          <Share2 className="size-4" aria-hidden="true" />
          {copy.share}
        </button>
        <button
          type="button"
          aria-label={copy.copyLink}
          onClick={copyLink}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          {notice === copy.copied ? (
            <Check className="size-4 text-emerald-600" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
          {notice === copy.copied ? copy.copied : copy.copyLink}
        </button>
        {canShowInstall ? (
          <button
            type="button"
            aria-label={installed ? copy.installed : copy.install}
            onClick={install}
            disabled={installed}
            className="col-span-2 flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-default disabled:opacity-60 sm:col-span-1"
          >
            {installed ? (
              <Check className="size-4 text-emerald-600" aria-hidden="true" />
            ) : (
              <Download className="size-4" aria-hidden="true" />
            )}
            {installed ? copy.installed : copy.install}
          </button>
        ) : null}
      </div>
      {notice && notice !== copy.copied ? (
        <p
          role="status"
          aria-live="polite"
          className="mt-3 text-center text-xs font-semibold text-slate-600"
        >
          {notice}
        </p>
      ) : null}
      {showHelp ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={copy.installHelpTitle}
          className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-900"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-black">{copy.installHelpTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {isIOS ? copy.iosInstallHelp : copy.otherInstallHelp}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              aria-label={copy.close}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
