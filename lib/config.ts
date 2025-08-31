"use client"

// Configuração do sistema - agora gerenciada pelo backend

type Config = {
  nome?: string
  logoUrl?: string
  [key: string]: any
}

// Valor padrão para configuração
const defaultConfig: Config = {
  nome: "LP IND",
  logoUrl: undefined
}

// Configuração em memória (deve ser carregada do backend)
let currentConfig: Config = { ...defaultConfig }

/**
 * Obtém a configuração atual do sistema
 */
export function getConfig(): Config {
  return { ...currentConfig }
}

/**
 * Salva a configuração do sistema
 */
export function saveConfig(config: Config): void {
  try {
    currentConfig = { ...config }
    // Disparar evento para notificar mudanças
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("erp-config-changed"))
    }
    console.log("Configuração deve ser salva no backend:", config)
  } catch (error) {
    console.error("Erro ao salvar configuração:", error)
  }
}

/**
 * Carrega configuração do backend (placeholder)
 */
export function loadConfigFromBackend(config: Config): void {
  currentConfig = { ...config }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("erp-config-changed"))
  }
}

// Re-exportar o evento de mudança
export const CONFIG_CHANGED_EVENT = "erp-config-changed"