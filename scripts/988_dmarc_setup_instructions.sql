-- INSTRUÇÕES PARA CONFIGURAR DMARC E MELHORAR ENTREGABILIDADE DE EMAIL
-- Execute estas configurações no seu provedor de DNS (onde comprou o domínio alteapay.com)

-- ==============================================
-- PASSO 1: ADICIONAR REGISTRO DMARC
-- ==============================================
-- Tipo: TXT
-- Nome/Host: _dmarc.alteapay.com (ou apenas _dmarc)
-- Valor: v=DMARC1; p=none; rua=mailto:dmarc@alteapay.com; ruf=mailto:dmarc@alteapay.com; fo=1

-- Explicação:
-- v=DMARC1 - Versão do protocolo
-- p=none - Política (none = monitorar, quarantine = spam, reject = rejeitar)
-- rua - Email para receber relatórios agregados
-- ruf - Email para receber relatórios forenses
-- fo=1 - Gerar relatório se qualquer mecanismo falhar

-- ==============================================
-- PASSO 2: VERIFICAR REGISTROS SPF E DKIM
-- ==============================================
-- Estes devem estar configurados (você já configurou no Resend):
-- 
-- SPF (TXT):
-- Nome: @ ou alteapay.com
-- Valor: v=spf1 include:amazonses.com ~all
--
-- DKIM (TXT):
-- Nome: resend._domainkey
-- Valor: (fornecido pelo Resend)

-- ==============================================
-- PASSO 3: WARM UP DO DOMÍNIO (IMPORTANTE!)
-- ==============================================
-- Domínios novos precisam construir reputação gradualmente:
-- 
-- Dia 1-3:   Envie 10-20 emails/dia para contatos conhecidos
-- Dia 4-7:   Envie 50-100 emails/dia
-- Dia 8-14:  Envie 200-500 emails/dia
-- Dia 15+:   Pode aumentar gradualmente
--
-- DICA: Peça para destinatários:
-- - Marcarem como "Não é spam" se cair no spam
-- - Adicionarem cobranca@alteapay.com nos contatos
-- - Responderem o email (aumenta engajamento)

-- ==============================================
-- PASSO 4: AÇÕES IMEDIATAS PARA SAIR DO SPAM
-- ==============================================
-- 1. Adicione cobranca@alteapay.com nos contatos do Gmail
-- 2. Marque os emails como "Não é spam" quando receberem
-- 3. Responda um dos emails (mesmo com "ok")
-- 4. Mova os emails da pasta Spam para a Caixa de Entrada
-- 5. Aguarde 24-48h para o Gmail aprender o padrão

-- ==============================================
-- PASSO 5: MONITORAR NO RESEND DASHBOARD
-- ==============================================
-- Acesse: https://resend.com/emails
-- Verifique:
-- - Bounce rate (deve ser < 5%)
-- - Complaint rate (deve ser < 0.1%)
-- - Delivery rate (deve ser > 95%)

-- ==============================================
-- CHECKLIST COMPLETO
-- ==============================================
-- [✅] DKIM verificado no Resend
-- [✅] SPF verificado no Resend
-- [✅] Enable Sending ativado
-- [ ] DMARC adicionado no DNS
-- [ ] Warm up do domínio iniciado (enviar poucos emails por dia)
-- [ ] Adicionar email nos contatos do Gmail
-- [ ] Marcar como "Não é spam" manualmente
-- [ ] Monitorar métricas no Resend Dashboard

-- NOTA: Este script contém apenas instruções, não há comandos SQL para executar.
-- As configurações devem ser feitas no seu provedor de DNS e no Gmail.
