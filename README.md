# BreezePod Nepal

Mobile-first storefront and order collection system for the BreezePod rechargeable mini fan.

## Customer flow

1. Customer chooses a color and quantity on `index.html`.
2. **Buy now** opens `checkout.html`.
3. Customer enters name, phone, optional email, and address.
4. Customer selects Inside or Outside Kathmandu Valley.
5. Delivery is calculated as Rs. 100 or Rs. 150.
6. Customer chooses COD or QR Payment.
7. QR customers see the QR image and must enter a transaction code.
8. Checkout sends the order to the secure Vercel API.
9. Vercel sends the order to Google Apps Script.
10. Apps Script appends the order to Google Sheets.
11. Customer is redirected to `thank-you.html`.

## Google Sheets order flow

```text
Customer browser → Vercel /api/orders → Google Apps Script → Google Sheet
```

The browser never calls Apps Script directly. Vercel validates the request, recalculates price and delivery, generates the order ID, and forwards sanitized data.

## Step 1: Create the Google Sheet automatically

1. Open [Google Apps Script](https://script.google.com/).
2. Click **New project**.
3. Open `google-apps-script/Code.gs` from this repository.
4. Copy the complete file into the Apps Script editor.
5. Click **Save**.
6. Select `setupBreezePodOrders` in the function dropdown.
7. Click **Run** and approve the Google permissions.
8. Open the **Execution log**.

The function automatically creates the `BreezePod Nepal Orders` spreadsheet, the `Orders` worksheet, all required columns, the `Asia/Kathmandu` timezone, the `SPREADSHEET_ID` Script Property, and the `ORDER_API_SECRET` Script Property.

If an old oversized `Orders` worksheet exists, it is renamed to `Orders Archive <timestamp>` and a clean `Orders` sheet is created. Existing rows are preserved and not deleted.

## Required `Orders` columns

The active sheet contains only fields used by the current checkout and order processing:

```text
Order ID
Order Date
Order Time
Customer Name
Primary Phone
Customer Email
Full Address
Delivery Location
Product ID
Product Name
Selected Color
Quantity
Unit Price
Subtotal
Delivery Charge
Total Amount
Payment Method
Transaction Code
Payment Status
Order Status
Last Updated
```

Each new order is appended as a new row.

## Step 2: Understand the Apps Script log values

After running the setup function, the log shows values similar to:

```text
spreadsheetUrl: https://docs.google.com/spreadsheets/d/1AbC...xyz/edit
orderApiSecret: 9f3a...long-random-secret...
```

### `spreadsheetUrl`

Do **not** paste this into Vercel, `.env`, or website code. Use it only to open the Google Sheet and view orders. The spreadsheet ID is stored automatically in Apps Script Properties.

### `orderApiSecret`

This is private. Copy only the value after `orderApiSecret:`. Do not copy the label, quotes, spaces, or backticks. Paste the secret value into Vercel as `ORDER_API_SECRET`.

## Step 3: Deploy the Apps Script Web App

1. In Apps Script, click **Deploy → New deployment**.
2. Choose **Web app**.
3. Set **Execute as** to **Me** or your Google account.
4. Set **Who has access** to **Anyone**.
5. Click **Deploy**.
6. Copy the **Web app URL**.

The correct URL ends with `/exec`:

```text
https://script.google.com/macros/s/DEPLOYMENT_ID/exec
```

Do not use the Apps Script editor URL or a URL ending in `/dev`. The full `/exec` URL becomes `GOOGLE_APPS_SCRIPT_URL` in Vercel.

## Step 4: Configure Vercel

Open:

```text
Vercel Dashboard → BreezePod project → Settings → Environment Variables → Add New
```

Add:

```text
Name: GOOGLE_APPS_SCRIPT_URL
Value: https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

Replace the example with the complete Web App URL, including `/exec`.

Add:

```text
Name: ORDER_API_SECRET
Value: the-secret-copied-from-the-Apps-Script-log
```

The secret must exactly match the generated Apps Script secret. Select **Production**, optionally select **Preview**, click **Save**, and redeploy.

| Vercel variable | What to paste | Source |
| --- | --- | --- |
| `GOOGLE_APPS_SCRIPT_URL` | Full URL ending in `/exec` | Apps Script Web App deployment |
| `ORDER_API_SECRET` | Secret string only | Apps Script execution log |

Never add `NEXT_PUBLIC_` to these names. Never expose them in browser code.

## Step 5: Local `.env`

For local Vercel development, fill in `/Users/krishna/Documents/BreezePod/.env`:

```env
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
ORDER_API_SECRET=the-secret-copied-from-the-Apps-Script-log
```

`.env` is ignored by Git. `.env.example` contains placeholders only.

## Step 6: Test

1. Redeploy Vercel after adding the variables.
2. Open the live product page.
3. Choose a color and quantity.
4. Click **Buy now**.
5. Complete checkout.
6. Choose delivery location.
7. Choose COD or QR Payment.
8. Enter the transaction code for QR Payment.
9. Submit the order.
10. Open the spreadsheet using `spreadsheetUrl` from the Apps Script log.
11. Confirm the new order appears as a new row.

For local API testing, use `vercel dev`; a plain static server cannot execute `/api/orders`.

## Security protections

- Apps Script URL and secret are server-side only.
- Product price and delivery are recalculated on Vercel and Apps Script.
- QR orders remain `Verification Pending` for manual review.
- Duplicate order IDs are rejected.
- `LockService` prevents simultaneous duplicate inserts.
- Formula-injection characters are escaped before Sheets insertion.
- Large and malformed requests are rejected.
- Real `.env` files are ignored by Git.

## Main files

```text
index.html                    Product landing page
styles.css                    Product page styles
app.js                        Product selection and checkout handoff
checkout.html                 Checkout page
checkout.css                  Checkout and thank-you styles
checkout.js                   Invoice, payment, and API submission
thank-you.html                Confirmation page
api/orders.js                 Secure Vercel serverless endpoint
google-apps-script/Code.gs    Automatic Sheet setup and order writer
.env.example                  Safe environment-variable template
assets/                       Product and QR payment images
```

## Commercial use

Confirm that you have permission to use all product photography, marketing visuals, and the payment QR code before publishing commercially.
