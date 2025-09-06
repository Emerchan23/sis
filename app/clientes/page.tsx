"use client"

import { useEffect, useMemo, useState } from "react"
import { AppHeader } from "@/components/app-header"
import { type Cliente, ensureInit, getClientes } from "@/lib/data-store"
import { ensureDefaultEmpresa } from "@/lib/empresas"
import { api } from "@/lib/api-client"
import { fmtDate } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { CnpjCpfInput, PhoneInput } from "@/components/ui/masked-input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"

export default function ClientesPage() {
  const [list, setList] = useState<Cliente[]>([])
  const [filtro, setFiltro] = useState("")
  const [editing, setEditing] = useState<Cliente | null>(null)

  useEffect(() => {
    async function loadData() {
      ensureInit()
      try {
        // Garantir que existe uma empresa padrão selecionada
        await ensureDefaultEmpresa()
        const clientes = await getClientes()
        setList(clientes)
      } catch (error) {
        console.error('Erro ao carregar clientes:', error)
        setList([])
      }
    }
    loadData()
  }, [])

  async function refresh() {
    try {
      // Garantir que existe uma empresa padrão selecionada
      await ensureDefaultEmpresa()
      const clientes = await getClientes()
      setList(clientes)
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
      setList([])
    }
  }

  async function onSubmit(formData: FormData) {
    const payload = {
      nome: String(formData.get("nome") || ""),
      documento: String(formData.get("documento") || ""),
      endereco: String(formData.get("endereco") || ""),
      telefone: String(formData.get("telefone") || ""),
      email: String(formData.get("email") || ""),
    }
    if (!payload.nome || !payload.documento) {
      toast({ title: "Preencha Nome e CNPJ/CPF." })
      return
    }

    // Check for duplicate names when creating new client
    if (!editing?.id) {
      const trimmedName = payload.nome.trim()
      const existingClient = list.find(c => c.nome.toLowerCase() === trimmedName.toLowerCase())
      if (existingClient) {
        toast({ title: "Já existe um cliente com este nome!", variant: "destructive" })
        return
      }
    }
    
    try {
      if (editing?.id) {
        await api.clientes.update(editing.id, payload)
      } else {
        await api.clientes.create(payload)
      }
      setEditing(null)
      refresh()
    } catch (error) {
      console.error('Erro ao salvar cliente:', error)
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        toast({ title: "Já existe um cliente com este nome!", variant: "destructive" })
      } else {
        toast({ title: "Erro ao salvar cliente. Tente novamente.", variant: "destructive" })
      }
    }
  }

  const filtrados = useMemo(() => {
    const term = filtro.toLowerCase().trim()
    if (!term) return list
    return list.filter((c) => c.nome.toLowerCase().includes(term) || c.documento.toLowerCase().includes(term))
  }, [list, filtro])

  return (
    <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Cadastro de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={onSubmit}
              className="grid gap-4 md:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault()
                onSubmit(new FormData(e.currentTarget))
              }}
            >
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" name="nome" defaultValue={editing?.nome || ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="documento">CNPJ/CPF</Label>
                <CnpjCpfInput id="documento" name="documento" defaultValue={editing?.documento || ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input id="endereco" name="endereco" defaultValue={editing?.endereco || ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="telefone">Telefone</Label>
                <PhoneInput id="telefone" name="telefone" defaultValue={editing?.telefone || ""} />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={editing?.email || ""} />
              </div>
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit">{editing ? "Salvar alterações" : "Salvar"}</Button>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Clientes Cadastrados</CardTitle>
            <Input
              placeholder="Filtrar por nome ou CNPJ/CPF"
              className="max-w-xs"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
          </CardHeader>
          <CardContent className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ/CPF</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell>{c.documento}</TableCell>
                    <TableCell className="text-sm">
                      {c.email || "-"}
                      <div className="text-muted-foreground">{c.telefone || ""}</div>
                    </TableCell>
                    <TableCell>{fmtDate(c.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          try {
                            await api.clientes.delete(c.id)
                            refresh()
                          } catch (error) {
                            console.error('Erro ao excluir cliente:', error)
                          }
                        }}
                      >
                        Excluir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum cliente encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        </main>
      </div>
  )
}
