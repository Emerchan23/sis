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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
        email: empresaConfig?.email || "",
        telefone: empresaConfig?.telefone || "",
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
      
      setLayoutOrcamento(empresaConfig?.layoutOrcamento || {} as OrcamentoLayoutConfig)

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
    try {
      if (!currentEmpresa) {
        toast({
          title: "Erro",
          description: "Nenhuma empresa selecionada",
          variant: "destructive",
        })
        return
      }

      // Salvar dados da empresa
      const empresaAtualizada = {
        ...currentEmpresa,
        nome: formEmpresa.nome || currentEmpresa.nome,
      }
      await saveEmpresa(empresaAtualizada)

      // Salvar configurações da empresa
      const { api } = await import("@/lib/api-client")
      const configData = {
        razaoSocial: formEmpresa.razaoSocial,
        cnpj: formEmpresa.cnpj,
        endereco: formEmpresa.endereco,
        email: formEmpresa.email,
        telefone: formEmpresa.telefone,
        logoUrl: formEmpresa.logoUrl,
        nomeDoSistema: formEmpresa.nomeDoSistema,
        impostoPadrao: formCfg.impostoPadrao,
        capitalPadrao: formCfg.capitalPadrao,
      }
      
      await api.empresas.config.set(currentEmpresa.id, configData)
      
      // Disparar evento para atualizar outros componentes
      window.dispatchEvent(new CustomEvent(ERP_CHANGED_EVENT, { detail: { key: "empresa-config" } }))
      
      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso!",
      })
      
      await reload()
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações",
        variant: "destructive",
      })
    }
  }

  const handleSalvarLayoutOrcamento = async () => {
    try {
      if (!currentEmpresa) {
        toast({
          title: "Erro",
          description: "Nenhuma empresa selecionada",
          variant: "destructive",
        })
        return
      }

      const { api } = await import("@/lib/api-client")
      await api.empresas.config.set(currentEmpresa.id, {
        layoutOrcamento
      })
      
      toast({
        title: "Sucesso",
        description: "Configurações de layout salvas com sucesso!",
      })
    } catch (error) {
      console.error('Erro ao salvar layout:', error)
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações de layout",
        variant: "destructive",
      })
    }
  }

  const handleExport = async () => {
    try {
      const backup = await getBackup()
      const dataStr = JSON.stringify(backup, null, 2)
      const dataBlob = new Blob([dataStr], { type: "application/json" })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = `backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast({
        title: "Sucesso",
        description: "Backup exportado com sucesso!",
      })
    } catch (error) {
      console.error('Erro ao exportar:', error)
      toast({
        title: "Erro",
        description: "Erro ao exportar backup",
        variant: "destructive",
      })
    }
  }

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      await restoreBackup(data, { merge: mergeImport })
      
      // Recarregar a página após importação
      window.location.reload()
      
      toast({
        title: "Sucesso",
        description: mergeImport ? "Dados mesclados com sucesso!" : "Backup restaurado com sucesso!",
      })
    } catch (error) {
      console.error('Erro ao importar:', error)
      toast({
        title: "Erro",
        description: "Erro ao importar backup. Verifique se o arquivo é válido.",
        variant: "destructive",
      })
    } finally {
      // Limpar o input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
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
              <div className="grid gap-2">
                <Label htmlFor="email">E-mail da Empresa</Label>
                <Input
                  id="email"
                  type="email"
                  value={formEmpresa.email || ""}
                  onChange={(e) => setFormEmpresa((s) => ({ ...s, email: e.target.value }))}
                  placeholder="contato@empresa.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="telefone">Telefone da Empresa</Label>
                <Input
                  id="telefone"
                  value={formEmpresa.telefone || ""}
                  onChange={(e) => setFormEmpresa((s) => ({ ...s, telefone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={handleSalvarGeral}>Salvar Configurações</Button>
            </div>
          </CardContent>
        </Card>

        {/* Layout do Orçamento */}
        <Card>
          <CardHeader>
            <CardTitle>Layout do Orçamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-sm text-muted-foreground mb-4">
              Configure a aparência visual dos orçamentos gerados.
            </div>
            
            {/* Cores */}
            <div className="space-y-4">
              <h4 className="text-md font-medium">Cores</h4>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="corPrimaria">Cor Primária</Label>
                  <div className="flex gap-2">
                    <Input
                      id="corPrimaria"
                      type="color"
                      value={layoutOrcamento.cores?.primaria || "#2563eb"}
                      onChange={(e) => {
                        setLayoutOrcamento(prev => ({
                          ...prev,
                          cores: { ...prev.cores, primaria: e.target.value }
                        }))
                      }}
                      className="w-20"
                    />
                    <Select
                      value={layoutOrcamento.cores?.primaria || "#2563eb"}
                      onValueChange={(value) => {
                        setLayoutOrcamento(prev => ({
                          ...prev,
                          cores: { ...prev.cores, primaria: value }
                        }))
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Cores predefinidas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="#2563eb">Azul Padrão</SelectItem>
                        <SelectItem value="#1e40af">Azul Escuro</SelectItem>
                        <SelectItem value="#0ea5e9">Azul Claro</SelectItem>
                        <SelectItem value="#10b981">Verde</SelectItem>
                        <SelectItem value="#059669">Verde Escuro</SelectItem>
                        <SelectItem value="#f59e0b">Laranja</SelectItem>
                        <SelectItem value="#dc2626">Vermelho</SelectItem>
                        <SelectItem value="#7c3aed">Roxo</SelectItem>
                        <SelectItem value="#374151">Cinza Escuro</SelectItem>
                        <SelectItem value="#000000">Preto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="corSecundaria">Cor Secundária</Label>
                  <div className="flex gap-2">
                    <Input
                      id="corSecundaria"
                      type="color"
                      value={layoutOrcamento.cores?.secundaria || "#64748b"}
                      onChange={(e) => {
                        setLayoutOrcamento(prev => ({
                          ...prev,
                          cores: { ...prev.cores, secundaria: e.target.value }
                        }))
                      }}
                      className="w-20"
                    />
                    <Select
                      value={layoutOrcamento.cores?.secundaria || "#64748b"}
                      onValueChange={(value) => {
                        setLayoutOrcamento(prev => ({
                          ...prev,
                          cores: { ...prev.cores, secundaria: value }
                        }))
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Cores predefinidas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="#64748b">Cinza Padrão</SelectItem>
                        <SelectItem value="#475569">Cinza Escuro</SelectItem>
                        <SelectItem value="#94a3b8">Cinza Claro</SelectItem>
                        <SelectItem value="#06b6d4">Ciano</SelectItem>
                        <SelectItem value="#8b5cf6">Violeta</SelectItem>
                        <SelectItem value="#ec4899">Rosa</SelectItem>
                        <SelectItem value="#84cc16">Lima</SelectItem>
                        <SelectItem value="#eab308">Amarelo</SelectItem>
                        <SelectItem value="#6b7280">Cinza Neutro</SelectItem>
                        <SelectItem value="#ffffff">Branco</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="corTexto">Cor do Texto</Label>
                  <Input
                    id="corTexto"
                    type="color"
                    value={layoutOrcamento.cores?.texto || "#1f2937"}
                    onChange={(e) => {
                      setLayoutOrcamento(prev => ({
                        ...prev,
                        cores: { ...prev.cores, texto: e.target.value }
                      }))
                    }}
                  />
                </div>
              </div>
            </div>
            
            {/* Tipografia */}
            <div className="space-y-4">
              <h4 className="text-md font-medium">Tipografia</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="fonteFamilia">Fonte</Label>
                  <Select
                    value={layoutOrcamento.tipografia?.fonteFamilia || "Arial, sans-serif"}
                    onValueChange={(value) => {
                      setLayoutOrcamento(prev => ({
                        ...prev,
                        tipografia: { ...prev.tipografia, fonteFamilia: value }
                      }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma fonte" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                      <SelectItem value="Helvetica, sans-serif">Helvetica</SelectItem>
                      <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
                      <SelectItem value="Georgia, serif">Georgia</SelectItem>
                      <SelectItem value="'Courier New', monospace">Courier New</SelectItem>
                      <SelectItem value="Verdana, sans-serif">Verdana</SelectItem>
                      <SelectItem value="Tahoma, sans-serif">Tahoma</SelectItem>
                      <SelectItem value="'Trebuchet MS', sans-serif">Trebuchet MS</SelectItem>
                      <SelectItem value="'Lucida Console', monospace">Lucida Console</SelectItem>
                      <SelectItem value="Impact, sans-serif">Impact</SelectItem>
                      <SelectItem value="'Comic Sans MS', cursive">Comic Sans MS</SelectItem>
                      <SelectItem value="'Palatino Linotype', serif">Palatino Linotype</SelectItem>
                      <SelectItem value="'Book Antiqua', serif">Book Antiqua</SelectItem>
                      <SelectItem value="'Lucida Sans Unicode', sans-serif">Lucida Sans Unicode</SelectItem>
                      <SelectItem value="'MS Sans Serif', sans-serif">MS Sans Serif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tamanhoFonte">Tamanho da Fonte</Label>
                  <Select
                    value={layoutOrcamento.tipografia?.tamanhoFonte?.toString() || "14"}
                    onValueChange={(value) => {
                      setLayoutOrcamento(prev => ({
                        ...prev,
                        tipografia: { ...prev.tipografia, tamanhoFonte: parseInt(value) }
                      }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tamanho" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10px - Muito Pequeno</SelectItem>
                      <SelectItem value="12">12px - Pequeno</SelectItem>
                      <SelectItem value="14">14px - Normal</SelectItem>
                      <SelectItem value="16">16px - Médio</SelectItem>
                      <SelectItem value="18">18px - Grande</SelectItem>
                      <SelectItem value="20">20px - Muito Grande</SelectItem>
                      <SelectItem value="24">24px - Extra Grande</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Estilo do Texto</Label>
                  <div className="flex gap-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="negrito"
                        checked={layoutOrcamento.tipografia?.negrito || false}
                        onCheckedChange={(checked) => {
                          setLayoutOrcamento(prev => ({
                            ...prev,
                            tipografia: { ...prev.tipografia, negrito: checked as boolean }
                          }))
                        }}
                      />
                      <Label htmlFor="negrito" className="text-sm font-medium">Negrito</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="italico"
                        checked={layoutOrcamento.tipografia?.italico || false}
                        onCheckedChange={(checked) => {
                          setLayoutOrcamento(prev => ({
                            ...prev,
                            tipografia: { ...prev.tipografia, italico: checked as boolean }
                          }))
                        }}
                      />
                      <Label htmlFor="italico" className="text-sm font-medium">Itálico</Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Configurações */}
            <div className="space-y-4">
              <h4 className="text-md font-medium">Configurações</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="validadeDias">Validade da Proposta (dias)</Label>
                  <Input
                    id="validadeDias"
                    type="number"
                    min="1"
                    max="365"
                    value={layoutOrcamento.configuracoes?.validadeDias || 30}
                    onChange={(e) => {
                      setLayoutOrcamento(prev => ({
                        ...prev,
                        configuracoes: { ...prev.configuracoes, validadeDias: Number(e.target.value) }
                      }))
                    }}
                  />
                </div>
              </div>
            </div>
            
            {/* Preview */}
            <div className="space-y-4">
              <OrcamentoPreview layoutConfig={layoutOrcamento} />
            </div>
            
            <div className="mt-4">
              <Button onClick={handleSalvarLayoutOrcamento}>Salvar Layout</Button>
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
