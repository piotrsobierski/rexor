import { BikeConfigurator } from '@/components/bike-configurator';
import { fetchCatalog } from '@/lib/server-catalog';

export default async function ConfiguratorPage() {
  const catalog = await fetchCatalog();
  return <BikeConfigurator catalog={catalog ?? undefined} />;
}
