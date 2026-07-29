const PRICE = 399;
let quantity = 1;
let selectedColor = 'Pink';

const mainImage = document.querySelector('#mainImage');
const quantityLabel = document.querySelector('#quantity');
const selectedColorLabel = document.querySelector('#selectedColor');
const buyTotal = document.querySelector('#buyTotal');
const mobileTotal = document.querySelector('#mobileTotal');

function showProductImage(image, alt) {
  mainImage.src = image;
  mainImage.alt = alt;
  document.querySelectorAll('.thumb').forEach((item) => item.classList.toggle('active', item.dataset.image === image));
}

function updateSummary() {
  quantityLabel.textContent = quantity;
  selectedColorLabel.textContent = selectedColor;
  const total = PRICE * quantity;
  buyTotal.textContent = `Rs. ${total}`;
  mobileTotal.textContent = `Rs. ${total}`;
}

document.querySelector('#plus').addEventListener('click', () => { quantity = Math.min(10, quantity + 1); updateSummary(); });
document.querySelector('#minus').addEventListener('click', () => { quantity = Math.max(1, quantity - 1); updateSummary(); });

document.querySelectorAll('.thumb').forEach((button) => {
  button.addEventListener('click', () => showProductImage(button.dataset.image, button.querySelector('img').alt));
});

document.querySelectorAll('.color-swatch').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.color-swatch').forEach((item) => item.classList.remove('selected'));
    button.classList.add('selected');
    selectedColor = button.dataset.color;
    showProductImage(button.dataset.image, `${selectedColor} BreezePod rechargeable mini fan`);
    updateSummary();
  });
});

function goToCheckout() {
  localStorage.setItem('breezepod-cart', JSON.stringify({
    productId: 'breezepod-mini-fan', productName: 'BreezePod Mini Rechargeable Fan',
    selectedColor, quantity, unitPrice: PRICE
  }));
  window.location.href = 'checkout.html';
}

document.querySelector('#buyNow').addEventListener('click', goToCheckout);
updateSummary();
