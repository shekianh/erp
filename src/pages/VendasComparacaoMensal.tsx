
import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Calendar,
  RefreshCw,
  Download,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'
import { supabase, PedidoVendas, ItemPedidoVendas } from '../lib/supabase'
import toast from 'react-hot-toast'

interface MesComparacao {
  mes: string
  ano: number
  pedidos: number
  faturamento: number
  quantidade: number
  ticketMedio: number
}

interface LinhaComparacao {
  linha: string
  meses: Record<string, {
    faturamento: number
    quantidade: number
    crescimento: number
  }>
}

const VendasComparacaoMensal: React.FC = () => {
  const [pedidos, setPedidos] = useState<PedidoVendas[]>([])
  const [itensPedidos, setItensPedidos] = useState<ItemPedidoVendas[]>([])
  const [loading, setLoading] = useState(true)
  const [mesesParaComparar, setMesesParaComparar] = useState(6) // Últimos 6 meses

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Buscar dados dos últimos 12 meses para ter margem para comparação
      const hoje = new Date()
      const inicioAno = new Date(hoje.getFullYear() - 1, hoje.getMonth(), 1)
      const inicio = inicioAno.toISOString().split('T')[0]
      const fim = hoje.toISOString().split('T')[0]
      
      const [pedidosData, itensData] = await Promise.all([
        supabase
          .from('pedido_vendas')
          .select('*')
          .gte('data', inicio)
          .lte('data', fim + 'T23:59:59')
          .order('data', { ascending: false }),
        
        supabase
          .from('item_pedido_vendas')
          .select('*')
          .gte('data', inicio)
          .lte('data', fim + 'T23:59:59')
          .order('data', { ascending: false })
      ])

      setPedidos(pedidosData.data || [])
      setItensPedidos(itensData.data || [])

      if (pedidosData.error) console.warn('Erro ao carregar pedidos:', pedidosData.error)
      if (itensData.error) console.warn('Erro ao carregar itens:', itensData.error)

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados de comparação mensal')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Gerar lista dos últimos meses
  const ultimosMeses = useMemo(() => {
    const meses = []
    const hoje = new Date()
    
    for (let i = mesesParaComparar - 1; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      meses.push({
        chave: `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`,
        nome: data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        ano: data.getFullYear(),
        mes: data.getMonth() + 1
      })
    }
    
    return meses
  }, [mesesParaComparar])

  // Comparação mensal geral
  const comparacaoMensal = useMemo(() => {
    return ultimosMeses.map(mesInfo => {
      const pedidosDoMes = pedidos.filter(pedido => {
        const dataPedido = new Date(pedido.data)
        return dataPedido.getFullYear() === mesInfo.ano && 
               dataPedido.getMonth() + 1 === mesInfo.mes
      })

      const itensDoMes = itensPedidos.filter(item => {
        const dataItem = new Date(item.data)
        return dataItem.getFullYear() === mesInfo.ano && 
               dataItem.getMonth() + 1 === mesInfo.mes
      })

      const faturamento = pedidosDoMes.reduce((acc, p) => acc + (p.total || 0), 0)
      const quantidade = itensDoMes.reduce((acc, item) => acc + item.item_quantidade, 0)
      const ticketMedio = pedidosDoMes.length > 0 ? faturamento / pedidosDoMes.length : 0

      return {
        mes: mesInfo.nome,
        chave: mesInfo.chave,
        ano: mesInfo.ano,
        pedidos: pedidosDoMes.length,
        faturamento,
        quantidade,
        ticketMedio
      }
    })
  }, [ultimosMeses, pedidos, itensPedidos])

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

  // Comparação por linha de produto
  const comparacaoPorLinha = useMemo(() => {
    // Primeiro, identificar todas as linhas
    const todasLinhas = Array.from(new Set(
      itensPedidos.map(item => extrairLinhaProduto(item.item_codigo, item.item_descricao))
    ))

    return todasLinhas.map(linha => {
      const dadosPorMes: Record<string, { faturamento: number; quantidade: number; crescimento: number }> = {}

      ultimosMeses.forEach((mesInfo, index) => {
        const itensDoMes = itensPedidos.filter(item => {
          const dataItem = new Date(item.data)
          const linhaProduto = extrairLinhaProduto(item.item_codigo, item.item_descricao)
          return dataItem.getFullYear() === mesInfo.ano && 
                 dataItem.getMonth() + 1 === mesInfo.mes &&
                 linhaProduto === linha
        })

        const faturamento = itensDoMes.reduce((acc, item) => acc + (item.item_valor * item.item_quantidade), 0)
        const quantidade = itensDoMes.reduce((acc, item) => acc + item.item_quantidade, 0)

        // Calcular crescimento em relação ao mês anterior
        let crescimento = 0
        if (index > 0) {
          const mesAnteriorChave = ultimosMeses[index - 1].chave
          const faturamentoAnterior = dadosPorMes[mesAnteriorChave]?.faturamento || 0
          if (faturamentoAnterior > 0) {
            crescimento = ((faturamento - faturamentoAnterior) / faturamentoAnterior) * 100
          } else if (faturamento > 0) {
            crescimento = 100 // Primeira venda
          }
        }

        dadosPorMes[mesInfo.chave] = {
          faturamento,
          quantidade,
          crescimento
        }
      })

      return {
        linha,
        meses: dadosPorMes
      }
    }).filter(linha => {
      // Filtrar linhas que tiveram vendas em pelo menos um mês
      return Object.values(linha.meses).some(mes => mes.faturamento > 0)
    }).sort((a, b) => {
      // Ordenar por faturamento total
      const totalA = Object.values(a.meses).reduce((acc, mes) => acc + mes.faturamento, 0)
      const totalB = Object.values(b.meses).reduce((acc, mes) => acc + mes.faturamento, 0)
      return totalB - totalA
    })
  }, [ultimosMeses, itensPedidos])

  // Estatísticas de crescimento
  const estatisticasCrescimento = useMemo(() => {
    if (comparacaoMensal.length < 2) return null

    const mesAtual = comparacaoMensal[comparacaoMensal.length - 1]
    const mesAnterior = comparacaoMensal[comparacaoMensal.length - 2]

    const crescimentoPedidos = mesAnterior.pedidos > 0 
      ? ((mesAtual.pedidos - mesAnterior.pedidos) / mesAnterior.pedidos) * 100 
      : 0

    const crescimentoFaturamento = mesAnterior.faturamento > 0 
      ? ((mesAtual.faturamento - mesAnterior.faturamento) / mesAnterior.faturamento) * 100 
      : 0

    const crescimentoQuantidade = mesAnterior.quantidade > 0 
      ? ((mesAtual.quantidade - mesAnterior.quantidade) / mesAnterior.quantidade) * 100 
      : 0

    const crescimentoTicket = mesAnterior.ticketMedio > 0 
      ? ((mesAtual.ticketMedio - mesAnterior.ticketMedio) / mesAnterior.ticketMedio) * 100 
      : 0

    return {
      pedidos: crescimentoPedidos,
      faturamento: crescimentoFaturamento,
      quantidade: crescimentoQuantidade,
      ticketMedio: crescimentoTicket
    }
  }, [comparacaoMensal])

  const getTendenciaIcon = (valor: number) => {
    if (valor > 0) return <ArrowUp className="h-4 w-4 text-green-500" />
    if (valor < 0) return <ArrowDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-500" />
  }

  const getTendenciaColor = (valor: number) => {
    if (valor > 0) return 'text-green-600'
    if (valor < 0) return 'text-red-600'
    return 'text-gray-600'
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
        <span className="ml-3 text-gray-600">Carregando comparação mensal...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comparação Mensal de Vendas</h1>
          <p className="text-gray-600">Análise evolutiva e tendências - Últimos {mesesParaComparar} meses</p>
        </div>
        
        <div className="flex space-x-3">
          <select
            value={mesesParaComparar}
            onChange={(e) => setMesesParaComparar(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={3}>3 meses</option>
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
          </select>
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

      {/* Indicadores de Tendência */}
      {estatisticasCrescimento && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Crescimento Pedidos</p>
                <div className="flex items-center space-x-2">
                  {getTendenciaIcon(estatisticasCrescimento.pedidos)}
                  <p className={`text-2xl font-bold ${getTendenciaColor(estatisticasCrescimento.pedidos)}`}>
                    {estatisticasCrescimento.pedidos.toFixed(1)}%
                  </p>
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
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
                <p className="text-sm text-gray-600">Crescimento Faturamento</p>
                <div className="flex items-center space-x-2">
                  {getTendenciaIcon(estatisticasCrescimento.faturamento)}
                  <p className={`text-2xl font-bold ${getTendenciaColor(estatisticasCrescimento.faturamento)}`}>
                    {estatisticasCrescimento.faturamento.toFixed(1)}%
                  </p>
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
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
                <p className="text-sm text-gray-600">Crescimento Quantidade</p>
                <div className="flex items-center space-x-2">
                  {getTendenciaIcon(estatisticasCrescimento.quantidade)}
                  <p className={`text-2xl font-bold ${getTendenciaColor(estatisticasCrescimento.quantidade)}`}>
                    {estatisticasCrescimento.quantidade.toFixed(1)}%
                  </p>
                </div>
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
                <p className="text-sm text-gray-600">Crescimento Ticket Médio</p>
                <div className="flex items-center space-x-2">
                  {getTendenciaIcon(estatisticasCrescimento.ticketMedio)}
                  <p className={`text-2xl font-bold ${getTendenciaColor(estatisticasCrescimento.ticketMedio)}`}>
                    {estatisticasCrescimento.ticketMedio.toFixed(1)}%
                  </p>
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Comparação Mensal Geral */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="h-5 w-5 text-blue-500 mr-2" />
          Evolução Mensal Geral
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mês
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pedidos
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Faturamento
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantidade
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket Médio
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {comparacaoMensal.map((mes, index) => (
                <motion.tr
                  key={mes.chave}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 capitalize">{mes.mes}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {mes.pedidos}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    R$ {mes.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {mes.quantidade}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    R$ {mes.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comparação por Linha de Produto */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 text-green-500 mr-2" />
          Evolução por Linha de Produto
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Linha
                </th>
                {ultimosMeses.map(mes => (
                  <th key={mes.chave} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {mes.nome.split(' ')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {comparacaoPorLinha.slice(0, 10).map((linha, index) => (
                <motion.tr
                  key={linha.linha}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{linha.linha}</div>
                  </td>
                  {ultimosMeses.map(mes => {
                    const dadosMes = linha.meses[mes.chave] || { faturamento: 0, quantidade: 0, crescimento: 0 }
                    return (
                      <td key={mes.chave} className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          R$ {dadosMes.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {dadosMes.quantidade} un.
                        </div>
                        {dadosMes.crescimento !== 0 && (
                          <div className={`text-xs flex items-center ${getTendenciaColor(dadosMes.crescimento)}`}>
                            {getTendenciaIcon(dadosMes.crescimento)}
                            <span className="ml-1">{dadosMes.crescimento.toFixed(0)}%</span>
                          </div>
                        )}
                      </td>
                    )
                  })}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {comparacaoPorLinha.length === 0 && (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum dado encontrado</h3>
            <p className="text-gray-500">Não há dados suficientes para comparação mensal.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default VendasComparacaoMensal
