// src/index.js
// AG3 Orchestrator – clean rewrite (ESM)

// Load env vars from .env
import 'dotenv/config';

import express from 'express';
import Stripe from 'stripe';

// ----- ENV SETUP -----

const {
  PORT,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  NODE_ENV,
  RENDER_API_KEY,
  RENDER_SERVICE_ID,
} = process.env;

const port = Number(PORT) || 4600;

// Log what we actually have (without exposing full secrets)
const mask = (val) => {
  if (!val) return 'MISSING';
  if (val.length <= 8) return 'SET';
  return `${val.slice(0, 4)}***${val.slice(-4)}`;
};

console.log('🔐 Loaded ENV keys:', {
  PORT: port,
  NODE_ENV: NODE_ENV || 'not set',
  STRIPE_SECRET_KEY: STRIPE_SECRET_KEY ? 'SET' : 'MISSING',
  STRIPE_WEBHOOK_SECRET: STRIPE_WEBHOOK_SECRET ? 'SET' : 'MISSING',
  RENDER_API_KEY: RENDER_API_KEY ? 'SET' : 'MISSING',
  RENDER_SERVICE_ID: RENDER_SERVICE_ID || 'MISSING',
});

// Create Stripe client if configured
let stripe = null;
if (STRIPE_SECRET_KEY) {
  stripe = new Stripe(STRIPE_SECRET_KEY, {
    // Use your preferred API version or leave default
    apiVersion: '2024-06-20',
  });
} else {
  console.warn('⚠️ STRIPE_SECRET_KEY is missing – Stripe features disabled.');
}

// ----- APP SETUP -----

const app = express();

// We need raw body for Stripe webhook, so set up middleware carefully:
// 1) Webhook route with raw body
// 2) JSON for everything else

// Webhook route uses raw body
app.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
      console.warn('⚠️ Webhook called but Stripe or webhook secret not configured.');
      return res.status(500).send('Webhook not configured');
    }

    const sig = req.headers['stripe-signature'];
    if (!sig) {
      console.warn('⚠️ Webhook missing stripe-signature header.');
      return res.status(400).send('Missing stripe-signature header');
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('✅ Stripe webhook received:', event.type);

    // Handle key event types here
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('💰 Checkout completed:', event.data.object.id);
        break;
      case 'invoice.paid':
        console.log('📄 Invoice paid:', event.data.object.id);
        break;
      case 'customer.subscription.created':
        console.log('🔁 Subscription created:', event.data.object.id);
        break;
      case 'customer.subscription.updated':
        console.log('🔁 Subscription updated:', event.data.object.id);
        break;
      case 'payment_intent.succeeded':
        console.log('✅ Payment succeeded:', event.data.object.id);
        break;
      default:
        console.log('ℹ️ Unhandled event type:', event.type);
    }

    res.json({ received: true });
  }
);

// JSON body for all non-webhook routes
app.use(express.json());

// ----- ROUTES -----

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    port,
    env: NODE_ENV || 'not set',
    stripeConfigured: Boolean(STRIPE_SECRET_KEY && STRIPE_WEBHOOK_SECRET),
  });
});

// Missions endpoint (placeholder – plug in your real mission logic here)
app.post('/missions', async (req, res) => {
  try {
    const mission = req.body || {};
    console.log('🛰️ Incoming mission:', JSON.stringify(mission, null, 2));

    // TODO: route mission to AG-series agents here

    return res.json({
      ok: true,
      message: 'Mission received by AG3 Orchestrator',
    });
  } catch (err) {
    console.error('❌ Error handling /missions:', err);
    return res.status(500).json({
      ok: false,
      error: err.message || 'Unknown error',
    });
  }
});

// Catch-all for unknown routes
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: 'Not found',
    path: req.path,
  });
});

// ----- START SERVER -----

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 AG3 Orchestrator running on PORT ${port} (NODE_ENV=${NODE_ENV || 'not set'})`);
});

export default app;
