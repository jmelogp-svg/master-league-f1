-- ============================================
-- Atualizar is_steward para TRUE
-- Execute isso no SQL Editor do Supabase
-- ============================================

-- Atualizar seu usuário para steward
UPDATE pilotos 
SET is_steward = true 
WHERE email = 'jmelogp@gmail.com';

-- Verificar se foi atualizado corretamente
SELECT email, nome, is_steward 
FROM pilotos 
WHERE email = 'jmelogp@gmail.com';










