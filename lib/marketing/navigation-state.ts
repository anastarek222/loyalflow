function normalizePath(path: string) {
  if (!path || path === "/") return "/";

  const normalized = path.split(/[?#]/, 1)[0].replace(/\/+$/, "");
  return normalized || "/";
}

export function isMarketingRouteActive(pathname: string, href: string) {
  const currentPath = normalizePath(pathname);
  const targetPath = normalizePath(href);

  if (targetPath === "/") return currentPath === "/";

  return (
    currentPath === targetPath || currentPath.startsWith(`${targetPath}/`)
  );
}
