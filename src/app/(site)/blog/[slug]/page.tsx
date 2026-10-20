import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import BlogHeader from "@/components/blog/BlogHeader";
import BlogImage from "@/components/blog/BlogImage";
import MarkdownBody from "@/components/blog/MarkdownBody";
import PostByline from "@/components/blog/PostByline";
import { getPublishedPost, listPublishedPosts } from "@/lib/blog";

interface ArticleParams {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams(): Array<{ slug: string }> {
  return listPublishedPosts().map((post) => ({ slug: post.slug }));
}

// Unknown slugs must return a real 404, never a streamed blank article shell.
export const dynamicParams = false;

export async function generateMetadata({ params }: ArticleParams): Promise<Metadata> {
  const { slug } = await params;
  const post = getPublishedPost(slug);
  if (!post) return {};
  const description = post.description || post.title;
  return {
    title: post.title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title, description, url: `/blog/${post.slug}`, type: "article",
      ...(post.image ? { images: [{ url: post.image, alt: post.imageAlt ?? post.title }] } : {}),
    },
    twitter: {
      title: post.title, description, card: post.image ? "summary_large_image" : "summary",
      ...(post.image ? { images: [post.image] } : {}),
    },
  };
}

export default async function BlogArticlePage({ params }: ArticleParams): Promise<ReactElement> {
  const { slug } = await params;
  const post = getPublishedPost(slug);
  if (!post) notFound();
  return (
    <main id="main">
      <article>
        <BlogHeader title={post.title} description={post.description} backHref="/blog" backLabel="All articles">
          <PostByline post={post} />
        </BlogHeader>
        <div className="va-shell py-10 lg:py-16">
          <div className="max-w-3xl">
            {post.image ? (
              <div className="mb-10">
                <BlogImage src={post.image} alt={post.imageAlt ?? post.title} variant="banner" priority />
              </div>
            ) : null}
            <MarkdownBody source={post.body} />
          </div>
        </div>
      </article>
    </main>
  );
}
