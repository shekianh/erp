
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  Search,
  Filter,
  Eye,
  Edit
} from 'lucide-react'
import { entities } from '../lib/database'
import toast from 'react-hot-toast'

const Financeiro: React.FC = () => {
  const [movimentacoes, setMovimentacoes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [tipoFilter, setTipoFilter] = useState('todos')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [showModal, setShowModal] = useState(false)
  const [selectedMovimentacao, setSelectedMovimentacao] = useState<any>(null)
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view')

  useEffect(() => {
    fetchMovimentacoes()
  }, [])

  const fetchMovimentacoes = async () => {
    try {
      setLoading(true)
      const { list } = await entities.financeiro.list()
      setMovimentacoes(list || [])
    } catch (error) {
      console.error('Erro ao carregar movimentações financeiras:', error)
      toast.error('Erro ao carregar dados financeiros')
    } finally {
      setLoading(false)
    }
  }

  const filteredMovimentacoes = movimentacoes.filter(mov => {
    const matchesSearch = mov.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mov.numeroDocumento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mov.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mov.fornecedor?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTipo = tipoFilter === 'todos' || mov.tipo === tipoFilter
    const matchesStatus = statusFilter === 'todos' || mov.status === statusFilter
    
    return matchesSearch && matchesTipo && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago': return 'bg-green-100 text-green-800'
      case 'pendente': return 'bg-yellow-100 text-yellow-800'
      case 'vencido': return 'bg-red-100 text-red-800'
      case 'cancelado': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTipoColor = (tipo: string) => {
    return tipo === 'receita' ? 'text-green-600' : 'text-red-600'
  }

  const getCategoriaColor = (categoria: string) => {
    switch (categoria) {
      case 'venda': return 'bg-green-100 text-green-800'
      case 'compra_material': return 'bg-blue-100 text-blue-800'
      case 'salario': return 'bg-purple-100 text-purple-800'
      case 'energia': return 'bg-yellow-100 text-yellow-800'
      case 'aluguel': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const isVencido = (dataVencimento: string, status: string) => {
    const hoje = new Date()
    const vencimento = new Date(dataVencimento)
    return vencimento < hoje && status === 'pendente'
  }

  const openModal = (movimentacao: any = null, mode: 'view' | 'edit' | 'create' = 'view') => {
    setSelectedMovimentacao(movimentacao)
    setModalMode(mode)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedMovimentacao(null)
    setModalMode('view')
  }

  const handleStatusChange = async (movimentacaoId: string, newStatus: string) => {
    try {
      const updates: any = { 
        status: newStatus,
        updatedAt: new Date().toISOString()
      }
      
      if (newStatus === 'pago') {
        updates.dataPagamento = new Date().toISOString()
      }

      await entities.financeiro.update(movimentacaoId, updates)
      await fetchMovimentacoes()
      toast.success('Status atualizado com sucesso')
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      toast.error('Erro ao atualizar status')
    }
  }

  // Cálculos financeiros
  const contasReceber = movimentacoes
    .filter(m => m.tipo === 'receita' && m.status === 'pendente')
    .reduce((acc, m) => acc + m.valor, 0)
  
  const contasPagar = movimentacoes
    .filter(m => m.tipo === 'despesa' && m.status === 'pendente')
    .reduce((acc, m) => acc + m.valor, 0)
  
  const receitasRecebidas = movimentacoes
    .filter(m => m.tipo === 'receita' && m.status === 'pago')
    .reduce((acc, m) => acc + m.valor, 0)
  
  const despesasPagas = movimentacoes
    .filter(m => m.tipo === 'despesa' && m.status === 'pago')
    .reduce((acc, m) => acc + m.valor, 0)

  const saldoPrevisto = contasReceber - contasPagar
  const saldoRealizado = receitasRecebidas - despesasPagas

  const contasVencidas = movimentacoes.filter(m => 
    isVencido(m.dataVencimento, m.status)
  ).length

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
          <h1 className="text-2xl font-bold text-gray-900">Gestão Financeira</h1>
          <p className="text-gray-600">Controle de contas a pagar e receber, fluxo de caixa</p>
        </div>
        
        <button
          onClick={() => openModal(null, 'create')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nova Movimentação
        </button>
      </div>

      {/* Resumo Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Contas a Receber</p>
              <p className="text-2xl font-bold text-green-600">
                R$ {contasReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Contas a Pagar</p>
              <p className="text-2xl font-bold text-red-600">
                R$ {contasPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Saldo Previsto</p>
              <p className={`text-2xl font-bold ${saldoPrevisto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {saldoPrevisto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Contas Vencidas</p>
              <p className="text-2xl font-bold text-red-600">{contasVencidas}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Alertas de Vencimento */}
      {contasVencidas > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center mb-4">
            <AlertCircle className="h-6 w-6 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-red-800">Contas Vencidas</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {movimentacoes
              .filter(m => isVencido(m.dataVencimento, m.status))
              .slice(0, 6)
              .map((conta) => (
                <div key={conta.id} className="bg-white p-4 rounded-lg border border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{conta.descricao}</p>
                      <p className="text-sm text-gray-600">{conta.numeroDocumento}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">
                        R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-500">
                        Venc: {new Date(conta.dataVencimento).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar movimentações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="todos">Todos os Tipos</option>
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="todos">Todos os Status</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="vencido">Vencido</option>
            <option value="cancelado">Cancelado</option>
          </select>

          <button className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="h-5 w-5 mr-2" />
            Relatórios
          </button>
        </div>
      </div>

      {/* Lista de Movimentações */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrição
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vencimento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMovimentacoes.map((movimentacao, index) => {
                const vencido = isVencido(movimentacao.dataVencimento, movimentacao.status)
                
                return (
                  <motion.tr
                    key={movimentacao.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`hover:bg-gray-50 ${vencido ? 'bg-red-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {movimentacao.numeroDocumento}
                        </div>
                        {movimentacao.numeroNF && (
                          <div className="text-sm text-gray-500">
                            NF: {movimentacao.numeroNF}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{movimentacao.descricao}</div>
                      {(movimentacao.cliente || movimentacao.fornecedor) && (
                        <div className="text-sm text-gray-500">
                          {movimentacao.cliente || movimentacao.fornecedor}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {movimentacao.tipo === 'receita' ? (
                          <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                        )}
                        <span className={`text-sm font-medium ${getTipoColor(movimentacao.tipo)}`}>
                          {movimentacao.tipo === 'receita' ? 'Receita' : 'Despesa'}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoriaColor(movimentacao.categoria)}`}>
                        {movimentacao.categoria}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-bold ${getTipoColor(movimentacao.tipo)}`}>
                        {movimentacao.tipo === 'receita' ? '+' : '-'}R$ {movimentacao.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${vencido ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                        {new Date(movimentacao.dataVencimento).toLocaleDateString('pt-BR')}
                        {vencido && (
                          <div className="flex items-center mt-1">
                            <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
                            <span className="text-xs">Vencido</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={movimentacao.status}
                        onChange={(e) => handleStatusChange(movimentacao.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full border-0 ${getStatusColor(movimentacao.status)}`}
                      >
                        <option value="pendente">Pendente</option>
                        <option value="pago">Pago</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openModal(movimentacao, 'view')}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openModal(movimentacao, 'edit')}
                          className="text-green-600 hover:text-green-900"
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

        {filteredMovimentacoes.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma movimentação encontrada</h3>
            <p className="text-gray-500">Tente ajustar os filtros ou criar uma nova movimentação.</p>
          </div>
        )}
      </div>

      {/* Modal de Detalhes/Edição */}
      {showModal && selectedMovimentacao && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {modalMode === 'create' ? 'Nova Movimentação' : 
                 modalMode === 'edit' ? 'Editar Movimentação' : 'Detalhes da Movimentação'}
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número do Documento
                  </label>
                  <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
                    {selectedMovimentacao.numeroDocumento}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedMovimentacao.tipo === 'receita' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedMovimentacao.tipo === 'receita' ? 'Receita' : 'Despesa'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <p className="text-sm text-gray-900">{selectedMovimentacao.descricao}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria
                  </label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoriaColor(selectedMovimentacao.categoria)}`}>
                    {selectedMovimentacao.categoria}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor
                  </label>
                  <p className={`text-2xl font-bold ${getTipoColor(selectedMovimentacao.tipo)}`}>
                    R$ {selectedMovimentacao.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Vencimento
                  </label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedMovimentacao.dataVencimento).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Pagamento
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedMovimentacao.dataPagamento 
                      ? new Date(selectedMovimentacao.dataPagamento).toLocaleDateString('pt-BR')
                      : '-'
                    }
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Forma de Pagamento
                  </label>
                  <p className="text-sm text-gray-900">{selectedMovimentacao.formaPagamento}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Centro de Custo
                  </label>
                  <p className="text-sm text-gray-900">{selectedMovimentacao.centroCusto}</p>
                </div>
              </div>

              {(selectedMovimentacao.cliente || selectedMovimentacao.fornecedor) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {selectedMovimentacao.tipo === 'receita' ? 'Cliente' : 'Fornecedor'}
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedMovimentacao.cliente || selectedMovimentacao.fornecedor}
                  </p>
                </div>
              )}

              {selectedMovimentacao.numeroNF && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número da Nota Fiscal
                  </label>
                  <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
                    {selectedMovimentacao.numeroNF}
                  </p>
                </div>
              )}

              {selectedMovimentacao.observacoes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {selectedMovimentacao.observacoes}
                  </p>
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

export default Financeiro
