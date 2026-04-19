"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "next-themes";
import { Mermaid } from "./mermaid";
import type { ClassAttributes, HTMLAttributes } from "react";
import type { ExtraProps } from "react-markdown";

interface WikiMarkdownProps {
  content: string;
}

function isMermaidLanguage(lang: string | undefined): boolean {
  return lang === "mermaid" || lang === "mmd" || lang === "mermaidjs";
}

function CodeBlock({
  className,
  children,
  ...props
}: ClassAttributes<HTMLElement> & HTMLAttributes<HTMLElement> & ExtraProps) {
  const { resolvedTheme } = useTheme();
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : undefined;
  const codeContent = String(children).replace(/\n$/, "");

  if (isMermaidLanguage(language)) {
    return <Mermaid chart={codeContent} />;
  }

  if (!language) {
    return (
      <code
        className="rounded px-1.5 py-0.5 text-sm bg-muted text-foreground font-mono border border-border/50"
        {...props}
      >
        {children}
      </code>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <SyntaxHighlighter
      style={isDark ? oneDark : oneLight}
      language={language}
      PreTag="pre"
      CodeTag="code"
      customStyle={{
        margin: "1rem 0",
        borderRadius: "0.5rem",
        fontSize: "0.875rem",
        overflowX: "auto",
        backgroundColor: isDark ? "oklch(0.205 0 0)" : "oklch(0.97 0 0)",
      }}
      codeTagProps={{
        style: {
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        },
      }}
    >
      {codeContent}
    </SyntaxHighlighter>
  );
}

export function WikiMarkdown({ content }: WikiMarkdownProps) {
  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none prose-pre:p-4 prose-pre:rounded-lg prose-code:before:hidden prose-code:after:hidden">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          code: CodeBlock,
          pre: ({ children }) => <>{children}</>,
          a: ({ href, children }) => (
            <a
              href={href}
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
              className="text-primary hover:underline"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border px-4 py-2 bg-muted font-semibold text-left">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-4 py-2">{children}</td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-4">
              {children}
            </blockquote>
          ),
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt}
              className="max-w-full h-auto rounded-lg my-4"
              loading="lazy"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}