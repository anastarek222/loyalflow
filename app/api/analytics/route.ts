import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getBusinessAnalytics } from '@/lib/analytics/queries';

export async function GET() {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const analytics = await getBusinessAnalytics(session.user.businessId);
  return NextResponse.json(analytics);
}