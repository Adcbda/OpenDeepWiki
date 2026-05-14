import { cookies } from "next/headers";
import { DocNotFound } from "@/components/repo/doc-not-found";
import { MarkdownRenderer } from "@/components/repo/markdown-renderer";
import { RepoToc } from "@/components/repo/repo-toc";
import { SourceFiles } from "@/components/repo/source-files";
import { extractHeadings } from "@/lib/markdown";
import { decodeRouteSegment } from "@/lib/repo-route";
import { fetchRepoDoc } from "@/lib/repository-api";

interface RepoDocPageProps {
  params: Promise<{
    owner: string;
    repo: string;
    slug: string[];
  }>;
  searchParams: Promise<{
    branch?: string;
    lang?: string;
  }>;
}

async function getDocData(owner: string, repo: string, slug: string, branch?: string, lang?: string) {
  try {
    const doc = await fetchRepoDoc(owner, repo, slug, branch, lang);
    if (!doc.exists) {
      return null;
    }

    return {
      doc,
      headings: extractHeadings(doc.content, 3),
    };
  } catch {
    return null;
  }
}

export default async function RepoDocPage({ params, searchParams }: RepoDocPageProps) {
  const { owner, repo, slug: slugParts } = await params;
  const decodedOwner = decodeRouteSegment(owner);
  const decodedRepo = decodeRouteSegment(repo);
  const resolvedSearchParams = await searchParams;
  const branch = resolvedSearchParams?.branch;
  const lang = resolvedSearchParams?.lang;
  const slug = slugParts.join("/");

  const data = await getDocData(decodedOwner, decodedRepo, slug, branch, lang);

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl">
        <DocNotFound slug={slug} />
      </div>
    );
  }

  const { doc, headings } = data;
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value === "en" ? "en" : "zh";
  const tocTitle = locale === "en" ? "Table of Contents" : "目录";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 xl:flex-row">
      <article className="min-w-0 flex-1">
        <MarkdownRenderer content={doc.content} language={locale} />
        <SourceFiles files={doc.sourceFiles || []} branch={branch} />
      </article>
      {headings.length > 0 && (
        <aside className="xl:w-64 xl:shrink-0">
          <RepoToc headings={headings} title={tocTitle} />
        </aside>
      )}
    </div>
  );
}
