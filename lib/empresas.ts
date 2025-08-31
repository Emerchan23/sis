// Empresas e preferências por usuário via backend API

"use client"

import { api } from "./api-client"

export type Empresa = { 
  id: string; 
  nome: string;
  razaoSocial?: string;
  cnpj?: string;
  endereco?: string;
  logoUrl?: string;
  nomeDoSistema?: string;
  createdAt?: string;
}

type UserPrefs = {
  currentEmpresaId?: string
  [key: string]: any
}

export async function getEmpresas(): Promise<Empresa[]> {
  const empresas = await api.empresas.list()
  
  // Load additional config data for each empresa
  const empresasWithConfig = await Promise.all(
    empresas.map(async (empresa) => {
      try {
        const config = await api.empresas.config.get(empresa.id)
        return {
          ...empresa,
          razaoSocial: config?.razaoSocial || "",
          cnpj: config?.cnpj || "",
          endereco: config?.endereco || "",
          logoUrl: config?.logoUrl || "",
          nomeDoSistema: config?.nomeDoSistema || "LP IND"
        }
      } catch (error) {
        console.error(`Error loading config for empresa ${empresa.id}:`, error)
        return empresa
      }
    })
  )
  
  return empresasWithConfig
}

export async function ensureDefaultEmpresa(): Promise<void> {
  const list = await getEmpresas()
  if (list.length === 0) {
    const result = await api.empresas.create({ nome: "ID" })
    // Definir a empresa criada como atual
    await setCurrentEmpresaId(result.id)
  } else {
    // Se existem empresas mas nenhuma está selecionada, selecionar a primeira
    const currentId = await getCurrentEmpresaId()
    if (!currentId) {
      await setCurrentEmpresaId(list[0].id)
    }
  }
}

export async function getCurrentEmpresaId(): Promise<string | null> {
  const prefs = (await api.empresas.prefs.get()) as UserPrefs
  return prefs.currentEmpresaId ?? null
}

export async function getCurrentEmpresa(): Promise<Empresa | null> {
  const id = await getCurrentEmpresaId()
  if (!id) return null
  
  const empresas = await getEmpresas()
  const empresa = empresas.find(e => e.id === id)
  if (!empresa) return null
  
  // Load additional config data
  try {
    const config = await api.empresas.config.get(id)
    return {
      ...empresa,
      razaoSocial: config?.razaoSocial || "",
      cnpj: config?.cnpj || "",
      endereco: config?.endereco || "",
      logoUrl: config?.logoUrl || "",
      nomeDoSistema: config?.nomeDoSistema || "LP IND"
    }
  } catch (error) {
    console.error('Error loading empresa config:', error)
    return empresa
  }
}

export async function setCurrentEmpresaId(id: string): Promise<void> {
  const prefs = (await api.empresas.prefs.get()) as UserPrefs
  await api.empresas.prefs.set({ ...prefs, currentEmpresaId: id })
  
  // Disparar evento para notificar mudanças
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("empresa-changed"))
  }
}

export async function saveEmpresa(empresa: Partial<Empresa> & { id?: string }): Promise<void> {
  // Basic empresa data (only nome is supported by /empresas endpoint)
  const empresaData = {
    nome: empresa.nome || "Nova Empresa"
  }
  
  // Additional config data (stored in empresa-config endpoint)
  const configData = {
    razaoSocial: empresa.razaoSocial || "",
    cnpj: empresa.cnpj || "",
    endereco: empresa.endereco || "",
    logoUrl: empresa.logoUrl || "",
    nomeDoSistema: empresa.nomeDoSistema || "LP IND"
  }
  
  let empresaId: string
  
  if (empresa.id) {
    // Update existing empresa
    await api.empresas.update(empresa.id, empresaData)
    empresaId = empresa.id
  } else {
    // Create new empresa
    const result = await api.empresas.create(empresaData)
    empresaId = result.id
  }
  
  // Save additional config data
  await api.empresas.config.set(empresaId, configData)
}

export async function deleteEmpresa(id: string): Promise<void> {
  await api.empresas.delete(id)
}
