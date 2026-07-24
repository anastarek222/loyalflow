"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { scanUiCopy } from "@/lib/scan/copy";
import {
  getScanResolveErrorCode,
  isScanResolveSuccessResponse,
  type ScanResolveErrorCode,
} from "@/lib/scan/resolve";
import type { AppLanguage } from "@/lib/i18n";

type QrScannerProps = {
  businessId: string;
  language: AppLanguage;
};

type ScannerInstance =
  import("html5-qrcode").Html5QrcodeScanner;

function resolveErrorMessage(
  code: ScanResolveErrorCode,
  copy: ReturnType<typeof scanUiCopy>
) {
  switch (code) {
    case "UNAUTHENTICATED":
      return copy.authenticationRequired;
    case "INVALID_INPUT":
    case "INVALID_CARD":
      return copy.invalidQrInput;
    case "FORBIDDEN":
      return copy.permissionDenied;
    case "RATE_LIMITED":
      return copy.rateLimited;
    case "CUSTOMER_NOT_FOUND":
      return copy.customerOrCardNotFound;
    case "UNKNOWN":
      return copy.genericError;
  }
}

export default function QrScanner({
  businessId,
  language,
}: QrScannerProps) {
  const router = useRouter();
  const copy = scanUiCopy(language);

  const scannerRef = useRef<ScannerInstance | null>(null);
  const processingRef = useRef(false);

  const [manualValue, setManualValue] = useState("");
  const [status, setStatus] = useState<string>(copy.cameraInstruction);
  const [isError, setIsError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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
      setIsProcessing(true);
      setIsError(false);
      setStatus(copy.processing);

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

        const result: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            resolveErrorMessage(
              getScanResolveErrorCode(result),
              copy
            )
          );
        }

        if (!isScanResolveSuccessResponse(result)) {
          throw new Error(copy.genericError);
        }

        try {
          await scannerRef.current?.clear();
        } catch {
          // Navigation can continue even if scanner cleanup fails.
        }

        router.push(result.url);
      } catch (error) {
        processingRef.current = false;
        setIsProcessing(false);
        setIsError(true);
        setStatus(
          error instanceof Error
            ? error.message
            : copy.genericError
        );
      }
    },
    [businessId, copy, router]
  );

  useEffect(() => {
    let cancelled = false;

    async function initializeScanner() {
      if (!window.isSecureContext) {
        setSecureContextWarning(
          copy.secureContextWarning
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
    <div>
      {secureContextWarning && (
        <div role="note" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          {secureContextWarning}
        </div>
      )}

      <div
        id="loyalflow-qr-reader"
        className="overflow-hidden rounded-xl border border-slate-300 bg-white p-3 text-slate-950"
      />

      <div
        role={isError ? "alert" : "status"}
        aria-live={isError ? "assertive" : "polite"}
        aria-atomic="true"
        aria-busy={isProcessing}
        aria-label={copy.scannerStatus}
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
          {copy.manualDivider}
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
          {copy.manualLabel}
        </label>

        <input
          id="manualQrValue"
          value={manualValue}
          onChange={(event) =>
            setManualValue(event.target.value)
          }
          placeholder={copy.manualPlaceholder}
          dir="ltr"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-black placeholder:text-slate-500 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
        />

        <button
          type="submit"
          disabled={!manualValue.trim() || isProcessing}
          aria-disabled={!manualValue.trim() || isProcessing}
          aria-busy={isProcessing}
          className="w-full rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {isProcessing ? copy.processing : copy.openCustomer}
        </button>
      </form>
    </div>
  );
}
