import { AdminConfigurationView } from '@/components/admin-configuration-view';

export function generateStaticParams() {
  return [{ publicId: '_' }];
}

export default function AdminConfigurationPage() {
  return <AdminConfigurationView />;
}
