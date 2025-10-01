import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Search,
  Upload,
  Save,
  X,
  Image as ImageIcon,
  Download,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Camera,
  ArrowUp,
  ArrowDown,
  Clock,
  ZoomIn,
  CheckSquare,
  Square
} from 'lucide-react';
import { supabase, base64ParaUrl, isSupabaseAvailable } from '../lib/supabase';
import ImportadorFotos from '../components/ImportadorFotos';
import toast from 'react-hot-toast';

// --- DEFINIÇÃO DE TIPOS ---
interface Produto {
  id?: number;
  created_at?: string;
  linha: string;
  modelo: string;
  cor: string;
  codigo_cor: string;
  tamanho: string;
  sku_pai: string;
  sku_filho: string;
  foto?: string;
}

interface ProdutoAgrupado {
  sku_pai: string;
  linha: string;
  modelo: string;
  cor: string;
  codigo_cor: string;
  foto?: string;
  created_at?: string;
  tamanhos: Produto[];
}

interface SortConfig {
    key: keyof Pick<ProdutoAgrupado, 'modelo' | 'linha' | 'created_at'>;
    direction: 'ascending' | 'descending';
}

// --- CONSTANTES ---
const TAMANHOS_PREDEFINIDOS = ['34', '35', '36', '37', '38', '39', '40'];
const ITENS_POR_PAGINA = 30; // Número de produtos a carregar por vez

const Produtos: React.FC = () => {
  // --- ESTADOS DO COMPONENTE ---
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fotos, setFotos] = useState<Map<string, string>>(new Map());
  const [skusPaiDisponiveis, setSkusPaiDisponiveis] = useState<string[]>([]);
  
  // Estados de carregamento
  const [carregandoInicial, setCarregandoInicial] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [temMaisProdutos, setTemMaisProdutos] = useState(true);

  const [error, setError] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  
  // Estados da UI
  const [showModal, setShowModal] = useState(false);
  const [showImportador, setShowImportador] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Produto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'created_at', direction: 'descending' });
  
  // Estados para novas funcionalidades
  const [zoomedImage, setZoomedImage] = useState<{src: string, alt: string} | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());

  // Estado do formulário
  const [formData, setFormData] = useState<Produto>({
    linha: '', modelo: '', cor: '', codigo_cor: '', tamanho: '', sku_pai: '', sku_filho: '', foto: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Ref para o observer da rolagem infinita
  const observerRef = useRef<HTMLDivElement>(null);

  // --- FUNÇÃO DE CARREGAMENTO DE PRODUTOS COM PAGINAÇÃO ---
  const carregarProdutos = useCallback(async (novaBusca = false) => {
    if (carregandoMais || (!temMaisProdutos && !novaBusca)) return;

    setError('');
    if (novaBusca) {
      setCarregandoInicial(true);
    } else {
      setCarregandoMais(true);
    }

    const paginaParaBuscar = novaBusca ? 1 : paginaAtual;

    try {
      const de = (paginaParaBuscar - 1) * ITENS_POR_PAGINA;
      const ate = paginaParaBuscar * ITENS_POR_PAGINA - 1;

      let query = supabase.from('produtos').select(`
        id, created_at, linha, modelo, cor, codigo_cor, tamanho, sku_pai, sku_filho
      `);

      if (searchTerm) {
        query = query.or(`linha.ilike.%${searchTerm}%,modelo.ilike.%${searchTerm}%,cor.ilike.%${searchTerm}%,sku_pai.ilike.%${searchTerm}%`);
      }
      
      query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'ascending' }).range(de, ate);
      
      const { data: produtosData, error: produtosError } = await query;
      if (produtosError) throw produtosError;
      
      const novosProdutos = produtosData || [];
      if (novosProdutos.length < ITENS_POR_PAGINA) {
        setTemMaisProdutos(false);
      } else {
        setTemMaisProdutos(true);
      }

      const skusUnicos = Array.from(new Set(novosProdutos.map(p => p.sku_pai)));
      if (skusUnicos.length > 0) {
        const { data: fotosData } = await supabase.rpc('get_fotos_por_sku_pai', { skus: skusUnicos });
        if (fotosData) {
          const novasFotos = new Map<string, string>();
          (fotosData as { sku_pai: string; foto: string }[]).forEach(item => {
            novasFotos.set(item.sku_pai, item.foto);
          });
          setFotos(prev => new Map([...prev, ...novasFotos]));
        }
      }

      if (novaBusca) {
        setProdutos(novosProdutos);
      } else {
        setProdutos(prev => [...prev, ...novosProdutos]);
      }
      setPaginaAtual(paginaParaBuscar + 1);

    } catch (error: any) {
      setError(`Erro ao carregar produtos: ${error.message}`);
      toast.error('Erro ao carregar produtos.');
      console.error(error);
    } finally {
      setCarregandoInicial(false);
      setCarregandoMais(false);
    }
  }, [connectionStatus, searchTerm, sortConfig, paginaAtual, temMaisProdutos, carregandoMais]);
  
  // Efeito para a rolagem infinita
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && temMaisProdutos && !carregandoMais && !carregandoInicial) {
          carregarProdutos();
        }
      },
      { threshold: 1.0 }
    );

    const currentObserverRef = observerRef.current;
    if (currentObserverRef) {
      observer.observe(currentObserverRef);
    }

    return () => {
      if (currentObserverRef) {
        observer.unobserve(currentObserverRef);
      }
    };
  }, [temMaisProdutos, carregandoMais, carregandoInicial, carregarProdutos]);
  
  // Efeito para iniciar uma nova busca quando o termo ou a ordenação mudam
  useEffect(() => {
    setProdutos([]);
    setFotos(new Map());
    setPaginaAtual(1);
    setTemMaisProdutos(true);
    setSelectedGroups(new Set()); // Limpa seleção em nova busca
    const handler = setTimeout(() => {
        if (connectionStatus === 'connected') {
            carregarProdutos(true);
        }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm, sortConfig, connectionStatus]);

  const produtosAgrupadosOrdenados = useMemo(() => {
    const grupos: { [key: string]: ProdutoAgrupado } = {};
    produtos.forEach(produto => {
      const skuPai = produto.sku_pai;
      if (!grupos[skuPai]) {
        grupos[skuPai] = {
          sku_pai: produto.sku_pai,
          linha: produto.linha,
          modelo: produto.modelo,
          cor: produto.cor,
          codigo_cor: produto.codigo_cor,
          foto: fotos.get(skuPai),
          created_at: produto.created_at,
          tamanhos: []
        };
      }
      grupos[skuPai].tamanhos.push(produto);
    });
    
    Object.values(grupos).forEach(grupo => grupo.tamanhos.sort((a, b) => parseInt(a.tamanho) - parseInt(b.tamanho)));
    
    return Object.values(grupos);
  }, [produtos, fotos]);

  const fetchSkusPaiDisponiveis = async () => {
    try {
      const { data, error } = await supabase.from('produtos').select('sku_pai');
      if (error) throw error;
      const skusUnicos = Array.from(new Set(data?.map(p => p.sku_pai).filter(Boolean)));
      setSkusPaiDisponiveis(skusUnicos);
    } catch (error) { console.error('Erro ao carregar SKUs pai:', error); }
  };

  const checkConnection = useCallback(async () => {
    setConnectionStatus('checking');
    try {
      if (!isSupabaseAvailable()) throw new Error('Cliente Supabase não está disponível');
      const { error } = await supabase.from('produtos').select('id', { head: true, count: 'exact' });
      if (error) throw error;
      setConnectionStatus('connected');
    } catch (error: any) {
      setConnectionStatus('error');
      setError(error.message || 'Erro de conexão com o banco de dados');
      toast.error('Erro de conexão com o banco de dados.');
    }
  }, []);

  // --- EFEITOS (useEffect) ---
  useEffect(() => { checkConnection(); }, [checkConnection]);
  useEffect(() => { if (connectionStatus === 'connected') fetchSkusPaiDisponiveis() }, [connectionStatus]);
  useEffect(() => { if (formData.sku_pai && formData.tamanho) setFormData(prev => ({ ...prev, sku_filho: `${formData.sku_pai}-${formData.tamanho}` })); }, [formData.sku_pai, formData.tamanho]);

  // --- MANIPULADORES DE EVENTOS (HANDLERS) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (connectionStatus !== 'connected') { toast.error('Sem conexão com o banco de dados.'); return; }
    if (!formData.sku_pai || !formData.tamanho) { toast.error('SKU Pai e Tamanho são obrigatórios.'); return; }

    try {
      const { id, created_at, ...produtoData } = formData;
      let toastMessage = 'Produto salvo com sucesso!';

      if (editingProduct) {
        const { error } = await supabase.from('produtos').update(produtoData).eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const { data } = await supabase.from('produtos').select('id').eq('sku_filho', produtoData.sku_filho).single();
        if (data) {
          toast.error(`Já existe um produto com o SKU Filho: ${produtoData.sku_filho}`);
          return;
        }
        const { error } = await supabase.from('produtos').insert([produtoData]);
        if (error) throw error;
      }
      
      if (imageFile && produtoData.foto) {
        toast.loading('Atualizando foto para todo o grupo...');
        const { error: updateGroupError } = await supabase
          .from('produtos')
          .update({ foto: produtoData.foto })
          .eq('sku_pai', produtoData.sku_pai);
        
        toast.dismiss();

        if (updateGroupError) {
          console.error("Erro ao atualizar foto do grupo:", updateGroupError);
          toast.error('Produto salvo, mas falhou em atualizar a foto para o grupo.');
        } else {
          toastMessage = 'Produto salvo e foto atualizada para todo o grupo!';
        }
      }
      toast.success(toastMessage);
      handleCloseModal();
      carregarProdutos(true);
      fetchSkusPaiDisponiveis();
    } catch (error: any) {
      toast.dismiss();
      toast.error(`Erro ao salvar produto: ${error.message}`);
    }
  };

  const handleEdit = (produto: Produto) => {
    setEditingProduct(produto);
    setFormData(produto);
    const fotoDoGrupo = fotos.get(produto.sku_pai);
    if (fotoDoGrupo) {
        setImagePreview(base64ParaUrl(fotoDoGrupo));
    }
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    try {
      const { error } = await supabase.from('produtos').delete().eq('id', id);
      if (error) throw error;
      toast.success('Produto excluído com sucesso!');
      carregarProdutos(true);
    } catch (error: any) { toast.error(`Erro ao excluir produto: ${error.message}`); }
  };

  const handleDeleteGroup = async (skuPai: string) => {
    if (!confirm(`Tem certeza que deseja excluir todos os produtos do grupo ${skuPai}?`)) return;
    try {
      const { error } = await supabase.from('produtos').delete().eq('sku_pai', skuPai);
      if (error) throw error;
      toast.success('Grupo de produtos excluído com sucesso!');
      carregarProdutos(true);
      fetchSkusPaiDisponiveis();
    } catch (error: any) { toast.error(`Erro ao excluir grupo: ${error.message}`); }
  };
  
  const handleOpenNewModal = () => {
    setEditingProduct(null);
    setFormData({ linha: '', modelo: '', cor: '', codigo_cor: '', tamanho: '', sku_pai: '', sku_filho: '', foto: '' });
    setImageFile(null);
    setImagePreview('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({ linha: '', modelo: '', cor: '', codigo_cor: '', tamanho: '', sku_pai: '', sku_filho: '', foto: '' });
    setImageFile(null);
    setImagePreview('');
  };
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem muito grande. O máximo é 5MB.'); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (event) => setImagePreview(event.target?.result as string);
    reader.readAsDataURL(file);
    try {
      const base64 = await convertImageToBase64(file);
      setFormData(prev => ({ ...prev, foto: base64 }));
      toast.success('Imagem pronta para o upload.');
    } catch (error) { toast.error('Erro ao processar imagem.'); }
  };

  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => { const base64Data = (reader.result as string).split(',')[1]; resolve(base64Data); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  
  const handleSkuPaiChange = (skuPai: string) => {
    if (!editingProduct) {
        const produtoExistente = produtos.find(p => p.sku_pai === skuPai);
        if (produtoExistente) {
            setFormData({ ...formData, sku_pai: skuPai, linha: produtoExistente.linha, modelo: produtoExistente.modelo, cor: produtoExistente.cor, codigo_cor: produtoExistente.codigo_cor, foto: '' });
            const fotoExistente = fotos.get(skuPai);
            if (fotoExistente) setImagePreview(base64ParaUrl(fotoExistente));
        } else {
            setFormData(prev => ({ ...prev, sku_pai: skuPai, linha: '', modelo: '', cor: '', codigo_cor: '', foto: '' }));
            setImagePreview('');
        }
    } else {
        setFormData({ ...formData, sku_pai: skuPai });
    }
  };

  const toggleGroup = (skuPai: string) => {
    const newExpanded = new Set(expandedGroups);
    newExpanded.has(skuPai) ? newExpanded.delete(skuPai) : newExpanded.add(skuPai);
    setExpandedGroups(newExpanded);
  };
  
  const requestSort = (key: SortConfig['key']) => {
    let direction: SortConfig['direction'] = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    } else if (sortConfig.key === key && sortConfig.direction === 'descending') {
        direction = 'ascending'
    }
    setSortConfig({ key, direction });
  };

  const exportarProdutos = async () => {
    try {
      toast.loading('Exportando todos os produtos...');
      const { data: exportData, error } = await supabase.from('produtos').select('*').order('created_at', { ascending: false });
      toast.dismiss();
      if (error) throw error;
      const data = exportData || [];
      const headers = ['ID', 'Data Criação', 'Linha', 'Modelo', 'Cor', 'Código Cor', 'Tamanho', 'SKU Pai', 'SKU Filho'];
      const csvContent = [
          headers.join(','),
          ...data.map(p => [p.id, p.created_at, p.linha, p.modelo, p.cor, p.codigo_cor, p.tamanho, p.sku_pai, p.sku_filho].join(','))
      ].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `produtos_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Produtos exportados com sucesso!');
    } catch (error: any) {
        toast.dismiss();
        toast.error(`Erro ao exportar produtos: ${error.message}`);
    }
  };
  
  // --- MANIPULADORES PARA SELEÇÃO EM MASSA ---
  const handleToggleSelectGroup = (skuPai: string) => {
    const newSelection = new Set(selectedGroups);
    if (newSelection.has(skuPai)) {
      newSelection.delete(skuPai);
    } else {
      newSelection.add(skuPai);
    }
    setSelectedGroups(newSelection);
  };

  const handleToggleSelectAll = () => {
    if (selectedGroups.size === produtosAgrupadosOrdenados.length && produtosAgrupadosOrdenados.length > 0) {
      setSelectedGroups(new Set());
    } else {
      const allSkuPai = produtosAgrupadosOrdenados.map(g => g.sku_pai);
      setSelectedGroups(new Set(allSkuPai));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedGroups.size === 0) return;
    if (!confirm(`Tem certeza que deseja excluir os ${selectedGroups.size} grupos de produtos selecionados?`)) return;
    try {
      toast.loading('Excluindo grupos selecionados...');
      const { error } = await supabase.from('produtos').delete().in('sku_pai', Array.from(selectedGroups));
      toast.dismiss();
      if (error) throw error;
      toast.success('Grupos excluídos com sucesso!');
      carregarProdutos(true);
      setSelectedGroups(new Set());
    } catch (error: any) {
      toast.dismiss();
      toast.error(`Erro ao excluir grupos: ${error.message}`);
    }
  };

  // --- RENDERIZADOR DE IMAGEM COM ZOOM ---
  const renderImagemProduto = (foto: string | undefined, modelo: string, allowZoom = false) => {
    const placeholder = (
        <div className="aspect-square w-full bg-gray-200 rounded-lg flex items-center justify-center">
            <ImageIcon className="h-6 w-6 text-gray-400" />
        </div>
    );

    if (!foto) return placeholder;

    try {
        const imageUrl = base64ParaUrl(foto);
        const imageElement = <img src={imageUrl} alt={modelo} className="aspect-square w-full object-cover rounded-lg" />;
        
        if (allowZoom) {
            return (
                <button onClick={() => setZoomedImage({ src: imageUrl, alt: modelo })} className="relative block group w-full">
                    {imageElement}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center transition-opacity rounded-lg">
                        <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all" />
                    </div>
                </button>
            );
        }
        return imageElement;
    } catch (error) {
        return (
            <div className="aspect-square w-full bg-red-100 rounded-lg flex items-center justify-center" title="Erro na imagem">
                <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
        );
    }
  };
  
  if (connectionStatus === 'checking') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-lg text-gray-600">Verificando conexão...</span>
      </div>
    );
  }

  if (showImportador) {
    return <ImportadorFotos onClose={() => setShowImportador(false)} />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {connectionStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
            <div>
              <h3 className="text-sm font-bold text-red-800">Erro de Conexão</h3>
              <p className="text-sm text-red-700 mt-1">Não foi possível conectar ao banco de dados.</p>
              {error && (<p className="text-xs text-red-600 mt-1">Detalhes: {error}</p>)}
            </div>
            <button
              onClick={checkConnection}
              className="ml-auto flex items-center px-3 py-1.5 bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors text-sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </button>
          </div>
        </div>
      )}

      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Catálogo de Produtos</h1>
          <p className="text-gray-600 mt-1">Gerencie e organize todos os seus produtos em um só lugar.</p>
        </div>
        {/* --- [MODIFICADO] BOTÕES COM LAYOUT RESPONSIVO --- */}
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button onClick={() => setShowImportador(true)} className="inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50" disabled={connectionStatus !== 'connected'}>
            <Camera className="h-5 w-5 mr-2" /> Importar Fotos
          </button>
          <button onClick={exportarProdutos} className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50" disabled={connectionStatus !== 'connected'}>
            <Download className="h-5 w-5 mr-2" /> Exportar
          </button>
          <button onClick={handleOpenNewModal} className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50" disabled={connectionStatus !== 'connected'}>
            <Plus className="h-5 w-5 mr-2" /> Novo Produto
          </button>
        </div>
      </header>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                    type="text"
                    placeholder="Buscar por linha, modelo, cor ou SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-600">Ordenar por:</span>
                <select 
                    value={sortConfig.key} 
                    onChange={(e) => setSortConfig({ ...sortConfig, key: e.target.value as SortConfig['key'] })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                    <option value="created_at">Mais Recentes</option>
                    <option value="modelo">Modelo</option>
                    <option value="linha">Linha</option>
                </select>
                <button onClick={() => requestSort(sortConfig.key)} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                    {sortConfig.direction === 'ascending' ? <ArrowUp className="h-5 w-5 text-gray-700"/> : <ArrowDown className="h-5 w-5 text-gray-700"/>}
                </button>
            </div>
        </div>
    </div>
      
      {/* BARRA DE AÇÕES EM MASSA */}
      {selectedGroups.size > 0 && (
        <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-4 z-40"
        >
          <div className="flex items-center">
            <CheckSquare className="h-6 w-6 text-blue-600 mr-3" />
            <p className="font-semibold text-blue-800">{selectedGroups.size} grupo(s) selecionado(s)</p>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={handleBulkDelete}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Excluir Selecionados
            </button>
            <button onClick={() => setSelectedGroups(new Set())} title="Limpar seleção">
                <X className="h-6 w-6 text-gray-500 hover:text-gray-800" />
            </button>
          </div>
        </motion.div>
      )}

      <main className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {carregandoInicial ? (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-4 text-lg text-gray-600">Carregando produtos...</span>
            </div>
        ) : (
        <>
            {/* VISUALIZAÇÃO EM TABELA PARA DESKTOP */}
            <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="p-4 w-12">
                        <button onClick={handleToggleSelectAll} title={selectedGroups.size > 0 ? "Desselecionar Todos" : "Selecionar Todos"}>
                            {selectedGroups.size === produtosAgrupadosOrdenados.length && produtosAgrupadosOrdenados.length > 0
                                ? <CheckSquare className="h-5 w-5 text-blue-600" />
                                : <Square className="h-5 w-5 text-gray-400" />
                            }
                        </button>
                      </th>
                      <th className="p-4 font-semibold text-gray-600 w-12"></th>
                      <th className="p-4 font-semibold text-gray-600" style={{width: 140}}>Foto</th>
                      <th className="p-4 font-semibold text-gray-600">Linha/Modelo</th>
                      <th className="p-4 font-semibold text-gray-600">Cor</th>
                      <th className="p-4 font-semibold text-gray-600">SKU Pai</th>
                      <th className="p-4 font-semibold text-gray-600">Tamanhos</th>
                      <th className="p-4 font-semibold text-gray-600">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {produtosAgrupadosOrdenados.map((grupo) => (
                      <React.Fragment key={grupo.sku_pai}>
                        <tr className={`hover:bg-gray-50 ${selectedGroups.has(grupo.sku_pai) ? 'bg-blue-50' : ''}`}>
                          <td className="p-4">
                            <button onClick={() => handleToggleSelectGroup(grupo.sku_pai)}>
                                {selectedGroups.has(grupo.sku_pai) 
                                    ? <CheckSquare className="h-5 w-5 text-blue-600" /> 
                                    : <Square className="h-5 w-5 text-gray-400" />
                                }
                            </button>
                          </td>
                          <td className="p-4"><div className="flex justify-center cursor-pointer" onClick={() => toggleGroup(grupo.sku_pai)}>{expandedGroups.has(grupo.sku_pai) ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}</div></td>
                          <td className="p-4 w-36">{renderImagemProduto(grupo.foto, grupo.modelo, true)}</td>
                          <td className="p-4"><div className="font-medium text-gray-900">{grupo.linha}</div><div className="text-gray-600">{grupo.modelo}</div></td>
                          <td className="p-4"><div className="text-gray-800">{grupo.cor}</div><div className="text-gray-600 text-xs">({grupo.codigo_cor})</div></td>
                          <td className="p-4 font-mono text-gray-800">{grupo.sku_pai}</td>
                          <td className="p-4"><div className="flex flex-wrap gap-1.5">{grupo.tamanhos.map(p => (<span key={p.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{p.tamanho}</span>))}</div></td>
                          <td className="p-4"><div className="flex space-x-3"><button onClick={(e) => { e.stopPropagation(); handleDeleteGroup(grupo.sku_pai); }} className="text-red-600 hover:text-red-800" title="Excluir grupo" disabled={connectionStatus !== 'connected'}><Trash2 className="h-5 w-5" /></button></div></td>
                        </tr>
                        {expandedGroups.has(grupo.sku_pai) && (
                           <tr className="bg-gray-50">
                               <td colSpan={9} className="p-0">
                                   <div className="p-4">
                                       {grupo.tamanhos.map((produto) => (
                                           <div key={produto.id} className="grid grid-cols-12 gap-4 items-center py-2 px-3 hover:bg-gray-100 rounded-lg">
                                               <div className="col-span-3 text-gray-600"><strong>SKU Filho:</strong> <span className="font-mono">{produto.sku_filho}</span></div>
                                               <div className="col-span-2 text-gray-600"><strong>Tamanho:</strong> {produto.tamanho}</div>
                                               <div className="col-span-3 text-gray-600"><strong>Criado em:</strong> {new Date(produto.created_at || '').toLocaleDateString('pt-BR')}</div>
                                               <div className="col-span-2 text-gray-600"><strong>ID:</strong> {produto.id}</div>
                                               <div className="col-span-2 flex justify-end space-x-4">
                                                   <button onClick={() => handleEdit(produto)} className="text-blue-600 hover:text-blue-800" title="Editar produto" disabled={connectionStatus !== 'connected'}><Edit className="h-5 w-5" /></button>
                                                   <button onClick={() => handleDelete(produto.id!)} className="text-red-600 hover:text-red-800" title="Excluir produto" disabled={connectionStatus !== 'connected'}><Trash2 className="h-5 w-5" /></button>
                                               </div>
                                           </div>
                                       ))}
                                   </div>
                               </td>
                           </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
            </div>

            {/* VISUALIZAÇÃO EM GRADE PARA MOBILE */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 md:hidden">
                {produtosAgrupadosOrdenados.map(grupo => (
                    <div key={grupo.sku_pai} className={`border rounded-xl overflow-hidden shadow-sm flex flex-col ${selectedGroups.has(grupo.sku_pai) ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200'}`}>
                        <div className="relative">
                            {renderImagemProduto(grupo.foto, grupo.modelo, true)}
                            <button onClick={() => handleToggleSelectGroup(grupo.sku_pai)} className="absolute top-2 left-2 bg-white/70 backdrop-blur-sm p-1 rounded-full z-10">
                                {selectedGroups.has(grupo.sku_pai) 
                                    ? <CheckSquare className="h-5 w-5 text-blue-600" /> 
                                    : <Square className="h-5 w-5 text-gray-500" />
                                }
                            </button>
                        </div>
                        <div className="p-3 flex-grow flex flex-col">
                            <p className="font-semibold text-gray-800 text-sm truncate">{grupo.modelo}</p>
                            <p className="text-xs text-gray-500 truncate">{grupo.cor}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                               {grupo.tamanhos.map(p => (
                                    <span key={p.id} className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">{p.tamanho}</span>
                               ))}
                            </div>
                        </div>
                        <div className="p-2 border-t flex items-center justify-between">
                             <button onClick={() => handleDeleteGroup(grupo.sku_pai)} className="text-red-600 p-1.5 rounded-md hover:bg-red-50" title="Excluir grupo">
                                <Trash2 className="h-4 w-4" />
                             </button>
                             <button onClick={() => toggleGroup(grupo.sku_pai)} className="text-gray-600 p-1.5 rounded-md hover:bg-gray-100 flex items-center text-xs">
                                Detalhes {expandedGroups.has(grupo.sku_pai) ? <ChevronDown className="h-4 w-4 ml-1" /> : <ChevronRight className="h-4 w-4 ml-1" />}
                             </button>
                        </div>
                        {expandedGroups.has(grupo.sku_pai) && (
                            <div className="p-3 bg-gray-50 text-xs space-y-2">
                                {grupo.tamanhos.map(produto => (
                                    <div key={produto.id} className="flex justify-between items-center">
                                        <span className="font-mono text-gray-700">{produto.sku_filho}</span>
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => handleEdit(produto)} className="text-blue-600"><Edit className="h-4 w-4" /></button>
                                            <button onClick={() => handleDelete(produto.id!)} className="text-red-600"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            <div ref={observerRef} className="h-10 flex justify-center items-center">
              {carregandoMais && (
                <div className="flex items-center space-x-2 text-gray-600">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span>Carregando mais...</span>
                </div>
              )}
              {!temMaisProdutos && produtos.length > 0 && (
                <div className="text-gray-500">Fim da lista.</div>
              )}
            </div>

            {produtos.length === 0 && (
              <div className="text-center py-20">
                <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">Nenhum produto encontrado</h3>
                <p className="text-gray-500">
                    {searchTerm ? `Tente ajustar sua busca ou ` : 'Clique em "Novo Produto" para começar. '}
                    {searchTerm && <button className="text-blue-600 hover:underline" onClick={() => setSearchTerm('')}>limpar a busca</button>}
                </p>
              </div>
            )}
        </>
        )}
      </main>

      {/* MODAL PARA AMPLIAR A IMAGEM */}
      {zoomedImage && (
        <div 
          onClick={() => setZoomedImage(null)} 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={(e) => e.stopPropagation()}
            className="relative"
          >
            <img src={zoomedImage.src} alt={zoomedImage.alt} className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg" />
            <p className="text-white text-center mt-2 bg-black/50 p-2 rounded-b-lg">{zoomedImage.alt}</p>
            <button onClick={() => setZoomedImage(null)} className="absolute -top-3 -right-3 bg-white rounded-full p-1.5 text-gray-800 shadow-lg hover:scale-110 transition-transform">
                <X className="h-6 w-6" />
            </button>
          </motion.div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO/EDIÇÃO */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU Pai *</label>
                <input 
                    type="text" 
                    list="skus-pai-list"
                    placeholder="Selecione ou digite um novo SKU Pai" 
                    required 
                    value={formData.sku_pai} 
                    onChange={(e) => handleSkuPaiChange(e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <datalist id="skus-pai-list">{skusPaiDisponiveis.map(sku => (<option key={sku} value={sku} />))}</datalist>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Linha *</label><input type="text" required value={formData.linha} onChange={(e) => setFormData({ ...formData, linha: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Ex: 203" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Modelo *</label><input type="text" required value={formData.modelo} onChange={(e) => setFormData({ ...formData, modelo: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Ex: 203.025" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Cor *</label><input type="text" required value={formData.cor} onChange={(e) => setFormData({ ...formData, cor: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Ex: PRETO" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Código Cor *</label><input type="text" required value={formData.codigo_cor} onChange={(e) => setFormData({ ...formData, codigo_cor: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Ex: 011" /></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tamanho *</label>
                  <select required value={formData.tamanho} onChange={(e) => setFormData({ ...formData, tamanho: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" disabled={!!editingProduct}>
                    <option value="">Selecione o tamanho</option>
                    {TAMANHOS_PREDEFINIDOS.map(tamanho => (<option key={tamanho} value={tamanho}>{tamanho}</option>))}
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">SKU Filho</label><input type="text" value={formData.sku_filho} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" /></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Foto do Produto</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                  <div className="space-y-1 text-center">
                    {imagePreview ? (<img src={imagePreview} alt="Preview" className="mx-auto h-32 w-32 object-cover rounded-lg mb-4" />) : (<ImageIcon className="mx-auto h-12 w-12 text-gray-400" />)}
                    <div className="flex text-sm text-gray-600"><label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500"><span>Fazer upload de uma imagem</span><input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} /></label><p className="pl-1">ou arraste e solte</p></div>
                    <p className="text-xs text-gray-500">PNG, JPG, WEBP até 5MB</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-6">
                <button type="button" onClick={handleCloseModal} className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center disabled:opacity-50" disabled={connectionStatus !== 'connected' || !formData.sku_pai}><Save className="h-5 w-5 mr-2" />{editingProduct ? 'Atualizar' : 'Salvar'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Produtos;