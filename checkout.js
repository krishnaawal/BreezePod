const VALLEY_DELIVERY = 100;
const OUTSIDE_VALLEY_DELIVERY = 150;
const fallbackCart = { productName: 'BreezePod Mini Rechargeable Fan', selectedColor: 'Pink', quantity: 1, unitPrice: 399, image: 'assets/product-hero.png' };
const cart = JSON.parse(localStorage.getItem('breezepod-cart') || 'null') || fallbackCart;
const imageMap = {
  Pink: 'assets/product-hero.png', Green: 'assets/product-green.png', Yellow: 'assets/product-yellow.png',
  Orange: 'assets/product-orange.png', 'Mint / Navy': 'assets/product-mint.png',
  'Burgundy / Cream': 'assets/product-burgundy.png', 'White / Navy': 'assets/product-navy.png'
};
const image = imageMap[cart.selectedColor] || fallbackCart.image;
const subtotal = cart.unitPrice * cart.quantity;
const transactionCode = document.querySelector('#transactionCode');
const qrPaymentPanel = document.querySelector('#qrPaymentPanel');
const deliveryLabel = document.querySelector('.invoice-lines div:nth-child(2) strong');
const invoiceTotal = document.querySelector('#invoiceTotal');
document.querySelector('#invoiceImage').src = image;
document.querySelector('#invoiceImage').alt = `${cart.selectedColor} fan`;
document.querySelector('#invoiceVariant').textContent = `${cart.selectedColor} · ${cart.quantity} ${cart.quantity === 1 ? 'unit' : 'units'}`;
document.querySelector('#invoiceSubtotal').textContent = `Rs. ${subtotal}`;
function updateDeliveryCharge() {
  const selectedLocation = document.querySelector('input[name="deliveryLocation"]:checked')?.value;
  const deliveryCharge = selectedLocation === 'Inside Kathmandu Valley' ? VALLEY_DELIVERY : OUTSIDE_VALLEY_DELIVERY;
  deliveryLabel.textContent = `Rs. ${deliveryCharge}`;
  invoiceTotal.textContent = `Rs. ${subtotal + deliveryCharge}`;
  return deliveryCharge;
}

document.querySelectorAll('input[name="deliveryLocation"]').forEach((option) => {
  option.addEventListener('change', () => {
    document.querySelectorAll('.location-option').forEach((item) => item.classList.toggle('selected', item.querySelector('input').checked));
    updateDeliveryCharge();
  });
});
updateDeliveryCharge();

document.querySelectorAll('.payment-option').forEach((option) => {
  const selectPayment = () => {
    document.querySelectorAll('.payment-option').forEach((item) => item.classList.remove('selected'));
    option.classList.add('selected');
    option.querySelector('input').checked = true;
    const isQr = option.querySelector('input').value === 'QR Payment';
    qrPaymentPanel.hidden = !isQr;
    transactionCode.required = isQr;
  };
  option.addEventListener('click', selectPayment);
  option.querySelector('input').addEventListener('change', selectPayment);
});

qrPaymentPanel.hidden = true;
transactionCode.required = false;

document.querySelector('.qr-download').addEventListener('click', async (event) => {
  event.preventDefault();
  const image = document.querySelector('.qr-image-wrap img');
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || 400;
  canvas.height = image.naturalHeight || 400;
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const downloadUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = downloadUrl;
    downloadLink.download = 'BreezePod-payment-QR.jpg';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  }, 'image/jpeg', 0.95);
});

document.querySelector('#checkoutForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const submitButton = event.currentTarget.querySelector('button[type="submit"]');
  const errorBox = document.querySelector('#checkoutError');
  const payload = {
    customerName: form.get('customerName'), primaryPhone: form.get('primaryPhone'), email: form.get('email') || '',
    fullAddress: form.get('fullAddress'), deliveryLocation: form.get('deliveryLocation'), selectedColor: cart.selectedColor,
    quantity: cart.quantity, paymentMethod: form.get('paymentMethod'), transactionCode: form.get('transactionCode') || ''
  };
  submitButton.disabled = true;
  submitButton.textContent = 'Saving order…';
  errorBox.hidden = true;
  try {
    const result = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const body = await result.json().catch(() => ({}));
    if (!result.ok || body.success !== true) throw new Error(body.error || 'Unable to save your order');
    localStorage.setItem('breezepod-last-order', JSON.stringify({ ...payload, ...body.order, productName: cart.productName, selectedColor: cart.selectedColor, quantity: cart.quantity }));
    window.location.href = 'thank-you.html';
  } catch (error) {
    errorBox.textContent = error.message || 'Unable to save your order. Please try again.';
    errorBox.hidden = false;
    submitButton.disabled = false;
    submitButton.innerHTML = 'Place order <span>↗</span>';
  }
});
