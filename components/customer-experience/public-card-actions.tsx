"use client";

import { useEffect, useState } from "react";
import { getPublicExperienceCopy } from "@/lib/customer-experience/public-copy";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type Props = { cardUrl: string; businessName: string; customerName: string; language: "AR" | "EN" };

export function PublicCardActions({ cardUrl, businessName, customerName, language }: Props) {
  const copy = getPublicExperienceCopy(language);
  const [notice, setNotice] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [canShowInstall, setCanShowInstall] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setCanShowInstall(ios);
    const onPrompt = (event: Event) => { event.preventDefault(); setInstallPrompt(event as BeforeInstallPromptEvent); setCanShowInstall(true); };
    const onInstalled = () => { setInstalled(true); setInstallPrompt(null); setShowHelp(false); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
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
    } catch { setNotice(copy.shareFailed); }
  }
  async function share() {
    if (!navigator.share) return copyLink();
    try {
      await navigator.share({ title: businessName, text: `${copy.share}: ${customerName}`, url: cardUrl });
      setNotice(null);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") setNotice(copy.shareCancelled);
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
  const isIOS = typeof navigator !== "undefined" && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
  return <section className="mt-3" aria-label={copy.share}>
    <div className={`grid grid-cols-2 gap-3 ${canShowInstall ? "sm:grid-cols-3" : ""}`}>
      <button type="button" onClick={share} className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white backdrop-blur transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white">{copy.share}</button>
      <button type="button" onClick={copyLink} className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white backdrop-blur transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white">{copy.copyLink}</button>
      {canShowInstall ? <button type="button" onClick={install} disabled={installed} className="col-span-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white backdrop-blur transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white disabled:cursor-default disabled:opacity-70 sm:col-span-1">{installed ? copy.installed : copy.install}</button> : null}
    </div>
    {notice ? <p role="status" className="mt-3 text-center text-xs font-bold text-white/85">{notice}</p> : null}
    {showHelp ? <div role="dialog" aria-modal="true" aria-label={copy.installHelpTitle} className="mt-3 rounded-2xl border border-white/15 bg-white/10 p-4 text-white backdrop-blur"><div className="flex items-start justify-between gap-4"><div><h2 className="font-black">{copy.installHelpTitle}</h2><p className="mt-2 text-sm leading-6 text-white/80">{isIOS ? copy.iosInstallHelp : copy.otherInstallHelp}</p></div><button type="button" onClick={() => setShowHelp(false)} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-black focus:outline-none focus:ring-2 focus:ring-white">{copy.close}</button></div></div> : null}
  </section>;
}
