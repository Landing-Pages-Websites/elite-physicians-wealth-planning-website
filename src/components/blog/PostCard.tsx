import Link from "next/link";
import type { ReactElement } from "react";
import { publishedDate, type BlogPost } from "@/lib/blog";

interface PostCardProps {
  post: BlogPost;
}

export default function PostCard({ post }: PostCardProps): ReactElement {
  const publishedIso = publishedDate(post)?.toISOString() ?? null;
  return (
    <article className="border-b border-ink/15 py-8 last:border-b-0">
      {post.date ? (
        publishedIso ? <time dateTime={publishedIso} className="font-body text-body-s text-gold-text">{post.date}</time> : (
          <span className="font-body text-body-s text-gold-text">{post.date}</span>
        )
      ) : null}
      <h2 className="mt-2 font-display text-display-m leading-[1.18] font-medium text-ink [overflow-wrap:anywhere]">
        <Link href={`/blog/${post.slug}`} className="decoration-gold underline-offset-4 hover:underline">{post.title}</Link>
      </h2>
      {post.description ? <p className="mt-3 max-w-[66ch] font-body text-body-m leading-[1.65] text-charcoal">{post.description}</p> : null}
      <Link href={`/blog/${post.slug}`} className="mt-3 inline-flex min-h-11 items-center font-body text-body-s font-semibold text-ink underline decoration-gold underline-offset-4 transition-colors duration-200 hover:text-gold-text" aria-label={`Read article: ${post.title}`}>
        Read article
      </Link>
    </article>
  );
}
