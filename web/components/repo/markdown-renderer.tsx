"use client";

import React, { useEffect, useId, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "next-themes";
import { Check, Copy, Maximize2 } from "lucide-react";
import { extractHeadings, slugifyHeading } from "@/lib/markdown";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  language?: string;
}

interface CodeBlockProps {
  code: string;
  language?: string;
  isDark: boolean;
  locale: "zh" | "en";
}

const markdownText = {
  zh: {
    copied: "已复制",
    copyCode: "复制代码",
    loading: "图表渲染中...",
    openDiagram: "放大查看图表",
    diagramError: "Mermaid 渲染失败，已显示源码",
  },
  en: {
    copied: "Copied",
    copyCode: "Copy code",
    loading: "Rendering diagram...",
    openDiagram: "Open diagram",
    diagramError: "Mermaid render failed, showing source",
  },
} as const;

function useIsDarkTheme() {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "dark";
}

function getText(children: React.ReactNode): string {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children.map((child) => getText(child)).join("");
  }

  if (React.isValidElement(children)) {
    const props = children.props as { children?: React.ReactNode };
    return getText(props.children);
  }

  return "";
}

function createHeadingIdResolver(markdown: string) {
  const idsByText = new Map<string, string[]>();
  const usedByText = new Map<string, number>();

  for (const heading of extractHeadings(markdown, 6)) {
    const bucket = idsByText.get(heading.text) ?? [];
    bucket.push(heading.id);
    idsByText.set(heading.text, bucket);
  }

  return (text: string) => {
    const normalizedText = text
      .replace(/`/g, "")
      .replace(/\[(.*?)\]\([^)]*\)/g, "$1")
      .replace(/[*_~]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const ids = idsByText.get(normalizedText);

    if (!ids?.length) {
      return slugifyHeading(normalizedText) || "section";
    }

    const used = usedByText.get(normalizedText) ?? 0;
    usedByText.set(normalizedText, used + 1);
    return ids[used] ?? ids[ids.length - 1];
  };
}

function Heading({
  level,
  children,
  getHeadingId,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  getHeadingId: (text: string) => string;
}) {
  const id = getHeadingId(getText(children));
  const Tag = `h${level}` as const;

  return (
    <Tag id={id} data-toc="" className="scroll-mt-24" {...props}>
      {children}
    </Tag>
  );
}

function InlineCode(props: React.HTMLAttributes<HTMLElement>) {
  return (
    <code
      className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground"
      {...props}
    />
  );
}

function CodeBlock({ code, language, isDark, locale }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const copy = markdownText[locale];

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="not-prose group relative my-5 overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex min-h-10 items-center justify-between gap-3 border-b border-border bg-muted/40 px-3 py-2">
        <span className="truncate font-mono text-xs text-muted-foreground">
          {language || "text"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          title={copied ? copy.copied : copy.copyCode}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? copy.copied : copy.copyCode}</span>
        </button>
      </div>
      <SyntaxHighlighter
        style={isDark ? oneDark : oneLight}
        language={language || "text"}
        PreTag="div"
        showLineNumbers={code.split("\n").length > 3}
        wrapLongLines={false}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: "0.875rem",
          padding: "1rem",
          overflowX: "auto",
          background: "transparent",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

function MermaidBlock({ code, isDark, locale }: CodeBlockProps) {
  const reactId = useId().replace(/:/g, "");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const copy = markdownText[locale];

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      try {
        const mermaid = (await import("mermaid")).default;
        const diagramId = `repo-mermaid-${reactId}`;

        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? "dark" : "default",
          securityLevel: "strict",
          suppressErrorRendering: true,
        });

        const result = await mermaid.render(diagramId, code);
        document.getElementById(diagramId)?.remove();

        if (!cancelled) {
          setSvg(result.svg);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setSvg("");
          setError(err instanceof Error ? err.message : copy.diagramError);
        }
      }
    }

    setSvg("");
    setError("");
    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [code, copy.diagramError, isDark, reactId]);

  if (error) {
    return (
      <div className="not-prose my-5">
        <div className="mb-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {copy.diagramError}
        </div>
        <CodeBlock code={code} language="mermaid" isDark={isDark} locale={locale} />
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="not-prose my-5 flex min-h-36 items-center justify-center rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground">
        {copy.loading}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="not-prose group relative my-5 block w-full overflow-auto rounded-lg border border-border bg-background p-4 text-left transition-shadow hover:shadow-md"
        title={copy.openDiagram}
      >
        <span
          className="mx-auto block w-max max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <span className="absolute right-2 top-2 rounded-md bg-background/90 p-1.5 text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
          <Maximize2 className="h-4 w-4" />
        </span>
      </button>
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur"
          onClick={() => setExpanded(false)}
        >
          <div
            className="max-h-[90vh] max-w-[94vw] overflow-auto rounded-lg border border-border bg-card p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      )}
    </>
  );
}

function MarkdownViewer({ content, locale }: { content: string; locale: "zh" | "en" }) {
  const isDark = useIsDarkTheme();
  const getHeadingId = createHeadingIdResolver(content);

  return (
    <article
      className={cn(
        "prose prose-neutral max-w-none dark:prose-invert",
        "prose-headings:font-semibold prose-headings:tracking-normal",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        "prose-pre:bg-transparent prose-pre:p-0",
        "prose-code:before:content-none prose-code:after:content-none"
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children, ...props }) => (
            <Heading level={1} getHeadingId={getHeadingId} {...props}>
              {children}
            </Heading>
          ),
          h2: ({ children, ...props }) => (
            <Heading level={2} getHeadingId={getHeadingId} {...props}>
              {children}
            </Heading>
          ),
          h3: ({ children, ...props }) => (
            <Heading level={3} getHeadingId={getHeadingId} {...props}>
              {children}
            </Heading>
          ),
          h4: ({ children, ...props }) => (
            <Heading level={4} getHeadingId={getHeadingId} {...props}>
              {children}
            </Heading>
          ),
          h5: ({ children, ...props }) => (
            <Heading level={5} getHeadingId={getHeadingId} {...props}>
              {children}
            </Heading>
          ),
          h6: ({ children, ...props }) => (
            <Heading level={6} getHeadingId={getHeadingId} {...props}>
              {children}
            </Heading>
          ),
          code: ({ className, children, ...props }) => {
            const match = /language-([\w-]+)/.exec(className || "");
            const blockLanguage = match?.[1];
            const code = String(children).replace(/\n$/, "");

            if (!blockLanguage && !code.includes("\n")) {
              return <InlineCode {...props}>{children}</InlineCode>;
            }

            if (blockLanguage === "mermaid") {
              return <MermaidBlock code={code} language="mermaid" isDark={isDark} locale={locale} />;
            }

            return <CodeBlock code={code} language={blockLanguage} isDark={isDark} locale={locale} />;
          },
          pre: ({ children }) => <>{children}</>,
          table: ({ children, ...props }) => (
            <div className="my-5 overflow-x-auto rounded-lg border border-border">
              <table className="m-0 w-full border-collapse" {...props}>
                {children}
              </table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th className="border border-border bg-muted px-4 py-2 text-left font-semibold" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="border border-border px-4 py-2" {...props}>
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}

export function MarkdownRenderer({ content, language }: MarkdownRendererProps) {
  const locale = language === "en" ? "en" : "zh";
  const normalizedContent = useMemo(() => content, [content]);

  return <MarkdownViewer content={normalizedContent} locale={locale} />;
}
