
# Sistema Integrado de Gestão - ERP SHEKINAH

Sistema completo de gestão para e-commerce e indústria, desenvolvido com React, TypeScript e Supabase.

## 🚀 Funcionalidades

- **Dashboard Analítico**: Visão geral do negócio com métricas em tempo real
- **Gestão de Vendas**: Controle completo de pedidos e notas fiscais
- **Catálogo de Produtos**: Cadastro com fotos, SKUs automáticos e agrupamento
- **Controle de Estoque**: Monitoramento em tempo real com importação via Excel
- **Produção**: Gestão de ordens de produção e planejamento
- **Recursos Humanos**: Controle de funcionários e folha de pagamento
- **Financeiro**: Fluxo de caixa e controle financeiro
- **Relatórios**: Análises detalhadas com exportação para Excel
- **Etiquetas**: Geração automática de etiquetas de envio
- **Importador de Fotos**: Atualização em lote de fotos dos produtos

## 🛠️ Tecnologias

- **Frontend**: React 18, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express.js, Supabase
- **Banco de Dados**: PostgreSQL (via Supabase)
- **Autenticação**: Supabase Auth
- **Build**: Vite
- **Ícones**: Lucide React
- **Notificações**: React Hot Toast

## 📦 Instalação

1. **Clone o repositório**
```bash
git clone [url-do-repositorio]
cd sistema-gestao-integrado
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

4. **Inicie o desenvolvimento**

**Para desenvolvimento frontend:**
```bash
npm run dev
```

**Para rodar o backend (em terminal separado):**
```bash
npm run server
```

**Para produção:**
```bash
npm start
```

## 🖼️ Importador de Fotos

O sistema inclui um importador de fotos que permite atualizar imagens dos produtos em lote:

### Como usar:

1. **Inicie o backend Express** (em um terminal separado)
```bash
npm run server
```

2. **Inicie o frontend** (em outro terminal)
```bash
npm run dev
```

3. **Acesse a aba Produtos no sistema**

4. **Clique em "Importar Fotos"**

5. **Selecione as imagens**
   - Arquivos devem estar no formato .jpg
   - O nome do arquivo (sem extensão) deve corresponder ao SKU Pai do produto
   - Exemplo: `081.001.004.jpg` atualizará todos os produtos com SKU Pai `081.001.004`

6. **Execute a importação**
   - O sistema converterá as imagens para base64
   - Enviará para o backend via API
   - Atualizará todos os registros correspondentes no banco

### API Endpoints:

- `POST /api/update-image` - Atualiza foto de um produto por SKU Pai
- `GET /api/status` - Verifica status do servidor e conexão com Supabase
- `GET /api/product/:skuPai` - Busca informações de um produto específico

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── Layout.tsx       # Layout principal
│   ├── ImportadorFotos.tsx  # Importador de fotos
│   └── ...
├── pages/              # Páginas da aplicação
│   ├── Dashboard.tsx   # Dashboard principal
│   ├── Produtos.tsx    # Gestão de produtos
│   ├── Vendas.tsx      # Gestão de vendas
│   └── ...
├── lib/                # Utilitários e configurações
│   ├── supabase.ts     # Cliente Supabase
│   └── database.ts     # Funções do banco
├── hooks/              # Hooks customizados
│   └── useAuth.ts      # Hook de autenticação
└── entities/           # Schemas do banco (MongoDB/Lumi)
    ├── produtos.json
    ├── vendas.json
    └── ...
```

## 🔧 Configuração do Supabase

1. **Crie um projeto no Supabase**
2. **Configure as tabelas necessárias**
3. **Atualize as variáveis de ambiente**
4. **Configure as políticas RLS (Row Level Security)**

### Tabelas principais:

- `produtos` - Catálogo de produtos
- `pedido_vendas` - Pedidos de venda
- `nota_fiscal` - Notas fiscais
- `item_pedido_vendas` - Itens dos pedidos
- `estoque_geral` - Estoque geral
- `estoque_pronto` - Estoque de produtos prontos

## 🚀 Deploy

### Frontend (Vite)
```bash
npm run build
# Deploy da pasta 'dist' para seu servidor
```

### Backend (Express)
```bash
# Configure as variáveis de ambiente em produção
# Execute o servidor
npm start
```

## 📊 Funcionalidades Detalhadas

### Gestão de Produtos
- Cadastro com SKU automático
- Upload de fotos em base64
- Agrupamento por SKU Pai
- Geração automática para todos os tamanhos
- Importação em lote de fotos

### Controle de Vendas
- Integração com Bling API
- Mapeamento automático de lojas
- Status padronizados
- Relatórios comparativos

### Análise de Dados
- Dashboard com métricas em tempo real
- Relatórios por estado, linha, modelo
- Comparações mensais
- Exportação para Excel

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para suporte e dúvidas, entre em contato através do email: suporte@shekinahcalcados.com.br
