import type { ComponentProps, ReactNode } from "react";

import { SearchField, Toolbar, ToolbarActions } from "@/components/ui/toolbar";
import { cn } from "@/components/ui/utils";

export type PageToolbarProps = {
  search?: ComponentProps<typeof SearchField>;
  filters?: ReactNode;
  filterChips?: ReactNode;
  sort?: ReactNode;
  exportAction?: ReactNode;
  bulkActions?: ReactNode;
  primaryAction?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/** Presentation-only toolbar. Routes retain ownership of query state and mutations. */
export function PageToolbar({
  search,
  filters,
  filterChips,
  sort,
  exportAction,
  bulkActions,
  primaryAction,
  children,
  className,
}: PageToolbarProps) {
  const hasActions = filters || sort || exportAction || bulkActions || primaryAction || children;

  return (
    <div className="space-y-2">
      <Toolbar className={cn(className)}>
        {search ? <SearchField {...search} /> : <div />}
        {hasActions ? (
          <ToolbarActions className="w-full sm:w-auto sm:justify-end">
            {filters}
            {sort}
            {exportAction}
            {bulkActions}
            {children}
            {primaryAction}
          </ToolbarActions>
        ) : null}
      </Toolbar>
      {filterChips ? <div aria-label="Active filters" className="flex flex-wrap items-center gap-2">{filterChips}</div> : null}
    </div>
  );
}
