# ✅ Setup Supabase - Resumo Completo

## 📦 O que foi criado

### 1. Edge Function
- ✅ `supabase/functions/send-email/index.ts` - Função para envio de emails via SMTP

### 2. Documentação
- ✅ `CONFIGURACAO_SUPABASE.md` - Guia completo passo a passo (detalhado)
- ✅ `GUIA_RAPIDO_SETUP.md` - Guia rápido (5 minutos)
- ✅ `SETUP_COMPLETO.md` - Este arquivo (resumo)

### 3. Scripts de Teste
- ✅ `scripts/testar_supabase.js` - Script para testar toda a configuração

---

## 🚀 Próximos Passos (Execute na Ordem)

### Passo 1: Criar Tabelas (2 minutos)

1. Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/sql/new
2. Abra o arquivo `supabase-schema.sql` do projeto
3. **Copie TODO o conteúdo** e cole no SQL Editor
4. Clique em **"Run"** (ou Ctrl+Enter)

**✅ Verificar:** Vá em Table Editor e confirme que existem 7 tabelas:
- `pilotos`
- `lances`
- `acusacoes`
- `defesas`
- `verdicts`
- `email_log`
- `notificacoes_admin`

---

### Passo 2: Deploy Edge Function (2 minutos)

**Opção A: Via Dashboard (Recomendado)**

1. Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/functions
2. Clique em **"Create a new function"**
3. Nome: `send-email` (exatamente assim)
4. Abra o arquivo `supabase/functions/send-email/index.ts`
5. **Copie TODO o conteúdo** e cole no editor
6. Clique em **"Deploy"**

**Opção B: Via CLI**

```bash
# Instalar Supabase CLI (se não tiver)
npm install -g supabase

# Login
supabase login

# Linkar projeto
supabase link --project-ref ueqfmjwdijaeawvxhdtp

# Deploy
supabase functions deploy send-email
```

---

### Passo 3: Configurar Secrets SMTP (3 minutos)

#### 3.1: Criar App Password no Gmail

1. Acesse: https://myaccount.google.com/apppasswords
   - Se não aparecer, ative verificação em 2 etapas primeiro: https://myaccount.google.com/security
2. Selecione:
   - **App:** Mail
   - **Device:** Windows Computer
3. Clique em **"Generate"**
4. **Copie a senha gerada** (16 caracteres, sem espaços)

#### 3.2: Adicionar Secrets no Supabase

1. Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/settings/functions
2. Role até a seção **"Secrets"**
3. Clique em **"Add new secret"** e adicione:

```
Nome: SMTP_HOST
Valor: smtp.gmail.com
```

```
Nome: SMTP_PORT
Valor: 587
```

```
Nome: SMTP_USER
Valor: jmelogp@gmail.com
```

```
Nome: SMTP_PASS
Valor: [cole a senha de 16 caracteres do Passo 3.1]
```

---

### Passo 4: Adicionar Pilotos (2 minutos)

**Opção A: Via Table Editor (Mais Fácil)**

1. Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/editor
2. Selecione tabela `pilotos`
3. Clique em **"Insert row"**
4. Preencha os campos:
   - `nome`: Nome do piloto (ex: "JULIO MELO")
   - `email`: Email (deve ser o mesmo usado no login)
   - `grid`: `carreira` ou `light`
   - `equipe`: Nome da equipe
   - `whatsapp`: Telefone (opcional)
   - `is_steward`: `true` se for steward, `false` se não
5. Clique em **"Save"**

**Opção B: Via SQL**

```sql
INSERT INTO pilotos (nome, email, grid, equipe, whatsapp, is_steward) VALUES
('JULIO MELO', 'jmelogp@gmail.com', 'carreira', 'STEWARDS', '+55 51 98343-3940', true);
```

---

### Passo 5: Testar (1 minuto)

**Opção A: Script Automático**

```bash
node scripts/testar_supabase.js
```

**Opção B: Teste Manual**

1. Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/functions/send-email
2. Clique em **"Invoke function"**
3. Cole este JSON:

```json
{
  "to": "seu-email@teste.com",
  "subject": "Teste de Configuração",
  "html": "<h1>Teste</h1><p>Se você recebeu este email, está funcionando!</p>",
  "templateType": "teste"
}
```

4. Clique em **"Invoke"**
5. Verifique se recebeu o email

---

## ✅ Checklist Final

Antes de considerar completo, verifique:

- [ ] ✅ Todas as 7 tabelas foram criadas
- [ ] ✅ Edge Function `send-email` foi deployada
- [ ] ✅ 4 secrets SMTP foram configurados (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
- [ ] ✅ Pelo menos 1 piloto foi inserido na tabela `pilotos`
- [ ] ✅ Teste de email foi enviado com sucesso
- [ ] ✅ Frontend consegue acessar `/analises` sem erros

---

## 🆘 Problemas Comuns

### ❌ "SMTP credentials não configuradas"
**Solução:** Verifique se os 4 secrets estão configurados no Passo 3.2

### ❌ "Edge Function not found"
**Solução:** Faça o deploy novamente (Passo 2)

### ❌ "Authentication failed" no email
**Solução:** 
- Verifique se o App Password está correto (sem espaços)
- Certifique-se de que a verificação em 2 etapas está ativada
- Tente gerar um novo App Password

### ❌ "RLS policy violation"
**Solução:**
- Verifique se o usuário está logado no Supabase
- Certifique-se de que o email do usuário existe na tabela `pilotos`

---

## 📚 Documentação Adicional

- **Guia Completo:** `CONFIGURACAO_SUPABASE.md`
- **Guia Rápido:** `GUIA_RAPIDO_SETUP.md`
- **Schema SQL:** `supabase-schema.sql`
- **Edge Function:** `supabase/functions/send-email/index.ts`

---

## 🎉 Pronto!

Se todos os passos foram concluídos com sucesso, seu Supabase está configurado e pronto para uso!

Agora você pode:
- ✅ Enviar acusações via `/analises`
- ✅ Receber emails automáticos
- ✅ Stewards podem emitir vereditos
- ✅ Sistema completo funcionando!

---

**Dúvidas?** Consulte `CONFIGURACAO_SUPABASE.md` para instruções detalhadas.






















