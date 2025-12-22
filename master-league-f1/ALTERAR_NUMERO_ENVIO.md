# 📱 Como Alterar o Número de Envio/Recepção no Z-API

## 🔍 Entendendo o Problema

No Z-API, o **número que ENVIA** é determinado pela **instância conectada** no Z-API Dashboard. Você não pode alterar isso diretamente no código.

O número que você especifica no código é o **DESTINATÁRIO** (quem vai receber a mensagem).

## ✅ Soluções

### **Opção 1: Alterar o Número Destinatário (Para Testes)** ⭐ RECOMENDADO

Se você só quer testar enviando para outro número, basta alterar o número no teste:

**Arquivos atualizados:**
- ✅ `teste-whatsapp-curl.bat`
- ✅ `teste-whatsapp-terminal.ps1`

**Como alterar:**

1. Abra o arquivo de teste (`teste-whatsapp-terminal.ps1` ou `teste-whatsapp-curl.bat`)

2. Procure pela linha com `whatsapp = "551983433940"`

3. Altere para outro número (formato: `5511987654321` - 55 + DDD + número)

4. Execute o teste novamente

**Exemplo:**
```powershell
# ANTES
whatsapp = "551983433940"  # Seu número

# DEPOIS
whatsapp = "5511987654321"  # Número de teste
```

---

### **Opção 2: Conectar Nova Instância com Outro Número** 🔄

Se você quer usar um número diferente para **ENVIAR** as mensagens:

1. **Adquira um novo número de telefone** (chip físico ou número virtual)

2. **No Z-API Dashboard:**
   - Acesse: https://z-api.io/dashboard
   - Vá para "Instâncias" ou "Conexões"
   - Crie uma **nova instância** ou desconecte a atual e conecte com o novo número
   - Escaneie o QR Code com o novo número do WhatsApp

3. **Obtenha as novas credenciais:**
   - **Instance ID** da nova instância
   - **Token** da nova instância

4. **Atualize os Secrets no Supabase:**
   - Acesse: Supabase Dashboard → Edge Functions → Secrets
   - Atualize `ZAPI_INSTANCE` com o novo Instance ID
   - Atualize `ZAPI_TOKEN` com o novo Token

5. **Faça redeploy da Edge Function:**
   ```bash
   npx supabase functions deploy send-whatsapp-code
   ```

6. **Teste novamente**

---

### **Opção 3: Usar Instância Multi-Device (Mesmo Número, Mas Permite Enviar para Qualquer Um)**

Se sua instância já está configurada como "Multi Device", você pode enviar mensagens para qualquer número, **exceto para o próprio número da instância**.

Para verificar:
1. No Z-API Dashboard, veja se a instância mostra "Versão: Multi Device"
2. Se sim, basta usar outro número como destinatário no teste

---

## 📋 Resumo Rápido

### Para testar AGORA (mais rápido):
✅ **Opção 1**: Altere o número destinatário nos arquivos de teste

### Para usar outro número para ENVIAR:
🔄 **Opção 2**: Configure uma nova instância no Z-API com outro número

---

## 🔧 Arquivos que precisam ser alterados (Opção 1)

- `teste-whatsapp-curl.bat` - Linha 9
- `teste-whatsapp-terminal.ps1` - Linha 10

**IMPORTANTE:** O número deve estar no formato: `5511987654321`
- `55` = código do país (Brasil)
- `11` = DDD
- `987654321` = número (com 9 dígitos se for celular)

---

**Última atualização:** 13/12/2024



















