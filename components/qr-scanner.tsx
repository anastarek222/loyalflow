"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { scanUiCopy } from "@/lib/scan/copy";
import { nextCameraId, type ScanCamera } from "@/lib/scan/camera-selection";
import {
  getScanResolveErrorCode,
  isScanResolveSuccessResponse,
  type ScanResolveErrorCode,
} from "@/lib/scan/resolve";
import {
  Camera,
  ChevronDown,
  ImageUp,
  Keyboard,
  LoaderCircle,
  SwitchCamera,
} from "lucide-react";
import type { AppLanguage } from "@/lib/i18n";

type QrScannerProps = { businessId: string; language: AppLanguage };
type ScannerInstance = import("html5-qrcode").Html5Qrcode;
type ScannerModule = typeof import("html5-qrcode");
type CameraError = "unavailable" | "permission" | "secure" | "initialization";
type CameraFailureCode =
  | "CAMERA_PERMISSION_DENIED"
  | "CAMERA_NOT_FOUND"
  | "CAMERA_BUSY"
  | "CAMERA_CONSTRAINT_UNSUPPORTED"
  | "CAMERA_PLAYBACK_BLOCKED"
  | "CAMERA_START_FAILED";

function resolveErrorMessage(
  code: ScanResolveErrorCode,
  copy: ReturnType<typeof scanUiCopy>,
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

function getCameraError(error: unknown): CameraError {
  const message = error instanceof Error ? error.message : String(error);
  if (/notallowed|permission|denied/i.test(message)) return "permission";
  if (/secure|https/i.test(message)) return "secure";
  if (/notreadable|device|camera|media/i.test(message)) return "unavailable";
  return "initialization";
}

function getCameraFailureCode(error: unknown): CameraFailureCode {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);
  const detail = `${name} ${message}`;
  if (/notallowed|permission|denied|security/i.test(detail))
    return "CAMERA_PERMISSION_DENIED";
  if (/notfound|devicesnotfound|no camera/i.test(detail))
    return "CAMERA_NOT_FOUND";
  if (/notreadable|trackstarterror|busy|in use/i.test(detail))
    return "CAMERA_BUSY";
  if (/overconstrained|constraint/i.test(detail))
    return "CAMERA_CONSTRAINT_UNSUPPORTED";
  if (/abort|play|video/i.test(detail)) return "CAMERA_PLAYBACK_BLOCKED";
  return "CAMERA_START_FAILED";
}

function requiresExplicitCameraStart() {
  const appleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const touchMac =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return appleMobile || touchMac;
}

function prepareCameraPreview(video: HTMLVideoElement) {
  video.playsInline = true;
  video.autoplay = true;
  video.muted = true;
  video.defaultMuted = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.setAttribute("autoplay", "");
  video.setAttribute("muted", "");
}

function observeCameraPreview(reader: HTMLElement) {
  const prepareVideos = () => {
    reader
      .querySelectorAll<HTMLVideoElement>("video")
      .forEach(prepareCameraPreview);
  };
  prepareVideos();
  const observer = new MutationObserver(prepareVideos);
  observer.observe(reader, { childList: true, subtree: true });
  return () => observer.disconnect();
}

async function enumerateVideoCameras(): Promise<ScanCamera[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((device) => device.kind === "videoinput")
    .map(({ deviceId, label }) => ({ id: deviceId, label }));
}

export default function QrScanner({ businessId, language }: QrScannerProps) {
  const router = useRouter();
  const copy = scanUiCopy(language);
  const scannerRef = useRef<ScannerInstance | null>(null);
  const scannerModuleRef = useRef<ScannerModule | null>(null);
  const processingRef = useRef(false);
  const mountedRef = useRef(false);
  const initializationPromiseRef = useRef<Promise<void> | null>(null);
  const stoppingPromiseRef = useRef<Promise<void> | null>(null);
  const switchingRef = useRef(false);
  const selectedCameraIdRef = useRef<string | null>(null);
  const qrImageInputRef = useRef<HTMLInputElement | null>(null);
  const [manualValue, setManualValue] = useState("");
  const [status, setStatus] = useState<string>(copy.cameraInstruction);
  const [isError, setIsError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isScanningImage, setIsScanningImage] = useState(false);
  const [isScannerModuleReady, setIsScannerModuleReady] = useState(false);
  const [awaitingCameraStart, setAwaitingCameraStart] = useState(false);
  const [cameraError, setCameraError] = useState<CameraError | null>(null);
  const [cameraFailureCode, setCameraFailureCode] =
    useState<CameraFailureCode | null>(null);
  const [cameras, setCameras] = useState<ScanCamera[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);

  const updateSelectedCamera = useCallback((cameraId: string | null) => {
    selectedCameraIdRef.current = cameraId;
    if (mountedRef.current) setSelectedCameraId(cameraId);
  }, []);

  const stopScanner = useCallback(async () => {
    if (stoppingPromiseRef.current) return stoppingPromiseRef.current;
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    const stopping = (async () => {
      if (scanner.isScanning) await scanner.stop().catch(() => undefined);
      try {
        scanner.clear();
      } catch {
        /* The reader may already be detached during navigation. */
      }
    })();
    stoppingPromiseRef.current = stopping;
    await stopping;
    if (stoppingPromiseRef.current === stopping)
      stoppingPromiseRef.current = null;
  }, []);

  const showCameraError = useCallback(
    (error: unknown) => {
      const kind = getCameraError(error);
      const failureCode = getCameraFailureCode(error);
      if (!mountedRef.current) return;
      setCameraError(kind);
      setCameraFailureCode(failureCode);
      setIsError(true);
      setStatus(
        kind === "permission"
          ? copy.cameraPermissionDenied
          : kind === "secure"
            ? copy.secureContextWarning
            : kind === "unavailable"
              ? copy.cameraUnavailable
              : copy.scannerInitializationFailed,
      );
    },
    [copy],
  );

  const resolveScannedValue = useCallback(
    async (value: string) => {
      if (processingRef.current || !value.trim()) return;
      processingRef.current = true;
      if (mountedRef.current) {
        setIsProcessing(true);
        setIsError(false);
        setStatus(copy.processing);
      }
      try {
        const response = await fetch("/api/scan/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value, businessId }),
        });
        const result: unknown = await response.json().catch(() => null);
        if (!response.ok)
          throw new Error(
            resolveErrorMessage(getScanResolveErrorCode(result), copy),
          );
        if (!isScanResolveSuccessResponse(result))
          throw new Error(copy.genericError);
        await stopScanner();
        router.push(result.url);
      } catch (error) {
        processingRef.current = false;
        if (!mountedRef.current) return;
        setIsProcessing(false);
        setIsError(true);
        const safeMessages = Object.values(copy);
        setStatus(
          error instanceof Error && safeMessages.includes(error.message)
            ? error.message
            : copy.genericError,
        );
      }
    },
    [businessId, copy, router, stopScanner],
  );

  const initializeScanner = useCallback(
    async (requestedCameraId?: string, preloadedModule?: ScannerModule) => {
      if (initializationPromiseRef.current)
        return initializationPromiseRef.current;
      const initialization = (async () => {
        if (!window.isSecureContext) {
          showCameraError(new Error("secure context"));
          return;
        }
        if (mountedRef.current) {
          setIsInitializing(true);
          setAwaitingCameraStart(false);
          setCameraError(null);
          setCameraFailureCode(null);
          setIsError(false);
          setStatus(copy.startingCamera);
        }
        if (scannerRef.current || stoppingPromiseRef.current)
          await stopScanner();
        try {
          const scannerModule =
            preloadedModule ??
            scannerModuleRef.current ??
            (await import("html5-qrcode"));
          scannerModuleRef.current = scannerModule;
          const { Html5Qrcode, Html5QrcodeSupportedFormats } = scannerModule;
          const reader = document.getElementById("loyalflow-qr-reader");
          if (!reader || !mountedRef.current) return;
          const stopObservingPreview = observeCameraPreview(reader);
          const scanner = new Html5Qrcode("loyalflow-qr-reader", {
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            verbose: false,
          });
          scannerRef.current = scanner;
          const config = { fps: 10 };
          const onDecoded = (decodedText: string) => {
            void resolveScannedValue(decodedText);
          };
          const onDecodeMiss = () => {
            // Per-frame decode misses are expected and must not become camera errors.
          };
          try {
            await scanner.start(
              requestedCameraId ?? {
                facingMode: { ideal: "environment" },
              },
              config,
              onDecoded,
              onDecodeMiss,
            );
          } finally {
            stopObservingPreview();
          }

          if (!mountedRef.current || scannerRef.current !== scanner) return;

          let runningCameraId = requestedCameraId ?? null;
          try {
            runningCameraId =
              scanner.getRunningTrackSettings().deviceId || runningCameraId;
          } catch {
            /* Keep the requested camera as the selected fallback. */
          }
          const availableCameras = await enumerateVideoCameras().catch(
            () => [] as ScanCamera[],
          );
          if (!runningCameraId)
            runningCameraId = availableCameras[0]?.id ?? null;
          updateSelectedCamera(runningCameraId);
          if (mountedRef.current) setCameras(availableCameras);
          if (mountedRef.current) {
            setCameraFailureCode(null);
            setStatus(copy.cameraReady);
          }
        } catch (error) {
          await stopScanner();
          showCameraError(error);
        } finally {
          if (mountedRef.current) setIsInitializing(false);
        }
      })();
      initializationPromiseRef.current = initialization;
      await initialization;
      if (initializationPromiseRef.current === initialization)
        initializationPromiseRef.current = null;
    },
    [
      copy,
      resolveScannedValue,
      showCameraError,
      stopScanner,
      updateSelectedCamera,
    ],
  );

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    void import("html5-qrcode")
      .then((scannerModule) => {
        if (cancelled || !mountedRef.current) return;
        scannerModuleRef.current = scannerModule;
        setIsScannerModuleReady(true);
        if (requiresExplicitCameraStart()) {
          setAwaitingCameraStart(true);
          setStatus(copy.tapToStartCamera);
          return;
        }
        void initializeScanner(undefined, scannerModule);
      })
      .catch((error: unknown) => {
        if (!cancelled) showCameraError(error);
      });
    return () => {
      cancelled = true;
      mountedRef.current = false;
      void stopScanner();
    };
  }, [copy.tapToStartCamera, initializeScanner, showCameraError, stopScanner]);

  function startCamera() {
    if (isInitializing || switchingRef.current || isProcessing) return;
    const scannerModule = scannerModuleRef.current;
    if (!scannerModule) return;
    updateSelectedCamera(null);
    setAwaitingCameraStart(false);
    setCameraError(null);
    setCameraFailureCode(null);
    setIsError(false);
    setStatus(copy.startingCamera);
    void initializeScanner(undefined, scannerModule);
  }

  async function switchCamera() {
    if (isInitializing || isSwitching || isProcessing) return;
    const nextId = nextCameraId(cameras, selectedCameraIdRef.current);
    if (!nextId) {
      setStatus(copy.noOtherCamera);
      return;
    }
    switchingRef.current = true;
    setIsSwitching(true);
    setIsError(false);
    setStatus(copy.switchingCamera);
    try {
      await stopScanner();
      await initializeScanner(nextId);
    } finally {
      switchingRef.current = false;
      if (mountedRef.current) setIsSwitching(false);
    }
  }

  async function scanQrImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || cameraBusy) return;
    setIsScanningImage(true);
    setIsError(false);
    setStatus(copy.scanningQrImage);
    await stopScanner();
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } =
        await import("html5-qrcode");
      const reader = document.getElementById("loyalflow-qr-reader");
      if (!reader || !mountedRef.current) return;
      const scanner = new Html5Qrcode("loyalflow-qr-reader", {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = scanner;
      const decodedText = await scanner.scanFile(file, false);
      scanner.clear();
      if (scannerRef.current === scanner) scannerRef.current = null;
      if (mountedRef.current) setIsScanningImage(false);
      await resolveScannedValue(decodedText);
    } catch {
      await stopScanner();
      if (!mountedRef.current) return;
      setIsError(true);
      setStatus(copy.qrImageUnreadable);
    } finally {
      if (mountedRef.current) setIsScanningImage(false);
    }
  }

  function submitManualValue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void resolveScannedValue(manualValue);
  }
  const cameraBusy =
    isInitializing || isSwitching || isProcessing || isScanningImage;
  const showCameraStart =
    awaitingCameraStart || Boolean(cameraError && cameraError !== "secure");

  return (
    <div className="min-w-0">
      <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-slate-950 p-2 shadow-inner sm:p-3">
        <div
          id="loyalflow-qr-reader"
          data-selected-camera={selectedCameraId ?? undefined}
          className={`lf-qr-reader w-full max-w-full overflow-hidden rounded-xl border border-white/10 bg-white p-2 text-foreground sm:p-4 ${showCameraStart ? "min-h-40" : "min-h-56 sm:min-h-64"}`}
        />
        {showCameraStart && (
          <div className="absolute inset-2 z-10 flex items-center justify-center rounded-xl bg-slate-950/5 p-5 sm:inset-3">
            <button
              type="button"
              onClick={startCamera}
              disabled={!isScannerModuleReady || cameraBusy}
              aria-busy={isInitializing || !isScannerModuleReady}
              className="flex min-h-12 w-full max-w-64 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-hover disabled:cursor-wait disabled:bg-primary/60"
            >
              {isInitializing || !isScannerModuleReady ? (
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Camera className="size-4" aria-hidden="true" />
              )}
              {cameraError ? copy.retryCamera : copy.startCamera}
            </button>
          </div>
        )}
        <span
          className="pointer-events-none absolute start-5 top-5 size-8 rounded-ss-xl border-s-2 border-t-2 border-primary"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute end-5 top-5 size-8 rounded-se-xl border-e-2 border-t-2 border-primary"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute bottom-5 start-5 size-8 rounded-es-xl border-b-2 border-s-2 border-primary"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute bottom-5 end-5 size-8 rounded-ee-xl border-b-2 border-e-2 border-primary"
          aria-hidden="true"
        />
      </div>
      <div
        role={isError ? "alert" : "status"}
        aria-live={isError ? "assertive" : "polite"}
        aria-atomic="true"
        aria-busy={cameraBusy}
        aria-label={copy.scannerStatus}
        className={`mt-3 flex items-center gap-2.5 rounded-xl border px-3 py-3 text-sm font-medium sm:mt-4 sm:gap-3 sm:px-4 sm:py-3.5 ${isError ? "border-danger/25 bg-danger-subtle text-danger" : "border-info/20 bg-info-subtle/70 text-info"}`}
      >
        {cameraBusy ? (
          <LoaderCircle
            className="size-4 shrink-0 animate-spin"
            aria-hidden="true"
          />
        ) : (
          <Camera className="size-4 shrink-0" aria-hidden="true" />
        )}
        <span className="min-w-0">
          <span>{status}</span>
          {cameraFailureCode && (
            <span className="mt-1 block font-mono text-xs" dir="ltr">
              {copy.cameraErrorCodeLabel}: {cameraFailureCode}
            </span>
          )}
        </span>
      </div>
      {(cameras.length > 1 || (cameraError && cameraError !== "secure")) && (
        <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">
          {cameras.length > 1 && (
            <button
              type="button"
              onClick={() => void switchCamera()}
              disabled={cameraBusy}
              aria-busy={isSwitching}
              className="flex min-h-11 flex-1 basis-36 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground-muted transition hover:border-primary/25 hover:text-primary disabled:cursor-not-allowed"
            >
              <SwitchCamera className="size-4" aria-hidden="true" />
              {copy.switchCamera}
            </button>
          )}
          {cameraError && cameraError !== "secure" && (
            <>
              <input
                ref={qrImageInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => void scanQrImage(event)}
                className="sr-only"
                tabIndex={-1}
              />
              <button
                type="button"
                onClick={() => qrImageInputRef.current?.click()}
                disabled={cameraBusy}
                aria-busy={isScanningImage}
                className="flex min-h-11 flex-1 basis-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-foreground-subtle"
              >
                {isScanningImage ? (
                  <LoaderCircle
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <ImageUp className="size-4" aria-hidden="true" />
                )}
                {copy.scanQrImage}
              </button>
            </>
          )}
        </div>
      )}
      <details className="group mt-3 rounded-xl border border-border bg-surface-subtle/60 sm:mt-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2 text-sm font-semibold text-foreground-muted">
          <Keyboard className="size-4 text-primary" aria-hidden="true" />
          {copy.manualDivider}
          <ChevronDown
            className="ms-auto size-4 shrink-0 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <form
          onSubmit={submitManualValue}
          className="space-y-3 border-t border-border p-4"
        >
          <label
            htmlFor="manualQrValue"
            className="block text-sm font-medium text-foreground-muted"
          >
            {copy.manualLabel}
          </label>
          <input
            id="manualQrValue"
            value={manualValue}
            onChange={(event) => setManualValue(event.target.value)}
            placeholder={copy.manualPlaceholder}
            dir="ltr"
            className="min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 text-black placeholder:text-foreground-subtle outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20"
          />
          <button
            type="submit"
            disabled={!manualValue.trim() || isProcessing}
            aria-disabled={!manualValue.trim() || isProcessing}
            aria-busy={isProcessing}
            className="min-h-11 w-full rounded-[var(--lf-radius-input)] bg-primary px-5 font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-foreground-subtle"
          >
            {isProcessing ? copy.processing : copy.openCustomer}
          </button>
        </form>
      </details>
    </div>
  );
}
