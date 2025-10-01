
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Tag, 
  Printer, 
  Barcode, 
  Package,
  Truck,
  FileText,
  Download,
  Search,
  Plus,
  Eye,
  Settings
} from 'lucide-react'
import { entities } from '../lib/database'
import toast from 'react-hot-toast'

const Etiquetas: React.FC = () => {
  const [produtos, setProdutos] = useState<any[]>([])
  const [vendas, setVendas] = useState<any[]>([])
  const [ordensProducao, setOrdensProducao] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tipoEtiqueta, setTipoEtiqueta] = useState('produto')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const [produtosData, vendasData, producaoData] = await Promise.all([
        entities.produtos.list(),
        entities.vendas.list(),
        entities.ordens_producao.list()
      ])

      setProdutos(produtosData.list || [])
      setVendas(vendasData.list || [])
      setOrdensProducao(producaoData.list || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const tiposEtiqueta = [
    {
      id: 'produto',
      nome: 'Etiquetas de Produto',
      descricao: 'Etiquetas individuais com código de barras, nome e preço',
      icon: Tag,
      color: 'bg-blue-500'
    },
    {
      id: 'producao',
      nome: 'Etiquetas de Produção',
      descricao: 'Etiquetas para identificação nas etapas de fabricação',
      icon: Package,
      color: 'bg-green-500'
    },
    {
      id: 'romaneio',
      nome: 'Romaneio de Carga',
      descricao: 'Lista de itens para transporte e logística',
      icon: Truck,
      color: 'bg-purple-500'
    },
    {
      id: 'marketplace',
      nome: 'Etiquetas de Marketplace',
      descricao: 'Etiquetas de envio no padrão dos marketplaces',
      icon: FileText,
      color: 'bg-orange-500'
    }
  ]

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const handleSelectAll = () => {
    if (tipoEtiqueta === 'produto') {
      setSelectedItems(produtos.map(p => p.id))
    } else if (tipoEtiqueta === 'producao') {
      setSelectedItems(ordensProducao.map(o => o.id))
    } else if (tipoEtiqueta === 'romaneio' || tipoEtiqueta === 'marketplace') {
      setSelectedItems(vendas.map(v => v.id))
    }
  }

  const handleDeselectAll = () => {
    setSelectedItems([])
  }

  const generateEtiquetas = () => {
    if (selectedItems.length === 0) {
      toast.error('Selecione pelo menos um item para gerar etiquetas')
      return
    }

    setShowPreview(true)
    toast.success(`${selectedItems.length} etiqueta(s) gerada(s) com sucesso`)
  }

  const getFilteredData = () => {
    let data: any[] = []
    
    switch (tipoEtiqueta) {
      case 'produto':
        data = produtos.filter(p => 
          p.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        break
      case 'producao':
        data = ordensProducao.filter(o => 
          o.numeroOrdem?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.produtoId?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        break
      case 'romaneio':
      case 'marketplace':
        data = vendas.filter(v => 
          v.numeroVenda?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.cliente?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        break
    }
    
    return data
  }

  const renderEtiquetaProduto = (produto: any) => (
    <div className="bg-white border-2 border-gray-300 p-4 w-64 h-32 flex flex-col justify-between">
      <div>
        <div className="text-xs font-mono mb-1">{produto.codigo}</div>
        <div className="text-sm font-semibold mb-1 truncate">{produto.nome}</div>
      </div>
      <div>
        <div className="text-lg font-bold text-green-600 mb-1">
          R$ {produto.preco?.toFixed(2)}
        </div>
        <div className="bg-black text-white text-xs font-mono p-1 text-center">
          ||||| {produto.codigo} |||||
        </div>
      </div>
    </div>
  )

  const renderEtiquetaProducao = (ordem: any) => (
    <div className="bg-white border-2 border-gray-300 p-4 w-64 h-32 flex flex-col justify-between">
      <div>
        <div className="text-xs font-mono mb-1">OP: {ordem.numeroOrdem}</div>
        <div className="text-sm font-semibold mb-1">{ordem.produtoId}</div>
        <div className="text-xs text-gray-600">Qtd: {ordem.quantidade}</div>
      </div>
      <div>
        <div className="text-xs text-gray-600 mb-1">
          Prazo: {ordem.dataFimPrevista ? new Date(ordem.dataFimPrevista).toLocaleDateString('pt-BR') : '-'}
        </div>
        <div className="bg-black text-white text-xs font-mono p-1 text-center">
          ||||| {ordem.numeroOrdem} |||||
        </div>
      </div>
    </div>
  )

  const renderRomaneio = (venda: any) => (
    <div className="bg-white border border-gray-300 p-6 w-full">
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold">ROMANEIO DE CARGA</h3>
        <p className="text-sm text-gray-600">Venda: {venda.numeroVenda}</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm font-semibold">Cliente:</p>
          <p className="text-sm">{venda.cliente?.nome}</p>
          <p className="text-xs text-gray-600">{venda.cliente?.endereco}</p>
        </div>
        <div>
          <p className="text-sm font-semibold">Marketplace:</p>
          <p className="text-sm">{venda.marketplace}</p>
          <p className="text-xs text-gray-600">
            Data: {venda.dataVenda ? new Date(venda.dataVenda).toLocaleDateString('pt-BR') : '-'}
          </p>
        </div>
      </div>

      <table className="w-full text-sm border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 p-2 text-left">Item</th>
            <th className="border border-gray-300 p-2 text-center">Qtd</th>
            <th className="border border-gray-300 p-2 text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          {venda.itens?.map((item: any, index: number) => (
            <tr key={index}>
              <td className="border border-gray-300 p-2">{item.produtoId}</td>
              <td className="border border-gray-300 p-2 text-center">{item.quantidade}</td>
              <td className="border border-gray-300 p-2 text-right">
                R$ {item.subtotal?.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-100 font-semibold">
            <td className="border border-gray-300 p-2" colSpan={2}>Total</td>
            <td className="border border-gray-300 p-2 text-right">
              R$ {venda.valorTotal?.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>

      {venda.codigoRastreamento && (
        <div className="mt-4 text-center">
          <p className="text-sm">Código de Rastreamento:</p>
          <div className="bg-black text-white text-sm font-mono p-2 inline-block">
            {venda.codigoRastreamento}
          </div>
        </div>
      )}
    </div>
  )

  const renderEtiquetaMarketplace = (venda: any) => (
    <div className="bg-white border-2 border-gray-300 p-4 w-80 h-48">
      <div className="text-center mb-3">
        <div className="text-lg font-bold">{venda.marketplace}</div>
        <div className="text-sm text-gray-600">Etiqueta de Envio</div>
      </div>
      
      <div className="mb-3">
        <div className="text-xs text-gray-600">DESTINATÁRIO:</div>
        <div className="text-sm font-semibold">{venda.cliente?.nome}</div>
        <div className="text-xs">{venda.cliente?.endereco}</div>
      </div>

      <div className="mb-3">
        <div className="text-xs text-gray-600">PEDIDO:</div>
        <div className="text-sm font-mono">{venda.numeroVenda}</div>
      </div>

      {venda.codigoRastreamento && (
        <div className="text-center">
          <div className="bg-black text-white text-xs font-mono p-1">
            ||||| {venda.codigoRastreamento} |||||
          </div>
        </div>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const filteredData = getFilteredData()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Geração de Etiquetas</h1>
          <p className="text-gray-600">Criação de etiquetas para produção, produtos e envios</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={generateEtiquetas}
            disabled={selectedItems.length === 0}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Printer className="h-5 w-5 mr-2" />
            Gerar Etiquetas ({selectedItems.length})
          </button>
          
          <button className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            <Settings className="h-5 w-5 mr-2" />
            Configurações
          </button>
        </div>
      </div>

      {/* Tipos de Etiqueta */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiposEtiqueta.map((tipo) => {
          const Icon = tipo.icon
          return (
            <motion.div
              key={tipo.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setTipoEtiqueta(tipo.id)
                setSelectedItems([])
              }}
              className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                tipoEtiqueta === tipo.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-3 rounded-lg ${tipo.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                {tipoEtiqueta === tipo.id && (
                  <Eye className="h-5 w-5 text-blue-500" />
                )}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{tipo.nome}</h3>
              <p className="text-sm text-gray-600">{tipo.descricao}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Controles */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar itens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleSelectAll}
              className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
            >
              Selecionar Todos
            </button>
            <button
              onClick={handleDeselectAll}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              Desmarcar Todos
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Itens */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {tiposEtiqueta.find(t => t.id === tipoEtiqueta)?.nome}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Selecione os itens para gerar etiquetas
          </p>
        </div>
        
        <div className="p-6">
          {filteredData.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum item encontrado</h3>
              <p className="text-gray-500">Tente ajustar os filtros de busca.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredData.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleSelectItem(item.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedItems.includes(item.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleSelectItem(item.id)}
                        className="mr-3 h-4 w-4 text-blue-600 rounded"
                      />
                      {tipoEtiqueta === 'produto' && <Package className="h-5 w-5 text-gray-400" />}
                      {tipoEtiqueta === 'producao' && <Tag className="h-5 w-5 text-gray-400" />}
                      {(tipoEtiqueta === 'romaneio' || tipoEtiqueta === 'marketplace') && <Truck className="h-5 w-5 text-gray-400" />}
                    </div>
                  </div>
                  
                  <div>
                    {tipoEtiqueta === 'produto' && (
                      <>
                        <p className="font-medium text-gray-900">{item.nome}</p>
                        <p className="text-sm text-gray-600">{item.codigo}</p>
                        <p className="text-sm font-semibold text-green-600">
                          R$ {item.preco?.toFixed(2)}
                        </p>
                      </>
                    )}
                    
                    {tipoEtiqueta === 'producao' && (
                      <>
                        <p className="font-medium text-gray-900">{item.numeroOrdem}</p>
                        <p className="text-sm text-gray-600">Produto: {item.produtoId}</p>
                        <p className="text-sm text-gray-600">Qtd: {item.quantidade}</p>
                      </>
                    )}
                    
                    {(tipoEtiqueta === 'romaneio' || tipoEtiqueta === 'marketplace') && (
                      <>
                        <p className="font-medium text-gray-900">{item.numeroVenda}</p>
                        <p className="text-sm text-gray-600">{item.cliente?.nome}</p>
                        <p className="text-sm text-gray-600">{item.marketplace}</p>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Preview das Etiquetas ({selectedItems.length})
                </h3>
                <div className="flex space-x-3">
                  <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Download className="h-5 w-5 mr-2" />
                    Baixar PDF
                  </button>
                  <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    <Printer className="h-5 w-5 mr-2" />
                    Imprimir
                  </button>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {selectedItems.map((itemId) => {
                  const item = filteredData.find(d => d.id === itemId)
                  if (!item) return null
                  
                  return (
                    <div key={itemId} className="flex justify-center">
                      {tipoEtiqueta === 'produto' && renderEtiquetaProduto(item)}
                      {tipoEtiqueta === 'producao' && renderEtiquetaProducao(item)}
                      {tipoEtiqueta === 'romaneio' && renderRomaneio(item)}
                      {tipoEtiqueta === 'marketplace' && renderEtiquetaMarketplace(item)}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Etiquetas
