/**
 * Aquarela Maquillaje — Cloudflare Worker
 * Proxy seguro entre el frontend y la API de Groq.
 *
 * PASOS DE CONFIGURACIÓN:
 * 1. Ve a https://dash.cloudflare.com → Workers & Pages → Create Worker
 * 2. Pega este código completo en el editor
 * 3. Guarda y despliega
 * 4. Ve a Settings → Variables → Add variable:
 *      Nombre:  GROQ_API_KEY
 *      Valor:   gsk_xxxxxxxxxxxxxxxxxxxxxx   (tu key de console.groq.com)
 *      ✅ Marca "Encrypt"
 * 5. Copia la URL del Worker (ej: https://aquarela-ia.tu-nombre.workers.dev)
 * 6. Pégala en el Analista IA de la app cuando te la pida
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

// Orígenes permitidos — agrega el dominio donde hospedarás la app
// Usa '*' solo en desarrollo/pruebas
const ALLOWED_ORIGINS = [
  'https://dursragnarok334.github.io',
]

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)
  return {
    'Access-Control-Allow-Origin': allowed ? (origin || '*') : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''

    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    // Solo aceptar POST
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método no permitido' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    // Verificar que la API key esté configurada como variable de entorno
    if (!env.GROQ_API_KEY) {
      return new Response(JSON.stringify({
        error: 'GROQ_API_KEY no configurada. Ve a Settings → Variables en tu Worker.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    // Leer y validar el body del frontend
    let body
    try {
      body = await request.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Body JSON inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    // Construir la llamada a Groq — solo pasamos los campos necesarios
    const groqPayload = {
      model: body.model || 'llama-3.3-70b-versatile',
      messages: body.messages,
      max_tokens: 1024,
      temperature: 0.7,
    }

    try {
      const groqResponse = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.GROQ_API_KEY}`,
        },
        body: JSON.stringify(groqPayload),
      })

      const data = await groqResponse.json()

      return new Response(JSON.stringify(data), {
        status: groqResponse.status,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
        },
      })
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Error al contactar Groq: ' + err.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }
  },
}
