import { createRequire } from "node:module";

type SharpInstance = {
  stats(): Promise<unknown>;
};

type SharpFactory = (
  input: Buffer,
  options?: {
    failOn?: "none" | "truncated" | "error" | "warning";
    sequentialRead?: boolean;
  },
) => SharpInstance;

const appRequire = createRequire(import.meta.url);
let cachedSharp: SharpFactory | null = null;

function sharpFactory() {
  if (cachedSharp) return cachedSharp;

  // Next.js already carries Sharp as an optional runtime dependency in the
  // locked application graph. Resolve from Next's package boundary so this
  // validation uses the exact decoder version installed for the runtime
  // without creating a second image-decoder dependency tree.
  const nextRequire = createRequire(appRequire.resolve("next/package.json"));
  cachedSharp = nextRequire("sharp") as SharpFactory;
  return cachedSharp;
}

export async function isCustomCardArtworkDecodable(file: File) {
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length === 0) return false;

    // stats() forces libvips to decode pixel data, unlike metadata-only probes.
    // Structural container validation remains a separate earlier guard.
    await sharpFactory()(bytes, {
      failOn: "error",
      sequentialRead: true,
    }).stats();
    return true;
  } catch {
    return false;
  }
}
