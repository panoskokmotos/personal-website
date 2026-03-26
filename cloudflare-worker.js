/**
 * Cloudflare Worker — "Ask Panos" AI Chat Proxy
 * With IP-based rate limiting (20 req/hour using in-memory Map)
 *
 * Deploy at: https://dash.cloudflare.com → Workers & Pages → Create Worker
 * Add env vars in Settings → Variables:
 *   ANTHROPIC_API_KEY  — your Anthropic API key
 *   NOTIFY_EMAIL       — email address to receive notifications (your personal email)
 *   NOTIFY_SECRET      — a random secret string to protect the /notify endpoint
 * Then paste your worker URL into chat.js → WORKER_URL
 *
 * /notify endpoint: POST with { secret, event, data }
 * Sends an email via MailChannels (free on Cloudflare Workers).
 * Use to get notified of: contact form submissions, AI tool usage, etc.
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
      return new Response(null, { headers: { ...CORS_HEADERS, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' } });
    }

    const url = new URL(request.url);

    // ── GET /api/charity-search?q=QUERY — ProPublica nonprofit autocomplete ──
    if (request.method === 'GET' && url.pathname === '/api/charity-search') {
      const q = url.searchParams.get('q') || '';
      if (q.length < 2) {
        return new Response(JSON.stringify({ organizations: [] }), {
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }
      try {
        const ppRes = await fetch(
          `https://projects.propublica.org/nonprofits/api/v2/search.json?q=${encodeURIComponent(q)}`,
          { headers: { 'Accept': 'application/json' } }
        );
        const ppData = await ppRes.json();
        const orgs = (ppData.organizations || []).slice(0, 8).map(o => ({
          name: o.name,
          ein:  o.ein,
          city: o.city,
          state: o.state,
        }));
        return new Response(JSON.stringify({ organizations: orgs }), {
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      } catch {
        return new Response(JSON.stringify({ organizations: [] }), {
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }
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

    // ── /notify route: send personal email notification ──
    if (url.pathname === '/notify') {
      try {
        const { secret, event, data } = await request.json();

        // Validate secret to prevent abuse
        if (!env.NOTIFY_SECRET || secret !== env.NOTIFY_SECRET) {
          return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
            status: 401, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
          });
        }

        const toEmail = env.NOTIFY_EMAIL || 'panagiotis.kokmotoss@gmail.com';
        const subject = `[panoskokmotos.com] ${event || 'New notification'}`;
        const bodyText = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data || '');
        const bodyHtml = `<pre style="font-family:monospace;font-size:14px">${bodyText.replace(/</g,'&lt;')}</pre>
          <p style="color:#666;font-size:12px">Sent by your Cloudflare Worker · panoskokmotos.com</p>`;

        // Send via MailChannels (free on Cloudflare Workers — no signup required)
        const mcRes = await fetch('https://api.mailchannels.net/tx/v1/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: toEmail }] }],
            from: { email: 'notify@panoskokmotos.com', name: 'panoskokmotos.com' },
            subject,
            content: [
              { type: 'text/plain', value: bodyText },
              { type: 'text/html', value: bodyHtml },
            ],
          }),
        });

        const ok = mcRes.status === 202;
        return new Response(JSON.stringify({ ok }), {
          status: ok ? 200 : 500,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: 'Notification failed' }), {
          status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }
    }

    // ── /email-result route: send AI result to user's email ──
    if (url.pathname === '/email-result') {
      try {
        const { email, tool, result, url: pageUrl, subscribe } = await request.json();
        if (!email || !email.includes('@')) {
          return new Response(JSON.stringify({ ok: false, error: 'Invalid email' }), {
            status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
          });
        }

        const subject = `Your result from "${tool || 'AI Tool'}" — panoskokmotos.com`;
        const safeResult = (result || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const bodyHtml = `
          <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <h2 style="color:#1a2e4a;margin-bottom:8px">${(tool || 'Your AI Result').replace(/</g,'&lt;')}</h2>
            <p style="color:#666;font-size:13px;margin-bottom:20px">From <a href="${pageUrl || 'https://panoskokmotos.com'}" style="color:#3b6ef8">panoskokmotos.com</a></p>
            <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:10px;padding:20px;font-size:14px;line-height:1.7;white-space:pre-wrap">${safeResult}</div>
            ${subscribe ? '<p style="background:#e8f5e9;border-radius:6px;padding:8px 14px;font-size:13px;color:#1a7a2e;margin-top:16px">✓ You\'ve subscribed to Panos\'s monthly social-impact digest.</p>' : ''}
          <p style="color:#999;font-size:12px;margin-top:20px">Sent from <a href="https://panoskokmotos.com/ai-tools.html" style="color:#3b6ef8">Free AI for Social Impact tools</a> by Panos Kokmotos</p>
          </div>`;

        const mcRes = await fetch('https://api.mailchannels.net/tx/v1/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personalizations: [{ to: [{ email }] }],
            from: { email: 'tools@panoskokmotos.com', name: 'Panos Kokmotos AI Tools' },
            subject,
            content: [
              { type: 'text/plain', value: result || '' },
              { type: 'text/html', value: bodyHtml },
            ],
          }),
        });

        const ok = mcRes.status === 202;

        // Notify Panos if someone subscribed to the digest
        if (ok && subscribe && env.NOTIFY_SECRET) {
          fetch(`https://${url.hostname}/notify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret: env.NOTIFY_SECRET, event: 'New Digest Subscriber', data: { email, tool } }),
          }).catch(() => {});
        }

        return new Response(JSON.stringify({ ok }), {
          status: ok ? 200 : 500,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: 'Email failed' }), {
          status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }
    }

    // ── /api/v1/stream route: streaming Claude call (text chunks as plain text) ──
    if (url.pathname === '/api/v1/stream') {
      try {
        const { systemPrompt, userMessage } = await request.json();
        if (!systemPrompt || !userMessage) {
          return new Response(JSON.stringify({ error: 'Missing params' }), {
            status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
          });
        }

        const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5',
            max_tokens: 1024,
            stream: true,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }],
          }),
        });

        if (!anthropicRes.ok) {
          const errData = await anthropicRes.json().catch(() => ({}));
          return new Response(JSON.stringify({ error: errData.error?.message || 'Anthropic error' }), {
            status: anthropicRes.status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
          });
        }

        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        // Parse SSE stream from Anthropic, forward only text deltas
        (async () => {
          try {
            const reader = anthropicRes.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop(); // keep incomplete line
              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (data === '[DONE]') continue;
                try {
                  const evt = JSON.parse(data);
                  if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
                    await writer.write(encoder.encode(evt.delta.text));
                  }
                } catch {}
              }
            }
          } catch {}
          await writer.close().catch(() => {});
        })();

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            ...CORS_HEADERS,
          },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Streaming failed' }), {
          status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }
    }

    // ── /api/v2/tool route: enhanced Claude Sonnet call ("Go Deeper") ──
    if (url.pathname === '/api/v2/tool') {
      try {
        const { systemPrompt, userMessage } = await request.json();
        if (!systemPrompt || !userMessage) {
          return new Response(JSON.stringify({ error: 'Missing params' }), {
            status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
          });
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }],
          }),
        });

        const data = await response.json();
        const result = data.content?.[0]?.text ?? 'Sorry, enhancement failed. Please try again.';

        return new Response(JSON.stringify({ result }), {
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: 'Enhancement failed.' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }
    }

    // ── /api/v1/tool route: versioned Claude call with optional KV caching ──
    if (url.pathname === '/api/v1/tool') {
      try {
        const { systemPrompt, userMessage, promptVersion } = await request.json();
        if (!systemPrompt || !userMessage) {
          return new Response(JSON.stringify({ error: 'Missing systemPrompt or userMessage' }), {
            status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
          });
        }

        // KV cache check (24h TTL — only if TOOL_CACHE KV namespace is bound)
        let cacheKey = null;
        if (env.TOOL_CACHE) {
          const hashBuf = await crypto.subtle.digest('SHA-256',
            new TextEncoder().encode(`v${promptVersion || 1}|${systemPrompt}|${userMessage}`)
          );
          cacheKey = 'tc:' + Array.from(new Uint8Array(hashBuf))
            .map(b => b.toString(16).padStart(2, '0')).join('');
          const cached = await env.TOOL_CACHE.get(cacheKey);
          if (cached) {
            return new Response(JSON.stringify({ result: cached, cached: true, promptVersion: promptVersion || 1 }), {
              headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
            });
          }
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }],
          }),
        });

        const data = await response.json();
        const result = data.content?.[0]?.text ?? 'Sorry, I had trouble responding. Please try again.';

        // Store in KV cache
        if (env.TOOL_CACHE && cacheKey) {
          await env.TOOL_CACHE.put(cacheKey, result, { expirationTtl: 86400 }).catch(() => {});
        }

        return new Response(JSON.stringify({ result, promptVersion: promptVersion || 1 }), {
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: 'Something went wrong. Please try again.' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }
    }

    // ── /tool route: generic Claude call for Social Impact AI tools ──
    if (url.pathname === '/tool') {
      try {
        const { systemPrompt, userMessage } = await request.json();
        if (!systemPrompt || !userMessage) {
          return new Response(JSON.stringify({ error: 'Missing systemPrompt or userMessage' }), {
            status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
          });
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }],
          }),
        });

        const data = await response.json();
        const result = data.content?.[0]?.text ?? 'Sorry, I had trouble responding. Please try again.';

        return new Response(JSON.stringify({ result }), {
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: 'Something went wrong. Please try again.' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }
    }

    // ── Default route: "Ask Panos" chat ──
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
