const readBody = req => typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

module.exports = async (req, res) => {
  try {
    const endpoint = process.env.APPS_SCRIPT_URL;
    if (!endpoint) return res.status(503).json({ error: '尚未設定 Google Apps Script 連線。' });

    const action = req.query.action || 'menu';
    const url = new URL(endpoint);
    url.searchParams.set('action', action);

    const options = { redirect: 'follow' };
    if (req.method === 'POST') {
      options.method = 'POST';
      options.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
      options.body = JSON.stringify({ action, ...readBody(req) });
    }

    const response = await fetch(url, options);
    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch { throw new Error('Google Sheet 後台回傳格式錯誤。'); }
    if (data && data.error) {
      console.error('Apps Script error:', data.error);
      return res.status(502).json({ error: data.error });
    }
    return res.status(response.ok ? 200 : 502).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message || '無法連線至 Google Sheet 後台。' });
  }
};
const readBody = req => typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

module.exports = async (req, res) => {
  try {
    const endpoint = process.env.APPS_SCRIPT_URL;
    if (!endpoint) return res.status(503).json({ error: '尚未設定 Google Apps Script 連線。' });

    const action = req.query.action || 'menu';
    const url = new URL(endpoint);
    url.searchParams.set('action', action);

    const options = { redirect: 'follow' };
    if (req.method === 'POST') {
      options.method = 'POST';
      options.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
      options.body = JSON.stringify({ action, ...readBody(req) });
    }

    const response = await fetch(url, options);
    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch { throw new Error('Google Sheet 後台回傳格式錯誤。'); }
    return res.status(response.ok ? 200 : 502).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message || '無法連線至 Google Sheet 後台。' });
  }
};
