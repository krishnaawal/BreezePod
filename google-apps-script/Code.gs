const TIMEZONE = 'Asia/Kathmandu';
const SHEET_NAME = 'Orders';
const HEADERS = [
  'Order ID', 'Order Date', 'Order Time', 'Customer Name', 'Primary Phone', 'Customer Email',
  'Full Address', 'Delivery Location', 'Selected Color', 'Quantity',
  'Unit Price', 'Subtotal', 'Delivery Charge', 'Total Amount', 'Payment Method', 'Transaction Code',
  'Payment Status', 'Order Status', 'Last Updated'
];
const COLORS = ['Pink', 'Green', 'Yellow', 'Orange', 'Mint / Navy', 'Burgundy / Cream', 'White / Navy'];
const DELIVERY_CHARGES = { 'Inside Kathmandu Valley': 100, 'Outside Kathmandu Valley': 150 };
const UNIT_PRICE = 399;

/**
 * Run this function once from the Apps Script editor.
 * It creates/configures the spreadsheet, worksheet, headers, timezone,
 * Script Properties, and a long API secret without deleting existing orders.
 */
function setupBreezePodOrders() {
  const properties = PropertiesService.getScriptProperties();
  let spreadsheetId = properties.getProperty('SPREADSHEET_ID');
  let spreadsheet = null;

  if (spreadsheetId) {
    try { spreadsheet = SpreadsheetApp.openById(spreadsheetId); } catch (_) { spreadsheet = null; }
  }
  if (!spreadsheet) {
    spreadsheet = SpreadsheetApp.create('BreezePod Nepal Orders');
    spreadsheetId = spreadsheet.getId();
    properties.setProperty('SPREADSHEET_ID', spreadsheetId);
  }

  spreadsheet.setSpreadsheetTimeZone(TIMEZONE);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (sheet && !headersMatch_(sheet)) {
    const archiveName = `Orders Archive ${Utilities.formatDate(new Date(), TIMEZONE, 'yyyyMMdd-HHmmss')}`;
    sheet.setName(archiveName);
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  } else if (!sheet) {
    const firstSheet = spreadsheet.getSheets()[0];
    if (spreadsheet.getSheets().length === 1 && firstSheet.getLastRow() === 0) {
      firstSheet.setName(SHEET_NAME);
      sheet = firstSheet;
    } else {
      sheet = spreadsheet.insertSheet(SHEET_NAME);
    }
  }
  ensureHeaders_(sheet);
  formatOrdersSheet_(sheet);

  let secret = properties.getProperty('ORDER_API_SECRET');
  if (!secret) {
    secret = generateSecret_();
    properties.setProperty('ORDER_API_SECRET', secret);
  }
  Logger.log(JSON.stringify({
    message: 'Setup complete. Copy ORDER_API_SECRET into Vercel Environment Variables.',
    spreadsheetId,
    spreadsheetUrl: spreadsheet.getUrl(),
    orderApiSecret: secret
  }, null, 2));
  return { spreadsheetId, spreadsheetUrl: spreadsheet.getUrl(), orderApiSecret: secret };
}

function generateSecret_() {
  return `${Utilities.getUuid().replaceAll('-', '')}${Utilities.getUuid().replaceAll('-', '')}`;
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return json_({ success: false, error: 'POST required' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    if (!e || !e.postData || !String(e.postData.type || '').toLowerCase().startsWith('application/json')) return json_({ success: false, error: 'Invalid request' });
    if (e.postData.contents.length > 50000) return json_({ success: false, error: 'Payload too large' });
    const payload = JSON.parse(e.postData.contents);
    const properties = PropertiesService.getScriptProperties();
    if (!secretsEqual_(String(payload.secret || ''), String(properties.getProperty('ORDER_API_SECRET') || ''))) return json_({ success: false, error: 'Unauthorized' });
    const order = payload.order || {};
    validateOrder_(order);

    lock.waitLock(30000);
    const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) throw new Error('Missing spreadsheet configuration');
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Missing Orders sheet');
    ensureHeaders_(sheet);
    if (findOrderRow_(sheet, order.orderId) !== -1) return json_({ success: false, error: 'Duplicate order' });

    const now = new Date();
    const date = Utilities.formatDate(now, TIMEZONE, 'yyyy-MM-dd');
    const time = Utilities.formatDate(now, TIMEZONE, 'hh:mm a');
    const row = [
      order.orderId, date, time, order.customerName, order.primaryPhone, order.email || '', order.fullAddress,
      order.deliveryLocation || order.district, order.selectedColor, order.quantity,
      order.unitPrice, order.subtotal, order.deliveryCharge, order.totalAmount, order.paymentMethod, order.transactionCode || '',
      order.paymentStatus, order.orderStatus, `${date} ${time}`
    ].map(safeCell_);
    sheet.appendRow(row);
    return json_({ success: true, orderId: order.orderId });
  } catch (error) {
    return json_({ success: false, error: error.message === 'Duplicate order' ? 'Duplicate order' : 'Unable to save order' });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function validateOrder_(order) {
  if (!order.orderId || !/^BPN-\d{8}-[A-F0-9]{4}$/.test(order.orderId)) throw new Error('Invalid order');
  if (!order.customerName || !order.primaryPhone || !order.fullAddress) throw new Error('Missing required fields');
  if (!COLORS.includes(order.selectedColor)) throw new Error('Invalid color');
  if (!Object.prototype.hasOwnProperty.call(DELIVERY_CHARGES, order.deliveryLocation) && !Object.prototype.hasOwnProperty.call(DELIVERY_CHARGES, order.district)) throw new Error('Invalid delivery location');
  const deliveryLocation = order.deliveryLocation || order.district;
  const quantity = Number(order.quantity);
  const delivery = DELIVERY_CHARGES[deliveryLocation];
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw new Error('Invalid quantity');
  if (Number(order.unitPrice) !== UNIT_PRICE || Number(order.subtotal) !== UNIT_PRICE * quantity || Number(order.deliveryCharge) !== delivery || Number(order.totalAmount) !== UNIT_PRICE * quantity + delivery) throw new Error('Invalid totals');
  if (!['Cash on Delivery', 'QR Payment'].includes(order.paymentMethod)) throw new Error('Invalid payment');
  if (order.paymentMethod === 'QR Payment' && String(order.transactionCode || '').trim().length < 3) throw new Error('Missing transaction code');
}

function ensureHeaders_(sheet) {
  if (sheet.getMaxColumns() < HEADERS.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), HEADERS.length - sheet.getMaxColumns());
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  if (!headersMatch_(sheet)) throw new Error('Invalid sheet headers');
}

function headersMatch_(sheet) {
  if (sheet.getLastRow() === 0) return true;
  if (sheet.getMaxColumns() < HEADERS.length) return false;
  const current = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  return HEADERS.every((header, index) => current[index] === header);
}

function formatOrdersSheet_(sheet) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#173b36').setFontColor('#ffffff');
  sheet.getRange(1, 1, 1, HEADERS.length).setWrap(true);
  sheet.setRowHeight(1, 34);
  if (sheet.getMaxColumns() < HEADERS.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), HEADERS.length - sheet.getMaxColumns());
  sheet.autoResizeColumns(1, HEADERS.length);
  sheet.getRange(2, 12, Math.max(sheet.getMaxRows() - 1, 1), 5).setNumberFormat('0');
}

function findOrderRow_(sheet, orderId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i += 1) if (String(ids[i][0]) === String(orderId)) return i + 2;
  return -1;
}

function safeCell_(value) {
  const text = String(value == null ? '' : value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function secretsEqual_(left, right) {
  if (!left || !right || left.length !== right.length) return false;
  let result = 0;
  for (let i = 0; i < left.length; i += 1) result |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return result === 0;
}
