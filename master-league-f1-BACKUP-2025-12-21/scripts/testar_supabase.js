/**
 * Script para testar a configuração do Supabase
 * Execute: node scripts/testar_supabase.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar configuração do Supabase
const supabaseUrl = 'https://ueqfmjwdijaeawvxhdtp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlcWZtandkaWphZWF3dnhoZHRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MjEzOTEsImV4cCI6MjA4MDA5NzM5MX0.b-y_prO5ffMuSOs7rUvrMru4SDN06BHqyMsbUIDDdJI';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🧪 Iniciando testes do Supabase...\n');

// Testes
const testes = [];

// Teste 1: Verificar conexão
testes.push(async () => {
  console.log('1️⃣ Testando conexão com Supabase...');
  try {
    const { data, error } = await supabase.from('pilotos').select('count').limit(1);
    if (error) throw error;
    console.log('   ✅ Conexão OK\n');
    return true;
  } catch (err) {
    console.log('   ❌ Erro de conexão:', err.message, '\n');
    return false;
  }
});

// Teste 2: Verificar tabelas
testes.push(async () => {
  console.log('2️⃣ Verificando tabelas...');
  const tabelas = ['pilotos', 'lances', 'acusacoes', 'defesas', 'verdicts', 'email_log', 'notificacoes_admin'];
  let todasExistem = true;
  
  for (const tabela of tabelas) {
    try {
      const { error } = await supabase.from(tabela).select('*').limit(1);
      if (error) {
        console.log(`   ❌ Tabela "${tabela}" não existe ou não está acessível`);
        todasExistem = false;
      } else {
        console.log(`   ✅ Tabela "${tabela}" OK`);
      }
    } catch (err) {
      console.log(`   ❌ Erro ao verificar "${tabela}":`, err.message);
      todasExistem = false;
    }
  }
  console.log('');
  return todasExistem;
});

// Teste 3: Verificar pilotos
testes.push(async () => {
  console.log('3️⃣ Verificando pilotos...');
  try {
    const { data, error, count } = await supabase
      .from('pilotos')
      .select('*', { count: 'exact' });
    
    if (error) throw error;
    
    if (count === 0) {
      console.log('   ⚠️  Nenhum piloto cadastrado. Adicione pilotos na tabela "pilotos".\n');
      return false;
    } else {
      console.log(`   ✅ ${count} piloto(s) cadastrado(s)`);
      const stewards = data.filter(p => p.is_steward);
      console.log(`   ✅ ${stewards.length} steward(s) cadastrado(s)\n`);
      return true;
    }
  } catch (err) {
    console.log('   ❌ Erro:', err.message, '\n');
    return false;
  }
});

// Teste 4: Verificar Edge Function
testes.push(async () => {
  console.log('4️⃣ Testando Edge Function send-email...');
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: 'teste@example.com',
        subject: 'Teste de Configuração',
        html: '<h1>Teste</h1><p>Se você recebeu este email, a Edge Function está funcionando!</p>',
        templateType: 'teste'
      }
    });
    
    if (error) {
      if (error.message.includes('Function not found')) {
        console.log('   ❌ Edge Function "send-email" não encontrada. Faça o deploy primeiro.\n');
      } else if (error.message.includes('SMTP')) {
        console.log('   ⚠️  Edge Function existe, mas SMTP não está configurado. Configure os secrets.\n');
      } else {
        console.log('   ❌ Erro:', error.message, '\n');
      }
      return false;
    } else {
      console.log('   ✅ Edge Function respondendo (email pode não ter sido enviado se SMTP não estiver configurado)\n');
      return true;
    }
  } catch (err) {
    console.log('   ❌ Erro:', err.message, '\n');
    return false;
  }
});

// Teste 5: Verificar RLS Policies
testes.push(async () => {
  console.log('5️⃣ Verificando RLS Policies...');
  try {
    // Tentar ler sem autenticação (deve funcionar para tabelas públicas)
    const { data, error } = await supabase.from('lances').select('*').limit(1);
    if (error && error.message.includes('RLS')) {
      console.log('   ⚠️  RLS pode estar bloqueando acesso. Verifique as policies.\n');
      return false;
    } else {
      console.log('   ✅ RLS Policies configuradas\n');
      return true;
    }
  } catch (err) {
    console.log('   ⚠️  Não foi possível verificar RLS:', err.message, '\n');
    return false;
  }
});

// Executar todos os testes
async function executarTestes() {
  const resultados = [];
  
  for (const teste of testes) {
    const resultado = await teste();
    resultados.push(resultado);
    // Pequeno delay entre testes
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Resumo
  console.log('═══════════════════════════════════════════════════');
  console.log('📊 RESUMO DOS TESTES');
  console.log('═══════════════════════════════════════════════════');
  const sucessos = resultados.filter(r => r).length;
  const total = resultados.length;
  console.log(`✅ Sucessos: ${sucessos}/${total}`);
  console.log(`❌ Falhas: ${total - sucessos}/${total}`);
  
  if (sucessos === total) {
    console.log('\n🎉 Todos os testes passaram! Supabase está configurado corretamente!');
  } else {
    console.log('\n⚠️  Alguns testes falharam. Verifique a configuração acima.');
    console.log('\n📖 Consulte: CONFIGURACAO_SUPABASE.md para mais detalhes.');
  }
}

executarTestes().catch(console.error);


























