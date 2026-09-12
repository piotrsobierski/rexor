import { AdminPanel } from '@/components/admin-panel';
import { ADMIN_TAB_SLUGS } from '@/lib/admin-tabs';

export function generateStaticParams() {
  return ADMIN_TAB_SLUGS.map((tab) => ({ tab }));
}

export default async function Page({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  return <AdminPanel initialTab={tab} />;
}
