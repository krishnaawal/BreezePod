# BreezePod Nepal

Mobile-first product storefront for the BreezePod rechargeable mini fan. The experience is designed for fast product discovery and conversion: customers see the product image, current price, color selection, delivery promise, and buying action before the longer product explanation.

## What is included

- Responsive product landing page in `index.html`
- Color variant selector with matching product images
- Product price of **Rs. 399**
- Separate checkout page in `checkout.html`
- Separate confirmation page in `thank-you.html`
- Kathmandu Valley delivery option: **Rs. 100**
- Outside Kathmandu Valley delivery option: **Rs. 150**
- Cash on Delivery payment option
- QR Payment option with the provided QR code
- Downloadable QR payment image
- Required transaction code for QR payments
- Live order invoice with product price, delivery charge, and total
- Local browser storage for the demo checkout flow
- Product images and clean marketing visuals in `assets/`

## Pages

### Product page

`index.html` is the sales-focused landing page. It includes:

- Product gallery
- Rating and social proof
- Product benefits
- Color choices
- Quantity controls
- Buy-now actions

The product page shows only the product price before checkout. Delivery is calculated on the checkout page.

### Checkout page

`checkout.html` contains:

- Full name
- Phone number
- Optional email
- Full delivery address
- Inside/Outside Kathmandu Valley delivery selection
- Cash on Delivery and QR Payment choices
- QR code and transaction-code field for QR payments
- Order invoice and final payable amount

### Thank-you page

`thank-you.html` displays the generated order number and final amount after checkout submission.

## Product pricing

| Item | Amount |
| --- | ---: |
| BreezePod Mini Fan | Rs. 399 |
| Inside Kathmandu Valley delivery | Rs. 100 |
| Outside Kathmandu Valley delivery | Rs. 150 |

For one fan, the checkout total is Rs. 499 inside Kathmandu Valley or Rs. 549 outside Kathmandu Valley.

## Run locally

This is a static website and does not require a build step.

Open `index.html` directly in a browser, or serve the folder with any static web server. For example:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173/`.

## Checkout behavior

The product page stores the selected color and quantity in `localStorage` under `breezepod-cart` before redirecting to checkout.

The checkout page calculates:

```text
subtotal = unit price × quantity
total = subtotal + selected delivery charge
```

When QR Payment is selected:

1. The QR image becomes visible.
2. The customer can download the QR code.
3. The transaction-code field becomes required.
4. The order is saved with `paymentStatus: Verification Pending`.

When Cash on Delivery is selected, the QR image and transaction-code field remain hidden and the order uses `paymentStatus: Pending`.

## Google Sheets order backend

Orders are sent through this protected flow:

```text
Checkout form
    ↓
Vercel /api/orders
    ↓  server-side secret
Google Apps Script Web App
    ↓
Google Sheet: BreezePod Nepal Orders / Orders
```

The browser never calls Apps Script directly. The Vercel function validates the form, recalculates the Rs. 399 product price and Rs. 100/Rs. 150 delivery charge, generates the order number, and forwards only sanitized data. QR orders are saved as `Verification Pending` and must be checked manually.

### 1. Let Apps Script create the Google Sheet automatically

1. Open [script.google.com](https://script.google.com/) and create a new project.
2. Copy the contents of `google-apps-script/Code.gs` into the Apps Script editor.
3. Select the function `setupBreezePodOrders` from the function dropdown.
4. Click **Run** and approve the Google permissions.
5. Open **Execution log** and copy the generated `spreadsheetUrl` and `orderApiSecret`.

The setup function creates `BreezePod Nepal Orders`, creates the `Orders` worksheet, inserts all required headers, formats the header row, freezes it, sets `Asia/Kathmandu`, stores `SPREADSHEET_ID` in Script Properties, and generates/stores `ORDER_API_SECRET`. It does not clear or overwrite existing order rows when run again.

The generated columns are:

```text
Order ID | Order Date | Order Time | Customer Name | Primary Phone | Customer Email | Alternate Phone | Province | District | Municipality or City | Area or Locality | Ward Number | Full Address | Nearby Landmark | Product ID | Product Name | Selected Color | Quantity | Unit Price | Subtotal | Delivery Charge | Total Amount | Payment Method | Transaction Code | Payment Screenshot URL | Payment Status | Order Status | Customer Note | Order Source | Confirmation Status | Admin Note | Last Updated
```

### 2. Deploy Google Apps Script

1. In Apps Script, click **Deploy → New deployment**.
2. Select **Web app**.
3. Set **Execute as** to your account.
4. Set **Who has access** to anyone.
5. Deploy and copy the Web app URL ending in `/exec`.

The Apps Script checks the shared secret, validates totals again, prevents duplicate order IDs with `LockService`, protects against spreadsheet formula injection, and writes Nepal date/time using `Asia/Kathmandu`.

### 3. Configure Vercel

`.env.example` contains the required variable names. A local `.env` file is also provided as an ignored template; put real local values there, but never commit it. The API reads secrets only through `process.env`.

In Vercel, open **Project Settings → Environment Variables** and add:

```text
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
ORDER_API_SECRET=the-same-long-random-secret
```

Add them for the Production environment, then redeploy. Never use `NEXT_PUBLIC_` for these variables, never place real secrets in the repository, and never expose the Apps Script URL in browser code.

### 4. Test locally

Use a Vercel-compatible local server so `/api/orders` is available. After installing the Vercel CLI, run:

```bash
vercel dev
```

Then open the local URL it provides. A plain `python3 -m http.server` server can preview the pages but cannot execute the Vercel order API.

### Order API files

- `api/orders.js` — secure Vercel serverless endpoint
- `google-apps-script/Code.gs` — Google Sheets writer and duplicate protection
- `.env.example` — safe environment-variable template

## Main files

```text
index.html       Product landing page
styles.css       Product page styles
app.js           Product selection and cart handoff
checkout.html    Checkout page
checkout.css     Checkout and thank-you page styles
checkout.js      Invoice, delivery, payment, and redirect logic
thank-you.html   Order confirmation page
assets/          Product visuals and QR payment image
```

## License and assets

Product assets are stored locally for this storefront project. Confirm that you have the right to use all product photography, generated marketing visuals, and the payment QR code before publishing the site commercially.
