/**
 * shared.js — single source of truth for cross-script config + helpers.
 * Loaded before script.js / chat.js / tool-utils.js on every page that uses them.
 *
 * Replaces constants that were previously copy-pasted into chat.js, script.js,
 * and tool-utils.js (worker URL, notify secret) and the two divergent markdown
 * renderers (chat.js parseMarkdown, tool-utils.js formatMarkdown).
 */
(function () {
  var base = 'https://ask-panos.panagiotis-kokmotoss.workers.dev';

  window.SITE_CONFIG = {
    workerBase:   base,
    chatUrl:      base,                    // default "Ask Panos" chat route
    toolUrl:      base + '/api/v1/tool',
    streamUrl:    base + '/api/v1/stream',
    deepUrl:      base + '/api/v2/tool',   // "Go Deeper" enhanced route
    notifyUrl:    base + '/notify',
  };

  /**
   * Offline answers for the chat when the live AI is unavailable. Verified facts only (Nov 2026);
   * returns null when the live reply is fine so callers keep it.
   */
  window.chatFallback = function (question, reply) {
    var broken = !reply || /^Sorry, I had trouble|^Something went wrong|Connection error/.test(reply);
    if (!broken) return null;
    var q = String(question || '').toLowerCase();
    var note = '*Quick answer while the live AI is offline.*\n\n';
    if (/join|sign ?up|nonprofit|charity|list (our|my)|wishlist/.test(q))
      return note + 'Nonprofits join Givelink for free. They list the exact items they need, donors buy them, and Givelink delivers them with a photo for the donor. Start at https://givelink.app or message me through the Let\'s Talk page and I\'ll help you set up.';
    if (/ai|agent|automat|claude|build/.test(q))
      return note + 'I run Givelink like an AI-native company. Agents spot nonprofits facing an urgent need and draft outreach that I approve before anything is sent. Scheduled automations sync our CRM, score every nonprofit, check catalog prices and close invoices, so a small team works like a big one.';
    if (/work together|collab|hire|speak|advis|partner|contact|reach|email|call/.test(q))
      return note + 'The best way is the Let\'s Talk page: https://panoskokmotos.com/goal.html. I\'m open to partnerships, speaking, advising, and nonprofits or companies that want to work with Givelink.';
    if (/podcast|entrepreneurship talks|episode/.test(q))
      return note + 'Entrepreneurship Talks is the podcast I co-founded in 2020: 60+ episodes and 350,000+ views of conversations with Greek founders. https://panoskokmotos.com/podcast.html';
    if (/givelink|what (is|does)|donat/.test(q))
      return note + 'Givelink is an in-kind giving platform. Donors buy the exact items a nonprofit needs and see a photo when they arrive. 150+ nonprofits in Greece and the US use it, with 8,900+ donations and 100,000+ products delivered so far. https://givelink.app';
    return note + 'I\'m Panos, co-founder and COO of Givelink, based between Athens and San Francisco. For anything specific, the Let\'s Talk page reaches the real me: https://panoskokmotos.com/goal.html';
  };

  window.escapeHtml = function (str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  /**
   * Minimal markdown → HTML. Options preserve each caller's exact prior output:
   *   chat widget: renderMarkdown(t, {italic:true, links:true})  (bold, italic, links, <br>)
   *   tool output: renderMarkdown(t)                              (bold, <br>)
   */
  window.renderMarkdown = function (text, opts) {
    opts = opts || {};
    // Escape first: model output is untrusted and must never become live markup.
    var out = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    if (opts.italic) {
      out = out.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    }
    if (opts.links) {
      out = out.replace(
        /(https?:\/\/(?:(?!&lt;|&gt;)[^\s<"'])+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--blue);text-decoration:underline;text-underline-offset:2px;word-break:break-all;">$1</a>'
      );
    }
    return out.replace(/\n/g, '<br>');
  };

  /**
   * Fire-and-forget notification to the worker /notify endpoint. No-op unless a
   * notifySecret is configured; the secret must never ship in public JS.
   */
  window.notifySite = function (event, data) {
    var c = window.SITE_CONFIG;
    if (!c.notifySecret) return;
    fetch(c.notifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: c.notifySecret, event: event, data: data }),
    }).catch(function () {});
  };
})();
