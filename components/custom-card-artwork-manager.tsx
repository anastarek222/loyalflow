/* eslint-disable @next/next/no-img-element */

import { publishCustomCardArtworkAction } from "@/app/businesses/[slug]/program/custom-card-publish-action";
import { uploadCustomCardDraftCommandAction } from "@/app/businesses/[slug]/program/custom-card-upload-action";
import { ConfirmedSubmitButton } from "@/components/confirmed-submit-button";
import type { CustomCardArtworkVersion } from "@/lib/cards/custom-card-storage";

type Props = {
  slug: string;
  selectedVersion?: string;
  versions: CustomCardArtworkVersion[];
  storageConfigured: boolean;
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
            Upload the Front and Back together. Each successful upload creates one
            immutable paired draft. Both sides must use the standard ID-1 ratio
            and identical pixel dimensions. Preview the pair here, then publish
            it explicitly. The currently published customer card does not change
            until publishing is confirmed.
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
        <form action={uploadCustomArtwork} className="mt-5 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold">
              Front artwork · required
              <input
                required
                name="customCardFrontFile"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="mt-2 block w-full rounded-xl border border-border bg-white px-3 py-3 text-sm"
              />
            </label>
            <label className="text-sm font-bold">
              Back artwork · required
              <input
                required
                name="customCardBackFile"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="mt-2 block w-full rounded-xl border border-border bg-white px-3 py-3 text-sm"
              />
            </label>
          </div>
          <p className="text-xs text-foreground-muted">
            PNG, JPEG or WebP. Maximum 4 MB total across Front + Back. Both sides
            must have exactly the same pixel dimensions and the standard ID-1
            ratio (about 1.586:1). LoyalFlow never generates either side in Custom
            mode.
          </p>
          <button
            type="submit"
            className="w-fit rounded-[var(--lf-radius-input)] bg-primary px-5 py-3 font-black text-[var(--lf-primary-foreground)]"
          >
            Create Front + Back draft
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
              <ConfirmedSubmitButton
                label="Publish this Front + Back pair"
                confirmMessage="Publish this Front + Back pair to all customer cards for this business? The currently published pair will be replaced."
                className="rounded-[var(--lf-radius-input)] bg-emerald-600 px-5 py-3 font-black text-white"
              />
            </form>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-foreground-muted">
                front
              </p>
              <img
                src={`/api/businesses/${encodeURIComponent(slug)}/custom-card-artwork/${selected.id}/front`}
                alt="Custom card front draft"
                className="aspect-[1.586] w-full rounded-xl border border-border bg-slate-950 object-cover"
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-foreground-muted">
                back
              </p>
              <img
                src={`/api/businesses/${encodeURIComponent(slug)}/custom-card-artwork/${selected.id}/back`}
                alt="Custom card back draft"
                className="aspect-[1.586] w-full rounded-xl border border-border bg-slate-950 object-cover"
              />
            </div>
          </div>

          <p className="mt-4 rounded-xl border border-border bg-surface-subtle p-3 text-xs text-foreground-muted">
            Publishing is a separate confirmed action. Uploading or previewing a
            draft never changes the customer-facing card.
          </p>
        </div>
      ) : null}

      {versions.length > 0 ? (
        <details className="mt-5 rounded-xl border border-border bg-white p-4">
          <summary className="cursor-pointer font-black">
            Retained paired versions ({versions.length})
          </summary>
          <ul className="mt-3 space-y-2 text-sm">
            {versions.map((version) => (
              <li key={version.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs">{version.id}</span>
                <a
                  href={`/businesses/${encodeURIComponent(slug)}/program?cardDesign=draft&customVersion=${version.id}`}
                  className="font-bold text-primary underline"
                >
                  Preview pair
                </a>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
