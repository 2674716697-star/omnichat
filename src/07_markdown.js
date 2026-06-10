  // =========================================================================
  // MARKDOWN — inline renderer, no external dependencies
  // =========================================================================

  // -- Security helpers -------------------------------------------------------
  // escapeAttr escapes values for HTML attribute context.
  // It is idempotent after escapeHtml: only escapes raw < > " ' so it
  // won't double-encode already-escaped entities.
  function escapeAttr(str) {
    return String(str || '')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // isSafeMarkdownUrl validates URL safety for markdown links and images.
  // isImage=true restricts to http/https/relative (no mailto/tel).
  function isSafeMarkdownUrl(url, isImage) {
    if (!url || typeof url !== 'string') return false;
    var u = url.trim();
    if (!u) return false;

    // Block control characters to prevent protocol smuggling (e.g. java\nscript:)
    if (/[\x00-\x1f\x7f-\x9f]/.test(u)) return false;

    // Relative paths: /path, ./path, ../path, #anchor
    if (/^[\.\/#]/.test(u)) return true;

    var lower = u.toLowerCase();

    // Allowed absolute protocols
    if (/^https?:\/\//.test(lower)) return true;
    if (/^mailto:/i.test(lower) && !isImage) return true;
    if (/^tel:/i   .test(lower) && !isImage) return true;

    // Block dangerous protocols explicitly
    if (/^(javascript|data|vbscript|file|blob):/i.test(lower)) return false;

    // Any other protocol scheme → block
    if (/^[a-z][a-z0-9+\-.]*:/i.test(lower)) return false;

    // Fall through: treat as relative path
    return true;
  }

  // -- Content helpers -------------------------------------------------------

  function renderContentFast(text) {
    // Fast path for streaming: just escape + newlines, skip full markdown parse
    return escapeHtml(String(text || '')).replace(/\n/g, '<br>');
  }

  function appendFastText(el, delta) {
    // Incrementally append a text delta to a DOM element.
    // Splits on \n and appends text nodes + <br> elements — no innerHTML,
    // so XSS-safe and avoids full re-parse cost on long streaming content.
    if (!delta) return;
    var s = String(delta);
    if (!s) return;
    var parts = s.split('\n');
    for (var i = 0; i < parts.length; i++) {
      if (i > 0) {
        el.appendChild(document.createElement('br'));
      }
      if (parts[i]) {
        el.appendChild(document.createTextNode(parts[i]));
      }
    }
  }

  function getVisibleAssistantContent(text, isStreaming) {
    const value = String(text || '');
    return isStreaming ? value.replace(/\n?@@SCENE[\s\S]*$/m, '').trimEnd() : value;
  }

  function renderMarkdown(text) {
    let html = escapeHtml(text);

    // Code blocks: ```lang\ncode\n```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function(_, lang, code) {
      var langTag = lang ? '<div style="font-size:10px;color:var(--text-tertiary);padding:4px 14px 0;text-transform:uppercase;letter-spacing:0.5px">' + escapeHtml(lang) + '</div>' : '';
      return langTag + '<pre><code>' + code.trimEnd() + '</code></pre>';
    });

    // Inline code: `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold: **text**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic: *text*
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Images: ![alt](url) — block unsafe URLs, only allow http/https/relative
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function(_, alt, src) {
      if (!isSafeMarkdownUrl(src, true)) {
        // Unsafe image URL: show alt text only, no img tag
        return alt || '';
      }
      return '<img src="' + escapeAttr(src) + '" alt="' + escapeAttr(alt) + '" style="max-width:100%;border-radius:8px;margin:4px 0">';
    });

    // Links: [text](url) — block unsafe URLs, show text only
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(_, text, url) {
      if (!isSafeMarkdownUrl(url, false)) {
        // Unsafe link: show link text only, no a tag
        return text;
      }
      return '<a href="' + escapeAttr(url) + '" target="_blank" rel="noopener noreferrer">' + text + '</a>';
    });

    // Auto-link bare URLs — only http:// and https://
    html = html.replace(/(?<!["'>])(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');

    // Headers: ### text (at line start)
    html = html.replace(/^### (.+)$/gm, '<h4 style="font-size:15px;margin:10px 0 4px">$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3 style="font-size:16px;margin:12px 0 4px">$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h2 style="font-size:17px;margin:14px 0 6px">$1</h2>');

    // Blockquote: > text
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

    // Horizontal rule: ---
    html = html.replace(/^---$/gm, '<hr>');

    // Unordered list items
    html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
    // Ordered list items
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Wrap consecutive <li> in <ul>
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

    // Line breaks: preserve newlines as <br> except before block elements
    html = html.replace(/\n/g, '<br>');

    // Clean up: remove <br> before block elements
    html = html.replace(/<br>\s*(<(?:pre|ul|ol|blockquote|hr|h[2-4]|li))/g, '$1');
    html = html.replace(/(<\/(?:pre|ul|ol|blockquote|h[2-4])>)\s*<br>/g, '$1');

    return html;
  }
