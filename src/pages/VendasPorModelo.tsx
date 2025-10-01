
import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  Package, 
  TrendingUp, 
  DollarSign, 
  Star,
  Calendar,
  RefreshCw,
  Download,
  Search,
  Filter
} from 'lucide-react'
import { supabase, ItemPedidoVendas } from '../lib/supabase'
import toast from 'react-hot-toast'

type PeriodoFiltro = '30dias' | '60dias' | '90dias' | 'mes_atual' | 'mes_anterior'

const VendasPorModelo: React.FC = () => {
  const [itensPedidos, setItensPedidos] = useState<ItemPedidoVendas[]>([])
  const [loading, setLoading] = useState(true)
  const [periodoFilter, setPeriodoFilter] = useState<PeriodoFiltro>('30dias')
  const [searchTerm, setSearchTerm] = useState('')
  const [linhaFilter, setLinhaFilter] = useState('todos')

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
      
      const { data: itensData, error } = await supabase
        .from('item_pedido_vendas')
        .select('*')
        .gte('data', inicio)
        .lte('data', fim + 'T23:59:59')
        .order('data', { ascending: false })

      if (error) {
        console.warn('Erro ao carregar itens:', error)
        setItensPedidos([])
      } else {
        setItensPedidos(itensData || [])
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados de vendas por modelo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [periodoFilter])

  // Função para extrair linha do produto
  const extrairLinhaProduto = (codigo: string, descricao: string) => {
    if (codigo) {
      const partes = codigo.split('-')
      if (partes.length > 1) {
        return partes[0].toUpperCase()
      }
      
      const match = codigo.match(/^[A-Za-z]+/)
      if (match) {
        return match[0].toUpperCase()
      }
    }

    if (descricao) {
      const palavras = descricao.split(' ')
      if (palavras.length > 0) {
        return palavras[0].toUpperCase()
      }
    }

    return 'OUTROS'
  }

  // Agrupar vendas por modelo específico
  const vendasPorModelo = useMemo(() => {
    const modelos = itensPedidos.reduce((acc, item) => {
      const codigo = item.item_codigo
      const descricao = item.item_descricao
      const linha = extrairLinhaProduto(codigo, descricao)
      
      if (!acc[codigo]) {
        acc[codigo] = {
          codigo,
          descricao,
          linha,
          quantidade: 0,
          faturamento: 0,
          pedidos: new Set(),
          precoUnitario: item.item_valor,
          ultimaVenda: item.data
        }
      }

      acc[codigo].quantidade += item.item_quantidade
      acc[codigo].faturamento += item.item_valor * item.item_quantidade
      acc[codigo].pedidos.add(item.numero)
      
      // Atualizar última venda se for mais recente
      if (new Date(item.data) > new Date(acc[codigo].ultimaVenda)) {
        acc[codigo].ultimaVenda = item.data
        acc[codigo].precoUnitario = item.item_valor
      }

      return acc
    }, {} as Record<string, {
      codigo: string;
      descricao: string;
      linha: string;
      quantidade: number;
      faturamento: number;
      pedidos: Set<string>;
      precoUnitario: number;
      ultimaVenda: string;
    }>)

    // Converter Sets para números e ordenar por faturamento
    return Object.values(modelos)
      .map(modelo => ({
        ...modelo,
        pedidos: modelo.pedidos.size,
        frequenciaVenda: modelo.pedidos.size / itensPedidos.filter(item => item.item_codigo === modelo.codigo).length
      }))
      .sort((a, b) => b.faturamento - a.faturamento)
  }, [itensPedidos])

  // Aplicar filtros
  const modelosFiltrados = useMemo(() => {
    return vendasPorModelo.filter(modelo => {
      const matchesSearch = modelo.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           modelo.descricao.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesLinha = linhaFilter === 'todos' || modelo.linha === linhaFilter
      
      return matchesSearch && matchesLinha
    })
  }, [vendasPorModelo, searchTerm, linhaFilter])

  // Estatísticas gerais
  const estatisticas = useMemo(() => {
    const totalModelos = modelosFiltrados.length
    const faturamentoTotal = modelosFiltrados.reduce((acc, modelo) => acc + modelo.faturamento, 0)
    const quantidadeTotal = modelosFiltrados.reduce((acc, modelo) => acc + modelo.quantidade, 0)
    const pedidosTotal = modelosFiltrados.reduce((acc, modelo) => acc + modelo.pedidos, 0)

    return {
      totalModelos,
      faturamentoTotal,
      quantidadeTotal,
      pedidosTotal
    }
  }, [modelosFiltrados])

  // Top 5 modelos
  const topModelos = useMemo(() => {
    return modelosFiltrados.slice(0, 5)
  }, [modelosFiltrados])

  // Linhas disponíveis para filtro
  const linhasDisponiveis = useMemo(() => {
    const linhas = Array.from(new Set(vendasPorModelo.map(modelo => modelo.linha)))
    return linhas.sort()
  }, [vendasPorModelo])

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
        <span className="ml-3 text-gray-600">Carregando vendas por modelo...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendas por Modelo</h1>
          <p className="text-gray-600">Análise detalhada por produto específico - {getPeriodoTexto()}</p>
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
          Filtros e Período
        </h3>
        
        {/* Período */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
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

        {/* Busca e Filtro por Linha */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar por código ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={linhaFilter}
            onChange={(e) => setLinhaFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="todos">Todas as Linhas</option>
            {linhasDisponiveis.map(linha => (
              <option key={linha} value={linha}>{linha}</option>
            ))}
          </select>

          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-600">
              {modelosFiltrados.length} modelos encontrados
            </span>
          </div>
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
              <p className="text-sm text-gray-600">Modelos</p>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.totalModelos}</p>
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
              <p className="text-sm text-gray-600">Faturamento</p>
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
              <p className="text-sm text-gray-600">Quantidade</p>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.quantidadeTotal}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
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
              <p className="text-sm text-gray-600">Pedidos</p>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.pedidosTotal}</p>
            </div>
            <Star className="h-8 w-8 text-orange-500" />
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 5 Modelos */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Star className="h-5 w-5 text-gold-500 mr-2" />
            Top 5 Modelos
          </h3>
          
          <div className="space-y-4">
            {topModelos.map((modelo, index) => (
              <motion.div
                key={modelo.codigo}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg ${
                  index === 0 ? 'bg-yellow-50 border border-yellow-200' :
                  index === 1 ? 'bg-gray-50 border border-gray-200' :
                  index === 2 ? 'bg-orange-50 border border-orange-200' :
                  'bg-blue-50 border border-blue-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-lg font-bold ${
                        index === 0 ? 'text-yellow-600' :
                        index === 1 ? 'text-gray-600' :
                        index === 2 ? 'text-orange-600' :
                        'text-blue-600'
                      }`}>
                        #{index + 1}
                      </span>
                      <span className="font-medium text-gray-900">{modelo.codigo}</span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{modelo.descricao}</p>
                    <p className="text-xs text-gray-500">
                      {modelo.quantidade} unidades • {modelo.pedidos} pedidos
                    </p>
                    <p className="text-xs text-gray-500">
                      Linha: {modelo.linha}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      R$ {modelo.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-gray-600">
                      {((modelo.faturamento / estatisticas.faturamentoTotal) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Lista Completa de Modelos */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Package className="h-5 w-5 text-blue-500 mr-2" />
            Ranking Completo por Modelo
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Modelo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Linha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qtd
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pedidos
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preço
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Faturamento
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    %
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {modelosFiltrados.slice(0, 50).map((modelo, index) => (
                  <motion.tr
                    key={modelo.codigo}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{modelo.codigo}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{modelo.descricao}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {modelo.linha}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {modelo.quantidade}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {modelo.pedidos}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      R$ {modelo.precoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      R$ {modelo.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {((modelo.faturamento / estatisticas.faturamentoTotal) * 100).toFixed(1)}%
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {modelosFiltrados.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum modelo encontrado</h3>
              <p className="text-gray-500">Tente ajustar os filtros ou o período selecionado.</p>
            </div>
          )}

          {modelosFiltrados.length > 50 && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">
                Mostrando os primeiros 50 resultados de {modelosFiltrados.length} modelos
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VendasPorModelo
