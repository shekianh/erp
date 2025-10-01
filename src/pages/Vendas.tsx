import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Truck,
  ShoppingCart,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  Package,
  ExternalLink,
  RefreshCw,
  TrendingUp,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { 
  buscarPedidosOtimizado,
  buscarTodosPedidosPeriodo,
  buscarNotasFiscaisOtimizado,
  buscarItensPedidosOtimizado,
  PedidoVendas, 
  NotaFiscal, 
  ItemPedidoVendas, 
  parseItensJson, 
  parseEnderecoJson, 
  parsePedidoJson,
  obterNomeLoja,
  getSituacaoPedidoText,
  getSituacaoPedidoColor,
  getSituacaoNotaFiscalText,
  getSituacaoNotaFiscalColor
} from '../lib/supabase'
import toast from 'react-hot-toast'

type PeriodoFiltro = 'hoje' | 'ontem' | '30dias' | '60dias' | '90dias' | 'mes_atual' | 'mes_anterior' | 'customizado'

const ITEMS_PER_PAGE = 2000

const Vendas: React.FC = () => {
  const [pedidos, setPedidos] = useState<PedidoVendas[]>([])
  const [todosPedidosPeriodo, setTodosPedidosPeriodo] = useState<PedidoVendas[]>([])
  const [notasFiscais, setNotasFiscais] = useState<NotaFiscal[]>([])
  const [itensPedidos, setItensPedidos] = useState<ItemPedidoVendas[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [lojaFilter, setLojaFilter] = useState('todos')
  const [periodoFilter, setPeriodoFilter] = useState<PeriodoFiltro>('hoje')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedPedido, setSelectedPedido] = useState<PedidoVendas | null>(null)
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view')
  
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const getDateRange = (periodo: PeriodoFiltro) => {
    const hoje = new Date()
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
    
    switch (periodo) {
      case 'hoje':
        return {
          inicio: inicioHoje.toISOString().split('T')[0],
          fim: inicioHoje.toISOString().split('T')[0]
        }
      
      case 'ontem':
        const ontem = new Date(hoje)
        ontem.setDate(hoje.getDate() - 1)
        return {
          inicio: ontem.toISOString().split('T')[0],
          fim: ontem.toISOString().split('T')[0]
        }
      
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
      
      case 'customizado':
        return {
          inicio: dataInicio || hoje.toISOString().split('T')[0],
          fim: dataFim || hoje.toISOString().split('T')[0]
        }
      
      default:
        return {
          inicio: inicioHoje.toISOString().split('T')[0],
          fim: inicioHoje.toISOString().split('T')[0]
        }
    }
  }

  const fetchData = async (page: number = 1) => {
    try {
      setLoading(true)
      const { inicio, fim } = getDateRange(periodoFilter)
      
      const [pedidosData, notasData, itensData] = await Promise.all([
        buscarPedidosOtimizado(inicio, fim, page, ITEMS_PER_PAGE),
        buscarNotasFiscaisOtimizado(inicio, fim),
        buscarItensPedidosOtimizado(inicio, fim)
      ])

      const todosPedidos = await buscarTodosPedidosPeriodo(inicio, fim)

      setPedidos(pedidosData.data || [])
      setTodosPedidosPeriodo(todosPedidos)
      setNotasFiscais(notasData || [])
      setItensPedidos(itensData || [])
      setTotalCount(pedidosData.count || 0)

    } catch (error) {
      console.error('Erro ao carregar dados de vendas:', error)
      toast.error('Erro ao carregar dados de vendas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (periodoFilter !== 'customizado') {
      fetchData(currentPage)
    }
  }, [periodoFilter, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [periodoFilter])

  const aplicarFiltroCustomizado = () => {
    if (!dataInicio || !dataFim) {
      toast.error('Por favor, selecione as datas de início e fim')
      return
    }
    
    if (new Date(dataInicio) > new Date(dataFim)) {
      toast.error('Data de início deve ser anterior à data fim')
      return
    }
    
    setCurrentPage(1)
    fetchData(1)
  }

  const filteredPedidos = useMemo(() => {
    return pedidos.filter(pedido => {
      const lowercasedSearchTerm = searchTerm.toLowerCase().trim()

      const matchesStatus = statusFilter === 'todos' || pedido.situacao_bling.toString() === statusFilter
      const matchesLoja = lojaFilter === 'todos' || pedido.loja === lojaFilter
      
      if (lowercasedSearchTerm === '') {
        return matchesStatus && matchesLoja
      }
      
      const hasMatchingItem = itensPedidos
        .filter(item => item.numero === pedido.numero)
        .some(item => 
          item.item_codigo?.toLowerCase().includes(lowercasedSearchTerm)
        )

      const fullAddress = `${pedido.etiqueta_endereco || ''} ${pedido.etiqueta_numero || ''} ${pedido.etiqueta_bairro || ''} ${pedido.etiqueta_municipio || ''} ${pedido.etiqueta_uf || ''} ${pedido.etiqueta_cep || ''}`.toLowerCase()
      const matchesAddress = fullAddress.includes(lowercasedSearchTerm)

      const matchesSearch = 
           pedido.numero?.toLowerCase().includes(lowercasedSearchTerm) ||
           pedido.contato_nome?.toLowerCase().includes(lowercasedSearchTerm) ||
           pedido.numeroloja?.toLowerCase().includes(lowercasedSearchTerm) ||
           pedido.id_bling?.toString().toLowerCase().includes(lowercasedSearchTerm) ||
           pedido.codigorastreamento?.toLowerCase().includes(lowercasedSearchTerm) ||
           hasMatchingItem ||
           matchesAddress
      
      return matchesSearch && matchesStatus && matchesLoja
    })
  }, [pedidos, itensPedidos, searchTerm, statusFilter, lojaFilter])

  const estatisticas = useMemo(() => {
    const totalPedidos = todosPedidosPeriodo.length
    const faturamentoTotal = todosPedidosPeriodo.reduce((acc, p) => acc + (p.total || 0), 0)
    const totalNotas = notasFiscais.length
    const totalItens = itensPedidos.reduce((acc, item) => acc + item.item_quantidade, 0)

    return {
      totalPedidos,
      faturamentoTotal,
      totalNotas,
      totalItens
    }
  }, [todosPedidosPeriodo, notasFiscais, itensPedidos])

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalCount)

  const getNotaFiscalByPedido = (pedidoId: string) => {
    return notasFiscais.find(nf => nf.numero_pedido_loja === pedidoId)
  }

  const getItensByPedido = (pedidoNumero: string) => {
    return itensPedidos.filter(item => item.numero === pedidoNumero)
  }

  const openModal = (pedido: PedidoVendas | null = null, mode: 'view' | 'edit' | 'create' = 'view') => {
    setSelectedPedido(pedido)
    setModalMode(mode)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedPedido(null)
    setModalMode('view')
  }

  const handleRefresh = () => {
    toast.loading('Atualizando dados...', { duration: 1000 })
    fetchData(currentPage)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  const getPeriodoTexto = () => {
    switch (periodoFilter) {
      case 'hoje': return 'Hoje'
      case 'ontem': return 'Ontem'
      case '30dias': return 'Últimos 30 dias'
      case '60dias': return 'Últimos 60 dias'
      case '90dias': return 'Últimos 90 dias'
      case 'mes_atual': return 'Mês atual'
      case 'mes_anterior': return 'Mês anterior'
      case 'customizado': return `${dataInicio ? new Date(dataInicio).toLocaleDateString('pt-BR') : ''} até ${dataFim ? new Date(dataFim).toLocaleDateString('pt-BR') : ''}`
      default: return 'Período selecionado'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Carregando vendas...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Gestão de Vendas - {getPeriodoTexto()}</h1>
          <p className="text-sm lg:text-base text-gray-600">Controle de pedidos com filtros inteligentes e dados em tempo real</p>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-3 lg:px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm lg:text-base"
          >
            <RefreshCw className="h-4 lg:h-5 w-4 lg:w-5 mr-2" />
            Atualizar
          </button>
          <button
            onClick={() => openModal(null, 'create')}
            className="inline-flex items-center px-3 lg:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm lg:text-base"
          >
            <Plus className="h-4 lg:h-5 w-4 lg:w-5 mr-2" />
            Novo Pedido
          </button>
        </div>
      </div>

      {/* Filtro de Período */}
      <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-4 lg:h-5 w-4 lg:w-5 text-blue-500 mr-2" />
          Filtros por Período
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 lg:gap-3 mb-4">
          {[
            { key: 'hoje', label: 'Hoje' },
            { key: 'ontem', label: 'Ontem' },
            { key: '30dias', label: '30 Dias' },
            { key: '60dias', label: '60 Dias' },
            { key: '90dias', label: '90 Dias' },
            { key: 'mes_atual', label: 'Mês Atual' },
            { key: 'mes_anterior', label: 'Mês Anterior' },
            { key: 'customizado', label: 'Customizado' }
          ].map((periodo) => (
            <button
              key={periodo.key}
              onClick={() => setPeriodoFilter(periodo.key as PeriodoFiltro)}
              className={`px-2 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors ${
                periodoFilter === periodo.key 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {periodo.label}
            </button>
          ))}
        </div>

        {periodoFilter === 'customizado' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={aplicarFiltroCustomizado}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Filtrar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Estatísticas do Período */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {[
          { 
            title: 'Pedidos no Período', 
            value: estatisticas.totalPedidos, 
            subtitle: 'Total completo',
            icon: ShoppingCart,
            color: 'text-blue-500'
          },
          { 
            title: 'Faturamento Total', 
            value: `R$ ${estatisticas.faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
            subtitle: 'Todos os pedidos',
            icon: DollarSign,
            color: 'text-green-500'
          },
          { 
            title: 'Notas Fiscais', 
            value: estatisticas.totalNotas, 
            subtitle: 'Período completo',
            icon: FileText,
            color: 'text-purple-500'
          },
          { 
            title: 'Itens Vendidos', 
            value: estatisticas.totalItens, 
            subtitle: 'Quantidade total',
            icon: Package,
            color: 'text-orange-500'
          }
        ].map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-3 lg:p-6 rounded-xl shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs lg:text-sm text-gray-600 truncate">{stat.title}</p>
                  <p className="text-lg lg:text-2xl font-bold text-gray-900 truncate">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.subtitle}</p>
                </div>
                <Icon className={`h-6 lg:h-8 w-6 lg:w-8 ${stat.color} flex-shrink-0`} />
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Filtros Adicionais */}
      <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 lg:h-5 w-4 lg:w-5" />
            <input
              type="text"
              placeholder="Buscar por cliente, SKU, rastreio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 lg:pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="todos">Todas as Situações</option>
            <option value="6">Aberto</option>
            <option value="9">Atendido</option>
            <option value="12">Cancelado</option>
          </select>

          <select
            value={lojaFilter}
            onChange={(e) => setLojaFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="todos">Todas as Lojas</option>
            {Array.from(new Set(pedidos.map(p => p.loja))).map(loja => (
              <option key={loja} value={loja}>{obterNomeLoja(loja)}</option>
            ))}
          </select>

          <div className="flex items-center space-x-2">
            <Filter className="h-4 lg:h-5 w-4 lg:w-5 text-gray-400" />
            <span className="text-xs lg:text-sm text-gray-600">
              {filteredPedidos.length} de {pedidos.length} pedidos
            </span>
          </div>
        </div>
      </div>

      {/* Controles de Paginação */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-xs lg:text-sm text-gray-600 text-center sm:text-left">
            Mostrando {startItem} a {endItem} de {totalCount.toLocaleString()} pedidos
          </div>
          
          <div className="flex items-center justify-center sm:justify-end space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="inline-flex items-center px-2 lg:px-3 py-1 lg:py-2 border border-gray-300 rounded-lg text-xs lg:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3 lg:h-4 w-3 lg:w-4 mr-1" />
              Anterior
            </button>
            
            <span className="text-xs lg:text-sm text-gray-600 px-2">
              Página {currentPage} de {totalPages}
            </span>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="inline-flex items-center px-2 lg:px-3 py-1 lg:py-2 border border-gray-300 rounded-lg text-xs lg:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próxima
              <ChevronRight className="h-3 lg:h-4 w-3 lg:w-4 ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Pedidos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Versão Desktop */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pedido
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loja
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Situação
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  NF
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPedidos.map((pedido, index) => {
                const notaFiscal = getNotaFiscalByPedido(pedido.numeroloja)
                const itens = getItensByPedido(pedido.numero)
                
                return (
                  <motion.tr
                    key={pedido.id_key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            #{pedido.numero}
                          </div>
                          <div className="text-xs text-gray-500">
                            Loja: {pedido.numeroloja}
                          </div>
                          <div className="text-xs text-gray-400">
                            {itens.length} item(s)
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    {/* INÍCIO DA ALTERAÇÃO: Coluna Cliente com quebra de linha */}
                    <td className="px-3 py-3 max-w-[200px] break-words">
                    {/* FIM DA ALTERAÇÃO */}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {pedido.contato_nome}
                        </div>
                        <div className="text-xs text-gray-500">
                          {pedido.contato_documento}
                        </div>
                      </div>
                    </td>

                    {/* INÍCIO DA ALTERAÇÃO: Coluna Loja com quebra de linha */}
                    <td className="px-3 py-3 max-w-[150px] break-words">
                    {/* FIM DA ALTERAÇÃO */}
                      <span className="text-sm text-gray-900">{obterNomeLoja(pedido.loja)}</span>
                    </td>

                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      R$ {pedido.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSituacaoPedidoColor(pedido.situacao_bling)}`}>
                        {getSituacaoPedidoText(pedido.situacao_bling)}
                      </span>
                    </td>

                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div>{new Date(pedido.data).toLocaleDateString('pt-BR')}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(pedido.data).toLocaleTimeString('pt-BR')}
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3 whitespace-nowrap">
                      {notaFiscal ? (
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSituacaoNotaFiscalColor(notaFiscal.situacao)}`}>
                            {getSituacaoNotaFiscalText(notaFiscal.situacao)}
                          </span>
                          <a 
                            href={notaFiscal.link_danfe}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          Pendente
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-1">
                        <button
                          onClick={() => openModal(pedido, 'view')}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openModal(pedido, 'edit')}
                          className="text-green-600 hover:text-green-900"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Versão Mobile - Cards */}
        <div className="lg:hidden">
          <div className="space-y-4 p-4">
            {filteredPedidos.map((pedido, index) => {
              const notaFiscal = getNotaFiscalByPedido(pedido.numeroloja)
              const itens = getItensByPedido(pedido.numero)
              
              return (
                <motion.div
                  key={pedido.id_key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-gray-50 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          #{pedido.numero}
                        </div>
                        <div className="text-xs text-gray-500">
                          {pedido.contato_nome}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        R$ {pedido.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(pedido.data).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSituacaoPedidoColor(pedido.situacao_bling)}`}>
                      {getSituacaoPedidoText(pedido.situacao_bling)}
                    </span>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openModal(pedido, 'view')}
                        className="text-blue-600 hover:text-blue-900"
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openModal(pedido, 'edit')}
                        className="text-green-600 hover:text-green-900"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 flex items-center justify-between">
                    <span>{obterNomeLoja(pedido.loja)}</span>
                    <span>{itens.length} item(s)</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {filteredPedidos.length === 0 && (
          <div className="text-center py-12">
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum pedido encontrado</h3>
            <p className="text-gray-500">
              {pedidos.length === 0 
                ? 'Nenhum pedido no período selecionado.' 
                : 'Tente ajustar os filtros para encontrar pedidos.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Modal de Detalhes (sem alterações) */}
      {showModal && selectedPedido && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Detalhes do Pedido #{selectedPedido.numero}
              </h3>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Informações do Pedido</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Número do Pedido</label>
                      <p className="text-sm text-gray-900">{selectedPedido.numero}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Número da Loja</label>
                      <p className="text-sm text-gray-900">{selectedPedido.numeroloja}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Data do Pedido</label>
                      <p className="text-sm text-gray-900">
                        {new Date(selectedPedido.data).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Valor Total</label>
                      <p className="text-lg font-bold text-green-600">
                        R$ {selectedPedido.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Dados do Cliente</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Nome</label>
                      <p className="text-sm text-gray-900">{selectedPedido.contato_nome}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Documento</label>
                      <p className="text-sm text-gray-900">{selectedPedido.contato_documento}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">ID do Contato</label>
                      <p className="text-sm text-gray-900">{selectedPedido.contato_id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Loja</label>
                      <p className="text-sm text-gray-900">{obterNomeLoja(selectedPedido.loja)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Itens do Pedido</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  {(() => {
                    const itens = getItensByPedido(selectedPedido.numero)
                    
                    if (itens.length > 0) {
                      return (
                        <div className="space-y-3">
                          {itens.map((item, index) => {
                            return (
                              <div key={index} className="bg-white p-4 rounded-lg border">
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                                  <div>
                                    <label className="text-xs font-medium text-gray-600">Código</label>
                                    <p className="text-sm text-gray-900">{item.item_codigo}</p>
                                  </div>
                                  <div className="md:col-span-2">
                                    <label className="text-xs font-medium text-gray-600">Descrição</label>
                                    <p className="text-sm text-gray-900">{item.item_descricao}</p>
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-600">Quantidade</label>
                                    <p className="text-sm text-gray-900">{item.item_quantidade}</p>
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-600">Valor</label>
                                    <p className="text-sm font-semibold text-gray-900">
                                      R$ {item.item_valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    } else {
                      return (
                        <p className="text-gray-500 text-center py-4">Nenhum item encontrado para este pedido</p>
                      )
                    }
                  })()}
                </div>
              </div>

              {(() => {
                const notaFiscal = getNotaFiscalByPedido(selectedPedido.numeroloja)
                return notaFiscal && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">Nota Fiscal</h4>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Número NF</label>
                          <p className="text-sm text-gray-900">{notaFiscal.id_nf}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Valor</label>
                          <p className="text-sm text-gray-900">
                            R$ {notaFiscal.valor_nota?.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Data Emissão</label>
                          <p className="text-sm text-gray-900">
                            {new Date(notaFiscal.data_emissao).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getSituacaoNotaFiscalColor(notaFiscal.situacao)}`}>
                          {getSituacaoNotaFiscalText(notaFiscal.situacao)}
                        </span>
                        <div className="flex space-x-3">
                          <a
                            href={notaFiscal.link_danfe}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Ver DANFE
                          </a>
                          <a
                            href={notaFiscal.link_pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            PDF
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {selectedPedido.etiqueta_nome && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">Endereço de Entrega</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Nome</label>
                        <p className="text-sm text-gray-900">{selectedPedido.etiqueta_nome}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Endereço</label>
                        <p className="text-sm text-gray-900">
                          {selectedPedido.etiqueta_endereco}, {selectedPedido.etiqueta_numero}
                          {selectedPedido.etiqueta_complemento && `, ${selectedPedido.etiqueta_complemento}`}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Cidade/UF</label>
                        <p className="text-sm text-gray-900">
                          {selectedPedido.etiqueta_municipio}/{selectedPedido.etiqueta_uf}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">CEP</label>
                        <p className="text-sm text-gray-900">{selectedPedido.etiqueta_cep}</p>
                      </div>
                    </div>
                    {selectedPedido.codigorastreamento && (
                      <div className="mt-4">
                        <label className="text-sm font-medium text-gray-600">Código de Rastreamento</label>
                        <p className="text-sm font-mono bg-gray-100 p-2 rounded mt-1">
                          {selectedPedido.codigorastreamento}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Fechar
              </button>
              {modalMode === 'edit' && (
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Salvar Alterações
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Vendas