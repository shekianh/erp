
import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  Package, 
  BarChart3, 
  Calendar,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle,
  Target,
  Layers,
  Activity,
  Filter
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

interface ProdutoAnalise {
  sku_pai: string
  linha: string
  modelo: string
  cor: string
  total_estoque: number
  vendas_periodo: number
  demanda_media_diaria: number
  dias_estoque: number
  status_demanda: 'critico' | 'baixo' | 'normal' | 'alto'
  recomendacao: string
}

type PeriodoFiltro = '30dias' | '60dias' | '90dias' | 'mes_atual' | 'mes_anterior'

const AnalisedemandaPlanejamento: React.FC = () => {
  const [produtos, setProdutos] = useState<any[]>([])
  const [vendas, setVendas] = useState<any[]>([])
  const [estoque, setEstoque] = useState<any[]>([])
  const [analiseData, setAnaliseData] = useState<ProdutoAnalise[]>([])
  const [loading, setLoading] = useState(true)
  const [periodoFilter, setPeriodoFilter] = useState<PeriodoFiltro>('30dias')
  const [linhaFilter, setLinhaFilter] = useState('todos')

  const getDateRange = (periodo: PeriodoFiltro) => {
    const hoje = new Date()
    
    switch (periodo) {
      case '30dias':
        const inicio30 = new Date(hoje)
        inicio30.setDate(hoje.getDate() - 30)
        return {
          inicio: inicio30.toISOString().split('T')[0],
          fim: hoje.toISOString().split('T')[0],
          dias: 30
        }
      
      case '60dias':
        const inicio60 = new Date(hoje)
        inicio60.setDate(hoje.getDate() - 60)
        return {
          inicio: inicio60.toISOString().split('T')[0],
          fim: hoje.toISOString().split('T')[0],
          dias: 60
        }
      
      case '90dias':
        const inicio90 = new Date(hoje)
        inicio90.setDate(hoje.getDate() - 90)
        return {
          inicio: inicio90.toISOString().split('T')[0],
          fim: hoje.toISOString().split('T')[0],
          dias: 90
        }
      
      case 'mes_atual':
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
        const diasMes = hoje.getDate()
        return {
          inicio: inicioMes.toISOString().split('T')[0],
          fim: hoje.toISOString().split('T')[0],
          dias: diasMes
        }
      
      case 'mes_anterior':
        const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
        const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
        const diasMesAnterior = fimMesAnterior.getDate()
        return {
          inicio: inicioMesAnterior.toISOString().split('T')[0],
          fim: fimMesAnterior.toISOString().split('T')[0],
          dias: diasMesAnterior
        }
      
      default:
        return {
          inicio: hoje.toISOString().split('T')[0],
          fim: hoje.toISOString().split('T')[0],
          dias: 1
        }
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const { inicio, fim } = getDateRange(periodoFilter)
      
      // Buscar produtos
      const { data: produtosData, error: produtosError } = await supabase
        .from('produtos')
        .select('*')
        .order('created_at', { ascending: false })

      if (produtosError) {
        console.warn('Erro ao carregar produtos:', produtosError)
        setProdutos([])
      } else {
        setProdutos(produtosData || [])
      }

      // Buscar vendas do período
      const { data: vendasData, error: vendasError } = await supabase
        .from('item_pedido_vendas')
        .select('*')
        .gte('data', inicio)
        .lte('data', fim + 'T23:59:59')

      if (vendasError) {
        console.warn('Erro ao carregar vendas:', vendasError)
        setVendas([])
      } else {
        setVendas(vendasData || [])
      }

      // Buscar estoque (simulado - você pode ajustar conforme sua tabela de estoque)
      const { data: estoqueData, error: estoqueError } = await supabase
        .from('estoque')
        .select('*')

      if (estoqueError) {
        console.warn('Erro ao carregar estoque:', estoqueError)
        setEstoque([])
      } else {
        setEstoque(estoqueData || [])
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados para análise')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [periodoFilter])

  // Função para extrair SKU pai do código de venda
  const extrairSkuPai = (codigo: string) => {
    // Remove o tamanho do final (ex: 203.025.011-34 -> 203.025.011)
    if (codigo && codigo.includes('-')) {
      return codigo.split('-')[0]
    }
    return codigo
  }

  // Análise de demanda
  const analiseCompleta = useMemo(() => {
    const { dias } = getDateRange(periodoFilter)
    
    // Agrupar produtos por SKU pai
    const produtosPorSku = produtos.reduce((acc, produto) => {
      const skuPai = produto.sku_pai
      if (!acc[skuPai]) {
        acc[skuPai] = {
          sku_pai: skuPai,
          linha: produto.linha,
          modelo: produto.modelo,
          cor: produto.cor,
          produtos: []
        }
      }
      acc[skuPai].produtos.push(produto)
      return acc
    }, {} as Record<string, any>)

    // Calcular vendas por SKU pai
    const vendasPorSku = vendas.reduce((acc, venda) => {
      const skuPai = extrairSkuPai(venda.item_codigo)
      if (!acc[skuPai]) {
        acc[skuPai] = 0
      }
      acc[skuPai] += venda.item_quantidade
      return acc
    }, {} as Record<string, number>)

    // Calcular estoque por SKU pai
    const estoquePorSku = estoque.reduce((acc, item) => {
      const skuPai = extrairSkuPai(item.codigo || item.sku || '')
      if (!acc[skuPai]) {
        acc[skuPai] = 0
      }
      acc[skuPai] += item.quantidade || 0
      return acc
    }, {} as Record<string, number>)

    // Gerar análise completa
    const analise: ProdutoAnalise[] = Object.values(produtosPorSku).map((produto: any) => {
      const skuPai = produto.sku_pai
      const vendasPeriodo = vendasPorSku[skuPai] || 0
      const totalEstoque = estoquePorSku[skuPai] || 0
      const demandaMediaDiaria = vendasPeriodo / dias
      const diasEstoque = demandaMediaDiaria > 0 ? totalEstoque / demandaMediaDiaria : Infinity

      let status_demanda: 'critico' | 'baixo' | 'normal' | 'alto'
      let recomendacao: string

      if (diasEstoque <= 7) {
        status_demanda = 'critico'
        recomendacao = 'URGENTE: Reabastecer imediatamente'
      } else if (diasEstoque <= 15) {
        status_demanda = 'baixo'
        recomendacao = 'Programar reabastecimento em breve'
      } else if (diasEstoque <= 30) {
        status_demanda = 'normal'
        recomendacao = 'Estoque adequado, monitorar'
      } else {
        status_demanda = 'alto'
        recomendacao = 'Estoque alto, considerar promoção'
      }

      return {
        sku_pai: skuPai,
        linha: produto.linha,
        modelo: produto.modelo,
        cor: produto.cor,
        total_estoque: totalEstoque,
        vendas_periodo: vendasPeriodo,
        demanda_media_diaria: demandaMediaDiaria,
        dias_estoque: diasEstoque,
        status_demanda,
        recomendacao
      }
    })

    return analise.sort((a, b) => a.dias_estoque - b.dias_estoque)
  }, [produtos, vendas, estoque, periodoFilter])

  // Filtrar por linha
  const analiseFilteredData = useMemo(() => {
    if (linhaFilter === 'todos') {
      return analiseCompleta
    }
    return analiseCompleta.filter(item => item.linha === linhaFilter)
  }, [analiseCompleta, linhaFilter])

  // Estatísticas gerais
  const estatisticas = useMemo(() => {
    const totalProdutos = analiseFilteredData.length
    const criticos = analiseFilteredData.filter(p => p.status_demanda === 'critico').length
    const baixos = analiseFilteredData.filter(p => p.status_demanda === 'baixo').length
    const normais = analiseFilteredData.filter(p => p.status_demanda === 'normal').length
    const altos = analiseFilteredData.filter(p => p.status_demanda === 'alto').length

    return {
      totalProdutos,
      criticos,
      baixos,
      normais,
      altos
    }
  }, [analiseFilteredData])

  const linhasUnicas = [...new Set(produtos.map(p => p.linha).filter(Boolean))]

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critico': return 'bg-red-100 text-red-800'
      case 'baixo': return 'bg-yellow-100 text-yellow-800'
      case 'normal': return 'bg-green-100 text-green-800'
      case 'alto': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleRefresh = () => {
    toast.loading('Atualizando análise...', { duration: 1000 })
    fetchData()
  }

  const handleExportar = () => {
    toast.success('Funcionalidade de exportação em desenvolvimento')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Analisando demanda...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Análise de Demanda</h1>
          <p className="text-gray-600">Dashboard de planejamento - {getPeriodoTexto()}</p>
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

      {/* Filtros */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Filter className="h-5 w-5 text-blue-500 mr-2" />
          Filtros de Análise
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Período */}
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <button
                onClick={() => setPeriodoFilter('30dias')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  periodoFilter === '30dias' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                30 Dias
              </button>
              <button
                onClick={() => setPeriodoFilter('60dias')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  periodoFilter === '60dias' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                60 Dias
              </button>
              <button
                onClick={() => setPeriodoFilter('90dias')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  periodoFilter === '90dias' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                90 Dias
              </button>
              <button
                onClick={() => setPeriodoFilter('mes_atual')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  periodoFilter === 'mes_atual' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Mês Atual
              </button>
              <button
                onClick={() => setPeriodoFilter('mes_anterior')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  periodoFilter === 'mes_anterior' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Mês Anterior
              </button>
            </div>
          </div>

          {/* Linha */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Linha de Produto</label>
            <select
              value={linhaFilter}
              onChange={(e) => setLinhaFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todos">Todas as Linhas</option>
              {linhasUnicas.map(linha => (
                <option key={linha} value={linha}>{linha}</option>
              ))}
            </select>
          </div>

          {/* Resultados */}
          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              {analiseFilteredData.length} produtos analisados
            </div>
          </div>
        </div>
      </div>

      {/* Estatísticas de Status */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Produtos</p>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.totalProdutos}</p>
            </div>
            <Package className="h-8 w-8 text-blue-500" />
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
              <p className="text-sm text-gray-600">Críticos</p>
              <p className="text-2xl font-bold text-red-600">{estatisticas.criticos}</p>
              <p className="text-xs text-gray-500">≤ 7 dias estoque</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
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
              <p className="text-sm text-gray-600">Baixos</p>
              <p className="text-2xl font-bold text-yellow-600">{estatisticas.baixos}</p>
              <p className="text-xs text-gray-500">8-15 dias estoque</p>
            </div>
            <Target className="h-8 w-8 text-yellow-500" />
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
              <p className="text-sm text-gray-600">Normais</p>
              <p className="text-2xl font-bold text-green-600">{estatisticas.normais}</p>
              <p className="text-xs text-gray-500">16-30 dias estoque</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Altos</p>
              <p className="text-2xl font-bold text-blue-600">{estatisticas.altos}</p>
              <p className="text-xs text-gray-500">Mais de 30 dias estoque</p>
            </div>
            <Layers className="h-8 w-8 text-blue-500" />
          </div>
        </motion.div>
      </div>

      {/* Tabela de Análise */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Activity className="h-5 w-5 text-blue-500 mr-2" />
            Análise Detalhada por Produto
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produto
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU Pai
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estoque Atual
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendas Período
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Demanda Diária
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dias de Estoque
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recomendação
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analiseFilteredData.map((item, index) => (
                <motion.tr
                  key={item.sku_pai}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {item.linha} - {item.modelo}
                      </div>
                      <div className="text-sm text-gray-500">{item.cor}</div>
                    </div>
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {item.sku_pai}
                  </td>

                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {item.total_estoque}
                  </td>

                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {item.vendas_periodo}
                  </td>

                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {item.demanda_media_diaria.toFixed(1)}
                  </td>

                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {item.dias_estoque === Infinity ? '∞' : Math.round(item.dias_estoque)}
                  </td>

                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status_demanda)}`}>
                      {item.status_demanda.toUpperCase()}
                    </span>
                  </td>

                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.recomendacao}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {analiseFilteredData.length === 0 && (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum dado para análise</h3>
            <p className="text-gray-500">Verifique se há produtos, vendas e estoque cadastrados.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AnalisedemandaPlanejamento
