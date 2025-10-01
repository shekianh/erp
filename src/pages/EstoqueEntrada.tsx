
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {Package, Plus, Search, Save, AlertCircle, CheckCircle, Factory, Warehouse, Barcode, RotateCcw} from 'lucide-react'
import { supabase, buscarTodosProdutos } from '../lib/supabase'
import toast from 'react-hot-toast'

interface Produto {
  id?: number
  linha: string
  modelo: string
  cor: string
  codigo_cor: string
  tamanho: string
  sku_pai: string
  sku_filho: string
  foto?: string
}

interface EntradaItem {
  sku: string
  quantidade: number
  tipo: 'producao' | 'lote'
  observacao?: string
}

const EstoqueEntrada: React.FC = () => {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSku, setSelectedSku] = useState('')
  const [tipoEntrada, setTipoEntrada] = useState<'producao' | 'lote'>('producao')
  const [observacao, setObservacao] = useState('')
  const [entradas, setEntradas] = useState<EntradaItem[]>([])
  const [processando, setProcessando] = useState(false)

  useEffect(() => {
    fetchProdutos()
  }, [])

  const fetchProdutos = async () => {
    try {
      setLoading(true)
      console.log('🔄 Carregando produtos disponíveis...')
      
      const produtosData = await buscarTodosProdutos()
      console.log('📦 Produtos carregados:', produtosData.length)
      
      setProdutos(produtosData)
      
      if (produtosData.length === 0) {
        toast.error('Nenhum produto encontrado na base de dados')
      } else {
        toast.success(`${produtosData.length} produtos carregados`)
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar produtos:', error)
      toast.error('Erro ao carregar lista de produtos')
    } finally {
      setLoading(false)
    }
  }

  // Filtrar produtos baseado na busca
  const produtosFiltrados = produtos.filter(produto =>
    produto.sku_filho.toLowerCase().includes(searchTerm.toLowerCase()) ||
    produto.sku_pai.toLowerCase().includes(searchTerm.toLowerCase()) ||
    produto.linha.toLowerCase().includes(searchTerm.toLowerCase()) ||
    produto.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    produto.cor.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const adicionarEntrada = () => {
    if (!selectedSku) {
      toast.error('Selecione um SKU para adicionar')
      return
    }

    const quantidade = tipoEntrada === 'producao' ? 1 : 12
    
    // Verificar se SKU já está na lista
    const existeIndex = entradas.findIndex(item => item.sku === selectedSku)
    
    if (existeIndex >= 0) {
      // Atualizar quantidade existente
      const novasEntradas = [...entradas]
      novasEntradas[existeIndex].quantidade += quantidade
      setEntradas(novasEntradas)
      toast.success(`Quantidade atualizada: +${quantidade} unidades`)
    } else {
      // Adicionar nova entrada
      const novaEntrada: EntradaItem = {
        sku: selectedSku,
        quantidade,
        tipo: tipoEntrada,
        observacao: observacao || undefined
      }
      
      setEntradas([...entradas, novaEntrada])
      toast.success(`Entrada adicionada: ${selectedSku} (+${quantidade})`)
    }

    // Limpar seleção
    setSelectedSku('')
    setObservacao('')
  }

  const removerEntrada = (index: number) => {
    const novasEntradas = entradas.filter((_, i) => i !== index)
    setEntradas(novasEntradas)
    toast.success('Entrada removida')
  }

  const processarEntradas = async () => {
    if (entradas.length === 0) {
      toast.error('Adicione pelo menos uma entrada para processar')
      return
    }

    try {
      setProcessando(true)
      console.log('🔄 Processando entradas no estoque:', entradas.length, 'itens')

      // Preparar dados para upsert
      const dadosParaUpsert = entradas.map(entrada => ({
        sku: entrada.sku,
        quantidade: entrada.quantidade,
        updated_at: new Date().toISOString()
      }))

      // Buscar quantidades atuais
      const { data: estoqueAtual, error: erroConsulta } = await supabase
        .from('estoque_pronto')
        .select('sku, quantidade')
        .in('sku', entradas.map(e => e.sku))

      if (erroConsulta) {
        console.error('❌ Erro ao consultar estoque atual:', erroConsulta)
        throw erroConsulta
      }

      // Calcular novas quantidades
      const dadosFinais = dadosParaUpsert.map(item => {
        const estoqueExistente = estoqueAtual?.find(e => e.sku === item.sku)
        const quantidadeAtual = estoqueExistente?.quantidade || 0
        
        return {
          ...item,
          quantidade: quantidadeAtual + item.quantidade
        }
      })

      // Executar upsert
      const { error: erroUpsert } = await supabase
        .from('estoque_pronto')
        .upsert(dadosFinais, { 
          onConflict: 'sku',
          ignoreDuplicates: false 
        })

      if (erroUpsert) {
        console.error('❌ Erro ao processar entradas:', erroUpsert)
        throw erroUpsert
      }

      // Registrar log de entrada
      const logsEntrada = entradas.map(entrada => ({
        sku: entrada.sku,
        tipo_operacao: 'entrada',
        quantidade: entrada.quantidade,
        tipo_entrada: entrada.tipo,
        observacao: entrada.observacao,
        usuario: 'Sistema', // TODO: Pegar do contexto de autenticação
        created_at: new Date().toISOString()
      }))

      const { error: erroLog } = await supabase
        .from('estoque_movimentacao')
        .insert(logsEntrada)

      if (erroLog) {
        console.warn('⚠️ Erro ao registrar log de movimentação:', erroLog)
        // Não bloqueia o processo principal
      }

      console.log('✅ Entradas processadas com sucesso!')
      toast.success(`${entradas.length} entradas processadas com sucesso!`)
      
      // Limpar lista
      setEntradas([])
      
    } catch (error) {
      console.error('❌ Erro ao processar entradas:', error)
      toast.error('Erro ao processar entradas no estoque')
    } finally {
      setProcessando(false)
    }
  }

  const totalQuantidade = entradas.reduce((acc, item) => acc + item.quantidade, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        <span className="ml-3 text-gray-600">Carregando produtos...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Entrada de Estoque</h1>
          <p className="text-gray-600">Registro de entrada por produção ou lote</p>
        </div>
        
        <button
          onClick={fetchProdutos}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RotateCcw className="h-5 w-5 mr-2" />
          Atualizar Produtos
        </button>
      </div>

      {/* Formulário de Entrada */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Nova Entrada</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Seleção de Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Entrada
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTipoEntrada('producao')}
                className={`flex items-center justify-center p-3 rounded-lg border-2 transition-colors ${
                  tipoEntrada === 'producao'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <Factory className="h-5 w-5 mr-2" />
                Produção (1 und)
              </button>
              
              <button
                onClick={() => setTipoEntrada('lote')}
                className={`flex items-center justify-center p-3 rounded-lg border-2 transition-colors ${
                  tipoEntrada === 'lote'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <Warehouse className="h-5 w-5 mr-2" />
                Lote (12 und)
              </button>
            </div>
          </div>

          {/* Busca de Produto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar Produto
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar por SKU, linha, modelo ou cor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Lista de Produtos Filtrados */}
        {searchTerm && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Produtos Encontrados ({produtosFiltrados.length})
            </label>
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
              {produtosFiltrados.slice(0, 20).map((produto) => (
                <button
                  key={produto.sku_filho}
                  onClick={() => {
                    setSelectedSku(produto.sku_filho)
                    setSearchTerm('')
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">{produto.sku_filho}</span>
                      <span className="ml-2 text-sm text-gray-500">
                        {produto.linha} | {produto.modelo} | {produto.cor}
                      </span>
                    </div>
                    <Barcode className="h-4 w-4 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SKU Selecionado */}
        {selectedSku && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SKU Selecionado
            </label>
            <div className="flex items-center gap-4">
              <div className="flex-1 p-3 bg-green-50 border border-green-200 rounded-lg">
                <span className="font-medium text-green-800">{selectedSku}</span>
                <span className="ml-2 text-sm text-green-600">
                  +{tipoEntrada === 'producao' ? '1' : '12'} unidades
                </span>
              </div>
              
              <button
                onClick={adicionarEntrada}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Observação */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observação (Opcional)
          </label>
          <input
            type="text"
            placeholder="Observação sobre esta entrada..."
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Lista de Entradas Pendentes */}
      {entradas.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Entradas Pendentes ({entradas.length})
            </h2>
            <div className="text-sm text-gray-600">
              Total: <span className="font-medium text-green-600">{totalQuantidade} unidades</span>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {entradas.map((entrada, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${
                    entrada.tipo === 'producao' 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    {entrada.tipo === 'producao' ? <Factory className="h-4 w-4" /> : <Warehouse className="h-4 w-4" />}
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-900">{entrada.sku}</span>
                    <div className="text-sm text-gray-500">
                      +{entrada.quantidade} unidades
                      {entrada.observacao && ` • ${entrada.observacao}`}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => removerEntrada(index)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  ×
                </button>
              </motion.div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={processarEntradas}
              disabled={processando}
              className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processando ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processando...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Processar Entradas ({entradas.length})
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Informações */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Como funciona:</p>
            <ul className="space-y-1">
              <li>• <strong>Produção:</strong> Entrada unitária (1 unidade por vez)</li>
              <li>• <strong>Lote:</strong> Entrada em lote (12 unidades por vez)</li>
              <li>• Os produtos são buscados da tabela <code>produtos</code></li>
              <li>• As entradas são registradas na tabela <code>estoque_pronto</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EstoqueEntrada
