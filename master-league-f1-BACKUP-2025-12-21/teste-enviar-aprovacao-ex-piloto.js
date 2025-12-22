// Script para testar o envio de mensagem de aprovação para ex-piloto
// Execute no console do navegador ou Node.js com Supabase configurado

const testarEnvioAprovacao = async () => {
    // Dados do ex-piloto (mesmos da mensagem anterior)
    const email = 'juliomelobr@hotmail.com';
    const nome = 'Alonso Meloso';
    const whatsapp = '5551983433940'; // Número anterior
    
    // URL do site
    const siteUrl = 'https://www.masterleaguef1.com.br';
    const loginUrl = `${siteUrl}/ex-piloto/login`;

    // Mensagem atualizada com link direto
    const mensagem = `✅ *ACESSO LIBERADO - MASTER LEAGUE F1*\n\nOlá ${nome},\n\nSeu acesso ao Painel do Piloto foi *APROVADO*!\n\n📋 *CADASTRE SUA SENHA E ACESSE:*\n\n🔗 Link direto: ${loginUrl}\n\n📝 *Passos:*\n\n1️⃣ Clique no link acima\n\n2️⃣ Digite seu e-mail:\n   ${email}\n\n3️⃣ Valide seu WhatsApp com o código que será enviado\n\n4️⃣ Crie sua senha de acesso\n\n5️⃣ Pronto! Você terá acesso ao seu painel histórico\n\n🏎️ Reveja a sua história na Master League F1`;
    
    console.log('📤 Enviando mensagem de aprovação...');
    console.log('📧 Email:', email);
    console.log('👤 Nome:', nome);
    console.log('📱 WhatsApp:', whatsapp);
    console.log('📄 Mensagem:', mensagem);
    console.log('\n---\n');

    try {
        // Importar supabase (ajuste conforme seu ambiente)
        // const { supabase } = await import('./src/supabaseClient.js');
        
        // Se estiver no console do navegador, use:
        // const { supabase } = window.supabase; // ou importe de onde estiver disponível
        
        // Limpar WhatsApp (remover caracteres não numéricos)
        const whatsappLimpo = whatsapp.replace(/\D/g, '');
        
        if (whatsappLimpo.length < 10) {
            console.error('❌ WhatsApp inválido:', whatsapp);
            return;
        }

        console.log('✅ WhatsApp limpo:', whatsappLimpo);
        console.log('📡 Chamando Edge Function send-whatsapp-code...\n');

        // Se estiver no navegador, use:
        const { data, error } = await supabase.functions.invoke('send-whatsapp-code', {
            body: {
                email: email,
                whatsapp: whatsappLimpo,
                nomePiloto: nome,
                tipo: 'notificacao_aprovacao',
                mensagemCustomizada: mensagem
            }
        });

        if (error) {
            console.error('❌ Erro ao enviar WhatsApp:', error);
            console.error('Detalhes:', JSON.stringify(error, null, 2));
        } else {
            console.log('✅ Notificação WhatsApp enviada com sucesso!');
            console.log('📦 Resposta:', JSON.stringify(data, null, 2));
        }
    } catch (err) {
        console.error('❌ Erro ao chamar Edge Function:', err);
        console.error('Stack:', err.stack);
    }
};

// Para executar no console do navegador:
// testarEnvioAprovacao();

// Para Node.js (descomente e ajuste):
// testarEnvioAprovacao().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });

console.log('💡 Para executar, chame: testarEnvioAprovacao()');
console.log('   (Certifique-se de ter o Supabase disponível no escopo)');

// Exportar para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = testarEnvioAprovacao;
}


















