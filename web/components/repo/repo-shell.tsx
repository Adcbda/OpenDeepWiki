"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Download, Network, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { RepoBranchesResponse, RepoTreeNode } from "@/types/repository";
import { ChatAssistant, buildCatalogMenu } from "@/components/chat";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchRepoBranches, fetchRepoTree } from "@/lib/repository-api";
import { buildRepoBasePath, buildRepoDocPath, buildRepoMindMapPath } from "@/lib/repo-route";
import { cn } from "@/lib/utils";
import { BranchLanguageSelector } from "./branch-language-selector";

const repoUiText = {
  zh: {
    wikiTitle: "仓库 Wiki",
    mindMap: "项目架构",
    exportDocs: "导出文档",
    exporting: "导出中...",
    collapseSidebar: "收起目录",
    expandSidebar: "展开目录",
  },
  en: {
    wikiTitle: "Repository Wiki",
    mindMap: "Project Architecture",
    exportDocs: "Export Docs",
    exporting: "Exporting...",
    collapseSidebar: "Collapse catalog",
    expandSidebar: "Expand catalog",
  },
} as const;

interface RepoShellProps {
  owner: string;
  repo: string;
  initialNodes: RepoTreeNode[];
  children: React.ReactNode;
  initialBranches?: RepoBranchesResponse;
  initialBranch?: string;
  initialLanguage?: string;
  uiLocale?: "zh" | "en";
}

function SidebarTree({
  nodes,
  owner,
  repo,
  queryString,
  currentPath,
  depth = 0,
}: {
  nodes: RepoTreeNode[];
  owner: string;
  repo: string;
  queryString: string;
  currentPath: string;
  depth?: number;
}) {
  return (
    <ul className={depth === 0 ? "space-y-1" : "mt-1 space-y-1 border-l border-border/60 pl-3"}>
      {nodes.map((node) => {
        const href = queryString
          ? `${buildRepoDocPath(owner, repo, node.slug)}?${queryString}`
          : buildRepoDocPath(owner, repo, node.slug);
        const isActive = currentPath === node.slug;

        return (
          <li key={node.slug}>
            <Link
              href={href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/80 hover:bg-muted hover:text-foreground"
              )}
            >
              {node.title}
            </Link>
            {node.children?.length > 0 && (
              <SidebarTree
                nodes={node.children}
                owner={owner}
                repo={repo}
                queryString={queryString}
                currentPath={currentPath}
                depth={depth + 1}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function RepoShell({
  owner,
  repo,
  initialNodes,
  children,
  initialBranches,
  initialBranch,
  initialLanguage,
  uiLocale = "zh",
}: RepoShellProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const urlBranch = searchParams.get("branch");
  const urlLang = searchParams.get("lang");
  const repoBasePath = buildRepoBasePath(owner, repo);

  const [nodes, setNodes] = useState<RepoTreeNode[]>(initialNodes);
  const [branches, setBranches] = useState<RepoBranchesResponse | undefined>(initialBranches);
  const [currentBranch, setCurrentBranch] = useState(initialBranch || "");
  const [currentLanguage, setCurrentLanguage] = useState(initialLanguage || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const copy = repoUiText[uiLocale];

  const currentDocPath = React.useMemo(() => {
    const encodedPrefix = `${repoBasePath}/`;
    if (pathname.startsWith(encodedPrefix)) {
      return pathname.slice(encodedPrefix.length);
    }

    const rawPrefix = `/${owner}/${repo}/`;
    if (pathname.startsWith(rawPrefix)) {
      return pathname.slice(rawPrefix.length);
    }

    return "";
  }, [pathname, owner, repo, repoBasePath]);

  useEffect(() => {
    const branch = urlBranch || undefined;
    const lang = urlLang || undefined;

    if (!branch && !lang) {
      return;
    }

    if (branch === currentBranch && lang === currentLanguage) {
      return;
    }

    async function fetchData() {
      setIsLoading(true);
      try {
        const [treeData, branchesData] = await Promise.all([
          fetchRepoTree(owner, repo, branch, lang),
          fetchRepoBranches(owner, repo),
        ]);

        if (treeData.nodes.length > 0) {
          setNodes(treeData.nodes);
          setCurrentBranch(treeData.currentBranch || "");
          setCurrentLanguage(treeData.currentLanguage || "");
        }

        if (branchesData) {
          setBranches(branchesData);
        }
      } catch (error) {
        console.error("Failed to fetch tree data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [urlBranch, urlLang, owner, repo, currentBranch, currentLanguage]);

  const queryString = searchParams.toString();
  const mindMapUrl = queryString
    ? `${buildRepoMindMapPath(owner, repo)}?${queryString}`
    : buildRepoMindMapPath(owner, repo);
  const title = `${owner}/${repo}`;

  async function handleExport() {
    if (isExporting) {
      return;
    }

    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (currentBranch) params.set("branch", currentBranch);
      if (currentLanguage) params.set("lang", currentLanguage);

      const exportUrl = `/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/export${
        params.toString() ? `?${params.toString()}` : ""
      }`;

      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error(copy.exportDocs);
      }

      const contentDisposition = response.headers.get("content-disposition");
      let fileName = `${owner}-${repo}-${currentBranch || "main"}-${currentLanguage || "zh"}.zip`;
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (fileNameMatch?.[1]) {
          fileName = fileNameMatch[1].replace(/['"]/g, "");
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(anchor);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  }

  const sidebarBanner = (
    <div className="space-y-3">
      {branches && (
        <BranchLanguageSelector
          owner={owner}
          repo={repo}
          branches={branches}
          currentBranch={currentBranch}
          currentLanguage={currentLanguage}
        />
      )}
      <div className="space-y-2">
        <Link
          href={mindMapUrl}
          className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-blue-700 transition-colors hover:bg-blue-500/20 dark:text-blue-300"
        >
          <Network className="h-4 w-4" />
          <span className="text-sm font-medium">{copy.mindMap}</span>
        </Link>
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="flex w-full items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-green-700 transition-colors hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-green-300"
        >
          <Download className="h-4 w-4" />
          <span className="text-sm font-medium">
            {isExporting ? copy.exporting : copy.exportDocs}
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{copy.wikiTitle}</div>
            <div className="text-lg font-semibold">{title}</div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-6">
        <aside
          className={cn(
            "w-full shrink-0 transition-[width] duration-300 lg:sticky lg:top-6 lg:self-start",
            isSidebarCollapsed ? "lg:w-16" : "lg:w-80"
          )}
        >
          <div className="flex max-h-[calc(100vh-3rem)] min-h-0 flex-col rounded-lg border border-border/70 bg-card p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className={cn("min-w-0", isSidebarCollapsed && "lg:hidden")}>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{copy.wikiTitle}</div>
                <div className="truncate text-sm font-semibold">{title}</div>
              </div>
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed((value) => !value)}
                className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:inline-flex"
                title={isSidebarCollapsed ? copy.expandSidebar : copy.collapseSidebar}
                aria-label={isSidebarCollapsed ? copy.expandSidebar : copy.collapseSidebar}
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </button>
            </div>

            {isSidebarCollapsed && (
              <div className="mt-3 hidden flex-col items-center gap-2 border-t border-border/70 pt-3 lg:flex">
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-sm font-semibold text-foreground transition-colors hover:bg-accent"
                  title={copy.expandSidebar}
                >
                  {repo.slice(0, 1).toUpperCase()}
                </button>
              </div>
            )}

            <div className={cn("mt-4 flex min-h-0 flex-1 flex-col", isSidebarCollapsed && "lg:hidden")}>
              {sidebarBanner}
              <div className="mt-4 min-h-0 flex-1 border-t border-border/70 pt-4">
                <ScrollArea className="h-80 pr-3 lg:h-[calc(100vh-22rem)]">
                  <SidebarTree
                    nodes={nodes}
                    owner={owner}
                    repo={repo}
                    queryString={queryString}
                    currentPath={currentDocPath}
                  />
                </ScrollArea>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="rounded-lg border border-border/70 bg-card p-4 shadow-sm sm:p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>

      <ChatAssistant
        context={{
          owner,
          repo,
          branch: currentBranch,
          language: currentLanguage,
          currentDocPath,
          catalogMenu: buildCatalogMenu(nodes),
        }}
      />
    </div>
  );
}
