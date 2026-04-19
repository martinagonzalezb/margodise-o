import 'dotenv/config';
import express from 'express';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MercadoPago client
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
  options: { timeout: 5000 },
});

// In-memory token stores
// token  → { expiresAt: Date }
// paymentId → token
const downloadTokens = new Map();
const paymentToToken = new Map();

// ─── POST /create-preference ──────────────────────────────────────────────────
// Frontend calls this when the user clicks "Comprar ahora".
// Returns the MercadoPago sandbox checkout URL.
app.post('/create-preference', async (req, res) => {
  try {
    const preference = new Preference(client);

    const body = {
      items: [
        {
          title: process.env.PRODUCT_NAME,
          quantity: 1,
          unit_price: Number(process.env.PRICE_ARS),
          currency_id: 'ARS',
        },
      ],
      back_urls: {
        success: `${process.env.BASE_URL}/success`,
        failure: `${process.env.BASE_URL}/failure`,
        pending: `${process.env.BASE_URL}/pending`,
      },
      auto_return: 'approved',
      notification_url: `${process.env.BASE_URL}/webhook/mercadopago`,
    };

    const result = await preference.create({ body });

    // Use sandbox_init_point for testing; swap to init_point for production
    const checkoutUrl =
      process.env.NODE_ENV === 'production'
        ? result.init_point
        : result.sandbox_init_point;

    res.json({ checkoutUrl });
  } catch (err) {
    console.error('Error creating preference:', err);
    res.status(500).json({ error: 'No se pudo crear la preferencia de pago.' });
  }
});

// ─── POST /webhook/mercadopago ────────────────────────────────────────────────
// MercadoPago notifies us here when a payment changes status.
app.post('/webhook/mercadopago', async (req, res) => {
  const { type, data } = req.body;

  // Always respond 200 immediately to acknowledge receipt
  res.sendStatus(200);

  if (type !== 'payment' || !data?.id) return;

  try {
    const payment = new Payment(client);
    const paymentData = await payment.get({ id: data.id });

    if (paymentData.status === 'approved') {
      issueDownloadToken(String(data.id));
    }
  } catch (err) {
    console.error('Webhook payment verification error:', err);
  }
});

// ─── GET /success ─────────────────────────────────────────────────────────────
// MercadoPago redirects the buyer here after a successful payment.
// Verifies the payment and issues a download token.
app.get('/success', async (req, res) => {
  const { payment_id, status } = req.query;

  if (status !== 'approved') {
    return res.redirect('/failure.html');
  }

  const paymentIdStr = String(payment_id);

  // Token may already exist (webhook arrived first)
  let token = paymentToToken.get(paymentIdStr);

  if (!token) {
    // Fallback: verify directly with MP API (handles webhook/redirect race condition)
    try {
      const payment = new Payment(client);
      const paymentData = await payment.get({ id: payment_id });

      if (paymentData.status === 'approved') {
        token = issueDownloadToken(paymentIdStr);
      }
    } catch (err) {
      console.error('Success route payment verification error:', err);
    }
  }

  if (!token) {
    return res.redirect('/failure.html');
  }

  res.redirect(`/success.html?token=${token}`);
});

// ─── GET /pending ─────────────────────────────────────────────────────────────
app.get('/pending', (req, res) => {
  res.redirect('/pending.html');
});

// ─── GET /download/:token ─────────────────────────────────────────────────────
// Validates the token and serves the PDF as a download.
app.get('/download/:token', (req, res) => {
  const { token } = req.params;
  const entry = downloadTokens.get(token);

  if (!entry) {
    return res.status(404).send('Enlace inválido o expirado.');
  }

  if (new Date() > entry.expiresAt) {
    downloadTokens.delete(token);
    return res.status(410).send('El enlace de descarga ha expirado. Contactá a @marga.interiorismo para obtener uno nuevo.');
  }

  const pdfPath = path.join(__dirname, 'private', process.env.PDF_FILENAME);

  if (!fs.existsSync(pdfPath)) {
    console.error('PDF not found at:', pdfPath);
    return res.status(500).send('Error interno: archivo no encontrado.');
  }

  res.setHeader(
    'Content-Disposition',
    'attachment; filename="Mudarte-sin-equivocarte-Guia-de-interiorismo.pdf"'
  );
  res.setHeader('Content-Type', 'application/pdf');
  res.sendFile(pdfPath);
});

// ─── Helper ───────────────────────────────────────────────────────────────────
function issueDownloadToken(paymentId) {
  // If a token already exists for this payment, return it (idempotent)
  if (paymentToToken.has(paymentId)) {
    return paymentToToken.get(paymentId);
  }

  const token = uuidv4();
  const expiresAt = new Date(
    Date.now() + Number(process.env.TOKEN_EXPIRY_HOURS) * 60 * 60 * 1000
  );
  downloadTokens.set(token, { expiresAt, paymentId });
  paymentToToken.set(paymentId, token);
  return token;
}

// ─── Cleanup expired tokens hourly ───────────────────────────────────────────
setInterval(() => {
  const now = new Date();
  for (const [token, entry] of downloadTokens.entries()) {
    if (now > entry.expiresAt) {
      paymentToToken.delete(entry.paymentId);
      downloadTokens.delete(token);
    }
  }
}, 60 * 60 * 1000);

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
