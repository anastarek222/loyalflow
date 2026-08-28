"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { scanUiCopy } from "@/lib/scan/copy";
import {
  hasCameraLabels,
  nextCameraId,
  preferredCamera,
  type ScanCamera,
} from "@/lib/scan/camera-selection";
import {
  getScanResolveErrorCode,
  isScanResolveSuccessResponse,
  type ScanResolveErrorCode,
} from "@/lib/scan/resolve";
import {
  Camera,
  ChevronDown,
  Keyboard,
  LoaderCircle,
  RefreshCw,
  SwitchCamera,
} from "lucide-react";
import type { AppLanguage } from "@/lib/i18n";

type QrScannerProps = { businessId: string; language: AppLanguage };
type ScannerInstance = import("html5-qrcode").Html5Qrcode;
type CameraError = "unavailable" | "permission" | "secure" | "initialization";

const CAMERA_PREVIEW_READY_TIMEOUT_MS = 4_000;
const CAMERA_PREVIEW_READY_POLL_MS = 50;

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

function isCameraPreviewPlayable(video: HTMLVideoElement) {
  return (
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    video.videoWidth > 0 &&
    video.videoHeight > 0
  );
}

function prepareCameraPreview(video: HTMLVideoElement) {
  video.playsInline = true;
  video.autoplay = true;
  video.muted = true;
  video.defaultMuted = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("autoplay", "");
  video.setAttribute("muted", "");
}

async function waitForPlayableCameraPreview(
  reader: HTMLElement,
  signal: AbortSignal,
) {
  const deadline = Date.now() + CAMERA_PREVIEW_READY_TIMEOUT_MS;
  let playbackVideo: HTMLVideoElement | null = null;

  while (!signal.aborted && Date.now() < deadline) {
    const video = reader.querySelector<HTMLVideoElement>("video");
    if (video) {
      prepareCameraPreview(video);
      if (video !== playbackVideo) {
        playbackVideo = video;
        void video.play().catch(() => undefined);
      }
      if (isCameraPreviewPlayable(video)) return true;
    }
    await new Promise<void>((resolve) =>
      window.setTimeout(resolve, CAMERA_PREVIEW_READY_POLL_MS),
    );
  }

  if (signal.aborted) return false;
  throw new Error("camera preview timeout");
}

export default function QrScanner({ businessId, language }: QrScannerProps) {
  const router = useRouter();
  const copy = scanUiCopy(language);
  const scannerRef = useRef<ScannerInstance | null>(null);
  const processingRef = useRef(false);
  const mountedRef = useRef(false);
  const initializationPromiseRef = useRef<Promise<void> | null>(null);
  const stoppingPromiseRef = useRef<Promise<void> | null>(null);
  const previewReadyAbortRef = useRef<AbortController | null>(null);
  const switchingRef = useRef(false);
  const selectedCameraIdRef = useRef<string | null>(null);
  const [manualValue, setManualValue] = useState("");
  const [status, setStatus] = useState<string>(copy.cameraInstruction);
  const [isError, setIsError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [cameraError, setCameraError] = useState<CameraError | null>(null);
  const [cameras, setCameras] = useState<ScanCamera[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [restartAttempt, setRestartAttempt] = useState(0);

  const updateSelectedCamera = useCallback((cameraId: string | null) => {
    selectedCameraIdRef.current = cameraId;
    if (mountedRef.current) setSelectedCameraId(cameraId);
  }, []);

  const stopScanner = useCallback(async () => {
    previewReadyAbortRef.current?.abort();
    previewReadyAbortRef.current = null;
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
      if (!mountedRef.current) return;
      setCameraError(kind);
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
    async (requestedCameraId?: string) => {
      if (initializationPromiseRef.current)
        return initializationPromiseRef.current;
      const initialization = (async () => {
        if (!window.isSecureContext) {
          showCameraError(new Error("secure context"));
          return;
        }
        if (mountedRef.current) {
          setIsInitializing(true);
          setCameraError(null);
          setIsError(false);
          setStatus(copy.startingCamera);
        }
        await stopScanner();
        try {
          const { Html5Qrcode, Html5QrcodeSupportedFormats } =
            await import("html5-qrcode");
          const reader = document.getElementById("loyalflow-qr-reader");
          if (!reader || !mountedRef.current) return;
          const devices = await Html5Qrcode.getCameras();
          const availableCameras = devices.map(({ id, label }) => ({
            id,
            label,
          }));
          if (!availableCameras.length) throw new Error("camera unavailable");
          if (mountedRef.current) setCameras(availableCameras);
          const preferred = requestedCameraId
            ? availableCameras.find((camera) => camera.id === requestedCameraId)
            : preferredCamera(availableCameras);
          const shouldRequestEnvironment =
            !requestedCameraId && !hasCameraLabels(availableCameras);
          const scanner = new Html5Qrcode("loyalflow-qr-reader", {
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            verbose: false,
          });
          scannerRef.current = scanner;
          const config = {
            fps: 10,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              const size = Math.max(
                180,
                Math.min(250, viewfinderWidth - 16, viewfinderHeight - 16),
              );
              return { width: size, height: size };
            },
            aspectRatio: 1,
          };
          const onDecoded = (decodedText: string) => {
            void resolveScannedValue(decodedText);
          };
          const onDecodeMiss = () => {
            // Per-frame decode misses are expected and must not become camera errors.
          };
          let startedCameraId: string | null = null;
          try {
            if (shouldRequestEnvironment) {
              await scanner.start(
                { facingMode: { ideal: "environment" } },
                config,
                onDecoded,
                onDecodeMiss,
              );
            } else {
              startedCameraId = preferred?.id ?? availableCameras[0].id;
              await scanner.start(
                startedCameraId,
                config,
                onDecoded,
                onDecodeMiss,
              );
            }
          } catch (preferredError) {
            const fallback =
              availableCameras.find((camera) => camera.id !== preferred?.id) ??
              availableCameras[0];
            if (
              !fallback ||
              (fallback.id === preferred?.id && !shouldRequestEnvironment)
            )
              throw preferredError;
            await scanner.start(fallback.id, config, onDecoded, onDecodeMiss);
            startedCameraId = fallback.id;
          }

          const previewReadyAbort = new AbortController();
          previewReadyAbortRef.current = previewReadyAbort;
          let previewReady = false;
          try {
            previewReady = await waitForPlayableCameraPreview(
              reader,
              previewReadyAbort.signal,
            );
          } finally {
            if (previewReadyAbortRef.current === previewReadyAbort)
              previewReadyAbortRef.current = null;
          }
          if (
            !previewReady ||
            !mountedRef.current ||
            scannerRef.current !== scanner
          )
            return;

          let runningCameraId =
            startedCameraId ?? preferred?.id ?? availableCameras[0]?.id ?? null;
          try {
            runningCameraId =
              scanner.getRunningTrackSettings().deviceId || runningCameraId;
          } catch {
            /* Keep the requested camera as the selected fallback. */
          }
          updateSelectedCamera(runningCameraId);
          const refreshedDevices = await Html5Qrcode.getCameras();
          if (mountedRef.current)
            setCameras(
              refreshedDevices.map(({ id, label }) => ({ id, label })),
            );
          if (mountedRef.current) setStatus(copy.cameraReady);
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
    void initializeScanner();
    return () => {
      mountedRef.current = false;
      void stopScanner();
    };
  }, [initializeScanner, restartAttempt, stopScanner]);

  async function restartScanner() {
    if (isInitializing || switchingRef.current || isProcessing) return;
    await stopScanner();
    updateSelectedCamera(null);
    setCameraError(null);
    setIsError(false);
    setStatus(copy.startingCamera);
    setRestartAttempt((attempt) => attempt + 1);
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

  function submitManualValue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void resolveScannedValue(manualValue);
  }
  const cameraBusy = isInitializing || isSwitching || isProcessing;

  return (
    <div className="min-w-0">
      <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-slate-950 p-2 shadow-inner sm:p-3">
        <div
          id="loyalflow-qr-reader"
          data-selected-camera={selectedCameraId ?? undefined}
          className="lf-qr-reader min-h-56 w-full max-w-full overflow-hidden rounded-xl border border-white/10 bg-white p-2 text-foreground sm:min-h-64 sm:p-4"
        />
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
        <span>{status}</span>
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
            <button
              type="button"
              onClick={() => void restartScanner()}
              disabled={cameraBusy}
              aria-busy={cameraBusy}
              className="flex min-h-11 flex-1 basis-36 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground-muted transition hover:border-primary/25 hover:text-primary disabled:cursor-not-allowed"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              {copy.retryCamera}
            </button>
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
