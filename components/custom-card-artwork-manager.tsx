/* eslint-disable @next/next/no-img-element */

import { publishCustomCardArtworkAction } from "@/app/businesses/[slug]/program/custom-card-publish-action";
import { uploadCustomCardDraftCommandAction } from "@/app/businesses/[slug]/program/custom-card-upload-action";
import type { CustomCardArtworkVersion } from "@/lib/cards/custom-card-storage";

type Props = {
  slug: string;
  selectedVersion?: string;
  versions: CustomCardArtworkVersion[];
  storageConfigured: boolean;
  uploadAction: (formData: FormData) => Promise<void>;
  publishAction: (formData: FormData) => Promise<void>;
};

export function CustomCardArtworkManager({
  slug,
  selectedVersion,
  versions,
  storageConfigured,
}: Props) {
  const selected = versions.find((version) => version.id === selectedVersion);
  const uploadCustomArtwork = uploadCustomCardDraftCommandAction.bind(null, slug);
  const publishCustomArtwork = publishCustomCardArtworkAction.bind(null, slug);

  return (
    <section className="mb-5 rounded-2xl border border-primary/20 bg-primary/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-black">Custom Card artwork · Beta</p>
          <p className="mt-1 max-w-3xl text-sm text-foreground-muted">
            Upload a front and back as one immutable draft version. Preview it
            here, then publish explicitly. Older versions are retained and the
            currently published card is unchanged until Publish is selected.
          </p>
        </div>
        <span className="rounded-full border border-primary/20 bg-white px-3 py-1 text-xs font-black text-primary">
          Super Admin only
        </span>
      </div>

      {!storageConfigured ? (
        <p className="mt-4 rounded-xl border border-warning/30 bg-warning-subtle p-3 text-sm font-bold">
          Vercel Blob is not connected to this environment. Existing artwork
          remains unchanged and uploads fail closed.
        </p>
      ) : (
        <form action={uploadCustomArtwork} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold">
            Front artwork
            <input
              required
              name="customCardFrontFile"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="mt-2 block w-full rounded-xl border border-border bg-white px-3 py-3 text-sm"
            />
          </label>
          <label className="text-sm font-bold">
            Back artwork
            <input
              required
              name="customCardBackFile"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="mt-2 block w-full rounded-xl border border-border bg-white px-3 py-3 text-sm"
            />
          </label>
          <p className="text-xs text-foreground-muted sm:col-span-2">
            PNG, JPEG or WebP. Maximum 4 MB per side. Files are stored privately
            and served through bounded LoyalFlow routes.
          </p>
          <button
            type="submit"
            className="w-fit rounded-[var(--lf-radius-input)] bg-primary px-5 py-3 font-black text-[var(--lf-primary-foreground)] sm:col-span-2"
          >
            Upload new draft version
          </button>
        </form>
      )}

      {selected ? (
        <div className="mt-6 rounded-2xl border border-border bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-black">Draft preview</p>
              <p className="mt-1 font-mono text-xs text-foreground-muted">
                {selected.id}
              </p>
            </div>
            <form action={publishCustomArtwork}>
              <input type="hidden" name="customVersion" value={selected.id} />
              <button
                type="submit"
                className="rounded-[var(--lf-radius-input)] bg-emerald-600 px-5 py-3 font-black text-white"
              >
                Publish this version
              </button>
            </form>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {(["front", "back"] as const).map((side) => (
              <div key={side}>
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-foreground-muted">
                  {side}
                </p>
                <img
                  src={`/api/businesses/${encodeURIComponent(slug)}/custom-card-artwork/${selected.id}/${side}`}
                  alt={`Custom card ${side} draft`}
                  className="aspect-[1.586] w-full rounded-xl border border-border bg-slate-950 object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {versions.length > 0 ? (
        <details className="mt-5 rounded-xl border border-border bg-white p-4">
          <summary className="cursor-pointer font-black">
            Retained versions ({versions.length})
          </summary>
          <ul className="mt-3 space-y-2 text-sm">
            {versions.map((version) => (
              <li key={version.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs">{version.id}</span>
                <a
                  href={`/businesses/${encodeURIComponent(slug)}/program?cardDesign=draft&customVersion=${version.id}`}
                  className="font-bold text-primary underline"
                >
                  Preview
                </a>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
