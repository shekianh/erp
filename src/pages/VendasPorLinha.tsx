
import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  Package, 
  TrendingUp, 
  DollarSign, 
  BarChart3,
  Calendar,
  RefreshCw,
  Download,
  Tag
} from 'lucide-react'
import { supabase, ItemPedidoVendas } from '../lib/supabase'
import toast from 'react-hot-toast'

type PeriodoFiltro = '30dias' | '60dias' | '90dias' | 'mes_atual' | 'mes_anterior'

const VendasPorLinha: React.FC = () => {
  const [itensPedidos, setItensPedidos] = useState<ItemPedidoVendas[]>([])
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
      toast.error('Erro ao carregar dados de vendas por linha')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [periodoFilter])

  // Função para extrair linha do produto (primeira parte do código ou descrição)
  const extrairLinhaProduto = (codigo: string, descricao: string) => {
    // Tentar extrair linha do código (ex: "TENIS-123" -> "TENIS")
    if (codigo) {
      const partes = codigo.split('-')
      if (partes.length > 1) {
        return partes[0].toUpperCase()
      }
      
      // Se não tem hífen, pegar primeiros caracteres não numéricos
      const match = codigo.match(/^[A-Za-z]+/)
      if (match) {
        return match[0].toUpperCase()
      }
    }

    // Tentar extrair da descrição
    if (descricao) {
      const palavras = descricao.split(' ')
      if (palavras.length > 0) {
        const primeiraPalavra = palavras[0].toUpperCase()
        
        // Verificar se é uma categoria conhecida
        const categoriasConhecidas = [
          'TENIS', 'SAPATO', 'SANDALIA', 'BOTA', 'CHINELO',
          'SAPATENIS', 'MOCASSIM', 'OXFORD', 'SOCIAL', 'CASUAL',
          'ESPORTIVO', 'FEMININO', 'MASCULINO', 'INFANTIL'
        ]
        
        for (const categoria of categoriasConhecidas) {
          if (primeiraPalavra.includes(categoria) || categoria.includes(primeiraPalavra)) {
            return categoria
          }
        }
        
        return primeiraPalavra
      }
    }

    return 'OUTROS'
  }

  // Agrupar vendas por linha de produto
  const vendasPorLinha = useMemo(() => {
    const linhas = itensPedidos.reduce((acc, item) => {
      const linha = extrairLinhaProduto(item.item_codigo, item.item_descricao)
      
      if (!acc[linha]) {
        acc[linha] = {
          linha,
          quantidade: 0,
          faturamento: 0,
          itensUnicos: new Set(),
          pedidos: new Set(),
          precoMedio: 0
        }
      }

      acc[linha].quantidade += item.item_quantidade
      acc[linha].faturamento += item.item_valor * item.item_quantidade
      acc[linha].itensUnicos.add(item.item_codigo)
      acc[linha].pedidos.add(item.numero)

      return acc
    }, {} as Record<string, {
      linha: string;
      quantidade: number;
      faturamento: number;
      itensUnicos: Set<string>;
      pedidos: Set<string>;
      precoMedio: number;
    }>)

    // Calcular preço médio e converter Sets para números
    return Object.values(linhas)
      .map(linha => ({
        ...linha,
        itensUnicos: linha.itensUnicos.size,
        pedidos: linha.pedidos.size,
        precoMedio: linha.quantidade > 0 ? linha.faturamento / linha.quantidade : 0
      }))
      .sort((a, b) => b.faturamento - a.faturamento)
  }, [itensPedidos])

  // Estatísticas gerais
  const estatisticas = useMemo(() => {
    const totalLinhas = vendasPorLinha.length
    const faturamentoTotal = vendasPorLinha.reduce((acc, linha) => acc + linha.faturamento, 0)
    const quantidadeTotal = vendasPorLinha.reduce((acc, linha) => acc + linha.quantidade, 0)
    const itensUnicosTotal = vendasPorLinha.reduce((acc, linha) => acc + linha.itensUnicos, 0)

    return {
      totalLinhas,
      faturamentoTotal,
      quantidadeTotal,
      itensUnicosTotal
    }
  }, [vendasPorLinha])

  // Top 5 linhas
  const topLinhas = useMemo(() => {
    return vendasPorLinha.slice(0, 5)
  }, [vendasPorLinha])

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
        <span className="ml-3 text-gray-600">Carregando vendas por linha...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendas por Linha de Produto</h1>
          <p className="text-gray-600">Análise de performance por categoria - {getPeriodoTexto()}</p>
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
              <p className="text-sm text-gray-600">Linhas Ativas</p>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.totalLinhas}</p>
            </div>
            <Tag className="h-8 w-8 text-blue-500" />
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
              <p className="text-sm text-gray-600">Quantidade Vendida</p>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.quantidadeTotal}</p>
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
              <p className="text-sm text-gray-600">Produtos Únicos</p>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.itensUnicosTotal}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-orange-500" />
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 5 Linhas */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 text-gold-500 mr-2" />
            Top 5 Linhas
          </h3>
          
          <div className="space-y-4">
            {topLinhas.map((linha, index) => (
              <motion.div
                key={linha.linha}
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
                      <span className="font-medium text-gray-900">{linha.linha}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {linha.quantidade} unidades • {linha.itensUnicos} produtos
                    </p>
                    <p className="text-xs text-gray-500">
                      Preço médio: R$ {linha.precoMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      R$ {linha.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-gray-600">
                      {((linha.faturamento / estatisticas.faturamentoTotal) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Lista Completa de Linhas */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Package className="h-5 w-5 text-blue-500 mr-2" />
            Performance Completa por Linha
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Posição
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Linha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantidade
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produtos
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pedidos
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Faturamento
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preço Médio
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vendasPorLinha.map((linha, index) => (
                  <motion.tr
                    key={linha.linha}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{index + 1}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{linha.linha}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {linha.quantidade}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {linha.itensUnicos}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {linha.pedidos}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      R$ {linha.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      R$ {linha.precoMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {((linha.faturamento / estatisticas.faturamentoTotal) * 100).toFixed(1)}%
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {vendasPorLinha.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum dado encontrado</h3>
              <p className="text-gray-500">Não há vendas registradas para o período selecionado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VendasPorLinha
