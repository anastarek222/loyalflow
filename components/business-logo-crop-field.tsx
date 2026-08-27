"use client";

import { useId, useState } from "react";

import { BusinessLogoImage } from "@/components/business-logo-image";
import {
  BUSINESS_LOGO_ALLOWED_MIME_TYPES,
  BUSINESS_LOGO_INPUT_MAX_BYTES,
  BUSINESS_LOGO_OUTPUT_MIME_TYPE,
  BUSINESS_LOGO_OUTPUT_QUALITY,
  BUSINESS_LOGO_OUTPUT_SIZE_PX,
  isBusinessLogoUploadAllowed,
} from "@/lib/branding/logo-upload-contract";

type Language = "AR" | "EN";

type Props = {
  language: Language;
  value: string;
  alt: string;
  inputName?: string;
  onChange: (value: string) => void;
  onPendingChange?: (pending: boolean) => void;
  onError?: (message: string) => void;
};

const copy = {
  EN: {
    label: "Business logo",
    optional: "optional",
    upload: "Upload logo",
    change: "Change logo",
    hint: "PNG, JPEG, or WebP — up to 500KB. The final logo is a 512×512 center crop.",
    pending: "Review the square crop, then confirm it before continuing.",
    confirm: "Use this crop",
    cancel: "Cancel crop",
    remove: "Remove logo",
    processing: "Preparing crop…",
    error: "Logo must be a valid PNG, JPEG, or WebP image smaller than 500KB.",
  },
  AR: {
    label: "شعار النشاط",
    optional: "اختياري",
    upload: "رفع الشعار",
    change: "تغيير الشعار",
    hint: "PNG أو JPEG أو WebP — بحد أقصى 500KB. الناتج النهائي قص مركزي مربع 512×512.",
    pending: "راجع القص المربع ثم أكده قبل المتابعة.",
    confirm: "استخدام هذا القص",
    cancel: "إلغاء القص",
    remove: "إزالة الشعار",
    processing: "جارٍ تجهيز القص…",
    error: "يجب أن يكون الشعار صورة PNG أو JPEG أو WebP صالحة وأقل من 500KB.",
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

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error("logo-decode-failed"));
    image.onload = () => resolve(image);
    image.src = src;
  });
}

async function normalizeBusinessLogo(file: File) {
  const source = await fileToDataUrl(file);
  const image = await loadImage(source);
  if (!image.naturalWidth || !image.naturalHeight) {
    throw new Error("logo-dimensions-invalid");
  }

  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = (image.naturalWidth - sourceSize) / 2;
  const sourceY = (image.naturalHeight - sourceSize) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = BUSINESS_LOGO_OUTPUT_SIZE_PX;
  canvas.height = BUSINESS_LOGO_OUTPUT_SIZE_PX;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("logo-canvas-unavailable");

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    BUSINESS_LOGO_OUTPUT_SIZE_PX,
    BUSINESS_LOGO_OUTPUT_SIZE_PX,
  );

  return canvas.toDataURL(
    BUSINESS_LOGO_OUTPUT_MIME_TYPE,
    BUSINESS_LOGO_OUTPUT_QUALITY,
  );
}

export function BusinessLogoCropField({
  language,
  value,
  alt,
  inputName = "logoDataUrl",
  onChange,
  onPendingChange,
  onError,
}: Props) {
  const text = copy[language];
  const inputId = useId();
  const [pendingCrop, setPendingCrop] = useState("");
  const [processing, setProcessing] = useState(false);
  const displayLogo = pendingCrop || value;

  const setPending = (next: string) => {
    setPendingCrop(next);
    onPendingChange?.(Boolean(next));
  };

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
            <span className="text-3xl font-black text-foreground-subtle">L</span>
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
            accept={BUSINESS_LOGO_ALLOWED_MIME_TYPES.join(",")}
            disabled={processing}
            onChange={async (event) => {
              const input = event.currentTarget;
              const file = input.files?.[0];
              if (!file) return;
              if (!isBusinessLogoUploadAllowed(file)) {
                setPending("");
                onError?.(text.error);
                input.value = "";
                return;
              }

              setProcessing(true);
              onError?.("");
              try {
                setPending(await normalizeBusinessLogo(file));
              } catch {
                setPending("");
                onError?.(text.error);
              } finally {
                setProcessing(false);
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

      {pendingCrop ? (
        <div
          data-logo-crop-pending="true"
          className="mt-4 rounded-[var(--lf-radius-md)] border border-primary/20 bg-[var(--lf-primary-soft)] p-3"
        >
          <p className="text-sm font-semibold text-foreground-muted">
            {text.pending}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onChange(pendingCrop);
                setPending("");
                onError?.("");
              }}
              className="min-h-10 rounded-[var(--lf-radius-sm)] bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
            >
              {text.confirm}
            </button>
            <button
              type="button"
              onClick={() => setPending("")}
              className="min-h-10 rounded-[var(--lf-radius-sm)] border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground-muted"
            >
              {text.cancel}
            </button>
          </div>
        </div>
      ) : null}

      {value && !pendingCrop ? (
        <button
          type="button"
          onClick={() => {
            onChange("");
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
        value={pendingCrop ? "false" : "true"}
      />
      <input
        type="hidden"
        name="logoOutputSize"
        value={String(BUSINESS_LOGO_OUTPUT_SIZE_PX)}
      />
      <input
        type="hidden"
        name="logoInputMaxBytes"
        value={String(BUSINESS_LOGO_INPUT_MAX_BYTES)}
      />
    </div>
  );
}
