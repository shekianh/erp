
import React, { useState, useRef } from 'react'
import { Upload, Image, X, Check, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface FotoImportada {
  id: string
  nome: string
  arquivo: File
  preview: string
  status: 'pendente' | 'processando' | 'sucesso' | 'erro'
  produtoId?: string
}

const ImportadorFotos: React.FC = () => {
  const [fotos, setFotos] = useState<FotoImportada[]>([])
  const [processando, setProcessando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const arquivos = event.target.files
    if (!arquivos) return

    const novasFotos: FotoImportada[] = []
    
    Array.from(arquivos).forEach((arquivo, index) => {
      if (arquivo.type.startsWith('image/')) {
        const foto: FotoImportada = {
          id: `foto_${Date.now()}_${index}`,
          nome: arquivo.name,
          arquivo,
          preview: URL.createObjectURL(arquivo),
          status: 'pendente'
        }
        novasFotos.push(foto)
      }
    })

    setFotos(prev => [...prev, ...novasFotos])
    toast.success(`${novasFotos.length} fotos adicionadas`)
  }

  const removerFoto = (id: string) => {
    setFotos(prev => {
      const foto = prev.find(f => f.id === id)
      if (foto?.preview) {
        URL.revokeObjectURL(foto.preview)
      }
      return prev.filter(f => f.id !== id)
    })
  }

  const processarFotos = async () => {
    if (fotos.length === 0) {
      toast.error('Adicione pelo menos uma foto')
      return
    }

    setProcessando(true)
    
    try {
      for (const foto of fotos) {
        setFotos(prev => prev.map(f => 
          f.id === foto.id ? { ...f, status: 'processando' } : f
        ))

        // Simular processamento da foto
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Simular sucesso/erro aleatório para demonstração
        const sucesso = Math.random() > 0.2
        
        setFotos(prev => prev.map(f => 
          f.id === foto.id 
            ? { 
                ...f, 
                status: sucesso ? 'sucesso' : 'erro',
                produtoId: sucesso ? `PROD_${Math.floor(Math.random() * 1000)}` : undefined
              } 
            : f
        ))
      }

      const sucessos = fotos.filter(f => f.status === 'sucesso').length
      toast.success(`${sucessos} fotos processadas com sucesso`)
      
    } catch (error) {
      console.error('Erro ao processar fotos:', error)
      toast.error('Erro durante o processamento')
    } finally {
      setProcessando(false)
    }
  }

  const limparTodas = () => {
    fotos.forEach(foto => {
      if (foto.preview) {
        URL.revokeObjectURL(foto.preview)
      }
    })
    setFotos([])
    toast.success('Todas as fotos foram removidas')
  }

  const getStatusIcon = (status: FotoImportada['status']) => {
    switch (status) {
      case 'pendente':
        return <Upload size={16} className="text-gray-500" />
      case 'processando':
        return <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
      case 'sucesso':
        return <Check size={16} className="text-green-500" />
      case 'erro':
        return <AlertCircle size={16} className="text-red-500" />
    }
  }

  const getStatusColor = (status: FotoImportada['status']) => {
    switch (status) {
      case 'pendente':
        return 'border-gray-300'
      case 'processando':
        return 'border-blue-300 bg-blue-50'
      case 'sucesso':
        return 'border-green-300 bg-green-50'
      case 'erro':
        return 'border-red-300 bg-red-50'
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Importador de Fotos
            </h1>
            <p className="text-gray-600">
              Faça upload de fotos de produtos para processamento automático
            </p>
          </div>

          <div className="p-6">
            {/* Área de Upload */}
            <div className="mb-6">
              <div
                onClick={() => inputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <Image size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Selecione as fotos dos produtos
                </h3>
                <p className="text-gray-500 mb-4">
                  Arraste e solte ou clique para selecionar arquivos
                </p>
                <div className="text-sm text-gray-400">
                  Formatos suportados: JPG, PNG, WEBP (máx. 10MB cada)
                </div>
              </div>
              
              <input
                ref={inputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Ações */}
            {fotos.length > 0 && (
              <div className="flex gap-3 mb-6">
                <button
                  onClick={processarFotos}
                  disabled={processando}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {processando ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Processar Fotos ({fotos.length})
                    </>
                  )}
                </button>
                
                <button
                  onClick={limparTodas}
                  disabled={processando}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 disabled:opacity-50"
                >
                  Limpar Todas
                </button>
              </div>
            )}

            {/* Lista de Fotos */}
            {fotos.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {fotos.map((foto) => (
                  <div
                    key={foto.id}
                    className={`border rounded-lg p-3 ${getStatusColor(foto.status)}`}
                  >
                    <div className="relative mb-3">
                      <img
                        src={foto.preview}
                        alt={foto.nome}
                        className="w-full h-32 object-cover rounded"
                      />
                      {!processando && (
                        <button
                          onClick={() => removerFoto(foto.id)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">
                          {foto.nome}
                        </span>
                        {getStatusIcon(foto.status)}
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        Tamanho: {(foto.arquivo.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                      
                      {foto.produtoId && (
                        <div className="text-xs text-green-600 font-medium">
                          Produto: {foto.produtoId}
                        </div>
                      )}
                      
                      {foto.status === 'erro' && (
                        <div className="text-xs text-red-600">
                          Erro no processamento
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Estado Vazio */}
            {fotos.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Image size={64} className="mx-auto mb-4 text-gray-300" />
                <p>Nenhuma foto selecionada</p>
                <p className="text-sm">Clique na área acima para adicionar fotos</p>
              </div>
            )}
          </div>
        </div>

        {/* Estatísticas */}
        {fotos.length > 0 && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {fotos.length}
              </div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {fotos.filter(f => f.status === 'pendente').length}
              </div>
              <div className="text-sm text-gray-500">Pendentes</div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {fotos.filter(f => f.status === 'sucesso').length}
              </div>
              <div className="text-sm text-gray-500">Processadas</div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {fotos.filter(f => f.status === 'erro').length}
              </div>
              <div className="text-sm text-gray-500">Erros</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ImportadorFotos
