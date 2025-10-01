import React, { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, Loader2 } from 'lucide-react'
import { supabase, invalidarCacheEstoque } from '../lib/supabase'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx' // Importar a biblioteca xlsx

interface ImportadorEstoqueProps {
  onClose: () => void
}

const ImportadorEstoque: React.FC<ImportadorEstoqueProps> = ({ onClose }) => {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const adicionarLog = (mensagem: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${mensagem}`])
  }

  // Função auxiliar para extrair apenas números (equivalente ao get_numeric_part do Python)
  const getNumericPart = (text: any): string => {
    if (typeof text !== 'string') return ""
    return text.replace(/\D/g, '')
  }

  // Função de processamento do Excel, agora replicando a lógica do Python
  const processarDadosExcel = (
    data: any[][], 
    linha_chave: string, 
    offset_quantidade: number
  ): { sku: string; quantidade: number }[] => {
    const dados_consolidados = new Map<string, number>()

    for (let i = 0; i < data.length; i++) {
      const linha_modelo_raw = data[i]?.[0]
      
      if (linha_modelo_raw && typeof linha_modelo_raw === 'string') {
        const linha_dados_raw = data[i + offset_quantidade]?.[0]
        
        if (linha_dados_raw && typeof linha_dados_raw === 'string' && linha_dados_raw.includes(linha_chave)) {
          const model_text = data[i]?.[0]
          const color_text = data[i + 1]?.[0]

          const model_part = getNumericPart(model_text.split(' - ')[0])
          const color_part = getNumericPart(color_text.split(' - ')[0])

          const formatted_model_part = model_part.length > 3 
            ? `${model_part.substring(0, 3)}.${model_part.substring(3)}` 
            : model_part

          if (!formatted_model_part || !color_part) {
            i += 9 // Pula o bloco se não encontrar dados válidos
            continue
          }

          const base_code = `${formatted_model_part}.${color_part}`
          const linha_tamanhos = data[i + 2] || []
          const linha_quantidades = data[i + offset_quantidade] || []

          // Itera pelas colunas (de 1 a 7 para os tamanhos)
          for (let k = 1; k < 8; k++) {
            const tamanho = linha_tamanhos[k]
            const quantidade = linha_quantidades[k]

            if (tamanho && quantidade) {
              try {
                const qtd_num = parseInt(String(quantidade), 10)
                if (!isNaN(qtd_num) && qtd_num > 0) {
                  const tamanho_str = String(parseInt(String(tamanho), 10))
                  const sku_final = `${base_code}-${tamanho_str}`
                  
                  const quantidade_existente = dados_consolidados.get(sku_final) || 0
                  dados_consolidados.set(sku_final, quantidade_existente + qtd_num)
                }
              } catch (e) {
                // Ignora erros de conversão
              }
            }
          }
          i += 9 // Pula para o próximo bloco de produto
        }
      }
    }
    
    return Array.from(dados_consolidados, ([sku, quantidade]) => ({ sku, quantidade }))
  }

  const processarArquivoXLS = async (file: File): Promise<{ geral: any[]; pronto: any[] }> => {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 })
    
    adicionarLog("📄 Arquivo Excel lido, iniciando processamento...")

    adicionarLog("⚙️ Processando Estoque Geral ([G] Saldo)...")
    const dados_geral = processarDadosExcel(data, "[G] Saldo", 9)
    adicionarLog(`  -> ${dados_geral.length} SKUs encontrados para Estoque Geral.`)

    adicionarLog("⚙️ Processando Estoque Pronto ([C] Disponível)...")
    const dados_pronto = processarDadosExcel(data, "[C] Disponível", 5)
    adicionarLog(`  -> ${dados_pronto.length} SKUs encontrados para Estoque Pronto.`)

    return { geral: dados_geral, pronto: dados_pronto }
  }

  const enviarParaSupabase = async (dados: any[], nome_tabela: 'estoque_geral' | 'estoque_pronto'): Promise<boolean> => {
    if (!dados || dados.length === 0) {
      adicionarLog(`🟡 Nenhum dado para atualizar na tabela ${nome_tabela}.`)
      return true // Retorna sucesso pois não havia nada a fazer
    }

    try {
      const dadosFormatados = dados.map(item => ({
        sku: item.sku,
        quantidade: Number(item.quantidade) || 0,
      }))

      adicionarLog(`📤 Enviando ${dadosFormatados.length} registros para ${nome_tabela}...`)
      const { error } = await supabase
        .from(nome_tabela)
        .upsert(dadosFormatados, { onConflict: 'sku' })

      if (error) {
        throw new Error(`Erro no ${nome_tabela}: ${error.message}`)
      }

      adicionarLog(`✅ Tabela ${nome_tabela} atualizada com sucesso!`)
      return true
    } catch (error) {
      console.error(`Erro ao importar para ${nome_tabela}:`, error)
      adicionarLog(`❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      return false
    }
  }

  const handleImportar = async () => {
    if (!arquivo) {
      toast.error('Selecione um arquivo primeiro')
      return
    }

    setLoading(true)
    setLogs([])
    adicionarLog('🚀 Iniciando processo de importação...')

    try {
      // 1. Processar o arquivo para extrair ambos os tipos de estoque
      const { geral, pronto } = await processarArquivoXLS(arquivo)
      
      if (geral.length === 0 && pronto.length === 0) {
        throw new Error('Nenhum dado de estoque ([G] Saldo ou [C] Disponível) foi encontrado no arquivo.')
      }
      
      // 2. Enviar dados para as tabelas correspondentes
      const sucessoGeral = await enviarParaSupabase(geral, 'estoque_geral')
      const sucessoPronto = await enviarParaSupabase(pronto, 'estoque_pronto')
      
      if (sucessoGeral && sucessoPronto) {
        adicionarLog('🎉 Importação concluída com sucesso!')
        toast.success('Ambos os estoques foram atualizados!')
        invalidarCacheEstoque()
        
        setTimeout(() => onClose(), 2000)
      } else {
        throw new Error('Falha ao enviar os dados para o banco de dados. Verifique os logs.')
      }
      
    } catch (error) {
      console.error('Erro na importação:', error)
      adicionarLog(`❌ Erro Crítico: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      toast.error('Ocorreu um erro na importação.')
    } finally {
      setLoading(false)
    }
  }

  // O resto do seu componente (JSX) permanece o mesmo...
  // Apenas as funções de lógica acima foram alteradas.

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileSpreadsheet className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Importador de Estoque Unificado
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Processa "Estoque Geral" e "Estoque Pronto" do mesmo arquivo XLS.
          </p>
        </div>
        
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Arquivo Excel (.xls / .xlsx)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="flex text-sm text-gray-600 justify-center">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                    <span>Selecionar arquivo</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xls,.xlsx"
                      onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                      className="sr-only"
                    />
                  </label>
                  <p className="pl-1">ou arraste e solte</p>
                </div>
                <p className="text-xs text-gray-500">XLS, XLSX até 10MB</p>
              </div>
              
              {arquivo && (
                <div className="mt-4 flex items-center justify-center">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>{arquivo.name}</span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logs do Processo
            </label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 h-40 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500 text-sm">Aguardando início da importação...</p>
              ) : (
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div key={index} className="text-xs font-mono text-gray-700 break-words">
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleImportar}
            disabled={!arquivo || loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Importando...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Importar Estoques</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ImportadorEstoque