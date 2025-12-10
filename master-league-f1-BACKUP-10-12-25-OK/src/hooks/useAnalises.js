import { useState, useEffect } from 'react';

/**
 * Parser CSV robusto que lida com campos entre aspas
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Aspas escapadas
                current += '"';
                i++;
            } else {
                // Toggle estado de aspas
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // Fim do campo
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    // Último campo
    result.push(current.trim());
    
    return result;
}

/**
 * Hook para buscar pilotos da planilha "INSCRIÇÃO T20"
 * Colunas: A=nome, B=gamertag, C=celular, D=plataforma, E=grid, I=email, P=Nome de Piloto
 */
export function usePilotosData() {
    const [pilotos, setPilotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPilotos = async () => {
            try {
                const sheetId = '2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM';
                const gid = '1844400629'; // INSCRIÇÃO T20
                const url = `https://corsproxy.io/?https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?gid=${gid}&single=true&output=csv`;

                const response = await fetch(url);
                if (!response.ok) throw new Error('Erro ao carregar planilha');

                const csv = await response.text();
                const lines = csv.split('\n').slice(1); // Skip header

                console.log('📋 Total de linhas:', lines.length);

                const pilotosProcessados = lines
                    .filter(line => line.trim())
                    .map((line, idx) => {
                        const values = parseCSVLine(line);
                        
                        // Debug primeira linha
                        if (idx === 0) {
                            console.log('🔍 Primeira linha valores:', values);
                            console.log('  - Nome real (col A/0):', values[0]);
                            console.log('  - Gamertag (col B/1):', values[1]);
                            console.log('  - Celular (col C/2):', values[2]);
                            console.log('  - Grid (col E/4):', values[4]);
                            console.log('  - Email (col I/8):', values[8]);
                            console.log('  - Nome Piloto (col P/15):', values[15]);
                        }

                        // Mapeamento baseado na estrutura REAL do CSV:
                        // A=0: nome real, B=1: gamertag, C=2: celular, E=4: grid, I=8: email, P=15: Nome de Piloto
                        const nomeReal = (values[0] || '').trim();
                        const gamertag = (values[1] || '').trim();
                        const celular = (values[2] || '').trim();
                        const gridRaw = (values[4] || '').toLowerCase();
                        const email = (values[8] || '').trim();
                        const nomePiloto = (values[15] || '').trim().toUpperCase();
                        
                        // Determina grid
                        const grid = gridRaw.includes('light') ? 'light' : 'carreira';
                        
                        return {
                            nome: nomePiloto || nomeReal.toUpperCase(),
                            nomeReal: nomeReal,
                            gamertag: gamertag,
                            whatsapp: celular,
                            grid: grid,
                            email: email,
                            // Gera o nome da foto: remove espaços, acentos e converte para lowercase
                            fotoNome: (nomePiloto || nomeReal).toLowerCase()
                                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                                .replace(/\s+/g, '')
                        };
                    })
                    .filter(p => p.gamertag && p.email); // Precisa ter gamertag e email

                console.log('✅ Pilotos processados:', pilotosProcessados.length);
                if (pilotosProcessados.length > 0) {
                    console.log('🎮 Primeiro piloto:', pilotosProcessados[0]);
                }

                setPilotos(pilotosProcessados);
            } catch (err) {
                console.error('❌ Erro ao carregar pilotos:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPilotos();
    }, []);

    return { pilotos, loading, error };
}

/**
 * Hook para buscar etapas do calendário da T20
 * Planilha "CALENDÁRIO ML1" - Linhas começam no índice 14
 * Coluna A = "Etapa N", C = Data, D = Circuito
 */
export function useCalendarioT20() {
    const [etapas, setEtapas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCalendario = async () => {
            try {
                // GID=0 é a primeira aba (CALENDÁRIO ML1)
                const url = 'https://corsproxy.io/?https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=0&single=true&output=csv';

                const response = await fetch(url);
                if (!response.ok) throw new Error('Erro ao carregar calendário');

                const csv = await response.text();
                const lines = csv.split('\n');
                
                console.log('📅 Total linhas calendário:', lines.length);

                // Procura por linhas que começam com "Etapa"
                const etapasProcessadas = [];
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (line.toLowerCase().startsWith('etapa')) {
                        const values = parseCSVLine(line);
                        
                        // Debug
                        console.log(`📅 Linha ${i}:`, values);
                        
                        // Coluna A = "Etapa N", extrai o número
                        const etapaMatch = values[0].match(/etapa\s*(\d+)/i);
                        const round = etapaMatch ? parseInt(etapaMatch[1]) : null;
                        
                        // Coluna C = Data (índice 2)
                        const date = values[2] || '';
                        
                        // Coluna D = Circuito (índice 3)
                        const circuit = values[3] || '';
                        
                        if (round && circuit) {
                            etapasProcessadas.push({ round, date, circuit });
                        }
                    }
                }

                console.log('✅ Etapas processadas:', etapasProcessadas);

                setEtapas(etapasProcessadas);
            } catch (err) {
                console.error('❌ Erro ao carregar calendário:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchCalendario();
    }, []);

    return { etapas, loading, error };
}

/**
 * Gera código de Lance no formato STW-{Grid}{Season}{Round}{Order}
 * Ex: STW-C190301 (Carreira, Season 19, Round 03, 1º incident)
 */
export function generateLanceCode(grid, season, round, order) {
    const gridPrefix = grid === 'carreira' ? 'C' : 'L';
    return `STW-${gridPrefix}${String(season).slice(-2)}${String(round).padStart(2, '0')}${String(order).padStart(2, '0')}`;
}

/**
 * Calcula pontos de penalidade baseado no tipo
 * Absolvido=0, Advertência=0, Leve=5, Média=10, Grave=15, Gravíssima=20
 * Se agravante=true, adiciona +5
 */
export function calculatePenaltyPoints(penaltyType, agravante = false) {
    const basePoints = {
        'absolvido': 0,
        'advertencia': 0,
        'leve': 5,
        'media': 10,
        'grave': 15,
        'gravissima': 20,
    };

    const points = basePoints[penaltyType] || 0;
    return agravante ? points + 5 : points;
}

/**
 * Verifica se piloto levou race ban (total >20 pontos)
 */
export function shouldApplyRaceBan(totalPoints) {
    return totalPoints > 20;
}

/**
 * Formata timezone BRT (UTC-3)
 */
export function getBRTDeadline(dayOffset = 1) {
    const now = new Date();
    const brtDate = new Date(now.getTime() - (3 * 60 * 60 * 1000)); // Convert to BRT
    brtDate.setDate(brtDate.getDate() + dayOffset);
    brtDate.setHours(20, 0, 0, 0); // 20:00 BRT
    return brtDate;
}

/**
 * Verifica se deadline de acusação foi atingido (para Grid Light)
 */
export function isDeadlineExceeded(deadline) {
    return new Date() > deadline;
}
