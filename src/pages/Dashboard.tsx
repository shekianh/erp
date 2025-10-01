
import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  Package, 
  Factory, 
  Users, 
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  ShoppingCart,
  FileText,
  Truck,
  Calendar,
  RefreshCw
} from 'lucide-react'
import { 
  buscarPedidosOtimizado,
  buscarNotasFiscaisOtimizado,
  buscarItensPedidosOtimizado,
  PedidoVendas, 
  NotaFiscal, 
  ItemPedidoVendas 
} from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

interface MetricCard {
  title: string
  value: string
  change: string
  changeType: 'increase' | 'decrease' | 'neutral'
  icon: React.ComponentType<any>
  color: string
}

const Dashboard: React.FC = () => {
  const { user } = useAuth()
  const [pedidos, setPedidos] = useState<PedidoVendas[]>([])
  const [notasFiscais, setNotasFiscais] = useState<NotaFiscal[]>([])
  const [itensPedidos, setItensPedidos] = useState<ItemPedidoVendas[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Função para obter data atual no formato YYYY-MM-DD
  const getToday = () => {
    return new Date().toISOString().split('T')[0]
  }

  // Função para obter data de ontem
  const getYesterday = () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().split('T')[0]
  }

  // Função para obter últimos 30 dias
  const getLast30Days = () => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return thirtyDaysAgo.toISOString().split('T')[0]
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const hoje = getToday()
      const ontem = getYesterday()
      const thirtyDaysAgo = getLast30Days()
      
      // Usar funções otimizadas para consultas rápidas
      const [pedidosData, notasData, itensData] = await Promise.all([
        buscarPedidosOtimizado(thirtyDaysAgo, hoje, 1, 1000), // Últimos 30 dias para comparação
        buscarNotasFiscaisOtimizado(thirtyDaysAgo, hoje),
        buscarItensPedidosOtimizado(thirtyDaysAgo, hoje)
      ])

      // Configurar dados com fallback para arrays vazios
      setPedidos(pedidosData.data || [])
      setNotasFiscais(notasData || [])
      setItensPedidos(itensData || [])
      setLastUpdate(new Date())

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
      toast.error('Erro ao carregar dados do dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    
    // Atualizar dados a cada 5 minutos
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  // Cálculos otimizados usando useMemo
  const metrics = useMemo(() => {
    const hoje = getToday()
    const ontem = getYesterday()

    // Pedidos de hoje
    const pedidosHoje = pedidos.filter(p => p.data?.startsWith(hoje))
    const pedidosOntem = pedidos.filter(p => p.data?.startsWith(ontem))

    // Faturamento de hoje
    const faturamentoHoje = pedidosHoje.reduce((acc, pedido) => acc + (pedido.total || 0), 0)
    const faturamentoOntem = pedidosOntem.reduce((acc, pedido) => acc + (pedido.total || 0), 0)

    // Notas emitidas hoje
    const notasHoje = notasFiscais.filter(nf => nf.data_emissao?.startsWith(hoje))
    const notasOntem = notasFiscais.filter(nf => nf.data_emissao?.startsWith(ontem))

    // Itens vendidos hoje
    const itensHoje = itensPedidos.filter(item => item.data?.startsWith(hoje))
    const itensOntem = itensPedidos.filter(item => item.data?.startsWith(ontem))
    const totalItensHoje = itensHoje.reduce((acc, item) => acc + item.item_quantidade, 0)
    const totalItensOntem = itensOntem.reduce((acc, item) => acc + item.item_quantidade, 0)

    // Calcular percentuais de mudança
    const calcularMudanca = (hoje: number, ontem: number) => {
      if (ontem === 0) return hoje > 0 ? '+100%' : '0%'
      const percentual = ((hoje - ontem) / ontem) * 100
      return `${percentual >= 0 ? '+' : ''}${percentual.toFixed(1)}%`
    }

    const getTipoMudanca = (hoje: number, ontem: number): 'increase' | 'decrease' | 'neutral' => {
      if (hoje > ontem) return 'increase'
      if (hoje < ontem) return 'decrease'
      return 'neutral'
    }

    return [
      {
        title: 'Pedidos Hoje',
        value: pedidosHoje.length.toString(),
        change: calcularMudanca(pedidosHoje.length, pedidosOntem.length),
        changeType: getTipoMudanca(pedidosHoje.length, pedidosOntem.length),
        icon: ShoppingCart,
        color: 'bg-green-500'
      },
      {
        title: 'Faturamento Hoje',
        value: `R$ ${faturamentoHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        change: calcularMudanca(faturamentoHoje, faturamentoOntem),
        changeType: getTipoMudanca(faturamentoHoje, faturamentoOntem),
        icon: DollarSign,
        color: 'bg-blue-500'
      },
      {
        title: 'Notas Emitidas Hoje',
        value: notasHoje.length.toString(),
        change: calcularMudanca(notasHoje.length, notasOntem.length),
        changeType: getTipoMudanca(notasHoje.length, notasOntem.length),
        icon: FileText,
        color: 'bg-purple-500'
      },
      {
        title: 'Itens Vendidos Hoje',
        value: totalItensHoje.toString(),
        change: calcularMudanca(totalItensHoje, totalItensOntem),
        changeType: getTipoMudanca(totalItensHoje, totalItensOntem),
        icon: Package,
        color: 'bg-orange-500'
      },
      {
        title: 'Total Pedidos (30d)',
        value: pedidos.length.toString(),
        change: '30 dias',
        changeType: 'neutral' as const,
        icon: TrendingUp,
        color: 'bg-indigo-500'
      }
    ] as MetricCard[]
  }, [pedidos, notasFiscais, itensPedidos])

  // Alertas otimizados
  const alertas = useMemo(() => {
    const hoje = getToday()
    const alertasList = []

    // Pedidos de hoje sem nota fiscal
    const pedidosHojeSemNF = pedidos.filter(p => {
      const isPedidoHoje = p.data?.startsWith(hoje)
      const temNotaFiscal = notasFiscais.some(nf => nf.numero_pedido_loja === p.numeroloja)
      return isPedidoHoje && !temNotaFiscal && p.sitacao_bling === 9
    })

    pedidosHojeSemNF.forEach(p => {
      alertasList.push({
        tipo: 'nota_fiscal',
        mensagem: `Pedido ${p.numero} de hoje aguarda emissão de NF`,
        urgencia: 'alta' as const
      })
    })

    // Notas fiscais rejeitadas hoje
    const notasRejeitadasHoje = notasFiscais.filter(nf => 
      nf.data_emissao?.startsWith(hoje) && nf.situacao === 4
    )

    notasRejeitadasHoje.forEach(nf => {
      alertasList.push({
        tipo: 'nota_fiscal',
        mensagem: `Nota fiscal ${nf.id_nf} de hoje foi rejeitada`,
        urgencia: 'alta' as const
      })
    })

    return alertasList.slice(0, 5) // Limitar a 5 alertas
  }, [pedidos, notasFiscais])

  const handleRefresh = () => {
    toast.loading('Atualizando dados...', { duration: 1000 })
    fetchDashboardData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Carregando dados do dia...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com data atual */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard - {new Date().toLocaleDateString('pt-BR')}</h1>
            <p className="text-blue-100">
              Bem-vindo, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário'}!
            </p>
            <p className="text-blue-100">Dados atualizados em tempo real - Foco no dia atual</p>
          </div>
          <div className="text-right">
            <button
              onClick={handleRefresh}
              className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-400 px-4 py-2 rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Atualizar</span>
            </button>
            <p className="text-blue-200 text-sm mt-2">
              Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
            </p>
          </div>
        </div>
      </div>

      {/* Métricas principais - Foco no dia atual */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon
          return (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className={`h-4 w-4 ${
                      metric.changeType === 'increase' ? 'text-green-500' : 
                      metric.changeType === 'decrease' ? 'text-red-500' : 'text-gray-500'
                    }`} />
                    <span className={`text-sm ml-1 ${
                      metric.changeType === 'increase' ? 'text-green-600' : 
                      metric.changeType === 'decrease' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {metric.change}
                    </span>
                  </div>
                </div>
                <div className={`${metric.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alertas do Dia */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
              Alertas do Dia - {new Date().toLocaleDateString('pt-BR')}
            </h3>
            
            {alertas.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum alerta para hoje</p>
                <p className="text-sm text-gray-400 mt-1">Tudo funcionando perfeitamente!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alertas.map((alerta, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-lg border-l-4 ${
                      alerta.urgencia === 'alta' ? 'bg-red-50 border-red-500' :
                      alerta.urgencia === 'media' ? 'bg-yellow-50 border-yellow-500' :
                      'bg-blue-50 border-blue-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className={`font-medium ${
                        alerta.urgencia === 'alta' ? 'text-red-800' :
                        alerta.urgencia === 'media' ? 'text-yellow-800' :
                        'text-blue-800'
                      }`}>
                        {alerta.mensagem}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        alerta.urgencia === 'alta' ? 'bg-red-200 text-red-800' :
                        alerta.urgencia === 'media' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-blue-200 text-blue-800'
                      }`}>
                        {alerta.urgencia}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Resumo do Dia */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="h-5 w-5 text-blue-500 mr-2" />
              Resumo de Hoje
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Pedidos Processados</span>
                <span className="font-semibold text-blue-600">
                  {pedidos.filter(p => p.data?.startsWith(getToday())).length}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Notas Emitidas</span>
                <span className="font-semibold text-green-600">
                  {notasFiscais.filter(nf => nf.data_emissao?.startsWith(getToday())).length}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Itens Despachados</span>
                <span className="font-semibold text-purple-600">
                  {itensPedidos
                    .filter(item => item.data?.startsWith(getToday()))
                    .reduce((acc, item) => acc + item.item_quantidade, 0)
                  }
                </span>
              </div>
              
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-gray-600 font-medium">Faturamento do Dia</span>
                <span className="font-bold text-green-600 text-lg">
                  R$ {pedidos
                    .filter(p => p.data?.startsWith(getToday()))
                    .reduce((acc, p) => acc + (p.total || 0), 0)
                    .toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Últimos Pedidos do Dia */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Últimos Pedidos de Hoje</h3>
            
            {(() => {
              const pedidosHoje = pedidos.filter(p => p.data?.startsWith(getToday())).slice(0, 3)
              
              return pedidosHoje.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nenhum pedido registrado hoje</p>
              ) : (
                <div className="space-y-3">
                  {pedidosHoje.map((pedido) => (
                    <div key={pedido.id_key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">#{pedido.numero}</p>
                        <p className="text-sm text-gray-600">{pedido.contato_nome}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(pedido.data).toLocaleTimeString('pt-BR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          R$ {pedido.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          pedido.sitacao_bling === 9 ? 'bg-green-100 text-green-800' :
                          pedido.sitacao_bling === 12 ? 'bg-blue-100 text-blue-800' :
                          pedido.sitacao_bling === 1 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {pedido.sitacao_bling === 9 ? 'Atendido' :
                           pedido.sitacao_bling === 12 ? 'Verificado' :
                           pedido.sitacao_bling === 1 ? 'Pendente' :
                           `Situação ${pedido.sitacao_bling}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
