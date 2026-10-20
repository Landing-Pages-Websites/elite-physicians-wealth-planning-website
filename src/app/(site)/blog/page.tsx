import type { Metadata } from "next";
import type { ReactElement } from "react";
import BlogHeader from "@/components/blog/BlogHeader";
import PostCard from "@/components/blog/PostCard";
import { listPublishedPosts } from "@/lib/blog";
import { BRAND } from "@/lib/content";

const DESCRIPTION = `Articles and updates from ${BRAND.name}.`;

export const metadata: Metadata = {
  title: "Blog",
  description: DESCRIPTION,
  alternates: { canonical: "/blog" },
  openGraph: { title: "Blog", description: DESCRIPTION, url: "/blog", type: "website" },
};

export default function BlogIndexPage(): ReactElement {
  const posts = listPublishedPosts();
  return (
    <main id="main">
      <BlogHeader title="Blog" description={DESCRIPTION} backHref="/" backLabel="Home" />
      <section aria-label="Articles" className="bg-ivory">
        <div className="va-shell py-8 lg:py-12">
          <div className="max-w-3xl">
            {posts.length ? posts.map((post) => <PostCard key={post.slug} post={post} />) : (
              <p className="py-8 font-body text-body-l leading-relaxed text-charcoal">No articles have been published here yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
