import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
// ADICIONADO "Zap" NA LINHA ABAIXO
import {Home, Package, ShoppingCart, BarChart3, Calendar, Factory, Warehouse, Box, DollarSign, UserCheck, Car, LogOut, ChevronDown, ChevronRight, ClipboardList, FileText, Truck, ListChecks, ClipboardCheck, Tags, AreaChart, BarChartHorizontal, CalendarDays, Hash, Split, MapPin, Waypoints, Shapes, Search, GanttChartSquare, FilePlus2, Building2, UserSquare, MonitorPlay, Users, Tag, Ticket, Move, Layers, UserPlus, Clock, UserX, FileHeart, Plane, Cake, CalendarCheck, Wrench, Route, Menu as MenuIcon, X, Settings, Download, ArrowUp, ArrowDown, Zap} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

// Interface para os submenus
interface SubMenuItem {
  title: string;
  path: string;
  icon: React.ReactNode;
}

// Interface para os itens do menu principal, agora recebendo o estado 'isCollapsed'
interface MenuItemProps {
  title: string;
  icon: React.ReactNode;
  path?: string;
  children?: SubMenuItem[];
  isCollapsed: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ title, icon, path, children, isCollapsed }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const handleToggle = () => {
    if (!isCollapsed) {
      setIsOpen(!isOpen);
    }
  };
  
  const isActive = path ? location.pathname === path :
    children?.some(child => location.pathname === child.path);

  if (children) {
    return (
      <div>
        <button
          onClick={handleToggle}
          className={`w-full flex items-center text-left transition-colors duration-200 ${
            isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
          } ${isCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-4 py-3'}`}
        >
          <div className="flex items-center">
            {icon}
            {!isCollapsed && <span className="ml-3 font-medium">{title}</span>}
          </div>
          {!isCollapsed && (isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
        </button>
        
        {isOpen && !isCollapsed && (
          <div className="bg-gray-50">
            {children.map((child) => (
              <Link
                key={child.path}
                to={child.path}
                className={`flex items-center pl-12 pr-4 py-2 text-sm transition-colors duration-200 ${
                  location.pathname === child.path ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {child.icon}
                <span className="ml-2">{child.title}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      to={path!}
      className={`flex items-center transition-colors duration-200 ${
        isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
      } ${isCollapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'}`}
      title={isCollapsed ? title : undefined}
    >
      {icon}
      {!isCollapsed && <span className="ml-3 font-medium">{title}</span>}
    </Link>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const iconSize = { className: "h-4 w-4" };

  const menuItems: Omit<MenuItemProps, 'isCollapsed'>[] = [
    { title: 'Dashboard', icon: <Home className="h-5 w-5" />, path: '/' },
    { title: 'Produtos', icon: <Package className="h-5 w-5" />, path: '/produtos' },
    {
      title: 'Marketplace', icon: <ShoppingCart className="h-5 w-5" />,
      children: [
        { title: 'Pedidos', path: '/marketplace/pedidos', icon: <ClipboardList {...iconSize} /> },
        { title: 'Nota Fiscal', path: '/marketplace/nota-fiscal', icon: <FileText {...iconSize} /> },
        { title: 'Logística', path: '/marketplace/logistica', icon: <Truck {...iconSize} /> },
        { title: 'Lista de Separação', path: '/marketplace/ListaSeparacao', icon: <ListChecks {...iconSize} /> },
        { title: 'Checklist', path: '/marketplace/checklist', icon: <ClipboardCheck {...iconSize} /> },
        { title: 'Processamento de Pedido', path: '/marketplace/processamento-pedido', icon: <Zap {...iconSize} /> },
      ]
    },
    {
      title: 'Vendas', icon: <BarChart3 className="h-5 w-5" />,
      children: [
        { title: 'Visão Geral de Vendas', path: '/vendas', icon: <AreaChart {...iconSize} /> },
        { title: 'Relatório Geral', path: '/vendas/relatorio-geral', icon: <BarChartHorizontal {...iconSize} /> },
        { title: 'Comparação Mensal', path: '/vendas/comparacao-mensal', icon: <CalendarDays {...iconSize} /> },
        { title: 'Comparativo Modelo', path: '/vendas/comparativo-7-digitos', icon: <Hash {...iconSize} /> },
        { title: 'Comparativo Linha', path: '/vendas/comparativo-linha', icon: <Split {...iconSize} /> },
        { title: 'Vendas por Estado', path: '/vendas/por-estado', icon: <MapPin {...iconSize} /> },
        { title: 'Vendas por Linha', path: '/vendas/por-linha', icon: <Waypoints {...iconSize} /> },
        { title: 'Vendas por Modelo', path: '/vendas/por-modelo', icon: <Shapes {...iconSize} /> }
      ]
    },
    {
      title: 'Planejamento', icon: <Calendar className="h-5 w-5" />,
      children: [
        { title: 'Pré-pedido', path: '/pre-pedido', icon: <FilePlus2 {...iconSize} /> },
        { title: 'Pedido Manual', path: '/planejamento/pedido-manual', icon: <ClipboardList {...iconSize} /> },
        { title: 'Análise de Demanda', path: '/analise-demanda-planejamento', icon: <Search {...iconSize} /> },
        { title: 'Estoque Entrada', path: '/estoque/entrada', icon: <ArrowUp {...iconSize} /> },
        { title: 'Estoque Saída', path: '/estoque/saida', icon: <ArrowDown {...iconSize} /> },
        { title: 'Cronograma Interno', path: '/planejamento/cronograma-interno', icon: <GanttChartSquare {...iconSize} /> },
        { title: 'Acompanhamento Externo', path: '/planejamento/acompanhamento-externo', icon: <Building2 {...iconSize} /> },
        { title: 'Fornecedor', path: '/planejamento/fornecedor', icon: <UserSquare {...iconSize} /> },
      ]
    },
    {
      title: 'Produção', icon: <Factory className="h-5 w-5" />,
      children: [
        { title: 'Acompanhamento Interno', path: '/producao/acompanhamento-interno', icon: <MonitorPlay {...iconSize} /> },
        { title: 'Acompanhamento Terceiro', path: '/producao/acompanhamento-terceiro', icon: <Users {...iconSize} /> },
        { title: 'Etiqueta Modelo Full Agrupado', path: '/producao/etiqueta-full-agrupado', icon: <Tag {...iconSize} /> },
        { title: 'Etiqueta Modelo Padrão', path: '/producao/etiqueta-padrao', icon: <Tag {...iconSize} /> },
        { title: 'Rótulo Romaneio Interno', path: '/producao/rotulo-romaneio-interno', icon: <Ticket {...iconSize} /> },
        { title: 'Rótulo Romaneio Terceiro', path: '/producao/rotulo-romaneio-terceiro', icon: <Ticket {...iconSize} /> },
        { title: 'Movimentação Interna', path: '/producao/movimentacao-interna', icon: <Move {...iconSize} /> },
        { title: 'Movimentação Externa', path: '/producao/movimentacao-externa', icon: <Move {...iconSize} /> }
      ]
    },
    { title: 'Estoque', icon: <Warehouse className="h-5 w-5" />, path: '/estoque' },
    {
      title: 'Almoxarifado', icon: <Box className="h-5 w-5" />,
      children: [
        { title: 'Enfite', path: '/almoxarifado/enfite', icon: <Layers {...iconSize} /> },
        { title: 'Tecido', path: '/almoxarifado/tecido', icon: <Layers {...iconSize} /> },
        { title: 'Linha', path: '/almoxarifado/linha', icon: <Layers {...iconSize} /> },
        { title: 'Cola', path: '/almoxarifado/cola', icon: <Layers {...iconSize} /> },
        { title: 'Sola', path: '/almoxarifado/sola', icon: <Layers {...iconSize} /> }
      ]
    },
    { title: 'Financeiro', icon: <DollarSign className="h-5 w-5" />, path: '/financeiro' },
    {
      title: 'RH', icon: <UserCheck className="h-5 w-5" />,
      children: [
        { title: 'Recursos Humanos Resumos', path: '/rh/resumos', icon: <BarChart3 {...iconSize} /> },
        { title: 'Cadastro de Colaborador', path: '/rh/cadastro-colaborador', icon: <UserPlus {...iconSize} /> },
        { title: 'Importação Manual Relógio', path: '/rh/importacao-relogio', icon: <Clock {...iconSize} /> },
        { title: 'Lançamento Falta', path: '/rh/lancamento-falta', icon: <UserX {...iconSize} /> },
        { title: 'Lançamento Atestado', path: '/rh/lancamento-atestado', icon: <FileHeart {...iconSize} /> },
        { title: 'Relatório Média de Falta', path: '/rh/relatorio-media-falta', icon: <BarChart3 {...iconSize} /> },
        { title: 'Relatório Média de Atestado', path: '/rh/relatorio-media-atestado', icon: <BarChart3 {...iconSize} /> },
        { title: 'Relatório Média de Presença', path: '/rh/relatorio-media-presenca', icon: <BarChart3 {...iconSize} /> },
        { title: 'Férias', path: '/rh/ferias', icon: <Plane {...iconSize} /> },
        { title: 'Aniversários do Mês', path: '/rh/aniversarios', icon: <Cake {...iconSize} /> },
        { title: 'Fechamento Mensal', path: '/rh/fechamento-mensal', icon: <CalendarCheck {...iconSize} /> },
        { title: 'Vale', path: '/rh/vale', icon: <DollarSign {...iconSize} /> },
        { title: 'Hora Extra', path: '/rh/hora-extra', icon: <Clock {...iconSize} /> },
        { title: 'Cesta Básica', path: '/rh/cesta-basica', icon: <Package {...iconSize} /> }
      ]
    },
    {
      title: 'Veículo', icon: <Car className="h-5 w-5" />,
      children: [
        { title: 'Cadastro de Veículo', path: '/veiculo/cadastro', icon: <Car {...iconSize} /> },
        { title: 'Lançamento de Revisão', path: '/veiculo/lancamento-revisao', icon: <Wrench {...iconSize} /> },
        { title: 'Movimentação Veículo', path: '/veiculo/movimentacao', icon: <Route {...iconSize} /> },
        { title: 'Documento Veículo', path: '/veiculo/documento', icon: <FileText {...iconSize} /> }
      ]
    },
    { title: 'Etiquetas', icon: <Package className="h-5 w-5" />, path: '/etiquetas' },
    { title: 'Relatórios', icon: <BarChart3 className="h-5 w-5" />, path: '/relatorios' },
    {
      title: 'Configuração', icon: <Settings className="h-5 w-5" />,
      children: [
        { title: 'Importação Manual', path: '/importacao-manual', icon: <Download {...iconSize} /> },
        { title: 'Testar Link de Etiqueta', path: '/importar-etiqueta', icon: <Tags {...iconSize} /> },
      ]
    }
  ];

  const userName = user?.name || user?.email.split('@')[0];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar para Desktop e Tablets */}
      <div className={`hidden md:flex flex-col bg-white shadow-lg transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="p-4 border-b flex items-center justify-between">
            {!isCollapsed && (
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Sistema ERP</h1>
                    <p className="text-sm text-gray-600">Gestão Industrial</p>
                </div>
            )}
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 rounded-md hover:bg-gray-200">
                 {isCollapsed ? <MenuIcon /> : <X />}
            </button>
        </div>
        <nav className="mt-2 flex-1 overflow-y-auto">
          {menuItems.map((item, index) => (
            <MenuItem key={index} {...item} isCollapsed={isCollapsed} />
          ))}
        </nav>
      </div>
      
      {/* Overlay para fechar menu mobile */}
      <div className={`fixed inset-0 z-30 bg-black bg-opacity-50 transition-opacity md:hidden ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsMobileMenuOpen(false)}></div>
      
      {/* Sidebar para Mobile */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out md:hidden flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Sistema ERP</h1>
            <p className="text-sm text-gray-600">Gestão Industrial</p>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-600 hover:text-gray-800">
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="mt-6 flex-1 overflow-y-auto pb-6">
          {menuItems.map((item, index) => (
            <MenuItem key={index} {...item} isCollapsed={false} />
          ))}
        </nav>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-gray-600 hover:text-gray-800">
              <MenuIcon className="h-6 w-6" />
            </button>
            <div className='hidden md:block'>
              <h2 className="text-lg font-semibold text-gray-800">Sistema de Gestão Industrial</h2>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600 text-right">
                <span className="md:hidden font-medium">Olá, {userName}</span>
                <div className="hidden md:block">
                  <p className="font-medium">{user?.name || 'Usuário Anônimo'}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>
              <button onClick={handleLogout} className="flex items-center text-gray-600 hover:text-gray-800 transition-colors" title="Sair">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;