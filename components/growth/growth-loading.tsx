import { Card, Skeleton } from "@/components/ui/surface";
import { PageContainer } from "@/components/page-layout";

export function GrowthLoading() {
  return <PageContainer variant="wide"><Skeleton className="h-11 w-40" /><Skeleton className="h-24 w-full" /><Card className="p-5"><Skeleton className="h-11 w-full" /><Skeleton className="mt-4 h-32 w-full" /></Card></PageContainer>;
}
