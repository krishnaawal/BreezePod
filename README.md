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

### 1. Run the automatic Google Sheet setup

1. Open [script.google.com](https://script.google.com/) and create a new Apps Script project.
2. Open `google-apps-script/Code.gs` from this repository.
3. Copy the complete file contents into the Apps Script editor, replacing the editor contents.
4. Click **Save**.
5. At the top of the Apps Script editor, open the function dropdown.
6. Select `setupBreezePodOrders`.
7. Click **Run**.
8. Approve the Google authorization prompts.
9. Open **Execution log** at the bottom of the Apps Script editor.

The setup function automatically creates:

- Google spreadsheet: `BreezePod Nepal Orders`
- Worksheet: `Orders`
- All order columns
- Nepal timezone: `Asia/Kathmandu`
- Script Property: `SPREADSHEET_ID`
- Script Property: `ORDER_API_SECRET`

It does not delete existing order rows when run again.

### 2. Understand the two values shown in the execution log

The execution log returns values similar to this:

```text
spreadsheetUrl: https://docs.google.com/spreadsheets/d/1AbC...xyz/edit
orderApiSecret: 9f3a...long-random-secret...
```

These two values have different purposes:

#### `spreadsheetUrl`

You do **not** paste `spreadsheetUrl` into the website, Vercel, or `.env` file.

Use it only to open your order spreadsheet and view incoming orders. The spreadsheet ID is already stored automatically inside Apps Script as the `SPREADSHEET_ID` Script Property.

#### `orderApiSecret`

This is private. Copy only the value after `orderApiSecret:` and use it as the value of `ORDER_API_SECRET` in Vercel.

Do not include:

- `orderApiSecret:`
- quotation marks
- spaces
- backticks

Example:

```text
Execution log:
orderApiSecret: abc123longrandomvalue
```

Copy:

```text
abc123longrandomvalue
```

### 3. Deploy the Apps Script Web App and copy the `/exec` URL

1. In Apps Script, click **Deploy → New deployment**.
2. Select **Web app** as the deployment type.
3. Set **Execute as** to **Me** or your Google account.
4. Set **Who has access** to **Anyone**.
5. Click **Deploy**.
6. Copy the **Web app URL**.

The URL should look like this:

```text
https://script.google.com/macros/s/DEPLOYMENT_ID/exec
```

The `/exec` ending is required. Do not copy the Apps Script editor URL and do not copy the `/dev` test URL.

You paste this complete `/exec` URL into Vercel as the value of `GOOGLE_APPS_SCRIPT_URL`.

### 4. Exact Vercel environment-variable setup

Open your Vercel project:

```text
Vercel Dashboard
  → BreezePod project
  → Settings
  → Environment Variables
  → Add New
```

Add the first variable:

```text
Name:
GOOGLE_APPS_SCRIPT_URL

Value:
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

Replace the example value with the complete Web App URL copied in Step 3, including `/exec`.

Add the second variable:

```text
Name:
ORDER_API_SECRET

Value:
the-orderApiSecret-value-from-the-execution-log
```

The `ORDER_API_SECRET` value must exactly match the secret generated by `setupBreezePodOrders`.

Select **Production** for both variables. If you also use Vercel Preview deployments, select **Preview** as well. Then click **Save** and redeploy the project.

Your Vercel settings should ultimately look like this:

| Vercel variable name | Paste this value | Where to get it |
| --- | --- | --- |
| `GOOGLE_APPS_SCRIPT_URL` | Full URL ending in `/exec` | Apps Script → Deploy → Web app |
| `ORDER_API_SECRET` | Secret string only | Apps Script execution log |

Do not add `NEXT_PUBLIC_` to either name.

### 5. Local `.env` file

For local Vercel development, open `/Users/krishna/Documents/BreezePod/.env` and fill it like this:

```env
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
ORDER_API_SECRET=the-orderApiSecret-value-from-the-execution-log
```

The `.env` file is ignored by Git and is not pushed to GitHub. The committed `.env.example` file contains placeholders only.

### 6. Verify the complete order flow

1. Redeploy Vercel after adding the variables.
2. Open the live product page.
3. Select a color and quantity.
4. Click **Buy now**.
5. Complete the checkout form.
6. Select Inside or Outside Kathmandu Valley.
7. Select COD or QR Payment.
8. For QR Payment, enter the transaction code.
9. Submit the order.
10. Open the spreadsheet using `spreadsheetUrl` from the Apps Script log.
11. Confirm that the order appears as a new row.

If the order does not save, check the Vercel Function Logs first. The most common causes are an incorrect `/exec` URL, a secret mismatch, or the Apps Script deployment not being set to **Anyone**.

The Apps Script checks the shared secret, validates totals again, prevents duplicate order IDs with `LockService`, protects against spreadsheet formula injection, and writes Nepal date/time using `Asia/Kathmandu`.

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
