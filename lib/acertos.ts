"use client"

import { getLinhas, setLinhasAcerto, linhasPendentesDeAcerto } from "@/lib/planilha"
import { api, type Participante, type Acerto, type DespesaPendente, type Despesa, type UltimoRecebimentoBanco, type Distribuicao } from "@/lib/api-client"

// Re-export types from api-client for backward compatibility
export type { Participante, Despesa, UltimoRecebimentoBanco, Distribuicao, Acerto, DespesaPendente }

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

// Participantes
export async function getParticipantes(): Promise<Participante[]> {
  try {
    return await api.participantes.list()
  } catch (error) {
    console.error('Erro ao buscar participantes:', error)
    return []
  }
}

export async function saveParticipante(p: Omit<Participante, "id" | "createdAt"> & { id?: string }): Promise<void> {
  try {
    if (p.id) {
      await api.participantes.update(p.id, p)
    } else {
      await api.participantes.create(p)
    }
    // Dispatch event for UI updates
    if (typeof window !== "undefined") {
      const ev = new CustomEvent("ERP_CHANGED_EVENT", { detail: { key: "participantes" } })
      window.dispatchEvent(ev)
    }
  } catch (error) {
    console.error('Erro ao salvar participante:', error)
    throw error
  }
}

export async function deleteParticipante(id: string): Promise<void> {
  try {
    await api.participantes.delete(id)
    // Dispatch event for UI updates
    if (typeof window !== "undefined") {
      const ev = new CustomEvent("ERP_CHANGED_EVENT", { detail: { key: "participantes" } })
      window.dispatchEvent(ev)
    }
  } catch (error) {
    console.error('Erro ao deletar participante:', error)
    throw error
  }
}

// Acertos
export async function getAcertos(): Promise<Acerto[]> {
  try {
    console.log('🔍 Chamando API de acertos...')
    const result = await api.acertos.list()
    console.log('✅ Acertos retornados da API:', result.length, result)
    return result
  } catch (error) {
    console.error('❌ Erro ao buscar acertos:', error)
    return []
  }
}

export async function saveAcerto(a: Omit<Acerto, "id" | "createdAt"> & { id?: string }): Promise<string> {
  try {
    let result
    if (a.id) {
      await api.acertos.update(a.id, a)
      result = a.id
    } else {
      const response = await api.acertos.create(a)
      result = response.id
    }
    // Dispatch event for UI updates
    if (typeof window !== "undefined") {
      const ev = new CustomEvent("ERP_CHANGED_EVENT", { detail: { key: "acertos" } })
      window.dispatchEvent(ev)
    }
    return result
  } catch (error) {
    console.error('Erro ao salvar acerto:', error)
    throw error
  }
}

export async function fecharAcerto(id: string): Promise<void> {
  try {
    await api.acertos.update(id, { status: "fechado" })
    // Dispatch event for UI updates
    if (typeof window !== "undefined") {
      const ev = new CustomEvent("ERP_CHANGED_EVENT", { detail: { key: "acertos" } })
      window.dispatchEvent(ev)
    }
  } catch (error) {
    console.error('Erro ao fechar acerto:', error)
    throw error
  }
}

export async function updateAcerto(id: string, patch: Partial<Acerto>): Promise<void> {
  try {
    await api.acertos.update(id, patch)
    // Dispatch event for UI updates
    if (typeof window !== "undefined") {
      const ev = new CustomEvent("ERP_CHANGED_EVENT", { detail: { key: "acertos" } })
      window.dispatchEvent(ev)
    }
  } catch (error) {
    console.error('Erro ao atualizar acerto:', error)
    throw error
  }
}

export async function cancelarAcerto(id: string): Promise<{ message: string; vendasRetornadas: number }> {
  try {
    const result = await api.acertos.cancel(id)
    // Dispatch event for UI updates
    if (typeof window !== "undefined") {
      const ev = new CustomEvent("ERP_CHANGED_EVENT", { detail: { key: "acertos" } })
      window.dispatchEvent(ev)
    }
    return result
  } catch (error) {
    console.error('Erro ao cancelar acerto:', error)
    throw error
  }
}

// Utilitários
export async function lucroTotalPorLinhas(ids: string[]): Promise<number> {
  const set = new Set(ids)
  const linhas = await getLinhas()
  return linhas
    .filter((l) => set.has(l.id))
    .reduce((a, l) => a + (l.lucroValor || 0), 0)
}

export async function criarAcerto({
  titulo,
  observacoes,
  linhaIds,
  distribuicoes,
  despesas = [],
  ultimoRecebimentoBanco,
}: {
  titulo?: string
  observacoes?: string
  linhaIds: string[]
  distribuicoes: Array<{ participanteId: string; percentual: number }>
  despesas?: Despesa[]
  ultimoRecebimentoBanco?: UltimoRecebimentoBanco
}): Promise<{ acertoId: string }> {
  const totalLucro = await lucroTotalPorLinhas(linhaIds)
  const totalDespesasRateio = despesas.filter((d) => d.tipo === "rateio").reduce((a, d) => a + (d.valor || 0), 0)
  const totalDespesasIndividuais = despesas
    .filter((d) => d.tipo === "individual")
    .reduce((a, d) => a + (d.valor || 0), 0)
  const totalLiquidoDistribuivel = +(totalLucro - totalDespesasRateio).toFixed(2)

  const indivPorPart = despesas
    .filter((d) => d.tipo === "individual" && d.participanteId)
    .reduce<Record<string, number>>((acc, d) => {
      acc[d.participanteId!] = (acc[d.participanteId!] || 0) + (d.valor || 0)
      return acc
    }, {})

  const dist: Distribuicao[] = distribuicoes.map((d) => {
    const valorBruto = +(totalLiquidoDistribuivel * (d.percentual / 100)).toFixed(2)
    const descontoIndividual = +(indivPorPart[d.participanteId] || 0).toFixed(2)
    const valor = +(valorBruto - descontoIndividual).toFixed(2)
    return { participanteId: d.participanteId, percentual: d.percentual, valorBruto, descontoIndividual, valor }
  })

  const acerto: Omit<Acerto, "id" | "createdAt"> = {
    data: new Date().toISOString(),
    titulo,
    observacoes,
    linhaIds,
    totalLucro: +totalLucro.toFixed(2),
    totalDespesasRateio: +totalDespesasRateio.toFixed(2),
    totalDespesasIndividuais: +totalDespesasIndividuais.toFixed(2),
    totalLiquidoDistribuivel,
    distribuicoes: dist,
    despesas,
    ultimoRecebimentoBanco,
    status: "aberto",
  }
  const acertoId = await saveAcerto(acerto)
  await setLinhasAcerto(linhaIds, acertoId)
  return { acertoId }
}

export function pendenciasDeAcerto() {
  return linhasPendentesDeAcerto()
}

// Despesas pendentes (persistentes)
export async function getDespesasPendentes(): Promise<DespesaPendente[]> {
  try {
    return await api.despesasPendentes.list()
  } catch (error) {
    console.error('Erro ao buscar despesas pendentes:', error)
    return []
  }
}

export async function saveDespesaPendente(
  desp: Omit<DespesaPendente, "id" | "createdAt" | "status"> & { id?: string },
): Promise<string> {
  try {
    let result
    if (desp.id) {
      await api.despesasPendentes.update(desp.id, desp)
      result = desp.id
    } else {
      const response = await api.despesasPendentes.create({
        ...desp,
        status: "pendente"
      })
      result = response.id
    }
    // Dispatch event for UI updates
    if (typeof window !== "undefined") {
      const ev = new CustomEvent("ERP_CHANGED_EVENT", { detail: { key: "despesas_pendentes" } })
      window.dispatchEvent(ev)
    }
    return result
  } catch (error) {
    console.error('Erro ao salvar despesa pendente:', error)
    throw error
  }
}

export async function deleteDespesaPendente(id: string): Promise<void> {
  try {
    await api.despesasPendentes.delete(id)
    // Dispatch event for UI updates
    if (typeof window !== "undefined") {
      const ev = new CustomEvent("ERP_CHANGED_EVENT", { detail: { key: "despesas_pendentes" } })
      window.dispatchEvent(ev)
    }
  } catch (error) {
    console.error('Erro ao deletar despesa pendente:', error)
    throw error
  }
}

export async function markDespesasUsadas(ids: string[], acertoId: string): Promise<void> {
  if (!ids || ids.length === 0) return
  
  try {
    // Update each despesa individually
    await Promise.all(
      ids.map(id => 
        api.despesasPendentes.update(id, {
          status: "usada",
          usedInAcertoId: acertoId
        })
      )
    )
    // Dispatch event for UI updates
    if (typeof window !== "undefined") {
      const ev = new CustomEvent("ERP_CHANGED_EVENT", { detail: { key: "despesas_pendentes" } })
      window.dispatchEvent(ev)
    }
  } catch (error) {
    console.error('Erro ao marcar despesas como usadas:', error)
    throw error
  }
}

// Último Recebimento no Banco
export type UltimoRecebimento = {
  id: string
  nome?: string
  valor?: number
  data_transacao?: string
  banco?: string
  observacoes?: string
  created_at: string
  updated_at: string
}

export async function getUltimosRecebimentos(): Promise<UltimoRecebimento[]> {
  try {
    const response = await fetch('/api/ultimo-recebimento')
    if (!response.ok) throw new Error('Erro ao buscar últimos recebimentos')
    return await response.json()
  } catch (error) {
    console.error('Erro ao buscar últimos recebimentos:', error)
    return []
  }
}

export async function saveUltimoRecebimento(
  recebimento: Omit<UltimoRecebimento, "id" | "created_at" | "updated_at"> & { id?: string }
): Promise<string> {
  try {
    if (recebimento.id) {
      // Update existing
      const response = await fetch(`/api/ultimo-recebimento/${recebimento.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: recebimento.nome,
          valor: recebimento.valor,
          data_transacao: recebimento.data_transacao,
          banco: recebimento.banco,
          observacoes: recebimento.observacoes
        })
      })
      if (!response.ok) throw new Error('Erro ao atualizar último recebimento')
      return recebimento.id
    } else {
      // Create new
      const response = await fetch('/api/ultimo-recebimento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: recebimento.nome,
          valor: recebimento.valor,
          data_transacao: recebimento.data_transacao,
          banco: recebimento.banco,
          observacoes: recebimento.observacoes
        })
      })
      if (!response.ok) throw new Error('Erro ao salvar último recebimento')
      const result = await response.json()
      return result.id
    }
  } catch (error) {
    console.error('Erro ao salvar último recebimento:', error)
    throw error
  }
}

export async function deleteUltimoRecebimento(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/ultimo-recebimento/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Erro ao deletar último recebimento')
    
    // Dispatch event for UI updates
    if (typeof window !== "undefined") {
      const ev = new CustomEvent("ERP_CHANGED_EVENT", { detail: { key: "ultimo_recebimento" } })
      window.dispatchEvent(ev)
    }
  } catch (error) {
    console.error('Erro ao deletar último recebimento:', error)
    throw error
  }
}
