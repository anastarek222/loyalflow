"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { scanUiCopy } from "@/lib/scan/copy";
import { getScanResolveErrorCode, isScanResolveSuccessResponse, type ScanResolveErrorCode } from "@/lib/scan/resolve";
import type { AppLanguage } from "@/lib/i18n";

type QrScannerProps = { businessId: string; language: AppLanguage };
type ScannerInstance = import("html5-qrcode").Html5QrcodeScanner;
type CameraError = "unavailable" | "permission" | "secure" | "initialization";

function resolveErrorMessage(code: ScanResolveErrorCode, copy: ReturnType<typeof scanUiCopy>) {
  switch (code) {
    case "UNAUTHENTICATED": return copy.authenticationRequired;
    case "INVALID_INPUT": case "INVALID_CARD": return copy.invalidQrInput;
    case "FORBIDDEN": return copy.permissionDenied;
    case "RATE_LIMITED": return copy.rateLimited;
    case "CUSTOMER_NOT_FOUND": return copy.customerOrCardNotFound;
    case "UNKNOWN": return copy.genericError;
  }
}

function getCameraError(error: unknown): CameraError {
  const message = error instanceof Error ? error.message : String(error);
  if (/notallowed|permission|denied/i.test(message)) return "permission";
  if (/secure|https/i.test(message)) return "secure";
  if (/notreadable|device|camera|media/i.test(message)) return "unavailable";
  return "initialization";
}

export default function QrScanner({ businessId, language }: QrScannerProps) {
  const router = useRouter();
  const copy = scanUiCopy(language);
  const scannerRef = useRef<ScannerInstance | null>(null);
  const processingRef = useRef(false);
  const initializationPromiseRef = useRef<Promise<void> | null>(null);
  const clearingPromiseRef = useRef<Promise<void> | null>(null);
  const [manualValue, setManualValue] = useState("");
  const [status, setStatus] = useState<string>(copy.cameraInstruction);
  const [isError, setIsError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<CameraError | null>(null);
  const [restartAttempt, setRestartAttempt] = useState(0);

  const clearScanner = useCallback(async () => {
    if (clearingPromiseRef.current) {
      await clearingPromiseRef.current;
      return;
    }
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    const clearing = scanner.clear().catch(() => undefined);
    clearingPromiseRef.current = clearing;
    await clearing;
    if (clearingPromiseRef.current === clearing) clearingPromiseRef.current = null;
  }, []);

  const showCameraError = useCallback((error: unknown) => {
    const kind = getCameraError(error);
    setCameraError(kind);
    setIsError(true);
    setStatus(kind === "permission" ? copy.cameraPermissionDenied : kind === "secure" ? copy.secureContextWarning : kind === "unavailable" ? copy.cameraUnavailable : copy.scannerInitializationFailed);
  }, [copy]);

  const resolveScannedValue = useCallback(async (value: string) => {
    if (processingRef.current || !value.trim()) return;
    processingRef.current = true;
    setIsProcessing(true); setIsError(false); setStatus(copy.processing);
    try {
      const response = await fetch("/api/scan/resolve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value, businessId }) });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(resolveErrorMessage(getScanResolveErrorCode(result), copy));
      if (!isScanResolveSuccessResponse(result)) throw new Error(copy.genericError);
      await clearScanner();
      router.push(result.url);
    } catch (error) {
      processingRef.current = false; setIsProcessing(false); setIsError(true);
      const safeMessages = Object.values(copy);
      setStatus(error instanceof Error && safeMessages.includes(error.message) ? error.message : copy.genericError);
    }
  }, [businessId, clearScanner, copy, router]);

  useEffect(() => {
    let cancelled = false;
    async function initializeScanner() {
      if (scannerRef.current) return;
      if (initializationPromiseRef.current) {
        await initializationPromiseRef.current;
        if (!cancelled && !scannerRef.current) await initializeScanner();
        return;
      }
      const initialization = (async () => {
        await clearScanner();
        if (!window.isSecureContext) showCameraError(new Error("secure context"));
        try {
          const { Html5QrcodeScanner, Html5QrcodeSupportedFormats, Html5QrcodeScanType } = await import("html5-qrcode");
          if (cancelled) return;
          const reader = document.getElementById("loyalflow-qr-reader");
          if (!reader) return;
          reader.innerHTML = "";
          const scanner = new Html5QrcodeScanner("loyalflow-qr-reader", { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true, showTorchButtonIfSupported: true, formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA, Html5QrcodeScanType.SCAN_TYPE_FILE] }, false);
          scannerRef.current = scanner;
          scanner.render((decodedText) => { void resolveScannedValue(decodedText); }, () => {
            // This callback runs for ordinary per-frame decode misses, including NotFoundException.
            // Camera setup and render failures are handled by the surrounding try/catch instead.
          });
        } catch (error) {
          if (!cancelled) showCameraError(error);
          await clearScanner();
        }
      })();
      initializationPromiseRef.current = initialization;
      await initialization;
      if (initializationPromiseRef.current === initialization) initializationPromiseRef.current = null;
    }
    void initializeScanner();
    return () => { cancelled = true; void clearScanner(); };
  }, [clearScanner, resolveScannedValue, restartAttempt, showCameraError]);

  async function restartScanner() {
    await clearScanner();
    setCameraError(null); setIsError(false); setStatus(copy.cameraInstruction);
    setRestartAttempt((attempt) => attempt + 1);
  }
  function submitManualValue(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); void resolveScannedValue(manualValue); }

  return <div>
    <div id="loyalflow-qr-reader" className="overflow-hidden rounded-xl border border-slate-300 bg-white p-3 text-slate-950" />
    <div role={isError ? "alert" : "status"} aria-live={isError ? "assertive" : "polite"} aria-atomic="true" aria-busy={isProcessing} aria-label={copy.scannerStatus} className={`mt-4 rounded-xl px-4 py-3 text-sm ${isError ? "border border-red-200 bg-red-50 text-red-800" : "border border-blue-200 bg-blue-50 text-blue-800"}`}>{status}</div>
    {cameraError && cameraError !== "secure" && <button type="button" onClick={() => void restartScanner()} disabled={isProcessing} aria-busy={isProcessing} className="mt-3 min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed">{copy.retryCamera}</button>}
    <div className="my-7 flex items-center gap-3"><div className="h-px flex-1 bg-slate-200" /><span className="text-xs font-semibold uppercase text-slate-400">{copy.manualDivider}</span><div className="h-px flex-1 bg-slate-200" /></div>
    <form onSubmit={submitManualValue} className="space-y-3"><label htmlFor="manualQrValue" className="block text-sm font-medium text-slate-700">{copy.manualLabel}</label><input id="manualQrValue" value={manualValue} onChange={(event) => setManualValue(event.target.value)} placeholder={copy.manualPlaceholder} dir="ltr" className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-black placeholder:text-slate-500 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /><button type="submit" disabled={!manualValue.trim() || isProcessing} aria-disabled={!manualValue.trim() || isProcessing} aria-busy={isProcessing} className="min-h-11 w-full rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">{isProcessing ? copy.processing : copy.openCustomer}</button></form>
  </div>;
}
