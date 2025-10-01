
import React, { useState } from 'react';
import { Users, Clock, Calendar, TrendingUp, UserCheck, UserX, Award, AlertTriangle } from 'lucide-react';

const RHResumos: React.FC = () => {
  const [periodoSelecionado, setPeriodoSelecionado] = useState('mes_atual');

  const metricas = {
    total_colaboradores: 145,
    presentes_hoje: 132,
    faltas_hoje: 8,
    atestados_hoje: 5,
    ferias_mes: 12,
    aniversariantes_mes: 7,
    horas_extras_mes: 2840,
    media_presenca: 91.2
  };

  const departamentos = [
    { nome: 'Produção', colaboradores: 85, presentes: 78, ausentes: 7 },
    { nome: 'Administrativo', colaboradores: 25, presentes: 24, ausentes: 1 },
    { nome: 'Vendas', colaboradores: 15, presentes: 14, ausentes: 1 },
    { nome: 'Logística', colaboradores: 12, presentes: 10, ausentes: 2 },
    { nome: 'Qualidade', colaboradores: 8, presentes: 6, ausentes: 2 }
  ];

  const alertas = [
    { tipo: 'falta_excessiva', colaborador: 'João Silva', departamento: 'Produção', detalhes: '5 faltas este mês' },
    { tipo: 'aniversario', colaborador: 'Maria Santos', departamento: 'Administrativo', detalhes: 'Aniversário hoje' },
    { tipo: 'ferias_vencendo', colaborador: 'Pedro Costa', departamento: 'Vendas', detalhes: 'Férias vencem em 15 dias' },
    { tipo: 'hora_extra_excessiva', colaborador: 'Ana Lima', departamento: 'Produção', detalhes: '45h extras este mês' }
  ];

  const getAlertIcon = (tipo: string) => {
    switch (tipo) {
      case 'falta_excessiva': return <UserX className="h-4 w-4 text-red-500" />;
      case 'aniversario': return <Award className="h-4 w-4 text-green-500" />;
      case 'ferias_vencendo': return <Calendar className="h-4 w-4 text-yellow-500" />;
      case 'hora_extra_excessiva': return <Clock className="h-4 w-4 text-orange-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getAlertColor = (tipo: string) => {
    switch (tipo) {
      case 'falta_excessiva': return 'bg-red-50 border-red-200';
      case 'aniversario': return 'bg-green-50 border-green-200';
      case 'ferias_vencendo': return 'bg-yellow-50 border-yellow-200';
      case 'hora_extra_excessiva': return 'bg-orange-50 border-orange-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Users className="h-6 w-6 mr-3 text-blue-600" />
              Recursos Humanos - Resumos
            </h1>
            <p className="text-gray-600">Visão geral dos indicadores de RH</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={periodoSelecionado}
              onChange={(e) => setPeriodoSelecionado(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="hoje">Hoje</option>
              <option value="semana_atual">Esta Semana</option>
              <option value="mes_atual">Este Mês</option>
              <option value="trimestre">Trimestre</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Colaboradores</p>
              <p className="text-2xl font-bold text-gray-900">{metricas.total_colaboradores}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Presentes Hoje</p>
              <p className="text-2xl font-bold text-gray-900">{metricas.presentes_hoje}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <UserX className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Faltas Hoje</p>
              <p className="text-2xl font-bold text-gray-900">{metricas.faltas_hoje}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Média Presença</p>
              <p className="text-2xl font-bold text-gray-900">{metricas.media_presenca}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Departamentos */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Presença por Departamento</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {departamentos.map((dept, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{dept.nome}</h3>
                  <p className="text-sm text-gray-600">
                    {dept.colaboradores} colaboradores
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-600">{dept.presentes}</p>
                    <p className="text-xs text-gray-500">Presentes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-red-600">{dept.ausentes}</p>
                    <p className="text-xs text-gray-500">Ausentes</p>
                  </div>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${(dept.presentes / dept.colaboradores) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alertas e Notificações */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Alertas e Notificações</h2>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {alertas.map((alerta, index) => (
              <div key={index} className={`p-4 rounded-lg border ${getAlertColor(alerta.tipo)}`}>
                <div className="flex items-center">
                  {getAlertIcon(alerta.tipo)}
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">{alerta.colaborador}</p>
                    <p className="text-sm text-gray-600">{alerta.departamento} • {alerta.detalhes}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Métricas Adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Férias no Mês</h3>
            <Calendar className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-600">{metricas.ferias_mes}</p>
          <p className="text-sm text-gray-600">colaboradores</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Aniversários</h3>
            <Award className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600">{metricas.aniversariantes_mes}</p>
          <p className="text-sm text-gray-600">este mês</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Horas Extras</h3>
            <Clock className="h-5 w-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-orange-600">{metricas.horas_extras_mes}</p>
          <p className="text-sm text-gray-600">horas no mês</p>
        </div>
      </div>
    </div>
  );
};

export default RHResumos;
