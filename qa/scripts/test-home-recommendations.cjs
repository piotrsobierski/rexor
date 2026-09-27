const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const web = path.join(root, 'apps/web');
const ts = require(path.join(web, 'node_modules/typescript'));
const React = require(path.join(web, 'node_modules/react'));
const { renderToStaticMarkup } = require(path.join(web, 'node_modules/react-dom/server'));
function load(file, dependencies = {}) {
  const source = fs.readFileSync(path.join(web, file), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const context = { exports: {}, process, require(name) {
    if (name in dependencies) return dependencies[name];
    if (name === 'react/jsx-runtime') return require(path.join(web, 'node_modules/react/jsx-runtime'));
    throw new Error(`Unexpected dependency: ${name}`);
  } };
  vm.runInNewContext(compiled, context);
  return context.exports;
}
const { mergeCatalog } = load('lib/catalog-merge.ts', { '@/lib/catalog': { bikeModels: [] } });
const { defaultCopy } = load('lib/copy.ts');
const base = { category_slug: 'mtb', name: 'Test bike', media: [], base_price: null };
const apiModels = [
  { ...base, slug: 'selected', is_recommended: true, status: 'published' },
  { ...base, slug: 'ordinary', is_recommended: false, status: 'published' },
  { ...base, slug: 'draft', is_recommended: true, status: 'draft' },
  { ...base, slug: 'archived', is_recommended: true, status: 'archived' },
  { ...base, slug: 'legacy' },
];
const catalog = mergeCatalog({ models: apiModels, categories: [] });
assert.equal(catalog.models.length, apiModels.length, 'Full catalog must not be filtered');
assert.deepEqual(Array.from(catalog.models.filter(model => model.recommended).map(model => model.id)), ['selected']);
const box = ({ children }) => React.createElement('div', null, children);
const icon = () => null;
const { HomePage } = load('components/home-page.tsx', {
  'lucide-react': { ArrowRight: icon, SlidersHorizontal: icon, Wrench: icon },
  '@/components/ui/button': { Button: ({ render, children }) => render ? React.cloneElement(render, {}, children) : React.createElement('button', null, children) },
  '@/components/optimized-image': { OptimizedImage: () => null },
  '@/components/page-loading': { CardGridSkeleton: () => React.createElement('div', { 'data-testid': 'skeleton' }) },
  '@/components/reveal': { Reveal: box },
  '@/components/site-footer': { SiteFooter: icon },
  '@/components/site-header': { SiteHeader: icon },
  '@/lib/catalog': { formatPrice: String },
  '@/lib/category-descriptions': { categoryCardDescription: () => '' },
  '@/lib/category-icons': { resolveCategoryIcon: () => icon },
  '@/lib/catalog-merge': { publicMediaUrl: value => value },
  '@/lib/use-public-catalog': { usePublicCatalog: initial => ({ ...initial, loaded: initial.loaded ?? true }) },
  '@/lib/use-public-copy': { usePublicCopy: () => defaultCopy },
});
const render = data => renderToStaticMarkup(React.createElement(HomePage, { catalog: data }));
const selectedHtml = render(catalog);
assert.match(selectedHtml, /data-testid="model-card-selected"/);
for (const slug of ['ordinary', 'draft', 'archived', 'legacy']) assert.doesNotMatch(selectedHtml, new RegExp(`data-testid="model-card-${slug}"`));
assert.doesNotMatch(selectedHtml, /home-models-empty/);
for (const models of [[], catalog.models.filter(model => !model.recommended)]) {
  const html = render({ models, categories: [] });
  assert.match(html, /home-models-empty/);
  assert.match(html, /Brak polecanych modeli/);
  assert.match(html, /href="\/rowery"/);
  assert.doesNotMatch(html, /data-testid="model-card-/);
}
const loadingHtml = render({ ...catalog, loaded: false });
assert.match(loadingHtml, /data-testid="skeleton"/);
assert.doesNotMatch(loadingHtml, /home-models-empty/);
console.log('PASS: recommended published models only; empty state, catalog link, and loading state render correctly; full catalog unchanged');
