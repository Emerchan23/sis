"use client"

import { api, type OutroNegocio, type PagamentoParcial } from "./api-client"

// Função auxiliar para gerar IDs compatível com navegadores
function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  // Fallback para navegadores que não suportam crypto.randomUUID
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export type TipoOperacao = "emprestimo" | "venda"

// Re-export types for compatibility
export type { OutroNegocio, PagamentoParcial }

export async function loadOutrosNegocios(): Promise<OutroNegocio[]> {
  try {
    return await api.outrosNegocios.list()
  } catch (error) {
    console.error("Erro ao carregar outros negócios:", error)
    return []
  }
}

export async function saveOutrosNegocios(items: OutroNegocio[]): Promise<void> {
  // Esta função não é mais necessária pois salvamos individualmente via API
  console.log("saveOutrosNegocios deprecated - use addOutroNegocio/updateOutroNegocio")
}

export async function addOutroNegocio(item: OutroNegocio): Promise<OutroNegocio[]> {
  try {
    await api.outrosNegocios.create(item)
    return await loadOutrosNegocios()
  } catch (error) {
    console.error("Erro ao adicionar outro negócio:", error)
    throw error
  }
}

export async function updateOutroNegocio(id: string, patch: Partial<OutroNegocio>): Promise<OutroNegocio[]> {
  try {
    await api.outrosNegocios.update(id, patch)
    return await loadOutrosNegocios()
  } catch (error) {
    console.error("Erro ao atualizar outro negócio:", error)
    throw error
  }
}

export async function removeOutroNegocio(id: string): Promise<OutroNegocio[]> {
  await api.outrosNegocios.delete(id)
  return await loadOutrosNegocios()
}

export async function addPagamento(id: string, pagamento: PagamentoParcial): Promise<OutroNegocio[]> {
  try {
    const items = await loadOutrosNegocios()
    const item = items.find((i) => i.id === id)
    if (item) {
      const pagamentos = [...(item.pagamentos ?? []), pagamento].sort((a, b) =>
        a.data < b.data ? -1 : a.data > b.data ? 1 : 0,
      )
      await api.outrosNegocios.update(id, { pagamentos })
    }
    return await loadOutrosNegocios()
  } catch (error) {
    console.error("Erro ao adicionar pagamento:", error)
    throw error
  }
}

export async function removePagamento(id: string, pagamentoId: string): Promise<OutroNegocio[]> {
  try {
    const items = await loadOutrosNegocios()
    const item = items.find((i) => i.id === id)
    if (item) {
      const pagamentos = (item.pagamentos ?? []).filter((p) => p.id !== pagamentoId)
      await api.outrosNegocios.update(id, { pagamentos })
    }
    return await loadOutrosNegocios()
  } catch (error) {
    console.error("Erro ao remover pagamento:", error)
    throw error
  }
}

/**
 * Meses completos entre duas datas. Se o dia final ainda não atingiu o dia inicial, desconta 1 mês.
 */
export function diffFullMonths(fromISO: string, toISO: string): number {
  const from = new Date(fromISO)
  const to = new Date(toISO)
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return 0

  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
  if (to.getDate() < from.getDate()) months -= 1
  return Math.max(0, months)
}

export interface AccrualResult {
  mesesTotais: number
  jurosAcumulados: number
  saldoComJuros: number // saldo final (principal + juros - pagamentos aplicados ao longo do tempo)
  saldoPrincipalRestante: number // principal remanescente sem juros (apenas para referência)
}

/**
 * Calcula juros compostos mensais sobre o SALDO PENDENTE, respeitando pagamentos parciais no tempo.
 * Algoritmo:
 *  - Ordena pagamentos por data.
 *  - A = principal.
 *  - Para cada período [dataAtual, dataEvento]:
 *      - aplica juros compostos sobre A por m = meses completos do período.
 *      - se o evento é pagamento: A = max(0, A - valorPagamento).
 *  - No período final até "ateISO", aplica juros compostos e encerra.
 * Retorna juros acumulados (somatório de acréscimos) e o saldo final A.
 */
export function calcularJurosCompostosComPagamentos(item: OutroNegocio, ateISO: string): AccrualResult {
  let A = item.valor // saldo que sofrerá juros
  const r = item.jurosAtivo && (item.jurosMesPercent ?? 0) > 0 ? (item.jurosMesPercent as number) / 100 : 0
  let jurosAcumulados = 0
  let mesesTotais = 0

  // pagamentos ordenados
  const pagamentos = [...(item.pagamentos ?? [])].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0))
  let cursor = item.data

  for (const pg of pagamentos) {
    if (A <= 0) break
    const m = diffFullMonths(cursor, pg.data)
    if (m > 0 && r > 0) {
      const before = A
      A = A * Math.pow(1 + r, m)
      jurosAcumulados += A - before
      mesesTotais += m
    } else if (m > 0) {
      mesesTotais += m
    }
    // aplica pagamento
    A = Math.max(0, A - (pg.valor || 0))
    cursor = pg.data
  }

  // período final até hoje (ou data informada)
  const mFinal = diffFullMonths(cursor, ateISO)
  if (mFinal > 0 && r > 0 && A > 0) {
    const before = A
    A = A * Math.pow(1 + r, mFinal)
    jurosAcumulados += A - before
    mesesTotais += mFinal
  } else if (mFinal > 0) {
    mesesTotais += mFinal
  }

  // saldo principal restante (sem juros): principal - totalPagamentos
  const totalPagamentos = (item.pagamentos ?? []).reduce((acc, p) => acc + (p.valor || 0), 0)
  const saldoPrincipalRestante = Math.max(0, (item.valor || 0) - totalPagamentos)

  return {
    mesesTotais,
    jurosAcumulados,
    saldoComJuros: Math.max(0, A),
    saldoPrincipalRestante,
  }
}

export function getUniquePessoas(items: OutroNegocio[]): string[] {
  const set = new Set<string>()
  items.forEach((i) => i.pessoa && set.add(i.pessoa))
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"))
}

export function computeTotals(items: OutroNegocio[]) {
  const totalPrincipal = items.reduce((acc, i) => acc + (i.valor || 0), 0)

  // Principal pago = soma dos pagamentos limitada ao principal de cada item
  const pagoPrincipal = items.reduce((acc, i) => {
    const somaPag = (i.pagamentos ?? []).reduce((a, p) => a + (p.valor || 0), 0)
    return acc + Math.min(i.valor || 0, somaPag)
  }, 0)

  const todayISO = new Date().toISOString().slice(0, 10)

  let jurosPendentes = 0
  let totalAbertoComJuros = 0

  items.forEach((i) => {
    const { jurosAcumulados, saldoComJuros, saldoPrincipalRestante } = calcularJurosCompostosComPagamentos(i, todayISO)
    if (saldoComJuros > 0) {
      totalAbertoComJuros += saldoComJuros
      jurosPendentes += Math.max(0, saldoComJuros - saldoPrincipalRestante)
    }
  })

  return {
    totalPrincipal,
    pagoPrincipal,
    jurosPendentes,
    totalAbertoComJuros,
  }
}
