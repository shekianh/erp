
import React, { useState } from 'react';
import { Package, Plus, Minus, Search, BarChart3, AlertTriangle } from 'lucide-react';

const AlmoxarifadoEnfite: React.FC = () => {
  const [filtro, setFiltro] = useState('');
  const [tipoMovimento, setTipoMovimento] = useState<'entrada' | 'saida' | null>(null);

  const enfites = [
    { id: 1, codigo: 'ENF-001', descricao: 'Enfite PVC Preto 40mm', estoque: 150, minimo: 50, unidade: 'metros' },
    { id: 2, codigo: 'ENF-002', descricao: 'Enfite PVC Branco 35mm', estoque: 200, minimo: 75, unidade: 'metros' },
    { id: 3, codigo: 'ENF-003', descricao: 'Enfite Algodão Natural 30mm', estoque: 80, minimo: 100, unidade: 'metros' },
    { id: 4, codigo: 'ENF-004', descricao: 'Enfite Sintético Azul 25mm', estoque: 120, minimo: 60, unidade: 'metros' },
    { id: 5, codigo: 'ENF-005', descricao: 'Enfite Elástico Preto 20mm', estoque: 45, minimo: 80, unidade: 'metros' }
  ];

  const movimentacoes = [
    { id: 1, data: '2024-01-15', tipo: 'entrada', codigo: 'ENF-001', quantidade: 50, motivo: 'Compra - NF 12345' },
    { id: 2, data: '2024-01-15', tipo: 'saida', codigo: 'ENF-002', quantidade: 25, motivo: 'Produção - OP 001' },
    { id: 3, data: '2024-01-14', tipo: 'saida', codigo: 'ENF-003', quantidade: 30, motivo: 'Produção - OP 002' },
    { id: 4, data: '2024-01-14', tipo: 'entrada', codigo: 'ENF-004', quantidade: 100, motivo: 'Compra - NF 12346' }
  ];

  const getStatusEstoque = (atual: number, minimo: number) => {
    if (atual < minimo) {
      return { status: 'baixo', color: 'bg-red-100 text-red-800', icon: <AlertTriangle className="h-4 w-4" /> };
    } else if (atual < minimo * 1.5) {
      return { status: 'atencao', color: 'bg-yellow-100 text-yellow-800', icon: <AlertTriangle className="h-4 w-4" /> };
    }
    return { status: 'normal', color: 'bg-green-100 text-green-800', icon: <Package className="h-4 w-4" /> };
  };

  const enfitesFiltrados = enfites.filter(enfite =>
    enfite.codigo.toLowerCase().includes(filtro.toLowerCase()) ||
    enfite.descricao.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Package className="h-6 w-6 mr-3 text-blue-600" />
              Almoxarifado - Enfites
            </h1>
            <p className="text-gray-600">Controle de estoque de enfites e acessórios</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              <Plus className="h-4 w-4 mr-2" />
              Nova Entrada
            </button>
            <button className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              <Minus className="h-4 w-4 mr-2" />
              Nova Saída
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar por código ou descrição..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Itens</p>
              <p className="text-2xl font-bold text-gray-900">{enfites.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Estoque Total</p>
              <p className="text-2xl font-bold text-gray-900">
                {enfites.reduce((acc, item) => acc + item.estoque, 0)}m
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Estoque Baixo</p>
              <p className="text-2xl font-bold text-gray-900">
                {enfites.filter(item => item.estoque < item.minimo).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Minus className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Saídas Hoje</p>
              <p className="text-2xl font-bold text-gray-900">3</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Estoque */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Estoque Atual</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrição
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estoque Atual
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estoque Mínimo
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
              {enfitesFiltrados.map(enfite => {
                const statusInfo = getStatusEstoque(enfite.estoque, enfite.minimo);
                return (
                  <tr key={enfite.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {enfite.codigo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {enfite.descricao}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {enfite.estoque} {enfite.unidade}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {enfite.minimo} {enfite.unidade}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.icon}
                        <span className="ml-1 capitalize">{statusInfo.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button className="text-green-600 hover:text-green-900">Entrada</button>
                        <button className="text-red-600 hover:text-red-900">Saída</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Últimas Movimentações */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Últimas Movimentações</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Motivo
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {movimentacoes.map(mov => (
                <tr key={mov.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(mov.data).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      mov.tipo === 'entrada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {mov.codigo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {mov.quantidade}m
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {mov.motivo}
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

export default AlmoxarifadoEnfite;
