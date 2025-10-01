
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {ClipboardList, Plus, Search, Save, Package, User, Calendar, Trash2, Edit3, CheckCircle, AlertCircle, Hash} from 'lucide-react'
import { supabase, Produto } from '../lib/supabase'
import toast from 'react-hot-toast'

interface PedidoManualItem {
  id?: number
  id_registro: string
  nome_pedido: string
  cliente: string
  data_pedido: string
  status: 'pendente' | 'em_producao' | 'concluido'
  observacoes?: string
  created_at?: string
}

interface ItemPedidoManual {
  id?: number
  id_registro: string
  sku_pai: string
  linha: string
  modelo: string
  cor: string
  codigo_cor: string
  tamanho: string
  sku_filho: string
  quantidade: number
  foto?: string
  created_at?: string
}

interface GradeTamanho {
  tamanho: string
  quantidade: number
  sku_filho: string
}

const PlanejamentoPedidoManual: React.FC = () => {
  const [pedidos, setPedidos] = useState<PedidoManualItem[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPedido, setEditingPedido] = useState<PedidoManualItem | null>(null)
  
  // Form states
  const [idRegistro, setIdRegistro] = useState('')
  const [nomePedido, setNomePedido] = useState('')
  const [cliente, setCliente] = useState('')
  const [dataPedido, setDataPedido] = useState('')
  const [observacoes, setObservacoes] = useState('')
  
  // Produto lookup states
  const [skuInput, setSkuInput] = useState('')
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [gradeTamanhos, setGradeTamanhos] = useState<GradeTamanho[]>([])
  const [itensPedido, setItensPedido] = useState<ItemPedidoManual[]>([])

  useEffect(() => {
    fetchPedidos()
    fetchProdutos()
  }, [])

  const fetchPedidos = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('pedidos_manuais')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('Erro ao carregar pedidos manuais:', error)
        setPedidos([])
      } else {
        setPedidos(data || [])
      }
      
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error)
      toast.error('Erro ao carregar pedidos manuais')
    } finally {
      setLoading(false)
    }
  }

  const fetchProdutos = async () => {
    try {
      console.log('🔍 Buscando produtos na tabela...')
      
      const { data, error } = await supabase
        .from('produtos')
        .select('id, created_at, linha, modelo, cor, codigo_cor, tamanho, sku_pai, sku_filho, foto')
        .order('sku_pai', { ascending: true })

      if (error) {
        console.error('❌ Erro ao carregar produtos:', error)
        toast.error('Erro ao carregar produtos da tabela')
        setProdutos([])
      } else {
        console.log('✅ Produtos carregados:', data?.length || 0)
        console.log('📦 Primeiros 3 produtos:', data?.slice(0, 3))
        setProdutos(data || [])
        
        if (data && data.length > 0) {
          toast.success(`${data.length} produtos carregados com sucesso!`)
        } else {
          toast.warning('Nenhum produto encontrado na tabela')
        }
      }
      
    } catch (error) {
      console.error('💥 Erro crítico ao carregar produtos:', error)
      toast.error('Erro crítico ao acessar tabela de produtos')
    }
  }

  const gerarIdRegistro = () => {
    const timestamp = new Date().getTime()
    const random = Math.floor(Math.random() * 1000)
    return `REG${timestamp}${random}`
  }

  const normalizarSku = (sku: string): string => {
    // Remove pontos e espaços, mantém apenas números
    return sku.replace(/[.\s]/g, '')
  }

  const buscarProdutoPorSku = (skuInput: string) => {
    console.log('🔍 Buscando SKU:', skuInput)
    console.log('📦 Total de produtos disponíveis:', produtos.length)
    
    if (produtos.length === 0) {
      toast.error('Nenhum produto carregado. Recarregue a página.')
      return
    }

    const skuNormalizado = normalizarSku(skuInput)
    console.log('🔧 SKU normalizado:', skuNormalizado)
    
    // Log dos primeiros SKUs para debug
    console.log('📋 Primeiros SKUs na tabela:', produtos.slice(0, 5).map(p => p.sku_pai))
    
    // Busca por SKU_PAI exato
    const produtoEncontrado = produtos.find(p => {
      const skuProdutoNormalizado = normalizarSku(p.sku_pai)
      console.log(`🔍 Comparando: ${skuProdutoNormalizado} === ${skuNormalizado}`)
      return skuProdutoNormalizado === skuNormalizado
    })

    console.log('🎯 Produto encontrado:', produtoEncontrado)

    if (produtoEncontrado) {
      setProdutoSelecionado(produtoEncontrado)
      
      // Busca todos os produtos com mesmo SKU_PAI para criar grade
      const produtosMesmoSku = produtos.filter(p => p.sku_pai === produtoEncontrado.sku_pai)
      console.log('👥 Produtos mesmo SKU:', produtosMesmoSku.length)
      
      // Cria grade de tamanhos 34-40
      const tamanhos = ['34', '35', '36', '37', '38', '39', '40']
      const novaGrade: GradeTamanho[] = tamanhos.map(tamanho => {
        const produtoTamanho = produtosMesmoSku.find(p => p.tamanho === tamanho)
        return {
          tamanho,
          quantidade: 0,
          sku_filho: produtoTamanho?.sku_filho || `${produtoEncontrado.sku_pai}-${tamanho}`
        }
      })
      
      setGradeTamanhos(novaGrade)
      toast.success(`Produto encontrado: ${produtoEncontrado.linha} - ${produtoEncontrado.modelo}`)
    } else {
      setProdutoSelecionado(null)
      setGradeTamanhos([])
      toast.error(`Produto não encontrado para SKU: ${skuInput}`)
      
      // Sugestões de SKUs similares
      const skusSimilares = produtos
        .filter(p => p.sku_pai.includes(skuNormalizado.substring(0, 4)))
        .slice(0, 3)
        .map(p => p.sku_pai)
      
      if (skusSimilares.length > 0) {
        console.log('💡 SKUs similares encontrados:', skusSimilares)
        toast.info(`Sugestões: ${skusSimilares.join(', ')}`)
      }
    }
  }

  const atualizarQuantidadeGrade = (tamanho: string, quantidade: number) => {
    setGradeTamanhos(prev => 
      prev.map(item => 
        item.tamanho === tamanho 
          ? { ...item, quantidade: Math.max(0, quantidade) }
          : item
      )
    )
  }

  const adicionarItensGrade = () => {
    if (!produtoSelecionado || !idRegistro) {
      toast.error('Selecione um produto e defina um ID de registro')
      return
    }

    const itensComQuantidade = gradeTamanhos.filter(item => item.quantidade > 0)
    
    if (itensComQuantidade.length === 0) {
      toast.error('Adicione pelo menos uma quantidade na grade')
      return
    }

    const novosItens: ItemPedidoManual[] = itensComQuantidade.map(item => ({
      id_registro: idRegistro,
      sku_pai: produtoSelecionado.sku_pai,
      linha: produtoSelecionado.linha,
      modelo: produtoSelecionado.modelo,
      cor: produtoSelecionado.cor,
      codigo_cor: produtoSelecionado.codigo_cor,
      tamanho: item.tamanho,
      sku_filho: item.sku_filho,
      quantidade: item.quantidade,
      foto: produtoSelecionado.foto
    }))

    setItensPedido(prev => [...prev, ...novosItens])
    
    // Reset
    setSkuInput('')
    setProdutoSelecionado(null)
    setGradeTamanhos([])
    
    toast.success(`${novosItens.length} itens adicionados ao pedido`)
  }

  const removerItem = (index: number) => {
    setItensPedido(prev => prev.filter((_, i) => i !== index))
    toast.success('Item removido')
  }

  const resetForm = () => {
    setIdRegistro('')
    setNomePedido('')
    setCliente('')
    setDataPedido('')
    setObservacoes('')
    setSkuInput('')
    setProdutoSelecionado(null)
    setGradeTamanhos([])
    setItensPedido([])
    setEditingPedido(null)
    setShowForm(false)
  }

  const salvarPedido = async () => {
    if (!idRegistro || !nomePedido || !cliente || !dataPedido) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (itensPedido.length === 0) {
      toast.error('Adicione pelo menos um item ao pedido')
      return
    }

    try {
      // Salvar cabeçalho do pedido
      const pedidoData = {
        id_registro: idRegistro,
        nome_pedido: nomePedido,
        cliente,
        data_pedido: dataPedido,
        status: 'pendente' as const,
        observacoes: observacoes || null,
        updated_at: new Date().toISOString()
      }

      if (editingPedido) {
        const { error } = await supabase
          .from('pedidos_manuais')
          .update(pedidoData)
          .eq('id', editingPedido.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('pedidos_manuais')
          .insert([{
            ...pedidoData,
            created_at: new Date().toISOString()
          }])

        if (error) throw error
      }

      // Salvar itens do pedido
      const itensParaSalvar = itensPedido.map(item => ({
        ...item,
        created_at: new Date().toISOString()
      }))

      const { error: errorItens } = await supabase
        .from('itens_pedidos_manuais')
        .insert(itensParaSalvar)

      if (errorItens) throw errorItens

      toast.success('Pedido salvo com sucesso!')
      resetForm()
      fetchPedidos()
      
    } catch (error) {
      console.error('Erro ao salvar pedido:', error)
      toast.error('Erro ao salvar pedido')
    }
  }

  const alterarStatus = async (id: number, novoStatus: PedidoManualItem['status']) => {
    try {
      const { error } = await supabase
        .from('pedidos_manuais')
        .update({ status: novoStatus })
        .eq('id', id)

      if (error) throw error
      
      toast.success('Status atualizado')
      fetchPedidos()
      
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      toast.error('Erro ao alterar status')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return 'bg-yellow-100 text-yellow-800'
      case 'em_producao': return 'bg-blue-100 text-blue-800'
      case 'concluido': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Carregando produtos...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedido Manual</h1>
          <p className="text-gray-600">
            Gestão de pedidos manuais com produtos da tabela ({produtos.length} produtos carregados)
          </p>
        </div>
        
        <button
          onClick={() => {
            setShowForm(!showForm)
            if (!showForm) {
              setIdRegistro(gerarIdRegistro())
            }
          }}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Novo Pedido
        </button>
      </div>

      {/* Debug Info */}
      {produtos.length === 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-800 font-medium">Nenhum produto carregado da tabela</span>
          </div>
          <button
            onClick={fetchProdutos}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Tentar Recarregar
          </button>
        </div>
      )}

      {/* Formulário */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingPedido ? 'Editar Pedido' : 'Novo Pedido Manual'}
          </h2>
          
          {/* ID de Registro */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center">
              <Hash className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-900">ID do Registro:</span>
              <span className="ml-2 text-sm font-mono text-blue-700">{idRegistro}</span>
            </div>
          </div>
          
          {/* Dados do Pedido */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Pedido *
              </label>
              <input
                type="text"
                value={nomePedido}
                onChange={(e) => setNomePedido(e.target.value)}
                placeholder="Ex: Pedido Especial Cliente X"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente *
              </label>
              <input
                type="text"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Nome do cliente"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data do Pedido *
              </label>
              <input
                type="date"
                value={dataPedido}
                onChange={(e) => setDataPedido(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Observações */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações sobre o pedido..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Busca de Produto */}
          <div className="border-t pt-4 mb-4">
            <h3 className="text-md font-medium text-gray-900 mb-3">Adicionar Produto</h3>
            
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={skuInput}
                  onChange={(e) => setSkuInput(e.target.value)}
                  placeholder="Digite o SKU_PAI (ex: 700002049, 700.002.049, 700002.049)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => buscarProdutoPorSku(skuInput)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                disabled={produtos.length === 0}
              >
                <Search className="h-4 w-4" />
              </button>
            </div>

            {/* Produto Selecionado */}
            {produtoSelecionado && (
              <div className="mb-4 p-4 bg-green-50 rounded-lg">
                <div className="flex items-start gap-4">
                  {produtoSelecionado.foto && (
                    <img 
                      src={`data:image/jpeg;base64,${produtoSelecionado.foto}`}
                      alt="Produto"
                      className="w-16 h-16 object-cover rounded-lg"
                      onError={(e) => {
                        console.log('Erro ao carregar imagem')
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  )}
                  <div>
                    <h4 className="font-medium text-gray-900">{produtoSelecionado.linha} - {produtoSelecionado.modelo}</h4>
                    <p className="text-sm text-gray-600">Cor: {produtoSelecionado.cor} ({produtoSelecionado.codigo_cor})</p>
                    <p className="text-sm text-gray-600">SKU PAI: {produtoSelecionado.sku_pai}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Grade de Tamanhos */}
            {gradeTamanhos.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Grade de Tamanhos (34-40)</h4>
                <div className="grid grid-cols-7 gap-2">
                  {gradeTamanhos.map((item) => (
                    <div key={item.tamanho} className="text-center">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {item.tamanho}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={item.quantidade}
                        onChange={(e) => atualizarQuantidadeGrade(item.tamanho, parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent text-center"
                      />
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={adicionarItensGrade}
                  className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Adicionar à Grade
                </button>
              </div>
            )}
          </div>

          {/* Itens do Pedido */}
          {itensPedido.length > 0 && (
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-900 mb-3">
                Itens do Pedido ({itensPedido.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {itensPedido.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">{item.sku_filho}</span>
                      <span className="ml-2 text-gray-600">- {item.linha} {item.modelo}</span>
                      <span className="ml-2 text-sm text-blue-600">Tam: {item.tamanho}</span>
                      <span className="ml-2 text-sm text-green-600">Qtd: {item.quantidade}</span>
                    </div>
                    <button
                      onClick={() => removerItem(index)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex space-x-3">
            <button
              onClick={salvarPedido}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="h-4 w-4 inline mr-2" />
              {editingPedido ? 'Atualizar' : 'Salvar'} Pedido
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </motion.div>
      )}

      {/* Lista de Pedidos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Pedidos Manuais ({pedidos.length})
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID Registro
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pedido
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pedidos.map((pedido, index) => (
                <motion.tr
                  key={pedido.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {pedido.id_registro}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {pedido.nome_pedido}
                      </div>
                      {pedido.observacoes && (
                        <div className="text-xs text-gray-500">
                          {pedido.observacoes}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {pedido.cliente}
                  </td>

                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(pedido.data_pedido).toLocaleDateString('pt-BR')}
                  </td>

                  <td className="px-4 py-4 whitespace-nowrap">
                    <select
                      value={pedido.status}
                      onChange={(e) => alterarStatus(pedido.id!, e.target.value as PedidoManualItem['status'])}
                      className={`text-xs font-semibold rounded-full px-2 py-1 border-0 ${getStatusColor(pedido.status)}`}
                    >
                      <option value="pendente">Pendente</option>
                      <option value="em_producao">Em Produção</option>
                      <option value="concluido">Concluído</option>
                    </select>
                  </td>

                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {pedidos.length === 0 && (
          <div className="text-center py-12">
            <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum pedido manual</h3>
            <p className="text-gray-500">Crie seu primeiro pedido manual clicando no botão acima.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default PlanejamentoPedidoManual
