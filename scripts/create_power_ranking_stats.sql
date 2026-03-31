-- Criar tabela POWER_RANKING_STATS
-- Armazena os resultados calculados dos pilares e a média ponderada final
-- Esta tabela serve como fonte de verdade para o Dashboard do piloto

CREATE TABLE IF NOT EXISTS power_ranking_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    piloto_id UUID NOT NULL REFERENCES pilotos(id) ON DELETE CASCADE,
    season INTEGER NOT NULL,
    
    -- Valores dos Pilares (0-100)
    performance DECIMAL(5,2) DEFAULT 0,
    racecraft DECIMAL(5,2) DEFAULT 0,
    conduta DECIMAL(5,2) DEFAULT 0,
    overall DECIMAL(5,2) DEFAULT 0,
    historico DECIMAL(5,2) DEFAULT 0,
    
    -- Resultado Final (Média Ponderada)
    power_ranking INTEGER DEFAULT 0,
    
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(piloto_id, season) -- Um registro por piloto por temporada
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_pr_stats_piloto_season ON power_ranking_stats(piloto_id, season);

-- Habilitar RLS
ALTER TABLE power_ranking_stats ENABLE ROW LEVEL SECURITY;

-- Policy: Stewards podem escrever tudo
CREATE POLICY pr_stats_admin_all ON power_ranking_stats
    FOR ALL
    USING (
        (SELECT is_steward FROM pilotos WHERE email = auth.jwt() ->> 'email' LIMIT 1) = true
    )
    WITH CHECK (
        (SELECT is_steward FROM pilotos WHERE email = auth.jwt() ->> 'email' LIMIT 1) = true
    );

-- Policy: Todos podem ler (para o Dashboard)
CREATE POLICY pr_stats_read ON power_ranking_stats
    FOR SELECT
    USING (true);

-- Comentários
COMMENT ON TABLE power_ranking_stats IS 'Resultados consolidados do Power Ranking para exibição no Motorhome';

-- Sincronize a temporada exibida / congelamento com scripts/create_season_lifecycle.sql
-- (app_config: current_season, season_phase, last_closed_season).
