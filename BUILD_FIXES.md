# Correções do Build - CobrançaAuto

## Problema Principal
O Next.js estava tentando fazer renderização estática (durante o build) de páginas e rotas de API que usam recursos dinâmicos como `cookies()`, `request.url` e `request.headers`.

## Correções Aplicadas

### 1. Páginas Client-Side

**app/create-users/page.tsx**
- ❌ Problema: Usava `createClientComponentClient` (deprecated)
- ✅ Solução: Trocado para `createBrowserClient` + adicionado `export const dynamic = "force-dynamic"`

**app/dashboard/agreements/page.tsx**
- ❌ Problema: Página client sem export dynamic
- ✅ Solução: Adicionado `export const dynamic = "force-dynamic"` no topo do arquivo

**app/dashboard/profile/page.tsx**
- ✅ Já estava correto com `export const dynamic = "force-dynamic"`

### 2. Rotas de API

Todas as rotas de API já tinham `export const dynamic = "force-dynamic"`:
- ✅ `/api/verify-company/route.ts`
- ✅ `/api/vmax-clientes/route.ts`
- ✅ `/api/cron/sync-erp/route.ts`
- ✅ `/api/score-check/route.ts`
- ✅ `/api/reports/kpis/route.ts`
- ✅ `/api/collection-rules/route.ts`
- ✅ `/api/import/route.ts`

### 3. O que é `export const dynamic = "force-dynamic"`?

Essa declaração força o Next.js a fazer **renderização dinâmica** (em runtime) em vez de **renderização estática** (durante o build).

**Quando usar:**
- Páginas que usam `cookies()`, `headers()` ou `searchParams`
- Rotas de API que dependem de autenticação
- Componentes client-side que fazem chamadas autenticadas
- Páginas que precisam de dados em tempo real

## Resultado

Após todas as correções, o build deve completar sem erros relacionados a "Dynamic server usage" ou "cookies was called outside a request scope".

## Como Testar

\`\`\`bash
pnpm install
pnpm run build
\`\`\`

Se aparecerem novos erros, verifique:
1. Se a página/rota usa `cookies()`, `headers()` ou dados dinâmicos
2. Se tem `export const dynamic = "force-dynamic"` no topo do arquivo
3. Se está importando algum arquivo que chama `cookies()` no nível do módulo (fora de funções)
