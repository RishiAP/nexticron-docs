import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkGfm from "remark-gfm"
import remarkRehype from "remark-rehype"
import rehypePrettyCode from "rehype-pretty-code"
import rehypeReact from "rehype-react"
import * as prod from "react/jsx-runtime"
import { CodeBlockWithCopy } from "@/components/code-block-with-copy"

type MarkdownRendererProps = {
  content: string
}

export async function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypePrettyCode, {
      theme: {
        dark: "github-dark",
        light: "github-light",
      },
      keepBackground: true
    })
    .use(rehypeReact, {
      ...prod,
      components: {
        pre: CodeBlockWithCopy,
      },
    } as never)
    .process(content)

  return (
    <article className="prose prose-neutral dark:prose-invert max-w-4xl prose-headings:scroll-mt-20">
      {file.result}
    </article>
  )
}
