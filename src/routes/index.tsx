import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Sparkles, Square, SquarePen, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { MessageMarkdown } from "@/components/MessageMarkdown";
import { OPTIMIZER_SKILL } from "@/lib/skills";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prompt Optimizer — rövid, egyértelmű promptok" },
      {
        name: "description",
        content:
          "Illeszd be a nyers promptodat, és kapj rövid, egyértelmű, bármelyik AI modellhez illő változatot, amit további utasításokkal finomíthatsz.",
      },
      {
        property: "og:title",
        content: "Prompt Optimizer — rövid, egyértelmű promptok",
      },
      {
        property: "og:description",
        content:
          "Illeszd be a nyers promptodat, és kapj rövid, egyértelmű, bármelyik AI modellhez illő változatot, amit további utasításokkal finomíthatsz.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OptimizerApp;
});

function messageText(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

function displayUserText(text: string): string {
  return text.replace(/^\s*prompt:\s*/i, "");
}

function newConversationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `conv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function OptimizerApp() {
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState(() => newConversationId());
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const skill = OPTIMIZER_SKILL;

  const { messages, sendMessage, status, setMessages, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (error) => {
      const message = error.message ?? "";
      toast.error(message.length > 0 ? message : "Nem sikerült választ kapni.");
    },
  });

  const isBusy = status === "submitted" || status === "streaming";
  const hasAssistant = useMemo(
    () => messages.some((message) => message.role === "assistant"),
    [messages],
  );

  const resize = useCallback(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [input, resize]);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const submit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isBusy) return;
    const payload =
      !hasAssistant && !/^\s*prompt:/i.test(trimmed) ? `prompt: ${trimmed}` : trimmed;
    sendMessage({ text: payload }, { body: { conversationId } });
    setInput("");
  }, [input, isBusy, hasAssistant, sendMessage, conversationId]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const startNew = useCallback(() => {
    if (isBusy) stop();
    setMessages([]);
    setInput("");
    setConversationId(newConversationId());
    textareaRef.current?.focus();
  }, [isBusy, stop, setMessages]);

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="ios-blur safe-top sticky top-0 z-20 border-b border-glass-border">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-2 px-3 py-2.5">
          <div className="glass flex h-9 w-9 items-center justify-center rounded-full text-ios-blue">
            <Wand2 size={18} />
          </div>

          <div className="min-w-0 text-center leading-tight">
            <h1 className="truncate text-[16px] font-semibold tracking-tight">{skill.name}</h1>
            <p className="truncate text-[12px] font-medium text-muted-foreground">
              {skill.description}
            </p>
          </div>

          <button
            type="button"
            onClick={startNew}
            aria-label="Új beszélgetés"
            className="tap-shrink glass flex h-9 w-9 items-center justify-center rounded-full text-ios-blue"
          >
            <SquarePen size={18} />
          </button>
        </div>
      </header>

      <main ref={scrollRef} className="ios-scroll flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-3.5 py-4">
          {messages.length === 0 ? (
            <EmptyState
              title={skill.greetingTitle}
              body={skill.greetingBody}
              examples={skill.examples}
              onPick={(text) => {
                setInput(text);
                textareaRef.current?.focus();
              }}
            />
          ) : (
            <div className="space-y-3">
              {messages.map((message) => {
                const text = messageText(message);
                if (message.role === "user") {
                  return (
                    <div key={message.id} className="flex justify-end">
                      <div className="bubble-shadow max-w-[85%] whitespace-pre-wrap break-words rounded-3xl rounded-br-md bg-bubble-user px-4 py-2.5 text-[15px] leading-relaxed text-bubble-user-foreground">
                        {displayUserText(text)}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={message.id} className="flex justify-start">
                    <div className="glass bubble-shadow w-full max-w-[94%] break-words rounded-3xl rounded-bl-md px-4 py-3 text-bubble-assistant-foreground">
                      {text ? <MessageMarkdown content={text} /> : <TypingDots />}
                    </div>
                  </div>
                );
              })}
              {status === "submitted" && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="glass bubble-shadow rounded-3xl rounded-bl-md px-4 py-3.5">
                    <TypingDots />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="ios-blur safe-bottom sticky bottom-0 z-20 border-t border-glass-border">
        <div className="mx-auto w-full max-w-2xl px-3 py-2.5">
          <div className="glass bubble-shadow flex items-end gap-2 rounded-3xl px-2 py-1.5">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder={
                hasAssistant ? "Finomíts tovább, pl. „tedd rövidebbé”…" : skill.placeholder
              }
              className="ios-scroll max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-[16px] leading-relaxed outline-none placeholder:text-muted-foreground"
            />
            {isBusy ? (
              <button
                type="button"
                onClick={stop}
                aria-label="Leállítás"
                className="tap-shrink mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground"
              >
                <Square size={15} className="fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={!input.trim()}
                aria-label="Küldés"
                className="tap-shrink mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
              >
                <ArrowUp size={19} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground" />
      <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground [animation-delay:0.2s]" />
      <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground [animation-delay:0.4s]" />
    </div>
  );
}

function EmptyState({
  title,
  body,
  examples,
  onPick,
}: {
  title: string;
  body: string;
  examples: string[];
  onPick: (text: string) => void;
}) {
  return (
    <div className="flex flex-col items-center px-3 pt-10 text-center">
      <div className="glow-ring flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-primary text-primary-foreground">
        <Sparkles size={30} />
      </div>
      <h2 className="mt-5 text-[22px] font-bold tracking-tight">{title}</h2>
      <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-muted-foreground">{body}</p>
      <div className="mt-7 w-full space-y-2">
        <p className="text-left text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
          Példák
        </p>
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => onPick(example)}
            className="tap-shrink glass flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left"
          >
            <Wand2 size={17} className="shrink-0 text-ios-blue" />
            <span className="text-[14px] leading-snug text-foreground">{example}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
