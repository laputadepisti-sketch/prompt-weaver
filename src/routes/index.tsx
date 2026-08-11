import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Sparkles, SquarePen, Square, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { MessageMarkdown } from "@/components/MessageMarkdown";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prompt Optimizer — rövid, pontos promptok bármelyik modellhez" },
      {
        name: "description",
        content:
          "Alakítsd át a nyers promptjaidat rövid, egyértelmű, bármelyik AI modellhez illő promptokká, majd finomítsd tovább utasításokkal.",
      },
      {
        property: "og:title",
        content: "Prompt Optimizer — rövid, pontos promptok bármelyik modellhez",
      },
      {
        property: "og:description",
        content:
          "Alakítsd át a nyers promptjaidat rövid, egyértelmű, bármelyik AI modellhez illő promptokká, majd finomítsd tovább utasításokkal.",
      },
    ],
  }),
  component: OptimizerApp,
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

const EXAMPLES = [
  "Javítsd ki a kódom összes hibáját, és add vissza a teljes, rövidítetlen fájlt egyben.",
  "Write a Python script that scrapes a website and stores results in a database.",
  "Írd át ezt a technikai leírást egyetlen, teljes, lépésről lépésre építő prompttá.",
];


function OptimizerApp() {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status, setMessages, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (error) => {
      const message = error.message ?? "";
      toast.error(
        /402|payment required|credit/i.test(message)
          ? "Elfogytak az AI kreditek. Tölts fel a munkaterületeden."
          : /429|rate limit|too many/i.test(message)
            ? "Túl sok kérés egyszerre. Próbáld újra pár másodperc múlva."
            : "Nem sikerült optimalizálni. Próbáld újra.",
      );
    },
  });

  const isBusy = status === "submitted" || status === "streaming";
  const hasOptimized = useMemo(() => messages.some((m) => m.role === "assistant"), [messages]);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [input, resize]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const submit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isBusy) return;
    const payload =
      !hasOptimized && !/^\s*prompt:/i.test(trimmed) ? `prompt: ${trimmed}` : trimmed;
    sendMessage({ text: payload });
    setInput("");
  }, [input, isBusy, hasOptimized, sendMessage]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const startNew = () => {
    if (isBusy) stop();
    setMessages([]);
    setInput("");
    textareaRef.current?.focus();
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <header className="ios-blur safe-top sticky top-0 z-20 border-b border-border/60">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground bubble-shadow">
              <Wand2 size={18} />
            </div>
            <div className="leading-tight">
              <h1 className="text-[17px] font-semibold tracking-tight">Prompt Optimizer</h1>
              <p className="text-[12px] font-medium text-muted-foreground">Bármelyik modellhez</p>
            </div>
          </div>
          <button
            type="button"
            onClick={startNew}
            aria-label="Új optimalizálás"
            className="tap-shrink flex h-9 w-9 items-center justify-center rounded-full text-ios-blue"
          >
            <SquarePen size={21} />
          </button>
        </div>
      </header>

      <main ref={scrollRef} className="ios-scroll flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-3.5 py-4">
          {messages.length === 0 ? (
            <EmptyState onPick={(text) => setInput(text)} />
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
                    <div className="bubble-shadow w-full max-w-[92%] break-words rounded-3xl rounded-bl-md border border-border/70 bg-bubble-assistant px-4 py-3 text-bubble-assistant-foreground">
                      {text ? (
                        <MessageMarkdown content={text} />
                      ) : (
                        <TypingDots />
                      )}
                    </div>
                  </div>
                );
              })}
              {status === "submitted" &&
                messages[messages.length - 1]?.role === "user" && (
                  <div className="flex justify-start">
                    <div className="bubble-shadow rounded-3xl rounded-bl-md border border-border/70 bg-bubble-assistant px-4 py-3.5">
                      <TypingDots />
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>
      </main>

      <footer className="ios-blur safe-bottom sticky bottom-0 z-20 border-t border-border/60">
        <div className="mx-auto w-full max-w-2xl px-3 py-2.5">
          <div className="flex items-end gap-2 rounded-3xl border border-border bg-card px-2 py-1.5 bubble-shadow">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder={
                hasOptimized
                  ? "Finomíts tovább, pl. „tedd rövidebbé”…"
                  : "Illeszd be a nyers promptodat…"
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

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center px-3 pt-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-primary text-primary-foreground bubble-shadow">
        <Sparkles size={30} />
      </div>
      <h2 className="mt-5 text-[22px] font-bold tracking-tight">Promptoptimalizálás</h2>
      <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
        Illeszd be a nyers promptodat, és visszakapod a rövid, egyértelmű, bármelyik AI
        modellhez illő változatát változásnaplóval. Utána tovább finomíthatod.
      </p>
      <div className="mt-7 w-full space-y-2">
        <p className="text-left text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
          Példák
        </p>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => onPick(example)}
            className="tap-shrink flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left bubble-shadow"
          >
            <Wand2 size={17} className="shrink-0 text-ios-blue" />
            <span className="text-[14px] leading-snug text-foreground">{example}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
