"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getDashboardTotals, getDashboardSeries, getDashboardSummary, getDashboardAlerts } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { AppHeader } from "@/components/app-header"
import { MetricCard } from "@/components/metric-card"
import { OverviewChart } from "@/components/charts/overview-chart"
import { fmtCurrency } from "@/lib/format"

type DashboardData = {
  totals: {
    totalRecebido: number
    totalAReceber: number
    lucroTotal: number
    impostosTotais: number
    totalVendas: number
    pendentes: number
  }
  series: { name: string; vendas: number; lucros: number; impostos: number }[]
  summary: {
    totalClientes: number
    totalPedidos: number
    pedidosPendentes: number
  }
  alerts: { id: string; tipo: string; descricao: string; data: string; valor: number }[]
  lastUpdate: string
}

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartType, setChartType] = useState<"bar" | "line">("bar")


  const loadUserAndData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log("Carregando dados do dashboard...")
        
        try {
          const [totals, series, summary, alerts] = await Promise.all([
            getDashboardTotals(),
            getDashboardSeries(),
            getDashboardSummary(),
            getDashboardAlerts()
          ])
          
          setDashboardData({
            totals,
            series,
            summary,
            alerts,
            lastUpdate: new Date().toLocaleTimeString('pt-BR')
          })
          
          console.log("📊 Dados do dashboard carregados:", { totals, series, summary, alerts })
          console.log('💰 Total a Receber atual:', totals.totalAReceber)
        } catch (err: any) {
          console.error("Erro ao carregar dados do dashboard:", err)
          setError(`Erro ao carregar dados do dashboard: ${err.message}`)
        }
    } catch (err: any) {
      console.error("Erro ao carregar dados:", err)
      setError(`Erro: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUserAndData()
  }, [])



  // Mostrar loading enquanto carrega os dados
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Carregando dados...</p>
          </div>
        </main>
      </div>
    )
  }

  // Mostrar erro se houver
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader />
        <main className="container mx-auto px-4 py-8">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-red-600">Erro</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={loadUserAndData} className="w-full">
                Tentar Novamente
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Carregando dashboard...</p>
          </div>
        </main>
      </div>
    )
  }

  const { totals, series, summary, alerts, lastUpdate } = dashboardData

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Sincronização do Dashboard</h1>
              <p className="text-sm text-gray-600">Eventos: 0 • Atualizado: {lastUpdate}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={loadUserAndData} variant="outline" size="sm">
                Atualizar
              </Button>
              <Button onClick={() => window.location.reload()} variant="default" size="sm">
                Forçar Reload
              </Button>
            </div>
          </div>

          {/* Métricas principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard 
              title="Total Recebido" 
              value={fmtCurrency(totals.totalRecebido)} 
            />
            <MetricCard 
              title="Total a Receber" 
              value={fmtCurrency(totals.totalAReceber)} 
            />
            <MetricCard 
              title="Lucro Total" 
              value={fmtCurrency(totals.lucroTotal)} 
            />
            <MetricCard 
              title="Impostos Totais" 
              value={fmtCurrency(totals.impostosTotais)} 
            />
          </div>

          {/* Gráfico de Performance */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Gráficos de Performance</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant={chartType === "bar" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setChartType("bar")}
                  >
                    Barras
                  </Button>
                  <Button 
                    variant={chartType === "line" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setChartType("line")}
                  >
                    Linhas
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <OverviewChart data={series} type={chartType} />
            </CardContent>
          </Card>

          {/* Seção inferior com alertas e resumo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Alertas de Status */}
            <Card>
              <CardHeader>
                <CardTitle>Alertas de Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {alerts && alerts.length > 0 ? (
                    alerts.map((alert) => (
                      <div key={alert.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          <span className="text-sm">{alert.tipo}</span>
                        </div>
                        <span className="text-sm text-gray-600">{alert.descricao} • {fmtCurrency(alert.valor)}</span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => router.push(`/vendas?numeroOF=${alert.id}`)}
                        >
                          Ver
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500">Nenhum alerta no momento</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Resumo */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Clientes</span>
                    <span className="text-sm font-medium">{summary?.totalClientes || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Pedidos</span>
                    <span className="text-sm font-medium">{summary?.totalPedidos || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Pedidos Pendentes</span>
                    <span className="text-sm font-medium">{summary?.pedidosPendentes || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
