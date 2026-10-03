import { Fragment, type ReactNode } from "react";

/** **bold** spans inside a line. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={i} className="font-bold text-ink">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{part.replace(/(^|\s)\*([^*\s][^*]*)\*/g, "$1$2")}</Fragment>
    ),
  );
}

/**
 * Minimal markdown for AI replies: paragraphs, "- " / "1. " lists,
 * "#" headings and **bold**. Rendered as React nodes, never raw HTML.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r/g, "").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const bullet = /^\s*[-*•]\s+/;
    const numbered = /^\s*\d+[.)]\s+/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const re = ordered ? numbered : bullet;
      const items: string[] = [];
      while (i < lines.length && re.test(lines[i])) items.push(lines[i++].replace(re, ""));
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List key={i} className={ordered ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5 marker:text-lime-strong"}>
          {items.map((it, k) => (
            <li key={k}>{inline(it)}</li>
          ))}
        </List>,
      );
      continue;
    }
    if (/^#{1,4}\s+/.test(line)) {
      blocks.push(
        <p key={i} className="font-bold text-ink">
          {inline(line.replace(/^#{1,4}\s+/, ""))}
        </p>,
      );
      i++;
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !bullet.test(lines[i]) && !numbered.test(lines[i]) && !/^#{1,4}\s+/.test(lines[i])) para.push(lines[i++]);
    blocks.push(<p key={i}>{inline(para.join(" "))}</p>);
  }
  return <div className={className ?? "space-y-2.5"}>{blocks}</div>;
}
