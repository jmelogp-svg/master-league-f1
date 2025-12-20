# 📱 Guia Completo: Setup Twilio para WhatsApp API

## 🎯 Objetivo

Configurar Twilio para enviar códigos de verificação WhatsApp na autenticação 2FA da Master League F1.

---

## 📋 Passo 1: Criar Conta Twilio

### 1.1 Acessar Site
1. Acesse: https://www.twilio.com/try-twilio
2. Clique em **"Sign up"** ou **"Get Started"**

### 1.2 Preencher Formulário
- **Email**: Seu email
- **Senha**: Criar senha forte
- **Nome**: Seu nome completo
- **Telefone**: Seu número (para verificação)
- **País**: Brasil

### 1.3 Verificar Email/Telefone
- Twilio enviará código de verificação
- Digite o código recebido

### 1.4 Primeiro Projeto
- Nome do projeto: "Master League F1" (ou qualquer nome)
- Linguagem: JavaScript/TypeScript
- Clique em **"Continue"**

✅ **Você ganha US$ 15,50 em créditos grátis!**

---

## 📋 Passo 2: Obter Credenciais

### 2.1 Dashboard Principal

Após login, você verá o **Dashboard** com:
- **Account SID**: Começa com `AC...`
- **Auth Token**: Clique em "View" para ver (começa com letras/números)

⚠️ **ANOTE ESSAS CREDENCIAIS!** Você precisará delas.

### 2.2 Onde Encontrar:
1. No Dashboard, procure por **"Account Info"**
2. Ou vá em: **Console** → **Account** → **General Settings**

**Você precisa de:**
- ✅ Account SID (`AC...`)
- ✅ Auth Token (clique em "View" para revelar)

---

## 📋 Passo 3: Configurar WhatsApp Sandbox (TESTE)

### 3.1 Acessar WhatsApp

1. No menu lateral, vá em: **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Ou acesse: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn

### 3.2 Configurar Sandbox (Modo Teste)

**O que é Sandbox?**
- Ambiente de teste da Twilio
- Permite testar sem aprovação completa
- **Limitação**: Só funciona com números pré-cadastrados

**Como usar:**
1. Você verá uma mensagem: **"Join [código] via whatsapp"**
2. Envie essa mensagem para o número do Twilio via WhatsApp
3. Exemplo: Envie `join [código]` para `+1 415 523 8886`

✅ **Agora você pode testar enviando mensagens para o número que você cadastrou!**

---

## 📋 Passo 4: Configurar WhatsApp Business (PRODUÇÃO)

⚠️ **Importante**: Para produção (enviar para qualquer número), você precisa:

### 4.1 Aplicar para WhatsApp Business

1. No menu, vá em: **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Clique em **"Get started with WhatsApp Business API"**
3. Ou acesse: https://www.twilio.com/docs/whatsapp

### 4.2 Preencher Formulário

Você precisará de:
- ✅ Nome da empresa/negócio: "Master League F1"
- ✅ Tipo de negócio: Esportes/Gaming
- ✅ Descrição: Liga de Fórmula 1 virtual
- ✅ Site: URL do seu site (se tiver)
- ✅ Casos de uso: Autenticação/Verificação
- ✅ Número de telefone: Número para receber códigos de verificação

### 4.3 Aprovação

- Twilio revisa sua aplicação
- **Tempo**: 1-3 dias úteis
- Você receberá email quando aprovado

---

## 📋 Passo 5: Obter Número WhatsApp

### 5.1 Receber Número Twilio

Após aprovação:
1. Vá em: **Phone Numbers** → **Buy a number**
2. Ou use o número fornecido pelo Twilio
3. O número virá no formato: `whatsapp:+14155238886`

### 5.2 Configurar Webhook (Opcional)

Se quiser receber mensagens:
1. Vá em: **Phone Numbers** → Seu número
2. Configure webhook para receber mensagens

**Para envio apenas (seu caso):**
- Não precisa configurar webhook

---

## 📋 Passo 6: Configurar Secrets no Supabase

### 6.1 Acessar Supabase

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em: **Edge Functions** → **Secrets**

### 6.2 Adicionar Secrets

Adicione as seguintes variáveis:

```
WHATSAPP_API_TYPE=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=seu_auth_token_aqui
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

**Como adicionar:**
1. Clique em **"Add new secret"**
2. Nome: `WHATSAPP_API_TYPE`, Valor: `twilio`
3. Clique em **"Add"**
4. Repita para cada secret

⚠️ **NÃO compartilhe essas credenciais publicamente!**

---

## 📋 Passo 7: Criar Template de Mensagem

### 7.1 Template para Código de Verificação

No Twilio, você precisa criar um template aprovado.

**Formato da mensagem:**
```
🔐 CÓDIGO DE VERIFICAÇÃO - MASTER LEAGUE F1

Olá {{1}}!

Seu código de verificação é:

{{2}}

Este código expira em 10 minutos.

Não compartilhe este código com ninguém.
```

Onde:
- `{{1}}` = Nome do piloto
- `{{2}}` = Código de 6 dígitos

### 7.2 Enviar Template (Modo Sandbox)

No modo Sandbox, você pode testar sem template.
Na produção, Twilio gerencia templates automaticamente.

---

## 📋 Passo 8: Testar Envio

### 8.1 Via Console Twilio

1. Vá em: **Messaging** → **Try it out** → **Send a WhatsApp message**
2. To: `whatsapp:+5511999999999` (seu número de teste)
3. Message: "Teste de código: 123456"
4. Clique em **"Send"**

✅ **Você deve receber a mensagem no WhatsApp!**

### 8.2 Via API (Teste)

Você pode testar usando curl:

```bash
curl -X POST https://api.twilio.com/2010-04-01/Accounts/AC.../Messages.json \
  --data-urlencode "From=whatsapp:+14155238886" \
  --data-urlencode "Body=Teste: 123456" \
  --data-urlencode "To=whatsapp:+5511999999999" \
  -u AC...:seu_auth_token
```

---

## ✅ Checklist Final

- [ ] Conta Twilio criada
- [ ] Account SID anotado
- [ ] Auth Token anotado
- [ ] WhatsApp Sandbox configurado (para testes)
- [ ] WhatsApp Business aplicado (para produção)
- [ ] Número WhatsApp obtido
- [ ] Secrets configurados no Supabase
- [ ] Teste de envio funcionando

---

## 🐛 Troubleshooting

### Erro: "Unable to create record"
- Verifique se as credenciais estão corretas
- Certifique-se de que o número está no formato correto: `whatsapp:+5511999999999`

### Erro: "Sandbox number not registered"
- No modo Sandbox, você precisa enviar `join [código]` para o número do Twilio primeiro
- Verifique se você cadastrou seu número no Sandbox

### Erro: "Unauthorized"
- Verifique Account SID e Auth Token
- Certifique-se de que copiou corretamente (sem espaços extras)

### Mensagens não chegam
- Verifique se o número está no formato: `whatsapp:+5511999999999`
- Certifique-se de que está usando o número correto do Twilio
- No Sandbox, apenas números cadastrados funcionam

---

## 📞 Próximos Passos

Depois de configurar:
1. ✅ Vou atualizar a Edge Function para usar Twilio
2. ✅ Vou criar utilitários de teste
3. ✅ Vou te ajudar a integrar no Login.jsx

---

## 🔗 Links Úteis

- **Twilio Dashboard**: https://console.twilio.com
- **Documentação WhatsApp**: https://www.twilio.com/docs/whatsapp
- **Twilio Console**: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
- **Phone Numbers**: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming

---

## 💡 Dica

**Para desenvolvimento/testes:**
- Use **Sandbox** (gratuito, mas limitado)
- Cadastre números de teste

**Para produção:**
- Aplique para **WhatsApp Business API**
- Aguarde aprovação (1-3 dias)
- Depois pode enviar para qualquer número

---

Boa sorte no setup! Se precisar de ajuda em qualquer passo, me avise! 🚀



















