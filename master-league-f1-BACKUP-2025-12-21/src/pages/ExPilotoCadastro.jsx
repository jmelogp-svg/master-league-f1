import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { requestVerificationCode, verifyCode, cleanWhatsAppNumber } from '../utils/whatsappAuth';
import Papa from 'papaparse';
import '../index.css';

// Pilotos PR (gid=884534812) - Para buscar nomes de pilotos e histórico
const PILOTOS_PR_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=884534812&single=true&output=csv';

const fetchWithProxy = async (url) => {
    const proxyUrl = "https://corsproxy.io/?";
    const response = await fetch(proxyUrl + encodeURIComponent(url));
    return response.text();
};

function ExPilotoCadastro() {
    const navigate = useNavigate();
    const [step, setStep] = useState('formulario'); // 'formulario', 'whatsapp', 'codigo', 'senha', 'sucesso'
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    
    // Dados do formulário
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        whatsapp: '',
        plataforma: 'Xbox',
        grid: 'Carreira',
        gamertag: '', // Gamertag/ID do piloto
        nomePilotoHistorico: '' // Nome do piloto da coluna A (Drivers) da planilha Pilotos PR
    });
    
    // Nomes de pilotos da planilha
    const [nomesPilotos, setNomesPilotos] = useState([]);
    const [historicoPiloto, setHistoricoPiloto] = useState(null);
    const [loadingNomes, setLoadingNomes] = useState(true);
    
    // Validação WhatsApp
    const [codeInput, setCodeInput] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);
    const [verifyingCode, setVerifyingCode] = useState(false);
    
    // Estado para finalizar cadastro
    const [criandoSenha, setCriandoSenha] = useState(false);

    // Carregar nomes de pilotos da planilha Pilotos PR
    useEffect(() => {
        const carregarNomesPilotos = async () => {
            try {
                setLoadingNomes(true);
                const csvText = await fetchWithProxy(PILOTOS_PR_CSV_URL);
                
                Papa.parse(csvText, {
                    header: false,
                    skipEmptyLines: true,
                    complete: (results) => {
                        const rows = results.data;
                        if (rows.length < 2) {
                            console.warn('⚠️ Planilha Pilotos PR vazia');
                            setNomesPilotos([]);
                            setLoadingNomes(false);
                            return;
                        }
                        
                        // Coluna A (0) = Drivers (Nome do Piloto)
                        // Coluna J (9) = Status (INATIVO = ex-piloto)
                        const nomesList = [];
                        for (let i = 1; i < rows.length; i++) {
                            const driverName = (rows[i][0] || '').trim();
                            const status = (rows[i][9] || '').trim().toUpperCase(); // Coluna J = Status
                            
                            // Apenas incluir pilotos com status "INATIVO"
                            if (driverName && status === 'INATIVO') {
                                nomesList.push({
                                    nome: driverName,
                                    codIdml: (rows[i][1] || '').trim(), // Coluna B = COD IDML
                                    firstSeason: (rows[i][2] || '').trim(), // Coluna C
                                    firstGrid: (rows[i][3] || '').trim(), // Coluna D
                                    firstRace: (rows[i][4] || '').trim(), // Coluna E
                                    lastSeason: (rows[i][5] || '').trim(), // Coluna F
                                    lastGrid: (rows[i][6] || '').trim(), // Coluna G
                                    lastRace: (rows[i][7] || '').trim(), // Coluna H
                                    status: status // Coluna J = Status
                                });
                            }
                        }
                        
                        // Ordenar alfabeticamente por nome
                        nomesList.sort((a, b) => {
                            const nomeA = a.nome.toLowerCase().trim();
                            const nomeB = b.nome.toLowerCase().trim();
                            return nomeA.localeCompare(nomeB, 'pt-BR');
                        });
                        
                        setNomesPilotos(nomesList);
                        console.log(`✅ ${nomesList.length} ex-pilotos (INATIVO) carregados da planilha (ordenados alfabeticamente)`);
                        setLoadingNomes(false);
                    },
                    error: (error) => {
                        console.error('❌ Erro ao parsear planilha:', error);
                        setNomesPilotos([]);
                        setLoadingNomes(false);
                    }
                });
            } catch (err) {
                console.error('❌ Erro ao carregar nomes de pilotos:', err);
                setNomesPilotos([]);
                setLoadingNomes(false);
            }
        };
        
        carregarNomesPilotos();
    }, []);

    // Quando selecionar nome do piloto, carregar histórico
    const handleNomePilotoChange = (e) => {
        const selectedNome = e.target.value;
        setFormData({ ...formData, nomePilotoHistorico: selectedNome });
        
        if (selectedNome) {
            const historico = nomesPilotos.find(p => p.nome === selectedNome);
            setHistoricoPiloto(historico);
            console.log('📊 Histórico do piloto:', historico);
        } else {
            setHistoricoPiloto(null);
        }
    };

    const formatWhatsApp = (value) => {
        let cleaned = value.replace(/\D/g, '');
        if (cleaned.length > 11) cleaned = cleaned.slice(0, 11);
        if (cleaned.length > 2) cleaned = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
        if (cleaned.length > 10) cleaned = `${cleaned.slice(0, 10)}-${cleaned.slice(10)}`;
        return cleaned;
    };

    const handleWhatsAppChange = (e) => {
        setFormData({ ...formData, whatsapp: formatWhatsApp(e.target.value) });
    };

    // Enviar código WhatsApp
    const handleSendCode = async () => {
        if (!formData.whatsapp || cleanWhatsAppNumber(formData.whatsapp).length < 10) {
            setErrorMsg('⚠️ WhatsApp inválido! Deve ter pelo menos 10 dígitos.');
            return;
        }

        setSendingCode(true);
        setErrorMsg('');

        try {
            const whatsappLimpo = cleanWhatsAppNumber(formData.whatsapp);
            const nomePiloto = formData.nome || formData.gamertag;
            
            // Para ex-pilotos em cadastro, não verificar se existe no banco ainda
            const result = await requestVerificationCode(
                formData.email,
                whatsappLimpo,
                nomePiloto,
                true // skipPilotoCheck = true para cadastros novos
            );

            if (result.success) {
                setCodeSent(true);
                setStep('codigo');
                setSendingCode(false);
            } else {
                setErrorMsg(result.error || 'Erro ao enviar código. Tente novamente.');
                setSendingCode(false);
            }
        } catch (err) {
            console.error('Erro ao enviar código:', err);
            setErrorMsg('Erro ao enviar código. Tente novamente.');
            setSendingCode(false);
        }
    };

    // Validar código WhatsApp
    const handleVerifyCode = async () => {
        if (!codeInput || codeInput.length !== 6) {
            setErrorMsg('⚠️ Digite o código de 6 dígitos');
            return;
        }

        setVerifyingCode(true);
        setErrorMsg('');

        try {
            const result = await verifyCode(formData.email, codeInput);

            if (result.success) {
                console.log('✅ Código validado com sucesso');
                // Após validar código, salvar dados sem senha e ir para sucesso
                await handleFinalizarCadastro();
            } else {
                setErrorMsg(result.error || 'Código inválido. Tente novamente.');
            }
        } catch (err) {
            console.error('Erro ao validar código:', err);
            setErrorMsg('Erro ao validar código. Tente novamente.');
        } finally {
            setVerifyingCode(false);
        }
    };

    // Finalizar cadastro (sem senha - será criada após aprovação)
    const handleFinalizarCadastro = async () => {
        setCriandoSenha(true);
        setErrorMsg('');

        try {
            // Salvar dados do ex-piloto no Supabase (sem senha_hash - será criada após aprovação)
            const dadosExPiloto = {
                email: formData.email.toLowerCase().trim(),
                nome: formData.nome.trim(),
                whatsapp: cleanWhatsAppNumber(formData.whatsapp),
                grid: formData.grid.toLowerCase(),
                gamertag: formData.gamertag || null, // Gamertag/ID do piloto
                nome_piloto_historico: formData.nomePilotoHistorico, // Nome do piloto da coluna A (Drivers)
                tipo_piloto: 'ex-piloto',
                status: 'pendente', // Aguardando aprovação do admin
                senha_hash: null, // Senha será criada após aprovação
                cod_idml: historicoPiloto?.codIdml || null
            };

            const { data, error } = await supabase
                .from('pilotos')
                .upsert(dadosExPiloto, { onConflict: 'email' })
                .select()
                .single();

            if (error) {
                throw new Error(error.message);
            }

            console.log('✅ Ex-piloto cadastrado com sucesso (aguardando aprovação):', data);
            setStep('sucesso');
        } catch (err) {
            console.error('Erro ao finalizar cadastro:', err);
            setErrorMsg('Erro ao finalizar cadastro: ' + err.message);
        } finally {
            setCriandoSenha(false);
        }
    };

    // Função para hash de senha (simples - em produção usar bcrypt)
    const hashPassword = async (password) => {
        // Usar Web Crypto API para hash
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    };

    // Renderizar formulário
    if (step === 'formulario') {
        return (
            <div className="page-wrapper">
                <div className="login-section">
                    <div className="login-card" style={{ maxWidth: '600px' }}>
                        <h1 style={{ color: 'var(--highlight-cyan)', marginBottom: '10px' }}>
                            📜 CADASTRO EX-PILOTO
                        </h1>
                        <p className="login-subtitle" style={{ marginBottom: '30px' }}>
                            Preencha seus dados para solicitar acesso ao painel histórico
                        </p>

                        {errorMsg && (
                            <div style={{
                                background: 'rgba(220, 38, 38, 0.2)',
                                color: '#FECACA',
                                padding: '12px',
                                borderRadius: '8px',
                                marginBottom: '20px',
                                fontSize: '0.9rem'
                            }}>
                                {errorMsg}
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', color: '#CBD5E1' }}>
                                    NOME COMPLETO *
                                </label>
                                <input
                                    type="text"
                                    value={formData.nome}
                                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '6px',
                                        border: '1px solid #475569',
                                        background: '#1E293B',
                                        color: 'white'
                                    }}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', color: '#CBD5E1' }}>
                                    E-MAIL *
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '6px',
                                        border: '1px solid #475569',
                                        background: '#1E293B',
                                        color: 'white'
                                    }}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', color: '#CBD5E1' }}>
                                    NOME DO PILOTO (HISTÓRICO) *
                                </label>
                                {loadingNomes ? (
                                    <div style={{ color: '#94A3B8', padding: '12px' }}>
                                        Carregando nomes de pilotos...
                                    </div>
                                ) : (
                                    <select
                                        value={formData.nomePilotoHistorico}
                                        onChange={handleNomePilotoChange}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#1E293B',
                                            color: 'white'
                                        }}
                                        required
                                    >
                                        <option value="">Selecione seu nome histórico</option>
                                        {nomesPilotos.map((p, idx) => (
                                            <option key={idx} value={p.nome}>
                                                {p.nome} {p.codIdml ? `(${p.codIdml})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {historicoPiloto && (
                                <div style={{
                                    background: 'rgba(6, 182, 212, 0.1)',
                                    border: '1px solid rgba(6, 182, 212, 0.3)',
                                    borderRadius: '8px',
                                    padding: '15px',
                                    marginTop: '10px'
                                }}>
                                    <div style={{ color: 'var(--highlight-cyan)', marginBottom: '10px', fontWeight: 'bold' }}>
                                        📊 Histórico Encontrado:
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: '#CBD5E1', lineHeight: '1.6' }}>
                                        <div>COD IDML: {historicoPiloto.codIdml || 'N/A'}</div>
                                        <div>Primeira Temporada: {historicoPiloto.firstSeason || 'N/A'}</div>
                                        <div>Primeiro Grid: {historicoPiloto.firstGrid || 'N/A'}</div>
                                        <div>Última Temporada: {historicoPiloto.lastSeason || 'N/A'}</div>
                                        <div>Último Grid: {historicoPiloto.lastGrid || 'N/A'}</div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', color: '#CBD5E1' }}>
                                    GAMERTAG / ID *
                                </label>
                                <input
                                    type="text"
                                    value={formData.gamertag}
                                    onChange={(e) => setFormData({ ...formData, gamertag: e.target.value })}
                                    placeholder="Digite sua gamertag ou ID"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '6px',
                                        border: '1px solid #475569',
                                        background: '#1E293B',
                                        color: 'white'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', color: '#CBD5E1' }}>
                                        PLATAFORMA
                                    </label>
                                    <select
                                        value={formData.plataforma}
                                        onChange={(e) => setFormData({ ...formData, plataforma: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#1E293B',
                                            color: 'white'
                                        }}
                                    >
                                        <option value="Xbox">Xbox</option>
                                        <option value="PlayStation">PlayStation</option>
                                        <option value="PC">PC</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', color: '#CBD5E1' }}>
                                        GRID
                                    </label>
                                    <select
                                        value={formData.grid}
                                        onChange={(e) => setFormData({ ...formData, grid: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '6px',
                                            border: '1px solid #475569',
                                            background: '#1E293B',
                                            color: 'white'
                                        }}
                                    >
                                        <option value="Carreira">Carreira</option>
                                        <option value="Light">Light</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', color: '#CBD5E1' }}>
                                    WHATSAPP *
                                </label>
                                <input
                                    type="text"
                                    value={formData.whatsapp}
                                    onChange={handleWhatsAppChange}
                                    placeholder="(00) 00000-0000"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '6px',
                                        border: '1px solid #475569',
                                        background: '#1E293B',
                                        color: 'white'
                                    }}
                                    required
                                />
                            </div>

                            <button
                                onClick={() => {
                                    // Validar campos obrigatórios
                                    if (!formData.nome || !formData.email || !formData.whatsapp || !formData.gamertag || !formData.nomePilotoHistorico) {
                                        setErrorMsg('⚠️ Preencha todos os campos obrigatórios');
                                        return;
                                    }
                                    if (!formData.email.includes('@')) {
                                        setErrorMsg('⚠️ E-mail inválido');
                                        return;
                                    }
                                    handleSendCode();
                                }}
                                disabled={sendingCode || loadingNomes}
                                className="btn-primary"
                                style={{ width: '100%', marginTop: '10px' }}
                            >
                                {sendingCode ? 'ENVIANDO CÓDIGO...' : 'ENVIAR CÓDIGO WHATSAPP'}
                            </button>

                            <button
                                onClick={() => navigate('/dashboard/escolher-tipo')}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid #64748B',
                                    color: '#94A3B8',
                                    padding: '10px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem'
                                }}
                            >
                                ← Voltar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Renderizar validação de código
    if (step === 'codigo') {
        return (
            <div className="page-wrapper">
                <div className="login-section">
                    <div className="login-card" style={{ maxWidth: '400px' }}>
                        <h1 style={{ color: 'var(--highlight-cyan)', marginBottom: '10px' }}>
                            📱 VALIDAR CÓDIGO
                        </h1>
                        <p className="login-subtitle" style={{ marginBottom: '30px' }}>
                            Digite o código de 6 dígitos enviado para<br/>
                            <strong>{formData.whatsapp}</strong>
                        </p>

                        {errorMsg && (
                            <div style={{
                                background: 'rgba(220, 38, 38, 0.2)',
                                color: '#FECACA',
                                padding: '12px',
                                borderRadius: '8px',
                                marginBottom: '20px',
                                fontSize: '0.9rem'
                            }}>
                                {errorMsg}
                            </div>
                        )}

                        <input
                            type="text"
                            value={codeInput}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setCodeInput(value);
                            }}
                            placeholder="000000"
                            maxLength={6}
                            style={{
                                width: '100%',
                                padding: '15px',
                                fontSize: '1.5rem',
                                textAlign: 'center',
                                letterSpacing: '10px',
                                borderRadius: '6px',
                                border: '1px solid #475569',
                                background: '#1E293B',
                                color: 'white',
                                marginBottom: '20px'
                            }}
                            autoFocus
                        />

                        <button
                            onClick={handleVerifyCode}
                            disabled={verifyingCode || codeInput.length !== 6}
                            className="btn-primary"
                            style={{ width: '100%', marginBottom: '15px' }}
                        >
                            {verifyingCode ? 'VALIDANDO...' : 'VALIDAR CÓDIGO'}
                        </button>

                        <button
                            onClick={() => setStep('formulario')}
                            style={{
                                background: 'transparent',
                                border: '1px solid #64748B',
                                color: '#94A3B8',
                                padding: '10px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                width: '100%'
                            }}
                        >
                            ← Voltar
                        </button>
                    </div>
                </div>
            </div>
        );
    }


    // Renderizar sucesso
    if (step === 'sucesso') {
        return (
            <div className="page-wrapper">
                <div className="login-section">
                    <div className="login-card" style={{ maxWidth: '500px', textAlign: 'center' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>⏳</div>
                        <h1 style={{ color: 'var(--highlight-cyan)', marginBottom: '10px' }}>
                            SOLICITAÇÃO ENVIADA
                        </h1>
                        <p style={{ color: '#CBD5E1', lineHeight: '1.6', marginBottom: '30px' }}>
                            Sua solicitação de acesso foi enviada para análise.<br/>
                            Você receberá uma notificação no WhatsApp quando seu acesso for liberado.
                        </p>
                        <button
                            onClick={() => navigate('/')}
                            className="btn-primary"
                            style={{ width: '100%' }}
                        >
                            VOLTAR AO INÍCIO
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}

export default ExPilotoCadastro;

