# BreezePod Nepal

Mobile-first single-product storefront and order collection system for the BreezePod rechargeable mini fan.

## Customer flow

1. Customer chooses a color and quantity on `index.html`.
2. **Buy now** opens the separate `checkout.html` page.
3. Customer enters full name, phone, optional email, and full address.
4. Customer selects Inside Kathmandu Valley (Rs. 100 delivery) or Outside Kathmandu Valley (Rs. 150 delivery).
5. Customer chooses Cash on Delivery or QR Payment.
6. QR customers see the payment QR and must enter a transaction code.
7. The order is saved to Google Sheets through the secure Vercel API.
8. Customer sees `thank-you.html`. The seller prints the payment receipt from Google Sheets.

## Google Sheets setup

The active `Orders` sheet contains only the fields needed by this single-product checkout. There are no Product ID or Product Name columns.

```text
Order ID
Order Date
Order Time
Customer Name
Primary Phone
Customer Email
Full Address
Delivery Location
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

### Create the Sheet automatically

1. Open [Google Apps Script](https://script.google.com/) and create a new project.
2. Copy the complete contents of `google-apps-script/Code.gs` into the editor.
3. Save the project.
4. Select `setupBreezePodOrders` from the function dropdown and click **Run**.
5. Approve the Google permissions.
6. Open the execution log and copy the displayed `spreadsheetUrl` and `orderApiSecret` values.

The setup function creates the spreadsheet, `Orders` worksheet, exact headers above, Kathmandu timezone, and secure Script Properties automatically. If an old `Orders` worksheet has extra columns, it is renamed to an archive sheet and a clean `Orders` worksheet is created. Existing data is preserved.

It also creates a `Payment Receipt` worksheet. Every new order fills this sheet with a clean, print-friendly receipt. To print an older order, open `Orders`, click any order row, then use **BreezePod → Create receipt from selected order**. Open the `Payment Receipt` worksheet and print it from Google Sheets.

### What the log values mean

`spreadsheetUrl` is only the link used to open and manage the Google Sheet. Do not paste it into the website or Vercel.

`orderApiSecret` is private. Copy only the secret value and use it as the Vercel variable `ORDER_API_SECRET`.

## Publish the Apps Script endpoint

1. In Apps Script select **Deploy → New deployment**.
2. Choose **Web app**.
3. Set **Execute as** to your Google account.
4. Set **Who has access** to **Anyone**.
5. Deploy and copy the Web app URL.

The correct URL ends in `/exec`, for example:

```text
https://script.google.com/macros/s/DEPLOYMENT_ID/exec
```

Use the full `/exec` URL. Do not use the Apps Script editor URL or a URL ending in `/dev`.

## Vercel environment variables

In **Vercel Dashboard → BreezePod → Settings → Environment Variables**, add these two variables:

```text
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
ORDER_API_SECRET=the-secret-value-from-the-Apps-Script-execution-log
```

Use the complete `/exec` URL for `GOOGLE_APPS_SCRIPT_URL`. Use only the secret string for `ORDER_API_SECRET`. Select Production (and Preview if needed), save, and redeploy.

For local Vercel development, place the same values in `/Users/krishna/Documents/BreezePod/.env`. This file is ignored by Git. Use `.env.example` as the safe template, and never put real secrets in browser files or committed code.

## Testing

1. Redeploy Vercel after adding the environment variables.
2. Open the live product page and choose a color and quantity.
3. Click **Buy now** and complete the checkout form.
4. Test both delivery locations and confirm the total changes by Rs. 100 or Rs. 150.
5. Test COD: the QR panel must remain hidden.
6. Test QR Payment: the QR panel and required transaction-code field must appear.
7. Submit the order and confirm the new row appears in the `Orders` worksheet.
8. Open `Payment Receipt` and print the receipt for the customer.

For local API testing, use `vercel dev`; a plain static server cannot execute `/api/orders`.

## Security protections

- Apps Script URL and API secret stay server-side.
- Vercel recalculates price and delivery charges instead of trusting browser totals.
- QR orders are marked `Verification Pending` for manual review.
- Apps Script rejects duplicate order IDs and uses `LockService` for simultaneous orders.
- Formula-injection characters are escaped before insertion into Sheets.
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
