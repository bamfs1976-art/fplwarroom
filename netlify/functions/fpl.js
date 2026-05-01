// FPL API proxy — runs server-side on Netlify, no CORS issues
// Called from the app as: /.netlify/functions/fpl?path=bootstrap-static/

exports.handler = async (event) => {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  const { path } = event.queryStringParameters || {};

  if (!path) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: 'Missing ?path= parameter' }),
    };
  }

  // Whitelist: only allow known FPL API paths
  // Note: use $ (not \$) for end-of-string anchor in JS regex literals
  const ALLOWED = /^(bootstrap-static|fixtures|event-status|dream-team\/\d+|team\/set-piece-notes|event\/\d+\/live|entry\/\d+\/?|entry\/\d+\/event\/\d+\/picks|entry\/\d+\/history|entry\/\d+\/transfers|leagues-classic\/\d+\/standings)\/?$/;

  const cleanPath = path.replace(/\/$/, '');

  if (!ALLOWED.test(cleanPath)) {
    return {
      statusCode: 403,
      headers: CORS,
      body: JSON.stringify({ error: 'Path not permitted', path }),
    };
  }

  const url = 'https://fantasy.premierleague.com/api/' + path;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FPLWarRoom/4.0)',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      return {
        statusCode: res.status,
        headers: CORS,
        body: JSON.stringify({ error: `FPL API returned ${res.status}` }),
      };
    }

    const data = await res.json();
    return {
      statusCode: 200,
      headers: {
        ...CORS,
        'Cache-Control': path.includes('live') ? 'public, max-age=30' : 'public, max-age=300',
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error('FPL proxy error:', err.message);
    return {
      statusCode: 502,
      headers: CORS,
      body: JSON.stringify({ error: 'Failed to reach FPL API', detail: err.message }),
    };
  }
};
