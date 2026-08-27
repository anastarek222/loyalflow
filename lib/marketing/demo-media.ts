export type MarketingDemoMedia = {
  embedUrl: string | null;
};

/**
 * Owner customization authority for the public product demo.
 * Keep this null until a real, approved demo video is supplied.
 */
export const marketingDemoMedia: MarketingDemoMedia = {
  embedUrl: null,
};

function isTrustedDemoEmbed(url: URL) {
  if (url.protocol !== "https:") return false;

  if (
    (url.hostname === "www.youtube-nocookie.com" ||
      url.hostname === "www.youtube.com") &&
    url.pathname.startsWith("/embed/")
  ) {
    return true;
  }

  return (
    url.hostname === "player.vimeo.com" && url.pathname.startsWith("/video/")
  );
}

export function getMarketingDemoEmbedUrl(
  rawUrl: string | null = marketingDemoMedia.embedUrl,
) {
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    return isTrustedDemoEmbed(url) ? url.toString() : null;
  } catch {
    return null;
  }
}
