const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const admin = require('firebase-admin');

// Collections
const db = () => admin.firestore();
const profiles = () => db().collection('customerProfiles');

// Helper: generate a simple human-friendly verification code
function generateCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// POST /api/customer/profile - create a customer access profile after package acceptance
router.post('/profile', async (req, res) => {
  try {
    const { businessProfileId, contact, selectedTools = [], selectedPackage, channel = 'email' } = req.body || {};
    if (!businessProfileId) return res.status(400).json({ error: 'businessProfileId is required' });
    if (!contact || (!contact.email && !contact.phone)) return res.status(400).json({ error: 'contact email or phone required' });

    const id = uuidv4();
    const verificationCode = generateCode();
    const doc = {
      id,
      businessProfileId,
      contact,
      channel,
      selectedTools,
      selectedPackage: selectedPackage || null,
      progress: {},
      verificationCode,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await profiles().doc(id).set(doc);
    res.json({ profile: { ...doc } });
  } catch (e) {
    console.error('Create customer profile failed:', e);
    res.status(500).json({ error: 'Failed to create customer profile' });
  }
});

// GET /api/customer/profile/:id - public fetch (used by CustomerProfile.tsx)
router.get('/profile/:id', async (req, res) => {
  try {
    const snap = await profiles().doc(req.params.id).get();
    if (!snap.exists) return res.json({ profile: null });
    const data = snap.data();
    res.json({ profile: { id: snap.id, ...data } });
  } catch (e) {
    console.error('Get customer profile failed:', e);
    res.status(500).json({ error: 'Failed to fetch customer profile' });
  }
});

// PATCH /api/customer/profile/:id/progress - update progress/checklist
router.patch('/profile/:id/progress', async (req, res) => {
  try {
    const updates = req.body?.progress || {};
    await profiles().doc(req.params.id).set({
      progress: updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    const snap = await profiles().doc(req.params.id).get();
    res.json({ profile: { id: snap.id, ...snap.data() } });
  } catch (e) {
    console.error('Update customer progress failed:', e);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

module.exports = router;

// --- Notifications: email/SMS magic link ---
router.post('/profile/:id/notify', async (req, res) => {
  try {
    const snap = await profiles().doc(req.params.id).get();
    if (!snap.exists) return res.status(404).json({ error: 'Profile not found' });
    const prof = snap.data();
  const originHeader = req.headers['x-app-origin'];
  const baseUrl = (typeof originHeader === 'string' && originHeader) || process.env.APP_PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
    const magicLink = `${baseUrl.replace(/\/$/, '')}/customer/${encodeURIComponent(prof.id) || encodeURIComponent(req.params.id)}?code=${encodeURIComponent(prof.verificationCode)}`;
    const email = prof?.contact?.email;
    const phone = prof?.contact?.phone;
    const channel = (req.body?.channel || prof?.channel || (email ? 'email' : 'sms')).toLowerCase();

    // Email via SendGrid (optional)
    if (channel === 'email' && email) {
      const SG_KEY = process.env.SENDGRID_API_KEY;
      const FROM = process.env.SENDGRID_FROM || 'no-reply@smartlocal.ai';
      if (SG_KEY) {
        const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SG_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email }] }],
            from: { email: FROM },
            subject: 'Your SmartLocal Client Portal',
            content: [{ type: 'text/plain', value: `Welcome! Access your portal here: ${magicLink}` }]
          })
        });
        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(`SendGrid error: ${resp.status} ${txt}`);
        }
        return res.json({ ok: true, channel: 'email', magicLink });
      }
      console.log('[notify] SENDGRID_API_KEY missing; printing link:', magicLink);
      return res.json({ ok: true, channel: 'email', magicLink, simulated: true });
    }

    // SMS via Twilio (optional)
    if (channel === 'sms' && phone) {
      const SID = process.env.TWILIO_SID;
      const TOKEN = process.env.TWILIO_TOKEN;
      const FROM = process.env.TWILIO_FROM;
      if (SID && TOKEN && FROM) {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`;
        const params = new URLSearchParams({ From: FROM, To: phone, Body: `Your SmartLocal portal: ${magicLink}` });
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Authorization': 'Basic ' + Buffer.from(`${SID}:${TOKEN}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params
        });
        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(`Twilio error: ${resp.status} ${txt}`);
        }
        return res.json({ ok: true, channel: 'sms', magicLink });
      }
      console.log('[notify] TWILIO_* envs missing; printing link:', magicLink);
      return res.json({ ok: true, channel: 'sms', magicLink, simulated: true });
    }

    return res.status(400).json({ error: 'No valid contact channel' });
  } catch (e) {
    console.error('Notify failed:', e);
    res.status(500).json({ error: e?.message || 'Failed to send notification' });
  }
});
