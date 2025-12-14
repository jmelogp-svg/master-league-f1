import { supabase } from '../supabaseClient';

// CADASTRO MLF1 (gid=1844400629)
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=1844400629&single=true&output=csv';

/**
 * Sincroniza pilotos da planilha "CONTROLE ML1" (aba INSCRIÇÃO T20) com Supabase
 */
export async function syncPilotosFromSheet() {
    try {
        console.log('🔄 Iniciando sincronização...');
        console.log('📡 URL:', SHEET_CSV_URL);

        // 1. Buscar dados da planilha
        const response = await fetch(SHEET_CSV_URL);
        console.log('📥 Status da resposta:', response.status);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const csvText = await response.text();
        console.log('📄 Tamanho do CSV:', csvText.length, 'caracteres');
        console.log('📄 Primeiros 500 caracteres:', csvText.substring(0, 500));

        // Parse CSV
        const lines = csvText.split('\n').filter(line => line.trim().length > 0);
        console.log('📋 Total de linhas:', lines.length);

        if (lines.length < 2) {
            return { success: false, count: 0, error: 'Planilha vazia ou sem dados' };
        }

        // Mostrar cabeçalho para debug
        const headerFields = parseCSVLine(lines[0]);
        console.log('📋 Colunas do cabeçalho:', headerFields.length);
        headerFields.forEach((col, idx) => {
            console.log(`   Coluna ${idx} (${String.fromCharCode(65 + idx)}): "${col}"`);
        });

        const pilotosParaInserir = [];

        // Processar cada linha (começando da linha 1, pulando cabeçalho)
        for (let i = 1; i < lines.length; i++) {
            const fields = parseCSVLine(lines[i]);
            
            // Preencher campos faltantes com string vazia
            while (fields.length < 20) fields.push('');

            // Mapeamento conforme informado:
            // Coluna A (0) = Nome
            // Coluna B (1) = Gamertag
            // Coluna C (2) = WhatsApp  
            // Coluna D (3) = Plataforma
            // Coluna E (4) = Grid
            // Coluna F (5) = Email
            // Coluna O (14) = Nome do Piloto
            const nome = (fields[14] || fields[0] || '').trim();
            const gamertag = (fields[1] || '').trim();
            const whatsapp = (fields[2] || '').trim();
            const plataformaRaw = (fields[3] || '').trim();
            const gridRaw = (fields[4] || '').trim();
            const emailColunaF = (fields[5] || '').trim().toLowerCase();
            const emailColunaG = (fields[6] || '').trim().toLowerCase(); // Novo mapeamento para coluna G

            console.log(`Linha ${i + 1}: Gamertag="${gamertag}", Email="${emailColunaG}", Nome="${nome}", Grid="${gridRaw}"`);

            // Validar campos obrigatórios
            if (!emailColunaG || !nome) {
                console.warn(`⚠️ Linha ${i + 1} ignorada - email: "${emailColunaG}", nome: "${nome}"`);
                continue;
            }

            // Extrair grid
            let grid = 'carreira';
            if (gridRaw.toLowerCase().includes('light')) {
                grid = 'light';
            } else if (gridRaw.toLowerCase().includes('carreira')) {
                grid = 'carreira';
            }

            // Extrair plataforma
            let plataforma = 'PC';
            const platLower = plataformaRaw.toLowerCase();
            if (platLower.includes('playstation') || platLower.includes('ps')) {
                plataforma = 'PlayStation';
            } else if (platLower.includes('xbox')) {
                plataforma = 'Xbox';
            } else if (platLower.includes('pc')) {
                plataforma = 'PC';
            }

            pilotosParaInserir.push({
                email: emailColunaG, // Usar email da coluna G
                nome,
                gamertag: gamertag || null,
                whatsapp: whatsapp || null,
                grid,
                plataforma,
                equipe: null,
                is_steward: false
            });

            console.log(`✅ Piloto adicionado: ${nome} (${emailColunaG}) - Grid: ${grid}`);
        }

        console.log(`📊 Total de pilotos para inserir: ${pilotosParaInserir.length}`);

        if (pilotosParaInserir.length === 0) {
            return { success: false, count: 0, error: 'Nenhum piloto válido encontrado na planilha' };
        }

        // Inserir no Supabase
        console.log('💾 Inserindo no Supabase...');
        
        const { data, error } = await supabase
            .from('pilotos')
            .upsert(pilotosParaInserir, { 
                onConflict: 'email',
                ignoreDuplicates: false
            })
            .select();

        if (error) {
            console.error('❌ Erro do Supabase:', error);
            return { success: false, error: error.message };
        }

        console.log('✅ Dados inseridos:', data);
        console.log(`✅ Sincronização concluída! ${pilotosParaInserir.length} pilotos processados`);
        
        return { success: true, count: pilotosParaInserir.length };

    } catch (error) {
        console.error('❌ Erro na sincronização:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Busca um piloto específico na planilha "CADASTRO MLF1" pelo e-mail de login
 * NOVA ESTRUTURA:
 * - Email de login: Coluna H (índice 7) - "E-mail Login"
 * - WhatsApp: Coluna C (índice 2) - "WhatsApp"
 * - Nome do Piloto: Coluna O (índice 14) - "Nome Piloto"
 * Retorna os dados do piloto ou null se não encontrar
 */
export async function findDriverByEmail(userEmail) {
    try {
        console.log('🔍 Buscando piloto na planilha CADASTRO MLF1 para:', userEmail);
        console.log('📡 URL da planilha:', SHEET_CSV_URL);
        
        const response = await fetch(SHEET_CSV_URL);
        console.log('📥 Status HTTP:', response.status);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
        }
        
        const csvText = await response.text();
        console.log('📄 Tamanho do CSV:', csvText.length, 'caracteres');
        
        const lines = csvText.split('\n').filter(line => line.trim().length > 0);
        console.log('📋 Total de linhas:', lines.length);
        
        if (lines.length < 2) {
            return { found: false, error: 'Planilha vazia ou inacessível' };
        }

        // Analisar cabeçalho
        const headerFields = parseCSVLine(lines[0]);
        console.log('📋 Cabeçalho (total de colunas):', headerFields.length);
        console.log('📋 Nomes das colunas:', headerFields);

        const targetEmail = userEmail.trim().toLowerCase();
        console.log('🎯 E-mail procurado (coluna H):', targetEmail);

        // Buscar APENAS na coluna H (índice 7) - "E-mail Login"
        for (let i = 1; i < lines.length; i++) {
            const fields = parseCSVLine(lines[i]);
            while (fields.length < 20) fields.push('');

            // Email de login está na coluna H (índice 7)
            const emailLogin = (fields[7] || '').trim().toLowerCase();

            // Se encontrar o e-mail na coluna H
            if (emailLogin === targetEmail) {
                const nomeCadastrado = (fields[0] || '').trim(); // Coluna A
                const nomePiloto = (fields[14] || nomeCadastrado || '').trim(); // Coluna O (Nome Piloto)
                const whatsappRaw = (fields[2] || '').trim(); // Coluna C (WhatsApp)
                const gamertag = (fields[1] || '').trim(); // Coluna B (Gamertag/ID)
                const gridRaw = (fields[4] || '').trim(); // Coluna E (Grid)
                const plataformaRaw = (fields[3] || '').trim(); // Coluna D (Plataforma)

                console.log('\n✅ PILOTO ENCONTRADO!');
                console.log('   Nome Cadastrado (A):', nomeCadastrado);
                console.log('   Nome Piloto (O):', nomePiloto);
                console.log('   Email Login (H):', targetEmail);
                console.log('   WhatsApp (C):', whatsappRaw);
                console.log('   Grid (E):', gridRaw);
                console.log('   Plataforma (D):', plataformaRaw);

                // Determinar Grid
                let grid = 'carreira';
                if (gridRaw.toLowerCase().includes('light')) grid = 'light';
                
                // Determinar Plataforma
                let plataforma = 'PC';
                const platLower = plataformaRaw.toLowerCase();
                if (platLower.includes('playstation') || platLower.includes('ps')) plataforma = 'PlayStation';
                else if (platLower.includes('xbox')) plataforma = 'Xbox';
                else if (platLower.includes('pc')) plataforma = 'PC';

                return {
                    found: true,
                    nome: nomePiloto, // Usar nome da coluna O
                    nomeCadastrado: nomeCadastrado, // Nome completo da coluna A
                    whatsappEsperado: whatsappRaw,
                    email: targetEmail,
                    gamertag: gamertag || null,
                    grid,
                    plataforma
                };
            }
        }

        console.log('\n❌ E-mail NÃO ENCONTRADO na coluna H (E-mail Login)');
        console.log(`   Total de linhas verificadas: ${lines.length - 1}`);
        return { found: false, error: 'E-mail não encontrado na planilha CADASTRO MLF1' };

    } catch (error) {
        console.error('❌ Erro ao buscar na planilha:', error);
        return { found: false, error: error.message };
    }
}

/**
 * Parser CSV que respeita campos com aspas
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}
