// =========================================================================
// MARKDOWN — inline renderer, no external dependencies
// =========================================================================

// -- Security helpers -------------------------------------------------------
export function escapeAttr(str) {
  return String(str || '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isSafeMarkdownUrl(url, isImage) {
  if (!url || typeof url !== 'string') return false;
  var u = url.trim();
  if (!u) return false;
  if (/[\x00-\x1f\x7f-\x9f]/.test(u)) return false;
  if (/^[\.\/#]/.test(u)) return true;
  var lower = u.toLowerCase();
  if (/^https?:\/\//.test(lower)) return true;
  if (/^mailto:/i.test(lower) && !isImage) return true;
  if (/^tel:/i   .test(lower) && !isImage) return true;
  if (/^(javascript|data|vbscript|file|blob):/i.test(lower)) return false;
  if (/^[a-z][a-z0-9+\-.]*:/i.test(lower)) return false;
  return true;
}

// -- Content helpers -------------------------------------------------------

export function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, (c) => map[c]);
}

export function renderContentFast(text) {
  return escapeHtml(String(text || '')).replace(/\n/g, '<br>');
}

export function appendFastText(el, delta) {
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

export function getVisibleAssistantContent(text, isStreaming) {
  const value = String(text || '');
  return isStreaming ? value.replace(/\n?@@SCENE[\s\S]*$/m, '').trimEnd() : value;
}

export function renderMarkdown(text) {
  let html = escapeHtml(text);

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function(_, lang, code) {
    var langTag = lang ? '<div style="font-size:10px;color:var(--text-tertiary);padding:4px 14px 0;text-transform:uppercase;letter-spacing:0.5px">' + escapeHtml(lang) + '</div>' : '';
    return langTag + '<pre><code>' + code.trimEnd() + '</code></pre>';
  });

  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function(_, alt, src) {
    if (!isSafeMarkdownUrl(src, true)) return alt || '';
    return '<img src="' + escapeAttr(src) + '" alt="' + escapeAttr(alt) + '" style="max-width:100%;border-radius:8px;margin:4px 0">';
  });

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(_, text, url) {
    if (!isSafeMarkdownUrl(url, false)) return text;
    return '<a href="' + escapeAttr(url) + '" target="_blank" rel="noopener noreferrer">' + text + '</a>';
  });

  html = html.replace(/(?<!["'>])(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');

  html = html.replace(/^### (.+)$/gm, '<h4 style="font-size:15px;margin:10px 0 4px">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 style="font-size:16px;margin:12px 0 4px">$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2 style="font-size:17px;margin:14px 0 6px">$1</h2>');

  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/^---$/gm, '<hr>');
  html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
  html = html.replace(/\n/g, '<br>');
  html = html.replace(/<br>\s*(<(?:pre|ul|ol|blockquote|hr|h[2-4]|li))/g, '$1');
  html = html.replace(/(<\/(?:pre|ul|ol|blockquote|h[2-4])>)\s*<br>/g, '$1');

  return html;
}
