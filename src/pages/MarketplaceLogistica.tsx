
import React, { useState, useEffect } from 'react';
import { Search, Truck, Package, Clock, CheckCircle, AlertCircle, MapPin } from 'lucide-react';

interface StatusLogistica {
  id: string;
  descricao: string;
  dataHora: string;
  localizacao?: string;
}

interface PedidoLogistica {
  pedidoId: string;
  loja: string;
  statusAtual: string;
  dataEnvio?: string;
  codigoRastreamento?: string;
  transportadora: string;
  historico: StatusLogistica[];
}

const MarketplaceLogistica: React.FC = () => {
  const [pedidos, setPedidos] = useState<PedidoLogistica[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pedidosExemplo: PedidoLogistica[] = [
      {
        pedidoId: 'PED-001',
        loja: 'Loja Centro',
        statusAtual: 'Enviado',
        dataEnvio: '2025-01-15',
        codigoRastreamento: 'BR123456789BR',
        transportadora: 'Correios',
        historico: [
          {
            id: '1',
            descricao: 'Pedido enviado',
            dataHora: '2025-01-15T08:00:00',
            localizacao: 'São Paulo - SP'
          },
          {
            id: '2',
            descricao: 'Objeto em trânsito',
            dataHora: '2025-01-15T14:30:00',
            localizacao: 'Centro de Distribuição - SP'
          },
          {
            id: '3',
            descricao: 'Saiu para entrega',
            dataHora: '2025-01-16T09:15:00',
            localizacao: 'Unidade de Entrega - Centro'
          }
        ]
      },
      {
        pedidoId: 'PED-002',
        loja: 'Loja Shopping',
        statusAtual: 'Aguardando Coleta',
        transportadora: 'Transportadora XYZ',
        historico: [
          {
            id: '1',
            descricao: 'Aguardando coleta',
            dataHora: '2025-01-16T10:00:00',
            localizacao: 'Centro de Distribuição'
          }
        ]
      },
      {
        pedidoId: 'PED-003',
        loja: 'Loja Norte',
        statusAtual: 'Coleta Agendada',
        transportadora: 'Total Express',
        historico: [
          {
            id: '1',
            descricao: 'Coleta agendada',
            dataHora: '2025-01-16T15:00:00',
            localizacao: 'Agendamento para 17/01/2025'
          }
        ]
      }
    ];

    setTimeout(() => {
      setPedidos(pedidosExemplo);
      setLoading(false);
    }, 1000);
  }, []);

  const pedidosFiltrados = pedidos.filter(pedido => {
    const matchBusca = !busca || 
      pedido.pedidoId.toLowerCase().includes(busca.toLowerCase()) ||
      pedido.loja.toLowerCase().includes(busca.toLowerCase()) ||
      (pedido.codigoRastreamento && pedido.codigoRastreamento.toLowerCase().includes(busca.toLowerCase()));
    
    const matchStatus = !filtroStatus || pedido.statusAtual === filtroStatus;
    
    return matchBusca && matchStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Enviado': return <Truck className="h-5 w-5 text-blue-600" />;
      case 'Aguardando Coleta': return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'Coleta Agendada': return <AlertCircle className="h-5 w-5 text-orange-600" />;
      case 'Entregue': return <CheckCircle className="h-5 w-5 text-green-600" />;
      default: return <Package className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Enviado': return 'bg-blue-100 text-blue-800';
      case 'Aguardando Coleta': return 'bg-yellow-100 text-yellow-800';
      case 'Coleta Agendada': return 'bg-orange-100 text-orange-800';
      case 'Entregue': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
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
            <h1 className="text-2xl font-bold text-gray-900">Logística</h1>
            <p className="text-gray-600">Acompanhamento do histórico e status dos pedidos</p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Truck className="h-4 w-4" />
            <span>{pedidosFiltrados.length} pedidos</span>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar por pedido, loja ou código de rastreamento..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos os status</option>
              <option value="Enviado">Enviado</option>
              <option value="Aguardando Coleta">Aguardando Coleta</option>
              <option value="Coleta Agendada">Coleta Agendada</option>
              <option value="Entregue">Entregue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Pedidos */}
      <div className="space-y-6">
        {pedidosFiltrados.map((pedido) => (
          <div key={pedido.pedidoId} className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              {/* Cabeçalho do Pedido */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    {getStatusIcon(pedido.statusAtual)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{pedido.pedidoId}</h3>
                    <p className="text-sm text-gray-500">{pedido.loja}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(pedido.statusAtual)}`}>
                    {pedido.statusAtual}
                  </span>
                </div>
              </div>

              {/* Informações de Envio */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700">Transportadora</p>
                  <p className="text-sm text-gray-900">{pedido.transportadora}</p>
                </div>
                {pedido.dataEnvio && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Data de Envio</p>
                    <p className="text-sm text-gray-900">
                      {new Date(pedido.dataEnvio).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}
                {pedido.codigoRastreamento && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Código de Rastreamento</p>
                    <p className="text-sm font-mono text-gray-900">{pedido.codigoRastreamento}</p>
                  </div>
                )}
              </div>

              {/* Histórico de Status */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-4">Histórico de Rastreamento</h4>
                <div className="space-y-4">
                  {pedido.historico.map((status, index) => (
                    <div key={status.id} className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                        {index !== pedido.historico.length - 1 && (
                          <div className="w-0.5 h-8 bg-gray-200 ml-1 mt-1"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">{status.descricao}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(status.dataHora).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        {status.localizacao && (
                          <div className="flex items-center space-x-1 mt-1">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <p className="text-xs text-gray-500">{status.localizacao}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {pedidosFiltrados.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum pedido encontrado</h3>
          <p className="text-gray-500">Tente ajustar os filtros de busca</p>
        </div>
      )}
    </div>
  );
};

export default MarketplaceLogistica;
