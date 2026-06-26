/**
 * Mental Belt — BoostApp Lead Proxy
 * ─────────────────────────────────────────────────────────────────────────────
 * Deploy this file as a Vercel Serverless Function:
 *   /api/submit-lead.js
 *
 * Environment variable to set in Vercel dashboard (Settings → Environment):
 *   BOOSTAPP_API_KEY = your_api_key_here
 *
 * BoostApp API reference:
 *   POST https://rest.lee.co.il/leads/create-new-lead
 *   Header: x-api-key: <your key>
 *
 * Optional — fill in your pipeline stage/source IDs from BoostApp settings:
 *   BOOSTAPP_STAGE_ID  (the pipeline stage for new website leads)
 *   BOOSTAPP_SOURCE_ID (the lead source ID for "אתר אינטרנט" / website)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const BOOSTAPP_URL = 'https://rest.lee.co.il/leads/create-new-lead';

export default async function handler(req, res) {
  // ── CORS — allow only your own domain in production ──────────────────────
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.BOOSTAPP_API_KEY;
  if (!apiKey) {
    console.error('Missing BOOSTAPP_API_KEY environment variable');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const { parentName, phone, childAge, challenge } = req.body;

    // ── Validate required fields ──────────────────────────────────────────
    if (!parentName || !phone) {
      return res.status(400).json({ error: 'שם וטלפון הם שדות חובה' });
    }

    // ── Build remarks string from all form fields ─────────────────────────
    const remarks = [
      childAge    ? `גיל הילד/ה: ${childAge}`           : null,
      challenge   ? `אתגר מרכזי: ${challenge}`           : null,
      'מקור: אתר Mental Belt',
    ].filter(Boolean).join('\n');

    // ── BoostApp payload ──────────────────────────────────────────────────
    const payload = {
      clientData: {
        fullName: parentName.trim(),
        phone:    phone.trim().replace(/[\s\-]/g, ''),
        remarks,
      },
      pipeline: {
        // ── OPTIONAL: set these in your environment variables ──
        // stage:      parseInt(process.env.BOOSTAPP_STAGE_ID  || '0') || undefined,
        // leadSource: parseInt(process.env.BOOSTAPP_SOURCE_ID || '0') || undefined,
      },
      subscription: {},
    };

    // ── Call BoostApp ─────────────────────────────────────────────────────
    const boostRes = await fetch(BOOSTAPP_URL, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await boostRes.json();

    if (!boostRes.ok || data.success === false) {
      console.error('BoostApp error:', data);
      return res.status(502).json({ error: 'BoostApp API error', details: data });
    }

    // ── Success ───────────────────────────────────────────────────────────
    return res.status(200).json({
      success:  true,
      clientID: data?.data?.clientID,
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
