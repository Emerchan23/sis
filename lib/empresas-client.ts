"use client"

import { api } from "./api-client"

type Empresa = {
  id: string
  nome: string
  razaoSocial?: string
  cnpj?: string
  endereco?: string
  email?: string
  telefone?: string
  logoUrl?: string
  nomeDoSistema?: string
  createdAt?: string
}

// Empresa atual em memória
let currentEmpresa: Empresa | null = null

/**
 * Garante que existe uma empresa padrão selecionada
 */
export async function ensureDefaultEmpresa(): Promise<void> {
  try {
    // Se já existe uma empresa selecionada, não faz nada
    if (getCurrentEmpresa()) return

    // Busca a lista de empresas
    const empresas = await getEmpresas()
    
    // Se não existem empresas, não faz nada
    if (!empresas.length) return
    
    // Seleciona a primeira empresa como padrão
    setCurrentEmpresa(empresas[0])
  } catch (error) {
    console.error("Erro ao garantir empresa padrão:", error)
  }
}

/**
 * Recarrega a empresa atual do backend
 */
export async function reloadCurrentEmpresa(): Promise<void> {
  try {
    if (!currentEmpresa) return
    
    const empresas = await getEmpresas()
    const updatedEmpresa = empresas.find(e => e.id === currentEmpresa!.id)
    
    if (updatedEmpresa) {
      setCurrentEmpresa(updatedEmpresa)
    }
  } catch (error) {
    console.error("Erro ao recarregar empresa atual:", error)
  }
}

/**
 * Obtém a lista de empresas
 */
export async function getEmpresas(): Promise<Empresa[]> {
  try {
    // Usar a função completa que inclui configurações
    const { getEmpresas: getEmpresasCompletas } = await import('./empresas')
    return await getEmpresasCompletas()
  } catch (error) {
    console.error("Erro ao obter empresas:", error)
    return []
  }
}

/**
 * Obtém a empresa atual selecionada
 */
export function getCurrentEmpresa(): Empresa | null {
  return currentEmpresa
}

/**
 * Define a empresa atual selecionada
 */
export function setCurrentEmpresa(empresa: Empresa): void {
  try {
    currentEmpresa = empresa
    // Disparar evento para notificar mudanças
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("empresa-changed"))
    }
    console.log("Empresa atual definida:", empresa)
  } catch (error) {
    console.error("Erro ao definir empresa atual:", error)
  }
}

/**
 * Atualiza a empresa atual baseada no ID
 */
export async function updateCurrentEmpresaById(id: string): Promise<void> {
  try {
    const empresas = await getEmpresas()
    const empresa = empresas.find(e => e.id === id)
    if (empresa) {
      // Carregar configurações adicionais da empresa
      try {
        const config = await api.empresas.config.get(id)
        const empresaCompleta = {
          ...empresa,
          razaoSocial: config?.razaoSocial || "",
          cnpj: config?.cnpj || "",
          endereco: config?.endereco || "",
          email: config?.email || "",
          telefone: config?.telefone || "",
          logoUrl: config?.logoUrl || "",
          nomeDoSistema: config?.nomeDoSistema || "LP IND"
        }
        setCurrentEmpresa(empresaCompleta)
      } catch (configError) {
        console.error('Erro ao carregar configuração da empresa:', configError)
        setCurrentEmpresa(empresa)
      }
    }
  } catch (error) {
    console.error("Erro ao atualizar empresa atual:", error)
  }
}

// Re-exportar o evento de mudança
export const EMPRESA_CHANGED_EVENT = "empresa-changed"