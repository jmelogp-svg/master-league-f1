# CHANGELOG - Master League F1

## Controle de Versões e Backups

Este arquivo documenta as versões do projeto e suas alterações.

---

## v1.1.0 - 2025-01-13 (VERSÃO ATUAL)
**Backup:** Commit `262280c` - "feat: Implementação completa de 2FA com persistência via localStorage"

### Funcionalidades Implementadas:
- ✅ Sistema completo de autenticação 2FA via WhatsApp
- ✅ Persistência de validação 2FA usando localStorage (ml_pilot_2fa_ok:email)
- ✅ Sincronização automática de pilotos da planilha Google Sheets para Supabase
- ✅ Validação de WhatsApp com até 3 tentativas antes de forçar reenvio de inscrição
- ✅ Suporte a Twilio (padrão) e Z-API (fallback) com auto-detecção
- ✅ Correção de RLS policies para validação de códigos WhatsApp
- ✅ Fluxo completo: Login → Verificação Email → WhatsApp → Código → Dashboard
- ✅ Limpeza de localStorage apenas no logout explícito
- ✅ Proteção de rota no Dashboard com verificação de 2FA

### Melhorias Técnicas:
- ✅ Tratamento robusto de erros (respostas não-JSON)
- ✅ Uso de `supabase.functions.invoke()` para garantir URL correta
- ✅ Correção de OAuth flow (PKCE e hash antigo)
- ✅ Sincronização on-demand de pilotos durante login
- ✅ Validação de WhatsApp sempre requerida (campo não pré-preenchido)

### Status:
- Sistema 2FA totalmente funcional
- Twilio configurado e enviando mensagens
- Validação de código funcionando
- Persistência entre sessões funcionando

---

## v1.0.0 - 2025-12-10 (VERSÃO ESTÁVEL)
**Backup:** `master-league-f1-BACKUP-v1.0.0-2025-12-10`

### Funcionalidades Incluídas:
- ✅ Home com Hero, próxima corrida, carrossel de pilotos
- ✅ Grid Minicup na Home (carrossel verde)
- ✅ Grid Carreira T19/T20 na Home
- ✅ Top 3 Carreira e Light
- ✅ Página Minicup com tema verde
- ✅ Página Classificação (Pilotos, Equipes, Resultados)
- ✅ Página Calendário
- ✅ Página Análises (sistema de julgamento)
- ✅ Página Mercado
- ✅ Página Telemetria
- ✅ Página Regulamento
- ✅ Página Hall da Fama
- ✅ Página Power Ranking
- ✅ Área do Piloto (Dashboard com login)
- ✅ Sistema de Jurados
- ✅ Integração Supabase
- ✅ Integração Google Sheets

### Status:
- Site funcionando igual ao Netlify (masterleaguef1.com.br)
- Pronto para novas implementações

---

## Backups Antigos (para referência):
- `master-league-f1 -BACKUP-10-12-25-OK` - Backup original do Netlify
- `master-league-f1-BACKUP-ATUAL-10-12-25-1219` - Backup intermediário
- `master-league-f1-BACKUP-ATUAL-10-12-25-1220` - Backup intermediário

---

## Como criar novo backup:

```powershell
cd "C:\Users\Usuario\Documents\Master League F1\Projetos_React"
$version = "v1.1.0"  # Alterar versão
$date = Get-Date -Format "yyyy-MM-dd"
Copy-Item -Recurse "master-league-f1" "master-league-f1-BACKUP-$version-$date"
```

## Convenção de Versões:
- **v1.x.x** - Versão maior (mudanças grandes)
- **vx.1.x** - Novas funcionalidades
- **vx.x.1** - Correções de bugs

---

## Próximas Implementações Planejadas:
- [ ] Melhorias no login de pilotos
- [ ] Novas estatísticas no Hall da Fama
- [ ] Sistema de notificações
- [ ] Melhorias de performance
