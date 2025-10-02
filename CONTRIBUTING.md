# Guia de Contribuição

Obrigado por considerar contribuir para o Sistema ERP Shekinah! 🎉

## 📋 Código de Conduta

Este projeto adere ao código de conduta. Ao participar, você deve manter este código.

## 🚀 Como Contribuir

### Reportando Bugs

1. **Verifique se o bug já foi reportado** nas [Issues](https://github.com/seu-usuario/erp-shekinah/issues)
2. **Use o template de bug report** ao criar uma nova issue
3. **Inclua informações detalhadas** sobre o ambiente e passos para reproduzir

### Sugerindo Funcionalidades

1. **Verifique se a funcionalidade já foi sugerida**
2. **Use o template de feature request**
3. **Descreva claramente** o problema que a funcionalidade resolve

### Desenvolvimento

#### Configuração do Ambiente

1. **Fork o repositório**
2. **Clone seu fork**
   ```bash
   git clone https://github.com/seu-usuario/erp-shekinah.git
   cd erp-shekinah
   ```
3. **Instale dependências**
   ```bash
   npm install
   ```
4. **Configure variáveis de ambiente**
   ```bash
   cp .env.example .env
   # Edite .env com suas configurações
   ```
5. **Inicie o desenvolvimento**
   ```bash
   npm run dev
   ```

#### Padrões de Código

##### TypeScript
- Use tipagem forte sempre que possível
- Evite `any` - prefira `unknown` quando necessário
- Crie interfaces para objetos complexos

##### React
- Componentes funcionais com hooks
- Use `React.FC` para tipagem de componentes
- Prefira hooks customizados para lógica reutilizável

##### Estilo
- Use Tailwind CSS para estilização
- Mantenha consistência visual
- Implemente responsividade mobile-first

##### Nomeação
- **Arquivos**: PascalCase para componentes, camelCase para utilitários
- **Variáveis**: camelCase em inglês para código, português para domínio
- **Funções**: verbos descritivos (fetchData, handleSubmit)
- **Componentes**: substantivos descritivos (ProductCard, OrderModal)

#### Estrutura de Pastas

```
src/
├── components/     # Componentes reutilizáveis
├── pages/         # Páginas da aplicação
├── hooks/         # Hooks customizados
├── lib/           # Utilitários e configurações
├── entities/      # Schemas e tipos de dados
└── types/         # Definições de tipos TypeScript
```

#### Commits

Use o padrão [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>[escopo opcional]: <descrição>

[corpo opcional]

[rodapé opcional]
```

**Tipos:**
- `feat`: nova funcionalidade
- `fix`: correção de bug
- `docs`: documentação
- `style`: formatação, espaços em branco, etc
- `refactor`: refatoração de código
- `test`: adição ou correção de testes
- `chore`: tarefas de manutenção

**Exemplos:**
```bash
feat(produtos): adiciona importador de fotos em lote
fix(vendas): corrige cálculo de ticket médio no dashboard
docs(readme): atualiza instruções de instalação
```

#### Pull Requests

1. **Crie uma branch** a partir de `develop`
   ```bash
   git checkout -b feature/minha-funcionalidade
   ```

2. **Faça commits pequenos e focados**

3. **Teste suas mudanças**
   ```bash
   npm run lint
   npm run build
   ```

4. **Atualize documentação** se necessário

5. **Abra o PR** usando o template fornecido

#### Revisão de Código

- PRs precisam de pelo menos 1 aprovação
- Todos os checks do CI devem passar
- Código deve estar documentado
- Testes devem cobrir novas funcionalidades

## 🧪 Testes

### Executando Testes

```bash
# Todos os testes
npm test

# Testes em modo watch
npm run test:watch

# Cobertura
npm run test:coverage
```

### Escrevendo Testes

- Use Jest + React Testing Library
- Teste comportamentos, não implementação
- Mantenha testes simples e legíveis
- Mock dependências externas

```typescript
// Exemplo de teste
import { render, screen } from '@testing-library/react'
import { ProductCard } from './ProductCard'

test('deve exibir informações do produto', () => {
  const produto = {
    nome: 'Tênis Esportivo',
    preco: 199.99,
    sku: 'TEN-001'
  }
  
  render(<ProductCard produto={produto} />)
  
  expect(screen.getByText('Tênis Esportivo')).toBeInTheDocument()
  expect(screen.getByText('R$ 199,99')).toBeInTheDocument()
})
```

## 🔧 Configuração de Desenvolvimento

### Extensões Recomendadas (VS Code)

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

### Configuração do Editor

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## 📚 Recursos de Aprendizado

- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

## 🤝 Comunidade

- **Discord**: [Link do servidor Discord]
- **Telegram**: [Link do grupo Telegram]
- **Email**: dev@shekinahcalcados.com.br

## ❓ Dúvidas?

Se você tem dúvidas sobre como contribuir, sinta-se à vontade para:

1. Abrir uma [Discussion](https://github.com/seu-usuario/erp-shekinah/discussions)
2. Entrar em contato via email
3. Perguntar no nosso Discord

Agradecemos sua contribuição! 🙏