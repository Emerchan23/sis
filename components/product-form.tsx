"use client"

import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { type Produto, saveProduto, getProdutos } from "@/lib/data-store"

type Props = {
  initial?: Produto | null
  onSaved?: () => void
}

function num(v: string) {
  const n = Number(String(v).replace(",", "."))
  return Number.isFinite(n) ? n : 0
}

export default function ProductForm({ initial, onSaved }: Props) {
  const [form, setForm] = useState<Partial<Produto>>(
    initial ?? {
      nome: "",
      descricao: "",
      marca: "",
      precoVenda: 0,
      custo: 0,
      taxaImposto: 0,
      modalidadeVenda: "Unitário",
      estoque: 0,
      linkRef: "",
      custoRef: 0,
    },
  )
  const { toast } = useToast()

  useEffect(() => {
    if (initial) setForm(initial)
  }, [initial])

  const isEdit = useMemo(() => Boolean((form as Produto)?.id), [form])

  async function save() {
    if (!form.nome?.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" })
      return
    }

    // Check for duplicate names when creating new product
    if (!isEdit) {
      try {
        const produtos = await getProdutos()
        const trimmedName = form.nome.trim()
        const existingProduct = produtos.find(p => p.nome.toLowerCase() === trimmedName.toLowerCase())
        if (existingProduct) {
          toast({ title: "Já existe um produto com este nome!", variant: "destructive" })
          return
        }
      } catch (error) {
        console.error('Erro ao verificar produtos existentes:', error)
      }
    }

    try {
      // sanitização mínima
      const payload = {
        ...form,
        precoVenda: Number(form.precoVenda ?? 0),
        custo: Number(form.custo ?? 0),
        taxaImposto: Number(form.taxaImposto ?? 0),
        estoque: Number(form.estoque ?? 0),
        custoRef: Number(form.custoRef ?? 0),
      } as any
      await saveProduto(payload)
      toast({ title: isEdit ? "Produto atualizado" : "Produto cadastrado" })
      onSaved?.()
    } catch (error) {
      console.error('Erro ao salvar produto:', error)
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        toast({ title: "Já existe um produto com este nome!", variant: "destructive" })
      } else {
        toast({ title: "Erro ao salvar produto. Tente novamente.", variant: "destructive" })
      }
    }
  }

  return (
    <Card>
      <CardContent className="grid gap-4 p-4 md:grid-cols-2">
        <div className="grid gap-2 md:col-span-2">
          <Label>Nome</Label>
          <Input
            value={form.nome || ""}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            placeholder="Ex.: Vela aromática"
          />
        </div>

        <div className="grid gap-2">
          <Label>Marca</Label>
          <Input value={form.marca || ""} onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))} />
        </div>

        <div className="grid gap-2">
          <Label>Modalidade</Label>
          <Input
            value={form.modalidadeVenda || ""}
            onChange={(e) => setForm((f) => ({ ...f, modalidadeVenda: e.target.value }))}
            placeholder="Unitário, Caixa, etc."
          />
        </div>

        <div className="grid gap-2 md:col-span-2">
          <Label>Descrição</Label>
          <Input
            value={form.descricao || ""}
            onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
            placeholder="Detalhes do produto"
          />
        </div>

        <div className="grid gap-2">
          <Label>Preço de Venda</Label>
          <CurrencyInput
            value={String(form.precoVenda ?? 0)}
            onChange={(value) => setForm((f) => ({ ...f, precoVenda: num(value) }))}
            placeholder="0,00"
            showCurrency={true}
          />
        </div>

        <div className="grid gap-2">
          <Label>Custo</Label>
          <CurrencyInput
            value={String(form.custo ?? 0)}
            onChange={(value) => setForm((f) => ({ ...f, custo: num(value) }))}
            placeholder="0,00"
            showCurrency={true}
          />
        </div>

        <div className="grid gap-2">
          <Label>Taxa de Imposto (0 a 1)</Label>
          <CurrencyInput
            value={String(form.taxaImposto ?? 0)}
            onChange={(value) => setForm((f) => ({ ...f, taxaImposto: num(value) }))}
            placeholder="Ex.: 0,15"
          />
        </div>

        <div className="grid gap-2">
          <Label>Estoque</Label>
          <Input
            type="number"
            step="1"
            value={String(form.estoque ?? 0)}
            onChange={(e) => setForm((f) => ({ ...f, estoque: num(e.target.value) }))}
          />
        </div>

        <div className="grid gap-2 md:col-span-2">
          <Label>
            Link ref. (privado)
            <span className="ml-2 text-xs text-muted-foreground">
              Link para compra do fornecedor. Não aparece em documentos para clientes.
            </span>
          </Label>
          <Input
            value={form.linkRef || ""}
            onChange={(e) => setForm((f) => ({ ...f, linkRef: e.target.value }))}
            placeholder="https://..."
          />
        </div>

        <div className="grid gap-2">
          <Label>Custo ref. fornecedor</Label>
          <CurrencyInput
            value={String(form.custoRef ?? 0)}
            onChange={(value) => setForm((f) => ({ ...f, custoRef: num(value) }))}
            placeholder="0,00"
            showCurrency={true}
          />
        </div>

        <div className="md:col-span-2">
          <Button onClick={save}>{isEdit ? "Salvar alterações" : "Cadastrar produto"}</Button>
        </div>
      </CardContent>
    </Card>
  )
}
