# AlteaPay — Pacote de publicação: Política de Privacidade e Termos de Uso

**Para:** desenvolvimento web
**Versão do conteúdo:** 1.0
**Preparado em:** 10/07/2026

---

## 1. O que tem neste pacote

| Arquivo | Destino |
|---|---|
| `politica-de-privacidade.html` | Publicar em `/politica-de-privacidade` |
| `termos-de-uso.html` | Publicar em `/termos-de-uso` |
| `LEIA-ME-DEV.md` | Este arquivo. Não publicar. |
| `dossie-conformidade-whatsapp-alteapay.md` | Documento interno. **Não publicar.** |

Ambas as páginas são autocontidas: HTML5, CSS interno, **zero JavaScript**, nenhuma biblioteca ou fonte externa. Não adicione dependências.

---

## 2. Rotas

```
/politica-de-privacidade   →  politica-de-privacidade.html
/termos-de-uso             →  termos-de-uso.html
```

As páginas já se linkam entre si por esses caminhos, e o rodapé de cada uma aponta para a outra. Se as rotas mudarem, atualize os `href` nos dois arquivos.

Requisitos das URLs:

- Precisam ser **públicas**, acessíveis sem login, sem cookie wall e sem redirecionamento.
- Precisam responder `200`, servidas por HTTPS, sem `noindex`.
- Precisam permanecer estáveis. Serão informadas à Meta e a clientes corporativos.
- Incluir ambas no `sitemap.xml` e no rodapé global do site.

---

## 3. Campos a preencher antes de publicar

Os textos entre colchetes são marcadores. Estão destacados em amarelo na página, dentro de `<span class="pending">`.

**Nenhum foi preenchido por inferência.** Publicar com dado inventado cria uma inconsistência verificável — é pior do que publicar com o marcador visível.

Ao substituir um valor, remova também o `<span class="pending">…</span>` ao redor. Exemplo:

```html
<!-- antes -->
CNPJ: <span class="pending">[CNPJ]</span>
<!-- depois -->
CNPJ: 12.345.678/0001-90
```

### Tokens

| Token | O que é | Onde aparece |
|---|---|---|
| `[DATA]` | Data da publicação, formato `10 de julho de 2026` | Cabeçalho e rodapé das duas páginas |
| `[RAZAO_SOCIAL]` | Razão social completa | Ambas |
| `[CNPJ]` | CNPJ formatado | Ambas |
| `[CEP]` | CEP da Rua Funchal, 538 — Sala 24 | Ambas |
| `[EMAIL_CONTATO]` | E-mail de atendimento geral | Ambas |
| `[EMAIL_PRIVACIDADE]` | E-mail exclusivo de privacidade | Ambas |
| `[TELEFONE]` | Telefone de atendimento | Ambas |
| `[WHATSAPP_OFICIAL]` | Número oficial de WhatsApp | Termos de Uso |
| `[ENCARREGADO_DPO]` | Nome ou área do encarregado (LGPD) | Privacidade §27 |
| `[CRITERIO_RETENCAO]` | Prazo ou critério de retenção de dados | Privacidade §18 |
| `[FERRAMENTAS_ANALYTICS]` | Ferramentas de análise/marketing em uso, ou `nenhuma` | Privacidade §24 |
| `[FORNECEDOR_HOSPEDAGEM]` | Provedor de hospedagem/infra | Privacidade §16 |
| `[FORNECEDOR_WHATSAPP_API]` | BSP / provedor da API do WhatsApp | Privacidade §16 |
| `[FORNECEDOR_SMS_EMAIL]` | Provedor de SMS e e-mail | Privacidade §16 |
| `[FORNECEDOR_CRM]` | Sistema de atendimento ou CRM | Privacidade §16 |
| `[FORNECEDOR_AUTOMACAO]` | Plataforma de automação | Privacidade §16 |
| `[FORNECEDOR_PAGAMENTOS]` | Gateway de pagamentos, ou `não se aplica` | Privacidade §16 |
| `[MECANISMO_OPTOUT]` | Descrição do mecanismo técnico de interrupção | Privacidade §22 |

Cada token é único. Find/replace global é seguro. **Verifique que sobrou zero `[` no HTML antes de subir.**

```bash
grep -o '\[[A-Z_]*\]' politica-de-privacidade.html termos-de-uso.html
# saída esperada: vazia
```

---

## 4. Verificação de cookies — tarefa do desenvolvedor

Antes de preencher `[FERRAMENTAS_ANALYTICS]`, é preciso saber o que o site realmente carrega.

1. Abra `bealtea.com` em janela anônima.
2. DevTools → aba Network, sem interagir com nenhum banner.
3. Liste todos os domínios de terceiros acionados **antes de qualquer consentimento**.
4. DevTools → Application → Cookies. Liste nome, domínio e duração.

**Se só houver cookies técnicos essenciais:** preencha `[FERRAMENTAS_ANALYTICS]` com `nenhuma` e siga em frente. A seção 24 da Política de Privacidade é suficiente.

**Se aparecerem Google Analytics, Meta Pixel, LinkedIn Insight Tag, Hotjar, HubSpot ou qualquer cookie de terceiros:** pare e reporte. Será necessária uma Política de Cookies separada e um banner com bloqueio prévio (os scripts não podem disparar antes do consentimento). Isso é exigência da ANPD, não da Meta.

---

## 5. O que não alterar

Estes elementos foram escritos com propósito jurídico e de conformidade. Não reescreva, não "melhore o tom", não remova por questão de layout:

- As duas caixas **"O que fazemos / O que não fazemos pelo WhatsApp"** (`.scope` e `.scope.negative`) nas duas páginas.
- A frase de que a AlteaPay **não é parceira, certificada ou endossada pela Meta ou pelo WhatsApp** — aparece no corpo e no rodapé das duas páginas.
- O parágrafo de não-promessa nos Termos §10 (sem disponibilidade ininterrupta, sem segurança absoluta, sem entrega garantida).
- A descrição da AlteaPay como empresa de **recuperação de crédito e cobrança extrajudicial**, nas duas páginas.
- Os avisos de que a AlteaPay nunca pede senha, código ou dados de cartão.
- A numeração das seções e os `id` das âncoras (`#s1`…`#s27`, `#t1`…`#t21`). O sumário depende deles.

Qualquer mudança de texto passa por revisão antes de subir.

---

## 6. Checklist de publicação

**Conteúdo**
- [ ] Todos os 18 tokens substituídos; `grep` retorna vazio
- [ ] `[DATA]` igual nas 4 ocorrências (2 por página)
- [ ] Verificação de cookies feita e reportada
- [ ] `<meta name="description">` mantido em ambas

**Rotas e infraestrutura**
- [ ] `/politica-de-privacidade` e `/termos-de-uso` retornam 200 em HTTPS
- [ ] Sem `noindex`, sem login, sem redirect
- [ ] `<link rel="canonical">` adicionado em cada página
- [ ] Ambas no `sitemap.xml` e no rodapé global do site
- [ ] Links cruzados no rodapé de cada página funcionam

**Qualidade**
- [ ] Sumário: todos os links internos rolam para a seção certa
- [ ] Layout íntegro em 320px, 768px e 1440px
- [ ] Tabelas rolam horizontalmente no celular sem quebrar a página
- [ ] Navegação por teclado: foco visível (contorno dourado) em todos os links
- [ ] Validação W3C sem erros
- [ ] Impressão em PDF legível (Ctrl+P) — clientes corporativos vão pedir

**Segurança**
- [ ] `Content-Security-Policy` compatível com CSS inline (`style-src 'self' 'unsafe-inline'`) — as páginas não usam `<style>` externo
- [ ] Nenhum recurso externo carregado. Confirme na aba Network: zero requisições de terceiros

---

## 7. Fora do escopo do desenvolvimento

Três pendências são decisão do Rodrigo, não do time técnico. Não bloqueiam a publicação das páginas, mas bloqueiam a solicitação da conta WhatsApp Business:

1. **Titularidade da conta WhatsApp (WABA).** Conta própria da AlteaPay mantém a operação dentro de vertical proibida pela Meta. Ver Alerta 1 do dossiê interno.
2. **Texto de opt-in.** Precisa nomear expressamente a AlteaPay e mencionar o WhatsApp. O consentimento colhido pela empresa contratante em nome próprio não cobre a AlteaPay como remetente.
3. **Submissão dos 14 modelos de mensagem.** Nenhum está aprovado. A aprovação é decisão exclusiva da Meta.

Publicar estas duas páginas é **pré-requisito** para solicitar a conta — a Meta exige política de privacidade publicada. Mas publicar **não garante** aprovação, e nada nestas páginas deve ser apresentado como se garantisse.

---

## 8. Dúvidas

Conteúdo, redação e conformidade: Rodrigo — rodrigo@bealtea.com
Não altere texto por conta própria. Layout e infraestrutura: à vontade.
