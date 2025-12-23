# Script para deploy manual no Vercel
# Uso: .\deploy-vercel.ps1

Write-Host ""
Write-Host "🚀 Iniciando deploy no Vercel..." -ForegroundColor Cyan
Write-Host ""

# Verificar se está no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erro: Execute este script no diretório do projeto!" -ForegroundColor Red
    exit 1
}

# Verificar se o build está atualizado
Write-Host "📦 Verificando se precisa fazer build..." -ForegroundColor Yellow
if (-not (Test-Path "dist")) {
    Write-Host "⚠️  Pasta 'dist' não encontrada. Fazendo build..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro no build!" -ForegroundColor Red
        exit 1
    }
}

# Fazer deploy
Write-Host ""
Write-Host "🚀 Fazendo deploy em produção..." -ForegroundColor Cyan
Write-Host ""

npx vercel --prod --yes

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deploy concluído com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 URL: https://master-league-f1.vercel.app" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Erro no deploy!" -ForegroundColor Red
    Write-Host ""
    exit 1
}














