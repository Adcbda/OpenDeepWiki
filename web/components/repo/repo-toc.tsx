"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import type { RepoHeading } from "@/types/repository";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface RepoTocProps {
  headings: RepoHeading[];
  title?: string;
}

export function RepoToc({ headings, title = "On this page" }: RepoTocProps) {
  const [activeId, setActiveId] = useState(headings[0]?.id ?? "");
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  useEffect(() => {
    if (headings.length === 0) {
      return;
    }

    const visibleHeadings = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleHeadings.set(entry.target.id, entry.boundingClientRect.top);
          } else {
            visibleHeadings.delete(entry.target.id);
          }
        }

        if (visibleHeadings.size > 0) {
          const [nextActiveId] = [...visibleHeadings.entries()].sort((a, b) => a[1] - b[1])[0];
          setActiveId(nextActiveId);
          return;
        }

        const passedHeading = headings
          .map((heading) => document.getElementById(heading.id))
          .filter((element): element is HTMLElement => Boolean(element))
          .filter((element) => element.getBoundingClientRect().top < 120)
          .at(-1);

        if (passedHeading) {
          setActiveId(passedHeading.id);
        }
      },
      {
        rootMargin: "-96px 0px -65% 0px",
        threshold: [0, 1],
      }
    );

    for (const heading of headings) {
      const element = document.getElementById(heading.id);
      if (element) {
        observer.observe(element);
      }
    }

    return () => observer.disconnect();
  }, [headings]);

  useEffect(() => {
    linkRefs.current[activeId]?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [activeId]);

  if (headings.length === 0) {
    return null;
  }

  function handleAnchorClick(event: MouseEvent<HTMLAnchorElement>, headingId: string) {
    event.preventDefault();
    const element = document.getElementById(headingId);
    if (!element) {
      return;
    }

    element.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${headingId}`);
    setActiveId(headingId);
  }

  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 p-3 xl:sticky xl:top-6">
      <div className="mb-3 px-1 text-xs font-semibold uppercase text-foreground">
        {title}
      </div>
      <ScrollArea className="max-h-[calc(100vh-9rem)] pr-2">
        <nav className="space-y-1">
          {headings.map((heading) => {
            const isActive = heading.id === activeId;

            return (
              <a
                key={heading.id}
                ref={(node) => {
                  linkRefs.current[heading.id] = node;
                }}
                href={`#${heading.id}`}
                onClick={(event) => handleAnchorClick(event, heading.id)}
                className={cn(
                  "block rounded-md border-l-2 py-1.5 pr-2 text-sm transition-colors",
                  isActive
                    ? "border-primary bg-background/70 text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-background/50 hover:text-foreground"
                )}
                style={{ paddingLeft: `${Math.max(0, heading.level - 1) * 12 + 8}px` }}
              >
                {heading.text}
              </a>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );
}
