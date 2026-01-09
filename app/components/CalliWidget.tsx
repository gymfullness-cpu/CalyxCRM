"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function CalliWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Cześć 👋 Jestem **Calli Chat**.\n\nPomagam w nieruchomościach (KW, notariusz, urząd, dokumenty), ale mogę też odpowiedzieć na dowolne pytanie i sprawdzić aktualne informacje w sieci.\n\nZadaj pytanie 👇",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/calli", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      // ✅ DODATEK: jeśli backend zwraca sources (linki), doklej je do odpowiedzi
      let content: string = data.reply ?? "";

      if (Array.isArray(data.sources) && data.sources.length) {
        const srcText = data.sources
          .slice(0, 5)
          .map((s: any, i: number) => {
            const title = typeof s?.title === "string" && s.title.trim() ? s.title.trim() : "";
            const url = typeof s?.url === "string" ? s.url : "";
            return `${i + 1}. ${title ? title + " — " : ""}${url}`;
          })
          .filter((line: string) => line.trim() && !line.trim().endsWith("—"))
          .join("\n");

        if (srcText.trim()) {
          content += `\n\nŹródła:\n${srcText}`;
        }
      }

      setMessages((m) => [...m, { role: "assistant", content }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "⚠️ Wystąpił błąd. Spróbuj ponownie za chwilę.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const C = {
    bg: "#0B1220",
    border: "rgba(255,255,255,0.14)",
    text: "rgba(255,255,255,0.95)",
    muted: "rgba(255,255,255,0.65)",
    userBg: "#2DD4BF",
    userText: "#061018",
    botBg: "rgba(255,255,255,0.08)",
    shadow: "0 24px 60px rgba(0,0,0,0.45)",
  };

  return (
    <>
      {/* Bubble */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          zIndex: 9999,
          borderRadius: 999,
          border: `1px solid ${C.border}`,
          background: "rgba(11,18,32,0.85)",
          backdropFilter: "blur(10px)",
          boxShadow: C.shadow,
          padding: "10px 16px",
          color: C.text,
          cursor: "pointer",
          fontWeight: 800,
        }}
      >
        ☁️ Calli Chat
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            right: 16,
            bottom: 80,
            zIndex: 9999,
            width: "min(92vw, 400px)",
            height: "min(72vh, 580px)",
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 18,
            boxShadow: C.shadow,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: 14,
              borderBottom: `1px solid ${C.border}`,
              fontWeight: 900,
            }}
          >
            ☁️ Calli Chat
            <div style={{ fontSize: 12, color: C.muted }}>
              AI • nieruchomości • web
            </div>
          </div>

          {/* Messages */}
          <div
            ref={listRef}
            style={{
              flex: 1,
              padding: 14,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  background: m.role === "user" ? C.userBg : C.botBg,
                  color: m.role === "user" ? C.userText : C.text,
                  padding: "10px 12px",
                  borderRadius: 14,
                  maxWidth: "88%",
                  whiteSpace: "pre-wrap",
                  fontSize: 14,
                  overflowWrap: "anywhere",
wordBreak: "break-word",
maxWidth: "88%",

                }}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div style={{ color: C.muted, fontSize: 13 }}>Calli pisze…</div>
            )}
          </div>

          {/* Input */}
          <div
            style={{
              padding: 12,
              borderTop: `1px solid ${C.border}`,
              display: "flex",
              gap: 8,
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Zadaj pytanie…"
              style={{
                flex: 1,
                borderRadius: 12,
                border: `1px solid ${C.border}`,
                background: "rgba(255,255,255,0.05)",
                color: C.text,
                padding: "10px 12px",
                outline: "none",
              }}
            />
            <button
              onClick={send}
              disabled={loading}
              style={{
                borderRadius: 12,
                padding: "10px 14px",
                background: C.userBg,
                color: C.userText,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Wyślij
            </button>
          </div>
        </div>
      )}
    </>
  );
}
