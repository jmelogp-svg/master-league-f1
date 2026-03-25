-- Tabela de inscrições de pilotos por formulário do site
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS season_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    temporada INTEGER NOT NULL DEFAULT 20,
    nome TEXT NOT NULL,
    gamertag_id TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    plataforma TEXT NOT NULL CHECK (plataforma IN ('xbox', 'play', 'pc')),
    grid TEXT NOT NULL CHECK (grid IN ('carreira', 'light', 'open')),
    email_login TEXT NOT NULL,
    data_inscricao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    nome_piloto_transmissao TEXT NOT NULL,
    numero_carro TEXT NOT NULL,
    forma_pagamento TEXT NOT NULL DEFAULT 'pix_agora' CHECK (forma_pagamento IN ('pix_agora', 'pagar_depois', 'adm', 'premiacao_equipe')),
    data_pagamento_prevista DATE,
    status_inscricao TEXT NOT NULL DEFAULT 'pendente' CHECK (status_inscricao IN ('pendente', 'aprovado', 'reserva', 'recusado')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_season_registrations_data_inscricao
    ON season_registrations (data_inscricao DESC);

CREATE INDEX IF NOT EXISTS idx_season_registrations_status
    ON season_registrations (status_inscricao);

-- Migração defensiva para bases onde a tabela já existe sem a coluna temporada
ALTER TABLE season_registrations
    ADD COLUMN IF NOT EXISTS temporada INTEGER;

UPDATE season_registrations
SET temporada = 20
WHERE temporada IS NULL;

ALTER TABLE season_registrations
    ALTER COLUMN temporada SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_season_registrations_temporada
    ON season_registrations (temporada);

ALTER TABLE season_registrations ENABLE ROW LEVEL SECURITY;

-- Inserção pública pelo formulário
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'season_registrations'
          AND policyname = 'season_registrations_insert_public'
    ) THEN
        CREATE POLICY season_registrations_insert_public
            ON season_registrations
            FOR INSERT
            WITH CHECK (true);
    END IF;
END $$;

-- Leitura para usuários autenticados (necessário para painel ADM)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'season_registrations'
          AND policyname = 'season_registrations_read_auth'
    ) THEN
        CREATE POLICY season_registrations_read_auth
            ON season_registrations
            FOR SELECT
            USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Edição para usuários autenticados (painel ADM)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'season_registrations'
          AND policyname = 'season_registrations_update_auth'
    ) THEN
        CREATE POLICY season_registrations_update_auth
            ON season_registrations
            FOR UPDATE
            USING (auth.role() = 'authenticated')
            WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;
