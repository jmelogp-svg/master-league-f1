# ⚡ Guia Rápido - Setup Supabase (5 minutos)

Este é um guia rápido para configurar o Supabase. Para instruções detalhadas, veja `CONFIGURACAO_SUPABASE.md`.

---

## 🎯 Passos Rápidos

### 1. Criar Tabelas (2 min)

1. Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/sql/new
2. Abra o arquivo `supabase-schema.sql`
3. **Copie TODO o conteúdo** e cole no SQL Editor
4. Clique em **"Run"** (Ctrl+Enter)

✅ **Verificar:** Vá em Table Editor e confirme que as 7 tabelas existem.

---

### 2. Deploy Edge Function (2 min)

**Opção A: Via Dashboard (Mais Fácil)**

1. Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/functions
2. Clique em **"Create a new function"**
3. Nome: `send-email`
4. Cole o conteúdo de `supabase/functions/send-email/index.ts`
5. Clique em **"Deploy"**

**Opção B: Via CLI**

```bash
supabase login
supabase link --project-ref ueqfmjwdijaeawvxhdtp
supabase functions deploy send-email
```

---

### 3. Configurar Secrets SMTP (1 min)

1. Gere App Password no Gmail: https://myaccount.google.com/apppasswords
2. Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/settings/functions
3. Adicione os secrets:

```
SMTP_HOST = smtp.gmail.com
SMTP_PORT = 587
SMTP_USER = jmelogp@gmail.com
SMTP_PASS = [sua_senha_app_16_caracteres]
```

---

### 4. Adicionar Pilotos (1 min)

1. Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/editor
2. Selecione tabela `pilotos`
3. Clique em **"Insert row"**
4. Preencha:
   - `nome`: Nome do piloto
   - `email`: Email (mesmo do login)
   - `grid`: `carreira` ou `light`
   - `equipe`: Nome da equipe
   - `is_steward`: `true` se for steward

---

### 5. Testar (1 min)

```bash
# Execute o script de teste
node scripts/testar_supabase.js
```

Ou teste manualmente:
1. Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/functions/send-email
2. Clique em **"Invoke function"**
3. Cole:
```json
{
  "to": "seu-email@teste.com",
  "subject": "Teste",
  "html": "<h1>Teste</h1>"
}
```
4. Verifique se recebeu o email

---

## ✅ Checklist

- [ ] Tabelas criadas (7 tabelas)
- [ ] Edge Function deployada
- [ ] 4 secrets SMTP configurados
- [ ] Pelo menos 1 piloto cadastrado
- [ ] Teste de email funcionando

---

## 🆘 Problemas?

- **Erro SMTP:** Verifique se o App Password está correto (sem espaços)
- **Edge Function não encontrada:** Faça deploy novamente
- **RLS bloqueando:** Verifique se o usuário está logado

**Mais ajuda:** Veja `CONFIGURACAO_SUPABASE.md`

---

**Pronto! 🎉**





