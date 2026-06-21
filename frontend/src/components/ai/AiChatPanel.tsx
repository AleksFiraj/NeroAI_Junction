import { AnimatePresence, motion } from "framer-motion";
import { Bot, Loader2, Send, User } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAiChat } from "../../hooks/useAi";
import { AMBER } from "../../lib/risk";
import type { AiChatMessage } from "../../types/domain";

const SUGGESTIONS = [
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
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  const loadingRef = useRef(false);
  messagesRef.current = messages;

  const send = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || loadingRef.current) return;

      const next: AiChatMessage[] = [...messagesRef.current, { role: "user", content: q }];
      setMessages(next);
      setInput("");
      loadingRef.current = true;
      setLoading(true);

      try {
        const data = await chat.mutateAsync(next);
        const answer =
          data.answer?.trim() || "No response was returned for this question.";
        setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Unable to reach the investigation assistant." },
        ]);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [chat],
  );

  useEffect(() => {
    if (!autoIntro) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        void send(
          "Give a brief investigation summary for this customer: what was detected, how confident are we, and what should we do next?",
        );
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                m.role === "user" ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"
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
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card"
              }`}
            >
              {m.content}
            </div>
          </motion.div>
        ))}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-[12px] text-muted-foreground"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Bot className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
              Analyzing the data...
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="shrink-0 space-y-2 pt-3">
        <div className="flex gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => void send(s)}
              disabled={loading}
              className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex gap-1.5"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this customer..."
            disabled={loading}
            className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-[12.5px] placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-primary-foreground transition-colors disabled:opacity-60"
            style={{ background: AMBER }}
          >
            <Send className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </form>
      </div>
    </div>
  );
}
