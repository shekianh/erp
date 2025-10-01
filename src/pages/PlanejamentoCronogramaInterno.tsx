
import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit, Trash2, Clock, Users, Factory } from 'lucide-react';

interface Setor {
  id: string;
  nome: string;
  cor: string;
}

interface TarefaCronograma {
  id: string;
  setor: string;
  descricao: string;
  dataInicio: string;
  dataFim: string;
  status: 'planejado' | 'em_andamento' | 'concluido';
  responsavel: string;
}

const PlanejamentoCronogramaInterno: React.FC = () => {
  const [tarefas, setTarefas] = useState<TarefaCronograma[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [tarefaEditando, setTarefaEditando] = useState<TarefaCronograma | null>(null);
  const [filtroSetor, setFiltroSetor] = useState('');
  const [loading, setLoading] = useState(true);

  const setores: Setor[] = [
    { id: 'planejamento', nome: 'Planejamento', cor: 'bg-blue-500' },
    { id: 'retirada_plano', nome: 'Retirada de Plano', cor: 'bg-green-500' },
    { id: 'corte', nome: 'Corte', cor: 'bg-yellow-500' },
    { id: 'pesponto', nome: 'Pesponto', cor: 'bg-purple-500' },
    { id: 'banca', nome: 'Banca', cor: 'bg-pink-500' },
    { id: 'sola', nome: 'Sola', cor: 'bg-indigo-500' },
    { id: 'enfachamento', nome: 'Enfachamento', cor: 'bg-red-500' },
    { id: 'palmilha', nome: 'Palmilha', cor: 'bg-orange-500' },
    { id: 'montagem', nome: 'Montagem', cor: 'bg-teal-500' }
  ];

  useEffect(() => {
    const tarefasExemplo: TarefaCronograma[] = [
      {
        id: '1',
        setor: 'planejamento',
        descricao: 'Planejamento linha verão 2025',
        dataInicio: '2025-01-16',
        dataFim: '2025-01-18',
        status: 'em_andamento',
        responsavel: 'João Silva'
      },
      {
        id: '2',
        setor: 'corte',
        descricao: 'Corte modelo sandália 123',
        dataInicio: '2025-01-19',
        dataFim: '2025-01-21',
        status: 'planejado',
        responsavel: 'Maria Santos'
      },
      {
        id: '3',
        setor: 'montagem',
        descricao: 'Montagem lote 500 pares',
        dataInicio: '2025-01-22',
        dataFim: '2025-01-25',
        status: 'planejado',
        responsavel: 'Pedro Costa'
      }
    ];

    setTimeout(() => {
      setTarefas(tarefasExemplo);
      setLoading(false);
    }, 1000);
  }, []);

  const getSetorInfo = (setorId: string) => {
    return setores.find(s => s.id === setorId) || { nome: setorId, cor: 'bg-gray-500' };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planejado': return 'bg-yellow-100 text-yellow-800';
      case 'em_andamento': return 'bg-blue-100 text-blue-800';
      case 'concluido': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'planejado': return 'Planejado';
      case 'em_andamento': return 'Em Andamento';
      case 'concluido': return 'Concluído';
      default: return status;
    }
  };

  const tarefasFiltradas = tarefas.filter(tarefa => 
    !filtroSetor || tarefa.setor === filtroSetor
  );

  const handleSalvarTarefa = (dadosTarefa: Partial<TarefaCronograma>) => {
    if (tarefaEditando) {
      setTarefas(prev => prev.map(t => 
        t.id === tarefaEditando.id ? { ...t, ...dadosTarefa } : t
      ));
    } else {
      const novaTarefa: TarefaCronograma = {
        id: Date.now().toString(),
        setor: dadosTarefa.setor || '',
        descricao: dadosTarefa.descricao || '',
        dataInicio: dadosTarefa.dataInicio || '',
        dataFim: dadosTarefa.dataFim || '',
        status: dadosTarefa.status || 'planejado',
        responsavel: dadosTarefa.responsavel || ''
      };
      setTarefas(prev => [...prev, novaTarefa]);
    }
    setShowModal(false);
    setTarefaEditando(null);
  };

  const handleExcluirTarefa = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
      setTarefas(prev => prev.filter(t => t.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cronograma Produção Interno</h1>
            <p className="text-gray-600">Planejamento por setores da empresa</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Tarefa</span>
          </button>
        </div>

        {/* Filtro por Setor */}
        <div className="flex items-center space-x-4">
          <select
            value={filtroSetor}
            onChange={(e) => setFiltroSetor(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos os setores</option>
            {setores.map(setor => (
              <option key={setor.id} value={setor.id}>{setor.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Legenda dos Setores */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Setores de Produção</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {setores.map(setor => (
            <div key={setor.id} className="flex items-center space-x-2">
              <div className={`w-4 h-4 rounded ${setor.cor}`}></div>
              <span className="text-sm text-gray-700">{setor.nome}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Lista de Tarefas */}
      <div className="space-y-4">
        {tarefasFiltradas.map((tarefa) => {
          const setorInfo = getSetorInfo(tarefa.setor);
          return (
            <div key={tarefa.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className={`w-4 h-4 rounded mt-1 ${setorInfo.cor}`}></div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{tarefa.descricao}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tarefa.status)}`}>
                        {getStatusText(tarefa.status)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Factory className="h-4 w-4" />
                        <span>{setorInfo.nome}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>{tarefa.responsavel}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          {new Date(tarefa.dataInicio).toLocaleDateString('pt-BR')} - {' '}
                          {new Date(tarefa.dataFim).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setTarefaEditando(tarefa);
                      setShowModal(true);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleExcluirTarefa(tarefa.id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {tarefasFiltradas.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma tarefa encontrada</h3>
          <p className="text-gray-500">Comece criando uma nova tarefa no cronograma</p>
        </div>
      )}

      {/* Modal de Criar/Editar Tarefa */}
      {showModal && (
        <ModalTarefa
          tarefa={tarefaEditando}
          setores={setores}
          onSalvar={handleSalvarTarefa}
          onFechar={() => {
            setShowModal(false);
            setTarefaEditando(null);
          }}
        />
      )}
    </div>
  );
};

// Componente Modal para criar/editar tarefas
interface ModalTarefaProps {
  tarefa: TarefaCronograma | null;
  setores: Setor[];
  onSalvar: (dados: Partial<TarefaCronograma>) => void;
  onFechar: () => void;
}

const ModalTarefa: React.FC<ModalTarefaProps> = ({ tarefa, setores, onSalvar, onFechar }) => {
  const [formData, setFormData] = useState({
    setor: tarefa?.setor || '',
    descricao: tarefa?.descricao || '',
    dataInicio: tarefa?.dataInicio || '',
    dataFim: tarefa?.dataFim || '',
    status: tarefa?.status || 'planejado',
    responsavel: tarefa?.responsavel || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSalvar(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {tarefa ? 'Editar Tarefa' : 'Nova Tarefa'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Setor</label>
            <select
              value={formData.setor}
              onChange={(e) => setFormData(prev => ({ ...prev, setor: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selecione um setor</option>
              {setores.map(setor => (
                <option key={setor.id} value={setor.id}>{setor.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
            <input
              type="text"
              value={formData.descricao}
              onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
              <input
                type="date"
                value={formData.dataInicio}
                onChange={(e) => setFormData(prev => ({ ...prev, dataInicio: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
              <input
                type="date"
                value={formData.dataFim}
                onChange={(e) => setFormData(prev => ({ ...prev, dataFim: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Responsável</label>
            <input
              type="text"
              value={formData.responsavel}
              onChange={(e) => setFormData(prev => ({ ...prev, responsavel: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="planejado">Planejado</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="concluido">Concluído</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onFechar}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlanejamentoCronogramaInterno;
