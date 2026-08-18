/* eslint-disable @next/next/no-img-element */

import { publishCustomCardArtworkAction } from "@/app/businesses/[slug]/program/custom-card-publish-action";
import { uploadCustomCardDraftCommandAction } from "@/app/businesses/[slug]/program/custom-card-upload-action";
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
            Upload a required Front and an optional Back as one immutable draft
            version. If Back is omitted, LoyalFlow uses its protected generated
            Back with dynamic loyalty details. Preview the draft here, then
            publish explicitly. Older versions are retained and the currently
            published card is unchanged until Publish is selected.
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
            Back artwork · optional
            <input
              name="customCardBackFile"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="mt-2 block w-full rounded-xl border border-border bg-white px-3 py-3 text-sm"
            />
            <span className="mt-2 block text-xs font-normal text-foreground-muted">
              Leave empty to use the safe LoyalFlow-generated Back.
            </span>
          </label>
          <p className="text-xs text-foreground-muted sm:col-span-2">
            PNG, JPEG or WebP. Maximum 4 MB per uploaded side. Front must use the
            standard ID-1 ratio (about 1.586:1). When Back is uploaded, it must
            match the Front pixel dimensions. Files are stored privately and
            served through bounded LoyalFlow routes.
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
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-foreground-muted">
                front
              </p>
              <img
                src={`/api/businesses/${encodeURIComponent(slug)}/custom-card-artwork/${selected.id}/front`}
                alt="Custom card front draft"
                className="aspect-[1.586] w-full rounded-xl border border-border bg-slate-950 object-contain"
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-foreground-muted">
                back
              </p>
              {selected.backUrl ? (
                <img
                  src={`/api/businesses/${encodeURIComponent(slug)}/custom-card-artwork/${selected.id}/back`}
                  alt="Custom card back draft"
                  className="aspect-[1.586] w-full rounded-xl border border-border bg-slate-950 object-contain"
                />
              ) : (
                <div className="flex aspect-[1.586] w-full items-center justify-center rounded-xl border border-border bg-[radial-gradient(circle_at_80%_15%,#334155_0,transparent_36%),linear-gradient(135deg,#18181b,#020617)] p-5 text-center text-sm font-bold text-white">
                  Safe generated Back · business, loyalty and reward details stay
                  system-controlled.
                </div>
              )}
            </div>
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
