import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
    Trophy,
    UserCheck,
    Activity,
    Target,
    History,
    AlertTriangle,
    XCircle,
    Info,
    CheckCircle,
    CalendarDays,
    Clock11,
    Sparkles,
    Video,
    BadgeCheck,
    ShieldCheck,
    FileText,
    Users,
    Signal,
    ListOrdered,
    Search,
    Printer,
    ChevronRight,
    X,
    BookOpen,
    ChevronUp,
    Save,
    Zap,
    Gauge
} from 'lucide-react';

// ========== DADOS DO INFOGRÁFICO ==========
const pillars = [
    { id: 1, title: 'Performance', icon: <Trophy className="reg-icon" />, desc: 'Resultados na pista: velocidade, qualificação e posições finais nas corridas oficiais.' },
    { id: 2, title: 'Conduta', icon: <UserCheck className="reg-icon" />, desc: 'Presença, respostas a formulários, envio de fotos, comunicação com a liga e fair play.' },
    { id: 3, title: 'Racecraft', icon: <Activity className="reg-icon" />, desc: 'Consistência, ganho de posições limpo e posicionamento estratégico durante as disputas.' },
    { id: 4, title: 'Overall', icon: <Target className="reg-icon" />, desc: 'Cumprimento das metas contratuais e evolução ao longo da temporada com foco no objetivo da equipe.' },
    { id: 5, title: 'Histórico', icon: <History className="reg-icon" />, desc: 'Bagagem na Master League: temporadas disputadas, títulos e presença nos grids.' }
];

const infractions = [
    'Não enviar foto oficial solicitada pelo campeonato',
    'Faltar a etapas (W.O.) sem justificativa',
    'Ignorar lista de presença ou formulários obrigatórios',
    'Acúmulo de punições em análises de incidentes',
    'Usar telemetria fechada sem autorização',
    'Piloto com numeração incorreta ou alteração não comunicada',
    'Não responder vídeo de defesa quando solicitado pela comissão'
];

const heroStats = [
    { id: 1, icon: CalendarDays, title: '8 Etapas Oficiais', detail: 'Calendário divulgado em canais oficiais e grupos da liga.' },
    { id: 2, icon: Sparkles, title: '2 Corridas Sprint', detail: 'Eventos de sprint (~33%) acompanham o formato tradicional em etapas selecionadas.' },
    { id: 3, icon: Clock11, title: 'Lobby às 20:15h', detail: 'Abertura do lobby 15 minutos antes; partidas começam pontualmente.' },
    { id: 4, icon: Video, title: 'Transmissões ao vivo', detail: 'Todas as corridas terão narração e highlights oficiais da Master League F1.' }
];

const registrationHighlights = [
    { id: 1, icon: BadgeCheck, title: 'Inscrição & Taxa', desc: 'Valor anunciado pela administração antes do início da temporada; pagamento garante o vínculo e o uso da imagem (gamertag/nome/foto) em mídias oficiais.' },
    { id: 2, icon: ShieldCheck, title: 'Reservas', desc: 'Pagam a taxa integral no ato da inscrição. Períodos não disputados podem virar crédito para a próxima temporada ou reembolso ao final do campeonato.' },
    { id: 3, icon: FileText, title: 'Reembolsos', desc: 'Não há devolução após o início da temporada, expulsão por infrações ou o draft realizado para escolher equipes.' },
    { id: 4, icon: Users, title: 'Comunicação', desc: 'Presença, listas e formulários precisam ser respondidos. Concordar com este regulamento libera o uso oficial da imagem do piloto durante transmissões.' }
];

const sessionFormats = [
    { id: 1, icon: Activity, title: 'Etapa padrão', detail: 'Qualificação de 18 minutos seguida de Corrida Principal em 50% do total.' },
    { id: 2, icon: Signal, title: 'Etapa com sprint', detail: 'Qualificação one-shot, Sprint (~33%) e Corrida Principal (50%).' }
];

const lobbySteps = [
    'Lobby abre 15 minutos antes da largada oficial (20:15h).',
    'Convites saem apenas pelos hosts; pilotos entram pelo perfil do host ou de outros pilotos na mesma plataforma.',
    'Convites diretos só funcionam com contas EA vinculadas.',
    'Responder à lista de presença é obrigatório; ausência gera perda de Pontos de Conduta.'
];

// ========== CALENDÁRIO DA TEMPORADA ==========
const calendarData = [
    { etapa: 1, modelo: 'Qualy 18"', dataCarreira: '15/01/26', circuito: 'Abu Dhabi', pais: 'AE', flag: '🇦🇪' },
    { etapa: 2, modelo: 'Qualy 18"', dataCarreira: '22/01/26', circuito: 'Áustria', pais: 'AT', flag: '🇦🇹' },
    { etapa: 3, modelo: 'Sprint', dataCarreira: '29/01/26', circuito: 'Texas', pais: 'US', flag: '🇺🇸' },
    { etapa: 4, modelo: 'Qualy 18"', dataCarreira: '05/02/26', circuito: 'Espanha', pais: 'ES', flag: '🇪🇸' },
    { etapa: 5, modelo: 'Qualy 18"', dataCarreira: '12/02/26', circuito: 'Catar', pais: 'QA', flag: '🇶🇦' },
    { etapa: 6, modelo: 'Sprint', dataCarreira: '26/02/26', circuito: 'México', pais: 'MX', flag: '🇲🇽' },
    { etapa: 7, modelo: 'Qualy 18"', dataCarreira: '05/03/26', circuito: 'Austrália', pais: 'AU', flag: '🇦🇺' },
    { etapa: 8, modelo: 'Qualy 18"', dataCarreira: '12/03/26', circuito: 'China', pais: 'CN', flag: '🇨🇳' }
];

// Função para calcular data do Grid Light (3 dias antes)
// Mapeamento dos links das bandeiras por circuito
// Mapeamento do nome do circuito e mapa da pista
const circuitInfo = {
    "Abu Dhabi": {
        nome: "Yas Marina Circuit",
        mapa: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/YasMarina.png",
        bandeira: "https://media.formula1.com/image/upload/f_auto/q_auto/v1677249475/content/dam/fom-website/manual/Flags/AE.png"
    },
    "Áustria": {
        nome: "Red Bull Ring",
        mapa: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/Austria.png",
        bandeira: "https://media.formula1.com/image/upload/f_auto/q_auto/v1677249475/content/dam/fom-website/manual/Flags/AT.png"
    },
    "Texas": {
        nome: "Circuit of The Americas",
        mapa: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/Austin.png",
        bandeira: "https://media.formula1.com/image/upload/f_auto/q_auto/v1677249475/content/dam/fom-website/manual/Flags/US.png"
    },
    "Espanha": {
        nome: "Circuit de Barcelona-Catalunya",
        mapa: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/Spain.png",
        bandeira: "https://media.formula1.com/image/upload/f_auto/q_auto/v1677249475/content/dam/fom-website/manual/Flags/ES.png"
    },
    "Catar": {
        nome: "Losail International Circuit",
        mapa: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/Qatar.png",
        bandeira: "https://media.formula1.com/image/upload/f_auto/q_auto/v1677249475/content/dam/fom-website/manual/Flags/QA.png"
    },
    "México": {
        nome: "Autódromo Hermanos Rodríguez",
        mapa: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/Mexico.png",
        bandeira: "https://media.formula1.com/image/upload/f_auto/q_auto/v1677249475/content/dam/fom-website/manual/Flags/MX.png"
    },
    "Austrália": {
        nome: "Albert Park Circuit",
        mapa: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/Australia.png",
        bandeira: "https://media.formula1.com/image/upload/f_auto/q_auto/v1677249475/content/dam/fom-website/manual/Flags/AU.png"
    },
    "China": {
        nome: "Shanghai International Circuit",
        mapa: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%202016/China.png",
        bandeira: "https://media.formula1.com/image/upload/f_auto/q_auto/v1677249475/content/dam/fom-website/manual/Flags/CN.png"
    }
};
const flagsByCircuit = {
    "Abu Dhabi": "https://media.formula1.com/image/upload/f_auto/q_auto/v1677249475/content/dam/fom-website/manual/Flags/AE.png",
    "Áustria": "https://media.formula1.com/image/upload/f_auto/q_auto/v1677249475/content/dam/fom-website/manual/Flags/AT.png",
    "Texas": "https://media.formula1.com/image/upload/f_auto/q_auto/v1677249475/content/dam/fom-website/manual/Flags/US.png",
    "Espanha": "https://media.formula1.com/image/upload/f_auto/q_auto/v1677249475/content/dam/fom-website/manual/Flags/ES.png",
    "Catar": "https://media.formula1.com/image/upload/f_auto/q_auto/v1677249475/content/dam/fom-website/manual/Flags/QA.png",
    "México": "https://media.formula1.com/image/upload/f_auto/q_auto/v1677249475/content/dam/fom-website/manual/Flags/MX.png",
    "Austrália": "https://media.formula1.com/image/upload/f_auto/q_auto/v1677249475/content/dam/fom-website/manual/Flags/AU.png",
    "China": "https://media.formula1.com/image/upload/f_auto/q_auto/v1677249475/content/dam/fom-website/manual/Flags/CN.png"
};
const calcLightDate = (carreiraDate) => {
    const [day, month, year] = carreiraDate.split('/');
    const date = new Date(2000 + parseInt(year), parseInt(month) - 1, parseInt(day));
    date.setDate(date.getDate() - 3);
    const newDay = String(date.getDate()).padStart(2, '0');
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    const newYear = String(date.getFullYear()).slice(-2);
    return `${newDay}/${newMonth}/${newYear}`;
};

const technicalRules = [
    { id: 1, title: 'Desempenho', detail: 'Grid Light trabalha com performance igual; Grid Carreira roda com performance real.' },
    { id: 2, title: 'Setup & Assistências', detail: 'Setup padrão pré-definido. Traçado automático, câmbio automático e ABS/tração completos são permitidos. Pit stop e largada permanecem manuais.' },
    { id: 3, title: 'Telemetria', detail: 'Uso aberto obrigatório. Telemetria fechada gera perda automática de Pontos de Conduta.' }
];

const numberPreferences = [
    'Piloto já no grid na temporada anterior',
    'Piloto promovido do Grid Light',
    'Piloto com histórico na liga',
    'Piloto novato',
    'Administração decide em caso de empate'
];

const scoringMain = [
    { pos: '1º', pts: 25 }, { pos: '2º', pts: 18 }, { pos: '3º', pts: 15 }, { pos: '4º', pts: 12 }, { pos: '5º', pts: 10 },
    { pos: '6º', pts: 8 }, { pos: '7º', pts: 6 }, { pos: '8º', pts: 4 }, { pos: '9º', pts: 2 }, { pos: '10º', pts: 1 }
];

const scoringSprint = [
    { pos: '1º', pts: 8 }, { pos: '2º', pts: 7 }, { pos: '3º', pts: 6 }, { pos: '4º', pts: 5 },
    { pos: '5º', pts: 4 }, { pos: '6º', pts: 3 }, { pos: '7º', pts: 2 }, { pos: '8º', pts: 1 }
];

const tiebreakers = [
    'Maior número de vitórias',
    'Maior número de segundos lugares',
    'Ordem alfabética do nome do piloto na transmissão oficial'
];

const draftPriority = [
    { title: 'Grid Carreira', items: ['Pilotos que já disputaram o Grid Carreira na temporada anterior', 'Pilotos promovidos do Grid Light', 'Pilotos com ranking histórico alto', 'Pilotos novatos em ordem alfabética'] },
    { title: 'Grid Light', items: ['Melhor pontuação na temporada anterior', 'Pilotos antigos na liga', 'Pilotos novatos em ordem alfabética'] }
];

// Promoção Obrigatória do Grid Light
const promotionRule = {
    title: 'Promoção Obrigatória',
    description: 'Os 3 primeiros colocados do Grid Light ao final da temporada NÃO poderão mais competir nesse grid. Deverão obrigatoriamente seguir para o Grid Carreira na temporada seguinte.'
};

// Reservas
const reserveRule = {
    title: 'Reservas',
    description: 'O piloto reserva ocupa a vaga quando o titular não confirma presença. Deve aceitar o carro de menor performance disponível. Pontos conquistados pelo reserva são computados normalmente.'
};

const penaltyScale = [
    { label: 'Advertência', points: '0 pts', detail: 'Aviso oficial na carteira.' },
    { label: 'Leve', points: '5 pts', detail: 'Primeiro aviso com peso menor.' },
    { label: 'Média', points: '10 pts', detail: 'Requer atenção da comissão.' },
    { label: 'Grave', points: '15 pts', detail: 'Impacta draft e reputação.' },
    { label: 'Gravíssima', points: '20 pts + Race Ban', detail: 'Suspensão imediata na etapa seguinte.' }
];

const penaltyAggravations = [
    'Incidentes na largada (até volta 2)',
    'Incidentes na última volta',
    'Incidentes durante ou logo após Safety Car',
    'Reincidência ou omissão de informações para a comissão'
];

const analysisSteps = [
    { label: 'Solicitação', detail: 'Via site/app até as 20h do dia seguinte à corrida.' },
    { label: 'Defesa', detail: 'Até 24h após notificação com vídeo onboard hospedado externamente (YouTube, Twitch, etc.).' },
    { label: 'Consequências', detail: 'Ausência de defesa gera perda de Pontos de Conduta e punição leve (+5 pts) sem presumir culpa.' }
];

// ========== DADOS DE BUSCA DO INFOGRÁFICO ==========
const infographicSections = [
    { id: 'info-hero', elementId: 'info-hero', title: 'Visão Geral da Temporada', keywords: ['etapa', 'sprint', 'lobby', 'transmissão', '8 etapas', '20:15'] },
    { id: 'info-inscricao', elementId: 'info-inscricao', title: 'Inscrição & Valores', keywords: ['inscrição', 'taxa', 'pagamento', 'reserva', 'reembolso', 'comunicação'] },
    { id: 'info-calendario', elementId: 'info-calendario', title: 'Calendário & Lobby', keywords: ['calendário', 'lobby', 'horário', 'segunda', 'quinta', 'presença', 'host', 'formato', 'qualificação', 'sprint', 'corrida', 'one-shot', '50%', '33%', 'abu dhabi', 'áustria', 'texas', 'espanha', 'catar', 'méxico', 'austrália', 'china', 'circuito', 'etapa 1', 'etapa 2', 'etapa 3', 'etapa 4', 'etapa 5', 'etapa 6', 'etapa 7', 'etapa 8', 'janeiro', 'fevereiro', 'março'] },
    { id: 'info-tecnico', elementId: 'info-tecnico', title: 'Regras Técnicas & Numeração', keywords: ['setup', 'assistência', 'telemetria', 'performance', 'câmbio', 'abs', 'tração', 'numeração', 'número'] },
    { id: 'info-pontuacao', elementId: 'info-pontuacao', title: 'Sistema de Pontuação', keywords: ['pontuação', 'pontos', 'vitória', 'pódio', 'sprint', 'desempate'] },
    { id: 'info-draft', elementId: 'info-draft', title: 'Equipes, Draft & Reservas', keywords: ['draft', 'equipe', 'time', 'escolha', 'prioridade', 'reserva', 'promoção', 'grid light', 'grid carreira'] },
    { id: 'info-punicoes', elementId: 'info-punicoes', title: 'Sistema de Punições', keywords: ['punição', 'penalidade', 'carteira', 'suspensão', 'ban', 'advertência', 'agravante'] },
    { id: 'info-analises', elementId: 'info-analises', title: 'Análises & Defesa', keywords: ['análise', 'defesa', 'vídeo', 'incidente', 'prazo', 'solicitação'] },
    { id: 'info-ranking', elementId: 'info-ranking', title: 'Power Ranking', keywords: ['power ranking', 'ranking', 'nota', 'performance', 'conduta', 'racecraft', 'overall', 'histórico'] },
    { id: 'info-infracoes', elementId: 'info-infracoes', title: 'Infrações Críticas', keywords: ['infração', 'falta', 'wo', 'ausência', 'foto', 'formulário', 'telemetria'] }
];

// ========== DADOS DO TEXTO COMPLETO ==========
const regulamentoTexto = [
    {
        id: 'introducao',
        title: '1. Introdução',
        keywords: ['introdução', 'master league', 'temporada', 'regulamento', 'oficial'],
        content: `A Master League F1 é uma liga de automobilismo virtual competitivo, organizada em temporadas, com foco em entretenimento, profissionalismo e fair play. Este regulamento estabelece as regras oficiais para a Temporada 20 e deve ser aceito por todos os participantes no momento da inscrição.

Ao se inscrever, o piloto concorda com todas as normas aqui descritas, incluindo o uso de sua imagem (gamertag, nome e foto) em transmissões oficiais, redes sociais e materiais promocionais da liga.`
    },
    {
        id: 'inscricao',
        title: '2. Inscrição e Taxas',
        keywords: ['inscrição', 'taxa', 'pagamento', 'valor', 'reembolso', 'reserva', 'vaga'],
        content: `A taxa de inscrição é anunciada pela administração antes do início de cada temporada. O pagamento confirma a vaga e os direitos de mídia.

Pilotos reservas pagam a taxa integral no ato da inscrição. Períodos não disputados podem ser convertidos em crédito para a próxima temporada ou reembolsados ao final do campeonato, conforme critérios da administração.

Não há reembolso após:
• Início da temporada
• Expulsão por infrações
• Realização do draft de equipes`
    },
    {
        id: 'calendario',
        title: '3. Calendário e Horários',
        keywords: ['calendário', 'horário', 'etapa', 'corrida', 'segunda', 'quinta', 'lobby', '20:15'],
        content: `A temporada é composta por 8 etapas oficiais, com aproximadamente 2 corridas sprint (~33%) em etapas selecionadas.

Horários fixos:
• Grid Light: Segundas-feiras às 20:15h
• Grid Carreira: Quintas-feiras às 20:15h

O lobby abre 15 minutos antes do horário oficial. Pilotos devem confirmar presença na lista oficial e entrar pelo perfil do host ou de outros pilotos na mesma plataforma.`
    },
    {
        id: 'formato',
        title: '4. Formato das Sessões',
        keywords: ['formato', 'qualificação', 'sprint', 'corrida', 'one-shot', '50%', '33%'],
        content: `Existem dois formatos de etapa:

Etapa Padrão:
• Qualificação: 18 minutos
• Corrida Principal: 50% da distância total

Etapa com Sprint:
• Qualificação: One-shot (uma volta rápida)
• Corrida Sprint: ~33% da distância
• Corrida Principal: 50% da distância`
    },
    {
        id: 'pontuacao',
        title: '5. Sistema de Pontuação',
        keywords: ['pontuação', 'pontos', 'vitória', 'pódio', 'sprint', 'desempate'],
        content: `A pontuação segue o sistema oficial da FIA para a Corrida Principal, com escala reduzida para a Sprint.`,
        tables: [
            {
                title: 'Corrida Principal',
                headers: ['Posição', 'Pontos'],
                rows: scoringMain.map(s => [s.pos, s.pts])
            },
            {
                title: 'Corrida Sprint',
                headers: ['Posição', 'Pontos'],
                rows: scoringSprint.map(s => [s.pos, s.pts])
            }
        ],
        extra: `Critérios de Desempate:
1. Maior número de vitórias
2. Maior número de segundos lugares
3. Ordem alfabética do nome do piloto na transmissão oficial`
    },
    {
        id: 'tecnico',
        title: '6. Configurações Técnicas',
        keywords: ['setup', 'assistência', 'telemetria', 'performance', 'câmbio', 'abs', 'tração'],
        content: `Configurações padronizadas para garantir competitividade justa:

Desempenho:
• Grid Light: Performance igual para todos
• Grid Carreira: Performance real dos carros

Setup & Assistências:
• Setup padrão pré-definido pela liga
• Traçado automático: Permitido
• Câmbio automático: Permitido
• ABS/Tração: Completos permitidos
• Pit stop: Manual obrigatório
• Largada: Manual obrigatória

Telemetria:
• Uso aberto é OBRIGATÓRIO
• Telemetria fechada gera perda automática de Pontos de Conduta`
    },
    {
        id: 'numeracao',
        title: '7. Numeração de Pilotos',
        keywords: ['número', 'numeração', 'piloto', 'duplicidade'],
        content: `Cada piloto deve usar o número registrado no jogo. Não pode haver duplicidade no mesmo grid.

Ordem de prioridade para números disputados:
1. Piloto já no grid na temporada anterior
2. Piloto promovido do Grid Light
3. Piloto com histórico na liga
4. Piloto novato
5. Administração decide em caso de empate

O uso de número incorreto acarreta perda de Pontos de Conduta e advertência ou multa em pontos de campeonato conforme reincidência.`
    },
    {
        id: 'draft',
        title: '8. Draft e Equipes',
        keywords: ['draft', 'equipe', 'time', 'escolha', 'prioridade', 'reserva'],
        content: `O draft define a alocação de pilotos nas equipes com base em critérios objetivos.`,
        tables: [
            {
                title: 'Prioridade Grid Carreira',
                headers: ['Ordem', 'Critério'],
                rows: [
                    ['1º', 'Pilotos que disputaram Grid Carreira na temporada anterior'],
                    ['2º', 'Pilotos promovidos do Grid Light'],
                    ['3º', 'Pilotos com ranking histórico alto'],
                    ['4º', 'Pilotos novatos em ordem alfabética']
                ]
            },
            {
                title: 'Prioridade Grid Light',
                headers: ['Ordem', 'Critério'],
                rows: [
                    ['1º', 'Melhor pontuação na temporada anterior'],
                    ['2º', 'Pilotos antigos na liga'],
                    ['3º', 'Pilotos novatos em ordem alfabética']
                ]
            }
        ],
        extra: `Promoção Obrigatória:
Os 3 primeiros colocados do Grid Light ao final da temporada NÃO poderão mais competir nesse grid. Deverão obrigatoriamente seguir para o Grid Carreira na temporada seguinte.

Reservas:
O piloto reserva ocupa a vaga quando o titular não confirma presença. Deve aceitar o carro de menor performance disponível conforme a ordem de forças da temporada. Pontos conquistados pelo reserva são computados normalmente.`
    },
    {
        id: 'punicoes',
        title: '9. Sistema de Punições',
        keywords: ['punição', 'penalidade', 'carteira', 'suspensão', 'ban', 'advertência', 'pontos'],
        content: `A liga utiliza um sistema de carteira de pontos progressiva. Acúmulo de pontos leva a suspensões e impacta o Power Ranking.`,
        tables: [
            {
                title: 'Escala de Punições',
                headers: ['Nível', 'Pontos', 'Descrição'],
                rows: penaltyScale.map(p => [p.label, p.points, p.detail])
            }
        ],
        extra: `Agravantes (+5 pontos adicionais):
• Incidentes na largada (até volta 2)
• Incidentes na última volta
• Incidentes durante ou logo após Safety Car
• Reincidência ou omissão de informações

ATENÇÃO: Ao atingir 20 pontos na carteira, o piloto cumpre suspensão automática na etapa seguinte.`
    },
    {
        id: 'analises',
        title: '10. Análises e Defesa',
        keywords: ['análise', 'defesa', 'vídeo', 'incidente', 'prazo', 'solicitação'],
        content: `O sistema de análises permite revisão de incidentes com prazos definidos:

Solicitação:
• Via site/app até as 20h do dia seguinte à corrida

Defesa:
• Prazo de 24h após notificação
• Obrigatório enviar vídeo onboard
• Vídeo deve estar hospedado externamente (YouTube, Twitch, etc.)

Consequências da ausência de defesa:
• Perda de Pontos de Conduta
• Punição leve (+5 pts) aplicada automaticamente
• Não presume culpa, apenas falta de colaboração`
    },
    {
        id: 'powerranking',
        title: '11. Power Ranking',
        keywords: ['power ranking', 'ranking', 'nota', 'avaliação', 'performance', 'conduta', 'racecraft'],
        content: `O Power Ranking é a nota final que combina múltiplos aspectos do desempenho do piloto:`,
        tables: [
            {
                title: 'Pilares do Power Ranking',
                headers: ['Pilar', 'Descrição'],
                rows: pillars.map(p => [p.title, p.desc])
            }
        ],
        extra: `A soma destes pilares define:
• Prioridades no draft
• Confiança das equipes
• Reputação geral na liga

Pilotos com conduta limpa sobem mais rápido no ranking mesmo diante de adversidades na pista.`
    },
    {
        id: 'infracoes',
        title: '12. Infrações Críticas',
        keywords: ['infração', 'falta', 'wo', 'ausência', 'foto', 'formulário'],
        content: `As seguintes ações reduzem automaticamente Pontos de Conduta e Overall:

• Não enviar foto oficial solicitada pelo campeonato
• Faltar a etapas (W.O.) sem justificativa
• Ignorar lista de presença ou formulários obrigatórios
• Acúmulo de punições em análises de incidentes
• Usar telemetria fechada sem autorização
• Piloto com numeração incorreta ou alteração não comunicada
• Não responder vídeo de defesa quando solicitado pela comissão

Comunicação e clareza valem tanto quanto velocidade. Pilotos colaborativos têm melhor reputação na liga.`
    },
    {
        id: 'disposicoes',
        title: '13. Disposições Finais',
        keywords: ['final', 'alteração', 'administração', 'casos omissos'],
        content: `• Este regulamento pode ser alterado pela administração a qualquer momento, com aviso prévio aos participantes.
• Casos omissos serão analisados pela comissão organizadora.
• A decisão da administração é soberana e definitiva em todas as situações.
• Ao participar da Master League F1, o piloto declara ter lido e concordado com todas as regras aqui estabelecidas.

© 2025 Master League F1 • Regulamento Oficial Temporada 20`
    }
];

// ========== COMPONENTE PRINCIPAL ==========
const Regulamento = () => {
    const [viewMode, setViewMode] = useState('infographic');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeSection, setActiveSection] = useState(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const searchInputRef = useRef(null);
    const textContentRef = useRef(null);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    // Mostrar/esconder botão de voltar ao topo
    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 300);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Busca com sugestões - funciona em ambos os modos
    const handleSearch = useCallback((term) => {
        setSearchTerm(term);
        if (term.length < 2) {
            setSearchResults([]);
            setShowSuggestions(false);
            return;
        }

        const termLower = term.toLowerCase();
        const results = [];

        if (viewMode === 'text') {
            // Busca no modo texto
            regulamentoTexto.forEach(section => {
                const titleMatch = section.title.toLowerCase().includes(termLower);
                const keywordMatch = section.keywords.some(k => k.includes(termLower));
                const contentMatch = section.content.toLowerCase().includes(termLower);

                if (titleMatch || keywordMatch || contentMatch) {
                    let snippet = '';
                    if (contentMatch) {
                        const idx = section.content.toLowerCase().indexOf(termLower);
                        const start = Math.max(0, idx - 40);
                        const end = Math.min(section.content.length, idx + term.length + 40);
                        snippet = (start > 0 ? '...' : '') + section.content.slice(start, end) + (end < section.content.length ? '...' : '');
                    }
                    results.push({
                        id: section.id,
                        title: section.title,
                        snippet,
                        matchType: titleMatch ? 'title' : keywordMatch ? 'keyword' : 'content',
                        mode: 'text'
                    });
                }
            });
        } else {
            // Busca no modo infográfico
            infographicSections.forEach(section => {
                const titleMatch = section.title.toLowerCase().includes(termLower);
                const keywordMatch = section.keywords.some(k => k.includes(termLower));

                if (titleMatch || keywordMatch) {
                    results.push({
                        id: section.id,
                        elementId: section.elementId,
                        title: section.title,
                        snippet: section.keywords.filter(k => k.includes(termLower)).slice(0, 3).join(', '),
                        matchType: titleMatch ? 'title' : 'keyword',
                        mode: 'infographic'
                    });
                }
            });
        }

        setSearchResults(results);
        setShowSuggestions(results.length > 0);
    }, [viewMode]);

    // Scroll para seção - funciona em ambos os modos
    const scrollToSection = useCallback((result) => {
        setShowSuggestions(false);
        setSearchTerm('');
        setSearchResults([]);
        
        setTimeout(() => {
            let element;
            if (result.mode === 'text') {
                element = document.getElementById(`section-${result.id}`);
                setActiveSection(result.id);
            } else {
                element = document.getElementById(result.elementId);
            }
            
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                element.classList.add('highlight-section');
                setTimeout(() => element.classList.remove('highlight-section'), 2000);
            }
        }, 100);
    }, []);

    // Scroll para seção do índice (modo texto)
    const scrollToTextSection = useCallback((sectionId) => {
        setActiveSection(sectionId);
        setTimeout(() => {
            const element = document.getElementById(`section-${sectionId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    }, []);

    const handlePrint = () => {
        window.print();
    };

    const handleSave = () => {
        // Gera conteúdo do regulamento em texto
        let content = 'REGULAMENTO OFICIAL - MASTER LEAGUE F1\n';
        content += 'Temporada 20\n';
        content += '='.repeat(50) + '\n\n';
        
        regulamentoTexto.forEach(section => {
            content += section.title.toUpperCase() + '\n';
            content += '-'.repeat(40) + '\n';
            content += section.content + '\n\n';
            
            if (section.tables) {
                section.tables.forEach(table => {
                    content += '\n' + table.title + ':\n';
                    content += table.headers.join(' | ') + '\n';
                    table.rows.forEach(row => {
                        content += row.join(' | ') + '\n';
                    });
                    content += '\n';
                });
            }
        });
        
        // Cria blob e faz download
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'Regulamento_ML1_T20.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const clearSearch = () => {
        setSearchTerm('');
        setSearchResults([]);
        setShowSuggestions(false);
    };

    // Índice de navegação
    const tableOfContents = useMemo(() => 
        regulamentoTexto.map(s => ({ id: s.id, title: s.title })),
    []);

    return (
        <div className="regulamento-page">
            {/* Watermark */}
            <div className="reg-watermark">
                <img src="/logos/logo-ml.png" alt="" />
            </div>

            <header className="regulamento-header">
                {/* Linha do título com botões */}
                <div className="reg-pill-row">
                    <div className="reg-pill-spacer"></div>
                    <span className="regulamento-header-pill">Temporada 20 • Regulamento Oficial ML1</span>
                    <div className="reg-header-actions">
                        <button className="reg-action-btn-icon" onClick={handlePrint} title="Imprimir">
                            <Printer size={18} />
                        </button>
                        <button className="reg-action-btn-icon save" onClick={handleSave} title="Salvar Regulamento">
                            <Save size={18} />
                        </button>
                    </div>
                </div>
                <h1>Regulamento Oficial • Master League F1</h1>
                <p>
                    {viewMode === 'infographic' 
                        ? 'Infográfico dinâmico com tudo que você precisa saber para competir na Temporada 20.'
                        : 'Versão completa para leitura com índice, busca e opção de impressão.'}
                </p>

                {/* Toggle Switch */}
                <div className="reg-view-toggle">
                    <span className={viewMode === 'infographic' ? 'active' : ''}>Infográfico</span>
                    <button
                        className={`toggle-switch ${viewMode === 'text' ? 'active' : ''}`}
                        onClick={() => setViewMode(viewMode === 'infographic' ? 'text' : 'infographic')}
                        aria-label="Alternar modo de visualização"
                    >
                        <span className="toggle-slider"></span>
                    </button>
                    <span className={viewMode === 'text' ? 'active' : ''}>Texto</span>
                </div>

                {/* Campo de Busca */}
                <div className="reg-search-container">
                    <div className="reg-search-box">
                        <Search className="reg-search-icon" size={20} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Buscar no regulamento..."
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                            onFocus={() => searchResults.length > 0 && setShowSuggestions(true)}
                        />
                        {searchTerm && (
                            <button className="reg-search-clear" onClick={clearSearch}>
                                <X size={18} />
                            </button>
                        )}
                    </div>
                    
                    {/* Sugestões de busca */}
                    {showSuggestions && (
                        <div className="reg-search-suggestions">
                            {searchResults.map(result => (
                                <button
                                    key={result.id}
                                    className="reg-suggestion-item"
                                    onClick={() => scrollToSection(result)}
                                >
                                    <ChevronRight size={16} />
                                    <div>
                                        <strong>{result.title}</strong>
                                        {result.snippet && <span>{result.snippet}</span>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            {viewMode === 'text' ? (
                <div className="reg-text-container" ref={textContentRef}>
                    {/* Índice */}
                    <nav className="reg-text-index">
                        <h3><BookOpen size={20} /> Índice</h3>
                        <ul>
                            {tableOfContents.map(item => (
                                <li key={item.id}>
                                    <button onClick={() => scrollToTextSection(item.id)}>
                                        {item.title}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* Conteúdo do regulamento */}
                    <div className="reg-text-content">
                        {regulamentoTexto.map(section => (
                            <section
                                key={section.id}
                                id={`section-${section.id}`}
                                className={`reg-text-section ${activeSection === section.id ? 'active' : ''}`}
                            >
                                <h2>{section.title}</h2>
                                <div className="reg-text-body">
                                    {section.content.split('\n').map((paragraph, idx) => (
                                        paragraph.trim() && <p key={idx}>{paragraph}</p>
                                    ))}
                                </div>

                                {/* Tabelas */}
                                {section.tables && section.tables.map((table, tIdx) => (
                                    <div key={tIdx} className="reg-text-table-wrapper">
                                        <h4>{table.title}</h4>
                                        <table className="reg-text-table">
                                            <thead>
                                                <tr>
                                                    {table.headers.map((h, hIdx) => (
                                                        <th key={hIdx}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {table.rows.map((row, rIdx) => (
                                                    <tr key={rIdx}>
                                                        {row.map((cell, cIdx) => (
                                                            <td key={cIdx}>{cell}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}

                                {/* Conteúdo extra */}
                                {section.extra && (
                                    <div className="reg-text-extra">
                                        {section.extra.split('\n').map((line, idx) => (
                                            line.trim() && <p key={idx}>{line}</p>
                                        ))}
                                    </div>
                                )}
                            </section>
                        ))}
                    </div>
                </div>
            ) : (
                <>
                    {/* ========== INFOGRÁFICO ========== */}
                    <div id="info-hero" className="reg-hero-grid">
                        {heroStats.map((stat) => {
                            const Icon = stat.icon;
                            return (
                                <article key={stat.id} className="reg-hero-card">
                                    <div className="reg-hero-icon">
                                        <Icon className="stat-icon" />
                                    </div>
                                    <h3>{stat.title}</h3>
                                    <p>{stat.detail}</p>
                                </article>
                            );
                        })}
                    </div>

                    <section id="info-inscricao" className="reg-section">
                        <div className="reg-section-title">
                            <div>
                                <h2>Inscrição &amp; Valores</h2>
                                <p>Taxas anunciadas em grupos oficiais; concordar com o regulamento ativa o uso de imagem e presença.</p>
                            </div>
                            <span className="reg-mini-pill">Pagamentos confirmam vaga e direitos de mídia</span>
                        </div>
                        <div className="reg-highlight-grid">
                            {registrationHighlights.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <article key={item.id} className="reg-highlight-card">
                                        <div className="reg-highlight-icon"><Icon /></div>
                                        <h3>{item.title}</h3>
                                        <p>{item.desc}</p>
                                    </article>
                                );
                            })}
                        </div>
                    </section>

                    <section id="info-calendario" className="reg-section reg-section-calendar">
                        <div className="reg-section-title">
                            <div>
                                <h2>Calendário &amp; Lobby</h2>
                                <p>8 etapas com transmissões programadas, lobby com início fixo e presença obrigatória.</p>
                            </div>
                            <span className="reg-mini-pill">Segundas e quintas • 20:15h</span>
                        </div>
                        <div className="reg-calendar-grid">
                            <article className="reg-calendar-card">
                                <h3>Grid Light</h3>
                                <p className="reg-calendar-sub">Segundas-feiras • 20:15h</p>
                                <p>Performance igual em todas as etapas; foco em evolução e acesso ao Grid Carreira.</p>
                            </article>
                            <article className="reg-calendar-card">
                                <h3>Grid Carreira</h3>
                                <p className="reg-calendar-sub">Quintas-feiras • 20:15h</p>
                                <p>Performance real, pilotos de elite e pontos decisivos para o Power Ranking.</p>
                            </article>
                        </div>

                        {/* Tabelas de Calendário */}

                        <div className="reg-calendar-tables">
                            <div className="reg-calendar-table-wrapper">
                                <h3 className="reg-calendar-table-title">📅 Calendário Grid Light</h3>
                                <table className="reg-calendar-table">
                                    <thead>
                                        <tr>
                                            <th>Etapa</th>
                                            <th>Data</th>
                                            <th>Circuito</th>
                                            <th>Mapa</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {calendarData.map((item) => {
                                            const isSprint = item.modelo === 'Sprint';
                                            const isQualy = item.modelo === 'Qualy 18"';
                                            const etapaLabel = isSprint ? `Etapa ${item.etapa} **` : isQualy ? `Etapa ${item.etapa} *` : `Etapa ${item.etapa}`;
                                            const info = circuitInfo[item.circuito] || {};
                                            return (
                                                <tr key={`light-${item.etapa}`} className={isSprint ? 'sprint-row' : ''}>
                                                    <td>{etapaLabel}</td>
                                                    <td>{calcLightDate(item.dataCarreira)}</td>
                                                    <td>
                                                        <img className="flag-img" src={info.bandeira} alt={item.circuito} />
                                                        <span className="circuit-name">{info.nome || item.circuito}</span>
                                                    </td>
                                                    <td>
                                                        {info.mapa && <img className="track-map-img" src={info.mapa} alt={`Mapa ${info.nome || item.circuito}`} />}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                <div className="reg-calendar-legenda">
                                    <p>⏰ Todas as etapas iniciam às 20:15h</p>
                                    <p><strong>*</strong> Qualificação 18 minutos &nbsp; <strong>**</strong> Sprint (Qualy volta única)</p>
                                </div>
                            </div>

                            <div className="reg-calendar-table-wrapper">
                                <h3 className="reg-calendar-table-title">📅 Calendário Grid Carreira</h3>
                                <table className="reg-calendar-table">
                                    <thead>
                                        <tr>
                                            <th>Etapa</th>
                                            <th>Data</th>
                                            <th>Circuito</th>
                                            <th>Mapa</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {calendarData.map((item) => {
                                            const isSprint = item.modelo === 'Sprint';
                                            const isQualy = item.modelo === 'Qualy 18"';
                                            const etapaLabel = isSprint ? `Etapa ${item.etapa} **` : isQualy ? `Etapa ${item.etapa} *` : `Etapa ${item.etapa}`;
                                            const info = circuitInfo[item.circuito] || {};
                                            return (
                                                <tr key={`carreira-${item.etapa}`} className={isSprint ? 'sprint-row' : ''}>
                                                    <td>{etapaLabel}</td>
                                                    <td>{item.dataCarreira}</td>
                                                    <td>
                                                        <img className="flag-img" src={flagsByCircuit[item.circuito]} alt={item.circuito} />
                                                        <span className="circuit-name">{info.nome || item.circuito}</span>
                                                    </td>
                                                    <td>
                                                        {info.mapa && <img className="track-map-img" src={info.mapa} alt={`Mapa ${info.nome || item.circuito}`} />}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                <div className="reg-calendar-legenda">
                                    <p>⏰ Todas as etapas iniciam às 20:15h</p>
                                    <p><strong>*</strong> Qualificação 18 minutos &nbsp; <strong>**</strong> Sprint (Qualy volta única)</p>
                                </div>
                            </div>
                        </div>

                        <div className="reg-session-grid">
                            {sessionFormats.map((format) => {
                                const Icon = format.icon;
                                return (
                                    <article key={format.id} className="reg-session-card">
                                        <div className="reg-session-icon"><Icon /></div>
                                        <h3>{format.title}</h3>
                                        <p>{format.detail}</p>
                                    </article>
                                );
                            })}
                        </div>
                        <div className="reg-lobby-steps">
                            {lobbySteps.map((step, index) => (
                                <div key={step} className="reg-lobby-step">
                                    <span>0{index + 1}</span>
                                    <p>{step}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section id="info-tecnico" className="reg-section reg-section-technical">
                        <div className="reg-section-title">
                            <div>
                                <h2>Configurações técnicas &amp; Numeração</h2>
                                <p>Setup, assistências e telemetria seguem regras claras para manter a competitividade.</p>
                            </div>
                            <span className="reg-mini-pill">Pré-definido • Manual • Transparente</span>
                        </div>
                        <div className="reg-tech-grid">
                            {technicalRules.map((rule) => (
                                <article key={rule.id} className="reg-tech-card">
                                    <h3>{rule.title}</h3>
                                    <p>{rule.detail}</p>
                                </article>
                            ))}
                        </div>
                        <article className="reg-number-card">
                            <div className="reg-number-card-header">
                                <ListOrdered className="reg-number-icon" />
                                <div>
                                    <h3>Numeração obrigatória</h3>
                                    <p>Use o número registrado no jogo e evite duplicidade no mesmo grid.</p>
                                </div>
                            </div>
                            <ul>
                                {numberPreferences.map((pref) => (
                                    <li key={pref}>{pref}</li>
                                ))}
                            </ul>
                            <p className="reg-number-note">
                                Uso de número errado acarreta perda de Pontos de Conduta e advertência ou multa em pontos de campeonato conforme reincidência.
                            </p>
                        </article>
                    </section>

                    <section id="info-pontuacao" className="reg-section scoring-section">
                        <div className="reg-section-title">
                            <div>
                                <h2>Sistema de Pontuação</h2>
                                <p>Corrida Principal segue padrão FIA; Sprint recompensa os oito primeiros.</p>
                            </div>
                        </div>
                        <div className="reg-scoring-grid">
                            <article className="score-card">
                                <ListOrdered className="score-icon" />
                                <h3>Corrida Principal</h3>
                                <ul>
                                    {scoringMain.map((s) => (
                                        <li key={s.pos}>{s.pos} – {s.pts} pontos</li>
                                    ))}
                                </ul>
                            </article>
                            <article className="score-card">
                                <ListOrdered className="score-icon" />
                                <h3>Corrida Sprint</h3>
                                <ul>
                                    {scoringSprint.map((s) => (
                                        <li key={s.pos}>{s.pos} – {s.pts} pontos</li>
                                    ))}
                                </ul>
                            </article>
                            <article className="score-card tiebreak-card">
                                <Signal className="score-icon" />
                                <h3>Critérios de desempate</h3>
                                <ul>
                                    {tiebreakers.map((item) => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>
                            </article>
                        </div>
                    </section>

                    <section id="info-draft" className="reg-section draft-section">
                        <div className="reg-section-title">
                            <div>
                                <h2>Equipes, Draft &amp; Reservas</h2>
                                <p>Prioridades claras para Grid Carreira e Grid Light; reservas pontuam como titulares.</p>
                            </div>
                        </div>
                        <div className="draft-grid">
                            {draftPriority.map((group) => (
                                <article key={group.title} className="draft-card">
                                    <h3>{group.title}</h3>
                                    <ul>
                                        {group.items.map((item) => (
                                            <li key={item}>{item}</li>
                                        ))}
                                    </ul>
                                </article>
                            ))}
                        </div>
                        
                        {/* Promoção Obrigatória */}
                        <div className="reg-promotion-rule">
                            <div className="reg-promotion-icon">🏆</div>
                            <div className="reg-promotion-content">
                                <h4>{promotionRule.title}</h4>
                                <p>{promotionRule.description}</p>
                            </div>
                        </div>

                        <p className="reg-reserve-note">
                            <strong>Reservas:</strong> {reserveRule.description}
                        </p>
                    </section>

                    <section id="info-punicoes" className="reg-section penalties-section">
                        <div className="reg-section-title">
                            <div>
                                <h2>Sistema de Punições</h2>
                                <p>Carteira de pontos progressiva que leva a suspensões, multas e perda de ranking.</p>
                            </div>
                        </div>
                        <div className="penalties-grid">
                            {penaltyScale.map((scale) => (
                                <article key={scale.label} className="penalty-card">
                                    <h3>{scale.label}</h3>
                                    <p className="penalty-points">{scale.points}</p>
                                    <p>{scale.detail}</p>
                                </article>
                            ))}
                        </div>
                        <div className="reg-aggravations">
                            <p className="aggravation-title">Agravantes (+5 pontos na punição)</p>
                            <ul>
                                {penaltyAggravations.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </div>
                        <p className="reg-suspension-line">
                            Ao atingir 20 pontos na carteira, o piloto cumpre suspensão automática na etapa seguinte.
                        </p>
                    </section>

                    <section id="info-analises" className="reg-section analysis-section">
                        <div className="reg-section-title">
                            <div>
                                <h2>Análises &amp; Defesa</h2>
                                <p>Defesas exigem vídeo onboard hospedado externamente e prazos rígidos.</p>
                            </div>
                        </div>
                        <div className="analysis-steps">
                            {analysisSteps.map((step) => (
                                <article key={step.label} className="analysis-step">
                                    <header>
                                        <CheckCircle className="analysis-icon" />
                                        <h3>{step.label}</h3>
                                    </header>
                                    <p>{step.detail}</p>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section id="info-ranking" className="reg-section power-ranking-section">
                        <div className="reg-section-title">
                            <div>
                                <h2>Power Ranking</h2>
                                <p>Nota final que combina Performance, Conduta, Racecraft, Overall e Histórico.</p>
                            </div>
                        </div>
                        
                        {/* Grid 3x2 com Hero Central */}
                        <div className="pr-grid">
                            {/* Linha 1: Performance - Hero - Conduta */}
                            <article className="reg-card pr-card">
                                <div className="reg-card-header">
                                    <span className="reg-pill-number">Pilar 01</span>
                                    <div className="reg-icon-wrapper">{pillars[0].icon}</div>
                                </div>
                                <h3>{pillars[0].title}</h3>
                                <p>{pillars[0].desc}</p>
                            </article>
                            
                            <div className="pr-hero-card">
                                <div className="pr-hero-icon">
                                    <Gauge className="pr-main-icon" />
                                </div>
                                <h3>Sua Nota de Elite</h3>
                                <p>Combine os 5 pilares para subir no ranking e conquistar as melhores equipes no draft.</p>
                            </div>
                            
                            <article className="reg-card pr-card">
                                <div className="reg-card-header">
                                    <span className="reg-pill-number">Pilar 02</span>
                                    <div className="reg-icon-wrapper">{pillars[1].icon}</div>
                                </div>
                                <h3>{pillars[1].title}</h3>
                                <p>{pillars[1].desc}</p>
                            </article>
                            
                            {/* Linha 2: Racecraft - Overall - Histórico */}
                            <article className="reg-card pr-card">
                                <div className="reg-card-header">
                                    <span className="reg-pill-number">Pilar 03</span>
                                    <div className="reg-icon-wrapper">{pillars[2].icon}</div>
                                </div>
                                <h3>{pillars[2].title}</h3>
                                <p>{pillars[2].desc}</p>
                            </article>
                            
                            <article className="reg-card pr-card">
                                <div className="reg-card-header">
                                    <span className="reg-pill-number">Pilar 04</span>
                                    <div className="reg-icon-wrapper">{pillars[3].icon}</div>
                                </div>
                                <h3>{pillars[3].title}</h3>
                                <p>{pillars[3].desc}</p>
                            </article>
                            
                            <article className="reg-card pr-card">
                                <div className="reg-card-header">
                                    <span className="reg-pill-number">Pilar 05</span>
                                    <div className="reg-icon-wrapper">{pillars[4].icon}</div>
                                </div>
                                <h3>{pillars[4].title}</h3>
                                <p>{pillars[4].desc}</p>
                            </article>
                        </div>

                        <div className="info-card pr-info-card">
                            <Info className="reg-icon" />
                            <div>
                                <strong>Nota Final</strong>
                                <p>Soma destes pilares define prioridades no draft, confiança das equipes e reputação da liga.</p>
                            </div>
                        </div>
                    </section>

                    <section id="info-infracoes" className="reg-section conduct-section">
                        <div className="conduct-panel">
                            <div className="conduct-header">
                                <AlertTriangle className="reg-icon alert" />
                                <div>
                                    <h2>Infrações críticas</h2>
                                    <p>Ações que reduzem Pontos de Conduta e Overall.</p>
                                </div>
                            </div>
                            <div className="conduct-list">
                                {infractions.map((item) => (
                                    <div key={item} className="conduct-item">
                                        <XCircle className="reg-icon small" />
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="conduct-tip">
                                <CheckCircle className="reg-icon check" />
                                <p>
                                    Pilotos com conduta limpa sobem mais rápido no ranking mesmo diante de adversidades na pista.
                                    Comunicação e clareza valem tanto quanto velocidade.
                                </p>
                            </div>
                        </div>
                    </section>
                </>
            )}

            {/* Botão Voltar ao Topo */}
            <button 
                className={`scroll-to-top ${showScrollTop ? 'visible' : ''}`}
                onClick={scrollToTop}
                aria-label="Voltar ao topo"
            >
                <ChevronUp size={20} />
            </button>

            <footer className="regulamento-footer">
                <p>© 2025 Master League F1 • Regulamento Oficial ML1</p>
            </footer>
        </div>
    );
};

export default Regulamento;
