import DOMPurify from "dompurify";

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "br", "hr",
      "ul", "ol", "li",
      "blockquote", "pre", "code",
      "strong", "em", "del", "ins", "sub", "sup",
      "a", "img",
      "table", "thead", "tbody", "tr", "th", "td",
      "dl", "dt", "dd",
      "div", "span",
    ],
    ALLOWED_ATTR: ["href", "target", "src", "alt", "title", "class", "id", "width", "height"],
    ALLOW_DATA_ATTR: false,
  });
}
