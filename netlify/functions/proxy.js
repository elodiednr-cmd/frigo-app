// Proxy Netlify → Google Apps Script
exports.handler = async function(event) {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

  const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
  if (!APPS_SCRIPT_URL) return {
    statusCode: 500, headers: CORS,
    body: JSON.stringify({ error: "APPS_SCRIPT_URL manquant dans Netlify" })
  };

  let params = {};
  try {
    params = event.body ? JSON.parse(event.body) : (event.queryStringParameters || {});
  } catch(e) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Corps invalide" }) };
  }

  const qs = Object.entries(params)
    .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v)))
    .join('&');

  try {
    const response = await fetch(APPS_SCRIPT_URL + '?' + qs, { redirect: 'follow' });
    const text = await response.text();
    try { JSON.parse(text); } catch(e) {
      return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: "Apps Script non-JSON: " + text.slice(0,200) }) };
    }
    return { statusCode: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: text };
  } catch(err) {
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: "Proxy: " + err.message }) };
  }
};
