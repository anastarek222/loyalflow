import { PageContainer, PageHeaderSkeleton, StatCardSkeleton } from "@/components/page-layout";
import { Card, Skeleton } from "@/components/ui/surface";

export default function BusinessOverviewLoading() {
  return (
    <PageContainer variant="wide">
      <PageHeaderSkeleton />
      <Card aria-busy="true"><Skeleton className="h-20 w-full" /></Card>
      <div aria-busy="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <StatCardSkeleton key={index} />)}</div>
      <div aria-busy="true" className="grid gap-6 lg:grid-cols-2"><Card><Skeleton className="h-52 w-full" /></Card><Card><Skeleton className="h-52 w-full" /></Card></div>
    </PageContainer>
  );
}
