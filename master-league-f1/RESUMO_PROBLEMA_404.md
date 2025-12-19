# ⚠️ Problema: Erro HTTP 404 ao Enviar Código WhatsApp

## 🔍 Diagnóstico

**Erro:** `Erro ao enviar código de verificação: Erro ao enviar código (HTTP 404)`

**Causa Raiz:** A Edge Function `send-whatsapp-code` **NÃO está deployada** no Supabase.

**Sintoma:** O erro aparece imediatamente quando o usuário tenta enviar o código, antes mesmo de chegar a enviar para o WhatsApp.

## ✅ Solução

### Passo 1: Deploy da Edge Function

1. Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/functions
2. Clique em **"Create a new function"**
3. Nome: `send-whatsapp-code` (exatamente assim)
4. Abra o arquivo: `supabase/functions/send-whatsapp-code/index.ts`
5. **Copie TODO o conteúdo** e cole no editor da função
6. Clique em **"Deploy"**

### Passo 2: Verificar Secrets

Após o deploy, verifique se os secrets estão configurados:

1. Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/settings/functions
2. Role até **"Secrets"**
3. Verifique se existem:
   - `WHATSAPP_API_TYPE` = `twilio`
   - `TWILIO_ACCOUNT_SID` = (seu Account SID)
   - `TWILIO_AUTH_TOKEN` = (seu Auth Token)
   - `TWILIO_WHATSAPP_NUMBER` = `whatsapp:+14155238886`

### Passo 3: Testar

Após o deploy, teste novamente o login. O erro 404 não deve mais aparecer.

## 📋 Checklist

- [ ] Edge Function `send-whatsapp-code` deployada
- [ ] Secrets do Twilio configurados
- [ ] Teste de envio funcionando
- [ ] Código chegando no WhatsApp

## 🔗 Documentação Relacionada

- `DEPLOY_EDGE_FUNCTION.md` - Guia completo de deploy
- `GUIA_SETUP_TWILIO.md` - Configuração do Twilio










