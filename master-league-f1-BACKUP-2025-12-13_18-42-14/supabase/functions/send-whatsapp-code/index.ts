import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Z-API Config
const ZAPI_INSTANCE = Deno.env.get("ZAPI_INSTANCE");
const ZAPI_TOKEN = Deno.env.get("ZAPI_TOKEN");
const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN"); // Token de Segurança da Conta (opcional)

console.log(`🔍 Secrets carregados:`);
console.log(`   ZAPI_INSTANCE: ${ZAPI_INSTANCE ? '✅' : '❌'}`);
console.log(`   ZAPI_TOKEN: ${ZAPI_TOKEN ? '✅' : '❌'}`);
console.log(`   ZAPI_CLIENT_TOKEN: ${ZAPI_CLIENT_TOKEN ? '✅ (opcional)' : '❌ (não configurado)'}`);

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function formatPhoneNumber(phone: string): string {
  const numbers = phone.replace(/\D/g, '');
  if (numbers.startsWith('0')) {
    return numbers.substring(1);
  }
  if (!numbers.startsWith('55')) {
    return '55' + numbers;
  }
  return numbers;
}

async function sendViaZAPI(phone: string, code: string, nomePiloto: string): Promise<{success: boolean, error?: string}> {
  if (!ZAPI_INSTANCE || !ZAPI_TOKEN) {
    const error = "Z-API não configurado";
    console.error(error);
    return { success: false, error };
  }

  const phoneFormatted = formatPhoneNumber(phone);
  const message = `🔐 CÓDIGO DE VERIFICAÇÃO - MASTER LEAGUE F1\n\nOlá ${nomePiloto || 'Piloto'}!\n\nSeu código de verificação é:\n\n${code}\n\nEste código expira em 10 minutos.`;

  try {
    const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`;
    
    console.log(`📱 Enviando via Z-API:`);
    console.log(`   URL: ${url}`);
    console.log(`   Para: ${phoneFormatted}`);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Adiciona Client-Token se estiver configurado
    if (ZAPI_CLIENT_TOKEN) {
      headers['Client-Token'] = ZAPI_CLIENT_TOKEN;
      console.log(`   Client-Token: ✅ configurado`);
    } else {
      console.log(`   Client-Token: ⚠️ não configurado (opcional)`);
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        phone: phoneFormatted,
        message: message,
      }),
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { error: responseText || 'Resposta inválida' };
    }
    
    console.log(`📥 Resposta Z-API: ${response.status}`);
    console.log(JSON.stringify(data, null, 2));
    
    if (response.ok && (data.status === 'success' || data.success === true)) {
      console.log(`✅ Enviado via Z-API`);
      return { success: true };
    } else {
      const errorMsg = data.message || data.error || data.errorMessage || 'Erro do Z-API';
      console.error(`❌ Erro Z-API:`, errorMsg);
      return { success: false, error: errorMsg };
    }
  } catch (error) {
    console.error("❌ Erro:", error);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, whatsapp, nomePiloto } = await req.json();

    if (!email || !whatsapp) {
      return new Response(
        JSON.stringify({ success: false, error: "Email e WhatsApp obrigatórios" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { data: piloto, error: pilotoError } = await supabase
      .from('pilotos')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (pilotoError || !piloto) {
      return new Response(
        JSON.stringify({ success: false, error: "Piloto não encontrado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    const whatsappFormatted = formatPhoneNumber(whatsapp);
    const code = generateCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    await supabase
      .from('whatsapp_verification_codes')
      .update({ used: true })
      .eq('email', email.toLowerCase().trim())
      .eq('used', false);

    const { data: codeRecord, error: codeError } = await supabase
      .from('whatsapp_verification_codes')
      .insert({
        email: email.toLowerCase().trim(),
        whatsapp: whatsappFormatted,
        code: code,
        expires_at: expiresAt.toISOString(),
        used: false,
        attempts: 0,
      })
      .select()
      .single();

    if (codeError || !codeRecord) {
      console.error("Erro ao salvar código:", codeError);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao gerar código" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const nome = nomePiloto || piloto.nome || 'Piloto';
    const result = await sendViaZAPI(whatsappFormatted, code, nome);

    if (!result.success) {
      return new Response(
        JSON.stringify({ success: false, error: result.error || "Erro ao enviar" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    await supabase
      .from('pilotos')
      .update({ whatsapp: whatsappFormatted })
      .eq('email', email.toLowerCase().trim());

    return new Response(
      JSON.stringify({ success: true, message: "Código enviado com sucesso" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro desconhecido" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
