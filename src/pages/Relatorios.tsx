
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  FileText,
  Download,
  Calendar,
  Filter,
  Eye,
  RefreshCw
} from 'lucide-react'
import { entities } from '../lib/database'
import toast from 'react-hot-toast'

const Relatorios: React.FC = () => {
  const [vendas, setVendas] = useState<any[]>([])
  const [produtos, setProdutos] = useState<any[]>([])
  const [ordensProducao, setOrdensProducao] = useState<any[]>([])
  const [financeiro, setFinanceiro] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriodo, setSelectedPeriodo] = useState('mes')
  const [selectedRelatorio, setSelectedRelatorio] = useState('vendas')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const [vendasData, produtosData, producaoData, financeiroData] = await Promise.all([
        entities.vendas.list(),
        entities.produtos.list(),
        entities.ordens_producao.list(),
        entities.financeiro.list()
      ])

      setVendas(vendasData.list || [])
      setProdutos(produtosData.list || [])
      setOrdensProducao(producaoData.list || [])
      setFinanceiro(financeiroData.list || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados para relatórios')
    } finally {
      setLoading(false)
    }
  }

  const getDateRange = () => {
    const hoje = new Date()
    let dataInicio = new Date()
    
    switch (selectedPeriodo) {
      case 'semana':
        dataInicio.setDate(hoje.getDate() - 7)
        break
      case 'mes':
        dataInicio.setMonth(hoje.getMonth() - 1)
        break
      case 'trimestre':
        dataInicio.setMonth(hoje.getMonth() - 3)
        break
      case 'ano':
        dataInicio.setFullYear(hoje.getFullYear() - 1)
        break
      default:
        dataInicio.setMonth(hoje.getMonth() - 1)
    }
    
    return { dataInicio, dataFim: hoje }
  }

  const filtrarPorPeriodo = (items: any[], campoData: string) => {
    const { dataInicio, dataFim } = getDateRange()
    
    return items.filter(item => {
      if (!item[campoData]) return false
      const dataItem = new Date(item[campoData])
      return dataItem >= dataInicio && dataItem <= dataFim
    })
  }

  // Relatório de Vendas
  const vendasPeriodo = filtrarPorPeriodo(vendas, 'dataVenda')
  const faturamentoPeriodo = vendasPeriodo.reduce((acc, v) => acc + (v.valorTotal || 0), 0)
  const ticketMedio = vendasPeriodo.length > 0 ? faturamentoPeriodo / vendasPeriodo.length : 0

  const vendasPorMarketplace = vendasPeriodo.reduce((acc, venda) => {
    const marketplace = venda.marketplace || 'Não informado'
    acc[marketplace] = (acc[marketplace] || 0) + (venda.valorTotal || 0)
    return acc
  }, {} as Record<string, number>)

  const vendasPorStatus = vendasPeriodo.reduce((acc, venda) => {
    const status = venda.status || 'Não informado'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Relatório de Produção
  const producaoPeriodo = filtrarPorPeriodo(ordensProducao, 'dataInicio')
  const ordemsConcluidas = producaoPeriodo.filter(o => o.status === 'concluída').length
  const ordensEmAndamento = producaoPeriodo.filter(o => o.status === 'em_andamento').length
  const eficienciaProducao = producaoPeriodo.length > 0 ? (ordemsConcluidas / producaoPeriodo.length) * 100 : 0

  // Relatório de Estoque
  const produtosEstoqueBaixo = produtos.filter(p => p.estoqueAtual <= p.estoqueMinimo)
  const produtosMaisVendidos = vendasPeriodo
    .flatMap(v => v.itens || [])
    .reduce((acc, item) => {
      const produtoId = item.produtoId
      acc[produtoId] = (acc[produtoId] || 0) + item.quantidade
      return acc
    }, {} as Record<string, number>)

  // Relatório Financeiro
  const movimentacoesPeriodo = filtrarPorPeriodo(financeiro, 'created_at')
  const receitasPeriodo = movimentacoesPeriodo
    .filter(m => m.tipo === 'receita')
    .reduce((acc, m) => acc + m.valor, 0)
  const despesasPeriodo = movimentacoesPeriodo
    .filter(m => m.tipo === 'despesa')
    .reduce((acc, m) => acc + m.valor, 0)
  const lucroLiquido = receitasPeriodo - despesasPeriodo

  const relatóriosDisponiveis = [
    {
      id: 'vendas',
      nome: 'Relatório de Vendas',
      descricao: 'Análise detalhada das vendas por período, marketplace e status',
      icon: BarChart3,
      color: 'bg-blue-500'
    },
    {
      id: 'producao',
      nome: 'Relatório de Produção',
      descricao: 'Acompanhamento da eficiência produtiva e ordens de produção',
      icon: TrendingUp,
      color: 'bg-green-500'
    },
    {
      id: 'estoque',
      nome: 'Relatório de Estoque',
      descricao: 'Análise de inventário, produtos em falta e giro de estoque',
      icon: PieChart,
      color: 'bg-yellow-500'
    },
    {
      id: 'financeiro',
      nome: 'Relatório Financeiro',
      descricao: 'Demonstrativo de receitas, despesas e fluxo de caixa',
      icon: FileText,
      color: 'bg-purple-500'
    }
  ]

  const renderRelatorioVendas = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-6 rounded-xl">
          <h4 className="text-lg font-semibold text-blue-900 mb-2">Faturamento Total</h4>
          <p className="text-3xl font-bold text-blue-600">
            R$ {faturamentoPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        
        <div className="bg-green-50 p-6 rounded-xl">
          <h4 className="text-lg font-semibold text-green-900 mb-2">Total de Vendas</h4>
          <p className="text-3xl font-bold text-green-600">{vendasPeriodo.length}</p>
        </div>
        
        <div className="bg-purple-50 p-6 rounded-xl">
          <h4 className="text-lg font-semibold text-purple-900 mb-2">Ticket Médio</h4>
          <p className="text-3xl font-bold text-purple-600">
            R$ {ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Vendas por Marketplace</h4>
          <div className="space-y-3">
            {Object.entries(vendasPorMarketplace).map(([marketplace, valor]) => (
              <div key={marketplace} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{marketplace}</span>
                <span className="font-semibold text-gray-900">
                  R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Status das Vendas</h4>
          <div className="space-y-3">
            {Object.entries(vendasPorStatus).map(([status, quantidade]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">{status}</span>
                <span className="font-semibold text-gray-900">{quantidade}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  const renderRelatorioProducao = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 p-6 rounded-xl">
          <h4 className="text-lg font-semibold text-green-900 mb-2">Ordens Concluídas</h4>
          <p className="text-3xl font-bold text-green-600">{ordemsConcluidas}</p>
        </div>
        
        <div className="bg-yellow-50 p-6 rounded-xl">
          <h4 className="text-lg font-semibold text-yellow-900 mb-2">Em Andamento</h4>
          <p className="text-3xl font-bold text-yellow-600">{ordensEmAndamento}</p>
        </div>
        
        <div className="bg-blue-50 p-6 rounded-xl">
          <h4 className="text-lg font-semibold text-blue-900 mb-2">Eficiência</h4>
          <p className="text-3xl font-bold text-blue-600">{eficienciaProducao.toFixed(1)}%</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Ordens de Produção Recentes</h4>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Ordem</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Produto</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Quantidade</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Prazo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {producaoPeriodo.slice(0, 5).map((ordem) => (
                <tr key={ordem.id}>
                  <td className="px-4 py-2 text-sm text-gray-900">{ordem.numeroOrdem}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{ordem.produtoId}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{ordem.quantidade}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      ordem.status === 'concluída' ? 'bg-green-100 text-green-800' :
                      ordem.status === 'em_andamento' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {ordem.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {ordem.dataFimPrevista ? new Date(ordem.dataFimPrevista).toLocaleDateString('pt-BR') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const renderRelatorioEstoque = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 p-6 rounded-xl">
          <h4 className="text-lg font-semibold text-red-900 mb-2">Estoque Baixo</h4>
          <p className="text-3xl font-bold text-red-600">{produtosEstoqueBaixo.length}</p>
        </div>
        
        <div className="bg-blue-50 p-6 rounded-xl">
          <h4 className="text-lg font-semibold text-blue-900 mb-2">Total de Produtos</h4>
          <p className="text-3xl font-bold text-blue-600">{produtos.length}</p>
        </div>
        
        <div className="bg-green-50 p-6 rounded-xl">
          <h4 className="text-lg font-semibold text-green-900 mb-2">Valor do Estoque</h4>
          <p className="text-3xl font-bold text-green-600">
            R$ {produtos.reduce((acc, p) => acc + (p.preco * p.estoqueAtual), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Produtos com Estoque Baixo</h4>
          <div className="space-y-3">
            {produtosEstoqueBaixo.slice(0, 5).map((produto) => (
              <div key={produto.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{produto.nome}</p>
                  <p className="text-sm text-gray-600">{produto.codigo}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-600">{produto.estoqueAtual}</p>
                  <p className="text-xs text-gray-500">Min: {produto.estoqueMinimo}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Produtos Mais Vendidos</h4>
          <div className="space-y-3">
            {Object.entries(produtosMaisVendidos)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([produtoId, quantidade]) => (
                <div key={produtoId} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{produtoId}</span>
                  <span className="font-semibold text-gray-900">{quantidade} unidades</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )

  const renderRelatorioFinanceiro = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 p-6 rounded-xl">
          <h4 className="text-lg font-semibold text-green-900 mb-2">Receitas</h4>
          <p className="text-3xl font-bold text-green-600">
            R$ {receitasPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        
        <div className="bg-red-50 p-6 rounded-xl">
          <h4 className="text-lg font-semibold text-red-900 mb-2">Despesas</h4>
          <p className="text-3xl font-bold text-red-600">
            R$ {despesasPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        
        <div className={`${lucroLiquido >= 0 ? 'bg-blue-50' : 'bg-red-50'} p-6 rounded-xl`}>
          <h4 className={`text-lg font-semibold ${lucroLiquido >= 0 ? 'text-blue-900' : 'text-red-900'} mb-2`}>
            Resultado
          </h4>
          <p className={`text-3xl font-bold ${lucroLiquido >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            R$ {lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Movimentações Recentes</h4>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Documento</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Descrição</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Tipo</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Valor</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {movimentacoesPeriodo.slice(0, 5).map((mov) => (
                <tr key={mov.id}>
                  <td className="px-4 py-2 text-sm text-gray-900">{mov.numeroDocumento}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{mov.descricao}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      mov.tipo === 'receita' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {mov.tipo}
                    </span>
                  </td>
                  <td className={`px-4 py-2 text-sm font-medium ${
                    mov.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {mov.tipo === 'receita' ? '+' : '-'}R$ {mov.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      mov.status === 'pago' ? 'bg-green-100 text-green-800' :
                      mov.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {mov.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios e Análises</h1>
          <p className="text-gray-600">Análise de dados e projeções para tomada de decisão</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={fetchData}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Atualizar
          </button>
          
          <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download className="h-5 w-5 mr-2" />
            Exportar
          </button>
        </div>
      </div>

      {/* Seleção de Período */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Período:</span>
          </div>
          
          <select
            value={selectedPeriodo}
            onChange={(e) => setSelectedPeriodo(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="semana">Última Semana</option>
            <option value="mes">Último Mês</option>
            <option value="trimestre">Último Trimestre</option>
            <option value="ano">Último Ano</option>
          </select>
        </div>
      </div>

      {/* Seleção de Relatório */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {relatóriosDisponiveis.map((relatorio) => {
          const Icon = relatorio.icon
          return (
            <motion.div
              key={relatorio.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedRelatorio(relatorio.id)}
              className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                selectedRelatorio === relatorio.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-3 rounded-lg ${relatorio.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                {selectedRelatorio === relatorio.id && (
                  <Eye className="h-5 w-5 text-blue-500" />
                )}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{relatorio.nome}</h3>
              <p className="text-sm text-gray-600">{relatorio.descricao}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Conteúdo do Relatório */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {relatóriosDisponiveis.find(r => r.id === selectedRelatorio)?.nome}
          </h2>
          <button className="inline-flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </button>
        </div>

        {selectedRelatorio === 'vendas' && renderRelatorioVendas()}
        {selectedRelatorio === 'producao' && renderRelatorioProducao()}
        {selectedRelatorio === 'estoque' && renderRelatorioEstoque()}
        {selectedRelatorio === 'financeiro' && renderRelatorioFinanceiro()}
      </div>
    </div>
  )
}

export default Relatorios
