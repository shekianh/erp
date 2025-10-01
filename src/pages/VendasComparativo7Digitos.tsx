import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  PlusCircle, 
  Calendar,
  RefreshCw,
  Download,
  X,
  Filter
} from 'lucide-react';
import { supabase, ItemPedidoVendas } from '../lib/supabase'; // Certifique-se que este caminho está correto
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

// --- Tipos de Interface ---
interface ComparativoMes {
  mes: string;
  ano: number;
  mesAno: string;
  totalQuantidade: number;
}

// Tipo simplificado: sem o totalizador
interface ComparativoLinha {
  linha: string;
  meses: Record<string, ComparativoMes>;
}

// --- Componente Principal ---
const VendasComparativo7Digitos: React.FC = () => {
  // --- Estados ---
  const [itensPedidos, setItensPedidos] = useState<ItemPedidoVendas[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodosSelecionados, setPeriodosSelecionados] = useState<string[]>([]);
  const [anoParaAdicionar, setAnoParaAdicionar] = useState<string>(new Date().getFullYear().toString());
  const [mesParaAdicionar, setMesParaAdicionar] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [ordenacao, setOrdenacao] = useState<'quantidade' | 'alfabetica'>('quantidade');
  const [filtroLinha, setFiltroLinha] = useState('');
  
  const mesesDisponiveis = useMemo(() => [
    { value: '01', label: 'Janeiro' }, { value: '02', label: 'Fevereiro' }, { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' }, { value: '05', label: 'Maio' }, { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' }, { value: '08', label: 'Agosto' }, { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' }, { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' }
  ], []);
  
  const anosDisponiveis = useMemo(() => Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() - i).toString()), []);

  // --- Efeitos (Hooks) ---
  useEffect(() => {
    const hoje = new Date();
    const dataMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const dataMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const periodoAtual = `${dataMesAtual.getFullYear()}-${(dataMesAtual.getMonth() + 1).toString().padStart(2, '0')}`;
    const periodoAnterior = `${dataMesAnterior.getFullYear()}-${(dataMesAnterior.getMonth() + 1).toString().padStart(2, '0')}`;
    setPeriodosSelecionados([periodoAnterior, periodoAtual]);
  }, []);

  useEffect(() => {
    if (periodosSelecionados.length > 0) {
      fetchData();
    } else {
      setItensPedidos([]);
      setLoading(false);
    }
  }, [periodosSelecionados]);
  
  // --- Funções ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const promessas = periodosSelecionados.map(periodo => {
        const [ano, mes] = periodo.split('-');
        const dataInicio = `${ano}-${mes}-01`;
        const ultimoDia = new Date(parseInt(ano), parseInt(mes), 0).getDate();
        const dataFim = `${ano}-${mes}-${ultimoDia}`;
        return supabase.from('item_pedido_vendas').select('*').gte('data', dataInicio).lte('data', `${dataFim}T23:59:59`);
      });
      const resultados = await Promise.all(promessas);
      const todosItens = resultados.flatMap(res => res.data || []);
      setItensPedidos(todosItens);
      if (todosItens.length > 0) toast.success('Dados atualizados!');
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados de vendas');
    } finally {
      setLoading(false);
    }
  };

  const handleAdicionarPeriodo = () => {
    const novoPeriodo = `${anoParaAdicionar}-${mesParaAdicionar}`;
    if (periodosSelecionados.includes(novoPeriodo)) {
      toast.error('Este período já foi adicionado.');
      return;
    }
    setPeriodosSelecionados(prev => [...prev, novoPeriodo].sort());
  };

  const handleRemoverPeriodo = (periodoParaRemover: string) => {
    setPeriodosSelecionados(prev => prev.filter(p => p !== periodoParaRemover));
  };
  
  const extrairLinhaProduto = (codigo: string | null): string => {
    if (!codigo) return 'OUTROS';
    const match = codigo.match(/^(\d{3}\.\d{3})/);
    return match ? match[1] : codigo.substring(0, 7).toUpperCase();
  };

  // --- Memos (Cálculos Otimizados) ---
  const periodosComparativos = useMemo(() => {
    return periodosSelecionados.map(periodo => {
      const [ano, mes] = periodo.split('-');
      const mesNome = mesesDisponiveis.find(m => m.value === mes)?.label || mes;
      return { mesAno: periodo, label: `${mesNome}/${ano}` };
    }).sort((a, b) => a.mesAno.localeCompare(b.mesAno));
  }, [periodosSelecionados, mesesDisponiveis]);

  const dadosComparativos = useMemo(() => {
    const linhas: Record<string, ComparativoLinha> = {};
    itensPedidos.forEach(item => {
      if (!item.data || !item.item_codigo || item.item_quantidade == null) return;
      const linha = extrairLinhaProduto(item.item_codigo);
      const data = new Date(item.data);
      const mesAno = `${data.getFullYear()}-${(data.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!linhas[linha]) linhas[linha] = { linha, meses: {} };
      if (!linhas[linha].meses[mesAno]) {
        const mesNome = mesesDisponiveis.find(m => m.value === (data.getMonth() + 1).toString().padStart(2, '0'))?.label;
        linhas[linha].meses[mesAno] = { mes: mesNome || '', ano: data.getFullYear(), mesAno, totalQuantidade: 0 };
      }
      linhas[linha].meses[mesAno].totalQuantidade += item.item_quantidade;
    });
    return Object.values(linhas);
  }, [itensPedidos, mesesDisponiveis]);

  const dadosFiltradosOrdenados = useMemo(() => {
    let dados = [...dadosComparativos];
    if (filtroLinha) dados = dados.filter(l => l.linha.toLowerCase().includes(filtroLinha.toLowerCase()));
    
    if (ordenacao === 'quantidade' && periodosComparativos.length > 0) {
      const ultimoPeriodo = periodosComparativos[periodosComparativos.length - 1].mesAno;
      dados.sort((a, b) => {
        const qtdeA = a.meses[ultimoPeriodo]?.totalQuantidade || 0;
        const qtdeB = b.meses[ultimoPeriodo]?.totalQuantidade || 0;
        return qtdeB - qtdeA;
      });
    } else {
      dados.sort((a, b) => a.linha.localeCompare(b.linha));
    }
    return dados;
  }, [dadosComparativos, filtroLinha, ordenacao, periodosComparativos]);

  const handleExportar = () => {
    if (dadosFiltradosOrdenados.length === 0) return toast.error('Nenhum dado para exportar');
    const dadosExportacao = dadosFiltradosOrdenados.map(linha => {
      const linhaDados: any = { 'Modelo': linha.linha };
      periodosComparativos.forEach(p => { 
        linhaDados[p.label] = linha.meses[p.mesAno]?.totalQuantidade || 0;
      });
      // A linha do Total foi removida daqui
      return linhaDados;
    });
    const worksheet = XLSX.utils.json_to_sheet(dadosExportacao);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ComparativoVendas');
    XLSX.writeFile(workbook, `comparativo_vendas_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Relatório exportado com sucesso!');
  };
  
  // --- Renderização ---
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comparativo de Vendas (7 Dígitos)</h1>
          <p className="text-gray-600">Análise de quantidade vendida por modelo.</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={fetchData} className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"><RefreshCw className="h-5 w-5 mr-2" />Atualizar</button>
          <button onClick={handleExportar} className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"><Download className="h-5 w-5 mr-2" />Exportar Excel</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center"><Calendar className="h-5 w-5 text-blue-500 mr-2" />Seleção de Períodos</h3>
        <div className="flex flex-col md:flex-row items-end gap-3 p-4 bg-gray-50 rounded-lg">
          <div className="flex-1 w-full">
            <label htmlFor="select-ano" className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
            <select id="select-ano" value={anoParaAdicionar} onChange={e => setAnoParaAdicionar(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              {anosDisponiveis.map(ano => <option key={ano} value={ano}>{ano}</option>)}
            </select>
          </div>
          <div className="flex-1 w-full">
            <label htmlFor="select-mes" className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
            <select id="select-mes" value={mesParaAdicionar} onChange={e => setMesParaAdicionar(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              {mesesDisponiveis.map(mes => <option key={mes.value} value={mes.value}>{mes.label}</option>)}
            </select>
          </div>
          <button onClick={handleAdicionarPeriodo} className="w-full md:w-auto inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <PlusCircle className="h-5 w-5 mr-2" />
            Adicionar Período
          </button>
        </div>
        {periodosSelecionados.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">Períodos selecionados:</h4>
            <div className="flex flex-wrap gap-2">
              {periodosComparativos.map(p => (
                <span key={p.mesAno} className="inline-flex items-center bg-blue-100 text-blue-800 text-sm font-medium pl-3 pr-1 py-1 rounded-full">
                  {p.label}
                  <button onClick={() => handleRemoverPeriodo(p.mesAno)} className="ml-2 flex-shrink-0 bg-blue-200 hover:bg-blue-300 text-blue-700 rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input type="text" placeholder="Filtrar por modelo..." value={filtroLinha} onChange={e => setFiltroLinha(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/>
          </div>
          <select value={ordenacao} onChange={e => setOrdenacao(e.target.value as 'quantidade' | 'alfabetica')} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="quantidade">Ordenar por Quantidade (Último Período)</option>
            <option value="alfabetica">Ordenar Alfabeticamente</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
             <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">Modelo</th>
                  {periodosComparativos.map(p => <th key={p.mesAno} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{p.label}</th>)}
                  {/* O cabeçalho Total foi removido daqui */}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dadosFiltradosOrdenados.map((linha, index) => (
                  <motion.tr key={linha.linha} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.01 }} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white hover:bg-gray-50 z-10">{linha.linha}</td>
                    {periodosComparativos.map(p => <td key={p.mesAno} className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-800">{(linha.meses[p.mesAno]?.totalQuantidade || 0).toLocaleString()}</td>)}
                    {/* A célula do Total foi removida daqui */}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!loading && dadosFiltradosOrdenados.length === 0 && (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum dado encontrado</h3>
            <p className="text-gray-500">{periodosSelecionados.length === 0 ? 'Adicione um período para começar a análise.' : 'Não há vendas para os períodos selecionados.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default VendasComparativo7Digitos;