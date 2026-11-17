import React from "react";

/**
 * Minimal, safe Markdown for owner-edited content: ## headings, paragraphs,
 * - bullet / 1. numbered lists, **bold**, *italic* and [links](https://...).
 * Everything is rendered as React text, so no raw HTML is ever injected.
 */
function inline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\((?:https?:\/\/|\/|mailto:|tel:)[^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    const k = `${keyBase}-${i++}`;
    if (t.startsWith("**")) out.push(<strong key={k}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("*")) out.push(<em key={k}>{t.slice(1, -1)}</em>);
    else {
      const lm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(t)!;
      const external = lm[2].startsWith("http");
      out.push(
        <a key={k} href={lm[2]} {...(external ? { rel: "noopener noreferrer", target: "_blank" } : {})}>
          {lm[1]}
        </a>,
      );
    }
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source, className = "prose-lite" }: { source: string; className?: string }) {
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className={className}>
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter((l) => l.trim() !== "");
        if (!lines.length) return null;
        const k = `b${bi}`;
        if (lines[0].startsWith("### ")) return <h3 key={k}>{inline(lines[0].slice(4), k)}</h3>;
        if (lines[0].startsWith("## ")) return <h2 key={k}>{inline(lines[0].slice(3), k)}</h2>;
        if (lines.every((l) => /^\s*[-*•]\s+/.test(l)))
          return (
            <ul key={k}>
              {lines.map((l, li) => (
                <li key={li}>{inline(l.replace(/^\s*[-*•]\s+/, ""), `${k}-${li}`)}</li>
              ))}
            </ul>
          );
        if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l)))
          return (
            <ol key={k}>
              {lines.map((l, li) => (
                <li key={li}>{inline(l.replace(/^\s*\d+[.)]\s+/, ""), `${k}-${li}`)}</li>
              ))}
            </ol>
          );
        return (
          <p key={k}>
            {lines.map((l, li) => (
              <React.Fragment key={li}>
                {li > 0 && <br />}
                {inline(l, `${k}-${li}`)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
