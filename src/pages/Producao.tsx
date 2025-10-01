
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Factory, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Play,
  Pause,
  Square,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Calendar
} from 'lucide-react'
import { entities } from '../lib/database'
import toast from 'react-hot-toast'

const Producao: React.FC = () => {
  const [ordensProducao, setOrdensProducao] = useState<any[]>([])
  const [produtos, setProdutos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [showModal, setShowModal] = useState(false)
  const [selectedOrdem, setSelectedOrdem] = useState<any>(null)
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const [ordensData, produtosData] = await Promise.all([
        entities.ordens_producao.list(),
        entities.produtos.list()
      ])

      setOrdensProducao(ordensData.list || [])
      setProdutos(produtosData.list || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados de produção')
    } finally {
      setLoading(false)
    }
  }

  const filteredOrdens = ordensProducao.filter(ordem => {
    const matchesSearch = ordem.numeroOrdem?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ordem.produtoId?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'todos' || ordem.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planejada': return 'bg-blue-100 text-blue-800'
      case 'em_andamento': return 'bg-yellow-100 text-yellow-800'
      case 'pausada': return 'bg-orange-100 text-orange-800'
      case 'concluída': return 'bg-green-100 text-green-800'
      case 'cancelada': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planejada': return Clock
      case 'em_andamento': return Play
      case 'pausada': return Pause
      case 'concluída': return CheckCircle
      case 'cancelada': return Square
      default: return Clock
    }
  }

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'alta': return 'bg-red-100 text-red-800'
      case 'media': return 'bg-yellow-100 text-yellow-800'
      case 'baixa': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const openModal = (ordem: any = null, mode: 'view' | 'edit' | 'create' = 'view') => {
    setSelectedOrdem(ordem)
    setModalMode(mode)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedOrdem(null)
    setModalMode('view')
  }

  const handleStatusChange = async (ordemId: string, newStatus: string) => {
    try {
      const updates: any = { 
        status: newStatus,
        updatedAt: new Date().toISOString()
      }
      
      if (newStatus === 'em_andamento' && !selectedOrdem?.dataInicio) {
        updates.dataInicio = new Date().toISOString()
      } else if (newStatus === 'concluída') {
        updates.dataFim = new Date().toISOString()
      }

      await entities.ordens_producao.update(ordemId, updates)
      await fetchData()
      toast.success('Status atualizado com sucesso')
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      toast.error('Erro ao atualizar status')
    }
  }

  const calcularProgresso = (ordem: any) => {
    if (ordem.status === 'concluída') return 100
    if (ordem.status === 'cancelada') return 0
    if (ordem.status === 'planejada') return 0
    
    // Cálculo simples baseado no tempo decorrido
    if (ordem.dataInicio && ordem.dataFimPrevista) {
      const inicio = new Date(ordem.dataInicio).getTime()
      const fimPrevisto = new Date(ordem.dataFimPrevista).getTime()
      const agora = new Date().getTime()
      
      if (agora >= fimPrevisto) return 95 // Quase 100% se passou do prazo
      
      const tempoTotal = fimPrevisto - inicio
      const tempoDecorrido = agora - inicio
      
      return Math.min(Math.max((tempoDecorrido / tempoTotal) * 100, 5), 95)
    }
    
    return 25 // Valor padrão para ordens em andamento
  }

  // Estatísticas
  const ordensEmAndamento = ordensProducao.filter(o => o.status === 'em_andamento').length
  const ordensConcluidas = ordensProducao.filter(o => o.status === 'concluída').length
  const ordensAtrasadas = ordensProducao.filter(o => {
    if (o.status === 'concluída' || o.status === 'cancelada') return false
    return new Date(o.dataFimPrevista) < new Date()
  }).length
  const eficienciaProducao = ordensProducao.length > 0 ? (ordensConcluidas / ordensProducao.length) * 100 : 0

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
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Produção</h1>
          <p className="text-gray-600">Controle de ordens de produção e acompanhamento de fabricação</p>
        </div>
        
        <button
          onClick={() => openModal(null, 'create')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nova Ordem de Produção
        </button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Em Andamento</p>
              <p className="text-2xl font-bold text-yellow-600">{ordensEmAndamento}</p>
            </div>
            <Play className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Concluídas</p>
              <p className="text-2xl font-bold text-green-600">{ordensConcluidas}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Atrasadas</p>
              <p className="text-2xl font-bold text-red-600">{ordensAtrasadas}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Eficiência</p>
              <p className="text-2xl font-bold text-blue-600">{eficienciaProducao.toFixed(1)}%</p>
            </div>
            <Factory className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Alertas de Atraso */}
      {ordensAtrasadas > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-red-800">Ordens Atrasadas</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ordensProducao
              .filter(o => {
                if (o.status === 'concluída' || o.status === 'cancelada') return false
                return new Date(o.dataFimPrevista) < new Date()
              })
              .slice(0, 6)
              .map((ordem) => (
                <div key={ordem.id} className="bg-white p-4 rounded-lg border border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{ordem.numeroOrdem}</p>
                      <p className="text-sm text-gray-600">{ordem.produtoId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">
                        {Math.ceil((new Date().getTime() - new Date(ordem.dataFimPrevista).getTime()) / (1000 * 60 * 60 * 24))} dias
                      </p>
                      <p className="text-xs text-gray-500">de atraso</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar ordens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="todos">Todos os Status</option>
            <option value="planejada">Planejada</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="pausada">Pausada</option>
            <option value="concluída">Concluída</option>
            <option value="cancelada">Cancelada</option>
          </select>

          <button className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="h-5 w-5 mr-2" />
            Relatórios
          </button>
        </div>
      </div>

      {/* Lista de Ordens */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ordem
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prioridade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progresso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prazo
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
              {filteredOrdens.map((ordem, index) => {
                const StatusIcon = getStatusIcon(ordem.status)
                const progresso = calcularProgresso(ordem)
                const atrasada = new Date(ordem.dataFimPrevista) < new Date() && ordem.status !== 'concluída' && ordem.status !== 'cancelada'
                
                return (
                  <motion.tr
                    key={ordem.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`hover:bg-gray-50 ${atrasada ? 'bg-red-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <StatusIcon className={`h-5 w-5 mr-3 ${
                          ordem.status === 'concluída' ? 'text-green-500' :
                          ordem.status === 'em_andamento' ? 'text-yellow-500' :
                          ordem.status === 'cancelada' ? 'text-red-500' :
                          'text-gray-500'
                        }`} />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {ordem.numeroOrdem}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {ordem.id?.slice(-8)}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{ordem.produtoId}</div>
                      <div className="text-sm text-gray-500">{ordem.descricao}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{ordem.quantidade}</div>
                      <div className="text-sm text-gray-500">unidades</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPrioridadeColor(ordem.prioridade)}`}>
                        {ordem.prioridade}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full ${
                              ordem.status === 'concluída' ? 'bg-green-500' :
                              ordem.status === 'cancelada' ? 'bg-red-500' :
                              atrasada ? 'bg-red-400' :
                              'bg-blue-500'
                            }`}
                            style={{ width: `${progresso}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-12">
                          {progresso.toFixed(0)}%
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${atrasada ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                        {new Date(ordem.dataFimPrevista).toLocaleDateString('pt-BR')}
                        {atrasada && (
                          <div className="flex items-center mt-1">
                            <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />
                            <span className="text-xs">Atrasada</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={ordem.status}
                        onChange={(e) => handleStatusChange(ordem.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full border-0 ${getStatusColor(ordem.status)}`}
                      >
                        <option value="planejada">Planejada</option>
                        <option value="em_andamento">Em Andamento</option>
                        <option value="pausada">Pausada</option>
                        <option value="concluída">Concluída</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openModal(ordem, 'view')}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openModal(ordem, 'edit')}
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

        {filteredOrdens.length === 0 && (
          <div className="text-center py-12">
            <Factory className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma ordem encontrada</h3>
            <p className="text-gray-500">Tente ajustar os filtros ou criar uma nova ordem de produção.</p>
          </div>
        )}
      </div>

      {/* Modal de Detalhes/Edição */}
      {showModal && selectedOrdem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {modalMode === 'create' ? 'Nova Ordem de Produção' : 
                 modalMode === 'edit' ? 'Editar Ordem de Produção' : 'Detalhes da Ordem de Produção'}
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número da Ordem
                  </label>
                  <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
                    {selectedOrdem.numeroOrdem}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedOrdem.status)}`}>
                    {selectedOrdem.status}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Produto
                </label>
                <p className="text-sm text-gray-900">{selectedOrdem.produtoId}</p>
                {selectedOrdem.descricao && (
                  <p className="text-sm text-gray-500">{selectedOrdem.descricao}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantidade
                  </label>
                  <p className="text-lg font-semibold text-gray-900">{selectedOrdem.quantidade} unidades</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridade
                  </label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPrioridadeColor(selectedOrdem.prioridade)}`}>
                    {selectedOrdem.prioridade}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Início
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedOrdem.dataInicio 
                      ? new Date(selectedOrdem.dataInicio).toLocaleDateString('pt-BR')
                      : '-'
                    }
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prazo Previsto
                  </label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedOrdem.dataFimPrevista).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Conclusão
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedOrdem.dataFim 
                      ? new Date(selectedOrdem.dataFim).toLocaleDateString('pt-BR')
                      : '-'
                    }
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Progresso
                </label>
                <div className="flex items-center">
                  <div className="flex-1 bg-gray-200 rounded-full h-3 mr-3">
                    <div
                      className={`h-3 rounded-full ${
                        selectedOrdem.status === 'concluída' ? 'bg-green-500' :
                        selectedOrdem.status === 'cancelada' ? 'bg-red-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${calcularProgresso(selectedOrdem)}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {calcularProgresso(selectedOrdem).toFixed(0)}%
                  </span>
                </div>
              </div>

              {selectedOrdem.observacoes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {selectedOrdem.observacoes}
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

export default Producao
