
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Plus,
  Minus,
  RotateCcw,
  Search,
  Filter,
  Download,
  Upload,
  FileSpreadsheet
} from 'lucide-react'
import { buscarEstoqueGeral, buscarEstoquePronto } from '../lib/supabase'
import ImportadorEstoque from '../components/ImportadorEstoque'
import toast from 'react-hot-toast'

// 🔧 INTERFACE CORRIGIDA PARA USAR CAMPO 'sku'
interface EstoqueItem {
  id: number
  sku: string  // SKU completo (ex: 107.047.008-34)
  quantidade: number
}

interface EstoquePorProduto {
  produto: string
  linha: string
  modelo: string
  tamanhos: { [tamanho: string]: number }
  totalQuantidade: number
}

const Estoque: React.FC = () => {
  const [estoqueGeral, setEstoqueGeral] = useState<EstoqueItem[]>([])
  const [estoquePronto, setEstoquePronto] = useState<EstoqueItem[]>([])
  const [estoqueSelecionado, setEstoqueSelecionado] = useState<'geral' | 'pronto'>('geral')
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showImportador, setShowImportador] = useState(false)
  const [estoquePorProduto, setEstoquePorProduto] = useState<EstoquePorProduto[]>([])

  // Tamanhos disponíveis (34 a 40)
  const tamanhosDisponiveis = ['34', '35', '36', '37', '38', '39', '40']

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    processarEstoquePorProduto()
  }, [estoqueGeral, estoquePronto, estoqueSelecionado])

  const fetchData = async () => {
    try {
      setLoading(true)
      console.log('🔄 Iniciando carregamento dos dados de estoque...')
      console.log('🔄 Buscando tabelas: public.estoque_geral e public.estoque_pronto')
      
      // Buscar dados das duas tabelas de estoque
      const [estoqueGeralRes, estoqueProntoRes] = await Promise.all([
        buscarEstoqueGeral(),
        buscarEstoquePronto()
      ])
      
      console.log('📊 Estoque Geral carregado:', estoqueGeralRes.length, 'itens')
      console.log('📊 Estoque Pronto carregado:', estoqueProntoRes.length, 'itens')
      
      if (estoqueGeralRes.length > 0) {
        console.log('📋 Exemplo estoque geral:', estoqueGeralRes.slice(0, 3))
      }
      
      if (estoqueProntoRes.length > 0) {
        console.log('📋 Exemplo estoque pronto:', estoqueProntoRes.slice(0, 3))
      }
      
      setEstoqueGeral(estoqueGeralRes)
      setEstoquePronto(estoqueProntoRes)
      
      if (estoqueGeralRes.length === 0 && estoqueProntoRes.length === 0) {
        console.error('❌ Nenhum dado de estoque encontrado nas tabelas')
        toast.error('Nenhum dado de estoque encontrado no banco de dados')
      } else {
        console.log('✅ Dados de estoque carregados com sucesso!')
        toast.success(`Dados carregados: ${estoqueGeralRes.length} geral, ${estoqueProntoRes.length} pronto`)
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados do estoque')
    } finally {
      setLoading(false)
    }
  }

  const processarEstoquePorProduto = () => {
    // Selecionar dados baseado na tabela escolhida
    const dadosEstoque = estoqueSelecionado === 'geral' ? estoqueGeral : estoquePronto
    
    console.log(`🔄 Processando estoque ${estoqueSelecionado}:`, dadosEstoque.length, 'itens')
    
    // Agrupar por produto (extrair produto e tamanho do SKU)
    const produtosMap = new Map<string, EstoquePorProduto>()

    dadosEstoque.forEach(item => {
      // 🔧 USAR CAMPO 'sku' EM VEZ DE 'codigo'
      // Extrair produto e tamanho do SKU
      // Exemplo: 107.047.008-34 -> produto: 107.047.008, tamanho: 34
      const skuParts = item.sku.split('-')
      if (skuParts.length === 2) {
        const produto = skuParts[0] // 107.047.008
        const tamanho = skuParts[1] // 34
        
        // Extrair linha (3 primeiros dígitos) e modelo (7 primeiros dígitos)
        const linha = produto.substring(0, 3) // 107
        const modelo = produto.substring(0, 7) // 107.047
        
        if (!produtosMap.has(produto)) {
          produtosMap.set(produto, {
            produto,
            linha,
            modelo,
            tamanhos: {},
            totalQuantidade: 0
          })
        }
        
        const produtoData = produtosMap.get(produto)!
        produtoData.tamanhos[tamanho] = item.quantidade
        produtoData.totalQuantidade += item.quantidade
      }
    })

    // Converter Map para Array e ordenar
    const produtosArray = Array.from(produtosMap.values()).sort((a, b) => 
      a.produto.localeCompare(b.produto)
    )

    console.log('📦 Produtos processados:', produtosArray.length)
    console.log('📊 Amostra dos produtos processados:', produtosArray.slice(0, 3))
    setEstoquePorProduto(produtosArray)
  }

  // Filtrar produtos baseado na busca
  const produtosFiltrados = estoquePorProduto.filter(produto =>
    produto.produto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    produto.linha.toLowerCase().includes(searchTerm.toLowerCase()) ||
    produto.modelo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Estatísticas
  const totalProdutos = estoquePorProduto.length
  const totalQuantidade = estoquePorProduto.reduce((acc, p) => acc + p.totalQuantidade, 0)
  const produtosSemEstoque = estoquePorProduto.filter(p => p.totalQuantidade === 0).length
  const produtosComEstoque = totalProdutos - produtosSemEstoque

  const handleRefresh = () => {
    console.log('🔄 Atualizando dados manualmente...')
    fetchData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Carregando dados do estoque...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Controle de Estoque</h1>
          <p className="text-gray-600">Gestão de inventário por produto e tamanho</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RotateCcw className="h-5 w-5 mr-2" />
            Atualizar
          </button>
          
          <button
            onClick={() => setShowImportador(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FileSpreadsheet className="h-5 w-5 mr-2" />
            Importar XLS
          </button>
          
          <button className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
            <Download className="h-5 w-5 mr-2" />
            Relatório
          </button>
        </div>
      </div>

      {/* Seleção da Tabela de Estoque */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-shrink-0">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tabela de Estoque:
            </label>
            <select
              value={estoqueSelecionado}
              onChange={(e) => setEstoqueSelecionado(e.target.value as 'geral' | 'pronto')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="geral">Estoque Geral ({estoqueGeral.length} itens)</option>
              <option value="pronto">Estoque Pronto ({estoquePronto.length} itens)</option>
            </select>
          </div>
          
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar por produto, linha ou modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Produtos</p>
              <p className="text-2xl font-bold text-gray-900">{totalProdutos}</p>
            </div>
            <Package className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Com Estoque</p>
              <p className="text-2xl font-bold text-green-600">{produtosComEstoque}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sem Estoque</p>
              <p className="text-2xl font-bold text-red-600">{produtosSemEstoque}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Quantidade Total</p>
              <p className="text-2xl font-bold text-blue-600">{totalQuantidade.toLocaleString()}</p>
            </div>
            <Package className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Indicador da Tabela Atual */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Package className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-blue-800 font-medium">
              Exibindo dados da tabela: <strong>public.{estoqueSelecionado === 'geral' ? 'estoque_geral' : 'estoque_pronto'}</strong>
            </span>
          </div>
          <div className="text-sm text-blue-600">
            {estoqueSelecionado === 'geral' ? estoqueGeral.length : estoquePronto.length} itens carregados
          </div>
        </div>
      </div>

      {/* Tabela de Estoque por Produto e Tamanho */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Linha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Modelo
                </th>
                {tamanhosDisponiveis.map(tamanho => (
                  <th key={tamanho} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tamanho}
                  </th>
                ))}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {produtosFiltrados.map((produto, index) => (
                <motion.tr
                  key={produto.produto}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {produto.produto}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {produto.linha}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {produto.modelo}
                  </td>

                  {tamanhosDisponiveis.map(tamanho => {
                    const quantidade = produto.tamanhos[tamanho] || 0
                    return (
                      <td key={tamanho} className="px-3 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center justify-center w-12 h-8 rounded text-sm font-medium ${
                          quantidade > 0 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-400'
                        }`}>
                          {quantidade > 0 ? quantidade : '-'}
                        </span>
                      </td>
                    )
                  })}

                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-lg font-bold text-blue-600">
                      {produto.totalQuantidade}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {produtosFiltrados.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum dado de estoque disponível'}
            </h3>
            <p className="text-gray-500">
              {searchTerm 
                ? 'Tente ajustar os filtros de busca.' 
                : `Verifique se há dados na tabela public.${estoqueSelecionado === 'geral' ? 'estoque_geral' : 'estoque_pronto'}.`
              }
            </p>
            {!searchTerm && (
              <button
                onClick={handleRefresh}
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal Importador de Estoque */}
      {showImportador && (
        <ImportadorEstoque onClose={() => setShowImportador(false)} />
      )}
    </div>
  )
}

export default Estoque
