
import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  Calendar,
  RefreshCw,
  Download,
  Package,
  ArrowUpDown,
  Filter
} from 'lucide-react'
import { supabase, ItemPedidoVendas } from '../lib/supabase'
import toast from 'react-hot-toast'

interface ComparativoMes {
  mes: string
  ano: number
  mesAno: string
  totalQuantidade: number
}

interface ComparativoLinha {
  linha: string
  meses: Record<string, ComparativoMes>
  totalQuantidade: number
}

const VendasComparativoLinha: React.FC = () => {
  const [itensPedidos, setItensPedidos] = useState<ItemPedidoVendas[]>([])
  const [loading, setLoading] = useState(true)
  const [mesesSelecionados, setMesesSelecionados] = useState<string[]>([])
  const [anoInicio, setAnoInicio] = useState(new Date().getFullYear())
  const [anoFim, setAnoFim] = useState(new Date().getFullYear())
  const [ordenacao, setOrdenacao] = useState<'alfabetica' | 'quantidade'>('quantidade')
  const [filtroLinha, setFiltroLinha] = useState('')

  const mesesDisponiveis = [
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' }
  ]

  // Inicializar com os últimos 3 meses
  useEffect(() => {
    const hoje = new Date()
    const ultimosTresMeses = []
    
    for (let i = 2; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const mes = (data.getMonth() + 1).toString().padStart(2, '0')
      ultimosTresMeses.push(mes)
    }
    
    setMesesSelecionados(ultimosTresMeses)
  }, [])

  const fetchData = async () => {
    if (mesesSelecionados.length === 0) {
      toast.error('Selecione pelo menos um mês para comparação')
      return
    }

    try {
      setLoading(true)
      
      // Buscar dados de todos os anos e meses selecionados
      const promessas = []
      
      for (let ano = anoInicio; ano <= anoFim; ano++) {
        for (const mes of mesesSelecionados) {
          const dataInicio = `${ano}-${mes}-01`
          const dataFim = `${ano}-${mes}-${new Date(ano, parseInt(mes), 0).getDate()}`
          
          promessas.push(
            supabase
              .from('item_pedido_vendas')
              .select('*')
              .gte('data', dataInicio)
              .lte('data', dataFim + 'T23:59:59')
          )
        }
      }

      const resultados = await Promise.all(promessas)
      const todosItens = resultados.flatMap(resultado => resultado.data || [])
      
      setItensPedidos(todosItens)

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados de vendas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (mesesSelecionados.length > 0) {
      fetchData()
    }
  }, [mesesSelecionados, anoInicio, anoFim])

  // Função para extrair linha do produto (3 primeiros dígitos)
  const extrairLinhaProduto = (codigo: string): string => {
    if (!codigo) return 'OUTROS'
    
    // Extrair os 3 primeiros dígitos
    const match = codigo.match(/^(\d{3})/)
    if (match) {
      return match[1]
    }
    
    // Fallback: pegar os 3 primeiros caracteres
    return codigo.substring(0, 3).toUpperCase()
  }

  // Processar dados para comparativo
  const dadosComparativos = useMemo(() => {
    const linhas: Record<string, ComparativoLinha> = {}

    itensPedidos.forEach(item => {
      const linha = extrairLinhaProduto(item.item_codigo)
      const data = new Date(item.data)
      const ano = data.getFullYear()
      const mes = (data.getMonth() + 1).toString().padStart(2, '0')
      const mesAno = `${ano}-${mes}`
      const mesNome = mesesDisponiveis.find(m => m.value === mes)?.label || mes

      if (!linhas[linha]) {
        linhas[linha] = {
          linha,
          meses: {},
          totalQuantidade: 0
        }
      }

      if (!linhas[linha].meses[mesAno]) {
        linhas[linha].meses[mesAno] = {
          mes: mesNome,
          ano,
          mesAno,
          totalQuantidade: 0
        }
      }

      const quantidade = item.item_quantidade

      linhas[linha].meses[mesAno].totalQuantidade += quantidade
      linhas[linha].totalQuantidade += quantidade
    })

    return Object.values(linhas)
  }, [itensPedidos])

  // Filtrar e ordenar dados
  const dadosFiltradosOrdenados = useMemo(() => {
    let dados = dadosComparativos

    // Aplicar filtro de linha
    if (filtroLinha) {
      dados = dados.filter(linha => 
        linha.linha.toLowerCase().includes(filtroLinha.toLowerCase())
      )
    }

    // Aplicar ordenação
    switch (ordenacao) {
      case 'alfabetica':
        dados.sort((a, b) => a.linha.localeCompare(b.linha))
        break
      case 'quantidade':
        dados.sort((a, b) => b.totalQuantidade - a.totalQuantidade)
        break
    }

    return dados
  }, [dadosComparativos, filtroLinha, ordenacao])

  // Gerar lista de períodos selecionados
  const periodosComparativos = useMemo(() => {
    const periodos = []
    
    for (let ano = anoInicio; ano <= anoFim; ano++) {
      for (const mes of mesesSelecionados) {
        const mesNome = mesesDisponiveis.find(m => m.value === mes)?.label || mes
        periodos.push({
          mesAno: `${ano}-${mes}`,
          label: `${mesNome}/${ano}`
        })
      }
    }
    
    return periodos.sort((a, b) => a.mesAno.localeCompare(b.mesAno))
  }, [mesesSelecionados, anoInicio, anoFim])

  // Estatísticas gerais
  const estatisticas = useMemo(() => {
    const totalLinhas = dadosComparativos.length
    const totalQuantidade = dadosComparativos.reduce((acc, linha) => acc + linha.totalQuantidade, 0)
    const mediaPorLinha = totalLinhas > 0 ? totalQuantidade / totalLinhas : 0

    return {
      totalLinhas,
      totalQuantidade,
      mediaPorLinha
    }
  }, [dadosComparativos])

  const handleMesToggle = (mes: string) => {
    setMesesSelecionados(prev => 
      prev.includes(mes) 
        ? prev.filter(m => m !== mes)
        : [...prev, mes].sort()
    )
  }

  const handleSelectAllMeses = () => {
    setMesesSelecionados(mesesDisponiveis.map(m => m.value))
  }

  const handleClearMeses = () => {
    setMesesSelecionados([])
  }

  const handleRefresh = () => {
    toast.loading('Atualizando dados...', { duration: 1000 })
    fetchData()
  }

  const handleExportar = () => {
    try {
      // Criar dados para exportação
      const dadosExportacao = dadosFiltradosOrdenados.map(linha => {
        const linhaDados: any = { Linha: linha.linha }
        
        periodosComparativos.forEach(periodo => {
          const dadosMes = linha.meses[periodo.mesAno]
          linhaDados[periodo.label] = dadosMes ? dadosMes.totalQuantidade : 0
        })
        
        linhaDados['Total'] = linha.totalQuantidade
        return linhaDados
      })

      // Converter para CSV
      if (dadosExportacao.length === 0) {
        toast.error('Nenhum dado para exportar')
        return
      }

      const headers = Object.keys(dadosExportacao[0])
      const csvContent = [
        headers.join(','),
        ...dadosExportacao.map(row => headers.map(header => row[header]).join(','))
      ].join('\n')

      // Download do arquivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `comparativo_vendas_linha_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Relatório exportado com sucesso!')
    } catch (error) {
      console.error('Erro ao exportar:', error)
      toast.error('Erro ao exportar relatório')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Carregando comparativo...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comparativo de Vendas por Linha (3 Dígitos)</h1>
          <p className="text-gray-600">Análise comparativa de quantidade vendida por linha de produto</p>
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
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Configurações do Comparativo */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 text-blue-500 mr-2" />
          Configuração do Comparativo
        </h3>
        
        {/* Seleção de Anos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ano Início</label>
            <select
              value={anoInicio}
              onChange={(e) => setAnoInicio(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(ano => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ano Fim</label>
            <select
              value={anoFim}
              onChange={(e) => setAnoFim(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(ano => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Seleção de Meses */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">Meses para Comparação</label>
            <div className="flex space-x-2">
              <button
                onClick={handleSelectAllMeses}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Selecionar Todos
              </button>
              <button
                onClick={handleClearMeses}
                className="text-xs text-red-600 hover:text-red-800 underline"
              >
                Limpar Seleção
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {mesesDisponiveis.map(mes => (
              <label
                key={mes.value}
                className={`flex items-center justify-center px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors ${
                  mesesSelecionados.includes(mes.value)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={mesesSelecionados.includes(mes.value)}
                  onChange={() => handleMesToggle(mes.value)}
                  className="sr-only"
                />
                {mes.label}
              </label>
            ))}
          </div>
        </div>

        {/* Períodos Selecionados */}
        {periodosComparativos.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-2">
              Períodos Selecionados ({periodosComparativos.length}):
            </p>
            <div className="flex flex-wrap gap-1">
              {periodosComparativos.map(periodo => (
                <span
                  key={periodo.mesAno}
                  className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                >
                  {periodo.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Linhas Analisadas</p>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.totalLinhas}</p>
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
              <p className="text-sm text-gray-600">Quantidade Total</p>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.totalQuantidade.toLocaleString()}</p>
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
              <p className="text-sm text-gray-600">Média por Linha</p>
              <p className="text-2xl font-bold text-gray-900">
                {estatisticas.mediaPorLinha.toFixed(0)}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-purple-500" />
          </div>
        </motion.div>
      </div>

      {/* Filtros e Ordenação */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Filtrar por linha..."
              value={filtroLinha}
              onChange={(e) => setFiltroLinha(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={ordenacao}
            onChange={(e) => setOrdenacao(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="quantidade">Ordenar por Quantidade</option>
            <option value="alfabetica">Ordenar Alfabeticamente</option>
          </select>

          <div className="flex items-center space-x-2">
            <ArrowUpDown className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-600">
              {dadosFiltradosOrdenados.length} linhas encontradas
            </span>
          </div>
        </div>
      </div>

      {/* Tabela Comparativa */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Linha
                </th>
                {periodosComparativos.map(periodo => (
                  <th key={periodo.mesAno} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {periodo.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dadosFiltradosOrdenados.map((linha, index) => (
                <motion.tr
                  key={linha.linha}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{linha.linha}</div>
                  </td>
                  {periodosComparativos.map(periodo => {
                    const dadosMes = linha.meses[periodo.mesAno]
                    return (
                      <td key={periodo.mesAno} className="px-4 py-4 whitespace-nowrap text-center">
                        <div className="text-sm font-medium text-gray-900">
                          {dadosMes ? dadosMes.totalQuantidade.toLocaleString() : '-'}
                        </div>
                      </td>
                    )
                  })}
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <div className="text-sm font-bold text-blue-600">
                      {linha.totalQuantidade.toLocaleString()}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {dadosFiltradosOrdenados.length === 0 && (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum dado encontrado</h3>
            <p className="text-gray-500">
              {mesesSelecionados.length === 0 
                ? 'Selecione pelo menos um mês para comparação.'
                : 'Não há vendas registradas para os períodos selecionados.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default VendasComparativoLinha
