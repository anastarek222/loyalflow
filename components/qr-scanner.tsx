"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type QrScannerProps = {
  businessId: string;
};

type ScannerInstance =
  import("html5-qrcode").Html5QrcodeScanner;

export default function QrScanner({
  businessId,
}: QrScannerProps) {
  const router = useRouter();

  const scannerRef = useRef<ScannerInstance | null>(null);
  const processingRef = useRef(false);

  const [manualValue, setManualValue] = useState("");
  const [status, setStatus] = useState(
    "وجّه الكاميرا ناحية QR الخاص بالعميل."
  );
  const [isError, setIsError] = useState(false);

  const [
    secureContextWarning,
    setSecureContextWarning,
  ] = useState("");

  const resolveScannedValue = useCallback(
    async (value: string) => {
      if (processingRef.current || !value.trim()) {
        return;
      }

      processingRef.current = true;
      setIsError(false);
      setStatus("جارٍ البحث عن العميل...");

      try {
        const response = await fetch("/api/scan/resolve", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            value,
            businessId,
          }),
        });

        const result = (await response.json()) as {
          url?: string;
          error?: string;
        };

        if (!response.ok || !result.url) {
          throw new Error(
            result.error ?? "تعذر قراءة هذا الكارت."
          );
        }

        try {
          await scannerRef.current?.clear();
        } catch {
          // Navigation can continue even if scanner cleanup fails.
        }

        router.push(result.url);
      } catch (error) {
        processingRef.current = false;
        setIsError(true);
        setStatus(
          error instanceof Error
            ? error.message
            : "تعذر قراءة هذا الكارت."
        );
      }
    },
    [businessId, router]
  );

  useEffect(() => {
    let cancelled = false;

    async function initializeScanner() {
      if (!window.isSecureContext) {
        setSecureContextWarning(
          "تشغيل الكاميرا على الهاتف يحتاج رابط HTTPS. يمكنك حاليًا اختيار صورة QR من الهاتف أو لصق رابط الكارت يدويًا."
        );
      }

      const {
        Html5QrcodeScanner,
        Html5QrcodeSupportedFormats,
        Html5QrcodeScanType,
      } = await import("html5-qrcode");

      if (cancelled) {
        return;
      }

      const reader = document.getElementById(
        "loyalflow-qr-reader"
      );

      if (!reader) {
        return;
      }

      reader.innerHTML = "";

      const scanner = new Html5QrcodeScanner(
        "loyalflow-qr-reader",
        {
          fps: 10,
          qrbox: {
            width: 250,
            height: 250,
          },
          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          supportedScanTypes: [
            Html5QrcodeScanType.SCAN_TYPE_CAMERA,
            Html5QrcodeScanType.SCAN_TYPE_FILE,
          ],
        },
        false
      );

      scannerRef.current = scanner;

      scanner.render(
        (decodedText) => {
          void resolveScannedValue(decodedText);
        },
        () => {
          // Normal scan misses are intentionally ignored.
        }
      );
    }

    void initializeScanner();

    return () => {
      cancelled = true;

      const scanner = scannerRef.current;
      scannerRef.current = null;

      if (scanner) {
        void scanner.clear().catch(() => undefined);
      }
    };
  }, [resolveScannedValue]);

  function submitManualValue(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    void resolveScannedValue(manualValue);
  }

  return (
    <div dir="rtl">
      {secureContextWarning && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          {secureContextWarning}
        </div>
      )}

      <div
        id="loyalflow-qr-reader"
        className="overflow-hidden rounded-xl border border-slate-300 bg-white p-3 text-slate-950"
      />

      <div
        role="status"
        className={`mt-4 rounded-xl px-4 py-3 text-sm ${
          isError
            ? "border border-red-200 bg-red-50 text-red-800"
            : "border border-blue-200 bg-blue-50 text-blue-800"
        }`}
      >
        {status}
      </div>

      <div className="my-7 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-semibold uppercase text-slate-400">
          أو
        </span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <form
        onSubmit={submitManualValue}
        className="space-y-3"
      >
        <label
          htmlFor="manualQrValue"
          className="block text-sm font-medium text-slate-700"
        >
          الصق رابط الكارت أو الرمز التعريفي يدويًا
        </label>

        <input
          id="manualQrValue"
          value={manualValue}
          onChange={(event) =>
            setManualValue(event.target.value)
          }
          placeholder="رابط الكارت"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-black placeholder:text-slate-500 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
        />

        <button
          type="submit"
          disabled={!manualValue.trim()}
          className="w-full rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          فتح العميل
        </button>
      </form>
    </div>
  );
}
