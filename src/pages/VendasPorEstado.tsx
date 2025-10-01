
import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  MapPin, 
  TrendingUp, 
  DollarSign, 
  Package,
  Calendar,
  RefreshCw,
  Download,
  Map
} from 'lucide-react'
import { supabase, PedidoVendas } from '../lib/supabase'
import toast from 'react-hot-toast'

type PeriodoFiltro = '30dias' | '60dias' | '90dias' | 'mes_atual' | 'mes_anterior'

const VendasPorEstado: React.FC = () => {
  const [pedidos, setPedidos] = useState<PedidoVendas[]>([])
  const [loading, setLoading] = useState(true)
  const [periodoFilter, setPeriodoFilter] = useState<PeriodoFiltro>('30dias')

  const getDateRange = (periodo: PeriodoFiltro) => {
    const hoje = new Date()
    
    switch (periodo) {
      case '30dias':
        const inicio30 = new Date(hoje)
        inicio30.setDate(hoje.getDate() - 30)
        return {
          inicio: inicio30.toISOString().split('T')[0],
          fim: hoje.toISOString().split('T')[0]
        }
      
      case '60dias':
        const inicio60 = new Date(hoje)
        inicio60.setDate(hoje.getDate() - 60)
        return {
          inicio: inicio60.toISOString().split('T')[0],
          fim: hoje.toISOString().split('T')[0]
        }
      
      case '90dias':
        const inicio90 = new Date(hoje)
        inicio90.setDate(hoje.getDate() - 90)
        return {
          inicio: inicio90.toISOString().split('T')[0],
          fim: hoje.toISOString().split('T')[0]
        }
      
      case 'mes_atual':
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
        return {
          inicio: inicioMes.toISOString().split('T')[0],
          fim: hoje.toISOString().split('T')[0]
        }
      
      case 'mes_anterior':
        const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
        const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
        return {
          inicio: inicioMesAnterior.toISOString().split('T')[0],
          fim: fimMesAnterior.toISOString().split('T')[0]
        }
      
      default:
        return {
          inicio: hoje.toISOString().split('T')[0],
          fim: hoje.toISOString().split('T')[0]
        }
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const { inicio, fim } = getDateRange(periodoFilter)
      
      const { data: pedidosData, error } = await supabase
        .from('pedido_vendas')
        .select('*')
        .gte('data', inicio)
        .lte('data', fim + 'T23:59:59')
        .order('data', { ascending: false })

      if (error) {
        console.warn('Erro ao carregar pedidos:', error)
        setPedidos([])
      } else {
        setPedidos(pedidosData || [])
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados de vendas por estado')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [periodoFilter])

  // Extrair UF do endereço e agrupar vendas
  const vendasPorEstado = useMemo(() => {
    const estados = pedidos.reduce((acc, pedido) => {
      // Extrair UF do campo etiqueta_uf ou tentar do endereço
      let uf = pedido.etiqueta_uf || 'Não informado'
      
      // Se não tiver UF na etiqueta, tentar extrair do JSON do pedido
      if (!uf || uf === 'Não informado') {
        try {
          const jsonPedido = JSON.parse(pedido.json_pedido || '{}')
          uf = jsonPedido.endereco?.uf || jsonPedido.contato?.endereco?.uf || 'Não informado'
        } catch (e) {
          uf = 'Não informado'
        }
      }

      if (!acc[uf]) {
        acc[uf] = {
          uf,
          pedidos: 0,
          faturamento: 0,
          clientes: new Set(),
          ticketMedio: 0
        }
      }

      acc[uf].pedidos += 1
      acc[uf].faturamento += pedido.total || 0
      acc[uf].clientes.add(pedido.contato_id)

      return acc
    }, {} as Record<string, {
      uf: string;
      pedidos: number;
      faturamento: number;
      clientes: Set<string>;
      ticketMedio: number;
    }>)

    // Calcular ticket médio e converter Set para número
    return Object.values(estados)
      .map(estado => ({
        ...estado,
        clientes: estado.clientes.size,
        ticketMedio: estado.pedidos > 0 ? estado.faturamento / estado.pedidos : 0
      }))
      .sort((a, b) => b.faturamento - a.faturamento)
  }, [pedidos])

  // Estatísticas gerais
  const estatisticas = useMemo(() => {
    const totalEstados = vendasPorEstado.length
    const faturamentoTotal = vendasPorEstado.reduce((acc, estado) => acc + estado.faturamento, 0)
    const totalPedidos = vendasPorEstado.reduce((acc, estado) => acc + estado.pedidos, 0)
    const totalClientes = vendasPorEstado.reduce((acc, estado) => acc + estado.clientes, 0)

    return {
      totalEstados,
      faturamentoTotal,
      totalPedidos,
      totalClientes
    }
  }, [vendasPorEstado])

  // Estados com maior crescimento (simulado - seria necessário dados históricos)
  const estadosDestaque = useMemo(() => {
    return vendasPorEstado.slice(0, 3)
  }, [vendasPorEstado])

  const getPeriodoTexto = () => {
    switch (periodoFilter) {
      case '30dias': return 'Últimos 30 dias'
      case '60dias': return 'Últimos 60 dias'
      case '90dias': return 'Últimos 90 dias'
      case 'mes_atual': return 'Mês atual'
      case 'mes_anterior': return 'Mês anterior'
      default: return 'Período selecionado'
    }
  }

  const getEstadoNome = (uf: string) => {
    const estados: { [key: string]: string } = {
      'AC': 'Acre',
      'AL': 'Alagoas',
      'AP': 'Amapá',
      'AM': 'Amazonas',
      'BA': 'Bahia',
      'CE': 'Ceará',
      'DF': 'Distrito Federal',
      'ES': 'Espírito Santo',
      'GO': 'Goiás',
      'MA': 'Maranhão',
      'MT': 'Mato Grosso',
      'MS': 'Mato Grosso do Sul',
      'MG': 'Minas Gerais',
      'PA': 'Pará',
      'PB': 'Paraíba',
      'PR': 'Paraná',
      'PE': 'Pernambuco',
      'PI': 'Piauí',
      'RJ': 'Rio de Janeiro',
      'RN': 'Rio Grande do Norte',
      'RS': 'Rio Grande do Sul',
      'RO': 'Rondônia',
      'RR': 'Roraima',
      'SC': 'Santa Catarina',
      'SP': 'São Paulo',
      'SE': 'Sergipe',
      'TO': 'Tocantins'
    }
    return estados[uf] || uf
  }

  const handleRefresh = () => {
    toast.loading('Atualizando dados...', { duration: 1000 })
    fetchData()
  }

  const handleExportar = () => {
    toast.success('Funcionalidade de exportação em desenvolvimento')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Carregando vendas por estado...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendas por Estado</h1>
          <p className="text-gray-600">Análise geográfica de vendas - {getPeriodoTexto()}</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Atualizar
          </button>
          <button
            onClick={handleExportar}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-5 w-5 mr-2" />
            Exportar
          </button>
        </div>
      </div>

      {/* Filtro de Período */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 text-blue-500 mr-2" />
          Período de Análise
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <button
            onClick={() => setPeriodoFilter('30dias')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              periodoFilter === '30dias' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            30 Dias
          </button>
          <button
            onClick={() => setPeriodoFilter('60dias')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              periodoFilter === '60dias' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            60 Dias
          </button>
          <button
            onClick={() => setPeriodoFilter('90dias')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              periodoFilter === '90dias' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            90 Dias
          </button>
          <button
            onClick={() => setPeriodoFilter('mes_atual')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              periodoFilter === 'mes_atual' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Mês Atual
          </button>
          <button
            onClick={() => setPeriodoFilter('mes_anterior')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              periodoFilter === 'mes_anterior' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Mês Anterior
          </button>
        </div>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Estados Ativos</p>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.totalEstados}</p>
            </div>
            <Map className="h-8 w-8 text-blue-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Faturamento Total</p>
              <p className="text-2xl font-bold text-gray-900">
                R$ {estatisticas.faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Pedidos</p>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.totalPedidos}</p>
            </div>
            <Package className="h-8 w-8 text-purple-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Clientes Únicos</p>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.totalClientes}</p>
            </div>
            <MapPin className="h-8 w-8 text-orange-500" />
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 3 Estados */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 text-gold-500 mr-2" />
            Estados Destaque
          </h3>
          
          <div className="space-y-4">
            {estadosDestaque.map((estado, index) => (
              <motion.div
                key={estado.uf}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg ${
                  index === 0 ? 'bg-yellow-50 border border-yellow-200' :
                  index === 1 ? 'bg-gray-50 border border-gray-200' :
                  'bg-orange-50 border border-orange-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-lg font-bold ${
                        index === 0 ? 'text-yellow-600' :
                        index === 1 ? 'text-gray-600' :
                        'text-orange-600'
                      }`}>
                        #{index + 1}
                      </span>
                      <span className="font-medium text-gray-900">{estado.uf}</span>
                    </div>
                    <p className="text-sm text-gray-600">{getEstadoNome(estado.uf)}</p>
                    <p className="text-xs text-gray-500">{estado.pedidos} pedidos • {estado.clientes} clientes</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      R$ {estado.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-gray-600">
                      {((estado.faturamento / estatisticas.faturamentoTotal) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Lista Completa de Estados */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MapPin className="h-5 w-5 text-blue-500 mr-2" />
            Ranking Completo por Estado
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Posição
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pedidos
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clientes
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Faturamento
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket Médio
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vendasPorEstado.map((estado, index) => (
                  <motion.tr
                    key={estado.uf}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{index + 1}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{estado.uf}</div>
                        <div className="text-sm text-gray-500">{getEstadoNome(estado.uf)}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {estado.pedidos}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {estado.clientes}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      R$ {estado.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      R$ {estado.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {((estado.faturamento / estatisticas.faturamentoTotal) * 100).toFixed(1)}%
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {vendasPorEstado.length === 0 && (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum dado encontrado</h3>
              <p className="text-gray-500">Não há vendas registradas para o período selecionado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VendasPorEstado
