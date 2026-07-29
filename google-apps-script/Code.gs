const TIMEZONE = 'Asia/Kathmandu';
const SHEET_NAME = 'Orders';
const RECEIPTS_SHEET_NAME = 'Payment Receipts';
const HEADERS = [
  'Order ID', 'Order Date', 'Order Time', 'Customer Name', 'Primary Phone', 'Customer Email',
  'Full Address', 'Delivery Location', 'Selected Color', 'Quantity',
  'Unit Price', 'Subtotal', 'Delivery Charge', 'Total Amount', 'Payment Method', 'Transaction Code',
  'Payment Status', 'Order Status', 'Last Updated', 'Payment Receipt'
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
  compactOrders_(sheet);
  const receipts = ensureReceiptsSheet_(spreadsheet);
  syncReceipts_(sheet, receipts);
  removeOtherSheets_(spreadsheet, sheet, receipts);

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
    const orderRow = nextOrderRow_(sheet);
    sheet.getRange(orderRow, 1, 1, HEADERS.length).setValues([row.concat('')]);
    const receiptSheet = spreadsheet.getSheetByName(RECEIPTS_SHEET_NAME);
    const receiptRow = receiptSheet.getLastRow() ? receiptSheet.getLastRow() + 2 : 1;
    renderReceiptBlock_(receiptSheet, receiptRow, row);
    sheet.getRange(orderRow, HEADERS.length).setFormula(`=HYPERLINK("#gid=${receiptSheet.getSheetId()}&range=A${receiptRow}:B${receiptRow + 22}","Print receipt")`);
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
  sheet.setColumnWidth(HEADERS.length, 120);
  sheet.getRange(2, HEADERS.length, Math.max(sheet.getMaxRows() - 1, 1), 1).setWrap(false).setVerticalAlignment('middle');
  sheet.getRange(2, 12, Math.max(sheet.getMaxRows() - 1, 1), 5).setNumberFormat('0');
}

function compactOrders_(sheet) {
  const rowCount = Math.max(sheet.getMaxRows() - 1, 1);
  const rows = sheet.getRange(2, 1, rowCount, HEADERS.length).getValues()
    .filter(row => String(row[0] || '').trim());
  rows.forEach(row => { row[HEADERS.length - 1] = ''; });
  sheet.getRange(2, 1, rowCount, HEADERS.length).clearContent();
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
    sheet.setRowHeights(2, rows.length, 30);
  }
}

function removeOtherSheets_(spreadsheet, ordersSheet, receiptsSheet) {
  spreadsheet.getSheets().slice().forEach(sheet => {
    if (![ordersSheet.getSheetId(), receiptsSheet.getSheetId()].includes(sheet.getSheetId())) spreadsheet.deleteSheet(sheet);
  });
}

function nextOrderRow_(sheet) {
  const values = sheet.getRange(2, 1, Math.max(sheet.getMaxRows() - 1, 1), 1).getValues();
  for (let i = 0; i < values.length; i += 1) if (!String(values[i][0] || '').trim()) return i + 2;
  sheet.insertRowAfter(sheet.getMaxRows());
  return sheet.getMaxRows();
}

function ensureReceiptsSheet_(spreadsheet) {
  let receipt = spreadsheet.getSheetByName(RECEIPTS_SHEET_NAME);
  let shouldFormat = false;
  if (!receipt) { receipt = spreadsheet.insertSheet(RECEIPTS_SHEET_NAME); shouldFormat = true; }
  if (shouldFormat) formatReceiptsSheet_(receipt);
  return receipt;
}

function syncReceipts_(ordersSheet, receiptsSheet) {
  const orderRows = ordersSheet.getRange(2, 1, Math.max(ordersSheet.getMaxRows() - 1, 1), HEADERS.length).getValues().filter(row => String(row[0] || '').trim());
  receiptsSheet.clear();
  formatReceiptsSheet_(receiptsSheet);
  orderRows.forEach((row, index) => {
    const receiptRow = index ? 1 + index * 21 : 1;
    renderReceiptBlock_(receiptsSheet, receiptRow, row);
    ordersSheet.getRange(index + 2, HEADERS.length).setFormula(`=HYPERLINK("#gid=${receiptsSheet.getSheetId()}&range=A${receiptRow}:B${receiptRow + 22}","Print receipt")`);
  });
}

function formatReceiptsSheet_(sheet) {
  sheet.setHiddenGridlines(true);
  sheet.setColumnWidth(1, 190);
  sheet.setColumnWidth(2, 390);
}

function renderReceiptBlock_(sheet, startRow, row) {
  sheet.getRange(startRow, 1, 1, 2).merge().setValue('BreezePod Nepal — PAYMENT RECEIPT');
  sheet.getRange(startRow + 1, 1, 1, 2).merge().setValue(`Order ID: ${row[0]}  ·  ${displayDate_(row[1], 'yyyy-MM-dd')} ${displayDate_(row[2], 'hh:mm a')}`);
  const productImage = {
    Pink: 'https://breeze-pod.vercel.app/assets/product-hero.png', Green: 'https://breeze-pod.vercel.app/assets/product-green.png',
    Yellow: 'https://breeze-pod.vercel.app/assets/product-yellow.png', Orange: 'https://breeze-pod.vercel.app/assets/product-orange.png',
    'Mint / Navy': 'https://breeze-pod.vercel.app/assets/product-mint.png', 'Burgundy / Cream': 'https://breeze-pod.vercel.app/assets/product-burgundy.png', 'White / Navy': 'https://breeze-pod.vercel.app/assets/product-navy.png'
  }[row[8]] || 'https://breeze-pod.vercel.app/assets/product-hero.png';
  sheet.getRange(startRow + 3, 1).setFormula(`=IMAGE("${productImage}",4,120,120)`);
  sheet.getRange(startRow + 3, 2).setValue(`BreezePod Mini Fan\n${row[8]} · ${row[9]} ${Number(row[9]) === 1 ? 'unit' : 'units'}`);
  sheet.getRange(startRow + 5, 1, 1, 2).merge().setValue('CUSTOMER & DELIVERY DETAILS');
  const fields = [
    ['Customer name', row[3]], ['Phone number', row[4]], ['Email', row[5] || '—'],
    ['Full delivery address', row[6]], ['Delivery location', row[7]],
    ['Payment method', row[14]], ['Transaction code', row[15] || '—'], ['Payment status', row[16]],
    ['Product price', `Rs. ${row[11]}`], ['Delivery charge', `Rs. ${row[12]}`], ['TOTAL PAYABLE', `Rs. ${row[13]}`]
  ];
  sheet.getRange(startRow + 6, 1, fields.length, 2).setValues(fields).setWrap(true).setVerticalAlignment('top');
  sheet.getRange(startRow, 1, 1, 2).setFontSize(16).setFontWeight('bold').setBackground('#173b36').setFontColor('#ffffff').setHorizontalAlignment('center');
  sheet.getRange(startRow + 1, 1, 1, 2).setFontStyle('italic').setFontColor('#6b7d76').setHorizontalAlignment('center');
  sheet.getRange(startRow + 3, 2).setFontSize(15).setFontWeight('bold').setFontColor('#173b36').setVerticalAlignment('middle');
  sheet.getRange(startRow + 5, 1, 1, 2).setFontWeight('bold').setFontColor('#f67252').setBackground('#fff4ed');
  sheet.getRange(startRow + 6, 1, fields.length, 1).setFontWeight('bold').setFontColor('#6b7d76');
  sheet.getRange(startRow + 6, 1, fields.length, 2).setBorder(false, false, true, false, false, false, '#e8e4d9', SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange(startRow + 6 + fields.length - 1, 1, 1, 2).setFontSize(18).setFontWeight('bold').setBackground('#f4d47b');
  sheet.setRowHeight(startRow, 32);
  sheet.setRowHeight(startRow + 1, 24);
  sheet.setRowHeight(startRow + 3, 135);
  sheet.autoResizeRows(startRow + 6, fields.length);
}

function displayDate_(value, format) {
  return value instanceof Date ? Utilities.formatDate(value, TIMEZONE, format) : String(value || '—');
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
