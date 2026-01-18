import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { usePowerRankingCache, usePowerRankingLightCache } from '../hooks/useSupabaseCache';
import { useLeagueData } from '../hooks/useLeagueData';
import '../index.css';

// Cores dos pilares
const COLORS = {
    PILOTO: '#000000',
    POWER_RANKING: '#FFD700', // Amarelo
    PERFORMANCE: '#3B82F6', // Azul
    CONDUTA: '#22C55E', // Verde
    RACECRAFT: '#EF4444', // Vermelho
    OVERALL: '#8B5CF6', // Roxo
    HISTORICO: '#475569' // Cinza escuro
};

export default function AdminPowerRanking() {
    const [loading, setLoading] = useState(true);
    const [pilotos, setPilotos] = useState([]);
    const [condutaData, setCondutaData] = useState({}); // { piloto_id: { round: {...} } }
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGrid, setSelectedGrid] = useState('all'); // 'all', 'carreira', 'light'
    const [selectedSeason, setSelectedSeason] = useState(20); // Mantido para carregar dados
    const [saving, setSaving] = useState({}); // { piloto_id_round: true/false }
    
    const { data: rawPRCarreira, loading: loadingPRCarreira } = usePowerRankingCache(selectedSeason);
    const { data: rawPRLight, loading: loadingPRLight } = usePowerRankingLightCache(selectedSeason);
    const { rawCarreira, rawLight } = useLeagueData();
    const loadingPR = loadingPRCarreira || loadingPRLight;
    const [prData, setPrData] = useState({}); // { nome_piloto: { total, performance, conduta, racecraft, overall, historico } }
    const [pilaresData, setPilaresData] = useState({}); // { nome_piloto: { performance, conduta, racecraft, overall, historico } }
    const pilaresDataRef = useRef({}); // Ref para preservar valores sem causar re-renderizações
    const [historicoData, setHistoricoData] = useState({}); // { nome_piloto: { temporadas: { season: prValue } } }
    const [historicoBrutoData, setHistoricoBrutoData] = useState({}); // { nome_piloto: valorBruto } - valores brutos antes da normalização
    const [temporadasData, setTemporadasData] = useState({}); // { nome_piloto: quantidadeTemporadas }
    const [telemetriaData, setTelemetriaData] = useState({}); // { nome_piloto: { ritmoCorrida: delta, ritmoClassificacao: score } }
    const [pontosData, setPontosData] = useState({}); // { nome_piloto: { corrida: total, sprint: total, qualy: total } }
    const [objetivosData, setObjetivosData] = useState({}); // { nome_piloto: { objetivo1: pontos, objetivo2: pontos, ... } }

    // Carregar pilotos baseado nas tabelas de classificação (Carreira e Light)
    // Determinar grid verificando em qual tabela o piloto aparece com equipe
    useEffect(() => {
        const carregarPilotosPorClassificacao = async () => {
            try {
                // Aguardar dados de classificação carregarem
                if (!rawCarreira || !rawLight || rawCarreira.length === 0 || rawLight.length === 0) {
                    return; // Aguardar dados carregarem
                }

                // 1. Buscar todos os pilotos da tabela pilotos
                const { data: allPilotos, error: pilotosError } = await supabase
                    .from('pilotos')
                    .select('id, nome, equipe, grid, cod_idml')
                    .in('grid', ['carreira', 'light'])
                    .order('nome');

                if (pilotosError) {
                    // Se der erro por coluna não existir, tentar sem cod_idml
                    if (pilotosError.message?.includes('column') && pilotosError.message?.includes('cod_idml')) {
                        const { data: pilotosSemCod, error: errorSemCod } = await supabase
                            .from('pilotos')
                            .select('id, nome, equipe, grid')
                            .in('grid', ['carreira', 'light'])
                            .order('nome');
                        
                        if (errorSemCod) throw errorSemCod;
                        // Continuar com pilotosSemCod
                        return;
                    }
                    throw pilotosError;
                }

                if (!allPilotos || allPilotos.length === 0) {
                    setPilotos([]);
                    return;
                }


                // 2. Função para normalizar nome (definir antes de usar)
                const normalizarNome = (nome) => {
                    return (nome || '')
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/\s+/g, ' ') // Normalizar espaços múltiplos
                        .trim();
                };
                
                // 3. Analisar tabelas de classificação para determinar grid de cada piloto
                // Estrutura: row[9] = nome piloto, row[10] = equipe, row[3] = temporada
                const pilotosPorGrid = { carreira: new Set(), light: new Set() };
                
                // Processar classificação Carreira
                rawCarreira.forEach(row => {
                    const nome = (row[9] || '').trim();
                    const equipe = (row[10] || '').trim();
                    const season = parseInt(row[3] || '0');
                    
                    // Verificar se é da temporada atual e tem equipe válida (não é reserva)
                    if (nome && equipe && season === selectedSeason) {
                        const equipeLower = equipe.toLowerCase();
                        // Excluir reservas
                        if (!equipeLower.includes('reserva') && equipeLower !== 'reserva' && equipe !== '') {
                            pilotosPorGrid.carreira.add(nome);
                        }
                    }
                });
                
                // Processar classificação Light
                rawLight.forEach(row => {
                    const nome = (row[9] || '').trim();
                    const equipe = (row[10] || '').trim();
                    const season = parseInt(row[3] || '0');
                    
                    // Verificar se é da temporada atual e tem equipe válida (não é reserva)
                    if (nome && equipe && season === selectedSeason) {
                        const equipeLower = equipe.toLowerCase();
                        // Excluir reservas
                        if (!equipeLower.includes('reserva') && equipeLower !== 'reserva' && equipe !== '') {
                            pilotosPorGrid.light.add(nome);
                        }
                    }
                });
                

                // Função auxiliar para busca flexível (tenta diferentes variações)
                const nomesSaoSimilares = (nome1, nome2) => {
                    const norm1 = normalizarNome(nome1);
                    const norm2 = normalizarNome(nome2);
                    
                    // Match exato após normalização
                    if (norm1 === norm2) return true;
                    
                    // Match se ambos contêm palavras-chave importantes
                    const palavras1 = norm1.split(/\s+/).filter(p => p.length > 2);
                    const palavras2 = norm2.split(/\s+/).filter(p => p.length > 2);
                    
                    // Se pelo menos 2 palavras importantes coincidem, considerar similar
                    const palavrasComuns = palavras1.filter(p => palavras2.includes(p));
                    if (palavrasComuns.length >= 2) return true;
                    
                    // Match parcial (um nome contém o outro)
                    if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
                    
                    return false;
                };

                // 4. Criar mapas de nomes normalizados das classificações para busca mais eficiente
                // Também criar mapas originais para busca flexível
                const nomesCarreiraNormalizados = new Set(
                    Array.from(pilotosPorGrid.carreira).map(n => normalizarNome(n))
                );
                const nomesLightNormalizados = new Set(
                    Array.from(pilotosPorGrid.light).map(n => normalizarNome(n))
                );
                
                // Mapas originais para busca flexível
                const nomesCarreiraOriginais = Array.from(pilotosPorGrid.carreira);
                const nomesLightOriginais = Array.from(pilotosPorGrid.light);

                // 5. Determinar grid de cada piloto e evitar duplicações
                // Usar Map com nome normalizado como chave para evitar duplicações por nome
                const pilotosUnicos = new Map(); // key: nome normalizado
                const pilotosPorId = new Map(); // key: id (para referência)
                
                allPilotos.forEach(piloto => {
                    const nomeNormalizado = normalizarNome(piloto.nome);
                    
                    // Verificar se já existe piloto com mesmo nome normalizado
                    if (pilotosUnicos.has(nomeNormalizado)) {
                        // Se já existe, não adicionar novamente (manter o primeiro encontrado)
                        return;
                    }
                    
                    // Verificar se já existe piloto com mesmo ID
                    if (pilotosPorId.has(piloto.id)) {
                        return;
                    }
                    
                    // Busca exata primeiro
                    let estaNoCarreira = nomesCarreiraNormalizados.has(nomeNormalizado);
                    let estaNoLight = nomesLightNormalizados.has(nomeNormalizado);
                    
                    // Se não encontrou por busca exata, tentar busca flexível
                    if (!estaNoCarreira && !estaNoLight) {
                        estaNoCarreira = nomesCarreiraOriginais.some(nomeClass => 
                            nomesSaoSimilares(piloto.nome, nomeClass)
                        );
                        estaNoLight = nomesLightOriginais.some(nomeClass => 
                            nomesSaoSimilares(piloto.nome, nomeClass)
                        );
                        
                    }
                    
                    // Determinar grid: priorizar onde aparece, se aparecer em ambos, usar carreira
                    let gridDeterminado = null;
                    if (estaNoCarreira && !estaNoLight) {
                        gridDeterminado = 'carreira';
                    } else if (estaNoLight && !estaNoCarreira) {
                        gridDeterminado = 'light';
                    } else if (estaNoCarreira && estaNoLight) {
                        // Se aparecer em ambos, usar carreira (ou pode ser um erro nos dados)
                        gridDeterminado = 'carreira';
                    } else {
                        // Se não aparecer em nenhum, não incluir (pode ser reserva ou não ter corrido)
                        return;
                    }
                    
                    // Adicionar ao Map usando nome normalizado como chave
                    pilotosUnicos.set(nomeNormalizado, {
                        ...piloto,
                        grid: gridDeterminado
                    });
                    pilotosPorId.set(piloto.id, piloto);
                });

                // 6. Adicionar pilotos que aparecem nas classificações mas não estão na tabela pilotos
                // Isso cobre casos de pilotos novos que ainda não foram cadastrados
                const pilotosNasClassificacoes = new Set([
                    ...Array.from(pilotosPorGrid.carreira),
                    ...Array.from(pilotosPorGrid.light)
                ]);
                
                pilotosNasClassificacoes.forEach(nomeNaClassificacao => {
                    const nomeNormalizado = normalizarNome(nomeNaClassificacao);
                    
                    // Verificar se já existe este piloto (por nome normalizado)
                    if (pilotosUnicos.has(nomeNormalizado)) {
                        return; // Já existe, pular
                    }
                    
                    // Determinar o grid deste piloto
                    const estaNoCarreira = pilotosPorGrid.carreira.has(nomeNaClassificacao);
                    const estaNoLight = pilotosPorGrid.light.has(nomeNaClassificacao);
                    
                    let gridDeterminado = null;
                    if (estaNoCarreira && !estaNoLight) {
                        gridDeterminado = 'carreira';
                    } else if (estaNoLight && !estaNoCarreira) {
                        gridDeterminado = 'light';
                    } else if (estaNoCarreira && estaNoLight) {
                        gridDeterminado = 'carreira'; // Priorizar carreira
                    }
                    
                    // Buscar equipe nas classificações
                    const dadosGrid = gridDeterminado === 'carreira' ? rawCarreira : rawLight;
                    const linhaComEquipe = dadosGrid.find(row => {
                        const nome = (row[9] || '').trim();
                        const season = parseInt(row[3] || '0');
                        return nome === nomeNaClassificacao && season === selectedSeason;
                    });
                    
                    const equipe = linhaComEquipe ? (linhaComEquipe[10] || '').trim() : 'Equipe não definida';
                    
                    // Criar piloto temporário (sem ID do Supabase)
                    const pilotoTemp = {
                        id: `temp_${nomeNormalizado}`, // ID temporário
                        nome: nomeNaClassificacao,
                        equipe: equipe,
                        grid: gridDeterminado,
                        _isTemp: true // Flag para indicar que é temporário
                    };
                    
                    pilotosUnicos.set(nomeNormalizado, pilotoTemp);
                });

                const pilotosFinais = Array.from(pilotosUnicos.values());

                setPilotos(pilotosFinais);
            } catch (err) {
                console.error('Erro ao carregar pilotos por classificação:', err);
                alert('❌ Erro ao carregar pilotos: ' + (err.message || 'Erro desconhecido'));
            }
        };

        carregarPilotosPorClassificacao();
    }, [selectedSeason, rawCarreira, rawLight]);

    // Carregar dados de conduta
    useEffect(() => {
        const carregarConduta = async () => {
            try {
                const { data, error } = await supabase
                    .from('power_ranking_conduta')
                    .select('*')
                    .eq('season', selectedSeason);

                if (error) {
                    // Verificar se é erro de tabela não encontrada (404, 406, PGRST116, PGRST205)
                    const errorCode = error.code || error.status;
                    const isTableNotFound = 
                        errorCode === 'PGRST205' || 
                        errorCode === 'PGRST116' ||
                        errorCode === 404 ||
                        errorCode === 406 ||
                        error.message?.includes('does not exist') ||
                        error.message?.includes('not found') ||
                        error.message?.includes('Could not find the table');
                    
                    if (isTableNotFound) {
                        console.warn('⚠️ Tabela power_ranking_conduta não existe ainda. Execute o script SQL em scripts/create_power_ranking_conduta.sql');
                        console.info('📖 Veja scripts/README_POWER_RANKING_CONDUTA.md para instruções detalhadas');
                        // Inicializar com dados vazios para não quebrar a aplicação
                        setCondutaData({});
                        return;
                    }
                    
                    throw error;
                }

                // Organizar por piloto_id -> round
                const organized = {};
                (data || []).forEach(item => {
                    if (!organized[item.piloto_id]) {
                        organized[item.piloto_id] = {};
                    }
                    organized[item.piloto_id][item.round] = item;
                });

                setCondutaData(organized);
            } catch (err) {
                console.error('❌ Erro ao carregar dados de conduta:', err);
                // Inicializar com dados vazios para não quebrar a aplicação
                setCondutaData({});
            }
        };

        if (selectedSeason) {
            carregarConduta();
        }
    }, [selectedSeason]);

    // Estado para armazenar o maior PR histórico (meta de 100%) - separado por grid
    const [maxPRHistorico, setMaxPRHistorico] = useState({ carreira: 0, light: 0 });
    const [maxPRInfo, setMaxPRInfo] = useState({ carreira: { piloto: '', temporada: 0, valor: 0 }, light: { piloto: '', temporada: 0, valor: 0 } });

    // Processar dados históricos de Power Ranking (apenas últimas 5 temporadas)
    // Filtrar por grid atual do piloto - usar dados corretos por grid
    useEffect(() => {
        if (pilotos.length === 0) return;
        if ((!rawPRCarreira || rawPRCarreira.length === 0) && (!rawPRLight || rawPRLight.length === 0)) return;
        if (!selectedSeason) return;

        // Definir intervalo de temporadas: últimas 5 (T-0 a T-4)
        const temporadaAtual = parseInt(selectedSeason); // Garantir que é número
        const temporadaMaisAntiga = temporadaAtual - 4; // T-4
        const temporadasValidas = new Set();
        for (let offset = 0; offset <= 4; offset++) {
            const temp = temporadaAtual - offset;
            // Excluir explicitamente T12 se estiver no intervalo
            if (temp !== 12) {
                temporadasValidas.add(temp);
            }
        }
        
        // Mapeamento de nomes antigos para nomes atuais (para lidar com mudanças de nome)
        // Formato: { 'nome_antigo_normalizado': 'nome_atual' }
        const nomesAntigosParaAtuais = {
            'egon drews': 'Egon Jackson',
            'egondrews': 'Egon Jackson'
        };
        
        // Função para normalizar nome (mesma usada em outros lugares)
        const normalizarNomeHistorico = (nome) => {
            return (nome || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        };
        
        // Função para converter nome antigo para nome atual
        const converterNomeParaAtual = (nomeNaPlanilha) => {
            const nomeNorm = normalizarNomeHistorico(nomeNaPlanilha);
            // Verificar se é um nome antigo conhecido
            if (nomesAntigosParaAtuais[nomeNorm]) {
                return nomesAntigosParaAtuais[nomeNorm];
            }
            // Se não for nome antigo, retornar o nome original
            return nomeNaPlanilha.trim();
        };

        // Criar mapeamento de piloto -> grid atual
        // Também criar mapa normalizado para busca flexível
        const gridPorPiloto = {};
        const gridPorPilotoNormalizado = {}; // nome normalizado -> nome original
        
        pilotos.forEach(piloto => {
            if (piloto.nome && piloto.grid) {
                const nomeLimpo = piloto.nome.trim();
                gridPorPiloto[nomeLimpo] = piloto.grid.toLowerCase();
                
                // Também criar entrada normalizada para busca flexível
                const nomeNorm = normalizarNomeHistorico(nomeLimpo);
                gridPorPilotoNormalizado[nomeNorm] = nomeLimpo;
            }
        });
        
        console.log('📋 PILOTOS NO SUPABASE (grid=light):', pilotos.filter(p => p.grid === 'light').map(p => p.nome).slice(0, 15));
        console.log('📋 gridPorPilotoNormalizado (primeiros 10):', Object.entries(gridPorPilotoNormalizado).slice(0, 10));
        
        // Organizar PRs por piloto e temporada, separados por grid
        const historicoPorPiloto = {};
        const historicoPorGrid = { carreira: {}, light: {} }; // { grid: { piloto: { season: prValue } } }
        let maiorPRCarreira = 0;
        let maiorPRLight = 0;
        let maiorPRInfoCarreira = { piloto: '', temporada: 0, valor: 0 };
        let maiorPRInfoLight = { piloto: '', temporada: 0, valor: 0 };

        // Processar dados do grid Carreira
        if (rawPRCarreira && rawPRCarreira.length > 0) {
            rawPRCarreira.forEach(row => {
                const nomeRaw = (row[0] || '').toString().trim();
                const seasonStr = (row[9] || '').toString().trim();
                const totalPR = parseFloat((row[8] || '0').toString().replace(',', '.'));

                if (nomeRaw && seasonStr && !isNaN(parseInt(seasonStr)) && !isNaN(totalPR) && totalPR > 0) {
                    const season = parseInt(seasonStr);
                    if (!temporadasValidas.has(season)) return;

                    const nomeAtual = converterNomeParaAtual(nomeRaw);
                    const nomeFinal = gridPorPilotoNormalizado[normalizarNomeHistorico(nomeAtual)] || nomeAtual;
                    
                    if (!historicoPorPiloto[nomeFinal]) historicoPorPiloto[nomeFinal] = {};
                    // Usar o maior PR encontrado para o piloto naquela temporada (caso apareça em mais de uma linha)
                    historicoPorPiloto[nomeFinal][season] = Math.max(historicoPorPiloto[nomeFinal][season] || 0, totalPR);
                    
                    // Para o cálculo do Máximo do Grid, associamos ao grid onde o dado foi encontrado
                    if (!historicoPorGrid.carreira[nomeFinal]) historicoPorGrid.carreira[nomeFinal] = {};
                    historicoPorGrid.carreira[nomeFinal][season] = Math.max(historicoPorGrid.carreira[nomeFinal][season] || 0, totalPR);
                }
            });
        }

        // Processar dados do grid Light
        if (rawPRLight && rawPRLight.length > 0) {
            console.log('📋 Processando histórico Light - Total linhas:', rawPRLight.length);
            console.log('📋 Temporadas válidas:', Array.from(temporadasValidas).sort((a, b) => b - a));
            
            // Verificar se Egon e Alann estão NA PLANILHA (independente de temporada)
            const egonRows = rawPRLight.filter(row => {
                const nome = (row[0] || '').toString().trim();
                return nome.toLowerCase().includes('egon') || nome.toLowerCase().includes('jackson');
            });
            console.log('🔍 Linhas com "Egon/Jackson" na planilha:', egonRows.length);
            if (egonRows.length > 0) {
                console.log('🔍 Primeiras 3 linhas do Egon:', egonRows.slice(0, 3).map(r => ({
                    nome: r[0],
                    temporada: r[9],
                    pr: r[8]
                })));
            }
            
            const alannRows = rawPRLight.filter(row => {
                const nome = (row[0] || '').toString().trim();
                return nome.toLowerCase().includes('alann');
            });
            console.log('🔍 Linhas com "Alann" na planilha:', alannRows.length);
            if (alannRows.length > 0) {
                console.log('🔍 Primeiras 3 linhas do Alann:', alannRows.slice(0, 3).map(r => ({
                    nome: r[0],
                    temporada: r[9],
                    pr: r[8]
                })));
            }
            
            const pilotosProcessadosHistorico = new Set();

            rawPRLight.forEach(row => {
                const nomeRaw = (row[0] || '').toString().trim();
                const seasonStr = (row[9] || '').toString().trim();
                const totalPR = parseFloat((row[8] || '0').toString().replace(',', '.'));

                if (nomeRaw && seasonStr && !isNaN(parseInt(seasonStr)) && !isNaN(totalPR) && totalPR > 0) {
                    const season = parseInt(seasonStr);
                    if (!temporadasValidas.has(season)) return;

                    const nomeAtual = converterNomeParaAtual(nomeRaw);
                    const nomeNormalizado = normalizarNomeHistorico(nomeAtual);
                    const nomeFinal = gridPorPilotoNormalizado[nomeNormalizado] || nomeAtual;
                    
                    // Debug específico para Egon e Alann
                    if (nomeRaw.toLowerCase().includes('egon') || nomeRaw.toLowerCase().includes('alann')) {
                        console.log(`🔍 DEBUG - Nome: "${nomeRaw}" | nomeAtual: "${nomeAtual}" | nomeNormalizado: "${nomeNormalizado}" | nomeFinal: "${nomeFinal}"`);
                        console.log(`🔍 gridPorPilotoNormalizado[${nomeNormalizado}]:`, gridPorPilotoNormalizado[nomeNormalizado]);
                    }
                    
                    if (!pilotosProcessadosHistorico.has(nomeFinal)) {
                        console.log(`✅ Histórico Light - Piloto: "${nomeFinal}" (original: "${nomeRaw}") | Season: ${season} | PR: ${totalPR}`);
                        pilotosProcessadosHistorico.add(nomeFinal);
                    }

                    if (!historicoPorPiloto[nomeFinal]) historicoPorPiloto[nomeFinal] = {};
                    historicoPorPiloto[nomeFinal][season] = Math.max(historicoPorPiloto[nomeFinal][season] || 0, totalPR);
                    
                    if (!historicoPorGrid.light[nomeFinal]) historicoPorGrid.light[nomeFinal] = {};
                    historicoPorGrid.light[nomeFinal][season] = Math.max(historicoPorGrid.light[nomeFinal][season] || 0, totalPR);
                }
            });
            
            console.log('📊 Total pilotos únicos com histórico (Light):', pilotosProcessadosHistorico.size);
            console.log('📊 Pilotos processados:', Array.from(pilotosProcessadosHistorico).slice(0, 10));
        }

        // Encontrar o maior PR por grid (apenas nas últimas 5 temporadas)
        Object.keys(historicoPorGrid.carreira).forEach(nome => {
            Object.keys(historicoPorGrid.carreira[nome]).forEach(seasonStr => {
                const season = parseInt(seasonStr);
                
                // Verificar se a temporada está no intervalo válido (últimas 5)
                if (!temporadasValidas.has(season)) {
                    return; // Pular temporadas fora do intervalo
                }
                
                const prTotal = historicoPorGrid.carreira[nome][season];
                
                if (prTotal > maiorPRCarreira) {
                    maiorPRCarreira = prTotal;
                    maiorPRInfoCarreira = {
                        piloto: nome,
                        temporada: season,
                        valor: prTotal
                    };
                }
            });
        });

        Object.keys(historicoPorGrid.light).forEach(nome => {
            Object.keys(historicoPorGrid.light[nome]).forEach(seasonStr => {
                const season = parseInt(seasonStr);
                
                // Verificar se a temporada está no intervalo válido (últimas 5)
                if (!temporadasValidas.has(season)) {
                    return; // Pular temporadas fora do intervalo
                }
                
                const prTotal = historicoPorGrid.light[nome][season];
                
                if (prTotal > maiorPRLight) {
                    maiorPRLight = prTotal;
                    maiorPRInfoLight = {
                        piloto: nome,
                        temporada: season,
                        valor: prTotal
                    };
                }
            });
        });

        console.log('📊 HISTÓRICO FINAL (primeiros 10 pilotos):', Object.entries(historicoPorPiloto).slice(0, 10));
        
        setHistoricoData(historicoPorPiloto);
        setMaxPRHistorico({ carreira: maiorPRCarreira, light: maiorPRLight });
        setMaxPRInfo({ 
            carreira: maiorPRInfoCarreira, 
            light: maiorPRInfoLight 
        });
        
        // Verificação de erro crítico: T12 sendo incluída incorretamente
        if (maiorPRCarreira > 0 || maiorPRLight > 0) {
            // Verificar se T12 está sendo incluída incorretamente
            if (maiorPRInfoCarreira.temporada === 12) {
                console.error('❌ ERRO: T12 está sendo considerada como maior PR! Isso não deveria acontecer.');
                console.error('   Temporadas válidas:', Array.from(temporadasValidas).sort((a, b) => b - a));
                console.error('   selectedSeason:', selectedSeason);
            }
        }
    }, [rawPRCarreira, rawPRLight, pilotos, selectedSeason]);

    // Função para calcular média ponderada do histórico (considerando apenas o grid atual do piloto)
    // IMPORTANTE: Sempre considera as 5 temporadas, atribuindo 0 pontos para temporadas sem participação
    const calcularMediaPonderadaHistorico = useCallback((nomePiloto, gridPiloto) => {
        const historico = historicoData[nomePiloto] || {};
        const temporadaAtual = selectedSeason;
        
        // Pesos decrescentes para as últimas 5 temporadas (incluindo a atual)
        const pesos = {
            0: 0.35,  // T-0 (temporada atual)
            1: 0.25,  // T-1 (temporada anterior)
            2: 0.20,  // T-2
            3: 0.15,  // T-3
            4: 0.05   // T-4
        };

        // Sempre considerar as 5 temporadas, mesmo que o piloto não tenha participado
        // Temporadas sem participação recebem 0 pontos
        let somaPonderada = 0;
        let pesoTotal = 0;

        // Iterar pelas últimas 5 temporadas (T-0 a T-4)
        for (let offset = 0; offset <= 4; offset++) {
            const season = temporadaAtual - offset;
            const peso = pesos[offset] || 0;
            
            // Se o piloto tem dados para esta temporada, usar o valor; senão, usar 0
            const prValue = (historico[season] && historico[season] > 0) ? historico[season] : 0;
            
            // Sempre adicionar ao cálculo, mesmo que seja 0
            somaPonderada += prValue * peso;
            pesoTotal += peso;
        }

        // Os pesos sempre somam 1.0 (100%), então não precisamos normalizar
        // Mas vamos garantir que pesoTotal seja 1.0 para consistência
        if (pesoTotal > 0) {
            return somaPonderada; // pesoTotal já é 1.0, então não precisa dividir
        }

        return 0; // Fallback (não deveria acontecer)
    }, [historicoData, selectedSeason]);

    // Processar dados de Power Ranking da temporada atual e calcular pilares
    // Usar dados corretos baseado no grid do piloto
    useEffect(() => {
        if (pilotos.length === 0) return;
        if ((!rawPRCarreira || rawPRCarreira.length === 0) && (!rawPRLight || rawPRLight.length === 0)) return;

        // Criar mapeamento de piloto -> grid atual
        const gridPorPiloto = {};
        pilotos.forEach(piloto => {
            if (piloto.nome && piloto.grid) {
                gridPorPiloto[piloto.nome] = piloto.grid.toLowerCase();
            }
        });
        
        const prMap = {};
        const pilaresMap = {};

        // Mapeamento de nomes antigos para nomes atuais (mesmo usado no histórico)
        const nomesAntigosParaAtuaisPR = {
            'egon drews': 'Egon Jackson',
            'egondrews': 'Egon Jackson'
        };
        
        // Função para converter nome antigo para nome atual
        const converterNomeParaAtualPR = (nomeNaPlanilha) => {
            const nomeNorm = (nomeNaPlanilha || '')
                .toString()
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            // Verificar se é um nome antigo conhecido
            if (nomesAntigosParaAtuaisPR[nomeNorm]) {
                return nomesAntigosParaAtuaisPR[nomeNorm].trim();
            }
            // Se não for nome antigo, retornar o nome original limpo
            return (nomeNaPlanilha || '').toString().trim();
        };

        // Função auxiliar para normalizar nome (mesma usada no carregamento de pilotos)
        const normalizarNomePR = (nome) => {
            return (nome || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        };

        // Criar mapa normalizado de nomes de pilotos -> nome original
        const nomesPilotosNormalizados = {};
        const gridPorPilotoNormalizadoPR = {}; // nome normalizado -> nome original
        Object.keys(gridPorPiloto).forEach(nomeOriginal => {
            const nomeNorm = normalizarNomePR(nomeOriginal);
            const nomeLimpo = nomeOriginal.trim();
            nomesPilotosNormalizados[nomeNorm] = nomeLimpo;
            gridPorPilotoNormalizadoPR[nomeNorm] = nomeLimpo;
        });
        
        // 0. Inicializar prMap e pilaresMap com todos os pilotos da tabela para garantir que ninguém fique de fora
        pilotos.forEach(p => {
            if (!prMap[p.nome]) {
                prMap[p.nome] = { total: 0, grid: p.grid || 'carreira', performance: 60, conduta: 0, racecraft: 60, overall: 0, historico: 0 };
                pilaresMap[p.nome] = { performance: 60, conduta: 0, racecraft: 60, overall: 0, historico: 0 };
            }
        });

        const pilotosProcessados = new Set();

        // Processar dados do grid Carreira
        if (rawPRCarreira && rawPRCarreira.length > 0) {
            
            rawPRCarreira.forEach(row => {
                const nomeNaPlanilha = (row[0] || '').trim();
                const season = (row[9] || '').trim();
                const totalPR = parseFloat((row[8] || '0').replace(',', '.'));

                if (nomeNaPlanilha && season === String(selectedSeason) && !isNaN(totalPR) && totalPR > 0) {
                    const nomeConvertido = converterNomeParaAtualPR(nomeNaPlanilha);
                    
                    let gridAtual = gridPorPiloto[nomeConvertido];
                    let nomePilotoParaUsar = nomeConvertido;
                    
                    if (!gridAtual) {
                        const nomeNorm = normalizarNomePR(nomeConvertido);
                        const nomeOriginalEncontrado = nomesPilotosNormalizados[nomeNorm];
                        if (nomeOriginalEncontrado) {
                            gridAtual = gridPorPiloto[nomeOriginalEncontrado];
                            nomePilotoParaUsar = nomeOriginalEncontrado.trim();
                        }
                    } else {
                        nomePilotoParaUsar = nomePilotoParaUsar.trim();
                    }
                    
                    // Se estiver na planilha Carreira, vamos processar independente do gridAtual detectado
                    nomePilotoParaUsar = nomePilotoParaUsar.trim();
                    
                    if (!pilotosProcessados.has(nomePilotoParaUsar)) {
                        pilotosProcessados.add(nomePilotoParaUsar);
                    }
                    
                    if (!prMap[nomePilotoParaUsar]) {
                        prMap[nomePilotoParaUsar] = { total: 0, grid: 'carreira', performance: 60, conduta: 0, racecraft: 60, overall: 0, historico: 0 };
                        pilaresMap[nomePilotoParaUsar] = { performance: 60, conduta: 0, racecraft: 60, overall: 0, historico: 0 };
                    }
                    // Se veio da planilha carreira, assume carreira se não tiver grid definido
                    if (!prMap[nomePilotoParaUsar].grid) prMap[nomePilotoParaUsar].grid = 'carreira';
                    prMap[nomePilotoParaUsar].total = Math.max(prMap[nomePilotoParaUsar].total, totalPR);
                }
            });
        }

        // Processar dados do grid Light
        if (rawPRLight && rawPRLight.length > 0) {
            const pilotosProcessadosLight = new Set();
            
            rawPRLight.forEach(row => {
                const nomeNaPlanilha = (row[0] || '').trim();
                const season = (row[9] || '').trim();
                const totalPR = parseFloat((row[8] || '0').replace(',', '.'));

                if (nomeNaPlanilha && season === String(selectedSeason) && !isNaN(totalPR) && totalPR > 0) {
                    const nomeConvertido = converterNomeParaAtualPR(nomeNaPlanilha).trim();

                    if (!pilotosProcessados.has(nomeConvertido)) {
                        pilotosProcessados.add(nomeConvertido);
                    }
                    
                    let gridAtual = gridPorPiloto[nomeConvertido];
                    let nomePilotoParaUsar = nomeConvertido.trim();
                    
                    if (!gridAtual) {
                        const nomeNorm = normalizarNomePR(nomeConvertido);
                        let nomeOriginalEncontrado = nomesPilotosNormalizados[nomeNorm];
                        if (!nomeOriginalEncontrado) {
                            nomeOriginalEncontrado = gridPorPilotoNormalizadoPR[nomeNorm];
                        }
                        if (nomeOriginalEncontrado) {
                            gridAtual = gridPorPiloto[nomeOriginalEncontrado];
                            nomePilotoParaUsar = nomeOriginalEncontrado.trim();
                        }
                    }
                    
                    nomePilotoParaUsar = nomePilotoParaUsar.trim();
                    
                    if (!pilotosProcessadosLight.has(nomePilotoParaUsar)) {
                        pilotosProcessadosLight.add(nomePilotoParaUsar);
                    }

                    if (!prMap[nomePilotoParaUsar]) {
                        prMap[nomePilotoParaUsar] = { total: 0, grid: 'light', performance: 60, conduta: 0, racecraft: 60, overall: 0, historico: 0 };
                        pilaresMap[nomePilotoParaUsar] = { performance: 60, conduta: 0, racecraft: 60, overall: 0, historico: 0 };
                    }
                    // Se veio da planilha light, assume light se não tiver grid definido
                    if (!prMap[nomePilotoParaUsar].grid) prMap[nomePilotoParaUsar].grid = 'light';
                    prMap[nomePilotoParaUsar].total = Math.max(prMap[nomePilotoParaUsar].total, totalPR);
                }
            });
        }
        
        // Calcular o máximo de PR por grid (mesmo critério do HISTÓRICO)
        // O maior PR de cada grid representa 100% para aquele grid
        const maxPRPorGrid = { carreira: 0, light: 0 };
        
        // Calcular máximo PR do grid Carreira
        const prsCarreira = Object.keys(prMap)
            .filter(nome => (prMap[nome].grid || gridPorPiloto[nome]) === 'carreira')
            .map(nome => prMap[nome].total)
            .filter(total => total > 0);
        maxPRPorGrid.carreira = prsCarreira.length > 0 ? Math.max(...prsCarreira) : 0;
        
        // Calcular máximo PR do grid Light
        const prsLight = Object.keys(prMap)
            .filter(nome => (prMap[nome].grid || gridPorPiloto[nome]) === 'light')
            .map(nome => prMap[nome].total)
            .filter(total => total > 0);
        maxPRPorGrid.light = prsLight.length > 0 ? Math.max(...prsLight) : 0;

        // Calcular pilares
        Object.keys(prMap).forEach(nome => {
            // Performance: normalizar PR total da temporada atual em relação ao maior PR do seu grid (60-100)
            // Usa o mesmo cálculo do HISTÓRICO: normalizar para escala 60-100
            const prTotal = prMap[nome].total;
            const gridPiloto = prMap[nome].grid || gridPorPiloto[nome] || 'carreira';
            const maxPRDoGrid = maxPRPorGrid[gridPiloto] || 0;
            
            if (maxPRDoGrid > 0 && prTotal > 0) {
                // Calcular percentual: (PR do piloto / maior PR do grid) * 100
                const percentual = (prTotal / maxPRDoGrid) * 100;
                // Normalizar para escala 60-100: percentual de 0-100% vira 60-100
                const performanceNormalizado = 60 + (percentual / 100) * 40; // 60 + (percentual * 0.4)
                // Arredondar para cima e limitar no máximo 100
                pilaresMap[nome].performance = Math.ceil(Math.min(100, performanceNormalizado));
            } else {
                // Se não tem PR ou maxPR é 0, trazer o mínimo aceitável que é 60
                pilaresMap[nome].performance = 60;
            }
            
            // Conduta: inicializar com 0, será atualizado se houver dados
            pilaresMap[nome].conduta = 0;
            
            // Racecraft: inicializar com 0, será atualizado se houver dados
            pilaresMap[nome].racecraft = 0;
            
            // Overall: inicializar com 0, será atualizado se houver dados
            pilaresMap[nome].overall = 0;
            
            // Histórico: calcular média ponderada das últimas 5 temporadas
            const historicoCalc = calcularMediaPonderadaHistorico(nome);
            pilaresMap[nome].historico = historicoCalc;
        });

        setPrData(prMap);
        setPilaresData(pilaresMap);
        
        // Atualizar ref com os valores calculados
        pilaresDataRef.current = pilaresMap;
        setPilaresData(pilaresMap);
    }, [rawPRCarreira, rawPRLight, selectedSeason, calcularMediaPonderadaHistorico, pilotos]);

        // Função auxiliar para normalizar nome (reutilizar)
        const normalizarNomePR = (nome) => {
            return (nome || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        };

    // Calcular dados de conduta e atualizar histórico para cada piloto
    useEffect(() => {
        if (!pilotos.length) return;

        const updatedPilares = { ...pilaresDataRef.current }; // Preservar valores já calculados (incluindo performance) usando ref
        const valoresHistoriaBrutos = {}; // Armazenar valores brutos para normalização
        
        // Primeiro, calcular valores brutos do histórico para todos os pilotos
        pilotos.forEach(piloto => {
            // CRÍTICO: Sempre preservar performance de pilaresDataRef se existir e for > 0
            const performancePreservado = pilaresDataRef.current[piloto.nome]?.performance;
            
            if (!updatedPilares[piloto.nome]) {
                // Se não existe, criar mas preservar performance se já foi calculado
                updatedPilares[piloto.nome] = { 
                    performance: (performancePreservado !== undefined && performancePreservado !== 0) ? performancePreservado : (pilaresData[piloto.nome]?.performance || 60), 
                    conduta: 0, 
                    racecraft: pilaresData[piloto.nome]?.racecraft || 60, 
                    overall: pilaresData[piloto.nome]?.overall || 0, 
                    historico: 0 
                };
            } else {
                // CRÍTICO: Preservar performance, racecraft e overall se já foram calculados
                // NUNCA sobrescrever performance se já existe
                updatedPilares[piloto.nome] = {
                    ...updatedPilares[piloto.nome],
                    performance: (performancePreservado !== undefined && performancePreservado !== 0) ? performancePreservado : (updatedPilares[piloto.nome].performance || 60),
                    racecraft: updatedPilares[piloto.nome].racecraft || pilaresData[piloto.nome]?.racecraft || 60,
                    overall: updatedPilares[piloto.nome].overall || pilaresData[piloto.nome]?.overall || 0,
                    conduta: updatedPilares[piloto.nome].conduta || 0,
                    historico: updatedPilares[piloto.nome].historico || 0
                };
            }

            // Calcular pontos de conduta baseado nas flags
            if (condutaData && Object.keys(condutaData).length > 0) {
                let pontosConduta = 100; // Base
                const rounds = Object.keys(condutaData[piloto.id] || {});
                
                rounds.forEach(round => {
                    const data = condutaData[piloto.id][round];
                    if (data.foto_oficial_enviada === false) pontosConduta -= 5;
                    if (data.falta_wo === true) pontosConduta -= 10;
                    if (data.lista_presenca_respondida === false) pontosConduta -= 5;
                    if (data.telemetria_fechada === true) pontosConduta -= 5;
                    if (data.numeracao_errada === true) pontosConduta -= 5;
                    if (data.defesa_nao_enviada === true) pontosConduta -= 10;
                    if (data.pontos_descontados) pontosConduta -= data.pontos_descontados;
                });

                // Garantir mínimo de 0
                updatedPilares[piloto.nome].conduta = Math.max(0, pontosConduta);
            }

            // Calcular valor bruto do histórico (média ponderada) - considerando apenas o grid atual
            const gridPiloto = (piloto.grid || 'carreira').toLowerCase();
            valoresHistoriaBrutos[piloto.nome] = calcularMediaPonderadaHistorico(piloto.nome, gridPiloto);
        });

        // Salvar valores brutos para exibição na coluna "HISTÓRIA"
        setHistoricoBrutoData(valoresHistoriaBrutos);

        // Normalizar valores do histórico para escala 0-100
        // Calcular o máximo histórico por grid (mesmo critério do PERFORMANCE)
        const maxHistoricoPorGrid = { carreira: 0, light: 0 };
        
        // Calcular máximo histórico do grid Carreira
        const historicosCarreira = pilotos
            .filter(p => (p.grid || 'carreira').toLowerCase() === 'carreira')
            .map(p => valoresHistoriaBrutos[p.nome] || 0)
            .filter(v => v > 0);
        maxHistoricoPorGrid.carreira = historicosCarreira.length > 0 ? Math.max(...historicosCarreira) : 0;
        
        // Calcular máximo histórico do grid Light
        const historicosLight = pilotos
            .filter(p => (p.grid || 'carreira').toLowerCase() === 'light')
            .map(p => valoresHistoriaBrutos[p.nome] || 0)
            .filter(v => v > 0);
        maxHistoricoPorGrid.light = historicosLight.length > 0 ? Math.max(...historicosLight) : 0;
        
        // Cada piloto recebe o percentual que sua média ponderada representa do máximo histórico do seu grid
        // Depois faz média ponderada com TEMPORADAS (55% HISTÓRICO + 45% TEMPORADAS)
        pilotos.forEach(piloto => {
            const valorBruto = valoresHistoriaBrutos[piloto.nome] || 0;
            const gridPiloto = (piloto.grid || 'carreira').toLowerCase();
            const maxHistoricoDoGrid = maxHistoricoPorGrid[gridPiloto] || 0;
            
            let historicoNormalizado = 0; // Valor padrão (sem dados)
            
            if (valorBruto > 0 && maxHistoricoDoGrid > 0) {
                // Calcular percentual: (média ponderada do piloto / maior pontuação do histórico do grid) * 100
                const percentual = (valorBruto / maxHistoricoDoGrid) * 100;
                // Normalizar para escala 60-100: percentual de 0-100% vira 60-100
                historicoNormalizado = 60 + (percentual / 100) * 40; // 60 + (percentual * 0.4)
                historicoNormalizado = Math.ceil(Math.min(100, historicoNormalizado));
            }
            
            // Fazer média ponderada com TEMPORADAS (55% HISTÓRICO + 45% TEMPORADAS)
            const pontuacaoTemporadas = temporadasData[piloto.nome] || 0;
            
            // Se não houver dados de histórico nem de temporadas, deixar 0 (será exibido como "-")
            if (valorBruto === 0 && pontuacaoTemporadas === 0) {
                updatedPilares[piloto.nome].historico = 0;
            } else {
                const historicoFinal = (historicoNormalizado * 0.55) + (pontuacaoTemporadas * 0.45);
                // Arredondar para cima e limitar no máximo 100
                updatedPilares[piloto.nome].historico = Math.ceil(Math.min(100, historicoFinal));
            }
        });


        // Atualizar ref e state
        pilaresDataRef.current = updatedPilares;
        setPilaresData(updatedPilares);
    }, [condutaData, pilotos, calcularMediaPonderadaHistorico, maxPRHistorico, temporadasData]);

    // Contar temporadas que cada piloto participou (todas as temporadas, não apenas últimas 5)
    useEffect(() => {
        if (pilotos.length === 0) return;
        if ((!rawPRCarreira || rawPRCarreira.length === 0) && (!rawPRLight || rawPRLight.length === 0)) return;

        const temporadasPorPiloto = {};
        
        // Função para normalizar nome
        const normalizarNome = (nome) => {
            return (nome || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        };
        
        // Mapeamento de nomes antigos para nomes atuais
        const nomesAntigosParaAtuais = {
            'egon drews': 'Egon Jackson',
            'egondrews': 'Egon Jackson'
        };
        
        const converterNomeParaAtual = (nomeNaPlanilha) => {
            const nomeNorm = normalizarNome(nomeNaPlanilha);
            if (nomesAntigosParaAtuais[nomeNorm]) {
                return nomesAntigosParaAtuais[nomeNorm].trim();
            }
            return (nomeNaPlanilha || '').toString().trim();
        };
        
        // Processar dados do grid Carreira - contar todas as temporadas (independente do grid atual)
        if (rawPRCarreira && rawPRCarreira.length > 0) {
            rawPRCarreira.forEach(row => {
                const nomeNaPlanilha = (row[0] || '').trim();
                const seasonStr = (row[9] || '').trim();
                const totalPR = parseFloat((row[8] || '0').replace(',', '.'));
                
                if (nomeNaPlanilha && seasonStr && !isNaN(parseInt(seasonStr)) && !isNaN(totalPR) && totalPR > 0) {
                    const season = parseInt(seasonStr);
                    const nomeAtual = converterNomeParaAtual(nomeNaPlanilha);
                    
                    // Adicionar temporada ao Set (independente do grid atual)
                    // O Set garante que temporadas duplicadas sejam contadas apenas uma vez
                    if (!temporadasPorPiloto[nomeAtual]) {
                        temporadasPorPiloto[nomeAtual] = new Set();
                    }
                    temporadasPorPiloto[nomeAtual].add(season);
                }
            });
        }
        
        // Processar dados do grid Light - contar todas as temporadas (independente do grid atual)
        if (rawPRLight && rawPRLight.length > 0) {
            console.log('📅 Processando temporadas Light - Total linhas:', rawPRLight.length);
            const pilotosTemporadasLight = new Set();
            
            rawPRLight.forEach(row => {
                const nomeNaPlanilha = (row[0] || '').trim();
                const seasonStr = (row[9] || '').trim();
                const totalPR = parseFloat((row[8] || '0').replace(',', '.'));
                
                if (nomeNaPlanilha && seasonStr && !isNaN(parseInt(seasonStr)) && !isNaN(totalPR) && totalPR > 0) {
                    const season = parseInt(seasonStr);
                    const nomeAtual = converterNomeParaAtual(nomeNaPlanilha);
                    
                    if (!pilotosTemporadasLight.has(nomeAtual)) {
                        console.log(`✅ Temporadas Light - Piloto: "${nomeAtual}" (original: "${nomeNaPlanilha}")`);
                        pilotosTemporadasLight.add(nomeAtual);
                    }
                    
                    // Adicionar temporada ao Set (independente do grid atual)
                    // Se o piloto já tem essa temporada do grid Carreira, o Set não duplica
                    if (!temporadasPorPiloto[nomeAtual]) {
                        temporadasPorPiloto[nomeAtual] = new Set();
                    }
                    temporadasPorPiloto[nomeAtual].add(season);
                }
            });
            
            console.log('📊 Total pilotos únicos com temporadas (Light):', pilotosTemporadasLight.size);
        }
        
        // Converter Sets para pontuação baseada na quantidade de temporadas
        // 20 temporadas = 100, 19 = 99, 18 = 98, etc.
        const temporadasDataCalculado = {};
        
        Object.keys(temporadasPorPiloto).forEach(nome => {
            const quantidade = temporadasPorPiloto[nome].size;
            // Fórmula: quantidadeTemporadas + 80 (20 = 100, 19 = 99, 18 = 98, etc.)
            // Limitar máximo em 100
            const pontuacao = Math.min(100, quantidade + 80);
            temporadasDataCalculado[nome] = pontuacao;
        });
        
        console.log('📊 RESULTADO TEMPORADAS (primeiros 10):', Object.entries(temporadasDataCalculado).slice(0, 10));
        
        setTemporadasData(temporadasDataCalculado);
    }, [pilotos, rawPRCarreira, rawPRLight]);

    // Calcular dados de telemetria (RITMO DE CORRIDA e RITMO DE CLASSIFICAÇÃO)
    useEffect(() => {
        if (!rawCarreira || !rawLight || !selectedSeason) return;

        const telemetriaMap = {};
        
        // Função auxiliar para processar dados de um grid
        const processarGridTelemetria = (data, gridType) => {
            const driverMap = new Map();
            
            data.forEach(row => {
                const s = parseInt(row[3]);
                if (s !== parseInt(selectedSeason)) return;
                
                const name = (row[9] || '').trim();
                if (!name) return;
                
                const qualy = parseInt(row[6]);
                const race = parseInt(row[8]);
                
                if (!driverMap.has(name)) {
                    driverMap.set(name, { 
                        qualySum: 0, 
                        raceSum: 0, 
                        deltaSum: 0, 
                        racesCount: 0 
                    });
                }
                
                const driver = driverMap.get(name);
                if (!isNaN(qualy) && !isNaN(race)) {
                    driver.qualySum += qualy;
                    driver.raceSum += race;
                    driver.deltaSum += (qualy - race); // Posição qualy - posição race (positivo = ganhou posições)
                    driver.racesCount++;
                }
            });
            
            // Calcular deltas e posições médias primeiro para encontrar o range
            const deltas = [];
            driverMap.forEach((stats, name) => {
                if (stats.racesCount > 0) {
                    const avgDelta = stats.deltaSum / stats.racesCount;
                    const avgRace = stats.raceSum / stats.racesCount;
                    deltas.push({
                        name,
                        delta: avgDelta,
                        avgRace: avgRace
                    });
                }
            });
            
            // Encontrar o melhor delta para normalização
            const maxDelta = Math.max(...deltas.map(d => d.delta), 0);
            
            // Função para converter delta em percentual (mesma lógica da tela de telemetria)
            const deltaToPercent = (delta, avgRace) => {
                const estaNoTop3 = avgRace <= 3;
                const estaEmP4ouP5 = avgRace >= 4 && avgRace <= 5;
                
                if (delta >= 0) {
                    // Ganhou posições
                    if (delta === 0) {
                        // Manter posição: Top 3 = 95%, P4/P5 = 90%, outros = 80%
                        if (estaNoTop3) return 95;
                        if (estaEmP4ouP5) return 90;
                        return 80;
                    }
                    // Ganhou posições: base percentual até 100% (melhor delta)
                    if (maxDelta <= 0) {
                        // Se ninguém ganhou posições além de delta 0, usar base percentual
                        if (estaNoTop3) return 95;
                        if (estaEmP4ouP5) return 90;
                        return 80;
                    }
                    const basePercent = estaNoTop3 ? 95 : (estaEmP4ouP5 ? 90 : 80);
                    const calculatedPercent = basePercent + (delta / maxDelta) * (100 - basePercent);
                    return Math.ceil(Math.max(basePercent, Math.min(100, calculatedPercent)));
                } else {
                    // Perdeu posições
                    if (estaNoTop3) {
                        // Se está no top 3, mesmo perdendo posições, ainda tem bom ritmo
                        // Delta -1 = 90%, -2 = 85%, -3 = 80%, etc.
                        const percent = Math.max(70, Math.min(95, 95 + (delta * 2.5)));
                        return Math.ceil(percent);
                    } else if (estaEmP4ouP5) {
                        // Se está em P4 ou P5, mesmo perdendo posições, ainda tem bom ritmo
                        // Delta -1 = 85%, -2 = 80%, -3 = 75%, etc.
                        const percent = Math.max(70, Math.min(90, 90 + (delta * 3)));
                        return Math.ceil(percent);
                    } else {
                        // Fora dos top 5: penalização maior por perder posições
                        // Delta -1 = 75%, -2 = 70%, -3 = 65%, etc.
                        const percent = Math.max(0, Math.min(80, 80 + (delta * 5)));
                        return Math.ceil(percent);
                    }
                }
            };
            
            // Calcular médias e scores
            driverMap.forEach((stats, name) => {
                if (stats.racesCount > 0) {
                    // RITMO DE CLASSIFICAÇÃO: baixa de 1 em 1% (1º=100%, 2º=99%, ..., 20º=81%) - mesma fórmula da tela de telemetria
                    const avgQualy = stats.qualySum / stats.racesCount;
                    const ritmoClassificacao = Math.max(81, Math.min(100, Math.ceil(101 - avgQualy)));
                    
                    // RITMO DE CORRIDA: percentual baseado no delta e posição média de corrida - mesma fórmula da tela de telemetria
                    const avgDelta = stats.deltaSum / stats.racesCount;
                    const avgRace = stats.raceSum / stats.racesCount;
                    const ritmoCorrida = deltaToPercent(avgDelta, avgRace);
                    
                    // RITMO: posição média de qualy e corrida convertida para pontuação (1º=100, 2º=99, ..., 20º=81)
                    const posicaoMedia = (avgQualy + avgRace) / 2; // Média entre qualy e corrida
                    // Converter para pontuação: 101 - posição média (limitado entre 81 e 100)
                    const ritmo = Math.max(81, Math.min(100, Math.ceil(101 - posicaoMedia)));
                    
                    // RACECRAFT: média ponderada de CORRIDA (30%), POS. Q (20%), QUALY (20%), POS. R (30%)
                    // 60% para CORRIDA + POS. R, 40% para POS. Q + QUALY
                    const racecraft = (ritmoCorrida * 0.30) + (ritmoClassificacao * 0.20) + (ritmoClassificacao * 0.20) + (ritmo * 0.30);
                    
                    telemetriaMap[name] = {
                        ritmoCorrida: ritmoCorrida,
                        ritmoClassificacao: ritmoClassificacao,
                        ritmo: ritmo,
                        racecraft: Math.max(60, Math.ceil(racecraft)),
                        posicaoMediaQualy: parseFloat(avgQualy.toFixed(2)),
                        posicaoMediaRace: parseFloat(avgRace.toFixed(2))
                    };
                }
            });
        };
        
        // Processar ambos os grids
        processarGridTelemetria(rawCarreira, 'carreira');
        processarGridTelemetria(rawLight, 'light');
        
        setTelemetriaData(telemetriaMap);
    }, [rawCarreira, rawLight, selectedSeason]);

    // Calcular RACECRAFT baseado na média ponderada das colunas CORRIDA, POS. Q, QUALY e POS. R
    useEffect(() => {
        if (!telemetriaData || Object.keys(telemetriaData).length === 0) return;
        
        setPilaresData(prevPilares => {
            const updatedPilares = { ...prevPilares };
            
            Object.keys(telemetriaData).forEach(nomePiloto => {
                const dados = telemetriaData[nomePiloto];
                if (!dados) return;
                
                // CORRIDA (ritmoCorrida) - 30%
                // POS. Q (ritmoClassificacao) - 20%
                // QUALY (ritmoClassificacao) - 20%
                // POS. R (ritmo) - 30%
                // Total: 60% para CORRIDA + POS. R, 40% para POS. Q + QUALY
                const corrida = dados.ritmoCorrida || 0;
                const posQ = dados.ritmoClassificacao || 0;
                const qualy = dados.ritmoClassificacao || 0;
                const posR = dados.ritmo || 0;
                
                const racecraft = (corrida * 0.30) + (posQ * 0.20) + (qualy * 0.20) + (posR * 0.30);
                
                if (!updatedPilares[nomePiloto]) {
                    updatedPilares[nomePiloto] = { performance: 60, conduta: 0, racecraft: 60, overall: 0, historico: 0 };
                }
                updatedPilares[nomePiloto].racecraft = Math.max(60, Math.ceil(racecraft));
            });
            
            return updatedPilares;
        });
    }, [telemetriaData]);

    // Calcular pontos dos objetivos contratuais
    useEffect(() => {
        if (pilotos.length === 0 || !rawCarreira || !rawLight) return;
        if (!selectedSeason) return;

        const calcularObjetivos = async () => {
            try {
                // 1. Buscar contratos dos pilotos
                const { data: contracts, error: contractsError } = await supabase
                    .from('contracts')
                    .select(`
                        *,
                        equipes (name, tier)
                    `)
                    .eq('season', selectedSeason);

                if (contractsError) {
                    return;
                }

                // 2. Criar mapa de contratos por piloto (usando cod_idml ou nome)
                const contratosPorPiloto = {};
                contracts?.forEach(contract => {
                    const piloto = pilotos.find(p => 
                        (p.cod_idml && p.cod_idml === contract.pilot_cod_idml) ||
                        (!contract.pilot_cod_idml && p.nome && p.nome.toLowerCase() === contract.pilot_cod_idml?.toLowerCase())
                    );
                    if (piloto) {
                        contratosPorPiloto[piloto.nome] = {
                            equipe: contract.equipes?.name || '',
                            tier: contract.equipes?.tier || 'bronze',
                            grid: contract.grid || piloto.grid
                        };
                    }
                });

                // 3. Função para gerar objetivos baseado na equipe (mesma lógica do Dashboard)
                const gerarObjetivosPorEquipe = (teamName, tier) => {
                    const teamNameLower = (teamName || '').toLowerCase();
                    let objetivos = [];

                    if (teamNameLower.includes('ferrari')) {
                        objetivos = [
                            'Lutar pelo título de pilotos e construtores, honrando a tradição vermelha',
                            'Conquistar pelo menos 3 Vitórias (1º lugar) durante a temporada',
                            'Nas corridas em que a vitória não vier, conquistar pelo menos 3 Pódios (2º ou 3º lugar)',
                            'Terminar a temporada entre os 2 primeiros do campeonato',
                            'Representar com excelência a marca Ferrari e seus valores italianos'
                        ];
                    } else if (teamNameLower.includes('mclaren')) {
                        objetivos = [
                            'Lutar pelo título de pilotos e construtores, seguindo os passos de Senna e Prost',
                            'Conquistar pelo menos 5 Vitórias (1º lugar) durante a temporada',
                            'Nas corridas em que a vitória não vier, conquistar pelo menos 2 Pódios (2º ou 3º lugar)',
                            'Terminar a temporada entre os 3 primeiros do campeonato',
                            'Desenvolver o carro ao longo da temporada para maximizar performance'
                        ];
                    } else if (teamNameLower.includes('red bull') && !teamNameLower.includes('racing bulls')) {
                        objetivos = [
                            'Lutar pelo título de pilotos e construtores com determinação',
                            'Conquistar pelo menos 3 Vitórias (1º lugar) durante a temporada',
                            'Nas corridas em que a vitória não vier, conquistar pelo menos 3 Pódios (2º ou 3º lugar)',
                            'Terminar a temporada entre os 3 primeiros do campeonato',
                            'Demonstrar agressividade controlada e vontade de vencer'
                        ];
                    } else if (teamNameLower.includes('mercedes')) {
                        objetivos = [
                            'Lutar pelo título de pilotos e construtores com precisão técnica',
                            'Conquistar pelo menos 2 Vitórias (1º lugar) durante a temporada',
                            'Nas corridas em que a vitória não vier, conquistar pelo menos 4 Pódios (2º ou 3º lugar)',
                            'Terminar a temporada entre os 3 primeiros do campeonato',
                            'Demonstrar consistência e confiabilidade em todas as corridas'
                        ];
                    } else if (teamNameLower.includes('aston')) {
                        objetivos = [
                            'Conquistar pelo menos 3 Pódios (2º ou 3º lugar) durante a temporada',
                            'Nas corridas em que o pódio não vier, conquistar pelo menos 2 Top 5 (4º ou 5º lugar)',
                            'Pontuar na maioria das corridas com consistência',
                            'Terminar a temporada entre os 5 primeiros do campeonato',
                            'Contribuir para uma posição sólida no campeonato de construtores'
                        ];
                    } else if (teamNameLower.includes('alpine')) {
                        objetivos = [
                            'Conquistar pelo menos 2 Pódios (2º ou 3º lugar) durante a temporada',
                            'Nas corridas em que o pódio não vier, conquistar pelo menos 3 Top 5 (4º ou 5º lugar)',
                            'Pontuar na maioria das corridas com consistência',
                            'Terminar a temporada entre os 5 primeiros do campeonato',
                            'Contribuir para melhorias constantes no desenvolvimento do carro'
                        ];
                    } else if (teamNameLower.includes('racing') && teamNameLower.includes('bulls')) {
                        objetivos = [
                            'Conquistar pelo menos 1 Pódio (2º ou 3º lugar) durante a temporada',
                            'Nas corridas em que o pódio não vier, conquistar pelo menos 2 Top 5 (4º ou 5º lugar)',
                            'Pontuar em pelo menos 3 corridas adicionais durante a temporada',
                            'Terminar corridas de forma consistente e confiável',
                            'Contribuir para o desenvolvimento e crescimento da equipe'
                        ];
                    } else if (teamNameLower.includes('williams')) {
                        objetivos = [
                            'Conquistar pelo menos 1 Pódio (2º ou 3º lugar) durante a temporada',
                            'Nas corridas em que o pódio não vier, conquistar pelo menos 2 Top 5 (4º ou 5º lugar)',
                            'Pontuar em pelo menos 2 corridas adicionais durante a temporada',
                            'Terminar corridas de forma consistente e confiável',
                            'Contribuir para o retorno da Williams ao topo da Fórmula 1'
                        ];
                    } else if (teamNameLower.includes('haas')) {
                        objetivos = [
                            'Conquistar pelo menos 3 Top 5 (4º ou 5º lugar) durante a temporada',
                            'Nas corridas em que o top 5 não vier, pontuar em pelo menos 2 corridas adicionais',
                            'Terminar corridas de forma consistente',
                            'Desenvolver o carro ao longo da temporada',
                            'Contribuir para melhorias na classificação da equipe'
                        ];
                    } else if (teamNameLower.includes('sauber') || teamNameLower.includes('stake') || teamNameLower.includes('kick')) {
                        objetivos = [
                            'Conquistar pelo menos 2 Top 5 (4º ou 5º lugar) durante a temporada',
                            'Nas corridas em que o top 5 não vier, pontuar em pelo menos 2 corridas adicionais',
                            'Terminar corridas de forma consistente',
                            'Desenvolver o carro ao longo da temporada',
                            'Contribuir para melhorias na classificação da equipe'
                        ];
                    } else {
                        // Fallback genérico baseado em tier
                        if (tier === 'gold') {
                            objetivos = [
                                'Lutar pelo título de pilotos da Master League F1',
                                'Conquistar o título de construtores',
                                'Conquistar pelo menos 5 Vitórias (1º lugar) durante a temporada',
                                'Nas corridas em que a vitória não vier, manter-se no Pódio (2º ou 3º lugar) em pelo menos 70% das provas',
                                'Terminar a temporada entre os 3 primeiros do campeonato'
                            ];
                        } else if (tier === 'silver') {
                            objetivos = [
                                'Conquistar Pódios (2º ou 3º lugar) regularmente durante a temporada',
                                'Nas corridas em que o pódio não vier, pontuar na maioria das provas',
                                'Terminar a temporada entre os 5 primeiros do campeonato',
                                'Buscar pelo menos 3 Pódios (2º ou 3º lugar) durante a temporada',
                                'Contribuir para uma posição sólida no campeonato de construtores'
                            ];
                        } else {
                            objetivos = [
                                'Conquistar Pontos (Top 10) regularmente nas corridas',
                                'Buscar pelo menos 3 Pódios (2º ou 3º lugar) durante a temporada',
                                'Terminar corridas de forma consistente',
                                'Desenvolver o carro ao longo da temporada',
                                'Contribuir para melhorias na classificação da equipe'
                            ];
                        }
                    }

                    return objetivos;
                };

                // 4. Calcular estatísticas de cada piloto na temporada atual
                const calcularEstatisticasPiloto = (nomePiloto, grid) => {
                    const dados = grid === 'carreira' ? rawCarreira : rawLight;
                    const stats = {
                        vitorias: 0,
                        podios: 0,
                        top5: 0,
                        top10: 0,
                        corridasComPontos: 0,
                        totalCorridas: 0,
                        posicaoFinal: null,
                        totalPontos: 0
                    };

                    // Calcular estatísticas
                    dados.forEach(row => {
                        const nome = (row[9] || '').trim();
                        const season = parseInt(row[3] || '0');
                        const racePos = parseInt(row[8] || '0');
                        
                        // Tentar múltiplas colunas para pontos (15 = Pts Finais, 13 = PTS Corrida, 14 = PTS Sprint)
                        let pontos = 0;
                        const ptsFinais = row[15];
                        const ptsCorrida = row[13];
                        const ptsSprint = row[14];
                        
                        // Priorizar Pts Finais, depois PTS Corrida + PTS Sprint
                        if (ptsFinais !== undefined && ptsFinais !== null && ptsFinais !== '') {
                            pontos = parseFloat(ptsFinais.toString().replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
                        } else if (ptsCorrida !== undefined || ptsSprint !== undefined) {
                            const ptsC = parseFloat((ptsCorrida || '0').toString().replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
                            const ptsS = parseFloat((ptsSprint || '0').toString().replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
                            pontos = ptsC + ptsS;
                        }

                        if (nome.toLowerCase() === nomePiloto.toLowerCase() && season === selectedSeason) {
                            stats.totalCorridas++;
                            if (racePos === 1) stats.vitorias++;
                            if (racePos >= 1 && racePos <= 3) stats.podios++;
                            if (racePos >= 1 && racePos <= 5) stats.top5++;
                            if (racePos >= 1 && racePos <= 10) stats.top10++;
                            // Considerar corrida com pontos se: tem pontos OU terminou no top 10 (pontuação padrão F1)
                            if (pontos > 0 || (racePos >= 1 && racePos <= 10)) {
                                stats.corridasComPontos++;
                            }
                            stats.totalPontos += pontos;
                        }
                    });

                    // Calcular posição final no campeonato (soma de pontos)
                    const pilotosPontos = {};
                    dados.forEach(row => {
                        const nome = (row[9] || '').trim();
                        const season = parseInt(row[3] || '0');
                        
                        // Tentar múltiplas colunas para pontos
                        let pontos = 0;
                        const ptsFinais = row[15];
                        const ptsCorrida = row[13];
                        const ptsSprint = row[14];
                        
                        if (ptsFinais !== undefined && ptsFinais !== null && ptsFinais !== '') {
                            pontos = parseFloat(ptsFinais.toString().replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
                        } else if (ptsCorrida !== undefined || ptsSprint !== undefined) {
                            const ptsC = parseFloat((ptsCorrida || '0').toString().replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
                            const ptsS = parseFloat((ptsSprint || '0').toString().replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
                            pontos = ptsC + ptsS;
                        }

                        if (season === selectedSeason && nome) {
                            if (!pilotosPontos[nome]) pilotosPontos[nome] = 0;
                            pilotosPontos[nome] += pontos;
                        }
                    });

                    const ranking = Object.entries(pilotosPontos)
                        .sort((a, b) => b[1] - a[1])
                        .map(([nome], index) => ({ nome, posicao: index + 1 }));

                    const pilotoRanking = ranking.find(r => r.nome.toLowerCase() === nomePiloto.toLowerCase());
                    stats.posicaoFinal = pilotoRanking?.posicao || null;

                    return stats;
                };

                // 5. Função para calcular etapas da temporada
                const calcularEtapasTemporada = (grid) => {
                    const dados = grid === 'carreira' ? rawCarreira : rawLight;
                    const roundsUnicos = new Set();
                    
                    dados.forEach(row => {
                        const season = parseInt(row[3] || '0');
                        const round = row[4]; // Coluna E - Round
                        if (season === selectedSeason && round) {
                            roundsUnicos.add(round);
                        }
                    });
                    
                    const etapasRealizadas = roundsUnicos.size;
                    const etapasTotalEsperado = 8; // Total padrão de etapas por temporada (pode ser ajustado)
                    const etapasRestantes = Math.max(0, etapasTotalEsperado - etapasRealizadas);
                    
                    return {
                        realizadas: etapasRealizadas,
                        total: etapasTotalEsperado,
                        restantes: etapasRestantes
                    };
                };

                // 6. Função para verificar cumprimento de objetivo e atribuir pontos
                const verificarObjetivo = (objetivo, stats, totalFaltas = 0, etapasInfo = { realizadas: 0, total: 8, restantes: 0 }, debugNome = '') => {
                    const objLower = objetivo.toLowerCase();
                    let pontos = 0;
                    let tipoObjetivo = 'Não reconhecido';

                    // Objetivos de vitórias
                    const matchVitorias = objLower.match(/pelo menos (\d+) vit[óo]rias/i);
                    if (matchVitorias) {
                        tipoObjetivo = 'Vitórias';
                        const meta = parseInt(matchVitorias[1]);
                        // Início: 12 pontos
                        pontos = 12;
                        // Cada vitória ganha 1 ponto (progresso)
                        pontos += stats.vitorias;
                        // Se atingiu o objetivo completamente, total = 20 pontos
                        if (stats.vitorias >= meta) {
                            pontos = 20;
                        }
                        return Math.ceil(Math.min(20, pontos)); // Máximo 20 pontos
                    }

                    // Objetivos de pódios
                    const matchPodios = objLower.match(/pelo menos (\d+) p[óo]dios/i);
                    if (matchPodios) {
                        tipoObjetivo = 'Pódios';
                        const meta = parseInt(matchPodios[1]);
                        // Início: 12 pontos
                        pontos = 12;
                        // Cada pódio ganha 1 ponto (progresso)
                        pontos += stats.podios;
                        // Se atingiu o objetivo completamente, total = 20 pontos
                        if (stats.podios >= meta) {
                            pontos = 20;
                        }
                        return Math.ceil(Math.min(20, pontos)); // Máximo 20 pontos
                    }

                    // Objetivos de Top 5
                    const matchTop5 = objLower.match(/pelo menos (\d+) top 5/i);
                    if (matchTop5) {
                        tipoObjetivo = 'Top 5';
                        const meta = parseInt(matchTop5[1]);
                        // Início: 12 pontos
                        pontos = 12;
                        // Cada top 5 ganha 1 ponto (progresso)
                        pontos += stats.top5;
                        // Se atingiu o objetivo completamente, total = 20 pontos
                        if (stats.top5 >= meta) {
                            pontos = 20;
                        }
                        return Math.ceil(Math.min(20, pontos)); // Máximo 20 pontos
                    }

                    // Objetivos de posição final no campeonato
                    const matchPosicao = objLower.match(/entre os (\d+) primeiros/i);
                    if (matchPosicao && stats.posicaoFinal) {
                        tipoObjetivo = 'Posição Final';
                        const meta = parseInt(matchPosicao[1]);
                        // Início: 12 pontos
                        pontos = 12;
                        // Para posição: ganha pontos inversamente proporcional à posição
                        // Quanto melhor a posição, mais pontos. Ex: 1º lugar = 1 ponto (mas se está no top 3, ganha mais)
                        if (stats.posicaoFinal <= meta) {
                            // Está dentro da meta (top X), ganha pontos baseado na posição
                            // Se está em 1º e meta é top 3, ganha 3 pontos; se está em 2º, ganha 2 pontos, etc.
                            const bonusPosicao = (meta + 1) - stats.posicaoFinal; // Ex: top 3, em 1º = 3 pontos, em 2º = 2 pontos, em 3º = 1 ponto
                            pontos += bonusPosicao;
                            // Se atingiu completamente (está dentro do top X), total = 20 pontos
                            pontos = 20;
                        } else {
                            // Não está na meta ainda, mas pode ganhar progresso se está próximo
                            // Ex: meta é top 3 e está em 5º, pode ganhar algum progresso
                            const diferenca = stats.posicaoFinal - meta;
                            // Se está até 3 posições acima, ganha progresso menor
                            if (diferenca <= 3) {
                                pontos += Math.max(0, 3 - diferenca); // Progresso baseado em proximidade
                            }
                        }
                        return Math.ceil(Math.min(20, pontos)); // Máximo 20 pontos
                    }

                    // Objetivos de pontuação consistente
                    if (objLower.includes('pontuar na maioria') || objLower.includes('pontuar em pelo menos')) {
                        tipoObjetivo = 'Pontuação Consistente';
                        const matchPontos = objLower.match(/pelo menos (\d+) corridas/i);
                        let meta = 0;
                        
                        if (matchPontos) {
                            meta = parseInt(matchPontos[1]);
                        } else {
                            // Se não especificar número, considerar 50% das corridas totais da temporada
                            const totalEtapas = etapasInfo.total;
                            meta = Math.ceil(totalEtapas * 0.5);
                        }
                        
                        // Início: 12 pontos
                        pontos = 12;
                        // Cada corrida com pontos ganha 1 ponto (progresso)
                        pontos += stats.corridasComPontos;
                        // Se atingiu o objetivo completamente, total = 20 pontos
                        if (stats.corridasComPontos >= meta) {
                            pontos = 20;
                        }
                        
                        return Math.ceil(Math.min(20, pontos)); // Máximo 20 pontos
                    }

                    // Se não se encaixa em nenhum padrão quantitativo, então é objetivo qualitativo
                    // Objetivos qualitativos: não dependem de resultados (vitórias, pódios, pontos, posições)
                    tipoObjetivo = 'Objetivo Qualitativo';
                    // Objetivos qualitativos: Início = 20 pontos, cada falta (W.O.) reduz 1.5 pontos
                    // Retornamos o valor exato (float) para que o desconto seja aplicado corretamente em cada objetivo
                    // O arredondamento para cima será feito apenas no cálculo do pilar OVERALL final
                    pontos = Math.max(0, 20 - (totalFaltas * 1.5));
                    return pontos; // Retorna valor exato sem arredondamento aqui
                };

                // 6. Calcular pontos para cada piloto
                const objetivosCalculados = {};
                pilotos.forEach(piloto => {
                    const contrato = contratosPorPiloto[piloto.nome];
                    const isLeandroSopena = piloto.nome.toLowerCase().includes('leandro') && piloto.nome.toLowerCase().includes('sope');
                    const isJulioMelo = piloto.nome.toLowerCase().includes('julio') && piloto.nome.toLowerCase().includes('melo');
                    
                    if (!contrato) {
                        // Piloto sem contrato - todos objetivos com 0
                        objetivosCalculados[piloto.nome] = {
                            objetivo1: 0,
                            objetivo2: 0,
                            objetivo3: 0,
                            objetivo4: 0,
                            objetivo5: 0
                        };
                        return;
                    }

                    const objetivos = gerarObjetivosPorEquipe(contrato.equipe, contrato.tier);
                    const stats = calcularEstatisticasPiloto(piloto.nome, contrato.grid || piloto.grid);
                    const etapasInfo = calcularEtapasTemporada(contrato.grid || piloto.grid);
                    
                    // Calcular total de faltas (W.O.) do piloto na temporada atual
                    let totalFaltas = 0;
                    if (condutaData && piloto.id && condutaData[piloto.id]) {
                        const rounds = Object.keys(condutaData[piloto.id]);
                        rounds.forEach(round => {
                            const data = condutaData[piloto.id][round];
                            if (data && data.falta_wo === true) {
                                totalFaltas++;
                            }
                        });
                    }

                    const pontosObjetivos = {
                        objetivo1: objetivos[0] ? verificarObjetivo(objetivos[0], stats, totalFaltas, etapasInfo, (isLeandroSopena ? 'Leandro Sopeña' : '') || (isJulioMelo ? 'Julio Melo' : '')) : 0,
                        objetivo2: objetivos[1] ? verificarObjetivo(objetivos[1], stats, totalFaltas, etapasInfo, (isLeandroSopena ? 'Leandro Sopeña' : '') || (isJulioMelo ? 'Julio Melo' : '')) : 0,
                        objetivo3: objetivos[2] ? verificarObjetivo(objetivos[2], stats, totalFaltas, etapasInfo, (isLeandroSopena ? 'Leandro Sopeña' : '') || (isJulioMelo ? 'Julio Melo' : '')) : 0,
                        objetivo4: objetivos[3] ? verificarObjetivo(objetivos[3], stats, totalFaltas, etapasInfo, (isLeandroSopena ? 'Leandro Sopeña' : '') || (isJulioMelo ? 'Julio Melo' : '')) : 0,
                        objetivo5: objetivos[4] ? verificarObjetivo(objetivos[4], stats, totalFaltas, etapasInfo, (isLeandroSopena ? 'Leandro Sopeña' : '') || (isJulioMelo ? 'Julio Melo' : '')) : 0
                    };

                    objetivosCalculados[piloto.nome] = pontosObjetivos;
                });

                setObjetivosData(objetivosCalculados);
            } catch (error) {
                console.error('❌ Erro ao calcular objetivos contratuais:', error);
            }
        };

        calcularObjetivos();
    }, [pilotos, rawCarreira, rawLight, selectedSeason, condutaData]);

    // Atualizar pilar OVERALL com base nos objetivos contratuais
    useEffect(() => {
        if (Object.keys(objetivosData).length === 0) return;

        setPilaresData(prev => {
            const updated = { ...prev };
            Object.keys(objetivosData).forEach(nomePiloto => {
                const objetivos = objetivosData[nomePiloto];
                // OVERALL = soma dos 5 objetivos (0-100)
                const overall = (objetivos.objetivo1 || 0) + 
                               (objetivos.objetivo2 || 0) + 
                               (objetivos.objetivo3 || 0) + 
                               (objetivos.objetivo4 || 0) + 
                               (objetivos.objetivo5 || 0);
                
                if (!updated[nomePiloto]) {
                    updated[nomePiloto] = { performance: 60, conduta: 0, racecraft: 60, overall: 0, historico: 0 };
                }
                updated[nomePiloto].overall = Math.ceil(overall);
            });
            return updated;
        });
    }, [objetivosData]);

    // Marcar como carregado
    useEffect(() => {
        if (pilotos.length > 0 && !loadingPR) {
            setLoading(false);
        }
    }, [pilotos, loadingPR]);

    // Filtrar pilotos por busca e grid
    const filteredPilotos = pilotos
        .filter(piloto => {
            const matchesSearch = piloto.nome.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesGrid = selectedGrid === 'all' || piloto.grid === selectedGrid;
            return matchesSearch && matchesGrid;
        })
        .sort((a, b) => {
            // Ordenar alfabeticamente por nome
            return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
        });

    // Função para atualizar flag manual
    const handleUpdateFlag = async (pilotoId, round, flagName, value) => {
        const key = `${pilotoId}_${round}`;
        setSaving(prev => ({ ...prev, [key]: true }));

        try {
            const { data: existing } = await supabase
                .from('power_ranking_conduta')
                .select('id')
                .eq('piloto_id', pilotoId)
                .eq('season', selectedSeason)
                .eq('round', round)
                .single();

            const updateData = {
                piloto_id: pilotoId,
                season: selectedSeason,
                round: round,
                [flagName]: value,
                updated_at: new Date().toISOString()
            };

            let error;
            if (existing) {
                const { error: updateError } = await supabase
                    .from('power_ranking_conduta')
                    .update(updateData)
                    .eq('id', existing.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('power_ranking_conduta')
                    .insert([updateData]);
                error = insertError;
            }

            if (error) throw error;

            setCondutaData(prev => {
                const newData = { ...prev };
                if (!newData[pilotoId]) newData[pilotoId] = {};
                if (!newData[pilotoId][round]) {
                    newData[pilotoId][round] = {
                        piloto_id: pilotoId,
                        season: selectedSeason,
                        round: round
                    };
                }
                newData[pilotoId][round][flagName] = value;
                return newData;
            });
        } catch (err) {
            console.error('Erro ao atualizar flag:', err);
            alert('❌ Erro ao salvar: ' + (err.message || 'Erro desconhecido'));
        } finally {
            setSaving(prev => ({ ...prev, [key]: false }));
        }
    };

    // Obter valor da flag
    const getFlagValue = (pilotoId, round, flagName, defaultValue = false) => {
        return condutaData[pilotoId]?.[round]?.[flagName] ?? defaultValue;
    };

    // Calcular Power Ranking final (média dos pilares)
    const calcularPRFinal = (pilotoNome) => {
        const pilares = pilaresData[pilotoNome] || {};
        const valores = [
            pilares.performance || 0,
            pilares.conduta || 0,
            pilares.racecraft || 0,
            pilares.overall || 0,
            pilares.historico || 0
        ].filter(v => v > 0);
        
        if (valores.length === 0) return 0;
        return valores.reduce((a, b) => a + b, 0) / valores.length;
    };

    if (loading) {
        return (
            <div style={{ padding: '100px', textAlign: 'center', color: 'white' }}>
                Carregando Power Ranking...
            </div>
        );
    }

    // Definir colunas da tabela
    const columns = [
        { key: 'piloto', label: 'PILOTO', color: COLORS.PILOTO, width: 200, sticky: true },
        { key: 'power_ranking', label: 'POWER RANKING', color: COLORS.POWER_RANKING, width: 120 },
        { key: 'performance', label: 'PERFORMANCE', color: COLORS.PERFORMANCE, width: 120 },
        { key: 'pr_races', label: 'PR RACES', color: COLORS.PERFORMANCE, width: 100, subitem: true },
        { key: 'conduta', label: 'CONDUTA', color: COLORS.CONDUTA, width: 120 },
        { key: 'envio_foto', label: 'ENVIO DE FOTO', color: COLORS.CONDUTA, width: 120, subitem: true, editable: true },
        { key: 'faltas', label: 'FALTAS', color: COLORS.CONDUTA, width: 100, subitem: true },
        { key: 'lista', label: 'LISTA', color: COLORS.CONDUTA, width: 200, subitem: true, editable: true },
        { key: 'num_id', label: 'NUM-ID', color: COLORS.CONDUTA, width: 200, subitem: true, editable: true },
        { key: 'defesa', label: 'DEFESA', color: COLORS.CONDUTA, width: 100, subitem: true },
        { key: 'punicoes', label: 'PUNIÇÕES', color: COLORS.CONDUTA, width: 100, subitem: true },
        { key: 'racecraft', label: 'RACECRAFT', color: COLORS.RACECRAFT, width: 120 },
        { key: 'corrida', label: 'CORRIDA', color: COLORS.RACECRAFT, width: 100, subitem: true },
        { key: 'sprint', label: 'POS. Q', color: COLORS.RACECRAFT, width: 100, subitem: true },
        { key: 'qualy', label: 'QUALY', color: COLORS.RACECRAFT, width: 100, subitem: true },
        { key: 'ritmo', label: 'POS. R', color: COLORS.RACECRAFT, width: 100, subitem: true },
        { key: 'overall', label: 'OVERALL', color: COLORS.OVERALL, width: 120 },
        { key: 'objetivo1', label: 'OBJETIVO 1', color: COLORS.OVERALL, width: 100, subitem: true },
        { key: 'objetivo2', label: 'OBJETIVO 2', color: COLORS.OVERALL, width: 100, subitem: true },
        { key: 'objetivo3', label: 'OBJETIVO 3', color: COLORS.OVERALL, width: 100, subitem: true },
        { key: 'objetivo4', label: 'OBJETIVO 4', color: COLORS.OVERALL, width: 100, subitem: true },
        { key: 'objetivo5', label: 'OBJETIVO 5', color: COLORS.OVERALL, width: 100, subitem: true },
        { key: 'historico', label: 'HISTÓRICO', color: COLORS.HISTORICO, width: 120 },
        { key: 'temporadas', label: 'TEMPORADAS', color: COLORS.HISTORICO, width: 120 },
        { key: 'historia', label: 'HISTÓRIA', color: COLORS.HISTORICO, width: 100, subitem: true }
    ];

    return (
        <div className="adm-content" style={{ padding: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ color: '#F8FAFC', marginBottom: '20px' }}>
                    📊 Power Ranking - Painel Administrativo
                </h2>

                {/* Filtros */}
                <div style={{
                    display: 'flex',
                    gap: '15px',
                    marginBottom: '20px',
                    flexWrap: 'wrap',
                    alignItems: 'center'
                }}>
                    <div style={{ flex: '1', minWidth: '200px' }}>
                        <label style={{ color: '#94A3B8', fontSize: '14px', display: 'block', marginBottom: '5px' }}>
                            Buscar Piloto:
                        </label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Digite o nome do piloto..."
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: '#1E293B',
                                border: '1px solid #475569',
                                borderRadius: '6px',
                                color: '#F8FAFC',
                                fontSize: '14px'
                            }}
                        />
                    </div>

                    <div style={{ minWidth: '150px' }}>
                        <label style={{ color: '#94A3B8', fontSize: '14px', display: 'block', marginBottom: '5px' }}>
                            Grid:
                        </label>
                        <select
                            value={selectedGrid}
                            onChange={(e) => setSelectedGrid(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: '#1E293B',
                                border: '1px solid #475569',
                                borderRadius: '6px',
                                color: '#F8FAFC',
                                fontSize: '14px'
                            }}
                        >
                            <option value="all">Todos</option>
                            <option value="carreira">Carreira</option>
                            <option value="light">Light</option>
                        </select>
                    </div>
                </div>

                {/* Tabela estilo planilha */}
                <div style={{
                    overflowX: 'auto',
                    overflowY: 'auto',
                    maxHeight: '70vh',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    background: '#0F172A'
                }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        minWidth: '2400px'
                    }}>
                        <thead style={{
                            position: 'sticky',
                            top: 0,
                            zIndex: 10
                        }}>
                            <tr>
                                {columns.map((col, idx) => (
                                    <th
                                        key={col.key}
                                        style={{
                                            padding: '12px 8px',
                                            textAlign: col.sticky ? 'left' : 'center',
                                            borderBottom: '2px solid #475569',
                                            borderRight: '1px solid #334155',
                                            color: '#FFFFFF',
                                            fontWeight: 'bold',
                                            fontSize: col.subitem ? '11px' : '13px',
                                            background: col.color,
                                            position: col.sticky ? 'sticky' : 'relative',
                                            left: col.sticky ? 0 : 'auto',
                                            zIndex: col.sticky ? 11 : 10,
                                            minWidth: col.width,
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPilotos.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} style={{
                                        padding: '40px',
                                        textAlign: 'center',
                                        color: '#94A3B8'
                                    }}>
                                        {searchTerm ? 'Nenhum piloto encontrado' : 'Nenhum piloto cadastrado'}
                                    </td>
                                </tr>
                            ) : (
                                filteredPilotos.map((piloto, rowIdx) => {
                                    const prTotal = prData[piloto.nome]?.total || calcularPRFinal(piloto.nome);
                                    const pilares = pilaresData[piloto.nome] || {};
                                    
                                    // Definir as 8 etapas da temporada (aceita ambos formatos: "1" e "R01")
                                    const etapas = ['R01', 'R02', 'R03', 'R04', 'R05', 'R06', 'R07', 'R08'];
                                    const etapasNumeros = ['1', '2', '3', '4', '5', '6', '7', '8'];
                                    
                                    // Calcular faltas verificando se o piloto tem registro em cada etapa nos Resultados
                                    const calcularFaltasPorResultados = () => {
                                        const gridPiloto = (piloto.grid || 'carreira').toLowerCase();
                                        const dados = gridPiloto === 'light' ? rawLight : rawCarreira;
                                        const nomePiloto = piloto.nome.trim();
                                        
                                        // Normalizar nome do piloto para comparação (mesma função usada no resto do código)
                                        const normalizarNome = (nome) => {
                                            if (!nome) return '';
                                            return String(nome)
                                                .toLowerCase()
                                                .normalize('NFD')
                                                .replace(/[\u0300-\u036f]/g, '')
                                                .replace(/\s+/g, ' ')
                                                .trim();
                                        };
                                        
                                        const nomePilotoNorm = normalizarNome(nomePiloto);
                                        
                                        // Debug: configurar antes de qualquer return
                                        const fazerLogDebug = false; // Desativado - debug completo desligado
                                        const pilotosDebugEspecíficos = ['lucas monteiro', 'roberto azevedo', 'lucas raiol', 'lucas searom'];
                                        const nomePilotoNormLower = nomePilotoNorm.toLowerCase();
                                        const shouldDebugEspecifico = pilotosDebugEspecíficos.some(p => {
                                            const pLower = p.toLowerCase();
                                            const partesNome = nomePilotoNormLower.split(' ');
                                            const partesDebug = pLower.split(' ');
                                            return nomePilotoNormLower.includes(pLower) || 
                                                   pLower.includes(nomePilotoNormLower) ||
                                                   partesNome.some(parte => pLower.includes(parte)) ||
                                                   partesDebug.some(parte => nomePilotoNormLower.includes(parte));
                                        });
                                        
                                        // Primeiro: identificar quais etapas realmente foram realizadas (existem nos dados)
                                        const etapasRealizadas = new Set();
                                        const temporadasEncontradas = new Set();
                                        const roundsEncontrados = new Set();
                                        dados.forEach(row => {
                                            const season = parseInt(row[3] || '0');
                                            const round = (row[4] || '').trim();
                                            
                                            if (season) temporadasEncontradas.add(season);
                                            if (season === parseInt(selectedSeason)) {
                                                roundsEncontrados.add(round); // Adicionar TODOS os rounds da temporada selecionada
                                            }
                                            
                                            // Aceitar tanto "R01" quanto "1" como formatos válidos
                                            if (season === parseInt(selectedSeason) && round && (etapas.includes(round) || etapasNumeros.includes(round))) {
                                                // Normalizar para formato "R01" se vier como "1"
                                                const roundNormalizado = etapasNumeros.includes(round) ? `R0${round}` : round;
                                                etapasRealizadas.add(roundNormalizado);
                                            }
                                        });
                                        
                                        // Se nenhuma etapa foi realizada ainda, não há faltas
                                        if (etapasRealizadas.size === 0) {
                                            return 0;
                                        }
                                        
                                        // Segundo: verificar em quais etapas realizadas o piloto participou
                                        const etapasComPresenca = new Set();
                                        
                                        dados.forEach(row => {
                                            const nome = (row[9] || '').trim();
                                            const season = parseInt(row[3] || '0');
                                            const round = (row[4] || '').trim();
                                            const nomeNorm = normalizarNome(nome);
                                            
                                            // Normalizar round para formato "R01" se vier como "1"
                                            const roundNormalizado = etapasNumeros.includes(round) ? `R0${round}` : round;
                                            
                                            // Verificar se é o mesmo piloto, mesma temporada e etapa realizada
                                            if (season === parseInt(selectedSeason) && 
                                                nomeNorm === nomePilotoNorm && 
                                                round && etapasRealizadas.has(roundNormalizado)) {
                                                etapasComPresenca.add(roundNormalizado);
                                            }
                                        });
                                        
                                        // Contar faltas: etapas realizadas sem presença do piloto
                                        const totalFaltas = etapasRealizadas.size - etapasComPresenca.size;
                                        return totalFaltas;
                                    };
                                    
                                    const totalFaltas = calcularFaltasPorResultados();
                                    
                                    const flags = {
                                        faltas: totalFaltas,
                                        defesa: etapas.reduce((total, round) => {
                                            return total + (getFlagValue(piloto.id, round, 'defesa_nao_enviada', false) ? 1 : 0);
                                        }, 0)
                                    };
                                    
                                    // Função auxiliar para buscar dados de telemetria com matching flexível
                                    const buscarTelemetria = (campo) => {
                                        const nomePiloto = piloto.nome.trim();
                                        // Tentar match exato primeiro
                                        let dados = telemetriaData[nomePiloto];
                                        if (dados && dados[campo] !== undefined) {
                                            return dados[campo];
                                        }
                                        // Tentar match normalizado
                                        const nomeNorm = (nomePiloto || '')
                                            .toLowerCase()
                                            .normalize('NFD')
                                            .replace(/[\u0300-\u036f]/g, '')
                                            .replace(/\s+/g, ' ')
                                            .trim();
                                        const nomeEncontrado = Object.keys(telemetriaData).find(n => {
                                            const nNorm = (n || '')
                                                .toLowerCase()
                                                .normalize('NFD')
                                                .replace(/[\u0300-\u036f]/g, '')
                                                .replace(/\s+/g, ' ')
                                                .trim();
                                            return nNorm === nomeNorm;
                                        });
                                        if (nomeEncontrado && telemetriaData[nomeEncontrado]) {
                                            return telemetriaData[nomeEncontrado][campo];
                                        }
                                        return undefined;
                                    };

                                    const getCellValue = (colKey) => {
                                        switch (colKey) {
                                            case 'piloto':
                                                return piloto.nome;
                                            case 'power_ranking':
                                                return prTotal > 0 ? prTotal.toFixed(2) : '-';
                                            case 'performance':
                                                return (pilares.performance && pilares.performance > 0) ? Math.ceil(pilares.performance).toString() : '-';
                                            case 'pr_races':
                                                // PR RACES: mostrar o PR total da temporada atual
                                                return prTotal > 0 ? prTotal.toFixed(2) : '-';
                                            case 'conduta':
                                                return (pilares.conduta && pilares.conduta > 0) ? pilares.conduta.toFixed(2) : '-';
                                            case 'envio_foto':
                                                // ENVIO DE FOTO: apenas um checkbox (usar R01 como referência)
                                                return 'SINGLE_CHECKBOX';
                                            case 'lista':
                                            case 'num_id':
                                                // Retornar array de etapas para renderizar checkboxes
                                                return 'CHECKBOXES'; // Marcador especial
                                            case 'faltas':
                                                return flags.faltas > 0 ? `${flags.faltas}` : '0';
                                            case 'defesa':
                                                return flags.defesa > 0 ? `${flags.defesa}` : '0';
                                            case 'punicoes':
                                                // Calcular total de pontos descontados (punicao) de todas as etapas
                                                let totalPunicoes = 0;
                                                etapas.forEach(round => {
                                                    const data = condutaData[piloto.id]?.[round];
                                                    if (data && data.pontos_descontados) {
                                                        totalPunicoes += data.pontos_descontados;
                                                    }
                                                });
                                                return totalPunicoes > 0 ? totalPunicoes.toString() : '0';
                                            case 'racecraft':
                                                return (pilares.racecraft && pilares.racecraft > 0) ? Math.ceil(pilares.racecraft).toString() : '-';
                                            case 'corrida':
                                                // CORRIDA: RITMO DE CORRIDA (percentual 0-100 da tela Telemetria como número simples)
                                                const ritmoCorridaCorrida = buscarTelemetria('ritmoCorrida');
                                                return ritmoCorridaCorrida !== undefined ? ritmoCorridaCorrida.toString() : '-';
                                            case 'sprint':
                                                // POS. Q: Posição média de classificação convertida para pontos (1º=100, 2º=99, ..., 20º=81)
                                                const ritmoClassificacaoPosQ = buscarTelemetria('ritmoClassificacao');
                                                return ritmoClassificacaoPosQ !== undefined ? ritmoClassificacaoPosQ.toString() : '-';
                                            case 'qualy':
                                                // QUALY: RITMO DE CLASSIFICAÇÃO (percentual 0-100 da tela Telemetria como número simples)
                                                const ritmoClassificacaoQualy = buscarTelemetria('ritmoClassificacao');
                                                return ritmoClassificacaoQualy !== undefined ? ritmoClassificacaoQualy.toString() : '-';
                                            case 'ritmo':
                                                // RITMO: pontuação baseada na posição média de qualy e corrida (1º=100, 2º=99, ..., 20º=81)
                                                const ritmo = buscarTelemetria('ritmo');
                                                return ritmo !== undefined ? ritmo.toString() : '-';
                                            case 'overall':
                                                return (pilares.overall && pilares.overall > 0) ? Math.ceil(pilares.overall).toString() : '-';
                                            case 'objetivo1':
                                            case 'objetivo2':
                                            case 'objetivo3':
                                            case 'objetivo4':
                                            case 'objetivo5':
                                                const objetivoNum = colKey.replace('objetivo', '');
                                                const objetivoKey = `objetivo${objetivoNum}`;
                                                const pontosObjetivo = objetivosData[piloto.nome]?.[objetivoKey] || 0;
                                                return pontosObjetivo > 0 ? pontosObjetivo.toString() : '-';
                                            case 'historico':
                                                // Mostrar pontuação normalizada de 0-100 (arredondada para cima)
                                                return (pilares.historico && pilares.historico > 0) ? Math.ceil(pilares.historico).toString() : '-';
                                            case 'historia':
                                                // Mostrar o valor bruto da média ponderada (para referência)
                                                const valorBrutoHistoria = historicoBrutoData[piloto.nome] || 0;
                                                return valorBrutoHistoria > 0 ? valorBrutoHistoria.toFixed(2) : '-';
                                            case 'temporadas':
                                                const pontuacaoTemporadas = temporadasData[piloto.nome] || 0;
                                                return pontuacaoTemporadas > 0 ? pontuacaoTemporadas.toString() : '-';
                                                return valorBrutoHistoria > 0 ? valorBrutoHistoria.toFixed(2) : '-';
                                            default:
                                                return '-';
                                        }
                                    };

                                    const getFlagName = (colKey) => {
                                        const map = {
                                            'envio_foto': 'foto_oficial_enviada',
                                            'lista': 'lista_presenca_respondida',
                                            'num_id': 'numeracao_errada'
                                        };
                                        return map[colKey];
                                    };

                                    const getDefaultValue = (colKey) => {
                                        const map = {
                                            'envio_foto': true, // foto_oficial_enviada - padrão true (enviada)
                                            'lista': true, // lista_presenca_respondida - padrão true (respondida)
                                            'num_id': false // numeracao_errada - padrão false (correta)
                                        };
                                        return map[colKey] ?? false;
                                    };

                                    return (
                                        <tr key={piloto.id} style={{
                                            borderBottom: '1px solid #334155',
                                            background: rowIdx % 2 === 0 ? '#0F172A' : '#1E293B'
                                        }}>
                                            {columns.map((col) => {
                                                const value = getCellValue(col.key);
                                                const isEditable = col.editable && col.subitem;
                                                const flagName = isEditable ? getFlagName(col.key) : null;
                                                const rowBg = rowIdx % 2 === 0 ? '#0F172A' : '#1E293B';

                                                return (
                                                    <td
                                                        key={col.key}
                                                        style={{
                                                            padding: '10px 8px',
                                                            textAlign: col.sticky ? 'left' : 'center',
                                                            borderRight: '1px solid #334155',
                                                            color: col.key === 'power_ranking' ? '#FFD700' : 
                                                                   (col.key.startsWith('objetivo') ? '#FFFFFF' : '#F8FAFC'),
                                                            fontWeight: col.key === 'power_ranking' || !col.subitem ? 'bold' : 'normal',
                                                            fontSize: col.subitem ? '12px' : '13px',
                                                            position: col.sticky ? 'sticky' : 'relative',
                                                            left: col.sticky ? 0 : 'auto',
                                                            background: col.sticky ? rowBg : 'transparent',
                                                            zIndex: col.sticky ? 1 : 0,
                                                            minWidth: col.width
                                                        }}
                                                    >
                                                        {isEditable && value === 'SINGLE_CHECKBOX' ? (
                                                            // ENVIO DE FOTO: apenas um checkbox (usar R01 como referência)
                                                            (() => {
                                                                const flagNameAtual = getFlagName(col.key);
                                                                const defaultValue = getDefaultValue(col.key);
                                                                const round = 'R01'; // Usar R01 como referência para foto
                                                                const checked = getFlagValue(piloto.id, round, flagNameAtual, defaultValue);
                                                                const savingKey = `${piloto.id}_${round}`;
                                                                const isSavingRound = saving[savingKey] || false;
                                                                
                                                                return (
                                                                    <label
                                                                        style={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            cursor: isSavingRound ? 'not-allowed' : 'pointer',
                                                                            opacity: isSavingRound ? 0.5 : 1
                                                                        }}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={checked}
                                                                            onChange={(e) => {
                                                                                handleUpdateFlag(
                                                                                    piloto.id,
                                                                                    round,
                                                                                    flagNameAtual,
                                                                                    e.target.checked
                                                                                );
                                                                            }}
                                                                            disabled={isSavingRound}
                                                                            style={{
                                                                                width: '18px',
                                                                                height: '18px',
                                                                                cursor: isSavingRound ? 'not-allowed' : 'pointer'
                                                                            }}
                                                                        />
                                                                    </label>
                                                                );
                                                            })()
                                                        ) : isEditable && value === 'CHECKBOXES' ? (
                                                            // Renderizar 8 checkboxes (um para cada etapa)
                                                            <div style={{
                                                                display: 'flex',
                                                                gap: '4px',
                                                                justifyContent: 'center',
                                                                alignItems: 'center',
                                                                flexWrap: 'wrap'
                                                            }}>
                                                                {etapas.map((round) => {
                                                                    const flagNameAtual = getFlagName(col.key);
                                                                    const defaultValue = getDefaultValue(col.key);
                                                                    const checked = getFlagValue(piloto.id, round, flagNameAtual, defaultValue);
                                                                    const savingKey = `${piloto.id}_${round}`;
                                                                    const isSavingRound = saving[savingKey] || false;
                                                                    
                                                                    return (
                                                                        <label
                                                                            key={round}
                                                                            title={round}
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                cursor: isSavingRound ? 'not-allowed' : 'pointer',
                                                                                opacity: isSavingRound ? 0.5 : 1
                                                                            }}
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={checked}
                                                                                onChange={(e) => {
                                                                                    handleUpdateFlag(
                                                                                        piloto.id,
                                                                                        round,
                                                                                        flagNameAtual,
                                                                                        e.target.checked
                                                                                    );
                                                                                }}
                                                                                disabled={isSavingRound}
                                                                                style={{
                                                                                    width: '16px',
                                                                                    height: '16px',
                                                                                    cursor: isSavingRound ? 'not-allowed' : 'pointer'
                                                                                }}
                                                                            />
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            value
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div style={{
                    marginTop: '20px',
                    padding: '15px',
                    background: '#1E293B',
                    borderRadius: '8px',
                    color: '#94A3B8',
                    fontSize: '13px'
                }}>
                    <strong style={{ color: '#F8FAFC' }}>ℹ️ Informações:</strong>
                    <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                        <li>Total de pilotos: {filteredPilotos.length}</li>
                        <li>Pilotos com Power Ranking: {Object.keys(prData).length}</li>
                        <li>Os pilares são calculados a partir dos subitens</li>
                        <li>O Power Ranking final é a média dos 5 pilares</li>
                        <li>Marque/desmarque os checkboxes para atualizar as flags de conduta</li>
                        <li>As alterações são salvas automaticamente</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
