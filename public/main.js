document.addEventListener('DOMContentLoaded', () => {
  const buttons = [
    document.getElementById('buy-btn'),
    document.getElementById('buy-btn-mobile'),
  ].filter(Boolean);

  async function handleBuy() {
    buttons.forEach((b) => {
      b.disabled = true;
      b.textContent = 'Redirigiendo...';
    });

    try {
      const res = await fetch('/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const { checkoutUrl, error } = await res.json();

      if (error || !checkoutUrl) throw new Error(error || 'No checkout URL');

      window.location.href = checkoutUrl;
    } catch (err) {
      console.error('Checkout error:', err);
      buttons.forEach((b) => {
        b.disabled = false;
        b.textContent = 'Comprar ahora';
      });
      alert('Hubo un problema al iniciar el pago. Por favor intentá de nuevo.');
    }
  }

  buttons.forEach((b) => b.addEventListener('click', handleBuy));
});
