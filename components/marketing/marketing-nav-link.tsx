"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

import { isMarketingRouteActive } from "@/lib/marketing/navigation-state";
import { cn } from "@/lib/utils";

type MarketingNavLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  activeClassName?: string;
};

export function MarketingNavLink({
  href,
  className,
  activeClassName,
  ...props
}: MarketingNavLinkProps) {
  const pathname = usePathname();
  const isActive = isMarketingRouteActive(pathname, href);

  return (
    <Link
      {...props}
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(className, isActive && activeClassName)}
    />
  );
}
