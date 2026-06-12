// Fonction Netlify : proxy entre l'app et Google Apps Script
// Reçoit les requêtes de l'app, les transmet à Apps Script côté serveur
// → Zéro problème CORS car c'est serveur→serveur

exports.handler = async function(event) {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Répondre au preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  try {
    // Récupérer les paramètres (GET ou POST)
    let params = {};
    if (event.httpMethod === 'POST' && event.body) {
      try { params = JSON.parse(event.body); }
      catch(e) {
        // form-urlencoded fallback
        new URLSearchParams(event.body).forEach((v, k) => params[k] = v);
      }
    } else if (event.queryStringParameters) {
      params = event.queryStringParameters;
    }

    const { APPS_SCRIPT_URL } = process.env;
    if (!APPS_SCRIPT_URL) {
      return { statusCode: 500, headers: CORS,
        body: JSON.stringify({ error: "APPS_SCRIPT_URL non configuré dans Netlify" }) };
    }

    // Transmettre à Apps Script via GET (serveur→serveur, pas de CORS)
    const qs = new URLSearchParams(params).toString();
    const url = `${APPS_SCRIPT_URL}?${qs}`;

    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'FrigoApp-Proxy/1.0' },
    });

    const text = await response.text();

    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: text,
    };

  } catch(err) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'Proxy error: ' + err.message }),
    };
  }
};
