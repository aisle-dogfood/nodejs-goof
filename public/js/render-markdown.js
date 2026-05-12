/**
 * Decodes the URL-encoded markdown fragment that was sanitized on the server.
 *
 * The server escapes raw HTML and rejects dangerous markdown URLs before
 * encoding the rendered HTML into an attribute-safe string. This helper only
 * reverses the URL encoding step so the already-sanitized HTML can be used for
 * display in the browser.
 *
 * @param {string|null} encodedContent URL-encoded sanitized markdown HTML.
 * @returns {string|null} The decoded sanitized HTML, or null when unavailable.
 */
function decodeRenderedMarkdown(encodedContent) {
  if (encodedContent === null) {
    return null;
  }

  return decodeURIComponent(encodedContent);
}

/**
 * Applies pre-sanitized markdown HTML to todo content placeholders.
 *
 * Security approach:
 * - markdown is rendered and sanitized on the server
 * - the sanitized HTML is URL-encoded before being inserted into the template
 * - this function decodes that trusted value and injects it into the DOM
 *
 * Because the client only injects server-sanitized output, it preserves the XSS
 * protections added during markdown rendering while still allowing rich text to
 * be displayed in the todo list.
 *
 * @returns {void}
 */
function applyRenderedMarkdown() {
  var markdownNodes = document.querySelectorAll('.todo-content[data-rendered-content]');

  for (var i = 0; i < markdownNodes.length; i++) {
    var markdownNode = markdownNodes[i];
    var encodedContent = markdownNode.getAttribute('data-rendered-content');

    try {
      var renderedContent = decodeRenderedMarkdown(encodedContent);

      if (renderedContent !== null) {
        markdownNode.innerHTML = renderedContent;
      }
    } catch (error) {
    }
  }
}

applyRenderedMarkdown();
