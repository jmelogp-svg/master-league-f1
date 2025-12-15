import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useLeagueData } from '../hooks/useLeagueData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';
import '../index.css';

// --- CONFIGURAÇÃO ---
// CADASTRO MLF1 (gid=1844400629)
const LINK_CONTROLE = "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=1844400629&single=true&output=csv";
// Pilotos PR (gid=884534812) - Para buscar COD IDML
const LINK_PILOTOS_PR = "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=884534812&single=true&output=csv";

// Mapeamento de GP para abreviação de país
const getCountryAbbreviation = (gpName) => {
    if (!gpName) return '';
    const name = gpName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
    
    // Mapeamento direto
    if (name.includes('BAHREIN') || name.includes('BAHREIM')) return 'BAH';
    if (name.includes('ARÁBIA') || name.includes('ARABIA') || name.includes('SAUDI')) return 'ARA';
    if (name.includes('AUSTRÁLIA') || name.includes('AUSTRALIA')) return 'AUS';
    if (name.includes('CHINA')) return 'CHN';
    if (name.includes('JAPÃO') || name.includes('JAPAO') || name.includes('JAPAN')) return 'JAP';
    if (name.includes('MIAMI') || name.includes('AUSTIN') || name.includes('LAS VEGAS') || name.includes('VEGAS')) return 'EUA';
    if (name.includes('EMÍLIA') || name.includes('EMILIA') || name.includes('IMOLA')) return 'EMI';
    if (name.includes('MÔNACO') || name.includes('MONACO')) return 'MON';
    if (name.includes('CANADÁ') || name.includes('CANADA')) return 'CAN';
    if (name.includes('ESPANHA') || name.includes('SPAIN') || name.includes('BARCELONA')) return 'ESP';
    if (name.includes('ÁUSTRIA') || name.includes('AUSTRIA')) return 'AUT';
    if (name.includes('INGLATERRA') || name.includes('BRITAIN') || name.includes('SILVERSTONE')) return 'GBR';
    if (name.includes('HUNGRIA') || name.includes('HUNGARY')) return 'HUN';
    if (name.includes('BÉLGICA') || name.includes('BELGICA') || name.includes('BELGIUM') || name.includes('SPA')) return 'BEL';
    if (name.includes('HOLANDA') || name.includes('NETHERLANDS') || name.includes('ZANDVOORT')) return 'HOL';
    if (name.includes('ITÁLIA') || name.includes('ITALIA') || name.includes('ITALY') || name.includes('MONZA')) return 'ITA';
    if (name.includes('SINGAPURA') || name.includes('SINGAPORE')) return 'SIN';
    if (name.includes('CATAR') || name.includes('QATAR')) return 'QAT';
    if (name.includes('MÉXICO') || name.includes('MEXICO')) return 'MEX';
    if (name.includes('BRASIL') || name.includes('BRAZIL') || name.includes('INTERLAGOS')) return 'BRA';
    if (name.includes('ABU') || name.includes('EMIRATES') || name.includes('YAS MARINA')) return 'ABU';
    if (name.includes('PORTUGAL') || name.includes('PORTIMÃO') || name.includes('PORTIMAO')) return 'POR';
    
    return '';
};

const fetchWithProxy = async (url) => {
    const proxyUrl = "https://corsproxy.io/?";
    const response = await fetch(proxyUrl + encodeURIComponent(url));
    return response.text();
};

// --- HELPERS VISUAIS ---
const getTeamColor = (teamName) => {
    if(!teamName || teamName === 'Sem Equipe') return "#94A3B8";
    const t = teamName.toLowerCase();
    if(t.includes("red bull")) return "var(--f1-redbull)"; 
    if(t.includes("ferrari")) return "var(--f1-ferrari)"; 
    if(t.includes("mercedes")) return "var(--f1-mercedes)"; 
    if(t.includes("mclaren")) return "var(--f1-mclaren)"; 
    if(t.includes("aston")) return "var(--f1-aston)"; 
    if(t.includes("alpine")) return "var(--f1-alpine)"; 
    if(t.includes("haas")) return "var(--f1-haas)"; 
    if(t.includes("williams")) return "var(--f1-williams)"; 
    if(t.includes("stake") || t.includes("kick") || t.includes("sauber")) return "var(--f1-sauber)"; 
    if(t.includes("vcarb") || t.includes("racing") && t.includes("bulls")) return "var(--f1-vcarb)";
    return "#94A3B8";
};

const getTeamLogo = (teamName) => {
    if(!teamName || teamName === 'Sem Equipe') return null;
    const t = teamName.toLowerCase().replace(/\s/g, '');
    if(t.includes("ferrari")) return "/logos/ferrari.png";
    if(t.includes("mercedes")) return "/logos/mercedes.png";
    if(t.includes("alpine")) return "/logos/alpine.png";
    if(t.includes("vcarb") || (t.includes("racing") && t.includes("bulls"))) return "/logos/racingbulls.png";
    if(t.includes("redbull") || t.includes("oracle")) return "/logos/redbull.png";
    if(t.includes("mclaren")) return "/logos/mclaren.png";
    if(t.includes("aston")) return "/logos/astonmartin.png";
    if(t.includes("haas")) return "/logos/haas.png";
    if(t.includes("williams")) return "/logos/williams.png";
    if(t.includes("stake") || t.includes("kick") || t.includes("sauber")) return "/logos/sauber.png";
    return null;
};

const getTeamGradient = (teamName) => {
    if(!teamName || teamName === 'Sem Equipe') return "linear-gradient(135deg, #334155 0%, #1E293B 100%)";
    const t = teamName.toLowerCase();
    if(t.includes("red bull")) return "linear-gradient(135deg, #000000 0%, #3671C6 50%, #FABB00 100%)";
    if(t.includes("ferrari")) return "linear-gradient(135deg, #000000 0%, #E8002D 60%, #F9B900 100%)";
    if(t.includes("mercedes")) return "linear-gradient(135deg, #000000 0%, #C0C0C0 50%, #27F4D2 100%)";
    if(t.includes("mclaren")) return "linear-gradient(135deg, #000000 0%, #FF8000 60%, #47C7FC 100%)";
    return "linear-gradient(135deg, #334155 0%, #1E293B 100%)"; 
};

// Função para obter wallpaper da equipe (estilo F1)
const getTeamWallpaper = (teamName) => {
    if(!teamName || teamName === 'Sem Equipe') {
        // Wallpaper padrão para pilotos sem equipe
        return '/banner-masterleague.png'; // Fallback para imagem existente
    }
    
    const t = teamName.toLowerCase();
    
    // Mapeamento de equipes para wallpapers
    if(t.includes("red bull") || t.includes("oracle")) {
        return '/wallpapers/f1-redbull.jpg';
    }
    if(t.includes("ferrari")) {
        return '/wallpapers/f1-ferrari.jpg';
    }
    if(t.includes("mercedes")) {
        return '/wallpapers/f1-mercedes.jpg';
    }
    if(t.includes("mclaren")) {
        return '/wallpapers/f1-mclaren.jpg';
    }
    if(t.includes("aston")) {
        return '/wallpapers/f1-aston.jpg';
    }
    if(t.includes("alpine")) {
        return '/wallpapers/f1-alpine.jpg';
    }
    if(t.includes("haas")) {
        return '/wallpapers/f1-haas.jpg';
    }
    if(t.includes("williams")) {
        return '/wallpapers/f1-williams.jpg';
    }
    if(t.includes("stake") || t.includes("kick") || t.includes("sauber")) {
        return '/wallpapers/f1-sauber.jpg';
    }
    if(t.includes("vcarb") || (t.includes("racing") && t.includes("bulls"))) {
        return '/wallpapers/f1-vcarb.jpg';
    }
    
    // Fallback para equipe não mapeada
    return '/banner-masterleague.png'; // Usar imagem existente como fallback
};

const DriverImage = ({ name, gridType, season, isExPiloto = false }) => {
    const cleanName = name ? name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '').toLowerCase() : "pilotoshadow";
    const s = season || '19';
    
    // Se for ex-piloto, buscar primeiro na pasta SML
    if (isExPiloto) {
        const smlSrc = `/pilotos/SML/${cleanName}.png`;
        const shadowSrc = '/pilotos/pilotoshadow.png';
        
        const handleError = (e) => {
            if (e.target.src.includes('/SML/')) {
                e.target.src = shadowSrc;
            }
        };
        
        return <img src={smlSrc} onError={handleError} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="" />;
    }
    
    // Para pilotos ativos, buscar na pasta da temporada primeiro, depois SML, depois shadow
    const seasonSrc = `/pilotos/${gridType || 'carreira'}/s${s}/${cleanName}.png`;
    const smlSrc = `/pilotos/SML/${cleanName}.png`;
    const shadowSrc = '/pilotos/pilotoshadow.png';
    
    const handleError = (e) => {
        if (e.target.src.includes(`/s${s}/`)) {
            e.target.src = smlSrc;
        } else if (e.target.src.includes('/SML/')) {
            e.target.src = shadowSrc;
        }
    };
    
    return <img src={seasonSrc} onError={handleError} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="" />;
};

// --- TELA DE VALIDAÇÃO / ONBOARDING ---
const Onboarding = ({ session, onComplete }) => {
    const [mode, setMode] = useState('validate'); 
    const [whatsappInput, setWhatsappInput] = useState('');
    const [manualData, setManualData] = useState({ nome: '', gamertag: '', plataforma: 'Xbox', grid: 'Carreira', nomePiloto: '' });
    const [validating, setValidating] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handlePhoneChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) value = value.slice(0, 11);
        if (value.length > 2) value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
        if (value.length > 9) value = `${value.slice(0, 10)}-${value.slice(10)}`;
        setWhatsappInput(value);
    };
    const cleanPhone = (phone) => phone ? phone.replace(/\D/g, '') : '';

    const handleValidate = async () => {
        const clean = cleanPhone(whatsappInput);
        if (clean.length < 10) return setErrorMsg("WhatsApp inválido.");
        setValidating(true); setErrorMsg('');

        try {
            const csvText = await fetchWithProxy(LINK_CONTROLE);
            Papa.parse(csvText, {
                header: false, skipEmptyLines: true,
                complete: async (results) => {
                    const rows = results.data.slice(1);
                    const myEmail = session.user.email.toLowerCase().trim();
                    // NOVA ESTRUTURA - CADASTRO MLF1
                    // Coluna H (índice 7) = E-mail Login
                    // Coluna C (índice 2) = WhatsApp
                    // Coluna O (índice 14) = Nome Piloto
                    const match = rows.find(row => {
                        const sheetPhone = cleanPhone(row[2]); // Coluna C
                        const sheetEmail = (row[7] || '').toLowerCase().trim(); // Coluna H - E-mail Login
                        return sheetEmail === myEmail && sheetPhone.includes(clean);
                    });

                    if (match) {
                        const nomeOficial = match[14] || match[0]; // Coluna O (Nome Piloto) ou Coluna A (Nome Cadastrado)
                        if (!nomeOficial) { setErrorMsg("Nome de Piloto vazio na planilha."); setValidating(false); return; }
                        await saveProfile({ nome_piloto: nomeOficial, whatsapp: match[2], status: 'active' }, true);
                    } else {
                        // Se não encontrou na planilha, oferecer cadastro manual automaticamente
                        // Mudar automaticamente para o modo manual (mensagem será exibida no modo manual)
                        setMode('manual');
                        setErrorMsg(`Inscrição não encontrada na planilha para ${myEmail}. Preencha os dados abaixo para fazer seu cadastro.`);
                    }
                    setValidating(false);
                }
            });
        } catch (err) { console.error(err); setErrorMsg("Erro de conexão."); setValidating(false); }
    };

    const handleManualSubmit = async () => {
        if (!manualData.nome || !manualData.nomePiloto || cleanPhone(whatsappInput).length < 10) {
            return setErrorMsg("Preencha todos os campos obrigatórios.");
        }
        setValidating(true);
        await saveProfile({
            nome_piloto: manualData.nomePiloto, 
            whatsapp: whatsappInput,
            plataforma: manualData.plataforma, 
            grid_preferencia: manualData.grid, 
            nome: manualData.nome
            // Removido 'status' e 'gamertag' pois não existem na tabela pilotos
        }, false);
    };

    const saveProfile = async (extraData, isActive) => {
        const updates = { 
            email: session.user.email,
            nome: extraData.nome_piloto || extraData.nome, // Campo 'nome' para consistência
            whatsapp: extraData.whatsapp,
            grid: extraData.grid_preferencia || extraData.grid || 'carreira',
            equipe: null,
            is_steward: false
            // Removido 'status', 'gamertag', 'plataforma', 'created_at' e 'updated_at' pois não existem na tabela pilotos
        };
        
        console.log('💾 Salvando no banco (tabela pilotos):', updates);
        
        const { error } = await supabase.from('pilotos').upsert(updates, { onConflict: 'email' });
        if (error) { 
            console.error('❌ Erro ao salvar:', error);
            setErrorMsg('Erro ao salvar: ' + error.message); 
            setValidating(false); 
        } else { 
            console.log('✅ Salvo com sucesso!');
            isActive ? onComplete(updates) : window.location.reload(); 
        }
    };

    return (
        <div style={containerStyle}>
            <h2 style={{marginBottom:'20px', color:'var(--highlight-cyan)', textTransform:'uppercase'}}>{mode === 'validate' ? 'VALIDAR IDENTIDADE' : 'INSCRIÇÃO MANUAL'}</h2>
            {errorMsg && <div style={{background:'rgba(220,38,38,0.2)', color:'#FECACA', padding:'10px', borderRadius:'8px', marginBottom:'20px', fontSize:'0.9rem'}}>{errorMsg}</div>}
            {mode === 'validate' && (
                <>
                    <p style={{color:'#94A3B8', marginBottom:'30px'}}>Confirme seus dados para liberar o acesso. Se não encontrar sua inscrição, você pode fazer um cadastro manual.</p>
                    <div style={{textAlign:'left', marginBottom:'20px'}}><label style={labelStyle}>E-MAIL</label><input type="text" value={session.user.email} disabled style={inputDisabledStyle} /></div>
                    <div style={{textAlign:'left', marginBottom:'30px'}}><label style={labelStyle}>WHATSAPP</label><input type="text" value={whatsappInput} onChange={handlePhoneChange} placeholder="(00) 00000-0000" style={inputStyle} /></div>
                    <button onClick={handleValidate} disabled={validating} className="btn-primary" style={{width:'100%', marginBottom:'20px'}}>{validating ? 'VERIFICANDO...' : 'VALIDAR'}</button>
                    <button onClick={() => { setMode('manual'); setErrorMsg(''); }} style={{background:'transparent', border:'1px solid #64748B', color:'white', padding:'8px 16px', borderRadius:'6px', cursor:'pointer', fontSize:'0.8rem', width:'100%'}}>CADASTRO MANUAL</button>
                </>
            )}
            {mode === 'manual' && (
                <div style={{textAlign:'left', display:'flex', flexDirection:'column', gap:'15px'}}>
                    <div><label style={labelStyle}>NOME COMPLETO</label><input type="text" value={manualData.nome} onChange={e => setManualData({...manualData, nome: e.target.value})} style={inputStyle} /></div>
                    <div><label style={labelStyle}>NOME DE PILOTO (NA TRANSMISSÃO)</label><input type="text" value={manualData.nomePiloto} onChange={e => setManualData({...manualData, nomePiloto: e.target.value})} style={inputStyle} /></div>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                        <div><label style={labelStyle}>GAMERTAG</label><input type="text" value={manualData.gamertag} onChange={e => setManualData({...manualData, gamertag: e.target.value})} style={inputStyle} /></div>
                        <div><label style={labelStyle}>WHATSAPP</label><input type="text" value={whatsappInput} onChange={handlePhoneChange} style={inputStyle} /></div>
                    </div>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                        <div><label style={labelStyle}>PLATAFORMA</label><select value={manualData.plataforma} onChange={e => setManualData({...manualData, plataforma: e.target.value})} style={inputStyle}><option value="Xbox">Xbox</option><option value="PlayStation">PlayStation</option><option value="PC">PC</option></select></div>
                        <div><label style={labelStyle}>GRID</label><select value={manualData.grid} onChange={e => setManualData({...manualData, grid: e.target.value})} style={inputStyle}><option value="Carreira">Carreira</option><option value="Light">Light</option></select></div>
                    </div>
                    <button onClick={handleManualSubmit} disabled={validating} className="btn-primary" style={{width:'100%', marginTop:'10px'}}>{validating ? 'ENVIANDO...' : 'ENVIAR CADASTRO'}</button>
                    <button onClick={() => setMode('validate')} style={{background:'transparent', border:'none', color:'#64748B', fontSize:'0.8rem', width:'100%', marginTop:'10px', cursor:'pointer'}}>Cancelar</button>
                </div>
            )}
        </div>
    );
};

// --- DASHBOARD ---
function Dashboard({ isReadOnly: isReadOnlyProp = null, pilotoEmail: pilotoEmailProp = null }) {
    const navigate = useNavigate();
    const { rawCarreira, rawLight, tracks, seasons, loading: loadingData } = useLeagueData();
    
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [codIdml, setCodIdml] = useState(null); // COD IDML da planilha Pilotos PR
    const [statusPiloto, setStatusPiloto] = useState('ATIVO'); // Status da coluna J da planilha Pilotos PR
    const [historiaPiloto, setHistoriaPiloto] = useState(null); // Dados históricos do piloto da planilha Pilotos PR
    const [statsAdicionais, setStatsAdicionais] = useState(null); // Estatísticas adicionais calculadas
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [dashData, setDashData] = useState(null);
    const [acusacoesPendentes, setAcusacoesPendentes] = useState(0);

    const get2FAKey = (email) => `ml_pilot_2fa_ok:${(email || '').toLowerCase().trim()}`;

    // Função para capitalizar primeira letra de cada palavra
    const capitalizeWords = (str) => {
        if (!str) return '';
        return str
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    // Função para calcular estatísticas adicionais do piloto
    const calcularEstatisticasAdicionais = (nomePiloto, rawCarreira, rawLight) => {
        if (!nomePiloto || !rawCarreira || !rawLight) return null;
        
        const stats = {
            campeonatos: [], // [{ grid: 'carreira'|'light', temporada: number }]
            equipeMaisRepresentada: null, // { nome: string, corridas: number }
            totalVoltasRapidas: 0,
            totalCorridas: 0,
            totalTemporadas: new Set()
        };
        
        // Agrupar dados por temporada e grid para calcular campeonatos
        const pontosPorTemporada = {}; // { 'carreira-5': { [nome]: pontos }, 'light-5': { ... } }
        const equipesPorPiloto = {}; // { [equipe]: corridas }
        const voltasRapidasPorCorrida = {}; // { 'carreira-5-R01': { melhor: tempo, piloto: nome } }
        
        // Processar dados de Carreira e Light
        // IMPORTANTE: Processar TODOS os pilotos para calcular campeonatos corretamente
        [rawCarreira, rawLight].forEach((data, gridIndex) => {
            const grid = gridIndex === 0 ? 'carreira' : 'light';
            
            data.forEach(row => {
                const driverName = row[9];
                if (!driverName || driverName === '-') return;
                
                const season = parseInt(row[3]);
                const round = row[4] || '';
                const team = (row[10] || '').trim();
                const fastestLap = (row[11] || '').trim();
                const racePos = parseInt(row[8]) || 0;
                
                // Calcular pontos para TODOS os pilotos (necessário para determinar campeão)
                const key = `${grid}-${season}`;
                if (!pontosPorTemporada[key]) pontosPorTemporada[key] = {};
                if (!pontosPorTemporada[key][driverName]) pontosPorTemporada[key][driverName] = 0;
                
                let points = parseFloat((row[15] || '0').replace(',', '.'));
                if (isNaN(points)) points = 0;
                pontosPorTemporada[key][driverName] += points;
                
                // Se for o piloto atual, contar suas estatísticas
                if (driverName === nomePiloto) {
                    // Contar corridas
                    stats.totalCorridas++;
                    stats.totalTemporadas.add(season);
                    
                    // Contar equipes
                    if (team && team !== '-' && team !== '') {
                        if (!equipesPorPiloto[team]) equipesPorPiloto[team] = 0;
                        equipesPorPiloto[team]++;
                    }
                }
                
                // Processar voltas rápidas (para todos os pilotos)
                if (fastestLap && fastestLap.length > 4 && !fastestLap.includes('-')) {
                    const raceKey = `${grid}-${season}-${round}`;
                    if (!voltasRapidasPorCorrida[raceKey]) {
                        voltasRapidasPorCorrida[raceKey] = { melhor: Infinity, piloto: null };
                    }
                    
                    // Converter tempo para milissegundos (formato MM:SS.mmm)
                    const timeToMs = (timeStr) => {
                        const parts = timeStr.split(':');
                        if (parts.length !== 2) return Infinity;
                        const [min, sec] = parts.map(p => parseFloat(p.replace(',', '.')));
                        if (isNaN(min) || isNaN(sec)) return Infinity;
                        return (min * 60 + sec) * 1000;
                    };
                    
                    const ms = timeToMs(fastestLap);
                    if (ms < voltasRapidasPorCorrida[raceKey].melhor) {
                        voltasRapidasPorCorrida[raceKey] = { melhor: ms, piloto: driverName };
                    }
                }
            });
        });
        
        // Calcular campeonatos (quem teve mais pontos em cada temporada/grid)
        Object.keys(pontosPorTemporada).forEach(key => {
            const [grid, season] = key.split('-');
            const pontos = pontosPorTemporada[key];
            const maxPontos = Math.max(...Object.values(pontos));
            const campeao = Object.keys(pontos).find(nome => pontos[nome] === maxPontos);
            
            if (campeao === nomePiloto) {
                stats.campeonatos.push({ grid, temporada: parseInt(season) });
            }
        });
        
        // Contar voltas rápidas (quem teve o melhor tempo em cada corrida)
        Object.values(voltasRapidasPorCorrida).forEach(race => {
            if (race.piloto === nomePiloto) {
                stats.totalVoltasRapidas++;
            }
        });
        
        // Encontrar equipe mais representada
        const equipesOrdenadas = Object.entries(equipesPorPiloto)
            .sort((a, b) => b[1] - a[1]);
        
        if (equipesOrdenadas.length > 0) {
            stats.equipeMaisRepresentada = {
                nome: equipesOrdenadas[0][0],
                corridas: equipesOrdenadas[0][1]
            };
        }
        
        return stats;
    };

    // Função para gerar resumo da história do piloto
    const gerarResumoHistoria = (dados, nomePiloto, statsAdicionais = null, temporadaAtual = null) => {
        if (!dados || !nomePiloto) return '';
        
        const {
            primeiraTemporada,
            gridEntrada,
            primeiraCorrida,
            ultimaTemporada,
            gridDespedida,
            ultimaCorrida,
            status,
            dataEstreia,
            dataSaida
        } = dados;
        
        // Formatar data (se estiver no formato correto)
        const formatarData = (dataStr) => {
            if (!dataStr) return '';
            // Se já estiver formatada, retornar como está
            if (dataStr.includes('/')) return dataStr;
            // Tentar parsear se for uma data ISO ou outro formato
            try {
                const data = new Date(dataStr);
                if (!isNaN(data.getTime())) {
                    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                }
            } catch (e) {
                // Se não conseguir parsear, retornar como está
            }
            return dataStr;
        };
        
        const nomeCapitalizado = capitalizeWords(nomePiloto);
        const dataEstreiaFormatada = formatarData(dataEstreia);
        const dataSaidaFormatada = formatarData(dataSaida);
        
        // Verificar se a data de estreia é 30/12/99 (piloto ainda não estreou)
        const isEstreiaFutura = dataEstreia && (
            dataEstreia.includes('30/12/99') || 
            dataEstreia.includes('30-12-99') ||
            dataEstreia === '30/12/99' ||
            dataEstreia === '30-12-99' ||
            dataEstreiaFormatada === '30/12/1999' ||
            dataEstreiaFormatada === '30/12/99'
        );
        
        // Se for estreia futura, retornar mensagem simples
        if (isEstreiaFutura) {
            // Usar temporada mais recente disponível ou próxima temporada
            // Se tiver temporadaAtual, usar ela (já é a mais recente), senão usar 20 como padrão
            const temporadaEstreia = temporadaAtual || 20;
            return `${nomeCapitalizado} irá estrear na Liga na Temporada ${temporadaEstreia}.`;
        }
        
        let resumo = `${nomeCapitalizado} `;
        
        // Se tem data de estreia, usar ela
        if (dataEstreiaFormatada) {
            resumo += `entrou na liga no dia ${dataEstreiaFormatada}`;
        } else if (primeiraTemporada) {
            resumo += `entrou na liga na Temporada ${primeiraTemporada}`;
        } else {
            resumo += `entrou na liga`;
        }
        
        // Grid de entrada
        if (gridEntrada) {
            const gridFormatado = gridEntrada.toLowerCase() === 'carreira' ? 'Grid Carreira' : 
                                 gridEntrada.toLowerCase() === 'light' ? 'Grid Light' : 
                                 capitalizeWords(gridEntrada);
            resumo += ` no ${gridFormatado}`;
        }
        
        // Primeira corrida
        if (primeiraCorrida) {
            resumo += `, na ${primeiraCorrida}ª etapa`;
        }
        
        // Última temporada e despedida
        if (ultimaTemporada && ultimaTemporada !== primeiraTemporada) {
            resumo += ` e correu até a Temporada ${ultimaTemporada}`;
            
            if (gridDespedida && gridDespedida !== gridEntrada) {
                const gridDespedidaFormatado = gridDespedida.toLowerCase() === 'carreira' ? 'Grid Carreira' : 
                                               gridDespedida.toLowerCase() === 'light' ? 'Grid Light' : 
                                               capitalizeWords(gridDespedida);
                resumo += ` no ${gridDespedidaFormatado}`;
            }
            
            if (ultimaCorrida) {
                resumo += `, encerrando sua participação na ${ultimaCorrida}ª etapa`;
            }
            
            if (dataSaidaFormatada) {
                resumo += ` em ${dataSaidaFormatada}`;
            }
        } else if (primeiraTemporada) {
            resumo += ` na Temporada ${primeiraTemporada}`;
        }
        
        // Adicionar informações de estatísticas adicionais
        if (statsAdicionais) {
            // Melhor resultado (campeonato)
            if (statsAdicionais.campeonatos.length > 0) {
                const campeonato = statsAdicionais.campeonatos[0]; // Pegar o primeiro (ou mais recente)
                const gridNome = campeonato.grid === 'carreira' ? 'Grid Carreira' : 'Grid Light';
                resumo += `. ${nomeCapitalizado} foi campeão do ${gridNome} na Temporada ${campeonato.temporada}`;
                if (statsAdicionais.campeonatos.length > 1) {
                    resumo += ` e conquistou mais ${statsAdicionais.campeonatos.length - 1} título${statsAdicionais.campeonatos.length - 1 > 1 ? 's' : ''}`;
                }
            }
            
            // Equipe mais representada
            if (statsAdicionais.equipeMaisRepresentada) {
                resumo += `. A equipe que ${nomeCapitalizado} mais representou foi a ${capitalizeWords(statsAdicionais.equipeMaisRepresentada.nome)}`;
            }
            
            // Voltas rápidas
            if (statsAdicionais.totalVoltasRapidas > 0) {
                resumo += `. Ao todo ele tem ${statsAdicionais.totalVoltasRapidas} volta${statsAdicionais.totalVoltasRapidas > 1 ? 's' : ''} rápida${statsAdicionais.totalVoltasRapidas > 1 ? 's' : ''}`;
            }
            
            // Total de corridas e temporadas
            if (statsAdicionais.totalCorridas > 0) {
                resumo += ` e já participou ao todo de ${statsAdicionais.totalCorridas} corrida${statsAdicionais.totalCorridas > 1 ? 's' : ''}`;
                if (statsAdicionais.totalTemporadas.size > 0) {
                    resumo += ` ao longo de ${statsAdicionais.totalTemporadas.size} temporada${statsAdicionais.totalTemporadas.size > 1 ? 's' : ''}`;
                }
            }
        }
        
        // Status atual
        if (status === 'INATIVO') {
            resumo += `. Atualmente está inativo na liga.`;
        } else if (status === 'ATIVO') {
            resumo += `. Atualmente está ativo e participará da Temporada 20.`;
        } else {
            resumo += `.`;
        }
        
        return resumo;
    };

    // Função para buscar COD IDML (primeiro no Supabase, depois na planilha se necessário)
    const buscarCodIdml = async (nomePiloto, emailPiloto) => {
        if (!nomePiloto || !emailPiloto) return;
        
        try {
            console.log('🔍 Buscando COD IDML para:', nomePiloto);
            
            // 1. Primeiro, tentar buscar no Supabase
            const { data: pilotoData, error: supabaseError } = await supabase
                .from('pilotos')
                .select('cod_idml')
                .eq('email', emailPiloto.toLowerCase().trim())
                .single();
            
            let codIdmlEncontrado = false;
            if (!supabaseError && pilotoData?.cod_idml) {
                console.log('✅ COD IDML encontrado no Supabase:', pilotoData.cod_idml);
                setCodIdml(pilotoData.cod_idml);
                codIdmlEncontrado = true;
            }
            
            // 2. Buscar na planilha (sempre buscar status, e COD IDML se não encontrou no Supabase)
            console.log('🔍 Buscando na planilha Pilotos PR (Status sempre da planilha)...');
            const csvText = await fetchWithProxy(LINK_PILOTOS_PR);
            
            Papa.parse(csvText, {
                header: false,
                skipEmptyLines: true,
                complete: async (results) => {
                    const rows = results.data;
                    if (rows.length < 2) {
                        console.warn('⚠️ Planilha Pilotos PR vazia ou sem dados');
                        return;
                    }
                    
                    // Cabeçalho: Drivers (coluna A, índice 0), COD IDML (coluna B, índice 1)
                    // Buscar pelo nome do piloto (normalizar para comparação - remover acentos e espaços extras)
                    const normalizarNome = (nome) => {
                        return nome
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
                            .trim()
                            .toLowerCase()
                            .replace(/\s+/g, ' '); // Normaliza espaços
                    };
                    
                    const nomeNormalizado = normalizarNome(nomePiloto);
                    console.log('🔍 Nome normalizado para busca:', nomeNormalizado);
                    
                    // Listar primeiros nomes da planilha para debug
                    const primeirosNomes = rows.slice(1, 6).map((row, idx) => ({
                        original: row[0] || '',
                        normalizado: normalizarNome(row[0] || ''),
                        codIdml: row[1] || ''
                    }));
                    console.log('📋 Primeiros 5 nomes da planilha:', primeirosNomes);
                    
                    // Busca exata primeiro
                    let match = rows.find((row, index) => {
                        if (index === 0) return false; // Pular cabeçalho
                        const driverName = normalizarNome(row[0] || '');
                        return driverName === nomeNormalizado;
                    });
                    
                    // Se não encontrou exato, tentar busca parcial (contém)
                    if (!match) {
                        console.log('🔍 Busca exata falhou. Tentando busca parcial...');
                        match = rows.find((row, index) => {
                            if (index === 0) return false;
                            const driverName = normalizarNome(row[0] || '');
                            // Verifica se o nome normalizado está contido no nome da planilha ou vice-versa
                            return driverName.includes(nomeNormalizado) || nomeNormalizado.includes(driverName);
                        });
                    }
                    
                    if (match) {
                        // Buscar COD IDML (coluna B, índice 1) se não encontrou no Supabase
                        if (match[1]) {
                            const codIdmlValue = match[1].trim();
                            console.log('✅ COD IDML encontrado na planilha:', codIdmlValue, 'para o nome:', match[0]);
                            setCodIdml(codIdmlValue);
                            
                            // 3. Salvar no Supabase para próximas buscas
                            console.log('💾 Tentando salvar COD IDML no Supabase...');
                            const { error: updateError } = await supabase
                                .from('pilotos')
                                .update({ cod_idml: codIdmlValue })
                                .eq('email', emailPiloto.toLowerCase().trim());
                            
                            if (updateError) {
                                console.error('❌ Erro ao salvar COD IDML no Supabase:', updateError);
                            } else {
                                console.log('✅ COD IDML salvo no Supabase com sucesso');
                            }
                        }
                        
                        // Buscar Status (coluna J, índice 9)
                        const statusValue = (match[9] || '').trim().toUpperCase();
                        if (statusValue) {
                            console.log('✅ Status encontrado na planilha:', statusValue, 'para o nome:', match[0]);
                            setStatusPiloto(statusValue === 'INATIVO' ? 'INATIVO' : 'ATIVO');
                        } else {
                            console.warn('⚠️ Status não encontrado na coluna J. Usando padrão ATIVO.');
                            setStatusPiloto('ATIVO');
                        }
                        
                        // Buscar dados históricos do piloto
                        // C = primeira temporada (índice 2), D = grid entrada (índice 3), E = primeira corrida (índice 4)
                        // F = última temporada (índice 5), G = grid despedida (índice 6), H = última corrida (índice 7)
                        // J = status (índice 9), K = data estreia (índice 10), L = data saída (índice 11)
                        const dadosHistoria = {
                            primeiraTemporada: (match[2] || '').trim(),
                            gridEntrada: (match[3] || '').trim(),
                            primeiraCorrida: (match[4] || '').trim(),
                            ultimaTemporada: (match[5] || '').trim(),
                            gridDespedida: (match[6] || '').trim(),
                            ultimaCorrida: (match[7] || '').trim(),
                            status: statusValue,
                            dataEstreia: (match[10] || '').trim(),
                            dataSaida: (match[11] || '').trim()
                        };
                        
                        console.log('📚 Dados históricos encontrados:', dadosHistoria);
                        setHistoriaPiloto(dadosHistoria);
                    } else {
                        console.warn('⚠️ Piloto não encontrado na planilha para:', nomePiloto);
                        console.warn('📋 Total de linhas na planilha:', rows.length);
                        console.warn('🔍 Nome procurado (normalizado):', nomeNormalizado);
                        setCodIdml(null);
                        setStatusPiloto('ATIVO'); // Padrão se não encontrou
                        setHistoriaPiloto(null);
                    }
                },
                error: (error) => {
                    console.error('❌ Erro ao parsear planilha Pilotos PR:', error);
                }
            });
        } catch (err) {
            console.error('❌ Erro ao buscar COD IDML:', err);
        }
    };

    useEffect(() => {
        // Modo narrador: pular toda verificação de sessão e buscar diretamente
        if (pilotoEmailProp) {
            console.log('🎙️ Modo narrador ativado para:', pilotoEmailProp);
            setLoadingAuth(false);
            return;
        }

        // Verificar se é ex-piloto via sessionStorage
        const exPilotoSession = sessionStorage.getItem('ex_piloto_session');
        if (exPilotoSession) {
            try {
                const exPilotoData = JSON.parse(exPilotoSession);
                // Verificar se a sessão não expirou (24 horas)
                if (Date.now() - exPilotoData.timestamp < 24 * 60 * 60 * 1000) {
                    console.log('✅ Sessão de ex-piloto encontrada:', exPilotoData.email);
                    // Buscar dados do ex-piloto no Supabase
                    supabase.from('pilotos')
                        .select('*')
                        .eq('email', exPilotoData.email)
                        .eq('tipo_piloto', 'ex-piloto')
                        .single()
                        .then(({ data, error }) => {
                            if (!error && data && data.status === 'ativo') {
                                setProfile(data);
                                setSession({ user: { email: data.email } }); // Sessão mock para ex-piloto
                                buscarCodIdml(data.nome, data.email);
                                setLoadingAuth(false);
                                // Ex-piloto logado, não redirecionar
                                return;
                            } else {
                                // Sessão inválida ou piloto não aprovado
                                sessionStorage.removeItem('ex_piloto_session');
                                setLoadingAuth(false);
                                navigate('/dashboard/escolher-tipo');
                                return;
                            }
                        });
                    return; // Não continuar com verificação de sessão normal
                } else {
                    // Sessão expirada
                    sessionStorage.removeItem('ex_piloto_session');
                }
            } catch (err) {
                console.error('Erro ao parsear sessão ex-piloto:', err);
                sessionStorage.removeItem('ex_piloto_session');
            }
        }

        // Verificar sessão inicial (pilotos ativos)
        supabase.auth.getSession().then(({ data: { session } }) => {
            console.log('🔍 Dashboard - Sessão inicial:', session ? 'Encontrada' : 'Não encontrada');
            setSession(session);
            if (!session) {
                console.log('⚠️ Nenhuma sessão encontrada. Redirecionando para escolha de tipo...');
                setLoadingAuth(false);
                navigate('/dashboard/escolher-tipo');
                return;
            }

            // Se tem sessão, verificar 2FA
            const has2FA = localStorage.getItem(get2FAKey(session.user?.email)) === 'true';
            if (!has2FA) {
                console.log('⚠️ Sessão ativa mas 2FA não validado. Redirecionando para escolha de tipo...');
                setLoadingAuth(false);
                navigate('/dashboard/escolher-tipo');
                return;
            }

            // Se tem sessão E 2FA validado, continuar no dashboard (não redirecionar)
            console.log('✅ Sessão válida e 2FA validado. Continuando no dashboard...');
        });
        
        // Listener para mudanças de autenticação
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔄 Dashboard - Auth state changed:', event, session ? 'Sessão ativa' : 'Sem sessão');
            setSession(session);
            if (!session && event === 'SIGNED_OUT') {
                console.log('🚪 Usuário deslogado. Redirecionando para escolha de tipo...');
                setLoadingAuth(false);
                navigate('/dashboard/escolher-tipo');
            } else if (session) {
                console.log('✅ Sessão ativa no Dashboard');

                const has2FA = localStorage.getItem(get2FAKey(session.user?.email)) === 'true';
                if (!has2FA) {
                    console.log('⚠️ Sessão ativa mas 2FA não validado. Redirecionando para escolha de tipo...');
                    setLoadingAuth(false);
                    navigate('/dashboard/escolher-tipo');
                }
            }
        });
        
        return () => subscription.unsubscribe();
    }, [navigate, pilotoEmailProp]);

    useEffect(() => {
        // Modo narrador: usar email fornecido diretamente
        const emailParaBuscar = pilotoEmailProp || session?.user?.email;
        if (!emailParaBuscar) return;
        
        let isMounted = true;
        console.log('🔍 Buscando piloto na tabela pilotos para:', emailParaBuscar);
        setLoadingAuth(true);
        
        supabase.from('pilotos').select('*').eq('email', emailParaBuscar.toLowerCase()).single()
            .then(({ data, error }) => {
                if (!isMounted) return;
                
                if (error) {
                    console.error('❌ Erro ao buscar piloto:', error);
                    // Se o erro for "not found", pode ser que o piloto ainda não foi salvo
                    if (error.code === 'PGRST116') {
                        console.log('⚠️ Piloto não encontrado no banco ainda. Aguardando...');
                        // Aguardar 2 segundos e tentar novamente (apenas uma vez)
                        setTimeout(() => {
                            if (!isMounted) return;
                            const emailRetry = pilotoEmailProp || session?.user?.email;
                            if (!emailRetry) return;
                            supabase.from('pilotos').select('*').eq('email', emailRetry.toLowerCase()).single()
                                .then(({ data: retryData, error: retryError }) => {
                                    if (!isMounted) return;
                                    if (retryData) {
                                        console.log('✅ Piloto encontrado na segunda tentativa:', retryData);
                                        setProfile(retryData);
                                    } else {
                                        console.log('⚠️ Piloto ainda não encontrado após retry');
                                    }
                                    setLoadingAuth(false);
                                });
                        }, 2000);
                        return;
                    }
                    setLoadingAuth(false);
                    return;
                }
                
                if (data) {
                    console.log('✅ Piloto encontrado:', data);
                    setProfile(data);
                    // Buscar COD IDML (primeiro no Supabase, depois na planilha se necessário)
                    buscarCodIdml(data.nome, data.email);
                    // O Login.jsx já garante que o piloto validou o código antes de redirecionar aqui
                    // Então não precisamos verificar WhatsApp novamente
                } else {
                    console.log('⚠️ Piloto não encontrado no banco. Redirecionando para escolha de tipo...');
                    navigate('/dashboard/escolher-tipo');
                }
                
                setLoadingAuth(false);
            });
        
        return () => {
            isMounted = false;
        };
    }, [session?.user?.email, pilotoEmailProp]); // Incluído pilotoEmailProp para modo narrador

    // Buscar acusações pendentes
    useEffect(() => {
        const buscarAcusacoesPendentes = async () => {
            if (!profile?.nome) return;
            
            try {
                const { data, error } = await supabase
                    .from('notificacoes_admin')
                    .select('dados')
                    .eq('tipo', 'nova_acusacao');
                
                if (error) {
                    console.error('Erro ao buscar acusações:', error);
                    return;
                }
                
                const acusacoesSemDefesa = (data || []).filter(notif => {
                    const dados = notif.dados || {};
                    const acusado = dados.acusado || {};
                    const temDefesa = dados.defesa != null;
                    return acusado.nome?.toUpperCase() === profile.nome?.toUpperCase() && !temDefesa;
                });
                
                setAcusacoesPendentes(acusacoesSemDefesa.length);
            } catch (err) {
                console.error('Erro:', err);
            }
        };
        
        buscarAcusacoesPendentes();
    }, [profile]);

    // Processamento - usar ref para evitar loops
    const processedRef = useRef(false);
    const lastPilotNameRef = useRef(null);
    
    // Resetar refs quando o piloto mudar
    useEffect(() => {
        if (profile?.nome && lastPilotNameRef.current !== profile.nome) {
            processedRef.current = false;
        }
    }, [profile?.nome]);
    
    useEffect(() => {
        // Só processar se tiver todos os dados necessários
        if (!profile?.nome || loadingData || !rawCarreira || !rawLight || rawCarreira.length === 0 || rawLight.length === 0) {
            return;
        }
        
        const pilotName = profile.nome;
        
        // Evitar reprocessar se já foi processado para o mesmo piloto
        if (processedRef.current && lastPilotNameRef.current === pilotName) {
            return;
        }
        
        console.log('✅ Processando estatísticas para:', pilotName);
        
        const calcStats = (data) => {
            let s = { races:0, wins:0, poles:0, podiums:0, best:999, seasons: new Set(), currentPoints: 0, racesList: [] };
            data.forEach(row => {
                if (row[9] === pilotName) {
                    s.races++; s.seasons.add(row[3]);
                    const q = parseInt(row[6]); const r = parseInt(row[8]);
                    if (q===1) s.poles++; if (r===1) s.wins++; if (r<=3) s.podiums++;
                    if (r>0 && r<s.best) s.best = r;
                    let p = parseFloat((row[15]||'0').replace(',', '.'));
                    if(!isNaN(p)) s.currentPoints += p;
                    // Incluir posição de chegada e pontos
                    s.racesList.push({ 
                        round: parseInt(row[4]), 
                        points: p,
                        position: r > 0 ? r : null // Posição de chegada (row[8])
                    });
                }
            });
            return s;
        };

        const sCarreira = calcStats(rawCarreira);
        const sLight = calcStats(rawLight);

        let maxS = 0, grid='carreira', team='Sem Equipe';
        const check = (row, g) => {
            if(row[9]===pilotName) {
                const s = parseInt(row[3]);
                if (s > maxS || (s === maxS && g === 'carreira')) { maxS = s; grid = g; team = row[10]; }
            }
        };
        rawCarreira.forEach(r => check(r, 'carreira'));
        rawLight.forEach(r => check(r, 'light'));

        // Filtrar dados apenas da temporada mais recente para o gráfico
        const targetGridData = grid === 'carreira' ? rawCarreira : rawLight;
        const currentSeasonRaces = targetGridData
            .filter(row => row[9] === pilotName && parseInt(row[3]) === maxS)
            .map(row => {
                const gpName = (row[5] || '').trim();
                const normalizedGP = gpName ? gpName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase() : '';
                const trackData = tracks[normalizedGP] || {};
                
                return {
                    round: parseInt(row[4]),
                    position: parseInt(row[8]) > 0 ? parseInt(row[8]) : null,
                    gpName: gpName,
                    flag: trackData.flag || null,
                    countryAbbr: getCountryAbbreviation(gpName)
                };
            })
            .filter(r => r.position !== null) // Filtrar apenas corridas com posição válida
            .sort((a, b) => a.round - b.round) // Ordenar por round
            .map(r => ({
                name: `R${r.round}`,
                position: r.position,
                gpName: r.gpName,
                flag: r.flag,
                countryAbbr: r.countryAbbr
            }));

        const chartData = currentSeasonRaces;

        console.log('📊 Estatísticas calculadas:', { currentGrid: grid, currentSeason: maxS, currentTeam: team });
        setDashData({ currentGrid: grid, currentSeason: maxS, currentTeam: team, statsCarreira: sCarreira, statsLight: sLight, chartData });
        
        // Calcular estatísticas adicionais para a bio
        const stats = calcularEstatisticasAdicionais(pilotName, rawCarreira, rawLight);
        setStatsAdicionais(stats);
        console.log('📈 Estatísticas adicionais calculadas:', stats);
        
        processedRef.current = true;
        lastPilotNameRef.current = pilotName;
    }, [profile?.nome, loadingData, rawCarreira?.length, rawLight?.length]); // Usar apenas length para detectar quando dados são carregados

    const handleLogout = async () => {
        // Aviso de confirmação antes de fazer logout
        const confirmMessage = `⚠️ ATENÇÃO: SAIR DO SISTEMA\n\nAo clicar em "Sair", você estará fazendo logout do sistema.\n\nVocê precisará se cadastrar novamente para acessar o painel.\n\nTem certeza que deseja sair?`;
        
        if (!window.confirm(confirmMessage)) {
            console.log('🚪 Logout cancelado pelo usuário');
            return; // Usuário cancelou, não fazer logout
        }

        try {
            console.log('🚪 Fazendo logout...');
            // Limpar flag local de 2FA (para exigir validação no próximo login)
            if (session?.user?.email) {
                localStorage.removeItem(get2FAKey(session.user.email));
            }
            
            // Limpar sessão de ex-piloto se existir
            sessionStorage.removeItem('ex_piloto_session');
            
            await supabase.auth.signOut();
            // Limpar qualquer cache/localStorage se necessário
            // Redirecionar para escolha de tipo após logout
            navigate('/dashboard/escolher-tipo');
            // Recarregar a página para garantir que tudo seja limpo
            window.location.reload();
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            // Mesmo com erro, tentar redirecionar e recarregar
            navigate('/dashboard/escolher-tipo');
            window.location.reload();
        }
    };

    if (loadingAuth || loadingData) return <div style={{color:'white', padding:'100px', textAlign:'center'}}>Carregando...</div>;
    if (!session) return null;

    // STATUS PENDENTE - simplificar verificação
    if (profile?.status === 'pending') {
        return (
            <div style={containerStyle}>
                <div style={{fontSize:'4rem', marginBottom:'20px'}}>⏳</div>
                <h2 style={{color:'var(--highlight-cyan)', marginBottom:'10px'}}>SOLICITAÇÃO EM ANÁLISE</h2>
                <p style={{color:'#CBD5E1', lineHeight:'1.6'}}>Seus dados foram enviados para a diretoria.<br/>Aguarde a liberação.</p>
                <button onClick={handleLogout} className="btn-outline" style={{marginTop:'20px', borderColor:'#EF4444', color:'#EF4444'}}>SAIR</button>
            </div>
        );
    }

    if (!profile || !profile.nome) {
        console.log('⚠️ Sem profile ou nome, mostrando Onboarding');
        return <div style={{paddingTop:'70px'}}><Onboarding session={session} onComplete={(newP) => setProfile(newP)} /></div>;
    }
    
    if (!dashData) {
        console.log('⏳ Aguardando dashData...');
        return <div style={{color:'white', padding:'50px', textAlign:'center'}}>Bem-vindo! Carregando estatísticas...</div>;
    }

    console.log('✅ Renderizando Dashboard completo');

    // Verificar se é ex-piloto
    const isExPiloto = profile?.tipo_piloto === 'ex-piloto' || profile?.status === 'inativo';
    const isReadOnly = isReadOnlyProp !== null ? isReadOnlyProp : isExPiloto; // Modo narrador ou ex-pilotos têm acesso somente leitura

    // RENDERIZAÇÃO DO PAINEL
    const teamColor = getTeamColor(dashData.currentTeam);
    const teamGradient = getTeamGradient(dashData.currentTeam);
    const teamLogo = getTeamLogo(dashData.currentTeam);
    const teamWallpaper = getTeamWallpaper(dashData.currentTeam);
    const totalWins = dashData.statsCarreira.wins + dashData.statsLight.wins;
    const totalPodiums = dashData.statsCarreira.podiums + dashData.statsLight.podiums;
    const totalSeasons = dashData.statsCarreira.seasons.size + dashData.statsLight.seasons.size;

    return (
        <div className="page-wrapper">
            <div className="dashboard-hero" style={{
                backgroundImage: `linear-gradient(to bottom, ${teamColor}99 0%, ${teamColor}40 50%, #0F172A 100%), url('${teamWallpaper}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundBlendMode: 'overlay',
                backgroundAttachment: 'fixed'
            }}>
                <div className="dashboard-hero-content">
                    <div>
                        <h1 style={{fontSize:'2.5rem', fontStyle:'italic', fontWeight:'900', textTransform:'uppercase', margin:0, lineHeight:1}}>COCKPIT</h1>
                        <div style={{color: 'rgba(255,255,255,0.8)', fontWeight: '700', letterSpacing: '2px', marginTop:'5px', textTransform:'uppercase', display: 'flex', alignItems: 'center', gap: '10px'}}>
                            {teamLogo && <img src={teamLogo} alt="" style={{height: '25px', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))'}} />}
                            {dashData.currentTeam}
                        </div>
                    </div>
                    <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                        <Link to="/" className="btn-outline" style={{fontSize:'0.8rem', padding:'8px 20px', textDecoration:'none'}}>SITE</Link>
                        <button 
                            onClick={handleLogout} 
                            className="btn-outline" 
                            style={{
                                fontSize:'0.8rem', 
                                padding:'8px 20px', 
                                borderColor:'#EF4444', 
                                color:'#EF4444',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                background: 'transparent'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = 'rgba(239, 68, 68, 0.1)';
                                e.target.style.borderColor = '#DC2626';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'transparent';
                                e.target.style.borderColor = '#EF4444';
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                            SAIR
                        </button>
                    </div>
                </div>
            </div>

            <div className="dashboard-container">
                <div className="dashboard-main-grid">
                    {/* LICENÇA */}
                    <div className="license-card" style={{background: teamGradient}}>
                        {teamLogo && <div className="lc-watermark" style={{backgroundImage: `url(${teamLogo})`}}></div>}
                        <div className="lc-content-wrapper">
                            <div className="lc-left-col">
                                <div className="lc-header">
                                    SUPER LICENÇA VIRTUAL 
                                    <span 
                                        className="lc-status" 
                                        style={statusPiloto === 'INATIVO' ? {
                                            background: '#EF4444',
                                            color: '#E2E8F0'
                                        } : {}}
                                    >
                                        {statusPiloto}
                                    </span>
                                </div>

                                <div className="lc-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                                        <div className="lc-photo-box" style={{borderColor: teamColor}}>
                                            <DriverImage name={profile.nome} gridType={dashData.currentGrid} season={dashData.currentSeason} isExPiloto={isExPiloto} />
                                        </div>
                                        <div className="lc-info">
                                            <div className="lc-label">PILOTO</div>
                                            <div className="lc-name">{capitalizeWords(profile.nome)}</div>
                                            <div className="lc-team" style={{color: teamColor}}>{dashData.currentTeam}</div>
                                            <div className="lc-details-row">
                                                <div><div className="lc-label">LICENÇA MLF1</div><div className="lc-value">{codIdml || 'N/A'}</div></div>
                                                <div><div className="lc-label">Pontos</div><div className="lc-value" style={{color:'#22C55E'}}>0 pts</div></div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Botões de Análise - Lado Direito */}
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px',
                                        marginLeft: 'auto'
                                    }}>
                                        <button 
                                            className="btn-analise btn-acusacao"
                                            onClick={() => !isReadOnly && navigate('/acusacao')}
                                            disabled={isReadOnly}
                                            style={{
                                                opacity: isReadOnly ? 0.5 : 1,
                                                cursor: isReadOnly ? 'not-allowed' : 'pointer',
                                                padding: '10px 20px',
                                                background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontWeight: '700',
                                                fontSize: '0.8rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                transition: 'all 0.2s ease',
                                                width: '170px',
                                                height: '40px',
                                                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.transform = 'translateY(-2px)';
                                                e.target.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.5)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.transform = 'translateY(0)';
                                                e.target.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.4)';
                                            }}
                                            onMouseDown={(e) => {
                                                e.target.style.transform = 'translateY(1px) scale(0.98)';
                                            }}
                                            onMouseUp={(e) => {
                                                e.target.style.transform = 'translateY(-2px)';
                                            }}
                                        >
                                            ⚖️ Enviar Acusação
                                        </button>
                                        
                                        {/* Botão de Defesa com Badge de Notificações */}
                                        <div style={{ position: 'relative', width: '170px', height: '40px' }}>
                                            {acusacoesPendentes > 0 && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '-8px',
                                                    right: '-8px',
                                                    background: '#EF4444',
                                                    color: 'white',
                                                    borderRadius: '50%',
                                                    width: '22px',
                                                    height: '22px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '11px',
                                                    fontWeight: 'bold',
                                                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.5)',
                                                    zIndex: 10,
                                                    animation: 'pulse 2s infinite'
                                                }}>
                                                    {acusacoesPendentes}
                                                </div>
                                            )}
                                            <button 
                                                className="btn-analise btn-defesa"
                                                onClick={() => !isReadOnly && navigate('/defesa')}
                                                disabled={isReadOnly}
                                                style={{
                                                    opacity: isReadOnly ? 0.5 : 1,
                                                    cursor: isReadOnly ? 'not-allowed' : 'pointer',
                                                    padding: '10px 20px',
                                                    background: acusacoesPendentes > 0 
                                                        ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' 
                                                        : 'linear-gradient(135deg, #22C55E 0%, #15803D 100%)',
                                                    color: 'white',
                                                    border: acusacoesPendentes > 0 ? '2px solid #EF4444' : 'none',
                                                    borderRadius: '6px',
                                                    fontWeight: '700',
                                                    fontSize: '0.8rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    transition: 'all 0.2s ease',
                                                    width: '100%',
                                                    height: '100%',
                                                    boxShadow: acusacoesPendentes > 0 
                                                        ? '0 4px 15px rgba(245, 158, 11, 0.5)' 
                                                        : '0 4px 15px rgba(34, 197, 94, 0.4)',
                                                    cursor: 'pointer',
                                                    boxSizing: 'border-box'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                }}
                                            >
                                                🛡️ {acusacoesPendentes > 0 ? 'Defender-se!' : 'Enviar Defesa'}
                                            </button>
                                        </div>
                                        <button 
                                            className="btn-analise btn-consulta"
                                            onClick={() => !isReadOnly && navigate('/analises?tab=consulta')}
                                            disabled={isReadOnly}
                                            style={{
                                                opacity: isReadOnly ? 0.5 : 1,
                                                cursor: isReadOnly ? 'not-allowed' : 'pointer',
                                                padding: '10px 20px',
                                                background: 'linear-gradient(135deg, #06B6D4 0%, #0E7490 100%)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontWeight: '700',
                                                fontSize: '0.8rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                transition: 'all 0.2s ease',
                                                width: '170px',
                                                height: '40px',
                                                boxShadow: '0 4px 15px rgba(6, 182, 212, 0.4)',
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.transform = 'translateY(-2px)';
                                                e.target.style.boxShadow = '0 6px 20px rgba(6, 182, 212, 0.5)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.transform = 'translateY(0)';
                                                e.target.style.boxShadow = '0 4px 15px rgba(6, 182, 212, 0.4)';
                                            }}
                                            onMouseDown={(e) => {
                                                e.target.style.transform = 'translateY(1px) scale(0.98)';
                                            }}
                                            onMouseUp={(e) => {
                                                e.target.style.transform = 'translateY(-2px)';
                                            }}
                                        >
                                            📋 Consultar Análise
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="lc-fia-bg">FIA</div>
                    </div>

                    {/* RESUMO */}
                    <div className="career-summary-card">
                        <h3>RESUMO DA CARREIRA</h3>
                        <div className="csc-grid">
                            <div className="csc-item"><div className="csc-val">{totalWins}</div><div className="csc-lbl">VITÓRIAS</div></div>
                            <div className="csc-item"><div className="csc-val">{totalPodiums}</div><div className="csc-lbl">PÓDIOS</div></div>
                            <div className="csc-item"><div className="csc-val">{totalSeasons}</div><div className="csc-lbl">TEMPORADAS</div></div>
                        </div>
                    </div>
                </div>

                {/* RESUMO DA HISTÓRIA DO PILOTO - Abaixo do card do piloto */}
                {historiaPiloto && gerarResumoHistoria(historiaPiloto, profile.nome, statsAdicionais, dashData?.currentSeason) && (
                    <div style={{
                        background: 'rgba(15, 23, 42, 0.8)',
                        backdropFilter: 'blur(15px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '20px',
                        padding: '25px',
                        marginBottom: '40px',
                        boxShadow: '0 15px 40px rgba(0,0,0,0.4)',
                        width: '100%'
                    }}>
                        <h3 style={{
                            fontSize: '0.9rem',
                            color: '#94A3B8',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            marginBottom: '15px',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            paddingBottom: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            📜 BIOGRAFIA MASTER LEAGUE F1
                        </h3>
                        <p style={{
                            color: '#E2E8F0',
                            lineHeight: '1.8',
                            fontSize: '1rem',
                            fontStyle: 'italic',
                            margin: 0
                        }}>
                                {gerarResumoHistoria(historiaPiloto, profile.nome, statsAdicionais, dashData?.currentSeason)}
                        </p>
                    </div>
                )}
                
                {/* GRÁFICO DE POSIÇÕES */}
                {dashData.chartData && dashData.chartData.length > 0 && (
                    <div style={{background:'#1E293B', borderRadius:'16px', padding:'25px', border:'1px solid rgba(255,255,255,0.05)', marginBottom:'40px'}}>
                        <h3 style={{fontSize:'1rem', color:'white', marginBottom:'20px', textTransform:'uppercase', fontStyle:'italic'}}>POSIÇÕES DE CHEGADA (S{dashData.currentSeason})</h3>
                        <div style={{width:'100%', height: 280}}>
                             <ResponsiveContainer>
                                <LineChart data={dashData.chartData} margin={{ top: 20, right: 5, left: 5, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis 
                                        dataKey="name" 
                                        stroke="transparent" 
                                        tick={{fontSize: 0, fill: 'transparent'}}
                                        tickLine={{stroke: 'transparent'}}
                                        axisLine={{stroke: 'transparent'}}
                                        height={0}
                                    />
                                    <YAxis 
                                        stroke="#64748B" 
                                        tick={{fontSize: 12}} 
                                        reversed={true}
                                        domain={[1, 20]}
                                        label={{ value: 'Posição', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#64748B' } }}
                                    />
                                    <Tooltip 
                                        contentStyle={{backgroundColor:'#0F172A', border:`1px solid ${teamColor}`, borderRadius:'8px', color:'white'}}
                                        formatter={(value, name, props) => {
                                            const gpName = props.payload.gpName;
                                            return [
                                                <div key="tooltip">
                                                    <div style={{fontWeight: 'bold', marginBottom: '4px'}}>{gpName || props.payload.name}</div>
                                                    <div>{value}º lugar</div>
                                                </div>
                                            ];
                                        }}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="position" 
                                        stroke={teamColor} 
                                        strokeWidth={3} 
                                        dot={{ fill: teamColor, r: 5 }}
                                        activeDot={{ r: 7 }}
                                        label={{ 
                                            fill: teamColor, 
                                            fontSize: 13, 
                                            fontWeight: 'bold',
                                            formatter: (value) => `${value}º`,
                                            position: 'top',
                                            offset: 10
                                        }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                            {/* Bandeiras e abreviações abaixo do gráfico - centralizadas com as etapas */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-around',
                                alignItems: 'flex-start',
                                marginTop: '8px',
                                paddingTop: '8px',
                                width: '100%',
                                position: 'relative'
                            }}>
                                {dashData.chartData?.map((d, idx) => {
                                    // Calcular posição percentual para centralizar com os pontos do gráfico
                                    const totalItems = dashData.chartData.length;
                                    const leftPercent = totalItems > 1 ? (idx / (totalItems - 1)) * 100 : 50;
                                    
                                    return (
                                        <div 
                                            key={idx} 
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '3px',
                                                position: 'absolute',
                                                left: `${leftPercent}%`,
                                                transform: 'translateX(-50%)',
                                                minWidth: '50px'
                                            }}
                                        >
                                            {d.flag && (
                                                <img 
                                                    src={d.flag} 
                                                    alt={d.gpName || d.name}
                                                    style={{
                                                        width: '26px',
                                                        height: '20px',
                                                        objectFit: 'cover',
                                                        borderRadius: '3px',
                                                        border: '1px solid rgba(255,255,255,0.2)',
                                                        marginBottom: '1px'
                                                    }}
                                                />
                                            )}
                                            <span style={{
                                                fontSize: '10px',
                                                color: '#94A3B8',
                                                textAlign: 'center',
                                                fontWeight: '700',
                                                letterSpacing: '0.5px'
                                            }}>
                                                {d.name}
                                            </span>
                                            {d.countryAbbr && (
                                                <span style={{
                                                    fontSize: '9px',
                                                    color: '#64748B',
                                                    textAlign: 'center',
                                                    fontWeight: '600',
                                                    letterSpacing: '0.5px'
                                                }}>
                                                    {d.countryAbbr}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* STATS CARREIRA */}
                <h3 className="stats-section-title" style={{color: 'var(--carreira-wine)', borderColor: 'var(--carreira-wine)'}}>GRID CARREIRA</h3>
                {dashData.statsCarreira.races > 0 ? (
                    <div className="stats-row-cockpit">
                        <StatCard label="CORRIDAS" value={dashData.statsCarreira.races} />
                        <StatCard label="VITÓRIAS" value={dashData.statsCarreira.wins} color="#FFD700" />
                        <StatCard label="POLES" value={dashData.statsCarreira.poles} color="#A855F7" />
                        <StatCard label="PÓDIOS" value={dashData.statsCarreira.podiums} />
                        <StatCard label="MELHOR RES." value={dashData.statsCarreira.best === 999 ? '-' : `${dashData.statsCarreira.best}º`} />
                    </div>
                ) : <div className="no-data-box">Sem histórico no Grid Carreira.</div>}

                {/* STATS LIGHT */}
                <h3 className="stats-section-title" style={{marginTop:'40px', color: 'var(--light-blue)', borderColor: 'var(--light-blue)'}}>GRID LIGHT</h3>
                {dashData.statsLight.races > 0 ? (
                    <div className="stats-row-cockpit">
                        <StatCard label="CORRIDAS" value={dashData.statsLight.races} />
                        <StatCard label="VITÓRIAS" value={dashData.statsLight.wins} color="#FFD700" />
                        <StatCard label="POLES" value={dashData.statsLight.poles} color="#A855F7" />
                        <StatCard label="PÓDIOS" value={dashData.statsLight.podiums} />
                        <StatCard label="MELHOR RES." value={dashData.statsLight.best === 999 ? '-' : `${dashData.statsLight.best}º`} />
                    </div>
                ) : <div className="no-data-box">Sem histórico no Grid Light.</div>}
            </div>
        </div>
    );
}

const StatCard = ({ label, value, color = 'white' }) => <div className="cockpit-stat-box"><div className="csb-value" style={{color}}>{value}</div><div className="csb-label">{label}</div></div>;
const containerStyle = { maxWidth:'500px', margin:'50px auto', background:'#1E293B', padding:'40px', borderRadius:'20px', textAlign:'center', border:'1px solid rgba(255,255,255,0.1)' };
const labelStyle = { display:'block', color:'#CBD5E1', fontSize:'0.7rem', fontWeight:'700', marginBottom:'5px', textTransform:'uppercase' };
const inputStyle = { width:'100%', padding:'12px', background:'#0F172A', color:'white', border:'1px solid var(--highlight-cyan)', borderRadius:'8px', fontSize:'1rem', outline:'none' };
const inputDisabledStyle = { ...inputStyle, color:'#64748B', border:'1px solid #334155', cursor:'not-allowed' };

export default Dashboard;