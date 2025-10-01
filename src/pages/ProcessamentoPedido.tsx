import React, { useState, useEffect, useCallback } from 'react'
import { Printer, SquareCheck as CheckSquare, Square, Download, Filter, RefreshCw, CheckCircle2, Eye, ArrowUpDown, Info, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { supabase, obterNomeLoja } from '../lib/supabase'
import OrderItemsModal from '../components/OrderItemsModal'
import toast from 'react-hot-toast'

// --- INTERFACES E CONSTANTES ---

interface ProcessamentoPedidoData {
  id_key: number,
  numero_nf: string,
  numero_pedido_loja: string,
  data_emissao: string,
  situacao: number,
  valor_nota: number,
  contato_nome: string,
  chave_acesso: string,
  loja_id: string,
  baixados: number,
  situacao_impressa: 'Impresso' | 'Reimpresso' | null,
  situacao_bling: number | null
}

const LOJAS_PERMITIDAS: Record<string, string> = {
  '203614110': 'Dafiti', '204978475': 'Mercado Livre Oficial', '203944379': 'Shopee',
  '204460459': 'Shein', '205409614': 'Tik Tok Shop'
}

const SHOPEE_ID = '203944379';
const TAMANHO_PAGINA = 300;

// --- FUNÇÃO AUXILIAR PARA BAIXAR ZPL ---

const baixarZPLDaPasta = async (lojaId: string, numeroPedidoLoja: string) => {
  try {
    // ROTA CHAMADA: GET /api/zpl/:lojaId/:numeroPedidoLoja
    const response = await fetch(`http://localhost:3001/api/zpl/${lojaId}/${numeroPedidoLoja}`);
    if (!response.ok) throw new Error(`Arquivo ZPL não encontrado (Pedido: ${numeroPedidoLoja})`);
    const zplContent = await response.text();
    const blob = new Blob([zplContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${numeroPedidoLoja}.zpl`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Arquivo ${numeroPedidoLoja}.zpl baixado!`);
    return true;
  } catch (error) {
    console.error('Erro ao baixar ZPL:', error);
    toast.error(`Erro: ${error instanceof Error ? error.message : 'Ocorreu um erro desconhecido'}`);
    return false;
  }
};


// --- COMPONENTE PRINCIPAL ---

const ProcessamentoPedido: React.FC = () => {
  // --- ESTADOS DO COMPONENTE ---
  const [dados, setDados] = useState<ProcessamentoPedidoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<string>('');
  const [selectAllAcrossPages, setSelectAllAcrossPages] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(0);
  const [totalPedidos, setTotalPedidos] = useState(0);
  
  const [filtros, setFiltros] = useState({
    dataInicio: '', dataFim: '', situacao: '', 
    numeroPedido: '', statusImpressao: 'pendente'
  });
  
  const [appliedFilters, setAppliedFilters] = useState(filtros);

  const [ordenacao, setOrdenacao] = useState<{
    campo: 'data_emissao' | 'numero_nf' | 'valor_nota' | 'contato_nome' | 'baixados',
    direcao: 'asc' | 'desc'
  }>({ campo: 'data_emissao', direcao: 'desc' });
  
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [selectedPedidoLoja, setSelectedPedidoLoja] = useState<string | null>(null);

  const lojas = Object.entries(LOJAS_PERMITIDAS).map(([id, nome]) => ({ id, nome }));
  const totalPaginas = Math.ceil(totalPedidos / TAMANHO_PAGINA);
  const selectionCount = selectAllAcrossPages ? totalPedidos : selectedItems.size;

  // --- FUNÇÕES AUXILIARES ---

  const getInitialDate = (offsetDays = 0) => {
    const date = new Date(); date.setDate(date.getDate() - offsetDays);
    return date.toISOString().split('T')[0];
  };

  const getSituacaoNotaInfo = (situacao: number) => {
    const situacoes: Record<number, { label: string; color: string; textColor: string }> = {
      1: { label: 'Pendente', color: 'bg-yellow-100', textColor: 'text-yellow-800' },
      2: { label: 'Cancelada', color: 'bg-red-100', textColor: 'text-red-800' },
      5: { label: 'Autorizada', color: 'bg-green-100', textColor: 'text-green-800' },
      6: { label: 'Emitida DANFE', color: 'bg-blue-100', textColor: 'text-blue-800' },
    };
    return situacoes[situacao] || { label: `Sit. ${situacao}`, color: 'bg-gray-100', textColor: 'text-gray-800' };
  };

  const getSituacaoPedidoInfo = (situacao: number | null) => {
    const situacoes: Record<number, { label: string; color: string; textColor: string }> = {
        6: { label: 'Aberto', color: 'bg-orange-100', textColor: 'text-orange-800' },
        9: { label: 'Atendido', color: 'bg-green-100', textColor: 'text-green-800' },
        12: { label: 'Cancelado', color: 'bg-red-100', textColor: 'text-red-800' },
    };
    if (situacao === null || !situacoes[situacao]) {
        return { label: 'N/A', color: 'bg-gray-100', textColor: 'text-gray-800' };
    }
    return situacoes[situacao];
  };

  // --- LÓGICA DE BUSCA DE DADOS ---

  const combinarComDadosImpressao = async (notas: Omit<ProcessamentoPedidoData, 'baixados' | 'situacao_impressa' | 'situacao_bling'>[]): Promise<any[]> => {
    if (notas.length === 0) return [];
    const numerosDePedido = notas.map(nf => nf.numero_pedido_loja).filter(Boolean);
    let todosDadosImpressao = [];
    for (let i = 0; i < numerosDePedido.length; i += 500) {
      const lote = numerosDePedido.slice(i, i + 500);
      const { data: dadosLote, error } = await supabase.from('etiquetas_envio_dados').select('numero_pedido_loja, baixados, situacao_impressa').in('numero_pedido_loja', lote);
      if (error) { toast.error(`Erro ao buscar dados de impressão: ${error.message}`); continue; }
      if (dadosLote) todosDadosImpressao.push(...dadosLote);
    }
    const mapaImpressoes = new Map(todosDadosImpressao.map(d => [d.numero_pedido_loja, { count: d.baixados || 0, status: d.situacao_impressa || null }]));
    return notas.map(nf => ({
      ...nf,
      baixados: mapaImpressoes.get(nf.numero_pedido_loja)?.count || 0,
      situacao_impressa: mapaImpressoes.get(nf.numero_pedido_loja)?.status || null
    }));
  };

  const combinarComDadosPedido = async (notas: any[]): Promise<any[]> => {
    if (notas.length === 0) return notas;
    const numerosDePedido = notas.map(nf => nf.numero_pedido_loja).filter(Boolean);
    if (numerosDePedido.length === 0) {
        return notas.map(n => ({ ...n, situacao_bling: null }));
    }
    const { data, error } = await supabase.from('pedido_vendas').select('numero_pedido_loja, situacao_bling').in('numero_pedido_loja', numerosDePedido);
    if (error) {
        toast.error(`Erro ao buscar situação do pedido: ${error.message}`);
        return notas.map(n => ({ ...n, situacao_bling: null }));
    }
    const mapaPedidos = new Map((data || []).map(p => [p.numero_pedido_loja, p.situacao_bling]));
    return notas.map(nf => ({ ...nf, situacao_bling: mapaPedidos.get(nf.numero_pedido_loja) ?? null }));
  };

  const aplicarFiltroDeStatus = (dadosParaFiltrar: ProcessamentoPedidoData[]) => {
    if (!appliedFilters.statusImpressao) return dadosParaFiltrar;
    return dadosParaFiltrar.filter(item => {
        if (appliedFilters.statusImpressao === 'pendente') return !item.situacao_impressa;
        if (appliedFilters.statusImpressao === 'impresso') return item.situacao_impressa === 'Impresso';
        if (appliedFilters.statusImpressao === 'reimpresso') return item.situacao_impressa === 'Reimpresso';
        return true;
    });
  };

  const construirQueryBase = useCallback((paraContagem: boolean = false) => {
    let query;
    if (paraContagem) {
      query = supabase.from('nota_fiscal').select('*', { count: 'exact', head: true });
    } else {
      query = supabase.from('nota_fiscal').select('id_key, numero_nf, numero_pedido_loja, data_emissao, situacao, valor_nota, contato_nome, chave_acesso, loja_id');
    }
    query = query.eq('loja_id', activeTab);
    if (appliedFilters.dataInicio) query = query.gte('data_emissao', appliedFilters.dataInicio);
    if (appliedFilters.dataFim) query = query.lte('data_emissao', appliedFilters.dataFim + 'T23:59:59');
    if (appliedFilters.situacao) query = query.eq('situacao', parseInt(appliedFilters.situacao));
    if (appliedFilters.numeroPedido) query = query.ilike('numero_pedido_loja', `%${appliedFilters.numeroPedido}%`);
    return query;
  }, [activeTab, appliedFilters]);
  
  const carregarDadosDaPagina = useCallback(async (pagina: number) => {
    if (!activeTab) return;
    setLoading(true);
    setDados([]);
    if (!selectAllAcrossPages) setSelectedItems(new Set());
    const from = pagina * TAMANHO_PAGINA;
    const to = from + TAMANHO_PAGINA - 1;
    const query = construirQueryBase(false).order(ordenacao.campo, { ascending: ordenacao.direcao === 'asc' }).range(from, to);
    const { data: notasFiscais, error } = await query;
    if (error) { toast.error("Erro ao carregar dados da página."); setLoading(false); return; }
    let dadosCombinados = await combinarComDadosImpressao(notasFiscais || []);
    dadosCombinados = await combinarComDadosPedido(dadosCombinados);
    const dadosFinais = aplicarFiltroDeStatus(dadosCombinados);
    setDados(dadosFinais);
    setLoading(false);
  }, [construirQueryBase, ordenacao, activeTab, selectAllAcrossPages]);
  
  const executarBusca = useCallback(async () => {
    if (!activeTab) return;
    setLoading(true);
    setSelectAllAcrossPages(false);
    const queryContagem = construirQueryBase(true);
    const { count, error } = await queryContagem;
    if (error) { toast.error("Erro ao contar os pedidos."); setLoading(false); return; }
    setTotalPedidos(count || 0);
    setPaginaAtual(0);
    if (count && count > 0) {
      await carregarDadosDaPagina(0);
    } else {
      setDados([]);
      setLoading(false);
    }
  }, [activeTab, construirQueryBase, carregarDadosDaPagina]);

  const handleAplicarFiltros = () => {
    setAppliedFilters(filtros);
  };
  
  // --- EFEITOS (useEffect) ---

  useEffect(() => {
    if (lojas.length > 0 && !activeTab) setActiveTab(lojas[0].id);
  }, [lojas, activeTab]);

  useEffect(() => {
    if (!activeTab) return;
    const isShopee = activeTab === SHOPEE_ID;
    const initialFilters = { 
      dataInicio: getInitialDate(isShopee ? 2 : 7), dataFim: getInitialDate(0),
      situacao: '', numeroPedido: '', statusImpressao: 'pendente'
    };
    setFiltros(initialFilters);
    setAppliedFilters(initialFilters);
  }, [activeTab]);

  useEffect(() => {
    if (appliedFilters.dataInicio && activeTab) {
      executarBusca();
    }
  }, [appliedFilters, activeTab, ordenacao, executarBusca]);
  
  // --- HANDLERS DE EVENTOS ---

  const handleMudarPagina = (novaPagina: number) => {
    if (novaPagina < 0 || novaPagina >= totalPaginas) return;
    setPaginaAtual(novaPagina);
    carregarDadosDaPagina(novaPagina);
  };

  const handleSelectItem = (id: number, event: React.MouseEvent) => {
    if (selectAllAcrossPages) {
      setSelectAllAcrossPages(false);
      const newSelected = new Set<number>(); newSelected.add(id);
      setSelectedItems(newSelected);
      return;
    }
    const newSelected = new Set(selectedItems);
    if (event.shiftKey && selectedItems.size > 0) {
      const todosIds = dados.map(item => item.id_key);
      const currentIndex = todosIds.indexOf(id);
      const lastSelectedIndex = todosIds.findLastIndex(itemId => selectedItems.has(itemId));
      if (currentIndex !== -1 && lastSelectedIndex !== -1) {
        const start = Math.min(currentIndex, lastSelectedIndex); const end = Math.max(currentIndex, lastSelectedIndex);
        for (let i = start; i <= end; i++) newSelected.add(todosIds[i]);
      } else newSelected.add(id);
    } else {
      if (newSelected.has(id)) newSelected.delete(id); else newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectPage = () => {
    setSelectAllAcrossPages(false);
    if (selectedItems.size === dados.length) setSelectedItems(new Set());
    else setSelectedItems(new Set(dados.map(item => item.id_key)));
  };
  
  const handleSelectAllPages = () => {
    setSelectAllAcrossPages(true);
    setSelectedItems(new Set());
  };

  const handleClearSelection = () => {
    setSelectAllAcrossPages(false);
    setSelectedItems(new Set());
  };

  const handleImprimirItem = async (item: ProcessamentoPedidoData) => {
    toast.loading('Buscando etiqueta ZPL...');
    const sucesso = await baixarZPLDaPasta(item.loja_id, item.numero_pedido_loja);
    toast.dismiss();
    if (sucesso) executarBusca();
  };
  
  const handleImprimirSelecionados = async () => {
    if (selectionCount === 0) return toast.error('Selecione pelo menos um item para imprimir');
    toast.loading('Processando e combinando etiquetas...');
    try {
      let response;
      if (selectAllAcrossPages) {
        // ROTA CHAMADA: POST /api/etiquetas/zpl-lote-por-filtro
        response = await fetch('http://localhost:3001/api/etiquetas/zpl-lote-por-filtro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filtros: { ...appliedFilters, loja_id: activeTab } })
        });
      } else {
        const itensParaProcessar = dados.filter(item => selectedItems.has(item.id_key)).map(item => ({ loja_id: item.loja_id, numero_pedido_loja: item.numero_pedido_loja }));
        // ROTA CHAMADA: POST /api/etiquetas/zpl-lote
        response = await fetch('http://localhost:3001/api/etiquetas/zpl-lote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pedidos: itensParaProcessar })
        });
      }
      if (!response.ok) { 
        const errorData = await response.json(); 
        throw new Error(errorData.message || 'Falha ao gerar o lote de ZPL.'); 
      }
      const zplContentCombinado = await response.text();
      const blob = new Blob([zplContentCombinado], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `lote_etiquetas_${Date.now()}.zpl`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success(`${selectionCount} etiquetas combinadas e baixadas!`);
      handleClearSelection();
      if (selectAllAcrossPages && appliedFilters.statusImpressao) {
        const novosFiltros = { ...appliedFilters, statusImpressao: '' };
        setFiltros(novosFiltros);
        setAppliedFilters(novosFiltros);
      } else {
        executarBusca();
      }
    } catch (error) { 
      toast.dismiss();
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido';
      toast.error(`Erro ao processar lote: ${errorMessage}`);
    }
  };
  
  const handleVisualizarItens = (numeroPedidoLoja: string) => { setSelectedPedidoLoja(numeroPedidoLoja); setShowItemsModal(true); };
  
  const limparFiltros = () => {
    const isShopee = activeTab === SHOPEE_ID;
    const cleanFilters = {
      dataInicio: getInitialDate(isShopee ? 2 : 7), dataFim: getInitialDate(0),
      situacao: '', numeroPedido: '', statusImpressao: 'pendente'
    };
    setFiltros(cleanFilters);
    setAppliedFilters(cleanFilters);
  };

  const handleOrdenacao = (campo: typeof ordenacao.campo) => { 
    setOrdenacao(prev => ({ campo, direcao: prev.campo === campo && prev.direcao === 'asc' ? 'desc' : 'asc' })); 
  };
  
  const getOrdenacaoIcon = (campo: string) => {
    if (ordenacao.campo !== campo) return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    return ordenacao.direcao === 'asc' ? <ArrowUpDown className="h-4 w-4 text-blue-600 rotate-180" /> : <ArrowUpDown className="h-4 w-4 text-blue-600" />;
  };

  // --- RENDERIZAÇÃO DO COMPONENTE (JSX) ---

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Processamento de Pedido</h1>
          <button onClick={executarBusca} disabled={loading} className="flex items-center justify-center sm:justify-start px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 w-full sm:w-auto">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        </div>
        
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {lojas.map((loja) => (
              <button key={loja.id} onClick={() => setActiveTab(loja.id)} className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${ activeTab === loja.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300' }`}>
                {loja.nome} {activeTab === loja.id && totalPedidos > 0 && ( <span className="ml-2 bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">{totalPedidos}</span> )}
              </button>
            ))}
          </nav>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label><input type="date" value={filtros.dataInicio} onChange={(e) => setFiltros({...filtros, dataInicio: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label><input type="date" value={filtros.dataFim} onChange={(e) => setFiltros({...filtros, dataFim: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Situação NF</label><select value={filtros.situacao} onChange={(e) => setFiltros({...filtros, situacao: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">Todas</option><option value="1">Pendente</option><option value="2">Cancelada</option><option value="5">Autorizada</option><option value="6">Emitida DANFE</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Status Impressão</label><select value={filtros.statusImpressao} onChange={(e) => setFiltros({...filtros, statusImpressao: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">Todos</option><option value="pendente">Pendente</option><option value="impresso">Impresso</option><option value="reimpresso">Reimpresso</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nº Pedido Loja</label><input type="text" placeholder="Buscar por número" value={filtros.numeroPedido} onChange={(e) => setFiltros({...filtros, numeroPedido: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <button onClick={handleAplicarFiltros} className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Filter className="h-4 w-4 mr-2" /> Aplicar Filtros</button>
                <button onClick={limparFiltros} className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Limpar</button>
            </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 mb-4 px-1 gap-4">
            <div className="text-sm text-gray-700 text-center sm:text-left">
                {totalPedidos > 0 ? (<span>Mostrando <span className="font-medium">{paginaAtual * TAMANHO_PAGINA + 1}</span> a <span className="font-medium">{Math.min((paginaAtual + 1) * TAMANHO_PAGINA, totalPedidos)}</span> de <span className="font-medium">{totalPedidos}</span> resultados</span>) : (<span>Nenhum resultado</span>)}
            </div>
            <Pagination currentPage={paginaAtual} totalPages={totalPaginas} onPageChange={handleMudarPagina} />
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap">{selectAllAcrossPages ? (<div className="bg-blue-100 text-blue-800 text-sm font-medium px-4 py-2 rounded-lg flex items-center w-full sm:w-auto"><CheckSquare className="h-5 w-5 mr-2" /><span className="flex-grow">Todos os {totalPedidos} pedidos estão selecionados.</span><button onClick={handleClearSelection} className="ml-3 text-blue-800 hover:text-blue-900" title="Limpar seleção"><X className="h-5 w-5" /></button></div>) : (<><div className="flex items-center gap-3"><button onClick={handleSelectPage} className="flex items-center text-sm text-gray-600 hover:text-gray-900">{selectedItems.size === dados.length && dados.length > 0 ? <CheckSquare className="h-4 w-4 mr-1" /> : <Square className="h-4 w-4 mr-1" />}Selecionar página ({dados.length})</button>{totalPedidos > dados.length && (<button onClick={handleSelectAllPages} className="text-sm font-medium text-blue-600 hover:text-blue-800">Selecionar todos ({totalPedidos})</button>)}</div>{selectionCount > 0 && (<span className="text-sm text-gray-700 font-medium">{selectionCount} item(s) selecionado(s)</span>)}</>)}</div>
                <div className="flex flex-col sm:flex-row items-center gap-2"><div className="flex items-center text-xs text-gray-500 bg-gray-100 p-2 rounded-lg w-full sm:w-auto"><Info className="h-4 w-4 mr-2 text-blue-500 flex-shrink-0"/><span>Use Shift+Click para selecionar intervalos</span></div>{selectionCount > 0 && (<button onClick={handleImprimirSelecionados} className="flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"><Download className="h-4 w-4 mr-2" /> Baixar Lote ({selectionCount})</button>)}</div>
            </div>
        </div>

        <div className="overflow-x-auto hidden md:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seleção</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleOrdenacao('numero_nf')}><div className="flex items-center">Número NF {getOrdenacaoIcon('numero_nf')}</div></th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nº Pedido Loja</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleOrdenacao('data_emissao')}><div className="flex items-center">Data Emissão {getOrdenacaoIcon('data_emissao')}</div></th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Situação NF</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Situação Pedido</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleOrdenacao('valor_nota')}><div className="flex items-center">Valor {getOrdenacaoIcon('valor_nota')}</div></th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleOrdenacao('contato_nome')}><div className="flex items-center">Cliente {getOrdenacaoIcon('contato_nome')}</div></th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleOrdenacao('baixados')}><div className="flex items-center">Downloads {getOrdenacaoIcon('baixados')}</div></th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Impressão</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th></tr></thead>
            <tbody className="bg-white divide-y divide-gray-200">{loading ? (<tr><td colSpan={11} className="px-6 py-12 text-center"><div className="flex items-center justify-center"><RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" /><span className="text-gray-500">Carregando...</span></div></td></tr>) : dados.length === 0 ? (<tr><td colSpan={11} className="px-6 py-12 text-center text-gray-500">Nenhum registro encontrado.</td></tr>) : (dados.map((item) => {const situacaoInfo = getSituacaoNotaInfo(item.situacao); const situacaoPedidoInfo = getSituacaoPedidoInfo(item.situacao_bling); const isSelected = selectAllAcrossPages || selectedItems.has(item.id_key); return (<tr key={item.id_key} className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}><td className="px-6 py-4 whitespace-nowrap"><button onClick={(e) => handleSelectItem(item.id_key, e)}>{isSelected ? <CheckSquare className="h-5 w-5 text-blue-600" /> : <Square className="h-5 w-5 text-gray-400" />}</button></td><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.numero_nf}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.numero_pedido_loja}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(item.data_emissao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}</td><td className="px-6 py-4 whitespace-nowrap"><span className={`text-xs font-medium px-2 py-1 rounded-full ${situacaoInfo.color} ${situacaoInfo.textColor}`}>{situacaoInfo.label}</span></td><td className="px-6 py-4 whitespace-nowrap"><span className={`text-xs font-medium px-2 py-1 rounded-full ${situacaoPedidoInfo.color} ${situacaoPedidoInfo.textColor}`}>{situacaoPedidoInfo.label}</span></td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R$ {item.valor_nota.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate">{item.contato_nome}</td><td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center text-gray-600" title={`${item.baixados || 0} downloads`}><Printer className="h-5 w-5 mr-2" /><span className={`font-bold text-sm rounded-full px-2 py-0.5 ${ (item.baixados || 0) > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700' }`}>{item.baixados || 0}</span></div></td><td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{item.situacao_impressa === 'Impresso' ? ( <span className="flex items-center text-green-700"><CheckCircle2 className="h-4 w-4 mr-1.5" />Impresso</span> ) : item.situacao_impressa === 'Reimpresso' ? ( <span className="flex items-center text-blue-700"><RefreshCw className="h-4 w-4 mr-1.5" />Reimpresso</span> ) : ( <span className="text-gray-500">Pendente</span> )}</td><td className="px-6 py-4 whitespace-nowrap text-sm font-medium"><div className="flex space-x-2"><button onClick={() => handleImprimirItem(item)} className="text-blue-600 hover:text-blue-900" title="Baixar ZPL da pasta"><Download className="h-5 w-5" /></button><button onClick={() => handleVisualizarItens(item.numero_pedido_loja)} className="text-green-600 hover:text-green-900" title="Ver itens do pedido"><Eye className="h-5 w-5" /></button></div></td></tr>)}))}</tbody>
          </table>
        </div>

        <div className="block md:hidden space-y-4">
            {loading ? (<div className="px-6 py-12 text-center"><div className="flex items-center justify-center"><RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" /><span className="text-gray-500">Carregando...</span></div></div>) : dados.length === 0 ? (<div className="px-6 py-12 text-center text-gray-500">Nenhum registro encontrado.</div>) : (dados.map(item => {const situacaoInfo = getSituacaoNotaInfo(item.situacao); const situacaoPedidoInfo = getSituacaoPedidoInfo(item.situacao_bling); const isSelected = selectAllAcrossPages || selectedItems.has(item.id_key); return (<div key={item.id_key} className={`p-4 rounded-lg border space-y-3 ${isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'}`}><div className="flex justify-between items-center"><button onClick={(e) => handleSelectItem(item.id_key, e)} className="text-blue-600 hover:text-blue-900 flex items-center gap-2">{isSelected ? <CheckSquare className="h-6 w-6" /> : <Square className="h-6 w-6" />}<span className="font-bold text-gray-800 text-lg">{item.numero_pedido_loja}</span></button><div className="flex space-x-3"><button onClick={() => handleImprimirItem(item)} className="text-blue-600 hover:text-blue-900" title="Baixar ZPL da pasta"><Download className="h-5 w-5" /></button><button onClick={() => handleVisualizarItens(item.numero_pedido_loja)} className="text-green-600 hover:text-green-900" title="Ver itens do pedido"><Eye className="h-5 w-5" /></button></div></div><div className="text-sm text-gray-700 space-y-2"><div className="flex justify-between"><span className="text-gray-500">Cliente:</span> <span className="font-medium text-right truncate">{item.contato_nome}</span></div><div className="flex justify-between"><span className="text-gray-500">Data:</span> <span className="font-medium">{new Date(item.data_emissao).toLocaleDateString('pt-BR')}</span></div><div className="flex justify-between"><span className="text-gray-500">Valor:</span> <span className="font-medium">R$ {item.valor_nota.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div><div className="flex justify-between items-center"><span className="text-gray-500">Situação NF:</span> <span className={`text-xs font-medium px-2 py-1 rounded-full ${situacaoInfo.textColor} ${situacaoInfo.color}`}>{situacaoInfo.label}</span></div><div className="flex justify-between items-center"><span className="text-gray-500">Situação Pedido:</span><span className={`text-xs font-medium px-2 py-1 rounded-full ${situacaoPedidoInfo.color} ${situacaoPedidoInfo.textColor}`}>{situacaoPedidoInfo.label}</span></div><div className="flex justify-between items-center"><span className="text-gray-500">Status:</span><span className="text-sm font-medium">{item.situacao_impressa === 'Impresso' ? <span className="flex items-center text-green-700"><CheckCircle2 className="h-4 w-4 mr-1.5" />Impresso</span>: item.situacao_impressa === 'Reimpresso' ? <span className="flex items-center text-blue-700"><RefreshCw className="h-4 w-4 mr-1.5" />Reimpresso</span>: <span className="text-gray-500">Pendente</span>}</span></div><div className="flex justify-between items-center"><span className="text-gray-500">Downloads:</span><div className="flex items-center text-gray-600" title={`${item.baixados || 0} downloads`}><Printer className="h-5 w-5 mr-2" /><span className={`font-bold text-sm rounded-full px-2 py-0.5 ${ (item.baixados || 0) > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700' }`}>{item.baixados || 0}</span></div></div></div></div>)}))}
        </div>
        
        {totalPedidos > TAMANHO_PAGINA && (
          <div className="flex items-center justify-center sm:justify-end mt-4 px-1">
             <Pagination currentPage={paginaAtual} totalPages={totalPaginas} onPageChange={handleMudarPagina} />
          </div>
        )}
      </div>
      {showItemsModal && <OrderItemsModal isOpen={showItemsModal} onClose={() => setShowItemsModal(false)} numeroPedidoLoja={selectedPedidoLoja} />}
    </div>
  )
}

// --- SUBCOMPONENTE DE PAGINAÇÃO ---
const Pagination: React.FC<{ currentPage: number, totalPages: number, onPageChange: (page: number) => void }> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    return (
        <nav className="flex items-center gap-2"><button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 0} className="flex items-center justify-center px-3 py-1.5 border rounded-md bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeft className="h-4 w-4" /><span className="text-sm ml-1 hidden sm:inline">Anterior</span></button><span className="text-sm text-gray-700">Página <span className="font-bold">{currentPage + 1}</span> de <span className="font-bold">{totalPages}</span></span><button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages - 1} className="flex items-center justify-center px-3 py-1.5 border rounded-md bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"><span className="text-sm mr-1 hidden sm:inline">Próxima</span><ChevronRight className="h-4 w-4" /></button></nav>
    );
}

export default ProcessamentoPedido;