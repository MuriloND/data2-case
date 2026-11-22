# Sistema de Comissões — Nuvem Fiscal

Aplicação web desenvolvida em **Next.js 16** (App Router + Cache Components + React 19 + Tailwind CSS v4) para automatizar o fechamento mensal de comissões do time comercial, substituindo planilhas manuais propensas a erro por ingestão tolerante a sujeira, fila de exceções **Human-in-the-Loop**, apuração em centavos inteiros e extratos transparentes.

> **Documentação para usuários finais:** veja o guia em linguagem simples em [`docs/GUIA_DE_USO.md`](./docs/GUIA_DE_USO.md).

---

## Principais Capacidades

1. **Ingestão CSV Tolerante & Fallback Universal (Zero Chute):**
   - Leitura RFC 4180 (aspas, vírgulas internas, BOM UTF-8, autodetecção `,`/`;`, CRLF/LF e preservação do número físico de linha).
   - Normalização de datas (`DD/MM/YYYY`, `YYYY-MM-DD`, `DD/MM`), valores (`14400`, `24.000,00`, `9600.00`, `R$ 9.600`, `36k`, `12,5k`), aliases de vendedores, separadores de rateio (`+`, `/`, `&`, ` e `), tipos, status e extração de mês de cancelamento na observação.
   - Qualquer campo inválido, ausente, ambíguo ou marcado com `?` nunca é ignorado nem chutado silenciosamente — o registro é isolado na **Fila de Pendências** com sugestões contextuais não-vinculantes.
   - Detecção `O(N)` de duplicatas exatas intra-lote e entre uploads incrementais.
2. **Motor de Cálculo Puro em Centavos Inteiros:**
   - **Meta individual mensal:** `R$ 120.000,00` considerando apenas **Vendas Novas** ativas em ordem cronológica `(dateISO, lineNumber)`.
   - **Faixa progressiva:** `5%` até `R$ 120.000,00` e `8%` apenas sobre o excedente (quebrando proporcionalmente a venda que cruza a linha de R$ 120k em `5% + 8%`).
   - **Renovação:** `2%` fixo, sem somar na meta.
   - **Vendas divididas:** divisão igualitária (`50/50`, `1/3`, etc. com distribuição exata de centavos) ou customizada (`60/40`), impactando igualmente a meta e a comissão.
   - **Cancelamentos:** cancelamento no mesmo mês anula a venda (`R$ 0` e fora da meta); cancelamento em mês posterior paga normalmente na origem e gera **estorno negativo** no mês do cancelamento exatamente no valor e faixa pagos na origem.
   - **Venda Direta (sem vendedor):** registrada no histórico com comissão `R$ 0,00`.
3. **Fluxo Operacional em 3 Abas:**
   - **Fila de Pendências:** revisão rápida com sugestões, criação/mapeamento de vendedores e histórico de decisões com opção **Desfazer**.
   - **Resumo Mensal & Metas:** matriz interativa **Vendedor × Mês** (drill-down por clique) e barras de progresso da meta de `R$ 120k`.
   - **Extrato Individual:** filtro por vendedor, competência e busca; detalhamento de faixas/estornos/rateios; **Copiar para WhatsApp** (com prévia) e **Exportar CSV** (UTF-8 BOM para Excel).

---

## Arquitetura (Clean Architecture + SRP)

O projeto segue separação estrita de responsabilidades e a **Regra de Dependência** (camadas internas não conhecem infraestrutura ou UI), preparando terreno para evoluções pós-v1 como autenticação, banco de dados e integrações com CRM/API:

```text
my-app/
├── domain/commissions/           # 0 dependências externas (sem Next, React ou Node)
│   ├── constants.ts              # Meta (12_000_000 cents) e alíquotas
│   ├── entities/                 # Seller, Sale, PendingIssue, Ledger
│   ├── ports/                    # Contratos (Inversão de Dependência)
│   │   ├── sale-source.port.ts
│   │   ├── statement-exporter.port.ts
│   │   └── workspace-repository.port.ts
│   └── services/                 # Normalizadores, parser, duplicatas, sugestões, cálculo e agregação
├── application/commissions/      # Casos de uso puros (dependem apenas de domain/)
│   ├── ingest-sales.use-case.ts
│   ├── calculate-commissions.use-case.ts
│   └── export-statement.use-case.ts
├── infrastructure/               # Implementações concretas dos Ports
│   ├── csv/                      # Detector de delimitador, tokenizer RFC 4180, mapper, adapter
│   ├── exporters/                # Adapters WhatsApp e CSV UTF-8 BOM
│   ├── persistence/              # LocalStorageWorkspaceRepository
│   ├── server/                   # Loader Next.js 16 ('use cache') para CSV local opcional
│   └── demo/                     # Dataset sintético curto para demonstração
├── presentation/commissions/     # Composition Root, Store reativo, Hooks e Componentes UI
└── app/                          # App Router (Next.js 16)
```

---

## Como Rodar Localmente

Requisitos: **Node.js 20.9+** (testado em Node `v26.1.0`) e **npm**.

```bash
cd my-app
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

### Sobre os dados iniciais (`test_files/`)
- O diretório `test_files/` está listado no `.gitignore` para preservar dados privados fora do repositório.
- Em ambiente local, se `test_files/YMwngYvqunGNvAf1zJNut.csv` existir, o Server Component `loadDefaultCsv()` (`'use cache'` + `cacheLife('max')`) o pré-carrega automaticamente.
- Na nuvem (ou quando `test_files/` não existir), a aplicação inicia em estado limpo pronta para upload de qualquer `.csv` ou carregamento da amostra sintética demonstrativa (`Carregar amostra demo`).
- Edições, uploads incrementais (modos **Mesclar novo mês** e **Substituir base**), vendedores adicionados e resoluções ficam salvos no `localStorage` do navegador do usuário (`nuvem-fiscal:commissions:v1`), garantindo isolamento entre avaliadores simultâneos sem necessidade de banco externo.

---

## Testes Automatizados e Qualidade

```bash
# Executar toda a suíte de testes (27 arquivos / 85 testes)
npm test

# Verificação estrita de tipos TypeScript
npx tsc --noEmit

# Linter (Next.js 16 + ESLint 9)
npm run lint

# Build de produção (Turbopack + Cache Components)
npm run build
```

A suíte cobre:
- **Testes unitários por módulo** em `__tests__/domain/`, `__tests__/infrastructure/`, `__tests__/application/` e `__tests__/presentation/`.
- **Todos os 10 Testes Obrigatórios do briefing:** 5% abaixo da meta, cruzamento da linha de R$ 120k (`5% + 8%`), renovação `2%`, rateios `50/50` e `1/3`, rateio customizado `60/40`, cancelamento mesmo mês, cancelamento em mês posterior (inclusive a `8%`), detecção de duplicata exata, resolução E2E completa zerando pendências e **Fallback Universal** com CSV corrompido.
- **Gabarito da Seção 5:** conferência centavo por centavo contra `test_files/YMwngYvqunGNvAf1zJNut.csv` quando presente localmente (com `it.skipIf(!hasRealCsv)` para execução segura em CI/nuvem).
- **Benchmark de Escala:** ingestão e cálculo de **10.000 linhas** distribuídas em 12 meses em ~400–500 ms.

---

## Deploy na Nuvem

A aplicação não exige banco de dados nem variáveis de ambiente obrigatórias na v1.

### Opção 1 — Vercel (Recomendado para Next.js 16)
1. Importe o repositório na Vercel.
2. Defina o **Root Directory** como `my-app` (caso o repositório Git esteja na raiz pai, ou `.` se a raiz do repo for `my-app`).
3. Mantenha os comandos padrão (`Build Command: npm run build`, `Install Command: npm install`).
4. Faça o deploy — a rota `/` já é pré-renderizada com Cache Components + Partial Prefetching habilitados.

### Opção 2 — Servidor Node.js / Docker / Render / Railway
```bash
cd my-app
npm ci
npm run build
npm run start
```
