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


## MVP OSINT público

Este repositório foi realinhado para um MVP de investigação OSINT pública. O pipeline inicial executa:

```
SearXNG → dedupe → fetch público HTTP/HTTPS → extração HTML → ledger de fontes → evidências candidatas → relatório Markdown
```

O endpoint inicial é:

```
POST /api/osint/investigate
Content-Type: application/json

{ "target": "Nome ou razão social do alvo" }
```

Resposta esperada: JSON com `caseId`, `collectionJobId`, `persisted`, `persistedLedgerIds`, `persistedDocumentIds`, `persistedEvidenceIds`, `counts`, `queries`, `searchResults`, `ledger`, `documents`, `evidenceCandidates` e `reportMarkdown`. Quando `DATABASE_URL` está configurado, o endpoint cria ou associa um `Case`, cria um `CollectionJob`, persiste ledger/documentos extraídos e salva evidências candidatas úteis. Sem banco configurado, mantém resposta compatível em memória com `persisted=false`.

### Configurar SearXNG

Defina a URL da sua instância self-hosted no `.env.local`:

```
SEARXNG_BASE_URL=http://localhost:8080
```

Exemplo com Docker, se você já possui uma configuração local de SearXNG:

```bash
docker run --rm -p 8080:8080 searxng/searxng
```

### Persistência Prisma

A persistência OSINT usa as tabelas `SourceLedgerEntry` e `ExtractedDocument`, adicionadas por migration segura sem remover os models existentes `Case`, `Evidence`, `Risk` ou `CollectionJob`. Para aplicar em desenvolvimento:

```bash
npm run db:migrate
```

Em produção/CI com banco já provisionado:

```bash
npm run db:migrate:deploy
```

Se `DATABASE_URL` não estiver configurado, o endpoint ainda roda o pipeline e retorna os resultados sem persistir.

### Usar a UI OSINT

A interface mínima do MVP fica em:

- `/osint` — iniciar uma nova investigação pública.
- `/osint/history` — listar investigações persistidas recentes.
- `/osint/[caseId]` — abrir detalhes de uma investigação/case com fontes, documentos, evidências candidatas e relatório Markdown.

Fluxo pela UI:

1. Configure `SEARXNG_BASE_URL` e, para histórico persistido, `DATABASE_URL`.
2. Rode as migrations com `npm run db:migrate`.
3. Inicie o app com `npm run dev`.
4. Acesse `http://localhost:3000/osint`.
5. Informe o alvo e clique em **Investigar**.
6. Use **Abrir detalhe** para ver o case persistido ou **Histórico OSINT** para listar investigações recentes.

A tela não deve exibir CPF completo; a API retorna alvos sensíveis mascarados.

### Testar manualmente o endpoint

Com o app em desenvolvimento:

```bash
npm run dev
```

Em outro terminal:

```bash
curl -X POST http://localhost:3000/api/osint/investigate \
  -H 'Content-Type: application/json' \
  -d '{"target":"Argus Eye LTDA"}'
```

Também é possível associar a investigação a um case existente:

```bash
curl -X POST http://localhost:3000/api/osint/investigate \
  -H 'Content-Type: application/json' \
  -d '{"target":"Argus Eye LTDA","caseId":"CASE_ID_EXISTENTE"}'
```

Exemplo parcial de resposta:

```json
{
  "target": "Argus Eye LTDA",
  "caseId": "case_id_ou_null",
  "collectionJobId": "job_id_ou_null",
  "persisted": true,
  "counts": {
    "searchResults": 4,
    "ledger": 8,
    "documents": 2,
    "evidenceCandidates": 2,
    "persistedEvidence": 1
  },
  "queries": ["\"Argus Eye LTDA\""],
  "ledger": [],
  "documents": [],
  "evidenceCandidates": [],
  "reportMarkdown": "# Relatório OSINT público — Argus Eye LTDA"
}
```

### Limitações atuais do pipeline OSINT

- A UI é mínima e não substitui revisão humana do relatório e das fontes.
- Não há crawler profundo.
- Não há LLM/Ollama nesta etapa.
- Não há scraping direto do Google nem APIs pagas adicionadas.
- O fetcher bloqueia protocolos não HTTP/HTTPS, localhost, IPs privados/link-local e metadata cloud para reduzir risco de SSRF.
- O pipeline só abre URLs públicas HTTP/HTTPS.
- A extração HTML é conservadora, remove blocos não principais, calcula hash do texto extraído e ignora documentos muito curtos.
- Evidências retornadas são candidatas e não substituem validação humana, jurídica ou investigativa.
- CPF completo não deve ser coletado, logado, exposto em API ou relatório.

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
6. Confirme no detalhe do case se a coleta retornou `BRASILAPI_COMPLETED` e fonte `BrasilAPI`.

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
    ├── storage/            # Adapters de storage
    └── osint/              # Pipeline SearXNG, dedupe, fetch, extração, evidências e relatório
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
