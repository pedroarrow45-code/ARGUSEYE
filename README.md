# ARGUS EYE

**Public Intelligence & Risk Operating System**

Ferramenta de inteligência pública, OSINT legal e due diligence reputacional. Permite que o operador insira um identificador inicial (nome, razão social, CNPJ ou CPF mascarado) e o sistema organize evidências públicas, vínculos, documentos, notícias, processos, PDFs e red flags em um dashboard executivo.

> **Protótipo demonstrativo.** Use apenas fontes abertas, públicas e verificáveis. A análise não substitui revisão humana, jurídica ou investigativa especializada.

## Stack

- **Next.js 16** com App Router
- **TypeScript**
- **Tailwind CSS 4**
- **React Flow** para mapa de conexões
- **Prisma ORM** com PostgreSQL
- **Zod** para validação
- **Vitest** para testes
- **GitHub Actions** para CI

## Rodar Localmente

```bash
npm install
cp .env.example .env
# Edite .env: DEMO_MODE=true
npm run dev
```

Acesse `http://localhost:3000`.

## Modo Demo

Funciona sem banco de dados e sem APIs externas:

```
DEMO_MODE=true
LIVE_MODE=false
```

## Configurar PostgreSQL

### Neon / Supabase (Vercel)

1. Crie um projeto no [Neon](https://neon.tech) ou [Supabase](https://supabase.com)
2. Copie a connection string
3. Defina `DATABASE_URL` no `.env` e nas variáveis da Vercel

### Migrations

```bash
npm run db:migrate          # Criar migration (dev)
npm run db:migrate:deploy   # Aplicar em produção
npm run db:studio           # Abrir Prisma Studio
```

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim (prod) | Connection string PostgreSQL |
| `DEMO_MODE` | Não | `true` para fixtures (default: `true`) |
| `LIVE_MODE` | Não | `true` para conectores reais |
| `BLOB_READ_WRITE_TOKEN` | Não | Token para Vercel Blob |
| `ANTHROPIC_API_KEY` | Não | Chave para análise com Claude |

## Testes

```bash
npm run test
npm run test:watch
```

## Deploy (GitHub + Vercel)

1. Push para GitHub
2. Conecte na Vercel
3. Configure variáveis de ambiente
4. Build automático: `prisma generate && next build`

## Scripts

| Script | Descrição |
|---|---|
| `npm run dev` | Desenvolvimento |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |
| `npm run db:generate` | Prisma generate |
| `npm run db:migrate` | Migration dev |
| `npm run db:migrate:deploy` | Migration prod |
| `npm run db:studio` | Prisma Studio |

## Estrutura

```
src/
├── app/                    # Páginas e rotas Next.js
│   ├── api/cases/          # API routes
│   ├── cases/[id]/         # Detalhe do case
│   ├── cases/new/          # Nova due diligence
│   └── demo/               # Modo demo
├── components/
│   ├── cases/              # Formulários de cases
│   ├── dashboard/          # Cards, gráficos, painéis
│   ├── graph/              # Mapa de conexões (React Flow)
│   └── layout/             # Sidebar, topbar
├── fixtures/               # Dados fictícios
└── lib/
    ├── analyzer/           # Motor ARGUS de análise
    ├── compliance/         # CPF/CNPJ, mascaramento
    ├── connectors/         # Conectores (mock)
    ├── db/                 # Prisma client
    ├── prompts/            # Prompts para LLM
    └── storage/            # Adapters de storage
```

## Limitações do MVP

- Conectores em modo mock/demo
- Upload de PDFs não implementado (arquitetura pronta)
- Jobs de coleta simulados
- Análise por LLM preparada mas não ativada
- Sem autenticação

## Próximos Passos

1. Conectores reais (Bing, SerpAPI, NewsAPI)
2. Análise com Claude/LLM
3. Upload de PDFs (Vercel Blob)
4. Autenticação (NextAuth.js)
5. Jobs assíncronos de coleta
6. Exportação de relatório em PDF
7. Testes E2E

## Compliance

- Fontes abertas apenas
- CPF nunca armazenado/exibido integralmente
- Sem afirmação de culpa sem fonte robusta
- Cadeia de evidências com fonte, URL, data e confiança
- Separação: fatos, indícios, hipóteses, lacunas
- Finalidade legítima obrigatória
- Revisão humana indispensável
