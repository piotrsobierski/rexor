import { ConfigurationSummary } from '@/components/configuration-summary';

export function generateStaticParams() {
  return [{ token: '_' }];
}

export default function ConfigurationPage() {
  return <ConfigurationSummary />;
}
