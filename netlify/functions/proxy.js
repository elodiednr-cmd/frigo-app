// Proxy Netlify → Google Apps Script
// Reçoit POST JSON depuis l'app, transmet en GET à Apps Script

exports.handler = async function(event) {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
  if (!APPS_SCRIPT_URL) {
    return {
      statusCode: 500, headers: CORS,
      body: JSON.stringify({ error: "Variable APPS_SCRIPT_URL manquante dans Netlify" })
    };
  }

  // Récupérer les paramètres (POST JSON ou GET)
  let params = {};
  try {
    if (event.body) {
      params = JSON.parse(event.body);
    } else if (event.queryStringParameters) {
      params = event.queryStringParameters;
    }
  } catch(e) {
    return {
      statusCode: 400, headers: CORS,
      body: JSON.stringify({ error: "Corps de requête invalide : " + e.message })
    };
  }

  // Construire l'URL GET vers Apps Script
  const qs = Object.entries(params)
    .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v)))
    .join('&');
  const targetUrl = APPS_SCRIPT_URL + '?' + qs;

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'FrigoApp-Proxy/1.0' },
    });

    const text = await response.text();

    // Vérifier que la réponse est du JSON valide
    try { JSON.parse(text); } catch(e) {
      return {
        statusCode: 502, headers: CORS,
        body: JSON.stringify({ error: "Réponse Apps Script non-JSON : " + text.slice(0, 200) })
      };
    }

    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: text,
    };

  } catch(err) {
    return {
      statusCode: 502, headers: CORS,
      body: JSON.stringify({ error: "Erreur proxy : " + err.message })
    };
  }
};
