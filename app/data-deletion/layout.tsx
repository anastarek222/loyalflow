import styles from "@/components/marketing/marketing-legal-refresh.module.css";
import type { ReactNode } from "react";

export default function DataDeletionLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <div className={styles.scope}>{children}</div>;
}
