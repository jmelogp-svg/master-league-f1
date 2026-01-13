/**
 * Utilitários para autenticação via WhatsApp
 * Gerencia códigos de verificação e comunicação com Edge Function
 */

import { supabase } from '../supabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Solicita envio de código de verificação via WhatsApp
 * @param {string} email - Email do piloto
 * @param {string} whatsapp - Número do WhatsApp (formato: (11) 99999-9999 ou 11999999999)
 * @param {string} nomePiloto - Nome do piloto (opcional)
 * @returns {Promise<{success: boolean, error?: string, code_id?: string}>}
 */
export async function requestVerificationCode(email, whatsapp, nomePiloto = null) {
    try {
        console.log('📱 Solicitando código de verificação...', { email, whatsapp });

        // Chamar Edge Function
        const response = await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
                email: email.toLowerCase().trim(),
                whatsapp: whatsapp,
                nomePiloto: nomePiloto,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Erro ao solicitar código:', data);
            return {
                success: false,
                error: data.error || 'Erro ao enviar código de verificação',
            };
        }

        console.log('✅ Código solicitado com sucesso');
        return {
            success: true,
            code_id: data.code_id, // Para debug - não usar em produção
        };

    } catch (error) {
        console.error('❌ Erro ao solicitar código:', error);
        return {
            success: false,
            error: error.message || 'Erro ao conectar com servidor',
        };
    }
}

/**
 * Valida código de verificação
 * @param {string} email - Email do piloto
 * @param {string} code - Código de 6 dígitos
 * @returns {Promise<{success: boolean, error?: string, valid?: boolean}>}
 */
export async function verifyCode(email, code) {
    try {
        console.log('🔍 Validando código...', { email, code: code.replace(/\d/g, '•') });

        // Buscar código ativo no banco
        const { data: codeRecord, error: codeError } = await supabase
            .from('whatsapp_verification_codes')
            .select('*')
            .eq('email', email.toLowerCase().trim())
            .eq('code', code.trim())
            .eq('used', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (codeError || !codeRecord) {
            console.error('❌ Código não encontrado:', codeError);
            return {
                success: false,
                valid: false,
                error: 'Código inválido ou não encontrado',
            };
        }

        // Verificar se expirou
        const expiresAt = new Date(codeRecord.expires_at);
        const now = new Date();

        if (now > expiresAt) {
            console.error('❌ Código expirado');
            // Marcar como usado mesmo que tenha expirado
            await supabase
                .from('whatsapp_verification_codes')
                .update({ used: true })
                .eq('id', codeRecord.id);

            return {
                success: false,
                valid: false,
                error: 'Código expirado. Solicite um novo código.',
            };
        }

        // Verificar tentativas (máximo 5 tentativas)
        if (codeRecord.attempts >= 5) {
            console.error('❌ Muitas tentativas inválidas');
            await supabase
                .from('whatsapp_verification_codes')
                .update({ used: true })
                .eq('id', codeRecord.id);

            return {
                success: false,
                valid: false,
                error: 'Muitas tentativas inválidas. Solicite um novo código.',
            };
        }

        // Código válido! Marcar como usado
        await supabase
            .from('whatsapp_verification_codes')
            .update({ 
                used: true,
                attempts: codeRecord.attempts + 1,
            })
            .eq('id', codeRecord.id);

        console.log('✅ Código validado com sucesso');
        return {
            success: true,
            valid: true,
        };

    } catch (error) {
        console.error('❌ Erro ao validar código:', error);
        return {
            success: false,
            valid: false,
            error: error.message || 'Erro ao validar código',
        };
    }
}

/**
 * Incrementa tentativas de código (para rastreamento de segurança)
 * @param {string} email - Email do piloto
 * @param {string} code - Código que foi tentado (mesmo que inválido)
 */
export async function incrementCodeAttempts(email, code) {
    try {
        const { data: codeRecord } = await supabase
            .from('whatsapp_verification_codes')
            .select('*')
            .eq('email', email.toLowerCase().trim())
            .eq('code', code.trim())
            .eq('used', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (codeRecord) {
            await supabase
                .from('whatsapp_verification_codes')
                .update({ attempts: codeRecord.attempts + 1 })
                .eq('id', codeRecord.id);
        }
    } catch (error) {
        console.warn('⚠️ Erro ao incrementar tentativas:', error);
    }
}

/**
 * Formata número de WhatsApp para exibição
 * @param {string} phone - Número do telefone
 * @returns {string} - Formato: (11) 99999-9999
 */
export function formatWhatsAppDisplay(phone) {
    if (!phone) return '';
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length < 10) return phone;
    
    // Remove código do país se presente
    let clean = numbers;
    if (numbers.startsWith('55') && numbers.length > 11) {
        clean = numbers.substring(2);
    }
    
    // Aplica máscara (00) 00000-0000
    if (clean.length === 11) {
        return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    } else if (clean.length === 10) {
        return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    }
    
    return phone;
}

/**
 * Limpa número de WhatsApp para envio (apenas números)
 * @param {string} phone - Número do telefone
 * @returns {string} - Formato: 5511999999999
 */
export function cleanWhatsAppNumber(phone) {
    if (!phone) return '';
    const numbers = phone.replace(/\D/g, '');
    
    // Se começar com 0, remove
    if (numbers.startsWith('0')) {
        return numbers.substring(1);
    }
    
    // Se não começar com 55 (código do Brasil), adiciona
    if (!numbers.startsWith('55') && numbers.length >= 10) {
        return '55' + numbers;
    }
    
    return numbers;
}


