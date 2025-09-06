"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import type { Empresa } from "@/lib/empresas"
import {
  ensureDefaultEmpresa,
  getCurrentEmpresa,
  saveEmpresa,
} from "@/lib/empresas"
import { updateCurrentEmpresaById, reloadCurrentEmpresa } from "@/lib/empresas-client"
import {
  ERP_CHANGED_EVENT,
  getBackup,
  restoreBackup,
} from "@/lib/data-store"
import { type EmpresaConfig as EmpresaCfgScoped, type OrcamentoLayoutConfig, getActiveEmpresaConfig, saveEmpresaConfig } from "@/lib/company-config"
import { OrcamentoPreview } from "@/components/orcamento-preview"

export default function ConfiguracoesPage() {
  const [currentId, setCurrentId] = useState<string>("")  
  const [currentEmpresa, setCurrentEmpresa] = useState<Empresa | null>(null)
  const [formEmpresa, setFormEmpresa] = useState<Partial<Empresa>>({})
  const [formCfg, setFormCfg] = useState<EmpresaCfgScoped>({})
  const [layoutOrcamento, setLayoutOrcamento] = useState<OrcamentoLayoutConfig>({} as OrcamentoLayoutConfig)

  // Backup
  const [mergeImport, setMergeImport] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { toast } = useToast()

  const reload = async () => {
    try {
      // Garantir que existe uma empresa padrão
      await ensureDefaultEmpresa()
      
      // Obter a empresa atual
      const currentEmpresa = await getCurrentEmpresa()
      if (!currentEmpresa) {
        throw new Error('Nenhuma empresa encontrada')
      }
      
      setCurrentId(currentEmpresa.id)
      setCurrentEmpresa(currentEmpresa)
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados. Verifique a conexão com o servidor.",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    reload()
  }, [])

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="container mx-auto max-w-6xl space-y-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Configurações Gerais</h1>
          <div className="text-sm text-muted-foreground">
            Empresa atual: <span className="font-medium">{currentEmpresa?.nome || "—"}</span>
          </div>
        </div>
      </main>
    </div>
  )
}