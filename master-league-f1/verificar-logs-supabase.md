# 📋 Como Verificar Logs do Supabase

## 🔍 Passo a Passo

1. **Acesse o Supabase Dashboard:**
   - URL: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/functions/send-whatsapp-code

2. **Vá para a aba "Logs":**
   - Clique em "Logs" no menu lateral ou na parte superior

3. **Execute o teste novamente** enquanto os logs estão abertos

4. **Procure por:**
   - `🔍 [Z-API] Iniciando envio...`
   - `📱 [Z-API] Enviando via Z-API:`
   - `📤 [Z-API] Request body:`
   - `📥 [Z-API] Response status:`
   - `📥 [Z-API] Response body:`
   - `❌ [Z-API] Erro ao enviar:`

## 📊 O que procurar nos logs:

### Se os secrets estão configurados:
```
🔍 [Z-API] Iniciando envio...
   ZAPI_INSTANCE: ✅ Configurado
   ZAPI_TOKEN: ✅ Configurado
```

### Se houver erro, você verá:
```
❌ [Z-API] Erro ao enviar: [mensagem de erro específica]
📥 [Z-API] Response body: [resposta completa do Z-API]
```

## ⚠️ Se você não ver logs com `[Z-API]`:

Isso significa que a Edge Function não foi atualizada com os logs detalhados. Você precisa fazer o deploy:

```bash
npx supabase functions deploy send-whatsapp-code
```

---

**Copie e cole os logs aqui para eu analisar!**




