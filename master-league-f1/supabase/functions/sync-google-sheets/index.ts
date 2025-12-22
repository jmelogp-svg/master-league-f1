// Edge Function para sincronizar dados do Google Sheets para Supabase
// Uso: POST /functions/v1/sync-google-sheets
// Body: { sheetType: 'classificacao' | 'power_ranking' | 'calendario' | 'tracks' | 'minicup', force: boolean }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuração das planilhas
const SHEETS_CONFIG = {
  classificacao_carreira: {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=321791996&single=true&output=csv",
    gid: "321791996",
    name: "Data Carreira"
  },
  classificacao_light: {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=1687781433&single=true&output=csv",
    gid: "1687781433",
    name: "Data Light"
  },
  power_ranking: {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=984075936&single=true&output=csv",
    gid: "984075936",
    name: "CALCULADORA PR"
  },
  calendario: {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=0&single=true&output=csv",
    gid: "0",
    name: "CALENDÁRIO ML1"
  },
  tracks: {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=848427722&single=true&output=csv",
    gid: "848427722",
    name: "Tracks"
  },
  minicup: {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vROKHtP_NfWTNLUVfSMSlCqAMYeXtBTwMN9wPiw6UKOEgKbTeyPAHJbVWcXixCjgCPkKvY-33_PuIoM/pub?gid=1709066718&single=true&output=csv",
    gid: "1709066718",
    name: "TAB MINICUP"
  }
};

// Função para calcular hash dos dados
async function calculateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Função para buscar CSV do Google Sheets
async function fetchSheetCSV(url: string, retries = 3): Promise<string> {
  const proxies = [
    url, // Tentar direto primeiro
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
  ];

  for (let attempt = 0; attempt < retries; attempt++) {
    for (const proxyUrl of proxies) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(proxyUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0"
          }
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          const text = await response.text();
          // Validar que não é HTML (erro de proxy)
          if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
            continue;
          }
          if (text.length < 10) {
            continue; // Muito curto, provavelmente erro
          }
          return text;
        }
      } catch (error) {
        console.error(`Erro ao buscar via ${proxyUrl}:`, error);
        continue;
      }
    }
    
    // Aguardar antes de tentar novamente
    if (attempt < retries - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
    }
  }

  throw new Error("Falha ao buscar dados do Google Sheets após múltiplas tentativas");
}

// Função para parsear CSV
function parseCSV(csvText: string): string[][] {
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // Pular próxima aspas
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentLine.push(currentField.trim());
      currentField = "";
    } else if (char === "\n" && !inQuotes) {
      currentLine.push(currentField.trim());
      lines.push(currentLine);
      currentLine = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }

  // Adicionar última linha
  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField.trim());
    lines.push(currentLine);
  }

  return lines.filter(line => line.some(field => field.length > 0));
}

// Função para sincronizar classificação
async function syncClassificacao(supabase: any, grid: "carreira" | "light", season: number) {
  const config = grid === "carreira" 
    ? SHEETS_CONFIG.classificacao_carreira 
    : SHEETS_CONFIG.classificacao_light;

  const startTime = Date.now();
  
  try {
    console.log(`Sincronizando classificação ${grid}...`);
    
    // Buscar dados
    const csvText = await fetchSheetCSV(config.url);
    const rows = parseCSV(csvText);
    
    // Calcular hash
    const dataHash = await calculateHash(csvText);
    
    // Verificar se os dados mudaram
    const { data: existing } = await supabase
      .from("classificacao_cache")
      .select("data_hash")
      .eq("grid", grid)
      .eq("season", season)
      .single();

    if (existing && existing.data_hash === dataHash && !existing.force) {
      console.log(`Dados de ${grid} não mudaram, pulando sincronização`);
      return {
        success: true,
        skipped: true,
        message: "Dados não mudaram"
      };
    }

    // Preparar dados para inserção
    const dataToStore = {
      rows,
      metadata: {
        rowCount: rows.length,
        syncedAt: new Date().toISOString()
      }
    };

    // Inserir/atualizar cache
    const { error: upsertError } = await supabase
      .from("classificacao_cache")
      .upsert({
        grid,
        season,
        data: dataToStore,
        last_synced_at: new Date().toISOString(),
        sheet_url: config.url,
        sheet_gid: config.gid,
        data_hash: dataHash
      }, {
        onConflict: "grid,season"
      });

    if (upsertError) throw upsertError;

    const duration = Date.now() - startTime;

    // Registrar no log
    await supabase.from("sync_log").insert({
      source: "google_sheets",
      sheet_name: config.name,
      sheet_gid: config.gid,
      status: "success",
      records_synced: rows.length,
      duration_ms: duration
    });

    return {
      success: true,
      records_synced: rows.length,
      duration_ms: duration
    };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    // Registrar erro no log
    await supabase.from("sync_log").insert({
      source: "google_sheets",
      sheet_name: config.name,
      sheet_gid: config.gid,
      status: "error",
      error_message: error.message,
      duration_ms: duration
    });

    throw error;
  }
}

// Função genérica para sincronizar outros tipos
async function syncGeneric(
  supabase: any,
  tableName: string,
  config: typeof SHEETS_CONFIG[keyof typeof SHEETS_CONFIG],
  season?: number
) {
  const startTime = Date.now();
  
  try {
    console.log(`Sincronizando ${tableName}...`);
    
    const csvText = await fetchSheetCSV(config.url);
    const rows = parseCSV(csvText);
    const dataHash = await calculateHash(csvText);
    
    // Verificar se mudou
    const query = supabase.from(tableName).select("data_hash");
    if (season) {
      query.eq("season", season);
    }
    
    const { data: existing } = await query.single().catch(() => ({ data: null }));

    if (existing && existing.data_hash === dataHash) {
      console.log(`Dados de ${tableName} não mudaram`);
      return {
        success: true,
        skipped: true,
        message: "Dados não mudaram"
      };
    }

    const dataToStore = {
      rows,
      metadata: {
        rowCount: rows.length,
        syncedAt: new Date().toISOString()
      }
    };

    const upsertData: any = {
      data: dataToStore,
      last_synced_at: new Date().toISOString(),
      sheet_url: config.url,
      data_hash: dataHash
    };

    if (season) {
      upsertData.season = season;
    }

    const { error } = await supabase
      .from(tableName)
      .upsert(upsertData, {
        onConflict: season ? "season" : undefined
      });

    if (error) throw error;

    const duration = Date.now() - startTime;

    await supabase.from("sync_log").insert({
      source: "google_sheets",
      sheet_name: config.name,
      sheet_gid: config.gid,
      status: "success",
      records_synced: rows.length,
      duration_ms: duration
    });

    return {
      success: true,
      records_synced: rows.length,
      duration_ms: duration
    };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    await supabase.from("sync_log").insert({
      source: "google_sheets",
      sheet_name: config.name,
      sheet_gid: config.gid,
      status: "error",
      error_message: error.message,
      duration_ms: duration
    });

    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Criar cliente Supabase com service_role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { sheetType, grid, season, force } = await req.json().catch(() => ({}));

    const currentSeason = season || 20; // Temporada atual

    let result;

    switch (sheetType) {
      case "classificacao":
        if (!grid) {
          // Sincronizar ambos os grids
          const [carreira, light] = await Promise.all([
            syncClassificacao(supabase, "carreira", currentSeason),
            syncClassificacao(supabase, "light", currentSeason)
          ]);
          result = { carreira, light };
        } else {
          result = await syncClassificacao(supabase, grid, currentSeason);
        }
        break;

      case "power_ranking":
        result = await syncGeneric(supabase, "power_ranking_cache", SHEETS_CONFIG.power_ranking);
        break;

      case "calendario":
        result = await syncGeneric(supabase, "calendario_cache", SHEETS_CONFIG.calendario, currentSeason);
        break;

      case "tracks":
        result = await syncGeneric(supabase, "tracks_cache", SHEETS_CONFIG.tracks);
        break;

      case "minicup":
        result = await syncGeneric(supabase, "minicup_cache", SHEETS_CONFIG.minicup);
        break;

      case "all":
        // Sincronizar tudo
        const [classCarreira, classLight, pr, cal, tracks, minicup] = await Promise.all([
          syncClassificacao(supabase, "carreira", currentSeason),
          syncClassificacao(supabase, "light", currentSeason),
          syncGeneric(supabase, "power_ranking_cache", SHEETS_CONFIG.power_ranking),
          syncGeneric(supabase, "calendario_cache", SHEETS_CONFIG.calendario, currentSeason),
          syncGeneric(supabase, "tracks_cache", SHEETS_CONFIG.tracks),
          syncGeneric(supabase, "minicup_cache", SHEETS_CONFIG.minicup)
        ]);
        result = {
          classificacao: { carreira: classCarreira, light: classLight },
          power_ranking: pr,
          calendario: cal,
          tracks,
          minicup
        };
        break;

      default:
        throw new Error(`Tipo de planilha inválido: ${sheetType}`);
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Erro na sincronização:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

























