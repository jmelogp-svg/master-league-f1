# 📋 Estado Atual do Projeto - Master League F1

**Data:** 13/12/2024  
**Última Atualização:** Implementação de autenticação 2FA via WhatsApp (em progresso)

---

## ✅ O QUE JÁ ESTÁ FUNCIONANDO

### 1. Sistema de Cache Supabase (CONCLUÍDO)
- ✅ Tabelas de cache criadas no Supabase:
  - `classificacao_cache` (Carreira e Light)
  - `power_ranking_cache`
  - `calendario_cache`
  - `tracks_cache`
  - `minicup_cache`
  - `sync_log`

- ✅ Edge Functions criadas:
  - `sync-google-sheets`: Sincroniza dados do Google Sheets para Supabase
  - `sync-scheduler`: Orquestra sincronizações automáticas

- ✅ Hook `useSupabaseCache` criado:
  - Busca do Supabase primeiro
  - Fallback automático para Google Sheets
  - Cache local (localStorage) como último recurso
  - Tratamento de problemas de timezone

- ✅ Páginas usando Supabase:
  - `Home.jsx`: Minicup carrossel → Supabase ✅
  - `Minicup.jsx`: Tabela completa → Supabase ✅
  - `useLeagueData.js`: Classificação, Tracks, Power Ranking → Supabase ✅
  - `PowerRanking.jsx`: Atualizado para usar `usePowerRankingCache` ✅

### 2. Sistema de Análises (CONCLUÍDO)
- ✅ Sistema completo de acusações, defesas e vereditos
- ✅ Tabelas no Supabase:
  - `lances` - Registro de lances polêmicos
  - `acusacoes` - Acusações de pilotos
  - `defesas` - Defesas dos acusados
  - `verdicts` - Vereditos dos stewards
  - `email_log` - Log de emails enviados
  - `notificacoes_admin` - Notificações para admins

- ✅ Funcionalidades:
  - Formulários de acusação e defesa
  - Suporte a múltiplas plataformas de vídeo (YouTube, Vimeo, Google Drive, etc.)
  - Sistema de deadlines (Light Grid)
  - Cálculo automático de penalidades
  - Envio automático de emails
  - Painel de stewards para emitir vereditos

### 3. Painel Administrativo (CONCLUÍDO)
- ✅ Painel admin (`/admin`)
  - ✅ Edição de usuários/pilotos (nome, email, grid, equipe, whatsapp, gamertag, is_steward)
  - ✅ Aprovação e reset de usuários
  - ✅ Gerenciamento de jurados
  - ✅ Notificações de acusações
  - ✅ Visualização de pilotos cadastrados (tabela `pilotos`)

### 4. Sistema de Autenticação 2FA via WhatsApp (EM PROGRESSO)

#### ✅ Backend Implementado:
- ✅ Tabela `whatsapp_verification_codes` criada no Supabase
  - Armazena códigos de verificação de 6 dígitos
  - Expiração de 10 minutos
  - Controle de tentativas e uso
  - RLS policies configuradas

- ✅ Edge Function `send-whatsapp-code` criada e deployada
  - Gera código de 6 dígitos
  - Formata números de telefone (remove máscaras, adiciona código do país)
  - Suporta múltiplas APIs: Twilio, Z-API, CallMeBot
  - Valida piloto na tabela `pilotos`
  - Atualiza WhatsApp do piloto se necessário
  - Logs detalhados para debugging

- ✅ Utilitário `src/utils/whatsappAuth.js` criado
  - `requestVerificationCode()` - Solicita código via Edge Function
  - `verifyCode()` - Valida código digitado (a implementar)

#### ⏳ Frontend (PENDENTE):
- ⏳ Atualizar `src/pages/Login.jsx` com novo fluxo:
  - Verificar email na tabela `pilotos` (Supabase)
  - Solicitar WhatsApp se não cadastrado
  - Enviar código via Edge Function
  - Validar código digitado
  - Autenticar e redirecionar para `/dashboard`

- ⏳ Atualizar `src/pages/Dashboard.jsx`:
  - Proteger rota com verificação de autenticação
  - Verificar se piloto está validado (tem WhatsApp)

#### ⏳ Configuração (EM PROGRESSO):
- ✅ Conta Twilio criada
- ✅ WhatsApp Sandbox configurado
- ✅ Número cadastrado no Sandbox (`+551983433940`)
- ⏳ Secrets do Twilio no Supabase (parcialmente configurado - verificar)
  - `WHATSAPP_API_TYPE` = `twilio`
  - `TWILIO_ACCOUNT_SID` = (configurar)
  - `TWILIO_AUTH_TOKEN` = (configurar)
  - `TWILIO_WHATSAPP_NUMBER` = `whatsapp:+14155238886`

#### 🧪 Testes Realizados:
- ✅ Edge Function testada via terminal (curl/PowerShell)
- ✅ Função retorna `{"success":true,"message":"Código enviado com sucesso"}`
- ⚠️ Mensagem não chegou no WhatsApp (problema de configuração dos secrets)

### 5. Funcionalidades Principais
- ✅ Sistema de login com Google OAuth
- ✅ Painel do piloto (`/dashboard`)
- ✅ Custom Alert/Confirm dialogs
- ✅ Suporte a múltiplas plataformas de vídeo

---

## 🔄 TAREFAS PENDENTES

### 1. Finalizar Autenticação 2FA (ALTA PRIORIDADE)
**Status:** Em progresso  
**Tempo estimado:** 2-3 horas

**Sub-tarefas:**
- [ ] Verificar e configurar todos os secrets do Twilio no Supabase
- [ ] Testar envio de mensagem e confirmar recebimento
- [ ] Atualizar `Login.jsx` com novo fluxo completo
- [ ] Implementar validação de código no frontend
- [ ] Atualizar `Dashboard.jsx` com proteção de rota
- [ ] Testar fluxo completo de autenticação

### 2. Sincronização Automática Google Sheets → Supabase (pilotos)
**Status:** Pendente  
**Prioridade:** Alta (necessário para 2FA funcionar)  
**Tempo estimado:** 30-40 min

**Descrição:**
- Garantir que pilotos da planilha estejam sempre sincronizados com Supabase
- Opção 1: Adicionar ao `sync-scheduler` existente
- Opção 2: Criar botão manual no painel admin

### 3. Atualizar Standings.jsx
**Status:** Pendente  
**Prioridade:** Média  
**Tempo estimado:** 15-20 min  
**Descrição:** Substituir busca direta do Google Sheets pelo hook `useSupabaseCache`

### 4. Melhorar syncPilotosFromSheet.js
**Status:** Pendente  
**Prioridade:** Baixa  
**Tempo estimado:** 20-30 min  
**Descrição:** 
- Adicionar validação de hash para detectar mudanças
- Implementar sincronização incremental (só atualizar o que mudou)

### 5. Criar página AdminSync.jsx
**Status:** Pendente (arquivo já existe, precisa ser integrado)  
**Prioridade:** Média  
**Tempo estimado:** 30-40 min  
**Descrição:** 
- Dashboard para monitorar sincronizações
- Botões para forçar sync manual
- Visualização de logs de sincronização

### 6. Configurar Supabase Cron Jobs
**Status:** Pendente  
**Prioridade:** Média  
**Tempo estimado:** 10-15 min  
**Descrição:** 
- Configurar cron jobs no Supabase Dashboard
- Automatizar execução do `sync-scheduler`
- Documentação do processo

---

## 📁 ESTRUTURA DE ARQUIVOS IMPORTANTES

### Hooks
- `src/hooks/useLeagueData.js` - Busca dados de classificação, tracks, PR (usa Supabase)
- `src/hooks/useSupabaseCache.js` - Hook genérico para cache Supabase
- `src/hooks/useAnalises.js` - Dados de análises
- `src/hooks/useCustomAlert.js` - Alert/Confirm customizados

### Páginas
- `src/pages/Home.jsx` - Página inicial (Minicup carrossel usa Supabase)
- `src/pages/Minicup.jsx` - Tabela Minicup (usa Supabase)
- `src/pages/Standings.jsx` - Classificação (AINDA usa Google Sheets direto)
- `src/pages/PowerRanking.jsx` - Power Ranking (usa Supabase via `usePowerRankingCache`)
- `src/pages/Admin.jsx` - Painel administrativo
- `src/pages/AdminSync.jsx` - Dashboard de sincronização (criado, não integrado)
- `src/pages/Login.jsx` - Login (PRECISA SER ATUALIZADO para 2FA)
- `src/pages/Dashboard.jsx` - Painel do piloto (PRECISA SER ATUALIZADO para proteção)

### Edge Functions
- `supabase/functions/sync-google-sheets/index.ts` - Sincroniza Google Sheets → Supabase
- `supabase/functions/sync-scheduler/index.ts` - Orquestra sincronizações
- `supabase/functions/send-email/index.ts` - Envio de emails via SMTP
- `supabase/functions/send-whatsapp-code/index.ts` - Envio de código WhatsApp (2FA) ✅

### Utilitários
- `src/utils/whatsappAuth.js` - Funções para autenticação WhatsApp (2FA) ✅
- `src/utils/emailService.js` - Serviço de envio de emails

### Componentes
- `src/components/VideoEmbed.jsx` - Embed de vídeos de múltiplas plataformas
- `src/components/CustomAlert.jsx` - Alert/Confirm customizados
- `src/components/DisableAutoScroll.jsx` - Previne scroll automático

### Schemas SQL
- `supabase-schema.sql` - Schema principal (pilotos, lances, acusacoes, defesas, verdicts, etc.)
- `supabase-schema-auth.sql` - Schema de autenticação (whatsapp_verification_codes) ✅

### Scripts de Teste
- `teste-whatsapp-curl.bat` - Teste da Edge Function via cURL (Windows)
- `teste-whatsapp-terminal.ps1` - Teste da Edge Function via PowerShell
- `test-whatsapp-code.html` - Teste da Edge Function via navegador

---

## 🔧 CONFIGURAÇÕES DO SUPABASE

### Tabelas Principais
- `pilotos` - Cadastro de pilotos (nome, email, grid, equipe, whatsapp, is_steward)
- `lances` - Lances polêmicos para análise
- `acusacoes` - Acusações de pilotos
- `defesas` - Defesas dos acusados
- `verdicts` - Vereditos dos stewards
- `email_log` - Log de emails enviados
- `notificacoes_admin` - Notificações para admins

### Tabelas de Cache
- `classificacao_cache` - Cache de classificação (Carreira/Light)
- `power_ranking_cache` - Cache de Power Ranking
- `calendario_cache` - Cache de calendário
- `tracks_cache` - Cache de tracks
- `minicup_cache` - Cache de Minicup
- `sync_log` - Log de sincronizações

### Tabelas de Autenticação
- `whatsapp_verification_codes` - Códigos de verificação 2FA ✅
  - Campos: `id`, `email`, `whatsapp`, `code`, `expires_at`, `used`, `attempts`, `created_at`
  - RLS habilitado
  - Índices otimizados

### Edge Functions
- `SERVICE_ROLE_KEY` configurada como secret
- `SUPABASE_URL` disponível automaticamente
- Secrets do Twilio (configurar):
  - `WHATSAPP_API_TYPE` = `twilio`
  - `TWILIO_ACCOUNT_SID` = (configurar)
  - `TWILIO_AUTH_TOKEN` = (configurar)
  - `TWILIO_WHATSAPP_NUMBER` = `whatsapp:+14155238886`

### Variáveis de Ambiente
- `SERVICE_ROLE_KEY`: Chave de serviço do Supabase (configurada nas Edge Functions)
- Secrets do Twilio (verificar configuração)

---

## 📊 STATUS DAS SINCRONIZAÇÕES

### Dados Sincronizados
- ✅ Classificação (Carreira/Light) - Temporada 20
- ✅ Power Ranking
- ✅ Tracks
- ✅ Minicup
- ⚠️ Calendário (tabela criada, mas não sincronizado ainda)
- ⏳ Pilotos (precisa sincronização automática para 2FA funcionar)

### Frequência de Sincronização
- Configurado no `sync-scheduler`:
  - Classificação: A cada 30 minutos
  - Power Ranking: A cada 1 hora
  - Tracks: A cada 2 horas
  - Minicup: A cada 15 minutos
  - Calendário: A cada 1 hora

---

## 🐛 PROBLEMAS CONHECIDOS

1. **Idade negativa do cache** - RESOLVIDO ✅
   - Problema: `last_synced_at` no futuro (timezone)
   - Solução: Tratamento no `useSupabaseCache.js` para aceitar cache válido se diferença < 24h

2. **Scroll automático no admin** - RESOLVIDO ✅
   - Problema: Tela subia automaticamente ao expandir elementos
   - Solução: `DisableAutoScroll.jsx` + preservação de scroll position

3. **Mensagem WhatsApp não chegando** - EM INVESTIGAÇÃO ⚠️
   - Problema: Edge Function retorna sucesso, mas mensagem não chega
   - Possíveis causas:
     - Secrets do Twilio não configurados corretamente
     - Número não cadastrado no Sandbox (já verificado - está cadastrado)
     - Formato do número incorreto
   - Status: Logs mostram "❌ Twilio não configurado" - precisa verificar secrets

4. **Número com formatação incorreta no banco** - DETECTADO ⚠️
   - Problema: Número cadastrado como `5551983433940` (5 extra) vs `551983433940` (correto)
   - Solução: A função `formatPhoneNumber` já remove caracteres não numéricos, mas pode haver inconsistência no banco

---

## 📝 PRÓXIMOS PASSOS SUGERIDOS

### Alta Prioridade:
1. **Finalizar configuração do Twilio**
   - Verificar todos os secrets no Supabase
   - Testar envio de mensagem e confirmar recebimento
   - Corrigir problemas de formatação de número

2. **Implementar frontend do 2FA**
   - Atualizar `Login.jsx` com novo fluxo
   - Implementar validação de código
   - Atualizar `Dashboard.jsx` com proteção

3. **Configurar sincronização automática de pilotos**
   - Adicionar ao `sync-scheduler` ou criar botão manual no admin
   - Garantir que pilotos da planilha estejam sempre no Supabase

### Média Prioridade:
- Atualizar `Standings.jsx` para usar Supabase
- Integrar `AdminSync.jsx` na rota `/admin/sync`
- Configurar Cron Jobs no Supabase

### Baixa Prioridade:
- Melhorar `syncPilotosFromSheet.js` com hash e sincronização incremental
- Adicionar mais logs e métricas de performance

---

## 🔗 LINKS ÚTEIS

- **Supabase Dashboard:** https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp
- **Edge Functions:** https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/functions
- **Secrets (Edge Functions):** https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/settings/functions
- **Table Editor:** https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/editor
- **Twilio Dashboard:** https://console.twilio.com
- **Twilio WhatsApp Sandbox:** https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn

---

## 📌 NOTAS IMPORTANTES

### Sistema de Cache
- O sistema está usando **Supabase como fonte primária** para todos os dados principais
- **Google Sheets** continua sendo usado como **fallback automático** se Supabase falhar
- **localStorage** é usado como **último recurso** de cache
- Todas as sincronizações são **logadas** na tabela `sync_log` para monitoramento

### Sistema de Autenticação 2FA
- **Backend:** 100% implementado e testado ✅
- **Frontend:** Pendente de implementação ⏳
- **Configuração:** Secrets do Twilio precisam ser verificados ⚠️
- **Fluxo:** Email → Supabase → WhatsApp → Código → Validação → Dashboard

### Números de Telefone
- A função `formatPhoneNumber` remove automaticamente máscaras e caracteres não numéricos
- Formato esperado: `551983433940` (55 + DDD + número)
- Formato Twilio: `whatsapp:+551983433940`
- Formato Sandbox: `whatsapp:+14155238886` (número do Twilio)

---

## 📚 DOCUMENTAÇÃO RELACIONADA

- `AUTENTICACAO_2FA_SETUP.md` - Guia de setup do sistema 2FA
- `SETUP_TWILIO_PASSO_A_PASSO.md` - Guia detalhado de configuração do Twilio
- `DATABASE_STRUCTURE.md` - Estrutura completa do banco de dados
- `supabase-schema.sql` - Schema SQL principal
- `supabase-schema-auth.sql` - Schema SQL de autenticação

---

**Última modificação:** 13/12/2024 - Sistema de autenticação 2FA via WhatsApp (backend concluído, frontend pendente)
