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
import { type EmpresaConfig as EmpresaCfgScoped, getActiveEmpresaConfig, saveEmpresaConfig } from "@/lib/company-config"

export default function ConfiguracoesPage() {
  const [currentId, setCurrentId] = useState<string>("")  
  const [currentEmpresa, setCurrentEmpresa] = useState<Empresa | null>(null)
  const [formEmpresa, setFormEmpresa] = useState<Partial<Empresa>>({})
  const [formCfg, setFormCfg] = useState<EmpresaCfgScoped>({})



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
      
      // Carregar configuração da empresa
      const { api } = await import("@/lib/api-client")
      let empresaConfig: any = {}
      try {
        empresaConfig = await api.empresas.config.get(currentEmpresa.id)
        console.log('Dados carregados da API:', empresaConfig)
      } catch (configError) {
        console.warn('Erro ao carregar configuração da empresa:', configError)
      }
      
      const formEmpresaData = {
        id: currentEmpresa.id,
        nome: currentEmpresa.nome,
        razaoSocial: empresaConfig?.razaoSocial || "",
        cnpj: empresaConfig?.cnpj || "",
        endereco: empresaConfig?.endereco || "",
        logoUrl: empresaConfig?.logoUrl || "",
        nomeDoSistema: empresaConfig?.nomeDoSistema || "",
      }
      console.log('Dados do formulário:', formEmpresaData)
      setFormEmpresa(formEmpresaData)
      
      const formCfgData = {
        impostoPadrao: empresaConfig?.impostoPadrao,
        capitalPadrao: empresaConfig?.capitalPadrao
      }
      setFormCfg(formCfgData)

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
    const onChange = () => reload()
    window.addEventListener(ERP_CHANGED_EVENT, onChange as EventListener)
    window.addEventListener("storage", onChange)
    return () => {
      window.removeEventListener(ERP_CHANGED_EVENT, onChange as EventListener)
      window.removeEventListener("storage", onChange)
    }
  }, [])

  const handleSalvarGeral = async () => {
    if (!currentId) {
      toast({ title: "Erro: Empresa não selecionada", variant: "destructive" })
      return
    }
    
    try {
      // Salvar dados básicos da empresa (nome)
      await saveEmpresa({
        id: currentId,
        nome: formEmpresa.nome?.trim() || "Minha Empresa",
      })
      
      // Salvar configurações completas da empresa
      await saveEmpresaConfig(currentId, {
        razaoSocial: formEmpresa.razaoSocial?.trim() || "",
        cnpj: formEmpresa.cnpj?.trim() || "",
        endereco: formEmpresa.endereco?.trim() || "",
        logoUrl: formEmpresa.logoUrl?.trim() || "",
        nomeDoSistema: formEmpresa.nomeDoSistema?.trim() || "",
        impostoPadrao: formCfg.impostoPadrao ? Number(formCfg.impostoPadrao) : undefined,
        capitalPadrao: formCfg.capitalPadrao ? Number(formCfg.capitalPadrao) : undefined,
      })
      
      // Atualizar empresa atual em memória para refletir as mudanças no AppHeader
      await updateCurrentEmpresaById(currentId)
      
      // Recarregar os dados do formulário para refletir as mudanças
      await reload()
      
      toast({ title: "Configurações salvas com sucesso!" })
      
      // Recarregar dados da página
      await reload()
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast({ 
        title: "Erro ao salvar configurações", 
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive" 
      })
    }
  }





  // Backup
  const handleExport = async () => {
    try {
      const backup = await getBackup()
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const date = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")
      a.download = `erp-backup-${date}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast({ title: "Backup exportado", description: "Arquivo .json baixado com sucesso." })
    } catch (e) {
      console.error("Erro ao exportar backup:", e)
      toast({ 
        title: "Falha ao exportar", 
        description: e instanceof Error ? e.message : "Tente novamente.", 
        variant: "destructive" 
      })
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    
    try {
      console.log('🔄 Iniciando importação do arquivo:', file.name)
      const text = await file.text()
      console.log('📄 Conteúdo do arquivo lido, tamanho:', text.length)
      
      const parsed = JSON.parse(text)
      console.log('✅ JSON parseado com sucesso:', parsed)
      console.log('🔧 Modo merge:', mergeImport)
      
      console.log('🚀 Chamando restoreBackup...')
      await restoreBackup(parsed, { merge: mergeImport })
      console.log('✅ restoreBackup concluído com sucesso')
      
      console.log('🔄 Recarregando dados...')
      await reload()
      console.log('✅ Reload concluído')
      
      toast({
        title: "✅ Backup carregado com sucesso!",
        description: mergeImport 
          ? "Os dados do backup foram mesclados com os dados existentes." 
          : "Todos os dados foram substituídos pelo backup. A página será recarregada.",
      })
    } catch (err) {
      console.error('❌ Erro na importação:', err)
      toast({
        title: "Falha ao importar",
        description: err instanceof Error ? err.message : "Verifique o arquivo .json do backup.",
        variant: "destructive",
      })
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

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

        {/* Informações da Empresa */}
        <Card>
          <CardHeader>
            <CardTitle>Informações da Empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-4">
              Configure as informações básicas da sua empresa.
            </div>
          </CardContent>
        </Card>

        {/* Config da empresa atual */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações da empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome da Empresa</Label>
                <Input
                  id="nome"
                  value={formEmpresa.nome || ""}
                  onChange={(e) => {
                    setFormEmpresa((s) => ({ ...s, nome: e.target.value }))
                  }}
                  placeholder="Minha Empresa LTDA"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="imposto">Taxa de Imposto Padrão (%)</Label>
                <CurrencyInput
                  id="imposto"
                  value={formCfg.impostoPadrao ?? ""}
                  onChange={(value) => {
                    setFormCfg((s) => {
                      const newValue = value === "" ? undefined : Number(value.replace(',', '.'))
                      return {
                        ...s,
                        impostoPadrao: newValue,
                      }
                    })
                  }}
                  placeholder="Ex.: 11,5"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="razao">Razão Social</Label>
                <Input
                  id="razao"
                  value={formEmpresa.razaoSocial || ""}
                  onChange={(e) => {
                    setFormEmpresa((s) => ({ ...s, razaoSocial: e.target.value }))
                  }}
                  placeholder="Razão social"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formEmpresa.cnpj || ""}
                  onChange={(e) => setFormEmpresa((s) => ({ ...s, cnpj: e.target.value }))}
                  placeholder="Somente números"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="capital">Taxa de Capital Padrão (%)</Label>
                <CurrencyInput
                  id="capital"
                  value={formCfg.capitalPadrao ?? ""}
                  onChange={(value) => {
                    setFormCfg((s) => {
                      const newValue = value === "" ? undefined : Number(value.replace(',', '.'))
                      return {
                        ...s,
                        capitalPadrao: newValue,
                      }
                    })
                  }}
                  placeholder="Ex.: 3,5"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nomeDoSistema">Nome do Sistema</Label>
                <Input
                  id="nomeDoSistema"
                  value={formEmpresa.nomeDoSistema || ""}
                  onChange={(e) => setFormEmpresa((s) => ({ ...s, nomeDoSistema: e.target.value }))}
                  placeholder="LP IND"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="logo">URL da Logo (opcional)</Label>
                <Input
                  id="logo"
                  value={formEmpresa.logoUrl || ""}
                  onChange={(e) => setFormEmpresa((s) => ({ ...s, logoUrl: e.target.value }))}
                  placeholder="https://.../logo.png"
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={formEmpresa.endereco || ""}
                  onChange={(e) => setFormEmpresa((s) => ({ ...s, endereco: e.target.value }))}
                  placeholder="Rua, nº, bairro, cidade - UF"
                />
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={handleSalvarGeral}>Salvar Configurações</Button>
            </div>
          </CardContent>
        </Card>

        {/* Backup de Dados */}
        <Card>
          <CardHeader>
            <CardTitle>Backup de Dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Exporte e importe um arquivo .json contendo clientes, produtos, pedidos, recebimentos, usuários,
              configurações e sequência de pedidos.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleExport}>Exportar (.json)</Button>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                onChange={handleImportFile}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => {
                  fileInputRef.current?.click()
                }}
              >
                Importar (.json)
              </Button>

              <div className="flex items-center gap-2">
                <Checkbox id="merge" checked={mergeImport} onCheckedChange={(v) => setMergeImport(Boolean(v))} />
                <label htmlFor="merge" className="text-sm">
                  Mesclar com dados existentes (não remove registros)
                </label>
              </div>
            </div>
            {!mergeImport && (
              <p className="text-xs text-amber-600">
                Atenção: ao importar sem mescla, todos os dados atuais serão substituídos pelos do arquivo.
              </p>
            )}
          </CardContent>
        </Card>


      </main>




    </div>
  )
}
