const EMAIL_ADDRESS_PATTERN = /^[^\s<>@]+@[^\s<>@]+$/;

export function resolveTaneeAuthEmailSender(configured: string | undefined) {
  const value = configured?.trim();
  if (!value) return null;

  const displayNameMatch = value.match(/<\s*([^<>]+)\s*>\s*$/);
  const address = (displayNameMatch?.[1] ?? value).trim();

  if (!EMAIL_ADDRESS_PATTERN.test(address)) {
    return null;
  }

  return `Tanee <${address}>`;
}
