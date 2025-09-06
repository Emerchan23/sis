// Simple cache system without Redis - executes functions directly

// Cache TTL configurations (kept for compatibility but not used)
export const CACHE_TTL = {
  DASHBOARD_TOTALS: 300,    // 5 minutes
  DASHBOARD_SERIES: 300,    // 5 minutes
  EMPRESA_CONFIG: 1800,     // 30 minutes
  USER_PREFS: 1800,         // 30 minutes
  LIST_CLIENTES: 600,       // 10 minutes
  LIST_PRODUTOS: 600,       // 10 minutes
  LIST_PEDIDOS: 300,        // 5 minutes
  LIST_RECEBIMENTOS: 300,   // 5 minutes
  LIST_LINHAS_VENDA: 300,   // 5 minutes
  LIST_MODALIDADES: 3600,   // 1 hour
  LIST_ORCAMENTOS: 300,     // 5 minutes
} as const

// Cache key generators (kept for compatibility but not used)
export const CACHE_KEYS = {
  dashboardTotals: (companyId: string) => `dashboard:totals:${companyId}`,
  dashboardSeries: (companyId: string) => `dashboard:series:${companyId}`,
  empresaConfig: (empresaId: string) => `config:empresa:${empresaId}`,
  userPrefs: (userId: string) => `prefs:user:${userId}`,
  listClientes: (companyId: string) => `list:clientes:${companyId}`,
  listProdutos: (companyId: string) => `list:produtos:${companyId}`,
  listPedidos: (companyId: string) => `list:pedidos:${companyId}`,
  listRecebimentos: (companyId: string) => `list:recebimentos:${companyId}`,
  listLinhasVenda: (companyId: string) => `list:linhas_venda:${companyId}`,
  listModalidades: (companyId: string) => `list:modalidades:${companyId}`,
  listOrcamentos: (companyId: string) => `list:orcamentos:${companyId}`,
} as const

// Cache invalidation tags (kept for compatibility but not used)
export const CACHE_TAGS = {
  company: (companyId: string) => `tag:company:${companyId}`,
  user: (userId: string) => `tag:user:${userId}`,
  dashboard: (companyId: string) => `tag:dashboard:${companyId}`,
} as const

// No-op cache operations (functions execute directly without caching)
export async function cacheGet<T>(key: string): Promise<T | null> {
  return null // Always return null to force function execution
}

export async function cacheSet<T>(key: string, value: T, ttl: number): Promise<void> {
  // No-op - do nothing
}

export async function cacheDel(key: string): Promise<void> {
  // No-op - do nothing
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  // No-op - do nothing
}

// High-level cache operations (no-op)
export async function invalidateCompanyCache(companyId: string): Promise<void> {
  // No-op - do nothing
}

export async function invalidateDashboardCache(companyId: string): Promise<void> {
  // No-op - do nothing
}

export async function invalidateListCache(companyId: string, type?: string): Promise<void> {
  // No-op - do nothing
}

// Cache wrapper for functions - executes function directly without caching
export async function withCache<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T> | T
): Promise<T> {
  // Always execute function directly without caching
  return await fn()
}

// Health check - always returns disabled
export async function cacheHealthCheck(): Promise<{ status: string; connected: boolean }> {
  return { status: 'disabled', connected: false }
}

// No-op graceful shutdown
export async function closeCache(): Promise<void> {
  // No-op - do nothing
}