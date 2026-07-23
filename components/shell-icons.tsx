import type { ElementType } from "react";
import { BarChart3, Building2, FolderCog, Gift, GitBranch, LayoutDashboard, Megaphone, Radio, ScanLine, Settings, ShieldCheck, Tags, UserCog, Users } from "lucide-react";

import type { ShellNavigationItem } from "@/lib/app-shell-navigation";

export const icons: Record<ShellNavigationItem["icon"], ElementType> = {
  overview: LayoutDashboard, businesses: Building2, scan: ScanLine, customers: Users,
  activity: Radio, rewards: Gift, offers: Tags, campaigns: Megaphone, recovery: ShieldCheck,
  reports: BarChart3, staffReports: BarChart3, team: UserCog, branches: GitBranch,
  settings: Settings, duplicates: Users, playbooks: FolderCog,
};
