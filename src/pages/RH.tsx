
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  UserPlus, 
  Calendar, 
  Clock,
  DollarSign,
  Award,
  AlertTriangle,
  CheckCircle,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Phone,
  Mail
} from 'lucide-react'
import { entities } from '../lib/database'
import toast from 'react-hot-toast'

const RH: React.FC = () => {
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [cargoFilter, setCargoFilter] = useState('todos')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [showModal, setShowModal] = useState(false)
  const [selectedFuncionario, setSelectedFuncionario] = useState<any>(null)
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view')

  useEffect(() => {
    fetchFuncionarios()
  }, [])

  const fetchFuncionarios = async () => {
    try {
      setLoading(true)
      const { list } = await entities.funcionarios.list()
      setFuncionarios(list || [])
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error)
      toast.error('Erro ao carregar dados de funcionários')
    } finally {
      setLoading(false)
    }
  }

  const filteredFuncionarios = funcionarios.filter(funcionario => {
    const matchesSearch = funcionario.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         funcionario.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         funcionario.cpf?.includes(searchTerm)
    const matchesCargo = cargoFilter === 'todos' || funcionario.cargo === cargoFilter
    const matchesStatus = statusFilter === 'todos' || funcionario.status === statusFilter
    
    return matchesSearch && matchesCargo && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-green-100 text-green-800'
      case 'inativo': return 'bg-red-100 text-red-800'
      case 'ferias': return 'bg-blue-100 text-blue-800'
      case 'afastado': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ativo': return CheckCircle
      case 'inativo': return AlertTriangle
      case 'ferias': return Calendar
      case 'afastado': return Clock
      default: return Users
    }
  }

  const openModal = (funcionario: any = null, mode: 'view' | 'edit' | 'create' = 'view') => {
    setSelectedFuncionario(funcionario)
    setModalMode(mode)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedFuncionario(null)
    setModalMode('view')
  }

  const handleStatusChange = async (funcionarioId: string, newStatus: string) => {
    try {
      await entities.funcionarios.update(funcionarioId, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      })
      
      await fetchFuncionarios()
      toast.success('Status atualizado com sucesso')
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      toast.error('Erro ao atualizar status')
    }
  }

  // Estatísticas
  const funcionariosAtivos = funcionarios.filter(f => f.status === 'ativo').length
  const funcionariosFerias = funcionarios.filter(f => f.status === 'ferias').length
  const funcionariosAfastados = funcionarios.filter(f => f.status === 'afastado').length
  const folhaPagamento = funcionarios
    .filter(f => f.status === 'ativo')
    .reduce((acc, f) => acc + (f.salario || 0), 0)

  // Cargos únicos para filtro
  const cargosUnicos = [...new Set(funcionarios.map(f => f.cargo).filter(Boolean))]

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
          <h1 className="text-2xl font-bold text-gray-900">Recursos Humanos</h1>
          <p className="text-gray-600">Gestão de funcionários, folha de pagamento e benefícios</p>
        </div>
        
        <button
          onClick={() => openModal(null, 'create')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Novo Funcionário
        </button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Funcionários Ativos</p>
              <p className="text-2xl font-bold text-green-600">{funcionariosAtivos}</p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Em Férias</p>
              <p className="text-2xl font-bold text-blue-600">{funcionariosFerias}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Afastados</p>
              <p className="text-2xl font-bold text-yellow-600">{funcionariosAfastados}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Folha de Pagamento</p>
              <p className="text-2xl font-bold text-purple-600">
                R$ {folhaPagamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar funcionários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={cargoFilter}
            onChange={(e) => setCargoFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="todos">Todos os Cargos</option>
            {cargosUnicos.map(cargo => (
              <option key={cargo} value={cargo}>{cargo}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="todos">Todos os Status</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="ferias">Férias</option>
            <option value="afastado">Afastado</option>
          </select>

          <button className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="h-5 w-5 mr-2" />
            Relatórios
          </button>
        </div>
      </div>

      {/* Lista de Funcionários */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Funcionário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cargo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Departamento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Salário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admissão
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
              {filteredFuncionarios.map((funcionario, index) => {
                const StatusIcon = getStatusIcon(funcionario.status)
                
                return (
                  <motion.tr
                    key={funcionario.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <Users className="h-6 w-6 text-gray-500" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {funcionario.nome}
                          </div>
                          <div className="text-sm text-gray-500">
                            {funcionario.cpf}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{funcionario.cargo}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{funcionario.departamento}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        R$ {funcionario.salario?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {funcionario.dataAdmissao ? new Date(funcionario.dataAdmissao).toLocaleDateString('pt-BR') : '-'}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <StatusIcon className={`h-4 w-4 mr-2 ${
                          funcionario.status === 'ativo' ? 'text-green-500' :
                          funcionario.status === 'ferias' ? 'text-blue-500' :
                          funcionario.status === 'afastado' ? 'text-yellow-500' :
                          'text-red-500'
                        }`} />
                        <select
                          value={funcionario.status}
                          onChange={(e) => handleStatusChange(funcionario.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded-full border-0 ${getStatusColor(funcionario.status)}`}
                        >
                          <option value="ativo">Ativo</option>
                          <option value="inativo">Inativo</option>
                          <option value="ferias">Férias</option>
                          <option value="afastado">Afastado</option>
                        </select>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openModal(funcionario, 'view')}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openModal(funcionario, 'edit')}
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

        {filteredFuncionarios.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum funcionário encontrado</h3>
            <p className="text-gray-500">Tente ajustar os filtros ou adicionar um novo funcionário.</p>
          </div>
        )}
      </div>

      {/* Modal de Detalhes/Edição */}
      {showModal && selectedFuncionario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {modalMode === 'create' ? 'Novo Funcionário' : 
                 modalMode === 'edit' ? 'Editar Funcionário' : 'Detalhes do Funcionário'}
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo
                  </label>
                  <p className="text-sm text-gray-900 font-medium">{selectedFuncionario.nome}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CPF
                  </label>
                  <p className="text-sm text-gray-900 font-mono">{selectedFuncionario.cpf}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cargo
                  </label>
                  <p className="text-sm text-gray-900">{selectedFuncionario.cargo}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Departamento
                  </label>
                  <p className="text-sm text-gray-900">{selectedFuncionario.departamento}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Salário
                  </label>
                  <p className="text-lg font-bold text-green-600">
                    R$ {selectedFuncionario.salario?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedFuncionario.status)}`}>
                    {selectedFuncionario.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Admissão
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedFuncionario.dataAdmissao ? new Date(selectedFuncionario.dataAdmissao).toLocaleDateString('pt-BR') : '-'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Nascimento
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedFuncionario.dataNascimento ? new Date(selectedFuncionario.dataNascimento).toLocaleDateString('pt-BR') : '-'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">{selectedFuncionario.telefone || '-'}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">{selectedFuncionario.email || '-'}</p>
                  </div>
                </div>
              </div>

              {selectedFuncionario.endereco && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Endereço
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {selectedFuncionario.endereco}
                  </p>
                </div>
              )}

              {selectedFuncionario.observacoes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {selectedFuncionario.observacoes}
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

export default RH
