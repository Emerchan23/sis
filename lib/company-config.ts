"use client"

import { ERP_CHANGED_EVENT } from "@/lib/data-store"
import { getCurrentEmpresaId } from "@/lib/empresas"

export type OrcamentoLayoutConfig = {
  cores?: {
    primaria?: string // Cor do cabeçalho e elementos principais
    secundaria?: string // Cor de destaque
    texto?: string // Cor do texto principal
    textoSecundario?: string // Cor do texto secundário
    fundo?: string // Cor de fundo
    borda?: string // Cor das bordas
    headerTabela?: string // Cor do cabeçalho da tabela
    linhasAlternadas?: string // Cor das linhas alternadas
  }
  
  tipografia?: {
    fonteFamilia?: string // Fonte principal
    fontePrincipal?: string // Fonte principal (alias)
    tamanhoFonte?: number // Tamanho da fonte
    tamanhoFonteTexto?: number // Tamanho da fonte do texto
    tamanhoFonteTitulo?: number // Tamanho da fonte do título
    negrito?: boolean // Texto em negrito
    italico?: boolean // Texto em itálico
  }
  
  layout?: {
    bordaRadius?: number // Raio das bordas arredondadas
    espacamento?: number // Espaçamento geral
    bordaTabela?: number // Espessura da borda da tabela
    sombra?: boolean // Usar sombras
    estiloHeader?: 'moderno' | 'classico' | 'minimalista' // Estilo do cabeçalho
  }
  
  configuracoes?: {
    validadeDias?: number // Validade do orçamento em dias
  }
  
  // Propriedades de compatibilidade (deprecated, usar cores/tipografia/layout)
  estiloHeader?: 'moderno' | 'classico' | 'minimalista'
  corHeaderTabela?: string
  corLinhasAlternadas?: string
}

export type EmpresaConfig = {
  impostoPadrao?: number // %
  capitalPadrao?: number // %
  razaoSocial?: string
  cnpj?: string
  endereco?: string
  email?: string
  telefone?: string
  logoUrl?: string
  nomeDoSistema?: string
  layoutOrcamento?: OrcamentoLayoutConfig
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
    email: "",
    telefone: "",
    logoUrl: "",
    nomeDoSistema: "LP IND",
    layoutOrcamento: {
      cores: {
        primaria: "#2563eb",
        secundaria: "#64748b",
        texto: "#1f2937",
        textoSecundario: "#64748b",
        fundo: "#ffffff",
        borda: "#e2e8f0"
      },
      tipografia: {
        fonteFamilia: "Arial, sans-serif",
        tamanhoFonte: 14,
        tamanhoFonteTitulo: 18
      },
      layout: {
        bordaRadius: 8,
        espacamento: 15,
        bordaTabela: 1,
        sombra: true
      },
      configuracoes: {
        validadeDias: 30
      },
      estiloHeader: "moderno",
      corHeaderTabela: "#2563eb",
      corLinhasAlternadas: "#f9fafb"
    }
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
        nomeDoSistema: config.nomeDoSistema || "LP IND",
        layoutOrcamento: config.layoutOrcamento || {
          cores: {
            primaria: "#2563eb",
            secundaria: "#64748b",
            texto: "#1f2937",
            textoSecundario: "#64748b",
            fundo: "#ffffff",
            borda: "#e2e8f0"
          },
          tipografia: {
            fonteFamilia: "Arial, sans-serif",
            tamanhoFonte: 14,
            tamanhoFonteTitulo: 18
          },
          layout: {
            bordaRadius: 8,
            espacamento: 15,
            bordaTabela: 1,
            sombra: true
          },
          configuracoes: {
            validadeDias: 30
          },
          estiloHeader: "moderno",
          corHeaderTabela: "#2563eb",
          corLinhasAlternadas: "#f9fafb"
        }
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
