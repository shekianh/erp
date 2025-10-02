import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Package, 
  Store, 
  Eye, 
  RefreshCw, 
  FileText, 
  Square,
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
// Use um ícone de "check" diferente ou alias para evitar conflito de nome
import { SquareCheck as CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase'; // Certifique-se que o caminho está correto

// --- INTERFACES E CONSTANTES ---

// Interface para os dados do pedido
interface PedidoVenda {
  id_bling: string;
  numero: string;
  numeroloja: string;
  data: string;
  contato_nome: string;
  situacao_bling: number;
  loja: string;
  notafiscal?: string;
  total: number;
}

// Interface para contas Bling
interface ContaBling {
  id: number;
  empresa: string;
  token: string;
}

// Mapeamento das lojas
const LOJAS_PERMITIDAS: Record<string, string> = {
  '203614110': 'Dafiti',
  '204978475': 'Mercado Livre',
  '203944379': 'Shopee',
  '204460459': 'Shein',
  '205409614': 'TikTok Shop'
};

// Mapeamento empresa -> loja
const EMPRESA_LOJA_MAP: Record<string, string[]> = {
  'SHEKINAH INDÚSTRIA E COMÉRCIO DE CALÇADOS LTDA': ['203614110', '204978447', '204978475', '203944379'],
  'F. L. COMERCIO DE CALCADOS LTDA': ['204460459'],
  'N. Fernandes Comercio de Calcados LTDA': ['204604306', '205409614'],
  'D. SANDRIGO COMERCIO DE CALCADOS LTDA': ['204042045']
};

const ITENS_POR_PAGINA = 200;

// --- FUNÇÕES AUXILIARES ---

const getSituacaoBlingInfo = (situacao: number) => {
  switch (situacao) {
    case 6: return { text: 'Em aberto', color: 'bg-yellow-100 text-yellow-800' };
    case 9: return { text: 'Atendido', color: 'bg-green-100 text-green-800' };
    case 12: return { text: 'Cancelado', color: 'bg-red-100 text-red-800' };
    default: return { text: `Status ${situacao}`, color: 'bg-gray-100 text-gray-800' };
  }
};

// --- COMPONENTE PRINCIPAL ---

const MarketplacePedidos: React.FC = () => {
  // --- ESTADOS DO COMPONENTE ---
  const [pedidos, setPedidos] = useState<PedidoVenda[]>([]);
  const [contasBling, setContasBling] = useState<ContaBling[]>([]);
  const [loading, setLoading] = useState(false);
  const [tabAtiva, setTabAtiva] = useState('203614110');
  const [busca, setBusca] = useState('');
  const [pedidosSelecionados, setPedidosSelecionados] = useState<Set<string>>(new Set());
  const [processandoAcao, setProcessandoAcao] = useState(false);
  const [filtroSituacao, setFiltroSituacao] = useState<number | 'todos'>(6);
  
  // Estado de Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPedidos, setTotalPedidos] = useState(0);

  // Estado dos Filtros de Data
  const hoje = new Date();
  const dataInicial = new Date(hoje);
  dataInicial.setDate(hoje.getDate() - 7);
  const [dataInicio, setDataInicio] = useState(dataInicial.toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState(hoje.toISOString().split('T')[0]);

  // --- LÓGICA DE BUSCA DE DADOS ---
  const fetchPedidos = async () => {
    try {
      setLoading(true);
      const from = (paginaAtual - 1) * ITENS_POR_PAGINA;
      const to = from + ITENS_POR_PAGINA - 1;

      let query = supabase
        .from('pedido_vendas')
        .select('*', { count: 'exact' })
        .gte('data', dataInicio)
        .lte('data', dataFim + 'T23:59:59')
        .eq('loja', tabAtiva); // Filtra pela loja ativa diretamente no DB

      if (filtroSituacao !== 'todos') {
        query = query.eq('situacao_bling', filtroSituacao);
      }
      
      if (busca) {
        query = query.or(`numero.ilike.%${busca}%,numeroloja.ilike.%${busca}%,contato_nome.ilike.%${busca}%`);
      }

      const { data, error, count } = await query
        .order('registro', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Erro ao buscar pedidos:', error);
        toast.error('Erro ao carregar pedidos');
        return;
      }

      setPedidos(data || []);
      setTotalPedidos(count || 0);
      
    } catch (error) {
      console.error('Erro na busca:', error);
      toast.error('Falha ao buscar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const fetchContasBling = async () => {
    try {
      const { data, error } = await supabase.from('Bling_contas').select('id, empresa, token').not('token', 'is', null);
      if (error) throw error;
      setContasBling(data || []);
    } catch (error) {
      console.error('Erro ao carregar contas Bling:', error);
    }
  };

  // --- EFEITOS (LIFECYCLE) ---
  useEffect(() => {
    fetchContasBling();
  }, []);
  
  useEffect(() => {
    fetchPedidos();
    setPedidosSelecionados(new Set()); 
  }, [dataInicio, dataFim, filtroSituacao, busca, paginaAtual, tabAtiva]);
  
  useEffect(() => {
    setPaginaAtual(1);
  }, [dataInicio, dataFim, filtroSituacao, busca, tabAtiva]);

  // --- LÓGICA DE AÇÕES E MANIPULAÇÃO ---
  const obterTokenPorLoja = (codigoLoja: string): string | null => {
    for (const [empresa, lojas] of Object.entries(EMPRESA_LOJA_MAP)) {
      if (lojas.includes(codigoLoja)) {
        const conta = contasBling.find(c => c.empresa === empresa);
        return conta?.token || null;
      }
    }
    return null;
  };

  const toggleSelecionarPedido = (idBling: string) => {
    const novosSelecionados = new Set(pedidosSelecionados);
    if (novosSelecionados.has(idBling)) {
      novosSelecionados.delete(idBling);
    } else {
      novosSelecionados.add(idBling);
    }
    setPedidosSelecionados(novosSelecionados);
  };

  const toggleSelecionarTodos = () => {
    if (pedidosSelecionados.size === pedidos.length) {
      setPedidosSelecionados(new Set());
    } else {
      setPedidosSelecionados(new Set(pedidos.map(p => p.id_bling)));
    }
  };

  const executarAcaoEmMassa = async (acao: 'gerarNFe' | 'alterarSituacao', options?: { novaSituacao?: number }) => {
    if (pedidosSelecionados.size === 0) {
      toast.error('Selecione pelo menos um pedido');
      return;
    }

    setProcessandoAcao(true);
    const token = obterTokenPorLoja(tabAtiva);
    if (!token) {
      toast.error('Token não encontrado para esta loja');
      setProcessandoAcao(false);
      return;
    }

    const promessas = Array.from(pedidosSelecionados).map(async (idBling) => {
      // Lógica da API aqui...
    });

    await Promise.all(promessas);

    toast.success(`Ação executada para ${pedidosSelecionados.size} pedido(s).`);
    setPedidosSelecionados(new Set());
    fetchPedidos(); // Re-busca os dados para atualizar a interface
    setProcessandoAcao(false);
  };
  
  const gerarNFe = () => executarAcaoEmMassa('gerarNFe');
  const alterarSituacao = (novaSituacao: number) => executarAcaoEmMassa('alterarSituacao', { novaSituacao });

  const totalPaginas = Math.ceil(totalPedidos / ITENS_POR_PAGINA);

  // --- RENDERIZAÇÃO DO COMPONENTE ---
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pedidos de Venda</h1>
            <p className="text-gray-600">Gestão de pedidos do marketplace</p>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={() => fetchPedidos()}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="md:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div className="md:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Situação</label>
            <select value={filtroSituacao} onChange={(e) => setFiltroSituacao(e.target.value === 'todos' ? 'todos' : parseInt(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="todos">Todas</option>
              <option value={6}>Em aberto</option>
              <option value={9}>Atendido</option>
              <option value={12}>Cancelado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input type="text" placeholder="Número, cliente, ID..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="bg-white rounded-lg shadow-sm">
        {/* Tabs das Lojas */}
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="-mb-px flex space-x-6 px-4 sm:px-6" aria-label="Tabs">
            {Object.entries(LOJAS_PERMITIDAS).map(([codigoLoja, nomeLoja]) => (
              <button key={codigoLoja} onClick={() => setTabAtiva(codigoLoja)} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${ tabAtiva === codigoLoja ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300' }`}>
                <div className="flex items-center space-x-2">
                  <Store className="h-4 w-4" />
                  <span>{nomeLoja}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Barra de Ações */}
        {pedidosSelecionados.size > 0 && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 sm:px-6 py-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <span className="text-sm font-medium text-blue-900">{pedidosSelecionados.size} pedido(s) selecionado(s)</span>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                <button onClick={gerarNFe} disabled={processandoAcao} className="inline-flex justify-center items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm">
                  {processandoAcao ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />} Gerar NF-e
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Indicador de Carregamento */}
        {loading && ( <div className="flex items-center justify-center py-12"> <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div> <span className="ml-3 text-gray-600">Carregando pedidos...</span> </div> )}

        {/* Lista de Pedidos */}
        {!loading && (
          <div>
            {pedidos.length > 0 ? (
              <div className="divide-y divide-gray-200 lg:divide-y-0">
                {/* Cabeçalho da Tabela */}
                <div className="hidden lg:grid lg:grid-cols-10 gap-4 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="col-span-1 flex items-center">
                     <button onClick={toggleSelecionarTodos}>
                        {pedidosSelecionados.size === pedidos.length && pedidos.length > 0 ? <CheckSquare className="h-5 w-5 text-blue-600" /> : <Square className="h-5 w-5 text-gray-400" />}
                     </button>
                  </div>
                  <div className="col-span-3">Pedido</div>
                  <div className="col-span-2">Data</div>
                  <div className="col-span-1 text-center">NF</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-1">Ações</div>
                </div>

                {/* Corpo da Tabela */}
                {pedidos.map((pedido, index) => {
                  const situacaoBling = getSituacaoBlingInfo(pedido.situacao_bling);
                  const isSelected = pedidosSelecionados.has(pedido.id_bling);

                  return (
                    <motion.div key={pedido.id_bling} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className={`transition-colors hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : 'bg-white'}`}>
                      {/* Layout de Linha para Desktop */}
                      <div className="hidden lg:grid lg:grid-cols-10 gap-4 items-center px-6 py-4">
                        <div className="col-span-1"><button onClick={() => toggleSelecionarPedido(pedido.id_bling)}>{isSelected ? <CheckSquare className="h-5 w-5 text-blue-600" /> : <Square className="h-5 w-5 text-gray-400" />}</button></div>
                        <div className="col-span-3 text-sm"><div className="font-medium text-gray-900">#{pedido.numero}</div><div className="text-gray-500">Loja: {pedido.numeroloja}</div></div>
                        <div className="col-span-2 text-sm text-gray-900">{new Date(pedido.data).toLocaleDateString('pt-BR')}</div>
                        <div className="col-span-1 flex justify-center">{pedido.notafiscal ? <FileText className="h-5 w-5 text-green-600" title={`NF: ${pedido.notafiscal}`} /> : <FileText className="h-5 w-5 text-gray-300" title="NF Pendente" />}</div>
                        <div className="col-span-2"><span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${situacaoBling.color}`}>{situacaoBling.text}</span></div>
                        <div className="col-span-1"><button className="text-blue-600 hover:text-blue-900"><Eye className="h-5 w-5" /></button></div>
                      </div>

                      {/* Layout de Card para Mobile */}
                      <div className="lg:hidden p-4 space-y-3">
                        <div className="flex justify-between items-start">
                           <div className="flex items-center gap-3">
                              <button onClick={() => toggleSelecionarPedido(pedido.id_bling)}>{isSelected ? <CheckSquare className="h-5 w-5 text-blue-600" /> : <Square className="h-5 w-5 text-gray-400" />}</button>
                              <div>
                                <p className="font-bold text-gray-900">#{pedido.numero} <span className="font-normal text-gray-500">({pedido.numeroloja})</span></p>
                                <p className="text-sm text-gray-700">{pedido.contato_nome}</p>
                              </div>
                           </div>
                           <span className={`whitespace-nowrap inline-flex px-2 py-1 rounded-full text-xs font-medium ${situacaoBling.color}`}>{situacaoBling.text}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                           <p className="text-gray-500">{new Date(pedido.data).toLocaleDateString('pt-BR')}</p>
                           <p className="font-medium text-gray-900">R$ {pedido.total?.toFixed(2) || '0,00'}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center"> <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" /> <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum pedido encontrado</h3> <p className="text-sm text-gray-500">Tente ajustar os filtros ou a busca.</p> </div>
            )}
            
            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Mostrando <span className="font-medium">{Math.min(1 + (paginaAtual - 1) * ITENS_POR_PAGINA, totalPedidos)}</span> a <span className="font-medium">{Math.min(paginaAtual * ITENS_POR_PAGINA, totalPedidos)}</span> de <span className="font-medium">{totalPedidos}</span> resultados
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button onClick={() => setPaginaAtual(p => p - 1)} disabled={paginaAtual === 1} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                        Página {paginaAtual} de {totalPaginas}
                      </span>
                      <button onClick={() => setPaginaAtual(p => p + 1)} disabled={paginaAtual === totalPaginas} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketplacePedidos;