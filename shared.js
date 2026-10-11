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
