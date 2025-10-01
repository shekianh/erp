
import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "react-hot-toast"
import Layout from "./components/Layout"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Dashboard from "./pages/Dashboard"
import Produtos from "./pages/Produtos"
import Vendas from "./pages/Vendas"
import Estoque from "./pages/Estoque"
import EstoqueEntrada from "./pages/EstoqueEntrada"
import EstoqueSaida from "./pages/EstoqueSaida"
import Financeiro from "./pages/Financeiro"
import RH from "./pages/RH"
import RHResumos from "./pages/RHResumos"
import Producao from "./pages/Producao"
import ProducaoAcompanhamentoInterno from "./pages/ProducaoAcompanhamentoInterno"
import PlanejamentoCronogramaInterno from "./pages/PlanejamentoCronogramaInterno"
import PrePedido from "./pages/PrePedido"
import PlanejamentoPedidoManual from "./pages/PlanejamentoPedidoManual"
import AnalisedemandaPlanejamento from "./pages/AnalisedemandaPlanejamento"
import MarketplacePedidos from "./pages/MarketplacePedidos"
import MarketplaceNotaFiscal from "./pages/MarketplaceNotaFiscal"
import MarketplaceLogistica from "./pages/MarketplaceLogistica"
import MarketplaceListaSeparacao from "./pages/MarketplaceListaSeparacao"
import ProcessamentoPedido from "./pages/ProcessamentoPedido"
import MarketplaceChecklist from "./pages/MarketplaceChecklist"
import VendasRelatorioGeral from "./pages/VendasRelatorioGeral"
import VendasComparacaoMensal from "./pages/VendasComparacaoMensal"
import VendasComparativo7Digitos from "./pages/VendasComparativo7Digitos"
import VendasComparativoLinha from "./pages/VendasComparativoLinha"
import VendasPorEstado from "./pages/VendasPorEstado"
import VendasPorLinha from "./pages/VendasPorLinha"
import VendasPorModelo from "./pages/VendasPorModelo"
import AlmoxarifadoEnfite from "./pages/AlmoxarifadoEnfite"
import VeiculoCadastro from "./pages/VeiculoCadastro"
import Etiquetas from "./pages/Etiquetas"
import Relatorios from "./pages/Relatorios"
import ImportacaoManual from "./pages/ImportacaoManual"
import ImportarEtiquetaManual from "./pages/ImportarEtiquetaManual"
import ImportadorFotos from "./pages/ImportadorFotos"
import ProtectedRoute from "./components/ProtectedRoute"
import ErrorBoundary from "./components/ErrorBoundary"

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/produtos" element={<Produtos />} />
                    <Route path="/vendas" element={<Vendas />} />
                    <Route path="/vendas/relatorio-geral" element={<VendasRelatorioGeral />} />
                    <Route path="/vendas/comparacao-mensal" element={<VendasComparacaoMensal />} />
                    <Route path="/vendas/comparativo-7-digitos" element={<VendasComparativo7Digitos />} />
                    <Route path="/vendas/comparativo-linha" element={<VendasComparativoLinha />} />
                    <Route path="/vendas/por-estado" element={<VendasPorEstado />} />
                    <Route path="/vendas/por-linha" element={<VendasPorLinha />} />
                    <Route path="/vendas/por-modelo" element={<VendasPorModelo />} />
                    <Route path="/estoque" element={<Estoque />} />
                    <Route path="/estoque/entrada" element={<EstoqueEntrada />} />
                    <Route path="/estoque/saida" element={<EstoqueSaida />} />
                    <Route path="/financeiro" element={<Financeiro />} />
                    <Route path="/rh" element={<RH />} />
                    <Route path="/rh/resumos" element={<RHResumos />} />
                    <Route path="/producao" element={<Producao />} />
                    <Route path="/producao/acompanhamento-interno" element={<ProducaoAcompanhamentoInterno />} />
                    <Route path="/planejamento/cronograma-interno" element={<PlanejamentoCronogramaInterno />} />
                    <Route path="/pre-pedido" element={<PrePedido />} />
                    <Route path="/planejamento/pedido-manual" element={<PlanejamentoPedidoManual />} />
                    <Route path="/analise-demanda-planejamento" element={<AnalisedemandaPlanejamento />} />
                    <Route path="/marketplace/pedidos" element={<MarketplacePedidos />} />
                    <Route path="/marketplace/nota-fiscal" element={<MarketplaceNotaFiscal />} />
                    <Route path="/marketplace/logistica" element={<MarketplaceLogistica />} />
                    <Route path="/marketplace/ListaSeparacao" element={<MarketplaceListaSeparacao />} />
                    <Route path="/marketplace/checklist" element={<MarketplaceChecklist />} />
                    <Route path="/marketplace/processamento-pedido" element={<ProcessamentoPedido />} />
                    <Route path="/almoxarifado/enfite" element={<AlmoxarifadoEnfite />} />
                    <Route path="/veiculo/cadastro" element={<VeiculoCadastro />} />
                    <Route path="/etiquetas" element={<Etiquetas />} />
                    <Route path="/relatorios" element={<Relatorios />} />
                    <Route path="/importacao-manual" element={<ImportacaoManual />} />
                    <Route path="/importador-fotos" element={<ImportadorFotos />} />
                    <Route path="/importar-etiqueta" element={<ImportarEtiquetaManual />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
          <Toaster position="top-right" />
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App
