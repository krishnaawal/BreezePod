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

## Important production note

The current version is a static front-end demonstration. Orders are stored locally in the browser for the demo flow; they are not yet sent to Google Sheets.

For production, connect `checkout.js` to a protected server-side `/api/orders` endpoint that:

1. Validates the submitted data on the server.
2. Recalculates the product price and delivery charge.
3. Generates a secure order ID.
4. Sends sanitized order data to Google Apps Script.
5. Stores the order in the `BreezePod Nepal Orders` Google Sheet.
6. Keeps QR payment verification manual.

Never expose the Apps Script URL or shared secret in browser-side code.

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
