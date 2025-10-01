import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Calculator, ChevronDown, Package, RefreshCw, Target, ToggleLeft, ToggleRight, XCircle, FileDown
} from 'lucide-react';
import {
  supabase, ItemPedidoVendas, obterNomeLoja,
  buscarItensPedidosPorPeriodo, buscarEstoqueGeral, buscarEstoquePronto,
  buscarFotoProdutoPorSkuPai
} from '../lib/supabase'; // OBS: Certifique-se que o caminho para seu arquivo supabase está correto
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';

// --- Tipos e Interfaces ---
type TipoEstoque = 'geral' | 'pronto';
type PdfOrientation = 'p' | 'l'; // 'p' para retrato, 'l' para paisagem

interface ProdutoRelatorio {
  codigo: string;
  linha: string;
  modelo: string;
  vendas: { [tamanho: string]: number };
  estoque: { [tamanho: string]: number };
  totalVendas: number;
}

const situacoesBling: { [key: string]: string } = {
  '6': 'Em aberto',
  '9': 'Atendido',
  '12': 'Cancelado',
  '15': 'Em andamento'
};

// --- Componente Principal ---
const VendasRelatorioGeral: React.FC = () => {
  // --- Estados ---
  const [itensPedidos, setItensPedidos] = useState<ItemPedidoVendas[]>([]);
  const [estoqueGeral, setEstoqueGeral] = useState<any[]>([]);
  const [estoquePronto, setEstoquePronto] = useState<any[]>([]);
  const [fotosProdutos, setFotosProdutos] = useState<{ [sku: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState(() => new Date().toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0]);
  const [filtroIdLoja, setFiltroIdLoja] = useState<string>('');
  const [filtroSituacoes, setFiltroSituacoes] = useState<string[]>(['6', '9']);
  const [filtroLinha, setFiltroLinha] = useState<string>('');
  const [filtroModelo, setFiltroModelo] = useState<string>('');
  const [filtroProduto, setFiltroProduto] = useState<string>('');
  const [tipoEstoque, setTipoEstoque] = useState<TipoEstoque>('geral');
  const [showProjecao, setShowProjecao] = useState(false);
  const [isSituacaoOpen, setIsSituacaoOpen] = useState(false);
  const situacaoRef = useRef<HTMLDivElement>(null);
  const [isProjecaoAtiva, setIsProjecaoAtiva] = useState(false);
  const [exportandoPDF, setExportandoPDF] = useState(false);

  // --- Estados de Controle do PDF ---
  const [colunasPerPage, setColunasPerPage] = useState(8);
  const [pdfOrientation, setPdfOrientation] = useState<PdfOrientation>('l');
  const [linhasPorPagina, setLinhasPorPagina] = useState(10);

  const [percentuaisProjecao, setPercentuaisProjecao] = useState<{ [tamanho: string]: number }>({
    '34': 10, '35': 15, '36': 20, '37': 25, '38': 20, '39': 15, '40': 10
  });
  const tamanhos = ['34', '35', '36', '37', '38', '39', '40'];

  // --- Funções de busca e hooks ---
  const fetchData = async () => {
    try {
      setLoading(true);
      const [itensData, estoqueGeralData, estoqueProntoData] = await Promise.all([
        buscarItensPedidosPorPeriodo(dataInicio, dataFim),
        buscarEstoqueGeral(),
        buscarEstoquePronto()
      ]);
      setItensPedidos(itensData);
      setEstoqueGeral(estoqueGeralData);
      setEstoquePronto(estoqueProntoData);
      toast.success(`Relatório carregado: ${itensData.length} itens.`);
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData() }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (situacaoRef.current && !situacaoRef.current.contains(event.target as Node)) setIsSituacaoOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dadosRelatorio = useMemo(() => {
    const produtosMap = new Map<string, ProdutoRelatorio>();
    const itensFiltrados = itensPedidos.filter(item => {
      if (!item || !item.item_codigo) return false; // Validação de segurança
      if (filtroIdLoja && item.loja !== filtroIdLoja) return false;
      if (filtroSituacoes.length > 0 && !filtroSituacoes.includes(String(item.situacao_bling))) return false;
      const codigo = item.item_codigo;
      if (filtroLinha && !codigo.startsWith(filtroLinha)) return false;
      if (filtroModelo && !codigo.startsWith(filtroModelo)) return false;
      if (filtroProduto && !codigo.startsWith(filtroProduto)) return false;
      return true;
    });

    itensFiltrados.forEach(item => {
      const codigoBase = item.item_codigo.substring(0, 11);
      const tamanho = item.item_codigo.split('-')[1] || 'N/A';
      if (!tamanhos.includes(tamanho)) return;

      if (!produtosMap.has(codigoBase)) {
        produtosMap.set(codigoBase, {
          codigo: codigoBase,
          linha: codigoBase.substring(0, 3),
          modelo: codigoBase.substring(0, 7),
          vendas: {},
          estoque: {},
          totalVendas: 0
        });
      }
      const produtoData = produtosMap.get(codigoBase)!;
      produtoData.vendas[tamanho] = (produtoData.vendas[tamanho] || 0) + item.item_quantidade;
      produtoData.totalVendas += item.item_quantidade;
    });

    const estoqueAtual = tipoEstoque === 'geral' ? estoqueGeral : estoquePronto;
    produtosMap.forEach((produto, codigo) => {
      tamanhos.forEach(tamanho => {
        const skuCompleto = `${codigo}-${tamanho}`;
        const itemEstoque = estoqueAtual.find(e => e.sku === skuCompleto);
        produto.estoque[tamanho] = itemEstoque?.quantidade || 0;
      });
    });
    return Array.from(produtosMap.values()).sort((a, b) => b.totalVendas - a.totalVendas);
  }, [itensPedidos, filtroIdLoja, filtroSituacoes, filtroLinha, filtroModelo, filtroProduto, tipoEstoque, estoqueGeral, estoquePronto]);

  useEffect(() => {
    const fetchFotos = async () => {
      if (dadosRelatorio.length === 0) return;
      const novasFotosPromises = dadosRelatorio.map(async (produto) => {
        if (!fotosProdutos[produto.codigo]) {
          const fotoBase64 = await buscarFotoProdutoPorSkuPai(produto.codigo);
          return { sku: produto.codigo, foto: fotoBase64 };
        }
        return null;
      });
      const resultados = await Promise.all(novasFotosPromises);
      const novasFotos: { [sku: string]: string } = {};
      resultados.forEach(res => {
        if (res && res.foto) {
          novasFotos[res.sku] = res.foto;
        }
      });
      if (Object.keys(novasFotos).length > 0) {
        setFotosProdutos(prevFotos => ({ ...prevFotos, ...novasFotos }));
      }
    };
    fetchFotos();
  }, [dadosRelatorio, fotosProdutos]);

  const totaisRelatorio = useMemo(() => ({
    totalProdutos: dadosRelatorio.length,
    totalParesVendidos: dadosRelatorio.reduce((acc, p) => acc + p.totalVendas, 0),
    totalEstoque: dadosRelatorio.reduce((acc, p) => acc + Object.values(p.estoque).reduce((s, q) => s + q, 0), 0)
  }), [dadosRelatorio]);

  const { lojasDisponiveis, linhasDisponiveis, modelosDisponiveis, produtosDisponiveis } = useMemo(() => {
    const lojas = new Set<string>(), linhas = new Set<string>(), modelos = new Set<string>(), produtosSet = new Set<string>();
    itensPedidos.forEach(item => {
      if (!item || !item.item_codigo) return; // Validação de segurança
      if (item.loja) lojas.add(item.loja);
      const codigo = item.item_codigo;
      if (codigo.length >= 3) linhas.add(codigo.substring(0, 3));
      if (codigo.length >= 7) modelos.add(codigo.substring(0, 7));
      if (codigo.length >= 11) produtosSet.add(codigo.substring(0, 11));
    });
    return {
      lojasDisponiveis: Array.from(lojas).sort(),
      linhasDisponiveis: Array.from(linhas).sort(),
      modelosDisponiveis: Array.from(modelos).sort(),
      produtosDisponiveis: Array.from(produtosSet).sort()
    };
  }, [itensPedidos]);

  // Handlers
  const handleSituacaoChange = (situacaoId: string) => setFiltroSituacoes(prev => prev.includes(situacaoId) ? prev.filter(id => id !== situacaoId) : [...prev, situacaoId]);
  const limparFiltros = () => { setFiltroIdLoja(''); setFiltroSituacoes([]); setFiltroLinha(''); setFiltroModelo(''); setFiltroProduto(''); };
  const alternarTipoEstoque = () => setTipoEstoque(prev => prev === 'geral' ? 'pronto' : 'geral');
  const handleAplicarProjecao = () => {
    setIsProjecaoAtiva(true);
    setShowProjecao(false);
    toast.success('Projeção aplicada ao relatório!');
  };
  const handleRemoverProjecao = () => {
    setIsProjecaoAtiva(false);
    toast.success('Projeção removida.');
  };

  // --- Lógica de PDF ---
  const getDynamicPdfSettings = (columns: number, rows: number) => {
    const density = columns * rows;
    if (density <= 20) {
      return { fontSizes: { title: 8, body: 7, tableHeader: 6, tableBody: 6 }, layout: { lineSpacing: 3.5 } };
    }
    if (density <= 50) {
      return { fontSizes: { title: 7, body: 6, tableHeader: 5, tableBody: 5 }, layout: { lineSpacing: 3 } };
    }
    if (density <= 100) {
      return { fontSizes: { title: 6, body: 5, tableHeader: 4, tableBody: 4 }, layout: { lineSpacing: 2.5 } };
    }
    return { fontSizes: { title: 5, body: 4, tableHeader: 3.5, tableBody: 3.5 }, layout: { lineSpacing: 2.2 } };
  };

  const exportarPDF = async () => {
    if (dadosRelatorio.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }
    setExportandoPDF(true);
    toast.loading('Gerando PDF...', { id: 'pdf-export' });

    try {
      const { fontSizes, layout } = getDynamicPdfSettings(colunasPerPage, linhasPorPagina);
      const pdf = new jsPDF(pdfOrientation, 'mm', 'a4');

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const contentWidth = pageWidth - (margin * 2);
      const headerAndFooterHeight = 30;
      const availableHeight = pageHeight - headerAndFooterHeight;

      const espacoEntreColunas = 3;
      const columnWidth = (contentWidth - (espacoEntreColunas * (colunasPerPage - 1))) / colunasPerPage;

      const itemHeight = availableHeight / linhasPorPagina;

      pdf.setFont('helvetica');
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Relatório de Vendas e Estoque', pageWidth / 2, 12, { align: 'center' });
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      const dataFormatada = `Período: ${new Date(dataInicio + 'T00:00:00').toLocaleDateString()} a ${new Date(dataFim + 'T00:00:00').toLocaleDateString()}`;
      pdf.text(dataFormatada, pageWidth / 2, 18, { align: 'center' });
      pdf.setFontSize(7);
      const resumo = `Produtos: ${totaisRelatorio.totalProdutos} | Pares Vendidos: ${totaisRelatorio.totalParesVendidos} | Estoque (${tipoEstoque}): ${totaisRelatorio.totalEstoque}`;
      pdf.text(resumo, pageWidth / 2, 23, { align: 'center' });

      const initialYPosition = 26;

      for (let i = 0; i < dadosRelatorio.length; i++) {
        const produto = dadosRelatorio[i];
        const itemsPerPage = linhasPorPagina * colunasPerPage;

        if (i > 0 && i % itemsPerPage === 0) {
          pdf.addPage();
        }

        const itemIndexOnPage = i % itemsPerPage;
        const currentColumn = Math.floor(itemIndexOnPage / linhasPorPagina);
        const currentRow = itemIndexOnPage % linhasPorPagina;

        const startX = margin + (currentColumn * (columnWidth + espacoEntreColunas));
        const startY = initialYPosition + (currentRow * itemHeight);

        let vendasOuProjecao: { [tamanho: string]: number } = produto.vendas;
        let totalVendasOuProjecao = produto.totalVendas;
        if (isProjecaoAtiva) {
          vendasOuProjecao = {};
          totalVendasOuProjecao = 0;
          tamanhos.forEach(tamanho => {
            const vendasAtuais = produto.vendas[tamanho] || 0;
            const percentual = percentuaisProjecao[tamanho] || 0;
            const valorProjetado = Math.ceil(vendasAtuais + (vendasAtuais * percentual / 100));
            vendasOuProjecao[tamanho] = valorProjetado;
            totalVendasOuProjecao += valorProjetado;
          });
        }
        const diferencaDinamica: { [tamanho: string]: number } = {};
        let totalDiferencaDinamica = 0;
        tamanhos.forEach(tamanho => {
          const estoque = produto.estoque[tamanho] || 0;
          const vendaOuProj = vendasOuProjecao[tamanho] || 0;
          diferencaDinamica[tamanho] = estoque - vendaOuProj;
          totalDiferencaDinamica += diferencaDinamica[tamanho];
        });

        const fotoProduto = fotosProdutos[produto.codigo];
        if (fotoProduto) {
          try {
            const imgData = `data:image/jpeg;base64,${fotoProduto}`;
            pdf.addImage(imgData, 'JPEG', startX, startY, 12, 12);
          } catch (error) { console.warn('Erro ao adicionar imagem:', error); }
        } else {
          pdf.setDrawColor(200, 200, 200);
          pdf.rect(startX, startY, 12, 12);
        }

        pdf.setFontSize(fontSizes.title);
        pdf.setFont('helvetica', 'bold');
        pdf.text(produto.codigo, startX + 14, startY + 4);

        pdf.setFontSize(fontSizes.body);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`L: ${produto.linha} | M: ${produto.modelo}`, startX + 14, startY + 8);

        const tableStartY = startY + 13;
        const cellWidth = columnWidth / 9;

        pdf.setFontSize(fontSizes.tableHeader);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Grade', startX, tableStartY);
        tamanhos.forEach((t, index) => pdf.text(t, startX + cellWidth * (index + 1.5), tableStartY, { align: 'center' }));
        pdf.text('TOT', startX + cellWidth * 8.5, tableStartY, { align: 'center' });

        pdf.setFontSize(fontSizes.tableBody);
        pdf.setFont('helvetica', 'normal');

        const vendasY = tableStartY + layout.lineSpacing;
        pdf.text(isProjecaoAtiva ? 'PROJ' : 'VEN', startX, vendasY);
        tamanhos.forEach((t, index) => pdf.text((vendasOuProjecao[t] || 0).toString(), startX + cellWidth * (index + 1.5), vendasY, { align: 'center' }));
        pdf.text(totalVendasOuProjecao.toString(), startX + cellWidth * 8.5, vendasY, { align: 'center' });

        const estoqueY = vendasY + layout.lineSpacing;
        pdf.text('EST', startX, estoqueY);
        tamanhos.forEach((t, index) => pdf.text((produto.estoque[t] || 0).toString(), startX + cellWidth * (index + 1.5), estoqueY, { align: 'center' }));
        const totalEstoque = Object.values(produto.estoque).reduce((a, b) => a + b, 0);
        pdf.text(totalEstoque.toString(), startX + cellWidth * 8.5, estoqueY, { align: 'center' });

        const diferencaY = estoqueY + layout.lineSpacing;
        pdf.text('DIF', startX, diferencaY);
        tamanhos.forEach((tamanho, index) => {
          const valor = diferencaDinamica[tamanho] || 0;
          if (valor < 0) pdf.setTextColor(255, 0, 0);
          else if (valor > 0) pdf.setTextColor(0, 128, 0);
          else pdf.setTextColor(0, 0, 0);
          pdf.text(valor.toString(), startX + cellWidth * (index + 1.5), diferencaY, { align: 'center' });
          pdf.setTextColor(0, 0, 0);
        });
        pdf.text(totalDiferencaDinamica.toString(), startX + cellWidth * 8.5, diferencaY, { align: 'center' });
      }

      const nomeArquivo = `relatorio_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(nomeArquivo);

      toast.success('PDF gerado com sucesso!', { id: 'pdf-export' });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF', { id: 'pdf-export' });
    } finally {
      setExportandoPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Carregando relatório...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatório de Vendas e Estoque</h1>
          <p className="text-gray-600">
            Análise integrada - Período: {new Date(dataInicio + 'T00:00:00').toLocaleDateString()} a {new Date(dataFim + 'T00:00:00').toLocaleDateString()}
          </p>
        </div>

        <div className="flex flex-col items-stretch sm:flex-row sm:flex-wrap sm:items-center sm:justify-end gap-2">
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-2 p-2 bg-gray-100 rounded-lg">
            <div className="flex items-center space-x-1">
              <label className="text-sm font-medium">Orientação:</label>
              <select
                value={pdfOrientation}
                onChange={e => setPdfOrientation(e.target.value as PdfOrientation)}
                className="px-2 py-1 border rounded text-sm bg-white"
              >
                <option value="l">Paisagem</option>
                <option value="p">Retrato</option>
              </select>
            </div>
            <div className="flex items-center space-x-1">
              <label className="text-sm font-medium">Colunas:</label>
              <select
                value={colunasPerPage}
                onChange={e => setColunasPerPage(Number(e.target.value))}
                className="px-2 py-1 border rounded text-sm bg-white"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center space-x-1">
              <label className="text-sm font-medium">Linhas:</label>
              <select
                value={linhasPorPagina}
                onChange={e => setLinhasPorPagina(Number(e.target.value))}
                className="px-2 py-1 border rounded text-sm bg-white"
              >
                {[5, 6, 7, 8, 9, 10, 12, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={exportarPDF}
            disabled={exportandoPDF || dadosRelatorio.length === 0}
            className="inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown className="h-5 w-5 mr-2" />
            {exportandoPDF ? 'Gerando...' : `Exportar PDF`}
          </button>
          <button
            onClick={alternarTipoEstoque}
            className={`inline-flex items-center justify-center px-4 py-2 rounded-lg transition-colors ${
              tipoEstoque === 'geral'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-green-600 text-white hover:bg-green-700'
              }`}
          >
            <ToggleLeft className={`h-5 w-5 mr-2 ${tipoEstoque === 'pronto' && 'hidden'}`} />
            <ToggleRight className={`h-5 w-5 mr-2 ${tipoEstoque === 'geral' && 'hidden'}`} />
            {tipoEstoque === 'geral' ? 'Geral' : 'Pronto'}
          </button>
          <button
            onClick={() => setShowProjecao(true)}
            className="inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Calculator className="h-5 w-5 mr-2" />
            Projeção
          </button>
          {isProjecaoAtiva && (
            <motion.button
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              onClick={handleRemoverProjecao}
              className="inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <XCircle className="h-5 w-5 mr-2" />
              Remover
            </motion.button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="col-span-1">
            <label className="block text-sm font-medium mb-1">Data Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-medium mb-1">Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={e => setDataFim(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-medium mb-1">Loja</label>
            <select
              value={filtroIdLoja}
              onChange={e => setFiltroIdLoja(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              <option value="">Todas</option>
              {lojasDisponiveis.map(l => (
                <option key={l} value={l}>{obterNomeLoja(l)}</option>
              ))}
            </select>
          </div>
          <div className="relative col-span-1" ref={situacaoRef}>
            <label className="block text-sm font-medium mb-1">Situação</label>
            <button
              onClick={() => setIsSituacaoOpen(!isSituacaoOpen)}
              className="w-full flex items-center justify-between text-left px-3 py-2 border bg-white rounded-md text-sm"
            >
              <span className="truncate">
                {filtroSituacoes.length === 0 ? 'Todas' : `${filtroSituacoes.length} sel.`}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isSituacaoOpen ? 'rotate-180' : ''}`} />
            </button>
            {isSituacaoOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white border rounded-md shadow-lg z-10">
                {Object.entries(situacoesBling).map(([id, nome]) => (
                  <label key={id} className="flex items-center px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded"
                      checked={filtroSituacoes.includes(id)}
                      onChange={() => handleSituacaoChange(id)}
                    />
                    <span className="ml-2">{nome}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-medium mb-1">Linha</label>
            <select
              value={filtroLinha}
              onChange={e => setFiltroLinha(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              <option value="">Todas</option>
              {linhasDisponiveis.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-medium mb-1">Modelo</label>
            <select
              value={filtroModelo}
              onChange={e => setFiltroModelo(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              <option value="">Todos</option>
              {modelosDisponiveis.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium mb-1">Produto</label>
            <select
              value={filtroProduto}
              onChange={e => setFiltroProduto(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              <option value="">Todos</option>
              {produtosDisponiveis.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2 lg:col-span-1 flex items-end space-x-2">
            <button
              onClick={limparFiltros}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
            >
              Limpar
            </button>
            <button
              onClick={fetchData}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              <RefreshCw className="h-4 w-4 inline-block -mt-1 mr-1" />
              Buscar
            </button>
          </div>
        </div>
      </div>

      {/* Totais */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center flex-wrap gap-x-6 gap-y-1">
          <Package className="h-5 w-5 text-green-600" />
          <span className="text-green-800 font-medium">
            <strong>Produtos:</strong> {totaisRelatorio.totalProdutos}
          </span>
          <span className="text-green-800 font-medium">
            <strong>Pares Vendidos:</strong> {totaisRelatorio.totalParesVendidos}
          </span>
          <span className="text-green-800 font-medium">
            <strong>Estoque ({tipoEstoque}):</strong> {totaisRelatorio.totalEstoque}
          </span>
        </div>
        <div className="text-sm text-green-600 hidden md:block">
          Usando: {tipoEstoque === 'geral' ? 'estoque_geral' : 'estoque_pronto'}
        </div>
      </div>

      {/* Grid de Produtos */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Análise de Vendas vs {tipoEstoque === 'geral' ? 'Estoque Geral' : 'Estoque Pronto'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dadosRelatorio.map((produto) => {
            const fotoProduto = fotosProdutos[produto.codigo];
            let vendasOuProjecao: { [tamanho: string]: number } = produto.vendas;
            let totalVendasOuProjecao = produto.totalVendas;
            if (isProjecaoAtiva) {
              vendasOuProjecao = {};
              totalVendasOuProjecao = 0;
              tamanhos.forEach(tamanho => {
                const vendasAtuais = produto.vendas[tamanho] || 0;
                const percentual = percentuaisProjecao[tamanho] || 0;
                const valorProjetado = Math.ceil(vendasAtuais + (vendasAtuais * percentual / 100));
                vendasOuProjecao[tamanho] = valorProjetado;
                totalVendasOuProjecao += valorProjetado;
              });
            }
            const diferencaDinamica: { [tamanho: string]: number } = {};
            let totalDiferencaDinamica = 0;
            tamanhos.forEach(tamanho => {
              const estoque = produto.estoque[tamanho] || 0;
              const vendaOuProj = vendasOuProjecao[tamanho] || 0;
              diferencaDinamica[tamanho] = estoque - vendaOuProj;
              totalDiferencaDinamica += diferencaDinamica[tamanho];
            });

            return (
              <motion.div
                key={produto.codigo}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="border border-gray-200 rounded-lg py-2 px-px md:p-4 bg-gray-50 flex flex-col break-inside-avoid"
              >
                <div className="flex-grow px-2">
                  <div className="flex items-center mb-4">
                    <div className="mr-3 flex-shrink-0">
                      <img
                        src={fotoProduto ? `data:image/jpeg;base64,${fotoProduto}` : undefined}
                        alt={`Foto do produto ${produto.codigo}`}
                        className="w-16 h-16 object-cover rounded-lg bg-gray-200"
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-blue-600 text-sm leading-tight">{produto.codigo}</h3>
                      <p className="text-xs text-gray-600">Linha: {produto.linha} | Modelo: {produto.modelo}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-1 text-[11px] md:text-xs mt-auto">
                  <div className="grid grid-cols-10 gap-x-0.5 font-medium text-gray-700 text-center">
                    <div className="text-left col-span-2 pl-1">Grade</div>
                    {tamanhos.map(t => <div key={t}>{t}</div>)}
                    <div className="pr-1">Total</div>
                  </div>
                  <div className="grid grid-cols-10 gap-x-0.5 items-center">
                    <div className={`font-medium text-left col-span-2 pl-1 ${isProjecaoAtiva ? 'text-purple-700' : 'text-gray-700'}`}>
                      {isProjecaoAtiva ? 'Projeção' : 'Venda'}
                    </div>
                    {tamanhos.map(t => (
                      <div key={t} className="text-center bg-white rounded py-1">
                        {vendasOuProjecao[t] || 0}
                      </div>
                    ))}
                    <div className={`text-center font-bold rounded py-1 mr-1 ${isProjecaoAtiva ? 'bg-purple-100' : 'bg-blue-100'}`}>
                      {totalVendasOuProjecao}
                    </div>
                  </div>
                  <div className="grid grid-cols-10 gap-x-0.5 items-center">
                    <div className="font-medium text-left text-gray-700 col-span-2 pl-1">Estoque</div>
                    {tamanhos.map(t => (
                      <div key={t} className="text-center bg-white rounded py-1">
                        {produto.estoque[t] || 0}
                      </div>
                    ))}
                    <div className="text-center font-bold bg-green-100 rounded py-1 mr-1">
                      {Object.values(produto.estoque).reduce((a, b) => a + b, 0)}
                    </div>
                  </div>
                  <div className="grid grid-cols-10 gap-x-0.5 items-center">
                    <div className="font-medium text-left text-gray-700 col-span-2 pl-1">Diferença</div>
                    {tamanhos.map(t => (
                      <div
                        key={t}
                        className={`text-center font-semibold rounded py-1 ${
                          diferencaDinamica[t] > 0
                            ? 'bg-green-100 text-green-800'
                            : diferencaDinamica[t] < 0
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100'
                          }`}
                      >
                        {diferencaDinamica[t] || 0}
                      </div>
                    ))}
                    <div className="text-center font-bold bg-yellow-100 rounded py-1 mr-1">
                      {totalDiferencaDinamica}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        {dadosRelatorio.length === 0 && (
          <div className="text-center py-16">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium">Nenhum produto encontrado</h3>
            <p className="text-gray-500 text-sm">Tente ajustar os filtros ou o período selecionado.</p>
          </div>
        )}
      </div>

      {/* Modal de Projeção */}
      {showProjecao && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl max-w-lg w-full shadow-2xl"
          >
            <div className="p-6 border-b flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Target className="h-6 w-6 text-purple-600" />
                <h3 className="text-lg font-semibold">Configurar Projeção</h3>
              </div>
              <button onClick={() => setShowProjecao(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div>
                <h4 className="font-semibold mb-2">Ajuste de Percentuais</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Insira a % de aumento (ex: 20) ou redução (ex: -15) para cada tamanho.
                </p>
                <div className="space-y-2">
                  {tamanhos.map(t => (
                    <div key={t} className="flex items-center justify-between">
                      <label className="font-medium">Tamanho {t}</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={percentuaisProjecao[t]}
                          onChange={e => setPercentuaisProjecao(p => ({ ...p, [t]: Number(e.target.value) }))}
                          className="w-20 px-2 py-1 border rounded text-center"
                        />
                        <span className="text-gray-500">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowProjecao(false)}
                className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleAplicarProjecao}
                className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Aplicar ao Relatório
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default VendasRelatorioGeral;