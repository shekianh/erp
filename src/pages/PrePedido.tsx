import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Calculator, ChevronDown, Package, RefreshCw, Save, Search, Key, Trash2, XCircle, FileDown, EarthLock,
  ToggleLeft, ToggleRight
} from 'lucide-react';
import {
  ItemPedidoVendas, obterNomeLoja, buscarItensPedidosPorPeriodo, buscarEstoqueGeral,
  buscarEstoquePronto, buscarFotoProdutoPorSkuPai,
  salvarPrePedidoSupabase, listarPrePedidosSalvosSupabase,
  buscarPrePedidoPorChaveSupabase, excluirPrePedidoSupabase, PrePedidoSalvoBD
} from '../lib/supabase';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// --- Tipagem e Constantes ---
declare module 'jspdf' { interface jsPDF { autoTable: (options: any) => jsPDF; } }
type TipoEstoque = 'geral' | 'pronto';
type PdfOrientation = 'p' | 'l';
interface ProdutoRelatorio {
  codigo: string; linha: string; modelo: string;
  vendas: { [tamanho: string]: number };
  estoque: { [tamanho: string]: number };
  totalVendas: number; totalEstoque: number;
}
type PrePedidoResumido = Pick<PrePedidoSalvoBD, 'chave' | 'nome' | 'fornecedor' | 'data_modificacao'>;
const situacoesBling: { [key: string]: string } = { '6': 'Em aberto', '9': 'Atendido', '12': 'Cancelado', '15': 'Em andamento' };
const tamanhos = ['34', '35', '36', '37', '38', '39', '40'];

// ============================================================================
// Componente Otimizado para o Card do Produto
// ============================================================================
interface ProdutoCardProps {
  produto: ProdutoRelatorio;
  foto: string | undefined;
  producaoValores: { [tamanho: string]: number };
  onProducaoChange: (codigo: string, tamanho: string, valor: number) => void;
  isProjecaoAtiva: boolean;
  percentuaisProjecao: { [tamanho: string]: number };
}

const ProdutoCard = React.memo(({ produto, foto, producaoValores, onProducaoChange, isProjecaoAtiva, percentuaisProjecao }: ProdutoCardProps) => {
  const totalProducao = useMemo(() => Object.values(producaoValores || {}).reduce((a, b) => a + b, 0), [producaoValores]);

  const { vendasOuProjecao, totalVendasOuProjecao } = useMemo(() => {
    if (!isProjecaoAtiva) {
      return { vendasOuProjecao: produto.vendas, totalVendasOuProjecao: produto.totalVendas };
    }
    const projecao: { [tamanho: string]: number } = {};
    let totalProjecao = 0;
    tamanhos.forEach(t => {
      const v = produto.vendas[t] || 0; const p = percentuaisProjecao[t] || 0;
      projecao[t] = Math.ceil(v + (v * p / 100)); totalProjecao += projecao[t];
    });
    return { vendasOuProjecao: projecao, totalVendasOuProjecao: totalProjecao };
  }, [isProjecaoAtiva, produto.vendas, produto.totalVendas, percentuaisProjecao]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col break-inside-avoid">
      <div className="flex items-center mb-4 gap-4">
        <img src={foto ? `data:image/jpeg;base64,${foto}` : 'https://via.placeholder.com/150'} alt={`Foto ${produto.codigo}`} className="w-16 h-16 object-cover rounded-lg bg-gray-200 shadow-md"/>
        <div><h3 className="font-bold text-blue-700">{produto.codigo}</h3><p className="text-xs text-gray-500">Linha: {produto.linha}</p></div>
      </div>
      <div className="space-y-1 text-xs mt-auto">
        <div className="grid grid-cols-10 gap-x-1 font-semibold text-gray-600 text-center"><div className="col-span-2 text-left">Grade</div>{tamanhos.map(t => <div key={t}>{t}</div>)}<div>Total</div></div>
        <div className="grid grid-cols-10 gap-x-1 items-center"><div className={`font-medium col-span-2 text-left ${isProjecaoAtiva ? 'text-purple-700' : ''}`}>{isProjecaoAtiva ? 'Projeção' : 'Venda'}</div>{tamanhos.map(t => <div key={t} className={`text-center rounded py-1 ${isProjecaoAtiva ? 'bg-purple-50' : 'bg-blue-50'}`}>{vendasOuProjecao[t] || 0}</div>)}<div className={`font-bold rounded py-1 ${isProjecaoAtiva ? 'bg-purple-100' : 'bg-blue-100'}`}>{totalVendasOuProjecao}</div></div>
        <div className="grid grid-cols-10 gap-x-1 items-center"><div className="font-medium col-span-2 text-left">Estoque</div>{tamanhos.map(t => <div key={t} className="text-center bg-green-50 rounded py-1">{produto.estoque[t] || 0}</div>)}<div className="font-bold bg-green-100 rounded py-1">{produto.totalEstoque}</div></div>
        <div className="grid grid-cols-10 gap-x-1 items-center"><div className="font-medium col-span-2 text-left">Diferença</div>{tamanhos.map(t => {const d = (produto.estoque[t] || 0) - (vendasOuProjecao[t] || 0); return (<div key={t} className={`text-center font-bold rounded py-1 ${d < 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100'}`}>{d}</div>);})}<div className="font-bold bg-yellow-100 rounded py-1">{produto.totalEstoque - totalVendasOuProjecao}</div></div>
        <div className="grid grid-cols-10 gap-x-1 items-center"><div className="font-medium col-span-2 text-left text-orange-700">Produção</div>{tamanhos.map(t => (<div key={t}><input type="number" min="0" value={producaoValores?.[t] || ''} onChange={(e) => onProducaoChange(produto.codigo, t, parseInt(e.target.value) || 0)} className="w-full text-center bg-orange-50 border border-orange-200 rounded py-1 text-xs"/></div>))}<div className="font-bold bg-orange-100 rounded py-1">{totalProducao}</div></div>
      </div>
    </motion.div>
  );
});

// ============================================================================
// Componente Principal
// ============================================================================
const PrePedido: React.FC = () => {
  const [itensPedidos, setItensPedidos] = useState<ItemPedidoVendas[]>([]);
  const [estoqueGeral, setEstoqueGeral] = useState<any[]>([]);
  const [estoquePronto, setEstoquePronto] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fotosProdutos, setFotosProdutos] = useState<{ [sku: string]: string }>({});
  const [dataInicio, setDataInicio] = useState(() => new Date().toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0]);
  const [filtroIdLoja, setFiltroIdLoja] = useState<string>('');
  const [filtroSituacoes, setFiltroSituacoes] = useState<string[]>(['6', '9']);
  const [tipoEstoque, setTipoEstoque] = useState<TipoEstoque>('geral');
  const [chaveAtual, setChaveAtual] = useState<string>('');
  const [nomePrePedido, setNomePrePedido] = useState<string>('');
  const [fornecedor, setFornecedor] = useState<string>('');
  const [produtosComProducao, setProdutosComProducao] = useState<{ [codigo: string]: { [tamanho: string]: number } }>({});
  const [prePedidosSalvos, setPrePedidosSalvos] = useState<PrePedidoResumido[]>([]);
  const [showGerenciarChaves, setShowGerenciarChaves] = useState(false);
  const [showSalvarComo, setShowSalvarComo] = useState(false);
  const [isSituacaoOpen, setIsSituacaoOpen] = useState(false);
  const [showProjecao, setShowProjecao] = useState(false);
  const [isProjecaoAtiva, setIsProjecaoAtiva] = useState(false);
  const [exportandoPDF, setExportandoPDF] = useState(false);
  const [percentuaisProjecao, setPercentuaisProjecao] = useState<{ [tamanho: string]: number }>({ '34':10, '35':15, '36':20, '37':25, '38':20, '39':15, '40':10 });
  const [colunasPorPagina, setColunasPorPagina] = useState(3);
  const [linhasPorPagina, setLinhasPorPagina] = useState(4);
  const [pdfOrientation, setPdfOrientation] = useState<PdfOrientation>('p');
  const situacaoRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async (inicio: string, fim: string) => {
    try {
      setLoading(true);
      const [itensData, estoqueGeralData, estoqueProntoData] = await Promise.all([
        buscarItensPedidosPorPeriodo(inicio, fim), buscarEstoqueGeral(), buscarEstoquePronto()
      ]);
      setItensPedidos(itensData); setEstoqueGeral(estoqueGeralData); setEstoquePronto(estoqueProntoData);
    } catch (error) { toast.error('Erro ao carregar dados.'); }
    finally { setLoading(false); }
  }, []);

  const carregarChavesSalvas = useCallback(async () => {
    try {
      const chaves = await listarPrePedidosSalvosSupabase();
      setPrePedidosSalvos(chaves as PrePedidoResumido[]);
    } catch (error) { toast.error("Falha ao carregar pré-pedidos salvos."); }
  }, []);

  useEffect(() => { fetchData(dataInicio, dataFim); }, [dataInicio, dataFim, fetchData]);
  useEffect(() => { carregarChavesSalvas(); }, [carregarChavesSalvas]);

  const dadosBaseRelatorio = useMemo<ProdutoRelatorio[]>(() => {
    const produtosMap = new Map<string, Omit<ProdutoRelatorio, 'producao' | 'totalProducao'>>();
    itensPedidos.forEach(item => {
      if (!item || !item.item_codigo) return;
      if (filtroIdLoja && item.loja !== filtroIdLoja) return;
      if (filtroSituacoes.length > 0 && !filtroSituacoes.includes(String(item.situacao_bling))) return;
      const codigoBase = item.item_codigo.substring(0, 11);
      const tamanho = item.item_codigo.split('-')[1] || 'N/A';
      if (!tamanhos.includes(tamanho)) return;
      if (!produtosMap.has(codigoBase)) {
        produtosMap.set(codigoBase, {
          codigo: codigoBase, linha: codigoBase.substring(0, 3), modelo: codigoBase.substring(0, 7),
          vendas: {}, estoque: {}, totalVendas: 0, totalEstoque: 0
        });
      }
      const produtoData = produtosMap.get(codigoBase)!;
      produtoData.vendas[tamanho] = (produtoData.vendas[tamanho] || 0) + item.item_quantidade;
      produtoData.totalVendas += item.item_quantidade;
    });
    const estoqueAtual = tipoEstoque === 'geral' ? estoqueGeral : estoquePronto;
    produtosMap.forEach((produto, codigo) => {
      tamanhos.forEach(tamanho => {
        const itemEstoque = estoqueAtual.find(e => e.sku === `${codigo}-${tamanho}`);
        produto.estoque[tamanho] = itemEstoque?.quantidade || 0;
      });
      produto.totalEstoque = Object.values(produto.estoque).reduce((a, b) => a + b, 0);
    });
    return Array.from(produtosMap.values()).sort((a, b) => b.totalVendas - a.totalVendas);
  }, [itensPedidos, filtroIdLoja, filtroSituacoes, tipoEstoque, estoqueGeral, estoquePronto]);
  
  useEffect(() => {
    const fetchFotos = async () => {
      if (dadosBaseRelatorio.length === 0) return;
      const skusParaBuscar = dadosBaseRelatorio.map(p => p.codigo).filter(sku => !fotosProdutos[sku]);
      if (skusParaBuscar.length > 0) {
        const novasFotosPromises = skusParaBuscar.map(async (sku) => ({ sku, foto: await buscarFotoProdutoPorSkuPai(sku) }));
        const resultados = await Promise.all(novasFotosPromises);
        const novasFotos: { [sku: string]: string } = {};
        resultados.forEach(res => { if (res.foto) novasFotos[res.sku] = res.foto; });
        if (Object.keys(novasFotos).length > 0) setFotosProdutos(prev => ({ ...prev, ...novasFotos }));
      }
    };
    fetchFotos();
  }, [dadosBaseRelatorio, fotosProdutos]);

  const { lojasDisponiveis } = useMemo(() => {
    const lojas = new Set<string>();
    itensPedidos.forEach(item => { if (item?.loja) lojas.add(item.loja); });
    return { lojasDisponiveis: Array.from(lojas).sort() };
  }, [itensPedidos]);

  const totaisRelatorio = useMemo(() => ({
    totalParesVendidos: dadosBaseRelatorio.reduce((acc, p) => acc + p.totalVendas, 0),
    totalProducao: Object.values(produtosComProducao).flatMap(Object.values).reduce((a, b) => a + b, 0)
  }), [dadosBaseRelatorio, produtosComProducao]);

  const salvarPrePedido = async () => {
    if (!nomePrePedido) return toast.error("O nome do pré-pedido é obrigatório.");
    const chaveParaSalvar = chaveAtual || `PP-${Date.now()}`;
    const detalhes_produtos: PrePedidoSalvoBD['detalhes_produtos'] = {};
    dadosBaseRelatorio.forEach(produto => {
        const producaoProduto = produtosComProducao[produto.codigo];
        const totalProducaoProduto = producaoProduto ? Object.values(producaoProduto).reduce((a, b) => a + b, 0) : 0;
        if (totalProducaoProduto > 0) {
            detalhes_produtos[produto.codigo] = {
                linha: produto.linha, modelo: produto.modelo,
                grade: Object.fromEntries(tamanhos.map(tamanho => {
                    const vendas = produto.vendas[tamanho] || 0;
                    const estoque = produto.estoque[tamanho] || 0;
                    return [tamanho, { vendas, estoque, diferenca: estoque - vendas, producao: producaoProduto?.[tamanho] || 0 }];
                }))
            };
        }
    });
    if (Object.keys(detalhes_produtos).length === 0) return toast.error("Nenhum item com produção para salvar.");
    const prePedidoParaSalvar: PrePedidoSalvoBD = {
        chave: chaveParaSalvar, nome: nomePrePedido, fornecedor,
        data_inicio: dataInicio, data_fim: dataFim,
        filtros: { filtroIdLoja, filtroSituacoes, tipoEstoque },
        detalhes_produtos,
    };
    const toastId = toast.loading('Salvando pré-pedido...');
    try {
        await salvarPrePedidoSupabase(prePedidoParaSalvar);
        setChaveAtual(chaveParaSalvar);
        await carregarChavesSalvas();
        toast.success(`Pré-pedido "${nomePrePedido}" salvo!`, { id: toastId });
        setShowSalvarComo(false);
    } catch(error) { toast.error("Falha ao salvar. Verifique o console.", { id: toastId }); }
  };
  
  const carregarPrePedido = async (chave: string) => {
    const toastId = toast.loading(`Carregando "${chave}"...`);
    try {
        const pp = await buscarPrePedidoPorChaveSupabase(chave);
        setChaveAtual(pp.chave);
        setNomePrePedido(pp.nome);
        setFornecedor(pp.fornecedor || '');
        setDataInicio(pp.data_inicio);
        setDataFim(pp.data_fim);
        setFiltroIdLoja(pp.filtros.filtroIdLoja || '');
        setFiltroSituacoes(pp.filtros.filtroSituacoes || []);
        setTipoEstoque(pp.filtros.tipoEstoque || 'geral');
        const producaoCarregada: typeof produtosComProducao = {};
        Object.keys(pp.detalhes_produtos).forEach(codigo => {
            producaoCarregada[codigo] = {};
            Object.keys(pp.detalhes_produtos[codigo].grade).forEach(tamanho => {
                producaoCarregada[codigo][tamanho] = pp.detalhes_produtos[codigo].grade[tamanho].producao;
            });
        });
        setProdutosComProducao(producaoCarregada);
        toast.success(`Pré-pedido "${pp.nome}" carregado.`, { id: toastId });
        setShowGerenciarChaves(false);
    } catch(error) { toast.error("Falha ao carregar o pré-pedido.", { id: toastId }); }
  };

  const excluirPrePedido = async (chave: string) => {
    try {
        await excluirPrePedidoSupabase(chave);
        await carregarChavesSalvas();
        if (chaveAtual === chave) {
          setChaveAtual(''); setNomePrePedido(''); setFornecedor(''); setProdutosComProducao({});
        }
        toast.success('Pré-pedido excluído com sucesso!');
    } catch(error) { toast.error('Falha ao excluir o pré-pedido.'); }
  };
  
  const atualizarProducao = useCallback((codigo: string, tamanho: string, valor: number) => {
    setProdutosComProducao(prev => ({ ...prev, [codigo]: { ...prev[codigo], [tamanho]: Math.max(0, valor) } }));
  }, []);

  const handleSituacaoChange = (situacaoId: string) => setFiltroSituacoes(prev => prev.includes(situacaoId) ? prev.filter(id => id !== situacaoId) : [...prev, situacaoId]);
  const handleAplicarProjecao = () => { setIsProjecaoAtiva(true); setShowProjecao(false); toast.success('Projeção aplicada!'); };
  const handleRemoverProjecao = () => { setIsProjecaoAtiva(false); toast.success('Projeção removida.'); };

  const exportarPDF = async () => {
    setExportandoPDF(true);
    toast.loading('Gerando PDF...', { id: 'pdf-toast' });
    setTimeout(() => {
      const doc = new jsPDF({ orientation: pdfOrientation, unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 10;
      const cardW = (pageW - margin * (colunasPorPagina + 1)) / colunasPorPagina;
      let produtoIndex = 0;
      let pageCount = 1;

      const addHeaderFooter = () => {
        doc.setFontSize(14); doc.text(`Pré-Pedido: ${nomePrePedido || 'Novo'}`, pageW / 2, margin, { align: 'center' });
        doc.setFontSize(8); doc.text(`Página ${pageCount}`, pageW - margin, pageH - 5, { align: 'right' });
      };
      addHeaderFooter();
      
      for (const produto of dadosBaseRelatorio) {
          if(produtoIndex > 0 && (produtoIndex % (colunasPorPagina * linhasPorPagina) === 0)) {
              doc.addPage(); pageCount++; addHeaderFooter();
          }
          const i = produtoIndex % (colunasPorPagina * linhasPorPagina);
          const col = i % colunasPorPagina;
          const row = Math.floor(i / colunasPorPagina);
          const y = margin * 2 + row * ( (pageH - margin * 4) / linhasPorPagina );
          let vendasOuProjecao = produto.vendas, totalVendasOuProjecao = produto.totalVendas;
          if (isProjecaoAtiva) {
              vendasOuProjecao = {}; totalVendasOuProjecao = 0;
              tamanhos.forEach(t => { const v = produto.vendas[t] || 0, p = percentuaisProjecao[t] || 0; vendasOuProjecao[t] = Math.ceil(v + (v * p / 100)); totalVendasOuProjecao += vendasOuProjecao[t]; });
          }
          doc.setFontSize(9); doc.setFont('helvetica', 'bold');
          doc.text(produto.codigo, x + 2, y + 5);
          const producaoValores = produtosComProducao[produto.codigo] || {};
          const totalProducao = Object.values(producaoValores).reduce((a, b) => a + b, 0);
          doc.autoTable({
              startY: y + 8, head: [['', ...tamanhos, 'Total']],
              body: [
                  [isProjecaoAtiva ? 'Proj.' : 'Venda', ...tamanhos.map(t => vendasOuProjecao[t] || 0), totalVendasOuProjecao],
                  ['Estoque', ...tamanhos.map(t => produto.estoque[t] || 0), produto.totalEstoque],
                  ['Produção', ...tamanhos.map(t => producaoValores[t] || 0), totalProducao],
              ],
              theme: 'grid', margin: { left: x }, tableWidth: cardW,
              styles: { fontSize: 6, cellPadding: 0.5 },
              headStyles: { fillColor: [41, 128, 185], fontSize: 7, cellPadding: {top: 1, right: 0.5, bottom: 1, left: 0.5} },
          });
          produtoIndex++;
      }
      doc.save(`Pre-Pedido-${nomePrePedido || 'Relatorio'}-${Date.now()}.pdf`);
      setExportandoPDF(false);
      toast.success('PDF gerado com sucesso!', { id: 'pdf-toast' });
    }, 50);
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Carregando...</div>;

  return (
    <div className="space-y-6 p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pré-Pedido de Produção</h1>
          <p className="text-gray-600 h-6">{chaveAtual ? `Editando: ${nomePrePedido}` : 'Novo pré-pedido'}</p>
        </div>
        <div className="flex items-center justify-end gap-2 flex-wrap">
            <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
                <select value={pdfOrientation} onChange={e => setPdfOrientation(e.target.value as PdfOrientation)} className="text-xs border rounded p-1 bg-white" title="Orientação da página">
                    <option value="p">Retrato</option><option value="l">Paisagem</option>
                </select>
                <input type="number" min="1" value={colunasPorPagina} onChange={e => setColunasPorPagina(+e.target.value)} className="w-14 text-xs border rounded p-1" title="Colunas por página"/>
                <span className="text-xs font-bold">x</span>
                <input type="number" min="1" value={linhasPorPagina} onChange={e => setLinhasPorPagina(+e.target.value)} className="w-14 text-xs border rounded p-1" title="Linhas por página"/>
            </div>
            <button onClick={exportarPDF} disabled={exportandoPDF || !dadosBaseRelatorio.length} className="inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg shadow-sm disabled:opacity-50 hover:bg-red-700">
                <FileDown className="h-4 w-4 mr-2" /> {exportandoPDF ? 'Gerando...' : 'PDF'}
            </button>
            <button onClick={() => setShowProjecao(true)} className="inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg shadow-sm hover:bg-purple-700">
                <Calculator className="h-4 w-4 mr-2" /> Projeção
            </button>
            {isProjecaoAtiva && (<motion.button initial={{opacity:0, width:0}} animate={{opacity:1, width:'auto'}} onClick={handleRemoverProjecao} className="inline-flex items-center justify-center px-4 py-2 bg-orange-500 text-white rounded-lg shadow-sm hover:bg-orange-600">
                <XCircle className="h-4 w-4 mr-2" /> Remover
            </motion.button>)}
            <button onClick={() => chaveAtual ? salvarPrePedido() : setShowSalvarComo(true)} className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700">
                <Save className="h-4 w-4 mr-2" /> {chaveAtual ? 'Salvar' : 'Salvar Como...'}
            </button>
            <button onClick={() => setShowGerenciarChaves(true)} className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700">
                <Key className="h-4 w-4 mr-2" /> Gerenciar
            </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="col-span-1"><label className="block text-sm font-medium mb-1">Data Início</label><input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm"/></div>
          <div className="col-span-1"><label className="block text-sm font-medium mb-1">Data Fim</label><input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm"/></div>
          <div className="col-span-1"><label className="block text-sm font-medium mb-1">Loja</label><select value={filtroIdLoja} onChange={e => setFiltroIdLoja(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm bg-white"><option value="">Todas</option>{lojasDisponiveis.map(l => (<option key={l} value={l}>{obterNomeLoja(l)}</option>))}</select></div>
          <div className="col-span-1"><label className="block text-sm font-medium mb-1"><EarthLock className="h-4 w-4 inline -mt-1 mr-1"/>Fornecedor</label><input type="text" value={fornecedor} onChange={e => setFornecedor(e.target.value)} placeholder="Nome" className="w-full px-3 py-2 border rounded-md text-sm" /></div>
          <div className="relative col-span-1" ref={situacaoRef}><label className="block text-sm font-medium mb-1">Situação</label><button onClick={() => setIsSituacaoOpen(!isSituacaoOpen)} className="w-full flex items-center justify-between text-left px-3 py-2 border bg-white rounded-md text-sm"><span className="truncate">{!filtroSituacoes.length ? 'Todas' : `${filtroSituacoes.length} sel.`}</span><ChevronDown className={`h-4 w-4 ${isSituacaoOpen ? 'rotate-180' : ''}`}/></button>{isSituacaoOpen && (<div className="absolute top-full left-0 mt-1 w-full bg-white border rounded-md shadow-lg z-10">{Object.entries(situacoesBling).map(([id, nome]) => (<label key={id} className="flex items-center px-3 py-2 text-sm hover:bg-gray-50"><input type="checkbox" checked={filtroSituacoes.includes(id)} onChange={() => handleSituacaoChange(id)}/><span className="ml-2">{nome}</span></label>))}</div>)}</div>
          <div className="col-span-2 lg:col-span-1 flex items-end"><button onClick={() => fetchData(dataInicio, dataFim)} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm flex items-center justify-center"><RefreshCw className="h-4 w-4 mr-2"/>Atualizar</button></div>
        </div>
      </div>
      
      <div className="bg-green-100 border border-green-300 rounded-xl p-4 flex items-center justify-around text-green-800 font-medium">
         <span><Package className="h-5 w-5 inline mr-2 -mt-1"/>Pares Vendidos: <strong>{totaisRelatorio.totalParesVendidos}</strong></span>
         <span><RefreshCw className="h-5 w-5 inline mr-2 -mt-1"/>Total a Produzir: <strong>{totaisRelatorio.totalProducao}</strong></span>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Itens do Pré-Pedido</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {dadosBaseRelatorio.map((produto) => (
            <ProdutoCard
              key={produto.codigo}
              produto={produto}
              foto={fotosProdutos[produto.codigo]}
              producaoValores={produtosComProducao[produto.codigo]}
              onProducaoChange={atualizarProducao}
              isProjecaoAtiva={isProjecaoAtiva}
              percentuaisProjecao={percentuaisProjecao}
            />
          ))}
        </div>
        {!dadosBaseRelatorio.length && (<div className="text-center py-16 text-gray-500">Nenhum produto encontrado.</div>)}
      </div>

      {showProjecao && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="bg-white rounded-xl max-w-2xl w-full shadow-2xl">
                <div className="p-6 border-b flex items-center justify-between"><h3 className="text-lg font-semibold">Configurar Projeção</h3><button onClick={() => setShowProjecao(false)} className="text-gray-400 hover:text-gray-600">✕</button></div>
                <div className="p-6"><p className="text-sm text-gray-600 mb-6">Ajuste os percentuais de acréscimo para cada tamanho.</p>
                    <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
                        {tamanhos.map(t => (<div key={t}><label className="block text-sm font-medium text-center mb-1">T. {t}</label><div className="relative"><input type="number" value={percentuaisProjecao[t] || 0} onChange={e => setPercentuaisProjecao(p => ({ ...p, [t]: +e.target.value }))} className="w-full text-center px-2 py-2 border rounded-lg pr-7"/><span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">%</span></div></div>))}
                    </div>
                </div>
                <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                    <button onClick={() => setShowProjecao(false)} className="px-5 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleAplicarProjecao} className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Aplicar</button>
                </div>
            </motion.div>
        </div>
      )}

      {showSalvarComo && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="bg-white rounded-xl max-w-md w-full shadow-2xl">
              <div className="p-6 border-b"><h3 className="text-lg font-semibold">Salvar Novo Pré-Pedido</h3></div>
              <div className="p-6 space-y-4">
                  <div><label className="block text-sm font-medium mb-1">Nome</label><input type="text" value={nomePrePedido} onChange={e => setNomePrePedido(e.target.value)} className="w-full px-3 py-2 border rounded-lg"/></div>
                  <div><label className="block text-sm font-medium mb-1">Fornecedor</label><input type="text" value={fornecedor} onChange={e => setFornecedor(e.target.value)} className="w-full px-3 py-2 border rounded-lg"/></div>
                  <div><label className="block text-sm font-medium mb-1">Chave (Opcional)</label><input type="text" value={chaveAtual} onChange={e => setChaveAtual(e.target.value)} className="w-full px-3 py-2 border rounded-lg"/></div>
              </div>
              <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                  <button onClick={() => setShowSalvarComo(false)} className="px-5 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancelar</button>
                  <button onClick={salvarPrePedido} className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Salvar</button>
              </div>
          </motion.div>
        </div>
      )}

      {showGerenciarChaves && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] flex flex-col shadow-2xl">
              <div className="p-6 border-b flex items-center justify-between"><h3 className="text-lg font-semibold">Gerenciar Salvos</h3><button onClick={() => setShowGerenciarChaves(false)} className="text-gray-400 hover:text-gray-600">✕</button></div>
              <div className="p-6 flex-grow overflow-y-auto">{prePedidosSalvos.length > 0 ? (<div className="space-y-3">{prePedidosSalvos.map(pp => (<div key={pp.chave} className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-gray-50"><div><h4 className="font-semibold">{pp.nome}</h4><p className="text-sm text-gray-600">Chave: <span className="font-mono bg-gray-100 px-1 rounded">{pp.chave}</span> | Fornecedor: {pp.fornecedor || 'N/A'}</p></div><div className="flex gap-2 self-end sm:self-center"><button onClick={() => carregarPrePedido(pp.chave)} className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"><Search className="h-4 w-4"/></button><button onClick={() => {if (confirm(`Excluir "${pp.nome}"?`)) {excluirPrePedido(pp.chave);}}} className="p-2 bg-red-600 text-white rounded hover:bg-red-700"><Trash2 className="h-4 w-4"/></button></div></div>))}</div>) : <div className="text-center py-10 text-gray-500">Nenhum salvo.</div>}</div>
              <div className="p-4 bg-gray-50 border-t flex justify-end"><button onClick={() => setShowGerenciarChaves(false)} className="px-5 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Fechar</button></div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default PrePedido;