import { describe, expect, it } from "vitest";
import { extractHeadings, slugifyHeading } from "@/lib/markdown";

describe("markdown heading utilities", () => {
  it("generates stable ids for repeated headings", () => {
    const headings = extractHeadings(
      [
        "# Overview",
        "## Usage",
        "## Usage",
        "### Usage",
      ].join("\n"),
      6
    );

    expect(headings.map((heading) => heading.id)).toEqual([
      "overview",
      "usage",
      "usage-1",
      "usage-2",
    ]);
  });

  it("ignores headings inside fenced code blocks", () => {
    const headings = extractHeadings(
      [
        "# Visible",
        "```md",
        "# Hidden",
        "```",
        "## Also visible",
      ].join("\n")
    );

    expect(headings).toEqual([
      { id: "visible", text: "Visible", level: 1 },
      { id: "also-visible", text: "Also visible", level: 2 },
    ]);
  });

  it("normalizes decorated heading text the same way ids are slugified", () => {
    const headings = extractHeadings("## [`ReactMarkdown`](https://example.com) **Mermaid** ~~Flow~~");

    expect(headings).toEqual([
      {
        id: slugifyHeading("ReactMarkdown Mermaid Flow"),
        text: "ReactMarkdown Mermaid Flow",
        level: 2,
      },
    ]);
  });
});
