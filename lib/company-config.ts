"use client"

import { ERP_CHANGED_EVENT } from "@/lib/data-store"
import { getCurrentEmpresaId } from "@/lib/empresas"

export type EmpresaConfig = {
  impostoPadrao?: number // %
  capitalPadrao?: number // %
  razaoSocial?: string
  cnpj?: string
  endereco?: string
  logoUrl?: string
  nomeDoSistema?: string
}

// Dados em memória (devem ser migrados para backend)
let empresaConfigData: Record<string, EmpresaConfig> = {}

const KEY_PREFIX = "erp:empresa:config:"

function read<T>(key: string, fallback: T): T {
  const configKey = key.replace(KEY_PREFIX, '')
  return (empresaConfigData[configKey] as any) || fallback
}

function write<T>(key: string, value: T) {
  const configKey = key.replace(KEY_PREFIX, '')
  empresaConfigData[configKey] = value as any
  
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(ERP_CHANGED_EVENT, { detail: { key } }))
    }
    console.log(`Configuração da empresa ${configKey} deve ser salva no backend:`, value)
  } catch {}
}

export function getEmpresaConfig(id: string): EmpresaConfig {
  return read<EmpresaConfig>(`${KEY_PREFIX}${id}`, { 
    impostoPadrao: undefined, 
    capitalPadrao: undefined,
    razaoSocial: "",
    cnpj: "",
    endereco: "",
    logoUrl: "",
    nomeDoSistema: "LP IND"
  })
}

export async function saveEmpresaConfig(id: string, cfg: EmpresaConfig) {
  // Salvar em memória (para compatibilidade)
  write(`${KEY_PREFIX}${id}`, cfg)
  
  // Salvar no backend via API
  try {
    const { api } = await import("./api-client")
    await api.empresas.config.set(id, cfg)
    console.log(`Configuração da empresa ${id} salva no backend:`, cfg)
  } catch (error) {
    console.error(`Erro ao salvar configuração da empresa ${id} no backend:`, error)
    throw error
  }
}

export async function getActiveEmpresaConfig(): Promise<EmpresaConfig> {
  const id = await getCurrentEmpresaId()
  if (!id) return {}
  
  // Tentar carregar do backend primeiro
  try {
    const { api } = await import("./api-client")
    const config = await api.empresas.config.get(id)
    if (config) {
      // Salvar em memória para cache
      const fullConfig = {
        impostoPadrao: config.impostoPadrao,
        capitalPadrao: config.capitalPadrao,
        razaoSocial: config.razaoSocial || "",
        cnpj: config.cnpj || "",
        endereco: config.endereco || "",
        logoUrl: config.logoUrl || "",
        nomeDoSistema: config.nomeDoSistema || "LP IND"
      }
      write(`${KEY_PREFIX}${id}`, fullConfig)
      return fullConfig
    }
  } catch (error) {
    console.error(`Erro ao carregar configuração da empresa ${id} do backend:`, error)
  }
  
  // Fallback para memória
  return getEmpresaConfig(id)
}
