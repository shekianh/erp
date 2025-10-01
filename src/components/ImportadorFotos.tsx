import React, { useState } from 'react'
import { motion } from 'framer-motion'
// *** NOVO: Ícone de seta para o botão de voltar ***
import { Upload, Play, RefreshCw, CheckCircle, XCircle, ImageIcon, Folder, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
// *** NOVO: Hook para navegação ***
import { useNavigate } from 'react-router-dom'

// --- CONFIGURAÇÃO DO SUPABASE ---
const supabaseUrl = 'https://supabase.ia.shekinahcalcados.com.br'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE'
const nomeDaTabela = 'produtos'
const nomeColunaSkuPai = 'sku_pai' 

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey)
// ------------------------------------

interface ProcessResult {
  skuPai: string
  success: boolean
  message: string
  updatedCount?: number
}

const ImportadorFotos: React.FC = () => {
  // *** NOVO: Inicializa a função de navegação ***
  const navigate = useNavigate();

  const [filesToProcess, setFilesToProcess] = useState<File[]>([])
  const [logs, setLogs] = useState<string[]>([
    "🎯 Bem-vindo ao Atualizador de Fotos para Supabase!\n",
    "📁 Selecione uma pasta com imagens .jpg ou arquivos individuais para começar.\n",
    `💡 O nome do arquivo (sem extensão) deve corresponder ao '${nomeColunaSkuPai}' do produto no Supabase.\n`
  ])
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectionText, setSelectionText] = useState("Nenhuma seleção feita")
  const [results, setResults] = useState<ProcessResult[]>([])

  const log = (message: string) => {
    setLogs(prevLogs => [...prevLogs, message])
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    if (selectedFiles.length === 0) return

    const jpgFiles = selectedFiles.filter(file => 
      file.name.toLowerCase().endsWith('.jpg') || 
      file.name.toLowerCase().endsWith('.jpeg')
    )

    if (jpgFiles.length === 0) {
      toast.error("Nenhuma imagem .jpg (.jpeg) foi encontrada na seleção.")
      return
    }

    setFilesToProcess(jpgFiles)
    
    // @ts-ignore
    const isDirectory = event.target.webkitdirectory === true;
    if (isDirectory && jpgFiles.length > 0) {
        const folderName = jpgFiles[0].webkitRelativePath.split('/')[0];
        setSelectionText(`Pasta '${folderName}' com ${jpgFiles.length} imagem(ns)`);
    } else {
        setSelectionText(`${jpgFiles.length} imagem(ns) selecionada(s)`);
    }

    setResults([])
    
    log(`\n📂 Seleção: ${jpgFiles.length} imagens prontas para processar.`)
    log("📋 Arquivos selecionados:")
    jpgFiles.forEach((file, index) => {
      const skuPai = file.name.substring(0, file.name.toLowerCase().lastIndexOf('.'))
      log(`   ${index + 1}. ${file.name} → SKU Pai: ${skuPai}`)
    })
    log("")
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1]
        resolve(base64String)
      }
      reader.onerror = (error) => reject(error)
    })
  }

  const handleStartProcess = async () => {
    if (filesToProcess.length === 0) {
      toast.error("Nenhum arquivo foi selecionado.")
      return
    }

    setIsProcessing(true)
    setResults([])
    
    log("=" .repeat(60))
    log(`🚀 Iniciando atualização de ${filesToProcess.length} imagem(ns) para o Supabase...`)
    log("=" .repeat(60))

    const processResults: ProcessResult[] = []
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i]
      const fileName = file.name
      const skuPai = fileName.substring(0, fileName.toLowerCase().lastIndexOf('.'))

      log(`\n📸 [${i + 1}/${filesToProcess.length}] Processando: ${fileName}`)
      log(`   🔑 SKU Pai: ${skuPai}`)

      try {
        log(`   🔎 Buscando '${nomeColunaSkuPai}' no Supabase...`)
        const { data: existingProducts, error: selectError } = await supabase
          .from(nomeDaTabela)
          .select('id')
          .eq(nomeColunaSkuPai, skuPai)
        
        if (selectError) {
          throw new Error(`Erro na busca: ${selectError.message}`)
        }

        if (existingProducts && existingProducts.length > 0) {
          log(`   ✅ SKU Pai encontrado. Convertendo imagem para Base64...`)
          const fotoBase64 = await fileToBase64(file)

          log(`   📤 Atualizando ${existingProducts.length} registro(s)...`)
          const { data: updateData, error: updateError } = await supabase
            .from(nomeDaTabela)
            .update({ 'foto': fotoBase64 })
            .eq(nomeColunaSkuPai, skuPai)
            .select()

          if (updateError) {
            throw new Error(`Erro na atualização: ${updateError.message}`)
          }
          
          const updatedCount = updateData?.length || 0;
          const message = `SUCESSO! ${updatedCount} registro(s) atualizado(s).`
          log(`   ✅ ${message}`)
          processResults.push({ skuPai, success: true, message, updatedCount })
          successCount++

        } else {
          const message = `AVISO: Nenhum registro encontrado para o SKU Pai '${skuPai}'. Pulando.`
          log(`   ⚠️ ${message}`)
          processResults.push({ skuPai, success: false, message })
          errorCount++
        }

      } catch (error: any) {
        errorCount++
        const errorMessage = `ERRO CRÍTICO ao processar '${fileName}': ${error.message}`
        log(`   ❌ ${errorMessage}`)
        processResults.push({ skuPai, success: false, message: errorMessage })
      }
    }

    setResults(processResults)

    log("\n" + "=" .repeat(60))
    log("📊 RESUMO DO PROCESSAMENTO:")
    log(`   ✅ Sucessos (SKUs atualizados): ${successCount}`)
    log(`   ❌ Erros/Avisos (SKUs não encontrados ou falhas): ${errorCount}`)
    log(`   📊 Total de imagens processadas: ${filesToProcess.length}`)
    log("=" .repeat(60))
    log("🎉 Processo concluído!")

    setIsProcessing(false)
    
    if (successCount > 0) {
      toast.success(`${successCount} SKU(s) atualizado(s) com sucesso!`)
    }
    
    if (errorCount > 0) {
      toast.error(`${errorCount} erro(s) ou aviso(s) encontrado(s). Verifique o log.`)
    }
  }

  return (
    <div className="space-y-6">
      {/* *** NOVO: Header atualizado com botão de voltar *** */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/produtos')} // Altere '/produtos' para a sua rota correta
          className="p-2 text-gray-500 rounded-full hover:bg-gray-100 hover:text-gray-700 transition-colors"
          title="Voltar para Produtos"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Importador de Fotos para Supabase</h2>
          <p className="text-gray-600">
            Atualize fotos dos produtos em lote via SKU Pai
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Seleção de Arquivos</h3>
          <ImageIcon className="h-6 w-6 text-gray-400" />
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <input
              type="file"
              id="folder-input"
              accept=".jpg,.jpeg"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isProcessing}
              multiple
              // @ts-ignore
              webkitdirectory="true"
              directory="true"
            />
            <input
              type="file"
              id="file-input"
              multiple
              accept=".jpg,.jpeg"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isProcessing}
            />
            
            <label
              htmlFor="folder-input"
              className={`flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer transition-colors ${
                isProcessing
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Folder className="h-5 w-5 mr-2" />
              Selecionar Pasta
            </label>
            
            <label
              htmlFor="file-input"
              className={`flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer transition-colors ${
                isProcessing
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Upload className="h-5 w-5 mr-2" />
              Selecionar Imagens
            </label>

            <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 truncate">
              {selectionText}
            </div>
          </div>

          <button
            onClick={handleStartProcess}
            disabled={isProcessing || filesToProcess.length === 0}
            className={`w-full flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-colors ${
              isProcessing || filesToProcess.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Play className="h-5 w-5 mr-2" />
                Iniciar Atualização
              </>
            )}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resultados do Processamento</h3>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {results.map((result, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className="flex items-center">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mr-3" />
                  )}
                  <div>
                    <p className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                      SKU: {result.skuPai}
                    </p>
                    <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                      {result.message}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Log */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Log de Processamento</h3>
        
        <div className="bg-gray-900 text-green-400 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
          <pre className="whitespace-pre-wrap">
            {logs.join('\n')}
          </pre>
        </div>
      </div>
    </div>
  )
}

export default ImportadorFotos