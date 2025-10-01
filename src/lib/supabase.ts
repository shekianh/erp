
import { createClient } from '@supabase/supabase-js'

// === CONFIGURAÇÃO E INICIALIZAÇÃO DO SUPABASE ===

const supabaseUrl = 'https://supabase.ia.shekinahcalcados.com.br'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE'

let supabaseClient: any = null

try {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Configuração Supabase inválida - URL ou ANON_KEY não definidos')
  } else {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    })
    console.log('✅ Cliente Supabase inicializado com sucesso')
  }
} catch (error) {
  console.error('❌ Erro crítico ao inicializar cliente Supabase:', error)
}

// Export do cliente com um objeto de fallback para evitar erros na aplicação
export const supabase = supabaseClient || {
  from: () => ({
    select: () => Promise.resolve({ data: [], error: new Error('Cliente Supabase não disponível') }),
    insert: () => Promise.resolve({ data: null, error: new Error('Cliente Supabase não disponível') }),
    update: () => Promise.resolve({ data: null, error: new Error('Cliente Supabase não disponível') }),
    delete: () => Promise.resolve({ error: new Error('Cliente Supabase não disponível') }),
    upsert: () => Promise.resolve({ data: null, error: new Error('Cliente Supabase não disponível') })
  })
}

// === DEFINIÇÕES DE TIPOS (INTERFACES) ===

export interface PedidoVendas {
  id_key: number
  id_bling: string
  numero: string
  numeroloja: string
  data: string
  datasaida?: string
  total: number
  contato_id: string
  contato_nome: string
  contato_documento: string
  sitacao_bling: number
  loja: string
  notafiscal?: string
  itens_json: string
  etiqueta_endereco?: string
  etiqueta_nome?: string
  etiqueta_numero?: string
  etiqueta_complemento?: string
  etiqueta_municipio?: string
  etiqueta_uf?: string
  etiqueta_cep?: string
  codigorastreamento?: string
  situacao_erp?: string
  situacao_etiqueta?: string
  situacao_nf?: string
  situacao_etq_impressa?: string
  json_pedido: string
  created_at?: string
  updated_at?: string
}

export interface ItemPedidoVendas {
  item_id: string
  id_bling: string
  numero_loja: string
  numero: string
  loja: string
  data: string
  situacao_bling: string
  item_codigo: string
  item_descricao: string
  item_quantidade: number
  item_valor: number
  created_at?: string
  updated_at?: string
}

export interface NotaFiscal {
  id_key: number
  id_nf: string
  numero_pedido_loja: string
  serie: number
  tipo: number
  situacao: number
  valor_nota: number
  data_emissao: string
  data_operacao: string
  chave_acesso: string
  xml_url: string
  link_danfe: string
  link_pdf: string
  contato_id: string
  contato_nome: string
  contato_documento: string
  loja_id: string
  endereco_json: string
  created_at?: string
  updated_at?: string
}

export interface Produto {
  id?: number
  created_at?: string
  linha: string
  modelo: string
  cor: string
  codigo_cor: string
  tamanho: string
  sku_pai: string
  sku_filho: string
  foto?: string
}

export interface EstoqueGeral {
  id?: number
  sku: string
  quantidade: number
  updated_at?: string
}

export interface EstoquePronto {
  id?: number
  sku: string
  quantidade: number
  updated_at?: string
}

// === CONSTANTES E MAPEAMENTOS ===

export const LOJA_MAPEAMENTO: Record<string, string> = {
  '203614110': 'Dafiti',
  '204978475': 'Mercado Livre Oficial',
  '203944379': 'Shopee',
  '204460459': 'Shein',
  '205409614': 'Tik Tok Shop',
}

// === FUNÇÕES UTILITÁRIAS ===

export const obterNomeLoja = (codigoLoja: string): string => {
  return LOJA_MAPEAMENTO[codigoLoja] || `Loja (${codigoLoja})`
}

export const getSituacaoPedidoText = (situacao: number): string => {
  const situacoes: { [key: number]: string } = { 6: 'Aberto', 9: 'Atendido', 12: 'Cancelado' }
  return situacoes[situacao] || `Situação ${situacao}`
}

export const getSituacaoPedidoColor = (situacao: number): string => {
  switch (situacao) {
    case 6: return 'bg-yellow-100 text-yellow-800'
    case 9: return 'bg-green-100 text-green-800'
    case 12: return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export const getSituacaoNotaFiscalText = (situacao: number): string => {
  const situacoes: { [key: number]: string } = { 1: 'Pendente', 2: 'Cancelada', 5: 'Autorizada', 6: 'Emitida DANFE' }
  return situacoes[situacao] || `Situação ${situacao}`
}

export const getSituacaoNotaFiscalColor = (situacao: number): string => {
  switch (situacao) {
    case 1: return 'bg-yellow-100 text-yellow-800'
    case 2: case 4: case 9: case 11: return 'bg-red-100 text-red-800'
    case 5: case 6: case 7: return 'bg-green-100 text-green-800'
    default: return 'bg-blue-100 text-blue-800'
  }
}

export const parseJson = (jsonString: string, defaultValue: any = null): any => {
  try {
    return JSON.parse(jsonString) || defaultValue
  } catch {
    return defaultValue
  }
}
export const parseItensJson = (json: string): any[] => parseJson(json, [])
export const parseEnderecoJson = (json: string): any => parseJson(json, {})
export const parsePedidoJson = (json: string): any => parseJson(json, {})

export const base64ParaUrl = (base64String?: string): string => {
  if (!base64String) return ''
  if (base64String.startsWith('data:image')) return base64String
  return `data:image/jpeg;base64,${base64String}`
}

// === CAMADA DE CACHE ===

interface CacheItem {
  data: any
  expiry: number
}

class DataCache {
  private cache = new Map<string, CacheItem>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutos

  set(key: string, data: any, ttl = this.DEFAULT_TTL) {
    this.cache.set(key, { data, expiry: Date.now() + ttl })
  }

  get(key: string): any | null {
    const item = this.cache.get(key)
    if (!item || Date.now() > item.expiry) {
      this.cache.delete(key)
      return null
    }
    return item.data
  }

  clear() { this.cache.clear() }
  invalidatePattern(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) this.cache.delete(key)
    }
  }
}
export const dataCache = new DataCache()

// === FUNÇÕES DE ACESSO A DADOS (Otimizadas com Cache) ===

// --- VENDAS ---
export const buscarPedidosOtimizado = async (dataInicio: string, dataFim: string, page = 1, limit = 100): Promise<{ data: PedidoVendas[], count: number }> => {
  const cacheKey = `pedidos_${dataInicio}_${dataFim}_${page}_${limit}`
  const cachedData = dataCache.get(cacheKey)
  if (cachedData) return cachedData

  const offset = (page - 1) * limit
  const { data, error, count } = await supabase
    .from('pedido_vendas')
    .select('*', { count: 'exact' })
    .gte('data', dataInicio)
    .lte('data', dataFim + 'T23:59:59')
    .order('id_key', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Erro na consulta de pedidos:', error)
    return { data: [], count: 0 }
  }
  const result = { data: data || [], count: count || 0 }
  dataCache.set(cacheKey, result, 2 * 60 * 1000) // Cache de 2 minutos
  return result
}

export const buscarTodosPedidosPeriodo = async (dataInicio: string, dataFim: string): Promise<PedidoVendas[]> => {
  const cacheKey = `todos_pedidos_${dataInicio}_${dataFim}`
  const cachedData = dataCache.get(cacheKey)
  if (cachedData) return cachedData

  const { data, error } = await supabase
    .from('pedido_vendas')
    .select('total') // Otimizado para buscar apenas o total
    .gte('data', dataInicio)
    .lte('data', dataFim + 'T23:59:59')

  if (error) {
    console.error('Erro ao buscar todos os pedidos do período:', error)
    return []
  }
  const result = data || []
  dataCache.set(cacheKey, result, 5 * 60 * 1000) // Cache de 5 minutos
  return result
}

export const buscarNotasFiscaisOtimizado = async (dataInicio: string, dataFim: string): Promise<NotaFiscal[]> => {
  const cacheKey = `notas_${dataInicio}_${dataFim}`
  const cachedData = dataCache.get(cacheKey)
  if (cachedData) return cachedData

  const { data, error } = await supabase
    .from('nota_fiscal')
    .select('*')
    .gte('data_emissao', dataInicio)
    .lte('data_emissao', dataFim + 'T23:59:59')

  if (error) {
    console.error('Erro ao buscar notas fiscais:', error)
    return []
  }
  const result = data || []
  dataCache.set(cacheKey, result, 3 * 60 * 1000) // Cache de 3 minutos
  return result
}

export const buscarItensPedidosOtimizado = async (dataInicio: string, dataFim: string): Promise<ItemPedidoVendas[]> => {
  const cacheKey = `itens_${dataInicio}_${dataFim}`
  const cachedData = dataCache.get(cacheKey)
  if (cachedData) return cachedData

  const { data, error } = await supabase
    .from('item_pedido_vendas')
    .select('*')
    .gte('data', dataInicio)
    .lte('data', dataFim + 'T23:59:59')

  if (error) {
    console.error('Erro ao buscar itens de pedidos:', error)
    return []
  }
  const result = data || []
  dataCache.set(cacheKey, result, 3 * 60 * 1000) // Cache de 3 minutos
  return result
}

// Função específica para buscar itens de pedidos por período (necessária para VendasRelatorioGeral)
export const buscarItensPedidosPorPeriodo = async (dataInicio: string, dataFim: string): Promise<ItemPedidoVendas[]> => {
  const cacheKey = `itens_pedidos_periodo_${dataInicio}_${dataFim}`
  const cachedData = dataCache.get(cacheKey)
  if (cachedData) return cachedData

  const { data, error } = await supabase
    .from('item_pedido_vendas')
    .select('*')
    .gte('data', dataInicio)
    .lte('data', dataFim + 'T23:59:59')

  if (error) {
    console.error('Erro ao buscar itens de pedidos por período:', error)
    return []
  }
  const result = data || []
  dataCache.set(cacheKey, result, 3 * 60 * 1000) // Cache de 3 minutos
  return result
}

// *** FUNÇÃO ADICIONADA PARA CORRIGIR ERRO DE BUILD ***
export const buscarTodosItensPeriodo = async (dataInicio: string, dataFim: string): Promise<ItemPedidoVendas[]> => {
  return await buscarItensPedidosPorPeriodo(dataInicio, dataFim)
}

// Função para buscar foto do produto por SKU pai
export const buscarFotoProdutoPorSkuPai = async (skuPai: string): Promise<string | null> => {
  const cacheKey = `foto_produto_${skuPai}`
  const cachedData = dataCache.get(cacheKey)
  if (cachedData) return cachedData

  const { data, error } = await supabase
    .from('produtos')
    .select('foto')
    .eq('sku_pai', skuPai)
    .limit(1)

  if (error) {
    console.error('Erro ao buscar foto do produto:', error)
    return null
  }
  
  const foto = data && data.length > 0 ? data[0].foto : null
  dataCache.set(cacheKey, foto, 30 * 60 * 1000) // Cache de 30 minutos
  return foto
}

// --- PRODUTOS ---
export const buscarTodosProdutos = async (): Promise<Produto[]> => {
  const cacheKey = 'produtos_all_com_foto'
  const cachedData = dataCache.get(cacheKey)
  if (cachedData) return cachedData

  const { data, error } = await supabase
    .from('produtos')
    .select('sku_filho, foto') // Otimizado para buscar apenas o necessário para a tela de vendas

  if (error) {
    console.error('Erro ao buscar produtos:', error)
    return []
  }
  const result = data || []
  dataCache.set(cacheKey, result, 60 * 60 * 1000) // Cache longo de 1 hora
  return result
}

// --- ESTOQUE ---
export const buscarEstoqueGeral = async (): Promise<EstoqueGeral[]> => {
  const cacheKey = 'estoque_geral_all'
  const cachedData = dataCache.get(cacheKey)
  if (cachedData) return cachedData

  const { data, error } = await supabase.from('estoque_geral').select('sku, quantidade')
  if (error) {
    console.error('Erro ao buscar estoque geral:', error)
    return []
  }
  const result = data || []
  dataCache.set(cacheKey, result, 15 * 60 * 1000) // Cache de 15 minutos
  return result
}

export const buscarEstoquePronto = async (): Promise<EstoquePronto[]> => {
  const cacheKey = 'estoque_pronto_all'
  const cachedData = dataCache.get(cacheKey)
  if (cachedData) return cachedData

  const { data, error } = await supabase.from('estoque_pronto').select('sku, quantidade')
  if (error) {
    console.error('Erro ao buscar estoque pronto:', error)
    return []
  }
  const result = data || []
  dataCache.set(cacheKey, result, 15 * 60 * 1000) // Cache de 15 minutos
  return result
}

// === FUNÇÕES DE MUTAÇÃO E GERENCIAMENTO ===

export const invalidarCacheEstoque = () => {
  dataCache.invalidatePattern('estoque')
  console.log('🔄 Cache de estoque invalidado')
}

export const importarEstoqueXLS = async (dados: any[], tipoEstoque: 'geral' | 'pronto'): Promise<boolean> => {
  const tabela = tipoEstoque === 'geral' ? 'estoque_geral' : 'estoque_pronto'
  const dadosFormatados = dados.map(item => ({
    sku: item.sku || item.codigo,
    quantidade: Number(item.quantidade) || 0,
    updated_at: new Date().toISOString()
  }))

  const { error } = await supabase.from(tabela).upsert(dadosFormatados, { onConflict: 'sku' })

  if (error) {
    console.error(`Erro ao importar para ${tabela}:`, error)
    return false
  }

  invalidarCacheEstoque()
  return true
}

// === FUNÇÕES DE DIAGNÓSTICO ===

export const isSupabaseAvailable = (): boolean => {
  return supabaseClient !== null
}

export const testarConexaoSupabase = async (): Promise<{ success: boolean; message: string }> => {
  if (!isSupabaseAvailable()) {
    return { success: false, message: 'Cliente Supabase não inicializado.' }
  }
  try {
    const { error } = await supabase.from('produtos').select('id').limit(1)
    if (error) throw error
    return { success: true, message: 'Conexão com Supabase bem-sucedida!' }
  } catch (error: any) {
    return { success: false, message: `Falha na conexão: ${error.message}` }
  }
}


// --- Tipos e Interfaces para o Pré-Pedido ---
// Estes tipos garantem consistência entre o frontend e o backend.

interface DetalhesGrade {
  vendas: number;
  estoque: number;
  diferenca: number;
  producao: number;
}

interface DetalhesProdutoSalvo {
  linha: string;
  modelo: string;
  grade: { [tamanho: string]: DetalhesGrade };
}

// A estrutura completa do objeto que será salvo no banco de dados
export interface PrePedidoSalvoBD {
  chave: string;
  nome: string;
  fornecedor: string;
  data_inicio: string;
  data_fim: string;
  filtros: any;
  detalhes_produtos: { [codigo: string]: DetalhesProdutoSalvo };
  data_criacao?: string; // Opcional, pois o banco de dados gerencia
  data_modificacao?: string; // Opcional, pois o banco de dados gerencia
}

// --- Funções CRUD para a tabela 'pre_pedido' ---

/**
 * Salva (insere um novo) ou atualiza (se a chave já existir) um pré-pedido.
 * @param prePedidoData O objeto completo do pré-pedido a ser salvo.
 */
export const salvarPrePedidoSupabase = async (prePedidoData: PrePedidoSalvoBD) => {
  const { data, error } = await supabase
    .from('pre_pedido')
    .upsert(prePedidoData, { onConflict: 'chave' }) // 'onConflict' usa a coluna UNIQUE 'chave' para decidir entre INSERT e UPDATE
    .select()
    .single();

  if (error) {
    console.error('Supabase Error - salvarPrePedidoSupabase:', error);
    throw new Error('Falha ao salvar os dados do pré-pedido no banco de dados.');
  }
  return data;
};

/**
 * Retorna uma lista resumida de todos os pré-pedidos salvos, ordenados pelo mais recente.
 */
export const listarPrePedidosSalvosSupabase = async () => {
  const { data, error } = await supabase
    .from('pre_pedido')
    .select('chave, nome, fornecedor, data_modificacao')
    .order('data_modificacao', { ascending: false });

  if (error) {
    console.error('Supabase Error - listarPrePedidosSalvosSupabase:', error);
    throw new Error('Falha ao carregar a lista de pré-pedidos salvos.');
  }
  return data;
};

/**
 * Busca e retorna todos os dados de um pré-pedido específico pela sua chave.
 * @param chave A chave única do pré-pedido a ser buscado.
 */
export const buscarPrePedidoPorChaveSupabase = async (chave: string): Promise<PrePedidoSalvoBD> => {
  const { data, error } = await supabase
    .from('pre_pedido')
    .select('*')
    .eq('chave', chave)
    .single();

  if (error || !data) {
    console.error(`Supabase Error - buscarPrePedidoPorChaveSupabase (chave: ${chave}):`, error);
    throw new Error('Pré-pedido não encontrado ou falha na busca.');
  }
  return data;
};

/**
 * Exclui um pré-pedido do banco de dados com base na sua chave.
 * @param chave A chave única do pré-pedido a ser excluído.
 */
export const excluirPrePedidoSupabase = async (chave: string) => {
  const { error } = await supabase
    .from('pre_pedido')
    .delete()
    .eq('chave', chave);

  if (error) {
    console.error(`Supabase Error - excluirPrePedidoSupabase (chave: ${chave}):`, error);
    throw new Error('Falha ao excluir o pré-pedido.');
  }
  return true;
};