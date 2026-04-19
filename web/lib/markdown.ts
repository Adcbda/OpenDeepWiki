import type { TOCItemType } from "fumadocs-core/toc";
import GithubSlugger from "github-slugger";

function normalizeHeadingText(text: string) {
  return text
    .replace(/`/g, "")
    .replace(/\[(.*?)\]\([^)]*\)/g, "$1")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractHeadings(markdown: string, maxLevel = 3): TOCItemType[] {
  const lines = markdown.split(/\r?\n/);
  const headings: TOCItemType[] = [];
  const slugger = new GithubSlugger();
  let inCodeBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      continue;
    }

    const match = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (!match) {
      continue;
    }

    const level = match[1].length;
    if (level > maxLevel) {
      continue;
    }

    const text = normalizeHeadingText(match[2].replace(/#+$/, "").trim());
    if (!text) {
      continue;
    }

    headings.push({
      title: text,
      url: `#${slugger.slug(text)}`,
      depth: level,
    });
  }

  return headings;
}
