"use client"

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001").replace(/\/$/, "")

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> || {}),
  }
  
  // Only set content-type to application/json if there's a body
  if (init?.body) {
    headers["content-type"] = "application/json"
  }
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
  
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`)
    }
    return (await res.json()) as T
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - verifique a conexão com o servidor')
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
  precoUnitario: number
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
  pagamentos: PagamentoParcial[]
}

export type Modalidade = {
  id: string
  nome: string
}

export type OrcamentoItem = {
  id: string
  produtoId: string
  produto?: Produto
  descricao: string
  marca?: string
  quantidade: number
  precoUnitario: number
  desconto?: number
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
  numero: number
  data: string
  cliente: OrcamentoCliente
  itens: OrcamentoItem[]
  observacoes?: string | null
  createdAt: string
  updatedAt: string
}

// Funções auxiliares para o dashboard
export async function getDashboardTotals(): Promise<DashboardTotals> {
  try {
    // Adicionar timestamp para evitar cache
    const timestamp = Date.now()
    console.log('🔄 Fazendo requisição para dashboard/totals com timestamp:', timestamp)
    const result = await http<DashboardTotals>(`/dashboard/totals?_t=${timestamp}`)
    console.log('✅ Dados recebidos do dashboard:', result)
    return result
  } catch (error) {
    console.error("❌ Erro ao obter totais do dashboard:", error)
    return {
      totalRecebido: 0,
      totalAReceber: 0,
      lucroTotal: 0,
      impostosTotais: 0,
      totalVendas: 0,
      pendentes: 0,
    }
  }
}

export async function getDashboardSeries(): Promise<{ name: string; vendas: number; lucros: number; impostos: number }[]> {
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

export async function getDashboardAlerts(): Promise<{ id: string; tipo: string; descricao: string; data: string; valor: number }[]> {
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
    list: () => http<Cliente[]>("/clientes"),
    get: (id: string) => http<Cliente>(`/clientes/${id}`),
    create: (data: Partial<Cliente>) =>
      http<{ id: string }>("/clientes", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Cliente>) =>
      http<{ ok: true }>(`/clientes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => http<{ ok: true }>(`/clientes/${id}`, { method: "DELETE" }),
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
    list: () => http<Produto[]>("/produtos"),
    get: (id: string) => http<Produto>(`/produtos/${id}`),
    create: (data: Partial<Produto>) =>
      http<{ id: string }>("/produtos", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Produto>) =>
      http<{ ok: true }>(`/produtos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => http<{ ok: true }>(`/produtos/${id}`, { method: "DELETE" }),
  },
  dashboard: {
    totals: () => http<DashboardTotals>("/dashboard/totals"),
    series: () => http<{ name: string; vendas: number; lucros: number; impostos: number }[]>("/dashboard/series"),
    summary: () => http<{ totalClientes: number; totalPedidos: number; pedidosPendentes: number }>("/dashboard/summary"),
    alerts: () => http<{ id: string; tipo: string; descricao: string; data: string; valor: number }[]>("/dashboard/alerts"),
  },
  empresas: {
    list: () => http<{ id: string; nome: string }[]>("/empresas"),
    create: (data: { nome: string }) =>
      http<{ id: string }>("/empresas", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: { nome: string }) =>
      http<{ ok: true }>(`/empresas/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    config: {
      get: (empresaId: string) => http<any | null>(`/empresa-config/${empresaId}`),
      set: (empresaId: string, cfg: any) =>
        http<{ ok: true }>(`/empresa-config/${empresaId}`, { method: "PUT", body: JSON.stringify(cfg) }),
    },
    prefs: {
      get: () => http<any>("/user-prefs"),
      set: (data: any) => http<{ ok: true }>("/user-prefs", { method: "PUT", body: JSON.stringify(data) }),
    },
    delete: (id: string) => http<{ ok: true }>(`/empresas/${id}`, { method: "DELETE" }),
  },
  linhas: {
    list: () => http<LinhaVenda[]>("/linhas-venda"),
    create: (data: Partial<LinhaVenda>) =>
      http<{ id: string }>("/linhas-venda", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<LinhaVenda>) =>
      http<{ ok: true }>(`/linhas-venda/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => http<{ ok: true }>(`/linhas-venda/${id}`, { method: "DELETE" }),
    updateCor: (id: string, cor: string | null) =>
      http<{ ok: true }>(`/linhas-venda/${id}/cor`, { method: "PATCH", body: JSON.stringify({ cor }) }),
  },
  modalidades: {
    list: () => http<Modalidade[]>("/modalidades"),
    get: (id: string) => http<Modalidade>(`/modalidades/${id}`),
    create: (data: Partial<Modalidade>) =>
      http<{ id: string }>("/modalidades", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Modalidade>) =>
      http<{ ok: true }>(`/modalidades/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => http<{ ok: true }>(`/modalidades/${id}`, { method: "DELETE" }),
  },
  rates: {
    capital: {
      list: () => http<Rate[]>("/rates/capital"),
      create: (data: Partial<Rate>) =>
        http<{ id: string }>("/rates/capital", { method: "POST", body: JSON.stringify(data) }),
      update: (id: string, data: Partial<Rate>) =>
        http<{ ok: true }>(`/rates/capital/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      delete: (id: string) => http<{ ok: true }>(`/rates/capital/${id}`, { method: "DELETE" }),
    },
    imposto: {
      list: () => http<Rate[]>("/rates/imposto"),
      create: (data: Partial<Rate>) =>
        http<{ id: string }>("/rates/imposto", { method: "POST", body: JSON.stringify(data) }),
      update: (id: string, data: Partial<Rate>) =>
        http<{ ok: true }>(`/rates/imposto/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      delete: (id: string) => http<{ ok: true }>(`/rates/imposto/${id}`, { method: "DELETE" }),
    },
  },
  participantes: {
    list: () => http<Participante[]>("/participantes"),
    create: (data: Partial<Participante>) =>
      http<{ id: string }>("/participantes", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Participante>) =>
      http<{ ok: true }>(`/participantes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => http<{ ok: true }>(`/participantes/${id}`, { method: "DELETE" }),
  },
  acertos: {
    list: () => http<Acerto[]>("/acertos"),
    create: (data: Partial<Acerto>) =>
      http<{ id: string }>("/acertos", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Acerto>) =>
      http<{ ok: true }>(`/acertos/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => http<{ ok: true }>(`/acertos/${id}`, { method: "DELETE" }),
  },
  despesasPendentes: {
    list: () => http<DespesaPendente[]>("/despesas-pendentes"),
    create: (data: Partial<DespesaPendente>) =>
      http<{ id: string }>("/despesas-pendentes", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<DespesaPendente>) =>
      http<{ ok: true }>(`/despesas-pendentes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => http<{ ok: true }>(`/despesas-pendentes/${id}`, { method: "DELETE" }),
  },
  orcamentos: {
    list: () => http<Orcamento[]>("/orcamentos"),
    create: (data: Partial<Orcamento>) =>
      http<{ id: string; numero: number }>("/orcamentos", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Orcamento>) =>
      http<{ ok: true }>(`/orcamentos/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => http<{ ok: true }>(`/orcamentos/${id}`, { method: "DELETE" }),
  },
  outrosNegocios: {
    list: () => http<OutroNegocio[]>("/outros-negocios"),
    create: (data: Partial<OutroNegocio>) =>
      http<{ id: string }>("/outros-negocios", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<OutroNegocio>) =>
      http<{ ok: true }>(`/outros-negocios/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => http<{ ok: true }>(`/outros-negocios/${id}`, { method: "DELETE" }),
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
