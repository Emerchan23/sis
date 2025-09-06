"use client"

// Função para detectar automaticamente a URL da API em qualquer ambiente
function getApiUrl(): string {
  // Se estiver no servidor (SSR)
  if (typeof window === 'undefined') {
    // Em Docker ou produção, use variável de ambiente se definida
    if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL !== "http://localhost:3145") {
      console.log('🔧 [SSR] Usando NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL)
      return process.env.NEXT_PUBLIC_API_URL
    }
    
    // Detectar se está rodando em Docker
    if (process.env.DOCKER_ENV === 'true' || process.env.NODE_ENV === 'production') {
      const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3145"
      console.log('🐳 [SSR] Modo Docker/Produção, URL:', url)
      return url
    }
    
    console.log('🔧 [SSR] Modo desenvolvimento, URL: http://localhost:3145')
    return "http://localhost:3145"
  }
  
  // No cliente (navegador)
  // Se NEXT_PUBLIC_API_URL estiver definida e não for localhost, use ela (para casos específicos)
  if (process.env.NEXT_PUBLIC_API_URL && 
      process.env.NEXT_PUBLIC_API_URL !== "http://localhost:3145" &&
      !process.env.NEXT_PUBLIC_API_URL.includes('localhost')) {
    console.log('🌐 [Cliente] Usando NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL)
    return process.env.NEXT_PUBLIC_API_URL
  }
  
  // Detecção automática baseada no navegador
  const protocol = window.location.protocol
  const hostname = window.location.hostname
  const port = "3145"
  
  // Se estiver acessando via localhost, use localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const url = `${protocol}//localhost:${port}`
    console.log('🏠 [Cliente] Detectado localhost, URL:', url)
    return url
  }
  
  // Para qualquer outro hostname (IP da rede, domínio, Docker, etc.)
  const url = `${protocol}//${hostname}:${port}`
  console.log('🌍 [Cliente] Detectado hostname externo, URL:', url)
  return url
}

const API_URL = getApiUrl().replace(/\/$/, "")
console.log('🚀 API_URL configurada:', API_URL)

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> || {}),
  }
  
  // Only set content-type to application/json if there's a body
  if (init?.body) {
    headers["content-type"] = "application/json"
  }
  
  const fullUrl = `${API_URL}${path}`
  console.log(`🌐 Fazendo requisição para: ${fullUrl}`)
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000) // Increased to 15 second timeout
  
  try {
    const res = await fetch(fullUrl, {
      ...init,
      credentials: "include",
      headers,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    
    console.log(`✅ Resposta recebida para ${path}: ${res.status} ${res.statusText}`)
    
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      console.error(`❌ HTTP Error ${res.status} for ${path}:`, text)
      throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`)
    }
    return (await res.json()) as T
  } catch (error) {
    clearTimeout(timeoutId)
    console.error(`❌ Erro na requisição para ${fullUrl}:`, error)
    
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('⏰ Timeout na requisição')
      throw new Error('Request timeout - verifique a conexão com o servidor')
    }
    
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.error('🔌 Erro de conectividade detectado')
      console.error('🔍 Detalhes do erro:', {
        url: fullUrl,
        apiUrl: API_URL,
        path: path,
        hostname: typeof window !== 'undefined' ? window.location.hostname : 'SSR',
        protocol: typeof window !== 'undefined' ? window.location.protocol : 'SSR'
      })
      throw new Error(`Erro de conectividade - não foi possível conectar ao servidor em ${API_URL}`)
    }
    
    throw error
  }
}



export type Pedido = {
  id: string
  clienteId: string
  cliente?: Cliente
  data: string
  status: "pendente" | "concluido" | "cancelado"
  total: number
  itens: PedidoItem[]
}

export type PedidoItem = {
  id: string
  pedidoId: string
  produtoId: string
  produto?: Produto
  quantidade: number
  valor_unitario: number
  custoUnitario: number
  taxaImposto: number
  desconto?: number
}

export type Recebimento = {
  id: string
  pedidoId: string
  pedido?: Pedido
  data: string
  valor: number
  forma: string
  observacao?: string
}

export type DashboardTotals = {
  totalRecebido: number
  totalAReceber: number
  lucroTotal: number
  lucroLiquido: number
  impostosTotais: number
  totalVendas: number
  pendentes: number
}

export type LinhaVenda = {
  id: string
  companyId?: string | null
  dataPedido: string
  numeroOF?: string | null
  numeroDispensa?: string | null
  cliente?: string | null
  produto?: string | null
  modalidade?: string | null
  valorVenda: number
  taxaCapitalPerc: number
  taxaCapitalVl: number
  taxaImpostoPerc: number
  taxaImpostoVl: number
  custoMercadoria: number
  somaCustoFinal: number
  lucroValor: number
  lucroPerc: number
  dataRecebimento?: string | null
  paymentStatus: string
  settlementStatus?: string | null
  acertoId?: string | null
  cor?: string | null
  createdAt: string
}

export type Cliente = {
  id: string
  nome: string
  documento: string
  endereco?: string | null
  telefone?: string | null
  email?: string | null
  createdAt: string
}

export type Participante = {
  id: string
  nome: string
  ativo?: boolean
  defaultPercent?: number
  createdAt: string
}

export type Despesa = {
  id: string
  descricao: string
  valor: number
  tipo: "rateio" | "individual"
  participanteId?: string
}

export type UltimoRecebimentoBanco = {
  nome?: string
  valor?: number
  data?: string
  banco?: string
}

export type Distribuicao = {
  participanteId: string
  percentual: number
  valorBruto: number
  descontoIndividual: number
  valor: number
}

export type Acerto = {
  id: string
  data: string
  titulo?: string
  observacoes?: string
  linhaIds: string[]
  linhas?: LinhaVenda[]
  totalLucro: number
  totalDespesasRateio: number
  totalDespesasIndividuais: number
  totalLiquidoDistribuivel: number
  distribuicoes: Distribuicao[]
  despesas: Despesa[]
  ultimoRecebimentoBanco?: UltimoRecebimentoBanco
  status: "aberto" | "fechado"
  createdAt: string
}

export type DespesaPendente = Despesa & {
  createdAt: string
  status: "pendente" | "usada"
  usedInAcertoId?: string
}

export type Produto = {
  id: string
  nome: string
  descricao?: string | null
  marca?: string | null
  precoVenda: number
  custo: number
  taxaImposto: number
  modalidadeVenda?: string | null
  estoque?: number | null
  linkRef?: string | null
  custoRef?: number | null
  createdAt: string
  updatedAt: string
}

export type Rate = {
  id: string
  nome: string
  percentual: number
}

export type PagamentoParcial = {
  id: string
  data: string
  valor: number
}

export type OutroNegocio = {
  id: string
  pessoa: string
  tipo: 'emprestimo' | 'venda'
  descricao: string
  valor: number
  data: string
  jurosAtivo: boolean
  jurosMesPercent?: number
  multaAtiva?: boolean
  multaPercent?: number
  pagamentos: PagamentoParcial[]
}

export type Modalidade = {
  id: string
  nome: string
}

export type OrcamentoItem = {
  id: string
  produto_id: string
  produto?: Produto
  descricao: string
  marca?: string
  quantidade: number
  valor_unitario: number
  desconto?: number
  link_ref?: string | null
  custo_ref?: number | null
}

export type OrcamentoCliente = {
  id?: string
  nome: string
  documento?: string | null
  telefone?: string | null
  email?: string | null
  endereco?: string | null
}

export type Orcamento = {
  id: string
  numero: string
  data: string
  cliente: OrcamentoCliente
  itens: OrcamentoItem[]
  observacoes?: string | null
  status?: string
  createdAt: string
  updatedAt: string
}

// Funções auxiliares para o dashboard
export async function getDashboardTotals(): Promise<DashboardTotals> {
  try {
    return await api.dashboard.totals()
  } catch (error) {
    console.error("❌ Erro ao obter totais do dashboard:", error)
    return {
      totalRecebido: 0,
      totalAReceber: 0,
      lucroTotal: 0,
      lucroLiquido: 0,
      impostosTotais: 0,
      totalVendas: 0,
      pendentes: 0,
    }
  }
}

export async function getDashboardSeries(): Promise<{ name: string; vendas: number; lucros: number; impostos: number; despesas: number; lucroLiquido: number }[]> {
  try {
    return await api.dashboard.series()
  } catch (error) {
    console.error("Erro ao obter séries do dashboard:", error)
    return []
  }
}

export async function getDashboardSummary(): Promise<{ totalClientes: number; totalPedidos: number; pedidosPendentes: number }> {
  try {
    return await api.dashboard.summary()
  } catch (error) {
    console.error("Erro ao obter resumo do dashboard:", error)
    return { totalClientes: 0, totalPedidos: 0, pedidosPendentes: 0 }
  }
}

export async function getDashboardAlerts(): Promise<{ id: string; type: string; title: string; message: string; timestamp: string }[]> {
  try {
    return await api.dashboard.alerts()
  } catch (error) {
    console.error("Erro ao obter alertas do dashboard:", error)
    return []
  }
}

export async function getClientes(): Promise<Cliente[]> {
  try {
    return await api.clientes.list()
  } catch (error) {
    console.error("Erro ao obter clientes:", error)
    return []
  }
}

export async function getPedidos(): Promise<Pedido[]> {
  try {
    return await api.pedidos.list()
  } catch (error) {
    console.error("Erro ao obter pedidos:", error)
    return []
  }
}

export async function getRecebimentos(): Promise<Recebimento[]> {
  try {
    return await api.recebimentos.list()
  } catch (error) {
    console.error("Erro ao obter recebimentos:", error)
    return []
  }
}

// Exportar a API principal
export const api = {
  clientes: {
    list: () => http<Cliente[]>("/api/clientes"),
    get: (id: string) => http<Cliente>(`/api/clientes/${id}`),
    create: (data: Partial<Cliente>) =>
      http<{ id: string }>("/api/clientes", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Cliente>) =>
      http<{ ok: true }>(`/api/clientes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => http<{ ok: true }>(`/api/clientes/${id}`, { method: "DELETE" }),
  },
  pedidos: {
    list: () => http<Pedido[]>("/pedidos"),
    get: (id: string) => http<Pedido>(`/pedidos/${id}`),
    create: (data: Partial<Pedido>) =>
      http<{ id: string }>("/pedidos", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Pedido>) =>
      http<{ ok: true }>(`/pedidos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => http<{ ok: true }>(`/pedidos/${id}`, { method: "DELETE" }),
  },
  recebimentos: {
    list: () => http<Recebimento[]>("/recebimentos"),
    get: (id: string) => http<Recebimento>(`/recebimentos/${id}`),
    create: (data: Partial<Recebimento>) =>
      http<{ id: string }>("/recebimentos", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Recebimento>) =>
      http<{ ok: true }>(`/recebimentos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => http<{ ok: true }>(`/recebimentos/${id}`, { method: "DELETE" }),
  },
  produtos: {
    list: () => http<Produto[]>("/api/produtos"),
    get: (id: string) => http<Produto>(`/api/produtos/${id}`),
    create: (data: Partial<Produto>) =>
      http<{ id: string }>("/api/produtos", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Produto>) =>
      http<{ ok: true }>(`/api/produtos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => http<{ ok: true }>(`/api/produtos/${id}`, { method: "DELETE" }),
  },
  dashboard: {
    totals: () => http<DashboardTotals>("/api/dashboard/totals"),
    series: () => http<{ name: string; vendas: number; lucros: number; impostos: number; despesas: number; lucroLiquido: number }[]>("/api/dashboard/series"),
    summary: () => http<{ totalClientes: number; totalPedidos: number; pedidosPendentes: number }>("/api/dashboard/summary"),
    alerts: () => http<{ id: string; type: string; title: string; message: string; timestamp: string }[]>("/api/dashboard/alerts"),
  },
  empresas: {
    list: () => http<{ id: string; nome: string }[]>("/api/empresas"),
    create: (data: { nome: string }) =>
      http<{ id: string }>("/api/empresas", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: { nome: string }) =>
      http<{ ok: true }>(`/api/empresas/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    config: {
      get: (empresaId: string) => http<any | null>(`/api/empresa-config/${empresaId}`),
      set: (empresaId: string, cfg: any) =>
        http<{ ok: true }>(`/api/empresa-config/${empresaId}`, { method: "PUT", body: JSON.stringify(cfg) }),
    },
    prefs: {
      get: () => http<any>("/api/user-prefs"),
      set: (data: any) => http<{ ok: true }>("/api/user-prefs", { method: "PUT", body: JSON.stringify(data) }),
    },
    delete: (id: string) => http<{ ok: true }>(`/api/empresas/${id}`, { method: "DELETE" }),
  },
  linhas: {
    list: () => http<LinhaVenda[]>("/api/linhas"),
    create: (data: Partial<LinhaVenda>) =>
      http<{ id: string }>("/api/linhas", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<LinhaVenda>) =>
      http<{ ok: true }>(`/api/linhas/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => http<{ ok: true }>(`/api/linhas/${id}`, { method: "DELETE" }),
    updateCor: (id: string, cor: string | null) =>
      http<{ ok: true }>(`/api/linhas/${id}/cor`, { method: "PATCH", body: JSON.stringify({ cor }) }),
  },
  modalidades: {
    list: () => http<Modalidade[]>("/api/modalidades"),
    get: (id: string) => http<Modalidade>(`/api/modalidades/${id}`),
    create: (data: Partial<Modalidade>) =>
      http<{ id: string }>("/api/modalidades", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Modalidade>) =>
      http<{ ok: true }>(`/api/modalidades/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => http<{ ok: true }>(`/api/modalidades/${id}`, { method: "DELETE" }),
  },
  rates: {
    capital: {
      list: () => http<Rate[]>("/api/taxas?tipo=capital"),
      create: (data: Partial<Rate>) =>
        http<{ id: string }>("/api/taxas", { method: "POST", body: JSON.stringify({...data, tipo: "capital"}) }),
      update: (id: string, data: Partial<Rate>) =>
        http<{ ok: true }>(`/api/taxas/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      delete: (id: string) => http<{ ok: true }>(`/api/taxas/${id}`, { method: "DELETE" }),
    },
    imposto: {
      list: () => http<Rate[]>("/api/taxas?tipo=imposto"),
      create: (data: Partial<Rate>) =>
        http<{ id: string }>("/api/taxas", { method: "POST", body: JSON.stringify({...data, tipo: "imposto"}) }),
      update: (id: string, data: Partial<Rate>) =>
        http<{ ok: true }>(`/api/taxas/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      delete: (id: string) => http<{ ok: true }>(`/api/taxas/${id}`, { method: "DELETE" }),
    },
  },
  participantes: {
    list: () => http<Participante[]>("/api/participantes"),
    create: (data: Partial<Participante>) =>
      http<{ id: string }>("/api/participantes", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Participante>) =>
      http<{ ok: true }>(`/api/participantes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => http<{ ok: true }>(`/api/participantes/${id}`, { method: "DELETE" }),
  },
  acertos: {
    list: () => http<Acerto[]>("/api/acertos"),
    create: (data: Partial<Acerto>) =>
      http<{ id: string }>("/api/acertos", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Acerto>) =>
      http<{ ok: true }>(`/api/acertos/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => http<{ ok: true }>(`/api/acertos/${id}`, { method: "DELETE" }),
    cancel: (id: string) => http<{ ok: true; message: string; vendasRetornadas: number }>(`/api/acertos/${id}/cancel`, { method: "POST" }),
  },
  despesasPendentes: {
    list: () => http<DespesaPendente[]>("/api/despesas-pendentes"),
    create: (data: Partial<DespesaPendente>) =>
      http<{ id: string }>("/api/despesas-pendentes", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<DespesaPendente>) =>
      http<{ ok: true }>(`/api/despesas-pendentes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => http<{ ok: true }>(`/api/despesas-pendentes/${id}`, { method: "DELETE" }),
  },
  orcamentos: {
    list: () => http<Orcamento[]>("/api/orcamentos?incluir_itens=true"),
    create: (data: Partial<Orcamento>) =>
      http<{ id: string; numero: number }>("/api/orcamentos", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Orcamento>) =>
      http<{ ok: true }>(`/api/orcamentos/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => http<{ ok: true }>(`/api/orcamentos/${id}`, { method: "DELETE" }),
  },
  outrosNegocios: {
    list: () => http<OutroNegocio[]>("/api/outros-negocios"),
    create: (data: Partial<OutroNegocio>) =>
      http<{ id: string }>("/api/outros-negocios", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<OutroNegocio>) =>
      http<{ ok: true }>(`/api/outros-negocios/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => http<{ ok: true }>(`/api/outros-negocios/${id}`, { method: "DELETE" }),
  },
  pagamentos: {
    list: (outroNegocioId?: string) => {
      const params = outroNegocioId ? `?outro_negocio_id=${outroNegocioId}` : '';
      return http<PagamentoParcial[]>(`/api/pagamentos${params}`);
    },
    create: (data: { outro_negocio_id: string; data: string; valor: number }) =>
      http<PagamentoParcial>("/api/pagamentos", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) => http<{ ok: true }>(`/api/pagamentos?id=${id}`, { method: "DELETE" }),
  },
  // Métodos genéricos para requisições HTTP
  get: <T = any>(url: string) => http<T>(url),
  post: <T = any>(url: string, data?: any) => 
    http<T>(url, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  put: <T = any>(url: string, data?: any) => 
    http<T>(url, { method: "PUT", body: data ? JSON.stringify(data) : undefined }),
  patch: <T = any>(url: string, data?: any) => 
    http<T>(url, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  delete: <T = any>(url: string) => http<T>(url, { method: "DELETE" }),
}
