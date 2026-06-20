import { AnimatePresence, motion } from "framer-motion";
import { Bot, Loader2, Send, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAiChat } from "../../hooks/useAi";
import type { AiChatMessage } from "../../types/domain";

const SUGGESTIONS = [
  "How was this detected?",
  "What are the estimated losses?",
  "How confident is the fraud assessment?",
];

export function AiChatPanel({
  customerId,
  autoIntro = true,
}: {
  customerId: string;
  autoIntro?: boolean;
}) {
  const chat = useAiChat(customerId);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const intro = useRef(false);

  const send = (text: string) => {
    const q = text.trim();
    if (!q || chat.isPending) return;
    const next: AiChatMessage[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    chat.mutate(next, {
      onSuccess: (data) =>
        setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]),
      onError: () =>
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Unable to reach the investigation assistant." },
        ]),
    });
  };

  useEffect(() => {
    if (autoIntro && !intro.current) {
      intro.current = true;
      send(
        "Investigate this customer: explain how and from what data the risk was detected, the estimated losses, and the fraud and anomaly confidence.",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, chat.isPending]);

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                m.role === "user" ? "bg-surface-3 text-text-muted" : "bg-accent/15 text-accent"
              }`}
            >
              {m.role === "user" ? (
                <User className="h-3.5 w-3.5" strokeWidth={2} />
              ) : (
                <Bot className="h-3.5 w-3.5" strokeWidth={2} />
              )}
            </span>
            <div
              className={`max-w-[82%] rounded-xl px-3.5 py-2.5 text-[12.5px] leading-relaxed ${
                m.role === "user"
                  ? "bg-accent text-white"
                  : "border border-border bg-surface-2 text-text"
              }`}
            >
              {m.content}
            </div>
          </motion.div>
        ))}
        <AnimatePresence>
          {chat.isPending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-[12px] text-text-muted"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-accent">
                <Bot className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
              Analyzing the data...
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {messages.length <= 1 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] text-text-muted transition-colors hover:border-border-strong hover:text-text"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex gap-1.5"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this customer..."
          className="flex-1 rounded-md border border-border bg-surface-2 px-3 py-2 text-[12.5px] text-text placeholder:text-text-subtle focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={chat.isPending}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-accent bg-accent text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          <Send className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </form>
    </div>
  );
}
