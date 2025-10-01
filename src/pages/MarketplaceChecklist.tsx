
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {CheckCircle, Clock, Package, Search, Scan, AlertTriangle, User, Calendar, Barcode, SquareCheck as CheckSquare, XCircle, TrendingDown} from 'lucide-react'
import { supabase, buscarPedidosOtimizado, obterNomeLoja, getSituacaoPedidoColor, getSituacaoPedidoText, parseItensJson } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

interface PedidoVendas {
  id_key: number
  id_bling: string
  numero: string
  numeroloja: string
  data: string
  total: number
  contato_nome: string
  sitacao_bling: number
  loja: string
  itens_json: string
  situacao_erp?: string
  situacao_etiqueta?: string
  situacao_nf?: string
  situacao_etq_impressa?: string
}

interface ItemPedido {
  codigo: string
  descricao: string
  quantidade: number
  valor: number
}

interface ChecklistItem {
  sku: string
  quantidade: number
  escaneado: number
  status: 'pendente' | 'parcial' | 'completo'
}

const MarketplaceChecklist: React.FC = () => {
  const { user } = useAuth()
  const [pedidos, setPedidos] = useState<PedidoVendas[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [pedidoSelecionado, setPedidoSelecionado] = useState<PedidoVendas | null>(null)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [skuInput, setSkuInput] = useState('')
  const [processandoBaixa, setProcessandoBaixa] = useState(false)

  useEffect(() => {
    // Definir período padrão (últimos 7 dias)
    const hoje = new Date()
    const seteDiasAtras = new Date(hoje)
    seteDiasAtras.setDate(hoje.getDate() - 7)
    
    setDataFim(hoje.toISOString().split('T')[0])
    setDataInicio(seteDiasAtras.toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    if (dataInicio && dataFim) {
      fetchPedidos()
    }
  }, [dataInicio, dataFim])

  useEffect(() => {
    if (pedidoSelecionado) {
      gerarChecklist()
    }
  }, [pedidoSelecionado])

  const fetchPedidos = async () => {
    try {
      setLoading(true)
      console.log('🔄 Buscando pedidos para checklist...')
      
      const { data: pedidosData } = await buscarPedidosOtimizado(dataInicio, dataFim, 1, 100)
      
      // Filtrar apenas pedidos com situação adequada para checklist
      const pedidosFiltrados = pedidosData.filter(pedido => 
        pedido.sitacao_bling === 6 || pedido.sitacao_bling === 9 // Aberto ou Atendido
      )
      
      console.log('📦 Pedidos carregados para checklist:', pedidosFiltrados.length)
      setPedidos(pedidosFiltrados)
      
    } catch (error) {
      console.error('❌ Erro ao buscar pedidos:', error)
      toast.error('Erro ao carregar pedidos')
    } finally {
      setLoading(false)
    }
  }

  const gerarChecklist = () => {
    if (!pedidoSelecionado) return

    try {
      const itens = parseItensJson(pedidoSelecionado.itens_json)
      
      const checklistItems: ChecklistItem[] = itens.map((item: ItemPedido) => ({
        sku: item.codigo,
        quantidade: item.quantidade,
        escaneado: 0,
        status: 'pendente' as const
      }))

      setChecklist(checklistItems)
      console.log('📋 Checklist gerado:', checklistItems.length, 'itens')
      
    } catch (error) {
      console.error('❌ Erro ao gerar checklist:', error)
      toast.error('Erro ao processar itens do pedido')
    }
  }

  const processarEscaneamento = async (sku: string) => {
    if (!pedidoSelecionado) {
      toast.error('Selecione um pedido primeiro')
      return
    }

    try {
      setProcessandoBaixa(true)
      console.log('🔄 Processando escaneamento do SKU:', sku)

      // 1. Verificar se o SKU está no checklist
      const itemIndex = checklist.findIndex(item => item.sku === sku)
      if (itemIndex === -1) {
        toast.error(`SKU ${sku} não encontrado neste pedido`)
        return
      }

      const item = checklist[itemIndex]
      
      // 2. Verificar se ainda há quantidade para escanear
      if (item.escaneado >= item.quantidade) {
        toast.warning(`SKU ${sku} já foi totalmente escaneado`)
        return
      }

      // 3. Verificar estoque disponível
      const { data: estoqueData, error: erroEstoque } = await supabase
        .from('estoque_pronto')
        .select('quantidade')
        .eq('sku', sku)
        .single()

      if (erroEstoque || !estoqueData) {
        toast.error(`SKU ${sku} não encontrado no estoque`)
        return
      }

      if (estoqueData.quantidade < 1) {
        toast.error(`Estoque insuficiente para ${sku}. Disponível: ${estoqueData.quantidade}`)
        return
      }

      // 4. Fazer baixa no estoque (decrementar 1 unidade)
      const { error: erroBaixa } = await supabase
        .from('estoque_pronto')
        .update({ 
          quantidade: estoqueData.quantidade - 1,
          updated_at: new Date().toISOString()
        })
        .eq('sku', sku)

      if (erroBaixa) {
        console.error('❌ Erro ao fazer baixa no estoque:', erroBaixa)
        toast.error('Erro ao atualizar estoque')
        return
      }

      // 5. Registrar log da movimentação
      const logMovimentacao = {
        sku: sku,
        tipo_operacao: 'saida',
        quantidade: 1,
        motivo: 'checklist',
        pedido_numero: pedidoSelecionado.numero,
        observacao: `Checklist - Pedido ${pedidoSelecionado.numero}`,
        usuario: user?.email || 'Sistema',
        created_at: new Date().toISOString()
      }

      const { error: erroLog } = await supabase
        .from('estoque_movimentacao')
        .insert([logMovimentacao])

      if (erroLog) {
        console.warn('⚠️ Erro ao registrar log:', erroLog)
        // Não bloqueia o processo
      }

      // 6. Atualizar checklist local
      const novoChecklist = [...checklist]
      novoChecklist[itemIndex].escaneado += 1
      
      // Atualizar status do item
      if (novoChecklist[itemIndex].escaneado >= novoChecklist[itemIndex].quantidade) {
        novoChecklist[itemIndex].status = 'completo'
      } else {
        novoChecklist[itemIndex].status = 'parcial'
      }
      
      setChecklist(novoChecklist)

      // 7. Feedback para o usuário
      const restante = item.quantidade - (item.escaneado + 1)
      if (restante === 0) {
        toast.success(`✅ ${sku} - Item completo!`)
      } else {
        toast.success(`✅ ${sku} - Faltam ${restante} unidades`)
      }

      console.log('✅ Escaneamento processado com sucesso')
      
    } catch (error) {
      console.error('❌ Erro ao processar escaneamento:', error)
      toast.error('Erro interno ao processar escaneamento')
    } finally {
      setProcessandoBaixa(false)
    }
  }

  const handleEscanear = () => {
    if (!skuInput.trim()) {
      toast.error('Digite ou escaneie um SKU')
      return
    }

    processarEscaneamento(skuInput.trim())
    setSkuInput('') // Limpar input após escaneamento
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEscanear()
    }
  }

  // Filtrar pedidos baseado na busca
  const pedidosFiltrados = pedidos.filter(pedido =>
    pedido.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pedido.contato_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obterNomeLoja(pedido.loja).toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Estatísticas do checklist
  const totalItens = checklist.length
  const itensCompletos = checklist.filter(item => item.status === 'completo').length
  const itensParciais = checklist.filter(item => item.status === 'parcial').length
  const itensPendentes = checklist.filter(item => item.status === 'pendente').length
  const progresso = totalItens > 0 ? (itensCompletos / totalItens) * 100 : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Carregando pedidos...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Checklist de Separação</h1>
          <p className="text-gray-600">Escaneamento e baixa automática no estoque</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Início
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Fim
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar Pedido
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Número, cliente ou loja..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de Pedidos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Pedidos Disponíveis ({pedidosFiltrados.length})
            </h2>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {pedidosFiltrados.map((pedido) => (
              <motion.div
                key={pedido.id_key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                  pedidoSelecionado?.id_key === pedido.id_key
                    ? 'bg-blue-50 border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setPedidoSelecionado(pedido)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">#{pedido.numero}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSituacaoPedidoColor(pedido.sitacao_bling)}`}>
                        {getSituacaoPedidoText(pedido.sitacao_bling)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{pedido.contato_nome}</p>
                    <p className="text-xs text-gray-500">{obterNomeLoja(pedido.loja)}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      R$ {pedido.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(pedido.data).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {pedidosFiltrados.length === 0 && (
              <div className="p-8 text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum pedido encontrado</h3>
                <p className="text-gray-500">Ajuste os filtros ou período de busca.</p>
              </div>
            )}
          </div>
        </div>

        {/* Checklist e Scanner */}
        <div className="space-y-6">
          {/* Scanner de SKU */}
          {pedidoSelecionado && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Scanner - Pedido #{pedidoSelecionado.numero}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SKU para Escaneamento
                  </label>
                  <div className="flex space-x-2">
                    <div className="flex-1 relative">
                      <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <input
                        type="text"
                        placeholder="Digite ou escaneie o SKU..."
                        value={skuInput}
                        onChange={(e) => setSkuInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                        disabled={processandoBaixa}
                      />
                    </div>
                    <button
                      onClick={handleEscanear}
                      disabled={processandoBaixa || !skuInput.trim()}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processandoBaixa ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <Scan className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Progresso */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Progresso</span>
                    <span className="text-sm text-gray-600">{progresso.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progresso}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-600">
                    <span>✅ {itensCompletos} completos</span>
                    <span>🔄 {itensParciais} parciais</span>
                    <span>⏳ {itensPendentes} pendentes</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lista do Checklist */}
          {pedidoSelecionado && checklist.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Checklist ({checklist.length} itens)
                </h2>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {checklist.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 border-b border-gray-100 ${
                      item.status === 'completo' ? 'bg-green-50' :
                      item.status === 'parcial' ? 'bg-yellow-50' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${
                          item.status === 'completo' ? 'bg-green-100 text-green-600' :
                          item.status === 'parcial' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-gray-100 text-gray-400'
                        }`}>
                          {item.status === 'completo' ? <CheckCircle className="h-5 w-5" /> :
                           item.status === 'parcial' ? <Clock className="h-5 w-5" /> :
                           <Package className="h-5 w-5" />}
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-900">{item.sku}</span>
                          <div className="text-sm text-gray-600">
                            {item.escaneado}/{item.quantidade} escaneados
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <TrendingDown className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-600">-{item.escaneado} estoque</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Instruções */}
          {!pedidoSelecionado && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-start">
                <CheckSquare className="h-6 w-6 text-blue-600 mr-3 mt-0.5" />
                <div>
                  <h3 className="text-lg font-medium text-blue-900 mb-2">Como usar o Checklist</h3>
                  <ul className="space-y-1 text-sm text-blue-800">
                    <li>• Selecione um pedido da lista ao lado</li>
                    <li>• Escaneie ou digite os SKUs dos produtos</li>
                    <li>• Cada escaneamento faz baixa automática de 1 unidade no estoque</li>
                    <li>• O progresso é atualizado em tempo real</li>
                    <li>• Todas as movimentações são registradas no log</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MarketplaceChecklist
