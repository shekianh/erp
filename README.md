
# Sistema Integrado de Gestão - ERP SHEKINAH

Sistema completo de gestão para e-commerce e indústria, desenvolvido com React, TypeScript e Supabase.

## 🚀 Demo

[Link para demonstração online](https://seu-dominio.com) (quando disponível)

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta no Supabase
- Servidor SFTP (para funcionalidade de etiquetas)

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
git clone https://github.com/seu-usuario/erp-shekinah.git
cd erp-shekinah
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

4. **Configure o Supabase**
   - Crie um projeto no [Supabase](https://supabase.com)
   - Execute as migrações SQL necessárias (veja seção Banco de Dados)
   - Atualize as variáveis `SUPABASE_URL` e `SUPABASE_KEY` no arquivo `.env`

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

## 🗄️ Banco de Dados

O sistema utiliza PostgreSQL via Supabase. As principais tabelas são:

### Tabelas Principais

```sql
-- Produtos
CREATE TABLE produtos (
  id SERIAL PRIMARY KEY,
  linha VARCHAR(10),
  modelo VARCHAR(20),
  cor VARCHAR(50),
  codigo_cor VARCHAR(10),
  tamanho VARCHAR(5),
  sku_pai VARCHAR(20),
  sku_filho VARCHAR(25),
  foto TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pedidos de Vendas
CREATE TABLE pedido_vendas (
  id_key SERIAL PRIMARY KEY,
  id_bling VARCHAR(20),
  numero VARCHAR(20),
  numeroloja VARCHAR(20),
  data TIMESTAMP,
  total DECIMAL(10,2),
  contato_nome VARCHAR(255),
  situacao_bling INTEGER,
  loja VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Estoque
CREATE TABLE estoque_geral (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(25) UNIQUE,
  quantidade INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE estoque_pronto (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(25) UNIQUE,
  quantidade INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Configuração RLS (Row Level Security)

```sql
-- Habilitar RLS nas tabelas
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_geral ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_pronto ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajuste conforme necessário)
CREATE POLICY "Permitir leitura para usuários autenticados" ON produtos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir leitura para usuários autenticados" ON pedido_vendas
  FOR SELECT TO authenticated USING (true);
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

## 🚀 Deploy

### Opção 1: Vercel (Recomendado para Frontend)

1. **Conecte seu repositório ao Vercel**
2. **Configure as variáveis de ambiente**
3. **Deploy automático a cada push**

### Opção 2: Netlify

1. **Conecte seu repositório ao Netlify**
2. **Configure build command**: `npm run build`
3. **Configure publish directory**: `dist`

### Opção 3: Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔧 Configuração de Produção

### Variáveis de Ambiente Obrigatórias

```bash
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua_chave_anonima

# Servidor (se usando backend)
PORT=3001
NODE_ENV=production

# SFTP (para etiquetas)
SFTP_HOST=seu_servidor_sftp
SFTP_USERNAME=usuario
SFTP_PASSWORD=senha
SFTP_REMOTE_PATH=/caminho/etiquetas/
```

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

## 🧪 Testes

```bash
# Executar testes
npm test

# Executar testes em modo watch
npm run test:watch

# Gerar relatório de cobertura
npm run test:coverage
```

## 📈 Monitoramento

O sistema inclui:
- Logs detalhados no console
- Tratamento de erros com React Error Boundary
- Notificações toast para feedback do usuário
- Cache otimizado para consultas frequentes

## 🔒 Segurança

- Autenticação via Supabase Auth
- Row Level Security (RLS) habilitado
- Validação de dados no frontend e backend
- Sanitização de inputs
- HTTPS obrigatório em produção

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

## 🤝 Contribuindo

1. **Fork o projeto**
2. **Crie uma branch para sua feature**
   ```bash
   git checkout -b feature/nova-funcionalidade
   ```
3. **Commit suas mudanças**
   ```bash
   git commit -m 'Adiciona nova funcionalidade'
   ```
4. **Push para a branch**
   ```bash
   git push origin feature/nova-funcionalidade
   ```
5. **Abra um Pull Request**

### Padrões de Código

- Use TypeScript para tipagem forte
- Siga as convenções do ESLint configurado
- Componentes funcionais com hooks
- Nomeação em português para domínio de negócio
- Comentários em português

### Estrutura de Commits

```
tipo(escopo): descrição

feat(produtos): adiciona importador de fotos em lote
fix(vendas): corrige cálculo de ticket médio
docs(readme): atualiza instruções de instalação
style(layout): ajusta responsividade do menu
refactor(estoque): otimiza consultas de estoque
test(vendas): adiciona testes para relatórios
```

## 🐛 Reportando Bugs

Ao reportar bugs, inclua:

1. **Descrição clara do problema**
2. **Passos para reproduzir**
3. **Comportamento esperado vs atual**
4. **Screenshots (se aplicável)**
5. **Informações do ambiente**:
   - Navegador e versão
   - Sistema operacional
   - Versão do Node.js

## 📋 Roadmap

- [ ] Integração com mais marketplaces
- [ ] App mobile React Native
- [ ] Relatórios avançados com BI
- [ ] Integração com ERPs externos
- [ ] API pública para integrações
- [ ] Módulo de CRM
- [ ] Gestão de fornecedores
- [ ] Controle de qualidade

## 🔗 Links Úteis

- [Documentação do Supabase](https://supabase.com/docs)
- [Guia do React](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Framer Motion](https://www.framer.com/motion/)

## 📊 Status do Projeto

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)


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

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para suporte e dúvidas, entre em contato através do email: suporte@shekinahcalcados.com.br

---

**Desenvolvido com ❤️ pela equipe Shekinah Calçados**