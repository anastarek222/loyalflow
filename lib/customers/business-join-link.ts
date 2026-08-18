export function businessJoinPath(slug: string) {
  return `/join/${encodeURIComponent(slug)}`;
}

export function businessJoinUrl(baseUrl: string, slug: string) {
  return `${baseUrl.replace(/\/+$/, "")}${businessJoinPath(slug)}`;
}
