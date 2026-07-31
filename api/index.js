const crypto = require('crypto');

const SHEETS = {
  menu: '菜單', orders: '訂購明細', summary: '統計總覽',
  sugar: '甜度統計', ice: '冰塊統計', shop: '店家訂單', distribution: '發送核對',
};
const HEADERS = {
  menu: ['品項', '分類', '是否供應', '預設價格'],
  orders: ['訂單編號', '提交時間', '姓名', '電話', '飲料品項', '分類', '數量', '甜度', '冰塊', '備註', '狀態', '發送時間'],
  summary: ['統計更新時間', '總杯數', '訂購人數', '已發送杯數', '未發送杯數'],
  ratio: ['選項', '杯數', '比例'],
  shop: ['飲料品項', '甜度', '冰塊', '杯數', '訂購人數', '備註'],
  distribution: ['訂單編號', '姓名', '飲料品項', '數量', '甜度', '冰塊', '備註', '發送狀態', '發送時間'],
};

const base64url = value => Buffer.from(value).toString('base64url');
const sheetId = () => required('GOOGLE_SHEET_ID');
function required(name) { if (!process.env[name]) throw new Error(`缺少 Vercel 環境變數：${name}`); return process.env[name]; }
function json(res, status, body) { res.status(status).json(body); }

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: required('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(required('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n'), 'base64url');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${payload}.${signature}` }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || 'Google 授權失敗');
  return data.access_token;
}

async function google(path, options = {}) {
  const token = await accessToken();
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId()}${path}`, {
    ...options, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Google Sheet 操作失敗');
  return data;
}
const range = text => encodeURIComponent(text);
async function getValues(a1) { return (await google(`/values/${range(a1)}`)).values || []; }
async function setValues(a1, values) { return google(`/values/${range(a1)}?valueInputOption=RAW`, { method: 'PUT', body: JSON.stringify({ values }) }); }
async function clearValues(a1) { return google(`/values/${range(a1)}:clear`, { method: 'POST', body: '{}' }); }
async function appendValues(a1, values) { return google(`/values/${range(a1)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, { method: 'POST', body: JSON.stringify({ values }) }); }

async function ensureSheet(name, headers, samples) {
  const book = await google('?fields=sheets.properties');
  if (!book.sheets.some(s => s.properties.title === name)) {
    await google(':batchUpdate', { method: 'POST', body: JSON.stringify({ requests: [{ addSheet: { properties: { title: name } } }] }) });
  }
  const existing = await getValues(`${name}!A1:Z1`);
  if (!existing.length) await setValues(`${name}!A1`, [headers, ...(samples || [])]);
}
async function setup() {
  await ensureSheet(SHEETS.menu, HEADERS.menu, [
    ['茉莉綠茶', '找好茶', '是', 'M30 / L35'], ['阿薩姆紅茶', '找好茶', '是', 'M30 / L35'], ['四季春青茶', '找好茶', '是', 'M30 / L35'], ['黃金烏龍', '找好茶', '是', 'M30 / L35'],
    ['檸檬綠', '找好茶', '是', 'M35 / L45'], ['梅の綠', '找好茶', '是', 'M35 / L45'], ['8冰綠', '找好茶', '是', 'M40 / L55'], ['桔子綠', '找好茶', '是', 'M40 / L55'], ['多多綠', '找好茶', '是', 'M50 / L65'],
    ['奶茶', '找奶茶', '是', 'M40 / L55'], ['奶綠', '找奶茶', '是', 'M40 / L55'], ['烏龍奶茶', '找奶茶', '是', 'M40 / L55'], ['珍珠奶茶', '找奶茶', '是', 'M45 / L60'], ['波霸奶茶', '找奶茶', '是', 'M45 / L60'], ['布丁奶茶', '找奶茶', '是', 'M45 / L60'], ['冰淇淋奶茶', '找奶茶', '是', 'M45 / L60'],
    ['紅茶拿鐵', '找拿鐵', '是', 'M50 / L65'], ['烏龍拿鐵', '找拿鐵', '是', 'M50 / L65'], ['四季春拿鐵', '找拿鐵', '是', 'M50 / L65'], ['珍珠紅茶拿鐵', '找拿鐵', '是', 'M55 / L75'], ['波霸紅茶拿鐵', '找拿鐵', '是', 'M55 / L75'], ['布丁紅茶拿鐵', '找拿鐵', '是', 'M55 / L75'],
    ['旺來紅', '找新鮮', '是', 'M40 / L55'], ['旺來綠', '找新鮮', '是', 'M40 / L55'], ['旺來青', '找新鮮', '是', 'M40 / L55'], ['柚子紅', '找新鮮', '是', 'M45 / L60'], ['柚子綠', '找新鮮', '是', 'M45 / L60'], ['鮮柚綠', '找新鮮', '是', 'M50 / L65'],
    ['檸檬多多', '季節限定', '是', 'M50 / L65'], ['蜂蜜檸檬', '季節限定', '是', 'M55 / L75'],
  ]);
  await ensureSheet(SHEETS.orders, HEADERS.orders); await ensureSheet(SHEETS.summary, HEADERS.summary);
  await ensureSheet(SHEETS.sugar, HEADERS.ratio); await ensureSheet(SHEETS.ice, HEADERS.ratio);
  await ensureSheet(SHEETS.shop, HEADERS.shop); await ensureSheet(SHEETS.distribution, HEADERS.distribution);
  await refreshReports();
}
function objects(rows, headers) { return rows.slice(1).filter(r => r[0]).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? '']))); }
async function orders() { return objects(await getValues(`${SHEETS.orders}!A:L`), HEADERS.orders); }
async function writeBody(name, headers, rows) { await clearValues(`${name}!A:Z`); await setValues(`${name}!A1`, [headers, ...rows]); }
function ratioRows(rows, field, total) {
  const counts = {};
  rows.forEach(row => counts[row[field] || '未填寫'] = (counts[row[field] || '未填寫'] || 0) + Number(row['數量'] || 0));
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b, 'zh-Hant')).map(key => [key, counts[key], total ? counts[key] / total : 0]);
}
async function refreshReports() {
  const rows = await orders(); const total = rows.reduce((n, r) => n + Number(r['數量'] || 0), 0);
  const delivered = rows.filter(r => r['狀態'] === '已發送').reduce((n, r) => n + Number(r['數量'] || 0), 0);
  const grouped = {};
  rows.forEach(r => {
    const key = [r['飲料品項'], r['甜度'], r['冰塊']].join('|');
    if (!grouped[key]) grouped[key] = { drink: r['飲料品項'], sugar: r['甜度'], ice: r['冰塊'], cups: 0, people: 0, notes: [] };
    grouped[key].cups += Number(r['數量'] || 0); grouped[key].people += 1;
    if (r['備註']) grouped[key].notes.push(`${r['姓名']}：${r['備註']}`);
  });
  await writeBody(SHEETS.summary, HEADERS.summary, [[new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }), total, new Set(rows.map(r => r['姓名'])).size, delivered, total - delivered]]);
  await writeBody(SHEETS.sugar, HEADERS.ratio, ratioRows(rows, '甜度', total));
  await writeBody(SHEETS.ice, HEADERS.ratio, ratioRows(rows, '冰塊', total));
  await writeBody(SHEETS.shop, HEADERS.shop, Object.values(grouped).sort((a,b) => a.drink.localeCompare(b.drink, 'zh-Hant')).map(x => [x.drink, x.sugar, x.ice, x.cups, x.people, x.notes.join('；')]));
  await writeBody(SHEETS.distribution, HEADERS.distribution, rows.map(r => [r['訂單編號'], r['姓名'], r['飲料品項'], r['數量'], r['甜度'], r['冰塊'], r['備註'], r['狀態'], r['發送時間']]));
}
function admin(req) { return process.env.ADMIN_TOKEN && req.headers['x-admin-token'] === process.env.ADMIN_TOKEN; }

module.exports = async (req, res) => {
  try {
    const action = req.query.action;
    if (action === 'setup' && req.method === 'POST') { if (!admin(req)) return json(res, 401, { error: '管理密鑰不正確' }); await setup(); return json(res, 200, { ok: true }); }
    if (action === 'menu' && req.method === 'GET') {
      const menu = objects(await getValues(`${SHEETS.menu}!A:D`), HEADERS.menu).filter(r => r['是否供應'] === '是').map(r => ({ name: r['品項'], category: r['分類'], price: r['預設價格'] }));
      return json(res, 200, { menu, sugarOptions: ['正常糖', '少糖', '半糖', '微糖', '一分糖', '無糖'], iceOptions: ['正常冰', '少冰', '微冰', '去冰', '常溫', '熱'] });
    }
    if (action === 'order' && req.method === 'POST') {
      const p = req.body || {}; const name = String(p.name || '').trim().slice(0, 40); const phone = String(p.phone || '').trim().slice(0, 30); const selected = Array.isArray(p.items) ? p.items : [];
      if (!name || !selected.length || selected.length > 20) return json(res, 400, { error: '請填寫姓名，並至少完成一杯飲料的選購。' });
      const menu = objects(await getValues(`${SHEETS.menu}!A:D`), HEADERS.menu);
      const batchNo = `${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
      const time = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
      const rows = selected.map((choice, index) => {
        const qty = Number(choice.quantity); const item = menu.find(r => r['品項'] === choice.drink && r['是否供應'] === '是');
        if (!item || !choice.sugar || !choice.ice || !Number.isInteger(qty) || qty < 1 || qty > 10) throw new Error('有飲料尚未完整選擇品項、甜度、冰塊或數量。');
        return [`${batchNo}-${String(index + 1).padStart(2, '0')}`, time, name, phone, item['品項'], item['分類'], qty, choice.sugar, choice.ice, String(choice.note || '').trim().slice(0, 200), '待發送', ''];
      });
      await appendValues(`${SHEETS.orders}!A:L`, rows);
      await refreshReports(); return json(res, 201, { batchNo, message: `訂購成功！共 ${rows.length} 種飲料，訂單編號：${batchNo}` });
    }
    if (action === 'distribution' && req.method === 'GET') {
      const rows = await orders(); return json(res, 200, { rows: rows.map(r => ({ orderNo: r['訂單編號'], name: r['姓名'], drink: r['飲料品項'], quantity: r['數量'], sugar: r['甜度'], ice: r['冰塊'], note: r['備註'], status: r['狀態'] })) });
    }
    if (action === 'orders' && req.method === 'GET') {
      if (!admin(req)) return json(res, 401, { error: '管理密鑰不正確' });
      const rows = await orders();
      return json(res, 200, { rows: rows.map(r => ({ orderNo: r['訂單編號'], time: r['提交時間'], name: r['姓名'], phone: r['電話'], drink: r['飲料品項'], category: r['分類'], quantity: r['數量'], sugar: r['甜度'], ice: r['冰塊'], note: r['備註'], status: r['狀態'] })) });
    }
    if (action === 'deliver' && req.method === 'POST') {
      if (!admin(req)) return json(res, 401, { error: '管理密鑰不正確' }); const orderNo = req.body?.orderNo;
      const values = await getValues(`${SHEETS.orders}!A:L`); const rowIndex = values.findIndex((r, i) => i > 0 && r[0] === orderNo);
      if (rowIndex < 1) return json(res, 404, { error: '找不到訂單。' });
      await setValues(`${SHEETS.orders}!K${rowIndex + 1}:L${rowIndex + 1}`, [['已發送', new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })]]); await refreshReports(); return json(res, 200, { ok: true });
    }
    return json(res, 404, { error: '找不到功能。' });
  } catch (error) { console.error(error); return json(res, 500, { error: error.message || '系統錯誤' }); }
};
