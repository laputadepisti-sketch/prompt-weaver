import { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";

function CodeBlock({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="relative my-2 overflow-hidden rounded-2xl border border-border bg-secondary">
      <button
        type="button"
        onClick={copy}
        className="tap-shrink absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-xs font-medium text-ios-blue shadow-sm"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? "Másolva" : "Másolás"}
      </button>
      <pre className="ios-scroll overflow-x-auto px-3.5 pb-3.5 pt-10 text-[13px] leading-relaxed">
        <code className="font-mono text-foreground">{value}</code>
      </pre>
    </div>
  );
}

function MarkdownInner({ content }: { content: string }) {
  return (
    <div className="text-[15px] leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          h1: ({ children }) => <h1 className="mb-2 mt-1 text-lg font-bold">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-2 mt-1 text-base font-bold">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-1.5 mt-1 text-[15px] font-semibold">{children}</h3>,
          ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>,
          li: ({ children }) => <li className="pl-0.5">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-ios-blue underline underline-offset-2"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="ios-scroll my-2 overflow-x-auto rounded-xl border border-border">
              <table className="w-full border-collapse text-[13px]">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-border bg-secondary px-2.5 py-1.5 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border px-2.5 py-1.5 align-top">{children}</td>
          ),
          code: ({ className, children }) => {
            const text = String(children ?? "").replace(/\n$/, "");
            if (className || text.includes("\n")) {
              return <CodeBlock value={text} />;
            }
            return (
              <code className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[13px] text-foreground">
                {children}
              </code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-ios-blue/40 pl-3 text-muted-foreground">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export const MessageMarkdown = memo(MarkdownInner);
