export const gerarObjetivosPorEquipe = (teamName, tier) => {
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

export const getAllObjetivos = () => {
    const teams = [
        { name: 'Ferrari', tier: 'gold' },
        { name: 'McLaren', tier: 'gold' },
        { name: 'Red Bull', tier: 'gold' },
        { name: 'Mercedes', tier: 'gold' },
        { name: 'Aston Martin', tier: 'silver' },
        { name: 'Alpine', tier: 'silver' },
        { name: 'Racing Bulls', tier: 'bronze' },
        { name: 'Williams', tier: 'bronze' },
        { name: 'Haas', tier: 'bronze' },
        { name: 'Sauber', tier: 'bronze' },
        { name: 'Generic Gold', tier: 'gold' },
        { name: 'Generic Silver', tier: 'silver' },
        { name: 'Generic Bronze', tier: 'bronze' }
    ];

    const objetivosSet = new Set();
    teams.forEach(({ name, tier }) => {
        gerarObjetivosPorEquipe(name, tier).forEach(obj => objetivosSet.add(obj));
    });

    return Array.from(objetivosSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));
};
