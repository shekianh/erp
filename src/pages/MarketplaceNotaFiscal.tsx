
import React, { useState, useEffect } from 'react';
import {Search, FileText, Eye, Download, Calendar, DollarSign, Filter, RefreshCw, Send, Edit, Plus, SquareCheck as CheckSquare, Square} from 'lucide-react';
import { supabase, LOJA_MAPEAMENTO, obterNomeLoja } from '../lib/supabase';

interface NotaFiscal {
  id_key: number;
  id_nf: string;
  numero_pedido_loja: string;
  serie: number;
  tipo: number;
  situacao: number;
  valor_nota: number;
  data_emissao: string;
  data_operacao: string;
  chave_acesso: string;
  xml_url: string;
  link_danfe: string;
  link_pdf: string;
  contato_id: string;
  contato_nome: string;
  contato_documento: string;
  loja_id: string;
  endereco_json: string;
  registro?: string;
  telefone?: string;
}

interface LojaInfo {
  id: string;
  nome: string;
  count: number;
}

const MarketplaceNotaFiscal: React.FC = () => {
  const [todasNotas, setTodasNotas] = useState<NotaFiscal[]>([]);
  const [notasFiltradas, setNotasFiltradas] = useState<NotaFiscal[]>([]);
  const [lojas, setLojas] = useState<LojaInfo[]>([]);
  const [lojaAtiva, setLojaAtiva] = useState<string>('');
  const [busca, setBusca] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [loading, setLoading] = useState(true);
  const [notasSelecionadas, setNotasSelecionadas] = useState<Set<number>>(new Set());
  const [processandoApi, setProcessandoApi] = useState(false);

  // Configurar datas padrão (últimos 7 dias)
  useEffect(() => {
    const hoje = new Date();
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(hoje.getDate() - 7);
    
    setDataFim(hoje.toISOString().split('T')[0]);
    setDataInicio(seteDiasAtras.toISOString().split('T')[0]);
  }, []);

  // Buscar notas fiscais
  const buscarNotasFiscais = async () => {
    if (!dataInicio || !dataFim) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('nota_fiscal')
        .select('*')
        .gte('data_emissao', dataInicio + 'T00:00:00')
        .lte('data_emissao', dataFim + 'T23:59:59')
        .order('data_emissao', { ascending: false });

      if (error) {
        console.error('Erro ao buscar notas fiscais:', error);
        return;
      }

      const notas = data || [];
      setTodasNotas(notas);

      // Agrupar por loja e contar
      const lojasMap = new Map<string, number>();
      notas.forEach(nota => {
        const count = lojasMap.get(nota.loja_id) || 0;
        lojasMap.set(nota.loja_id, count + 1);
      });

      const lojasInfo: LojaInfo[] = Array.from(lojasMap.entries()).map(([id, count]) => ({
        id,
        nome: obterNomeLoja(id),
        count
      })).sort((a, b) => a.nome.localeCompare(b.nome));

      setLojas(lojasInfo);
      
      // Definir primeira loja como ativa se não houver seleção
      if (!lojaAtiva && lojasInfo.length > 0) {
        setLojaAtiva(lojasInfo[0].id);
      }

    } catch (error) {
      console.error('Erro na consulta:', error);
    } finally {
      setLoading(false);
    }
  };

  // Executar busca quando as datas mudarem
  useEffect(() => {
    if (dataInicio && dataFim) {
      buscarNotasFiscais();
    }
  }, [dataInicio, dataFim]);

  // Filtrar notas por loja ativa e outros filtros
  useEffect(() => {
    let resultados = todasNotas;

    // Filtro por loja ativa
    if (lojaAtiva) {
      resultados = resultados.filter(nota => nota.loja_id === lojaAtiva);
    }

    // Filtro por busca
    if (busca) {
      resultados = resultados.filter(nota => 
        nota.id_nf.includes(busca) ||
        nota.numero_pedido_loja.includes(busca) ||
        nota.contato_nome.toLowerCase().includes(busca.toLowerCase()) ||
        nota.contato_documento.includes(busca) ||
        nota.chave_acesso.includes(busca)
      );
    }

    // Filtro por situação
    if (filtroSituacao) {
      resultados = resultados.filter(nota => nota.situacao.toString() === filtroSituacao);
    }

    setNotasFiltradas(resultados);
    // Limpar seleções quando filtros mudarem
    setNotasSelecionadas(new Set());
  }, [todasNotas, lojaAtiva, busca, filtroSituacao]);

  // Funções de seleção
  const toggleSelecionarNota = (idKey: number) => {
    const novaSelecao = new Set(notasSelecionadas);
    if (novaSelecao.has(idKey)) {
      novaSelecao.delete(idKey);
    } else {
      novaSelecao.add(idKey);
    }
    setNotasSelecionadas(novaSelecao);
  };

  const selecionarTodas = () => {
    if (notasSelecionadas.size === notasFiltradas.length) {
      setNotasSelecionadas(new Set());
    } else {
      setNotasSelecionadas(new Set(notasFiltradas.map(nota => nota.id_key)));
    }
  };

  // Funções da API Bling
  const enviarNotaParaSefaz = async (idNotaFiscal: string) => {
    setProcessandoApi(true);
    try {
      // Simulação da chamada à API Bling
      console.log(`Enviando nota ${idNotaFiscal} para Sefaz...`);
      
      // Aqui você faria a chamada real:
      // const response = await fetch(`/api/bling/nfe/${idNotaFiscal}/enviar`, {
      //   method: 'POST',
      //   headers: { 'Authorization': 'Bearer TOKEN' }
      // });
      
      alert(`Nota ${idNotaFiscal} enviada para Sefaz com sucesso!`);
      
      // Atualizar dados
      await buscarNotasFiscais();
    } catch (error) {
      console.error('Erro ao enviar nota:', error);
      alert('Erro ao enviar nota para Sefaz');
    } finally {
      setProcessandoApi(false);
    }
  };

  const atualizarNotaFiscal = async (idNotaFiscal: string, dadosAtualizacao: any) => {
    setProcessandoApi(true);
    try {
      console.log(`Atualizando nota ${idNotaFiscal}...`, dadosAtualizacao);
      
      // Aqui você faria a chamada real:
      // const response = await fetch(`/api/bling/nfe/${idNotaFiscal}`, {
      //   method: 'PUT',
      //   headers: { 
      //     'Content-Type': 'application/json',
      //     'Authorization': 'Bearer TOKEN' 
      //   },
      //   body: JSON.stringify(dadosAtualizacao)
      // });
      
      alert(`Nota ${idNotaFiscal} atualizada com sucesso!`);
      
      // Atualizar dados
      await buscarNotasFiscais();
    } catch (error) {
      console.error('Erro ao atualizar nota:', error);
      alert('Erro ao atualizar nota fiscal');
    } finally {
      setProcessandoApi(false);
    }
  };

  const criarNotaFiscal = async (dadosNota: any) => {
    setProcessandoApi(true);
    try {
      console.log('Criando nova nota fiscal...', dadosNota);
      
      // Aqui você faria a chamada real:
      // const response = await fetch('/api/bling/nfe', {
      //   method: 'POST',
      //   headers: { 
      //     'Content-Type': 'application/json',
      //     'Authorization': 'Bearer TOKEN' 
      //   },
      //   body: JSON.stringify(dadosNota)
      // });
      
      alert('Nova nota fiscal criada com sucesso!');
      
      // Atualizar dados
      await buscarNotasFiscais();
    } catch (error) {
      console.error('Erro ao criar nota:', error);
      alert('Erro ao criar nota fiscal');
    } finally {
      setProcessandoApi(false);
    }
  };

  const processarNotasSelecionadas = async (acao: 'enviar' | 'atualizar') => {
    if (notasSelecionadas.size === 0) {
      alert('Selecione pelo menos uma nota fiscal');
      return;
    }

    const notasParaProcessar = notasFiltradas.filter(nota => 
      notasSelecionadas.has(nota.id_key)
    );

    setProcessandoApi(true);
    try {
      for (const nota of notasParaProcessar) {
        if (acao === 'enviar') {
          await enviarNotaParaSefaz(nota.id_nf);
        } else if (acao === 'atualizar') {
          // Aqui você definiria os dados de atualização
          await atualizarNotaFiscal(nota.id_nf, {});
        }
      }
      
      setNotasSelecionadas(new Set());
      alert(`${notasParaProcessar.length} notas processadas com sucesso!`);
    } catch (error) {
      console.error('Erro no processamento em lote:', error);
      alert('Erro ao processar notas selecionadas');
    } finally {
      setProcessandoApi(false);
    }
  };

  const getSituacaoNotaFiscalText = (situacao: number): string => {
    const situacoes: { [key: number]: string } = {
      1: 'Pendente',
      2: 'Cancelada',
      3: 'Aguardando recibo',
      4: 'Rejeitada',
      5: 'Autorizada',
      6: 'Emitida DANFE',
      7: 'Registrada',
      8: 'Aguardando protocolo',
      9: 'Denegada',
      10: 'Consulta situação',
      11: 'Bloqueada'
    };
    return situacoes[situacao] || `Situação ${situacao}`;
  };

  const getSituacaoNotaFiscalColor = (situacao: number): string => {
    switch (situacao) {
      case 1: case 3: case 8: case 10: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 2: case 4: case 9: case 11: return 'bg-red-100 text-red-800 border-red-200';
      case 5: case 6: case 7: return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const parseEnderecoJson = (jsonString: string) => {
    try {
      return JSON.parse(jsonString) || {};
    } catch {
      return {};
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notas Fiscais</h1>
            <p className="text-gray-600">Gestão e emissão de notas fiscais por loja</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <FileText className="h-4 w-4" />
              <span>{notasFiltradas.length} notas encontradas</span>
            </div>
            <button
              onClick={() => criarNotaFiscal({})}
              disabled={processandoApi}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>Nova NF</span>
            </button>
            <button
              onClick={buscarNotasFiscais}
              disabled={processandoApi}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${processandoApi ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="ID NF, Pedido, Cliente, CNPJ..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Início
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Fim
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Situação
            </label>
            <select
              value={filtroSituacao}
              onChange={(e) => setFiltroSituacao(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas as situações</option>
              <option value="1">Pendente</option>
              <option value="2">Cancelada</option>
              <option value="3">Aguardando recibo</option>
              <option value="4">Rejeitada</option>
              <option value="5">Autorizada</option>
              <option value="6">Emitida DANFE</option>
              <option value="7">Registrada</option>
              <option value="8">Aguardando protocolo</option>
              <option value="9">Denegada</option>
              <option value="10">Consulta situação</option>
              <option value="11">Bloqueada</option>
            </select>
          </div>
        </div>

        {/* Abas das Lojas */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {lojas.map((loja) => (
              <button
                key={loja.id}
                onClick={() => setLojaAtiva(loja.id)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  lojaAtiva === loja.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {loja.nome}
                <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100 text-gray-600">
                  {loja.count}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Ações em Lote */}
      {notasSelecionadas.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-900">
                {notasSelecionadas.size} nota(s) selecionada(s)
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => processarNotasSelecionadas('enviar')}
                disabled={processandoApi}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span>Enviar para Sefaz</span>
              </button>
              <button
                onClick={() => processarNotasSelecionadas('atualizar')}
                disabled={processandoApi}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                <Edit className="h-4 w-4" />
                <span>Atualizar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Notas Fiscais */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={selecionarTodas}
                    className="flex items-center space-x-2 text-gray-500 hover:text-gray-700"
                  >
                    {notasSelecionadas.size === notasFiltradas.length && notasFiltradas.length > 0 ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    <span>Selecionar</span>
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nota Fiscal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Emissão
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Situação
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {notasFiltradas.map((nota) => {
                const endereco = parseEnderecoJson(nota.endereco_json);
                const isSelected = notasSelecionadas.has(nota.id_key);
                
                return (
                  <tr key={nota.id_key} className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleSelecionarNota(nota.id_key)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          NF-e {nota.id_nf}
                        </div>
                        <div className="text-sm text-gray-500">
                          Série: {nota.serie} | Pedido: {nota.numero_pedido_loja}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {nota.contato_nome}
                        </div>
                        <div className="text-sm text-gray-500">
                          {nota.contato_documento}
                        </div>
                        {endereco.municipio && (
                          <div className="text-xs text-gray-400">
                            {endereco.municipio}/{endereco.uf}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        R$ {nota.valor_nota.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(nota.data_emissao).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(nota.data_emissao).toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getSituacaoNotaFiscalColor(nota.situacao)}`}>
                        {getSituacaoNotaFiscalText(nota.situacao)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => enviarNotaParaSefaz(nota.id_nf)}
                          disabled={processandoApi}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                          title="Enviar para Sefaz"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => atualizarNotaFiscal(nota.id_nf, {})}
                          disabled={processandoApi}
                          className="text-orange-600 hover:text-orange-900 disabled:opacity-50"
                          title="Atualizar Nota"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => window.open(nota.link_danfe, '_blank')}
                          className="text-green-600 hover:text-green-900"
                          title="Ver DANFE"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => window.open(nota.xml_url, '_blank')}
                          className="text-purple-600 hover:text-purple-900"
                          title="Download XML"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => window.open(nota.link_pdf, '_blank')}
                          className="text-red-600 hover:text-red-900"
                          title="Download PDF"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {notasFiltradas.length === 0 && !loading && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma nota fiscal encontrada
            </h3>
            <p className="text-gray-500">
              {lojaAtiva ? `Nenhuma nota encontrada para ${obterNomeLoja(lojaAtiva)}` : 'Selecione uma loja para visualizar as notas'}
            </p>
          </div>
        )}
      </div>

      {/* Resumo */}
      {notasFiltradas.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Resumo - {obterNomeLoja(lojaAtiva)}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {notasFiltradas.length}
              </div>
              <div className="text-sm text-gray-500">Total de Notas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                R$ {notasFiltradas.reduce((acc, nota) => acc + nota.valor_nota, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-gray-500">Valor Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {notasFiltradas.filter(nota => [5, 6, 7].includes(nota.situacao)).length}
              </div>
              <div className="text-sm text-gray-500">Autorizadas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {notasFiltradas.filter(nota => [1, 3, 8, 10].includes(nota.situacao)).length}
              </div>
              <div className="text-sm text-gray-500">Pendentes</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketplaceNotaFiscal;
