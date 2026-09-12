export function duplicateMembershipRecoveryPath(slug: string) {
  return `/join/${encodeURIComponent(slug)}/existing`;
}
