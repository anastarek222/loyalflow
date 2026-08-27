export const PUBLIC_SOCIAL_KINDS = [
  "instagram",
  "facebook",
  "linkedin",
  "tiktok",
  "youtube",
] as const;

export type PublicSocialKind = (typeof PUBLIC_SOCIAL_KINDS)[number];

type PublicSocialEnvironment = Readonly<{
  NEXT_PUBLIC_SOCIAL_INSTAGRAM?: string;
  NEXT_PUBLIC_SOCIAL_FACEBOOK?: string;
  NEXT_PUBLIC_SOCIAL_LINKEDIN?: string;
  NEXT_PUBLIC_SOCIAL_TIKTOK?: string;
  NEXT_PUBLIC_SOCIAL_YOUTUBE?: string;
}>;

export type PublicSocialLink = Readonly<{
  kind: PublicSocialKind;
  label: string;
  href: string;
}>;

const socialPolicy = {
  instagram: {
    label: "Instagram",
    hosts: ["instagram.com", "www.instagram.com"],
  },
  facebook: {
    label: "Facebook",
    hosts: ["facebook.com", "www.facebook.com"],
  },
  linkedin: {
    label: "LinkedIn",
    hosts: ["linkedin.com", "www.linkedin.com"],
  },
  tiktok: {
    label: "TikTok",
    hosts: ["tiktok.com", "www.tiktok.com"],
  },
  youtube: {
    label: "YouTube",
    hosts: ["youtube.com", "www.youtube.com", "youtu.be"],
  },
} as const satisfies Record<
  PublicSocialKind,
  { label: string; hosts: readonly string[] }
>;

function normalizeSocialUrl(kind: PublicSocialKind, value?: string) {
  const raw = value?.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    const policy = socialPolicy[kind];
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    if (!policy.hosts.includes(url.hostname as never)) return null;
    if (url.pathname === "/" && !url.search) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function getPublicSocialLinks(
  environment?: PublicSocialEnvironment,
): PublicSocialLink[] {
  const source = environment ?? {
    NEXT_PUBLIC_SOCIAL_INSTAGRAM: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM,
    NEXT_PUBLIC_SOCIAL_FACEBOOK: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK,
    NEXT_PUBLIC_SOCIAL_LINKEDIN: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN,
    NEXT_PUBLIC_SOCIAL_TIKTOK: process.env.NEXT_PUBLIC_SOCIAL_TIKTOK,
    NEXT_PUBLIC_SOCIAL_YOUTUBE: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE,
  };

  const values: Record<PublicSocialKind, string | undefined> = {
    instagram: source.NEXT_PUBLIC_SOCIAL_INSTAGRAM,
    facebook: source.NEXT_PUBLIC_SOCIAL_FACEBOOK,
    linkedin: source.NEXT_PUBLIC_SOCIAL_LINKEDIN,
    tiktok: source.NEXT_PUBLIC_SOCIAL_TIKTOK,
    youtube: source.NEXT_PUBLIC_SOCIAL_YOUTUBE,
  };

  return PUBLIC_SOCIAL_KINDS.flatMap((kind) => {
    const href = normalizeSocialUrl(kind, values[kind]);
    return href ? [{ kind, label: socialPolicy[kind].label, href }] : [];
  });
}
