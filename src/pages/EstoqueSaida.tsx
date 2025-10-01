
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {Package, Minus, Search, Save, AlertTriangle, ShoppingCart, User, Barcode, RotateCcw, History} from 'lucide-react'
import { supabase, buscarEstoquePronto } from '../lib/supabase'
import toast from 'react-hot-toast'

interface EstoqueItem {
  sku: string
  quantidade: number
}

interface SaidaItem {
  sku: string
  quantidade: number
  motivo: 'venda' | 'devolucao' | 'perda' | 'transferencia' | 'outros'
  observacao?: string
}

const EstoqueSaida: React.FC = () => {
  const [estoque, setEstoque] = useState<EstoqueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSku, setSelectedSku] = useState('')
  const [quantidade, setQuantidade] = useState(1)
  const [motivo, setMotivo] = useState<SaidaItem['motivo']>('venda')
  const [observacao, setObservacao] = useState('')
  const [saidas, setSaidas] = useState<SaidaItem[]>([])
  const [processando, setProcessando] = useState(false)

  useEffect(() => {
    fetchEstoque()
  }, [])

  const fetchEstoque = async () => {
    try {
      setLoading(true)
      console.log('🔄 Carregando estoque disponível...')
      
      const estoqueData = await buscarEstoquePronto()
      
      // Filtrar apenas itens com estoque > 0
      const estoqueComEstoque = estoqueData.filter(item => item.quantidade > 0)
      
      console.log('📦 Estoque carregado:', estoqueComEstoque.length, 'itens com estoque')
      setEstoque(estoqueComEstoque)
      
      if (estoqueComEstoque.length === 0) {
        toast.error('Nenhum item com estoque disponível')
      } else {
        toast.success(`${estoqueComEstoque.length} itens com estoque`)
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar estoque:', error)
      toast.error('Erro ao carregar dados do estoque')
    } finally {
      setLoading(false)
    }
  }

  // Filtrar estoque baseado na busca
  const estoqueFiltrado = estoque.filter(item =>
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const adicionarSaida = () => {
    if (!selectedSku) {
      toast.error('Selecione um SKU para adicionar')
      return
    }

    if (quantidade <= 0) {
      toast.error('Quantidade deve ser maior que zero')
      return
    }

    // Verificar estoque disponível
    const itemEstoque = estoque.find(item => item.sku === selectedSku)
    if (!itemEstoque) {
      toast.error('SKU não encontrado no estoque')
      return
    }

    // Verificar se já existe saída pendente para este SKU
    const saidaExistente = saidas.find(item => item.sku === selectedSku)
    const quantidadePendente = saidaExistente ? saidaExistente.quantidade : 0
    const quantidadeDisponivel = itemEstoque.quantidade - quantidadePendente

    if (quantidade > quantidadeDisponivel) {
      toast.error(`Estoque insuficiente. Disponível: ${quantidadeDisponivel}`)
      return
    }

    if (saidaExistente) {
      // Atualizar quantidade existente
      const novasSaidas = saidas.map(item =>
        item.sku === selectedSku
          ? { ...item, quantidade: item.quantidade + quantidade }
          : item
      )
      setSaidas(novasSaidas)
      toast.success(`Quantidade atualizada: +${quantidade} unidades`)
    } else {
      // Adicionar nova saída
      const novaSaida: SaidaItem = {
        sku: selectedSku,
        quantidade,
        motivo,
        observacao: observacao || undefined
      }
      
      setSaidas([...saidas, novaSaida])
      toast.success(`Saída adicionada: ${selectedSku} (-${quantidade})`)
    }

    // Limpar formulário
    setSelectedSku('')
    setQuantidade(1)
    setObservacao('')
  }

  const removerSaida = (index: number) => {
    const novasSaidas = saidas.filter((_, i) => i !== index)
    setSaidas(novasSaidas)
    toast.success('Saída removida')
  }

  const processarSaidas = async () => {
    if (saidas.length === 0) {
      toast.error('Adicione pelo menos uma saída para processar')
      return
    }

    try {
      setProcessando(true)
      console.log('🔄 Processando saídas do estoque:', saidas.length, 'itens')

      // Buscar quantidades atuais
      const { data: estoqueAtual, error: erroConsulta } = await supabase
        .from('estoque_pronto')
        .select('sku, quantidade')
        .in('sku', saidas.map(s => s.sku))

      if (erroConsulta) {
        console.error('❌ Erro ao consultar estoque atual:', erroConsulta)
        throw erroConsulta
      }

      // Validar estoque suficiente e calcular novas quantidades
      const dadosParaUpdate = []
      
      for (const saida of saidas) {
        const estoqueExistente = estoqueAtual?.find(e => e.sku === saida.sku)
        
        if (!estoqueExistente) {
          throw new Error(`SKU ${saida.sku} não encontrado no estoque`)
        }
        
        if (estoqueExistente.quantidade < saida.quantidade) {
          throw new Error(`Estoque insuficiente para ${saida.sku}. Disponível: ${estoqueExistente.quantidade}`)
        }
        
        dadosParaUpdate.push({
          sku: saida.sku,
          quantidade: estoqueExistente.quantidade - saida.quantidade,
          updated_at: new Date().toISOString()
        })
      }

      // Executar updates
      for (const dados of dadosParaUpdate) {
        const { error: erroUpdate } = await supabase
          .from('estoque_pronto')
          .update({ 
            quantidade: dados.quantidade, 
            updated_at: dados.updated_at 
          })
          .eq('sku', dados.sku)

        if (erroUpdate) {
          console.error(`❌ Erro ao atualizar ${dados.sku}:`, erroUpdate)
          throw erroUpdate
        }
      }

      // Registrar log de saída
      const logsSaida = saidas.map(saida => ({
        sku: saida.sku,
        tipo_operacao: 'saida',
        quantidade: saida.quantidade,
        motivo: saida.motivo,
        observacao: saida.observacao,
        usuario: 'Sistema', // TODO: Pegar do contexto de autenticação
        created_at: new Date().toISOString()
      }))

      const { error: erroLog } = await supabase
        .from('estoque_movimentacao')
        .insert(logsSaida)

      if (erroLog) {
        console.warn('⚠️ Erro ao registrar log de movimentação:', erroLog)
        // Não bloqueia o processo principal
      }

      console.log('✅ Saídas processadas com sucesso!')
      toast.success(`${saidas.length} saídas processadas com sucesso!`)
      
      // Limpar lista e recarregar estoque
      setSaidas([])
      await fetchEstoque()
      
    } catch (error: any) {
      console.error('❌ Erro ao processar saídas:', error)
      toast.error(error.message || 'Erro ao processar saídas do estoque')
    } finally {
      setProcessando(false)
    }
  }

  const getEstoqueDisponivel = (sku: string): number => {
    const itemEstoque = estoque.find(item => item.sku === sku)
    const saidaPendente = saidas.find(item => item.sku === sku)
    
    if (!itemEstoque) return 0
    
    return itemEstoque.quantidade - (saidaPendente?.quantidade || 0)
  }

  const motivosOptions = [
    { value: 'venda', label: 'Venda', icon: ShoppingCart },
    { value: 'devolucao', label: 'Devolução', icon: Package },
    { value: 'perda', label: 'Perda/Avaria', icon: AlertTriangle },
    { value: 'transferencia', label: 'Transferência', icon: Package },
    { value: 'outros', label: 'Outros', icon: User }
  ]

  const totalQuantidade = saidas.reduce((acc, item) => acc + item.quantidade, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        <span className="ml-3 text-gray-600">Carregando estoque...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Saída de Estoque</h1>
          <p className="text-gray-600">Registro de saídas e baixas do estoque</p>
        </div>
        
        <button
          onClick={fetchEstoque}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RotateCcw className="h-5 w-5 mr-2" />
          Atualizar Estoque
        </button>
      </div>

      {/* Formulário de Saída */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Nova Saída</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Busca de SKU */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar SKU no Estoque
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Motivo da Saída */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo da Saída
            </label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as SaidaItem['motivo'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              {motivosOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Lista de SKUs Filtrados */}
        {searchTerm && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SKUs Encontrados ({estoqueFiltrado.length})
            </label>
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
              {estoqueFiltrado.slice(0, 20).map((item) => (
                <button
                  key={item.sku}
                  onClick={() => {
                    setSelectedSku(item.sku)
                    setSearchTerm('')
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">{item.sku}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Package className="h-4 w-4 mr-1" />
                      {getEstoqueDisponivel(item.sku)} disponível
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SKU Selecionado e Quantidade */}
        {selectedSku && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SKU Selecionado
              </label>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <span className="font-medium text-red-800">{selectedSku}</span>
                <div className="text-sm text-red-600">
                  {getEstoqueDisponivel(selectedSku)} unidades disponíveis
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantidade
              </label>
              <input
                type="number"
                min="1"
                max={getEstoqueDisponivel(selectedSku)}
                value={quantidade}
                onChange={(e) => setQuantidade(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={adicionarSaida}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Minus className="h-5 w-5 mx-auto" />
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
            placeholder="Observação sobre esta saída..."
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Lista de Saídas Pendentes */}
      {saidas.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Saídas Pendentes ({saidas.length})
            </h2>
            <div className="text-sm text-gray-600">
              Total: <span className="font-medium text-red-600">{totalQuantidade} unidades</span>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {saidas.map((saida, index) => {
              const MotivoIcon = motivosOptions.find(m => m.value === saida.motivo)?.icon || Package
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-lg bg-red-100 text-red-600">
                      <MotivoIcon className="h-4 w-4" />
                    </div>
                    
                    <div>
                      <span className="font-medium text-gray-900">{saida.sku}</span>
                      <div className="text-sm text-gray-500">
                        -{saida.quantidade} unidades • {motivosOptions.find(m => m.value === saida.motivo)?.label}
                        {saida.observacao && ` • ${saida.observacao}`}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => removerSaida(index)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    ×
                  </button>
                </motion.div>
              )
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={processarSaidas}
              disabled={processando}
              className="w-full flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processando ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processando...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Processar Saídas ({saidas.length})
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Informações */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
          <div className="text-sm text-red-800">
            <p className="font-medium mb-1">Atenção:</p>
            <ul className="space-y-1">
              <li>• Verifique sempre a quantidade disponível antes de processar</li>
              <li>• As saídas são definitivas e não podem ser desfeitas</li>
              <li>• Todas as movimentações são registradas no histórico</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EstoqueSaida
