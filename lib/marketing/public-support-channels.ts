import { OWNER_PUBLIC_IDENTITY } from "@/lib/marketing/owner-public-identity";

type PublicSupportEnvironment = Readonly<{
  NEXT_PUBLIC_SUPPORT_EMAIL?: string;
  NEXT_PUBLIC_SUPPORT_WHATSAPP?: string;
  NEXT_PUBLIC_SUPPORT_PHONE?: string;
}>;

export type PublicSupportChannel = Readonly<{
  kind: "email" | "whatsapp" | "phone";
  displayValue: string;
  href: string;
}>;

function normalizeEmail(value?: string) {
  const email = value?.trim().toLowerCase();
  if (!email || email.length > 254) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function normalizeInternationalPhone(value?: string) {
  const raw = value?.trim();
  if (!raw || !/^\+?[0-9 ()-]+$/.test(raw)) return null;

  const digits = raw.replace(/\D/g, "");
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;

  return { displayValue: `+${digits}`, digits } as const;
}

function resolveApprovedDisplayValue(
  kind: "whatsapp" | "phone",
  digits: string,
  fallback: string,
) {
  const approvedValue =
    kind === "whatsapp"
      ? OWNER_PUBLIC_IDENTITY.support.whatsapp
      : OWNER_PUBLIC_IDENTITY.support.phone;
  const approvedDigits = approvedValue.replace(/\D/g, "");

  if (digits !== approvedDigits) return fallback;

  return kind === "whatsapp"
    ? OWNER_PUBLIC_IDENTITY.support.whatsappDisplay
    : OWNER_PUBLIC_IDENTITY.support.phoneDisplay;
}

export function getPublicSupportChannels(
  environment?: PublicSupportEnvironment,
): PublicSupportChannel[] {
  const source = environment ?? {
    NEXT_PUBLIC_SUPPORT_EMAIL:
      process.env.NEXT_PUBLIC_SUPPORT_EMAIL ??
      OWNER_PUBLIC_IDENTITY.support.email,
    NEXT_PUBLIC_SUPPORT_WHATSAPP:
      process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ??
      OWNER_PUBLIC_IDENTITY.support.whatsapp,
    NEXT_PUBLIC_SUPPORT_PHONE:
      process.env.NEXT_PUBLIC_SUPPORT_PHONE ??
      OWNER_PUBLIC_IDENTITY.support.phone,
  };
  const channels: PublicSupportChannel[] = [];
  const email = normalizeEmail(source.NEXT_PUBLIC_SUPPORT_EMAIL);
  const whatsapp = normalizeInternationalPhone(
    source.NEXT_PUBLIC_SUPPORT_WHATSAPP,
  );
  const phone = normalizeInternationalPhone(source.NEXT_PUBLIC_SUPPORT_PHONE);

  if (whatsapp) {
    channels.push({
      kind: "whatsapp",
      displayValue: resolveApprovedDisplayValue(
        "whatsapp",
        whatsapp.digits,
        whatsapp.displayValue,
      ),
      href: `https://wa.me/${whatsapp.digits}`,
    });
  }
  if (phone) {
    channels.push({
      kind: "phone",
      displayValue: resolveApprovedDisplayValue(
        "phone",
        phone.digits,
        phone.displayValue,
      ),
      href: `tel:+${phone.digits}`,
    });
  }
  if (email) {
    channels.push({
      kind: "email",
      displayValue: email,
      href: `mailto:${email}`,
    });
  }

  return channels;
}