import { createClient } from '@supabase/supabase-js'

// Sua URL (Já coloquei a certa para você)
const supabaseUrl = 'https://ueqfmjwdijaeawvxhdtp.supabase.co'

// ⚠️ COLE SUA CHAVE 'anon' 'public' AQUI DENTRO DAS ASPAS:
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlcWZtandkaWphZWF3dnhoZHRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MjEzOTEsImV4cCI6MjA4MDA5NzM5MX0.b-y_prO5ffMuSOs7rUvrMru4SDN06BHqyMsbUIDDdJI'

export const supabase = createClient(supabaseUrl, supabaseKey)