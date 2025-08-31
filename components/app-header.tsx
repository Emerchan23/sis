"use client"

import type React from "react"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useEffect, useMemo, useState } from "react"
import { getConfig, CONFIG_CHANGED_EVENT } from "@/lib/config"
import { ensureDefaultEmpresa, getCurrentEmpresa, EMPRESA_CHANGED_EVENT } from "@/lib/empresas-client"


const routes = [
  { href: "/", label: "Dashboard" },
  { href: "/vendas", label: "Vendas" },
  { href: "/acertos", label: "Acertos" },
  { href: "/clientes", label: "Clientes" },
  { href: "/vales", label: "Vale" },
  { href: "/relatorios", label: "Relatórios" },
  { href: "/outros-negocios", label: "Outros negócios" },
  { href: "/orcamentos", label: "Orçamentos" },
  { href: "/configuracoes", label: "Configurações" },
]

export function AppHeader({ className = "" }: { className?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [brand, setBrand] = useState<string>("LP IND")
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined)
  const [empresaNome, setEmpresaNome] = useState<string>("")

  const placeholderLogo = useMemo(() => "/placeholder.svg?height=28&width=28", [])

  useEffect(() => {
    const initData = async () => {
      try {
        await ensureDefaultEmpresa()
        const cfg = getConfig()
        const curEmp = getCurrentEmpresa()
        
        // Priorizar dados da empresa atual
        setBrand(curEmp?.nomeDoSistema || cfg?.nome || "LP IND")
        setLogoUrl(curEmp?.logoUrl || cfg?.logoUrl || undefined)
        setEmpresaNome(curEmp?.nome || "")
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
      }
    }

    initData()

    const onConfigChanged = () => {
      const cfg = getConfig()
      setBrand(cfg?.nome || "LP IND")
      setLogoUrl(cfg?.logoUrl || undefined)
    }

    const onEmpresaChanged = () => {
      const curEmp = getCurrentEmpresa()
      setEmpresaNome(curEmp?.nome || "")
      // Usar dados da empresa atual para nome do sistema e logo
      if (curEmp?.nomeDoSistema) {
        setBrand(curEmp.nomeDoSistema)
      }
      if (curEmp?.logoUrl) {
        setLogoUrl(curEmp.logoUrl)
      }
    }

    window.addEventListener(CONFIG_CHANGED_EVENT, onConfigChanged as EventListener)
    window.addEventListener(EMPRESA_CHANGED_EVENT, onEmpresaChanged as EventListener)
    
    return () => {
      window.removeEventListener(CONFIG_CHANGED_EVENT, onConfigChanged as EventListener)
      window.removeEventListener(EMPRESA_CHANGED_EVENT, onEmpresaChanged as EventListener)
    }
  }, [pathname])

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className,
      )}
    >
      <div className="mx-auto flex h-14 min-h-14 max-w-7xl items-center gap-3 px-4">
        {/* Marca */}
        <Link href="/" className="flex shrink-0 items-center gap-2" title={brand}>
          <Image
            src={logoUrl && logoUrl.trim() !== "" ? logoUrl : placeholderLogo}
            alt="Logo da empresa"
            width={28}
            height={28}
            className="rounded object-cover"
          />
          <span className="font-semibold truncate max-w-[40vw]">{brand}</span>
        </Link>

        {/* Navegação principal */}
        <nav
          aria-label="Principal"
          className="hidden md:flex flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap
                     [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ scrollbarWidth: "none" } as React.CSSProperties}
        >
          {routes.map((r) => {
            const active = pathname === r.href
            return (
              <Link key={r.href} href={r.href} className="shrink-0">
                <Button
                  variant={active ? "default" : "ghost"}
                  className={cn("text-sm", active ? "" : "text-muted-foreground hover:text-foreground")}
                >
                  {r.label}
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* Usuário e empresa */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div className="hidden md:inline-flex">
            <Button
              variant="outline"
              className="bg-transparent max-w-[260px] overflow-hidden text-ellipsis whitespace-nowrap"
              title={empresaNome ? `Empresa: ${empresaNome}` : "Empresa"}
              disabled
            >
              {empresaNome ? `Empresa: ${empresaNome}` : "Empresa"}
            </Button>
          </div>



          {/* Navegação compacta no mobile */}
          <div className="md:hidden">
            <Link href="/menu">
              <Button variant="ghost" className="text-sm">
                Menu
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Barra secundária no mobile */}
      <div className="md:hidden border-t">
        <div
          className="flex items-center gap-1 overflow-x-auto px-2 py-2 whitespace-nowrap
                     [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ scrollbarWidth: "none" } as React.CSSProperties}
        >
          {routes.map((r) => {
            const active = pathname === r.href
            return (
              <Link key={r.href} href={r.href} className="shrink-0">
                <Button size="sm" variant={active ? "secondary" : "ghost"} className="text-xs">
                  {r.label}
                </Button>
              </Link>
            )
          })}
          <div className="shrink-0">
            <Button size="sm" variant="outline" className="text-xs bg-transparent" disabled>
              {empresaNome ? "Empresa" : "Empresa"}
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
