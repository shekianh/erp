
import React, { useState } from 'react';
import { Factory, Clock, CheckCircle, AlertCircle, Users, Calendar } from 'lucide-react';

const ProducaoAcompanhamentoInterno: React.FC = () => {
  const [filtroSetor, setFiltroSetor] = useState('');
  
  const setores = [
    { id: 1, nome: 'Corte', responsavel: 'João Silva', status: 'ativo', producao: 85 },
    { id: 2, nome: 'Costura', responsavel: 'Maria Santos', status: 'ativo', producao: 92 },
    { id: 3, nome: 'Montagem', responsavel: 'Pedro Costa', status: 'parado', producao: 0 },
    { id: 4, nome: 'Acabamento', responsavel: 'Ana Lima', status: 'ativo', producao: 78 },
    { id: 5, nome: 'Embalagem', responsavel: 'Carlos Rocha', status: 'ativo', producao: 95 }
  ];

  const ordens = [
    { id: 'OP-001', produto: 'Tênis Esportivo Azul', quantidade: 500, setor: 'Corte', status: 'em_andamento', progresso: 75 },
    { id: 'OP-002', produto: 'Sandália Feminina Rosa', quantidade: 300, setor: 'Costura', status: 'em_andamento', progresso: 60 },
    { id: 'OP-003', produto: 'Sapato Social Preto', quantidade: 200, setor: 'Montagem', status: 'pendente', progresso: 0 },
    { id: 'OP-004', produto: 'Chinelo Masculino', quantidade: 800, setor: 'Acabamento', status: 'em_andamento', progresso: 40 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-green-100 text-green-800';
      case 'parado': return 'bg-red-100 text-red-800';
      case 'em_andamento': return 'bg-blue-100 text-blue-800';
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ativo': return <CheckCircle className="h-4 w-4" />;
      case 'parado': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Factory className="h-6 w-6 mr-3 text-blue-600" />
              Acompanhamento Interno de Produção
            </h1>
            <p className="text-gray-600">Monitore o status de todos os setores produtivos</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              <Calendar className="h-4 w-4 inline mr-1" />
              Atualizado: {new Date().toLocaleString('pt-BR')}
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <select
            value={filtroSetor}
            onChange={(e) => setFiltroSetor(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos os setores</option>
            {setores.map(setor => (
              <option key={setor.id} value={setor.nome}>{setor.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards dos Setores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {setores.map(setor => (
          <div key={setor.id} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{setor.nome}</h3>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(setor.status)}`}>
                {getStatusIcon(setor.status)}
                <span className="ml-1 capitalize">{setor.status}</span>
              </span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <Users className="h-4 w-4 mr-2" />
                <span>Responsável: {setor.responsavel}</span>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Produção</span>
                  <span className="font-medium">{setor.producao}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${setor.producao}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ordens de Produção */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Ordens de Produção em Andamento</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
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
                  Setor Atual
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progresso
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ordens.map(ordem => (
                <tr key={ordem.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {ordem.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {ordem.produto}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {ordem.quantidade.toLocaleString()} pares
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {ordem.setor}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ordem.status)}`}>
                      {ordem.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${ordem.progresso}%` }}
                        />
                      </div>
                      <span>{ordem.progresso}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProducaoAcompanhamentoInterno;
