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
BRASILAPI_ENABLED=true
```

## Modo Live Free v0.1 — BrasilAPI CNPJ

A primeira fonte real gratuita integrada é a BrasilAPI para consulta cadastral de CNPJ. Ela não exige chave de API e é acionada somente quando `LIVE_MODE=true`, `BRASILAPI_ENABLED=true` e o formulário contém um CNPJ válido.

Exemplo de `.env.local` para testar localmente:

```
DEMO_MODE=false
LIVE_MODE=true
BRASILAPI_ENABLED=true
MAX_RESULTS_PER_CASE=20
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Como testar:

1. Rode `npm run dev`.
2. Acesse `/cases/new`.
3. Selecione Pessoa Jurídica.
4. Informe razão social ou CNPJ e preencha o campo CNPJ com 14 dígitos, com ou sem pontuação.
5. Crie o case e confirme a evidência `BrasilAPI` em `/cases/[id]`.

Limitações da v0.1 live:

- Busca real apenas por CNPJ.
- Sem GDELT, DataJud, crawler, OCR/PDF ou busca por nome.
- Resultado preliminar: requer revisão humana e validação na fonte oficial antes de decisão vinculante.
- Se a BrasilAPI falhar, o case é criado com erro controlado e sem inventar evidências.

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
| `DEMO_MODE` | Não | `true` para fixtures/demo; use `false` para live |
| `LIVE_MODE` | Não | `true` para conectores reais gratuitos habilitados |
| `BRASILAPI_ENABLED` | Não | `true` habilita consulta real de CNPJ pela BrasilAPI |
| `MAX_RESULTS_PER_CASE` | Não | Limite operacional para resultados por case (default: `20`) |
| `NEXT_PUBLIC_APP_URL` | Não | URL pública do app (`http://localhost:3000` local; URL Vercel em produção) |
| `BLOB_READ_WRITE_TOKEN` | Não | Token para Vercel Blob |
| `ANTHROPIC_API_KEY` | Não | Chave para análise com Claude |

## Testes

```bash
npm run test
npm run test:watch
```

## Deploy (GitHub + Vercel)

1. Push para GitHub.
2. Conecte o repositório na Vercel.
3. Configure as variáveis de ambiente no painel da Vercel, sem commitar `.env` ou `.env.local`.
4. Para demo: `DEMO_MODE=true`, `LIVE_MODE=false`, `BRASILAPI_ENABLED=true`.
5. Para live free CNPJ: `DEMO_MODE=false`, `LIVE_MODE=true`, `BRASILAPI_ENABLED=true`, `MAX_RESULTS_PER_CASE=20`, `NEXT_PUBLIC_APP_URL=https://seu-projeto.vercel.app`.
6. Se usar banco em produção, configure `DATABASE_URL`; o fluxo localStorage/API continua sem armazenar CPF integral.
7. Build automático: `prisma generate && next build`.

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

- Live free v0.1 consulta somente CNPJ via BrasilAPI
- Busca por nome, GDELT, DataJud, crawler e OCR/PDF ainda não implementados
- Upload de PDFs não implementado (arquitetura pronta)
- Jobs de coleta simulados
- Análise por LLM preparada mas não ativada
- Sem autenticação

## Próximos Passos

1. Persistir cases live em banco com Prisma quando `DATABASE_URL` estiver configurado
2. Adicionar DataJud, GDELT e busca por nome com limites e compliance
3. Análise com Claude/LLM
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
