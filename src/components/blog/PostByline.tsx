import type { ReactElement } from "react";
import { publishedDate, type BlogPost } from "@/lib/blog";

interface PostBylineProps {
  post: BlogPost;
}

export default function PostByline({ post }: PostBylineProps): ReactElement | null {
  if (!post.date && !post.author) return null;
  const publishedIso = publishedDate(post)?.toISOString() ?? null;
  return (
    <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 font-body text-body-s leading-relaxed text-mist">
      {post.date ? (
        publishedIso ? <time dateTime={publishedIso}>{post.date}</time> : <span>{post.date}</span>
      ) : null}
      {post.author ? <span>By {post.author}</span> : null}
    </div>
  );
}
