// Simple cache system without Redis - executes functions directly
// Cache TTL configurations (kept for compatibility but not used)
export const CACHE_TTL = {
    DASHBOARD_TOTALS: 300, // 5 minutes
    DASHBOARD_SERIES: 300, // 5 minutes
    EMPRESA_CONFIG: 1800, // 30 minutes
    USER_PREFS: 1800, // 30 minutes
    LIST_CLIENTES: 600, // 10 minutes
    LIST_PRODUTOS: 600, // 10 minutes
    LIST_PEDIDOS: 300, // 5 minutes
    LIST_RECEBIMENTOS: 300, // 5 minutes
    LIST_LINHAS_VENDA: 300, // 5 minutes
    LIST_MODALIDADES: 3600, // 1 hour
    LIST_ORCAMENTOS: 300, // 5 minutes
};
// Cache key generators (kept for compatibility but not used)
export const CACHE_KEYS = {
    dashboardTotals: (companyId) => `dashboard:totals:${companyId}`,
    dashboardSeries: (companyId) => `dashboard:series:${companyId}`,
    empresaConfig: (empresaId) => `config:empresa:${empresaId}`,
    userPrefs: (userId) => `prefs:user:${userId}`,
    listClientes: (companyId) => `list:clientes:${companyId}`,
    listProdutos: (companyId) => `list:produtos:${companyId}`,
    listPedidos: (companyId) => `list:pedidos:${companyId}`,
    listRecebimentos: (companyId) => `list:recebimentos:${companyId}`,
    listLinhasVenda: (companyId) => `list:linhas_venda:${companyId}`,
    listModalidades: (companyId) => `list:modalidades:${companyId}`,
    listOrcamentos: (companyId) => `list:orcamentos:${companyId}`,
};
// Cache invalidation tags (kept for compatibility but not used)
export const CACHE_TAGS = {
    company: (companyId) => `tag:company:${companyId}`,
    user: (userId) => `tag:user:${userId}`,
    dashboard: (companyId) => `tag:dashboard:${companyId}`,
};
// No-op cache operations (functions execute directly without caching)
export async function cacheGet(key) {
    return null; // Always return null to force function execution
}
export async function cacheSet(key, value, ttl) {
    // No-op - do nothing
}
export async function cacheDel(key) {
    // No-op - do nothing
}
export async function cacheDelPattern(pattern) {
    // No-op - do nothing
}
// High-level cache operations (no-op)
export async function invalidateCompanyCache(companyId) {
    // No-op - do nothing
}
export async function invalidateDashboardCache(companyId) {
    // No-op - do nothing
}
export async function invalidateListCache(companyId, type) {
    // No-op - do nothing
}
// Cache wrapper for functions - executes function directly without caching
export async function withCache(key, ttl, fn) {
    // Always execute function directly without caching
    return await fn();
}
// Health check - always returns disabled
export async function cacheHealthCheck() {
    return { status: 'disabled', connected: false };
}
// No-op graceful shutdown
export async function closeCache() {
    // No-op - do nothing
}
