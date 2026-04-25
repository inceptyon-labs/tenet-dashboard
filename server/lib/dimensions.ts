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

const LEGACY_DIMENSION_ALIASES: Record<string, string> = {
  api_contract: 'api-contract',
  build_ci: 'build-ci',
  privacy_data: 'privacy-data',
  supply_chain_license: 'supply-chain-license',
  infra_cloud: 'infra-cloud',
  database_migrations: 'database-migrations',
  release_ops: 'release-ops',
};

export function canonicalDimensionKey(key: string): string {
  return LEGACY_DIMENSION_ALIASES[key] ?? key;
}

export function normalizeDimensionWeights(weights: Record<string, number> = {}): Record<string, number> {
  const normalized: Record<string, number> = { ...DEFAULT_DIMENSION_WEIGHTS };

  for (const [key, value] of Object.entries(weights)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      normalized[canonicalDimensionKey(key)] = value;
    }
  }

  return normalized;
}

export function getDimensionWeight(key: string, overrides: Record<string, number> = {}, fallback = 1.0): number {
  const canonical = canonicalDimensionKey(key);
  return overrides[canonical] ?? overrides[key] ?? DEFAULT_DIMENSION_WEIGHTS[canonical] ?? fallback;
}
