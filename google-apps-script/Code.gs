const SHEETS = {
  menu: '菜單', orders: '訂購明細', summary: '統計總覽', sugar: '甜度統計',
  ice: '冰塊統計', shop: '店家整合訂單', distribution: '發送核對'
};
const SPREADSHEET_ID = '1lt-SV8wy5WQfBNGLeLP_2PFB1A0vWPjv6Y1UvkIT3Mc';
const HEADERS = {
  menu: ['品項', '分類', '是否供應', '預設價格'],
  orders: ['訂單編號', '提交時間', '姓名', '電話', '飲料品項', '分類', '數量', '甜度', '冰塊', '備註', '狀態', '發送時間'],
  summary: ['飲料品項', '分類', '數量', '甜度', '冰塊'],
  sugar: ['甜度', '杯數'], ice: ['冰塊', '杯數'],
  shop: ['分類', '飲料品項', '數量', '甜度', '冰塊', '備註'],
  distribution: ['訂單編號', '姓名', '電話', '飲料品項', '數量', '甜度', '冰塊', '備註', '狀態', '發送時間']
};
const SAMPLE_MENU = [
  ['茉莉綠茶', '找好茶', '是', 'M30 / L35'], ['阿薩姆紅茶', '找好茶', '是', 'M30 / L35'],
  ['四季春青茶', '找好茶', '是', 'M30 / L35'], ['黃金烏龍', '找好茶', '是', 'M30 / L35'],
  ['檸檬綠', '找新鮮', '是', 'M35 / L45'], ['梅の綠', '找新鮮', '是', 'M35 / L45'],
  ['8冰綠', '找好茶', '是', 'M40 / L55'], ['桔子綠', '找新鮮', '是', 'M40 / L55'],
  ['奶茶', '找奶茶', '是', 'M40 / L55'], ['奶綠', '找奶茶', '是', 'M40 / L55'],
  ['烏龍奶茶', '找奶茶', '是', 'M40 / L55'], ['珍珠奶茶', '找奶茶', '是', 'M45 / L60'],
  ['波霸奶茶', '找奶茶', '是', 'M45 / L60'], ['紅茶拿鐵', '找拿鐵', '是', 'M50 / L65'],
  ['烏龍拿鐵', '找拿鐵', '是', 'M50 / L65'], ['珍珠紅茶拿鐵', '找拿鐵', '是', 'M55 / L75'],
  ['旺來綠', '找新鮮', '是', 'M40 / L55'], ['柚子綠', '找新鮮', '是', 'M45 / L60'],
  ['鮮柚綠', '找新鮮', '是', 'M50 / L65'], ['檸檬多多', '季節限定', '是', 'M50 / L65'],
  ['蜂蜜檸檬', '季節限定', '是', 'M55 / L75'], ['冰淇淋紅茶', '找冰淇淋', '是', 'M45 / L60']
];

function doGet(e) {
  try {
    setup();
    const action = (e.parameter && e.parameter.action) || 'menu';
    if (action === 'menu') return json({ menu: menuItems() });
    if (action === 'distribution') return json({ rows: objects(SHEETS.distribution, HEADERS.distribution) });
    return json({ error: '未知操作' });
  } catch (error) { return json({ error: error.message }); }
}

function doPost(e) {
  try {
    setup();
    const body = JSON.parse((e.postData && e.postData.contents) || '{}');
    if (body.action !== 'order') return json({ error: '未知操作' });
    return json(submitOrder(body));
  } catch (error) { return json({ error: error.message }); }
}

function json(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function spreadsheet() { return SpreadsheetApp.openById(SPREADSHEET_ID); }
function ensure(name, headers, rows) {
  const book = spreadsheet(); let sheet = book.getSheetByName(name);
  if (!sheet) sheet = book.insertSheet(name);
  if (!sheet.getLastRow()) { sheet.getRange(1, 1, 1, headers.length).setValues([headers]); if (rows && rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows); sheet.setFrozenRows(1); }
  return sheet;
}
function setup() {
  ensure(SHEETS.menu, HEADERS.menu, SAMPLE_MENU); ensure(SHEETS.orders, HEADERS.orders);
  ensure(SHEETS.summary, HEADERS.summary); ensure(SHEETS.sugar, HEADERS.sugar); ensure(SHEETS.ice, HEADERS.ice);
  ensure(SHEETS.shop, HEADERS.shop); ensure(SHEETS.distribution, HEADERS.distribution);
}
function values(name) { const sheet = spreadsheet().getSheetByName(name); return sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues() : []; }
function objects(name, headers) { return values(name).map(row => headers.reduce((item, key, index) => (item[key] = row[index], item), {})); }
function menuItems() { return objects(SHEETS.menu, HEADERS.menu).filter(item => item['是否供應'] === '是').map(item => ({ name: item['品項'], category: item['分類'], price: item['預設價格'] })); }
function submitOrder(body) {
  const name = String(body.name || '').trim(); const phone = String(body.phone || '').trim(); const items = body.items;
  if (!name) throw new Error('訂購人姓名為必填'); if (!Array.isArray(items) || !items.length) throw new Error('請至少選擇一杯飲料');
  const menu = menuItems(); const byName = menu.reduce((map, item) => (map[item.name] = item, map), {});
  const orderNo = 'QY' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss') + Math.floor(Math.random() * 900 + 100);
  const now = new Date(); const rows = items.map(item => {
    const drink = byName[item.drink]; const quantity = Number(item.quantity);
    if (!drink || !Number.isInteger(quantity) || quantity < 1 || quantity > 10 || !item.sugar || !item.ice) throw new Error('訂單品項或客製內容不完整');
    return [orderNo, now, name, phone, drink.name, drink.category, quantity, item.sugar, item.ice, String(item.note || '').trim(), '待發送', ''];
  });
  spreadsheet().getSheetByName(SHEETS.orders).getRange(spreadsheet().getSheetByName(SHEETS.orders).getLastRow() + 1, 1, rows.length, HEADERS.orders.length).setValues(rows);
  refreshReports(); return { ok: true, message: `訂單已送出，訂單編號：${orderNo}`, orderNo: orderNo };
}
function replaceRows(name, headers, rows) { const sheet = spreadsheet().getSheetByName(name); sheet.clearContents(); sheet.getRange(1, 1, 1, headers.length).setValues([headers]); if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows); sheet.setFrozenRows(1); }
function refreshReports() {
  const rows = objects(SHEETS.orders, HEADERS.orders); const add = (map, key, item) => map[key] ? map[key].count += Number(item['數量']) : map[key] = { item: item, count: Number(item['數量']) };
  const summary = {}; const sugar = {}; const ice = {}; const shop = {};
  rows.forEach(item => { add(summary, [item['飲料品項'], item['分類'], item['甜度'], item['冰塊']].join('|'), item); add(sugar, item['甜度'], item); add(ice, item['冰塊'], item); add(shop, [item['分類'], item['飲料品項'], item['甜度'], item['冰塊'], item['備註']].join('|'), item); });
  replaceRows(SHEETS.summary, HEADERS.summary, Object.keys(summary).map(key => { const v = summary[key]; return [v.item['飲料品項'], v.item['分類'], v.count, v.item['甜度'], v.item['冰塊']]; }));
  replaceRows(SHEETS.sugar, HEADERS.sugar, Object.keys(sugar).map(key => [key, sugar[key].count])); replaceRows(SHEETS.ice, HEADERS.ice, Object.keys(ice).map(key => [key, ice[key].count]));
  replaceRows(SHEETS.shop, HEADERS.shop, Object.keys(shop).map(key => { const v = shop[key]; return [v.item['分類'], v.item['飲料品項'], v.count, v.item['甜度'], v.item['冰塊'], v.item['備註']]; }));
  replaceRows(SHEETS.distribution, HEADERS.distribution, rows.map(item => [item['訂單編號'], item['姓名'], item['電話'], item['飲料品項'], item['數量'], item['甜度'], item['冰塊'], item['備註'], item['狀態'], item['發送時間']]));
}
