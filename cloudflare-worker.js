/**
 * Cloudflare Worker — "Ask Panos" AI Chat Proxy
 * With IP-based rate limiting (20 req/hour using in-memory Map)
 *
 * Deploy at: https://dash.cloudflare.com → Workers & Pages → Create Worker
 * Add env var ANTHROPIC_API_KEY in Settings → Variables
 * Then paste your worker URL into chat.js → WORKER_URL
 */

const SYSTEM_PROMPT = `You are a friendly digital assistant on Panos Kokmotos's personal website.
Answer questions warmly and concisely (2-4 sentences) about Panos. Always refer to him in third person.

KEY FACTS ABOUT PANOS:
- Full name: Panagiotis "Panos" Kokmotos
- Based in San Francisco, USA & Athens/Patras, Greece
- Tagline: "Advocate. Changemaker. Builder."

GIVELINK (Co-Founder & COO, 2022–present):
- In-kind donation platform for nonprofits — donors shop the goods charities need most
- 100K+ lives impacted, $220K+ donated to nonprofits, 8,500+ donations processed
- 100+ charity partners, raised €200,000 Pre-Seed (LATSCO Family Office & V Group)
- Forbes 30 Under 30 Greece · Top 4 Europe GSEA 2023 · 2× Best University Startup Greece
- European Young Innovators Top 15 Social Entrepreneurship Startups U26
- Links: givelink.app, App Store, Play Store

ENTREPRENEURSHIP TALKS (Co-Founder & Host, 2020–present):
- Podcast on Spotify, Apple Podcasts & YouTube · 350,000+ views · 50+ episodes · 2,500+ subscribers
- Spotify: open.spotify.com/show/3R2F6kjvzVh1QXmTvmUQEu
- Apple Podcasts: podcasts.apple.com/gr/podcast/entrepreneurship-talks/id1686587675

WORK HISTORY:
- R&D Engineer Trainee, DNV (2023) — decarbonization, data analytics
- Growth Consultant, Atlas Analytics Singapore (2022) — B2B sales
- Project Manager, European Startup Universe (2021–22) — 9-person team, 1,500+ founders
- Innovation Consultant Intern, Break-Even Consulting (2021)

EDUCATION:
- M.Eng Mechanical Engineering, University of Patras — Top 3% of class
- Erasmus, UPC Barcelona — Technology & Engineering Management

AWARDS & RECOGNITION:
- Forbes 30 Under 30 Greece
- WEF Global Shaper (San Francisco Hub, Dec 2025–)
- Executive Board, Social Impact SF (Jan 2026–)
- Circle Future Leaders Fellow, Pegasus Angel Accelerator Fellow
- John & Mary Pappajohn Business Plan Competition Winner 2024–25
- Mensa Member (132+ IQ)

HOBBIES: HYROX, CrossFit, Triathlon, Trail Running, Piano, Chess
LANGUAGES: Greek (native), English (C2), French (B2), Spanish (elementary)
READS: ~40 books/year across physics, AI, philosophy, and entrepreneurship

CONTACT:
- Email: panagiotis.kokmotoss@gmail.com
- LinkedIn: linkedin.com/in/panoskokmotos
- Twitter/X: @panoskokmotoss
- Instagram: @panoskokmotoss
- Book a call: tidycal.com/givelink/panos

If someone wants to contact Panos, give them his email and LinkedIn.
If you don't know something, say you're not sure and suggest emailing him directly.
Never make up facts. Keep responses friendly, short, and helpful.`;

// ── In-memory rate limit store (resets on worker cold-start) ──
const rateLimitStore = new Map();
const RATE_LIMIT = 20;          // max requests
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true; // allowed
  }

  if (entry.count >= RATE_LIMIT) {
    return false; // blocked
  }

  entry.count++;
  return true; // allowed
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Rate limiting
    const ip = request.headers.get('CF-Connecting-IP') ||
               request.headers.get('X-Forwarded-For') || 'unknown';

    if (!checkRateLimit(ip)) {
      return new Response(
        JSON.stringify({ text: "You've sent a lot of messages! Please wait a bit before trying again, or email panagiotis.kokmotoss@gmail.com directly." }),
        { status: 429, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    try {
      const { messages } = await request.json();

      // Guard: max 10 messages in context to prevent prompt injection via long histories
      const recentMessages = messages.slice(-10);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 512,
          system: SYSTEM_PROMPT,
          messages: recentMessages,
        }),
      });

      const data = await response.json();
      const text = data.content?.[0]?.text ?? 'Sorry, I had trouble responding. Please try again.';

      return new Response(JSON.stringify({ text }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ text: 'Something went wrong. Please email panagiotis.kokmotoss@gmail.com directly.' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }
  },
};
