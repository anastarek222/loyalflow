"use client";

import { useId, useRef, useState } from "react";

import { BusinessLogoImage } from "@/components/business-logo-image";
import {
  BUSINESS_LOGO_ACCEPT,
  BUSINESS_LOGO_MAX_BYTES,
  BUSINESS_LOGO_OUTPUT_MIME_TYPE,
  BUSINESS_LOGO_OUTPUT_QUALITY_STEPS,
  BUSINESS_LOGO_OUTPUT_SIZE_PX,
  isBusinessLogoUploadAllowed,
  type BusinessLogoFitMode,
} from "@/lib/branding/image-policy";

type Language = "AR" | "EN";

type Props = {
  language: Language;
  value: string;
  alt: string;
  fallbackText?: string;
  inputName?: string;
  onChange: (value: string) => void;
  onPreviewChange?: (value: string) => void;
  onPendingChange?: (pending: boolean) => void;
  onError?: (message: string) => void;
};

const copy = {
  EN: {
    label: "Business logo",
    optional: "optional",
    upload: "Upload logo",
    change: "Change logo",
    hint: "PNG, JPEG, or WebP — up to 500KB. Final output is a confirmed 512×512 square.",
    fit: "Fit entire logo",
    fill: "Fill square",
    fitHelp: "Fit keeps the entire logo visible. Fill crops the edges to cover the square.",
    pending: "Review the square preview, choose Fit or Fill, then confirm it before continuing.",
    confirm: "Use this logo",
    cancel: "Cancel",
    remove: "Remove logo",
    processing: "Preparing preview…",
    error: "Logo must be a valid PNG, JPEG, or WebP image up to 500KB.",
    outputError: "The square logo could not be prepared within the 500KB limit. Try a simpler or smaller image.",
  },
  AR: {
    label: "شعار النشاط",
    optional: "اختياري",
    upload: "رفع الشعار",
    change: "تغيير الشعار",
    hint: "PNG أو JPEG أو WebP — بحد أقصى 500KB. الناتج النهائي مربع 512×512 بعد التأكيد.",
    fit: "إظهار الشعار كاملًا",
    fill: "ملء المربع",
    fitHelp: "الإظهار الكامل يحافظ على كل الشعار. ملء المربع قد يقص الحواف لتغطية المساحة.",
    pending: "راجع المعاينة المربعة، اختر الإظهار الكامل أو ملء المربع، ثم أكدها قبل المتابعة.",
    confirm: "استخدام هذا الشعار",
    cancel: "إلغاء",
    remove: "إزالة الشعار",
    processing: "جارٍ تجهيز المعاينة…",
    error: "يجب أن يكون الشعار صورة PNG أو JPEG أو WebP صالحة وبحد أقصى 500KB.",
    outputError: "تعذر تجهيز الشعار المربع داخل حد 500KB. جرّب صورة أبسط أو أصغر.",
  },
} as const;

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("logo-read-failed"));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("logo-read-failed"));
        return;
      }
      resolve(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("logo-output-read-failed"));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("logo-output-read-failed"));
        return;
      }
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error("logo-decode-failed"));
    image.onload = () => resolve(image);
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, BUSINESS_LOGO_OUTPUT_MIME_TYPE, quality);
  });
}

async function renderSquareBusinessLogo(
  source: string,
  mode: BusinessLogoFitMode,
) {
  const image = await loadImage(source);
  if (!image.naturalWidth || !image.naturalHeight) {
    throw new Error("logo-dimensions-invalid");
  }

  const canvas = document.createElement("canvas");
  canvas.width = BUSINESS_LOGO_OUTPUT_SIZE_PX;
  canvas.height = BUSINESS_LOGO_OUTPUT_SIZE_PX;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("logo-canvas-unavailable");

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const scale =
    mode === "FIT"
      ? Math.min(
          BUSINESS_LOGO_OUTPUT_SIZE_PX / image.naturalWidth,
          BUSINESS_LOGO_OUTPUT_SIZE_PX / image.naturalHeight,
        )
      : Math.max(
          BUSINESS_LOGO_OUTPUT_SIZE_PX / image.naturalWidth,
          BUSINESS_LOGO_OUTPUT_SIZE_PX / image.naturalHeight,
        );
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const x = (BUSINESS_LOGO_OUTPUT_SIZE_PX - width) / 2;
  const y = (BUSINESS_LOGO_OUTPUT_SIZE_PX - height) / 2;

  context.drawImage(image, x, y, width, height);

  for (const quality of BUSINESS_LOGO_OUTPUT_QUALITY_STEPS) {
    const blob = await canvasToBlob(canvas, quality);
    if (blob && blob.size > 0 && blob.size <= BUSINESS_LOGO_MAX_BYTES) {
      return blobToDataUrl(blob);
    }
  }

  throw new Error("logo-output-too-large");
}

export function BusinessLogoCropField({
  language,
  value,
  alt,
  fallbackText = "L",
  inputName = "logoDataUrl",
  onChange,
  onPreviewChange,
  onPendingChange,
  onError,
}: Props) {
  const text = copy[language];
  const inputId = useId();
  const renderRequestRef = useRef(0);
  const [pendingSource, setPendingSource] = useState("");
  const [pendingPreview, setPendingPreview] = useState("");
  const [mode, setMode] = useState<BusinessLogoFitMode>("FIT");
  const [processing, setProcessing] = useState(false);
  const pending = Boolean(pendingSource);
  const displayLogo = pendingPreview || value;

  function clearPending(restorePreview = true) {
    renderRequestRef.current += 1;
    setPendingSource("");
    setPendingPreview("");
    setMode("FIT");
    setProcessing(false);
    onPendingChange?.(false);
    if (restorePreview) onPreviewChange?.(value);
  }

  async function prepare(source: string, nextMode: BusinessLogoFitMode) {
    const request = ++renderRequestRef.current;
    setProcessing(true);
    try {
      const preview = await renderSquareBusinessLogo(source, nextMode);
      if (request !== renderRequestRef.current) return;
      setPendingPreview(preview);
      onPreviewChange?.(preview);
      onError?.("");
    } catch (error) {
      if (request !== renderRequestRef.current) return;
      clearPending();
      onError?.(
        error instanceof Error && error.message === "logo-output-too-large"
          ? text.outputError
          : text.error,
      );
    } finally {
      if (request === renderRequestRef.current) setProcessing(false);
    }
  }

  async function chooseMode(nextMode: BusinessLogoFitMode) {
    if (!pendingSource || nextMode === mode) return;
    setMode(nextMode);
    await prepare(pendingSource, nextMode);
  }

  const fallback = fallbackText.trim().slice(0, 1).toUpperCase() || "L";

  return (
    <div
      data-testid="business-logo-upload"
      data-logo-output-size={BUSINESS_LOGO_OUTPUT_SIZE_PX}
      className="rounded-[var(--lf-radius-lg)] border border-border bg-surface p-4 sm:p-5"
    >
      <div className="flex items-start gap-4">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-[var(--lf-radius-md)] border border-border bg-surface-subtle sm:size-24">
          {displayLogo ? (
            <BusinessLogoImage src={displayLogo} alt={alt} />
          ) : (
            <span className="text-3xl font-black text-foreground-subtle">
              {fallback}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-foreground-subtle">
            {text.label}
          </p>
          <label
            htmlFor={inputId}
            className="mt-2 block text-sm font-semibold text-foreground-muted"
          >
            {value ? text.change : text.upload}{" "}
            <span className="font-normal text-foreground-subtle">
              ({text.optional})
            </span>
          </label>
          <input
            id={inputId}
            type="file"
            accept={BUSINESS_LOGO_ACCEPT}
            disabled={processing}
            onChange={async (event) => {
              const input = event.currentTarget;
              const file = input.files?.[0];
              if (!file) return;
              if (!isBusinessLogoUploadAllowed(file)) {
                clearPending();
                onError?.(text.error);
                input.value = "";
                return;
              }

              onError?.("");
              try {
                const source = await fileToDataUrl(file);
                setPendingSource(source);
                setPendingPreview("");
                setMode("FIT");
                onPendingChange?.(true);
                await prepare(source, "FIT");
              } catch {
                clearPending();
                onError?.(text.error);
              } finally {
                input.value = "";
              }
            }}
            className="mt-2 w-full min-w-0 rounded-[var(--lf-radius-md)] border border-border bg-surface px-3 py-2 text-sm text-foreground file:me-3 file:rounded-[var(--lf-radius-sm)] file:border-0 file:bg-foreground file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[var(--lf-inverse)] disabled:opacity-60"
          />
          <p className="mt-1 text-xs text-foreground-subtle">
            {processing ? text.processing : text.hint}
          </p>
        </div>
      </div>

      {pending ? (
        <div
          data-logo-crop-pending="true"
          className="mt-4 rounded-[var(--lf-radius-md)] border border-primary/20 bg-[var(--lf-primary-soft)] p-3"
        >
          <p className="text-sm font-semibold text-foreground-muted">
            {text.pending}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              aria-pressed={mode === "FIT"}
              data-logo-fit-mode="FIT"
              disabled={processing}
              onClick={() => void chooseMode("FIT")}
              className="min-h-10 rounded-[var(--lf-radius-sm)] border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground-muted disabled:opacity-60 aria-pressed:border-primary aria-pressed:text-primary"
            >
              {text.fit}
            </button>
            <button
              type="button"
              aria-pressed={mode === "FILL"}
              data-logo-fit-mode="FILL"
              disabled={processing}
              onClick={() => void chooseMode("FILL")}
              className="min-h-10 rounded-[var(--lf-radius-sm)] border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground-muted disabled:opacity-60 aria-pressed:border-primary aria-pressed:text-primary"
            >
              {text.fill}
            </button>
          </div>
          <p className="mt-2 text-xs text-foreground-subtle">{text.fitHelp}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={processing || !pendingPreview}
              onClick={() => {
                if (!pendingPreview) return;
                renderRequestRef.current += 1;
                onChange(pendingPreview);
                onPreviewChange?.(pendingPreview);
                setPendingSource("");
                setPendingPreview("");
                setMode("FIT");
                setProcessing(false);
                onPendingChange?.(false);
                onError?.("");
              }}
              className="min-h-10 rounded-[var(--lf-radius-sm)] bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {text.confirm}
            </button>
            <button
              type="button"
              disabled={processing}
              onClick={() => clearPending()}
              className="min-h-10 rounded-[var(--lf-radius-sm)] border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground-muted disabled:opacity-60"
            >
              {text.cancel}
            </button>
          </div>
        </div>
      ) : null}

      {value && !pending ? (
        <button
          type="button"
          onClick={() => {
            onChange("");
            onPreviewChange?.("");
            onError?.("");
          }}
          className="mt-3 text-sm font-semibold text-danger"
        >
          {text.remove}
        </button>
      ) : null}

      <input
        type="hidden"
        name={inputName}
        value={value.startsWith("data:image/") ? value : ""}
      />
      <input
        type="hidden"
        name="logoCropConfirmed"
        value={pending ? "false" : "true"}
      />
    </div>
  );
}
