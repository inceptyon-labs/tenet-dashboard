export const DEFAULT_DIMENSION_WEIGHTS: Record<string, number> = {
  security: 1.5,
  secrets: 1.5,
  'privacy-data': 1.3,
  dependencies: 1.3,
  errors: 1.3,
  'supply-chain-license': 1.2,
  'infra-cloud': 1.2,
  solid: 1.1,
  complexity: 1.1,
  debt: 1.1,
  testing: 1.1,
  'database-migrations': 1.1,
  performance: 1.0,
  'api-contract': 1.0,
  observability: 1.0,
  'build-ci': 1.0,
  'release-ops': 1.0,
  docs: 0.8,
  accessibility: 0.8,
};

export const DIMENSION_LABELS: Record<string, string> = {
  security: 'Security',
  secrets: 'Secrets',
  'privacy-data': 'Privacy & Data',
  dependencies: 'Dependencies',
  errors: 'Errors',
  'supply-chain-license': 'Supply Chain & License',
  'infra-cloud': 'Infra & Cloud',
  solid: 'SOLID',
  complexity: 'Complexity',
  debt: 'Debt',
  testing: 'Testing',
  'database-migrations': 'Database Migrations',
  performance: 'Performance',
  'api-contract': 'API Contract',
  observability: 'Observability',
  'build-ci': 'Build & CI',
  'release-ops': 'Release Ops',
  docs: 'Docs',
  accessibility: 'Accessibility',
};

export const DIMENSION_COLORS: Record<string, string> = {
  security: '#E24B4A',
  secrets: '#F09595',
  'privacy-data': '#FB7185',
  dependencies: '#EF9F27',
  errors: '#FAC775',
  'supply-chain-license': '#FBBF24',
  'infra-cloud': '#38BDF8',
  solid: '#A78BFA',
  complexity: '#C084FC',
  debt: '#F472B6',
  testing: '#34D399',
  'database-migrations': '#2DD4BF',
  performance: '#97C459',
  'api-contract': '#60A5FA',
  observability: '#378ADD',
  'build-ci': '#818CF8',
  'release-ops': '#4ADE80',
  docs: '#E879F9',
  accessibility: '#85B7EB',
};

export function canonicalDimensionKey(key: string): string {
  const aliases: Record<string, string> = {
    api_contract: 'api-contract',
    build_ci: 'build-ci',
    privacy_data: 'privacy-data',
    supply_chain_license: 'supply-chain-license',
    infra_cloud: 'infra-cloud',
    database_migrations: 'database-migrations',
    release_ops: 'release-ops',
  };
  return aliases[key] ?? key;
}

export function dimensionLabel(key: string): string {
  return DIMENSION_LABELS[canonicalDimensionKey(key)] ?? key;
}

export function dimensionColor(key: string): string {
  return DIMENSION_COLORS[canonicalDimensionKey(key)] ?? hashColor(key);
}

export function mergeDimensionWeights(weights?: Record<string, number>): Record<string, number> {
  const merged = { ...DEFAULT_DIMENSION_WEIGHTS };
  for (const [key, value] of Object.entries(weights ?? {})) {
    if (Number.isFinite(value)) merged[canonicalDimensionKey(key)] = value;
  }
  return merged;
}

function hashColor(value: string): string {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (Math.imul(31, h) + value.charCodeAt(i)) | 0;
  }
  return '#' + ((Math.abs(h) % 0xffffff).toString(16).padStart(6, '0'));
}
