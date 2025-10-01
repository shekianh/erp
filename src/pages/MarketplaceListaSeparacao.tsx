import React, { useState, useEffect } from 'react';
import { Package, FileText, Download, Calendar, Filter, RefreshCw, Printer, CheckCircle, ListFilter } from 'lucide-react';
import { supabase, LOJA_MAPEAMENTO, obterNomeLoja } from '../lib/supabase';

// --- Interfaces (sem alterações) ---
interface ItemPedido {
  item_id: string;
  id_bling: string;
  numero_loja: string;
  numero: string;
  loja: string;
  data: string;
  situacao_bling: string;
  item_codigo: string;
  item_descricao: string;
  item_quantidade: number;
  item_valor: number;
}

interface NotaFiscal {
  id_key: number;
  id_nf: string;
  numero_nf: string; // Adicionado para garantir que o número da NF está disponível
  numeroloja: string;
  numero_loja: string;
  numero_pedido_loja: string;
  serie: number;
  situacao: number;
  valor_nota: number;
  data_emissao: string;
  contato_nome: string;
  loja_id: string;
}

interface ItemAgrupado {
  codigo: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  valor_total: number;
  pedidos: string[];
  numeroloja_list: string[];
  numero_nf_list: string[]; // Usado para a coluna "Número Loja NF"
}

interface LojaInfo {
  id: string;
  nome: string;
  count: number;
  valorTotal: number;
}

// Mapeamento de Situações para o filtro
const SITUACOES_NF = {
  '5': 'Autorizada',
  '6': 'Emitida DANFE',
  '7': 'Registrada',
};

const MarketplaceListaSeparacao: React.FC = () => {
  const [todosItens, setTodosItens] = useState<ItemPedido[]>([]);
  const [todasNotas, setTodasNotas] = useState<NotaFiscal[]>([]);
  const [lojas, setLojas] = useState<LojaInfo[]>([]);
  const [lojaAtiva, setLojaAtiva] = useState<string>('');
  const [itensAgrupados, setItensAgrupados] = useState<ItemAgrupado[]>([]);
  
  // --- Estados dos Filtros ---
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [situacaoFiltro, setSituacaoFiltro] = useState<string>('6'); // Padrão é '6' (Emitida DANFE)
  
  const [loading, setLoading] = useState(true);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  // Configurar datas padrão (últimos 7 dias)
  useEffect(() => {
    const hoje = new Date();
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(hoje.getDate() - 7);
    
    setDataFim(hoje.toISOString().split('T')[0]);
    setDataInicio(seteDiasAtras.toISOString().split('T')[0]);
  }, []);

  // Buscar itens de pedidos e notas fiscais
  const buscarDados = async () => {
    if (!dataInicio || !dataFim || !situacaoFiltro) return;
    
    setLoading(true);
    try {
      // 1. Buscar notas fiscais com base no filtro de data e situação
      const { data: notas, error: erroNotas } = await supabase
        .from('nota_fiscal')
        .select('*')
        .gte('data_emissao', dataInicio + 'T00:00:00')
        .lte('data_emissao', dataFim + 'T23:59:59')
        .in('situacao', [parseInt(situacaoFiltro, 10)])
        .order('data_emissao', { ascending: false });

      if (erroNotas) {
        console.error('Erro ao buscar notas fiscais:', erroNotas);
        return;
      }

      const notasData = notas || [];
      setTodasNotas(notasData);

      // Criar set com números de pedidos das notas filtradas
      const numerosPedidosComNota = new Set<string>();
      notasData.forEach(nota => {
        if (nota.numero_pedido_loja) {
          numerosPedidosComNota.add(nota.numero_pedido_loja);
        }
      });

      // 2. Buscar itens de pedidos
      const { data: itens, error: erroItens } = await supabase
        .from('item_pedido_vendas')
        .select('*')
        .gte('data', dataInicio + 'T00:00:00')
        .lte('data', dataFim + 'T23:59:59')
        .order('data', { ascending: false });

      if (erroItens) {
        console.error('Erro ao buscar itens de pedidos:', erroItens);
        return;
      }
      
      // 3. Filtrar itens que possuem uma nota fiscal correspondente no período e situação
      const itensFiltrados = (itens || []).filter(item => 
        numerosPedidosComNota.has(item.numero_loja)
      );

      setTodosItens(itensFiltrados);

      // 4. Agrupar por loja para as abas
      const lojasMap = new Map<string, { count: number; valorTotal: number }>();
      itensFiltrados.forEach(item => {
        const existing = lojasMap.get(item.loja) || { count: 0, valorTotal: 0 };
        lojasMap.set(item.loja, {
          count: existing.count + 1,
          valorTotal: existing.valorTotal + (item.item_valor * item.item_quantidade)
        });
      });

      const lojasInfo: LojaInfo[] = Array.from(lojasMap.entries()).map(([id, stats]) => ({
        id,
        nome: obterNomeLoja(id),
        count: stats.count,
        valorTotal: stats.valorTotal
      })).sort((a, b) => a.nome.localeCompare(b.nome));

      setLojas(lojasInfo);
      
      if (!lojaAtiva && lojasInfo.length > 0) {
        setLojaAtiva(lojasInfo[0].id);
      } else if (lojasInfo.length === 0) {
        setLojaAtiva('');
      }

    } catch (error) {
      console.error('Erro na consulta:', error);
    } finally {
      setLoading(false);
    }
  };

  // Executar busca quando os filtros mudarem
  useEffect(() => {
    buscarDados();
  }, [dataInicio, dataFim, situacaoFiltro]);

  // Agrupar itens por loja ativa
  useEffect(() => {
    if (!lojaAtiva) {
      setItensAgrupados([]);
      return;
    }

    const itensLoja = todosItens.filter(item => item.loja === lojaAtiva);
    const itensMap = new Map<string, ItemAgrupado>();

    itensLoja.forEach(item => {
      const codigo = item.item_codigo || '';
      const descricao = item.item_descricao || '';
      const quantidade = Number(item.item_quantidade || 0);
      const valor = Number(item.item_valor || 0);

      // Buscar nota fiscal correspondente para obter numero_nf
      const notaCorrespondente = todasNotas.find(nota => 
        nota.numero_pedido_loja === item.numero_loja
      );

      if (codigo) {
        const chave = `${codigo}_${descricao}`;
        const existing = itensMap.get(chave);

        if (existing) {
          existing.quantidade += quantidade;
          existing.pedidos.push(item.numero);
          // Adiciona o numero_nf à lista, se existir e for único
          if (notaCorrespondente?.numero_nf && !existing.numero_nf_list.includes(notaCorrespondente.numero_nf)) {
            existing.numero_nf_list.push(notaCorrespondente.numero_nf);
          }
        } else {
          itensMap.set(chave, {
            codigo,
            descricao,
            quantidade,
            unidade: 'UN',
            valor_unitario: valor,
            valor_total: valor * quantidade,
            pedidos: [item.numero],
            numeroloja_list: [], // Mantido caso necessário no futuro
            numero_nf_list: notaCorrespondente?.numero_nf ? [notaCorrespondente.numero_nf] : []
          });
        }
      }
    });

    const itensArray = Array.from(itensMap.values())
      .sort((a, b) => a.codigo.localeCompare(b.codigo));

    setItensAgrupados(itensArray);
  }, [todosItens, todasNotas, lojaAtiva]);
  
    // Função para atualizar situacao_erp na tabela pedido_vendas
  const atualizarStatusPedidos = async () => {
    if (!lojaAtiva) return;

    // 1. Obter todos os itens da loja ativa que foram filtrados
    const itensDaLojaParaAtualizar = todosItens.filter(item => item.loja === lojaAtiva);
    
    // 2. Extrair os IDs do Bling, garantindo que sejam únicos e não nulos
    const idsBlingParaAtualizar = [
      ...new Set(itensDaLojaParaAtualizar.map(item => item.id_bling).filter(id => id))
    ];

    if (idsBlingParaAtualizar.length === 0) {
      console.log('Nenhum ID do Bling para atualizar.');
      return;
    }

    // 3. Definir a nova mensagem de status com data e hora
    const dataHora = new Date().toLocaleString('pt-BR');
    const novoStatus = `lista gerada: ${dataHora}`;
    
    console.log(`Atualizando ${idsBlingParaAtualizar.length} pedidos para o status: "${novoStatus}"`);

    // 4. Executar a atualização no Supabase
    const { error: updateError } = await supabase
      .from('pedido_vendas')
      .update({ situacao_erp: novoStatus })
      .in('id_bling', idsBlingParaAtualizar);

    if (updateError) {
      console.error('Erro ao atualizar status dos pedidos:', updateError);
      alert('A lista foi gerada, mas houve um erro ao atualizar o status dos pedidos no sistema.');
    } else {
      console.log('Status dos pedidos atualizado com sucesso!');
    }
  };

  // Gerar PDF e atualizar status
  const gerarPdfSeparacao = async () => {
    if (!lojaAtiva || itensAgrupados.length === 0) {
      alert('Selecione uma loja com itens para gerar o PDF');
      return;
    }

    setGerandoPdf(true);
    try {
      // 1. Atualizar o status dos pedidos no ERP
      await atualizarStatusPedidos();

      // 2. Criar conteúdo HTML para o PDF
      const agora = new Date();
      const dataHora = agora.toLocaleString('pt-BR');
      const nomeLoja = obterNomeLoja(lojaAtiva);
      const situacaoNome = SITUACOES_NF[situacaoFiltro as keyof typeof SITUACOES_NF] || 'Desconhecida';
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Lista de Separação - ${nomeLoja}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .info { margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .quantidade { font-weight: bold; text-align: center; }
              .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
              .filtro-info { background-color: #e0f2fe; border: 1px solid #0284c7; padding: 10px; margin-bottom: 20px; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="header"><h1>LISTA DE SEPARAÇÃO</h1><h2>${nomeLoja}</h2></div>
            <div class="filtro-info"><strong>FILTRO APLICADO:</strong> Situação da NF: ${situacaoFiltro} - ${situacaoNome}</div>
            <div class="info">
              <p><strong>Data de Geração:</strong> ${dataHora}</p>
              <p><strong>Período:</strong> ${new Date(dataInicio).toLocaleDateString('pt-BR')} a ${new Date(dataFim).toLocaleDateString('pt-BR')}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th width="35%">Descrição</th>
                  <th width="10%">Quantidade</th>
                  <th>Número Loja NF</th>
                  <th>Pedidos</th>
                </tr>
              </thead>
              <tbody>
                ${itensAgrupados.map(item => `
                  <tr>
                    <td><strong>${item.codigo}</strong></td>
                    <td>${item.descricao}</td>
                    <td class="quantidade">${item.quantidade}</td>
                    <td>${item.numero_nf_list.join(', ')}</td>
                    <td>${item.pedidos.join(', ')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="footer"><p>Lista gerada automaticamente pelo Sistema ERP</p></div>
          </body>
        </html>
      `;

      // 3. Criar e baixar o arquivo HTML (que pode ser impresso para PDF)
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => printWindow.print(), 500);
        };
      }
      
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF da lista de separação');
    } finally {
      setGerandoPdf(false);
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
      {/* Header Fixo */}
      <div className="sticky top-0 z-10 bg-white shadow-sm rounded-b-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lista de Separação</h1>
            <p className="text-gray-600">Produtos agrupados por loja com base na situação da NF</p>
          </div>
          <div className="flex items-center space-x-4">
             <button
              onClick={gerarPdfSeparacao}
              disabled={gerandoPdf || !lojaAtiva || itensAgrupados.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Printer className={`h-4 w-4 ${gerandoPdf ? 'animate-pulse' : ''}`} />
              <span>{gerandoPdf ? 'Gerando...' : 'Gerar e Atualizar Status'}</span>
            </button>
            <button
              onClick={buscarDados}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Situação da NF</label>
             <select
                value={situacaoFiltro}
                onChange={(e) => setSituacaoFiltro(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
             >
                {Object.entries(SITUACOES_NF).map(([codigo, nome]) => (
                    <option key={codigo} value={codigo}>
                        {codigo} - {nome}
                    </option>
                ))}
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
                <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-blue-100 text-blue-600">
                  {loja.count} itens
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Lista de Itens Agrupados */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {lojaAtiva ? `Produtos - ${obterNomeLoja(lojaAtiva)}` : 'Selecione uma loja'}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantidade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número Loja NF</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pedidos</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {itensAgrupados.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{item.codigo}</div>
                    <div className="text-xs text-gray-500">{item.descricao}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-blue-600">{item.quantidade}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-purple-600 font-medium">{item.numero_nf_list.join(', ') || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-gray-500">{item.pedidos.join(', ')}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {itensAgrupados.length === 0 && !loading && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum produto encontrado</h3>
            <p className="text-gray-500">
              Ajuste os filtros ou selecione outra loja.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketplaceListaSeparacao;