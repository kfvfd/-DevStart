import { useEffect, useRef, useState } from "react";
import { api, streamChat } from "../lib/api";
import { useApp } from "../context/AppContext";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Send, Sparkles, Loader2 } from "lucide-react";

const MarkdownLite = ({ text }) => {
  // Simple renderer: split code fences ```lang\ncode\n```
  const parts = [];
  let rest = text;
  const re = /```(\w+)?\n?([\s\S]*?)```/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: "text", content: text.slice(last, m.index) });
    parts.push({ type: "code", lang: m[1] || "", content: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", content: text.slice(last) });

  return (
    <div className="space-y-2">
      {parts.map((p, i) =>
        p.type === "code" ? (
          <pre key={i} className="code-block text-xs"><code>{p.content}</code></pre>
        ) : (
          <p key={i} className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{p.content}</p>
        )
      )}
    </div>
  );
};

export default function DevMentorChat({ projectId, stepId, initialPrompt, initialMode = "general", compact = false }) {
  const { t, lang } = useApp();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState(initialPrompt || "");
  const [streaming, setStreaming] = useState(false);
  const [model, setModel] = useState("claude");
  const [mode] = useState(initialMode);
  const scrollRef = useRef(null);
  const sentInitial = useRef(false);

  useEffect(() => {
    api.get("/chat/history", { params: { project_id: projectId || undefined } })
      .then((r) => setMessages(r.data))
      .catch(() => {});
  }, [projectId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || streaming) return;
    setInput("");
    setStreaming(true);
    const userMsg = { id: Date.now().toString(), role: "user", content };
    const asstMsg = { id: Date.now().toString() + "-a", role: "assistant", content: "" };
    setMessages((prev) => [...prev, userMsg, asstMsg]);

    await streamChat(
      { message: content, project_id: projectId, step_id: stepId, mode, model, language_ui: lang },
      (delta) => {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: copy[copy.length - 1].content + delta };
          return copy;
        });
      },
      () => setStreaming(false),
      (err) => { setStreaming(false); setMessages((prev) => [...prev.slice(0, -1), { ...prev[prev.length - 1], content: "Erro: " + err }]); }
    );
  };

  useEffect(() => {
    if (initialPrompt && !sentInitial.current) {
      sentInitial.current = true;
      send(initialPrompt);
    }
    // eslint-disable-next-line
  }, [initialPrompt]);

  return (
    <div className={`flex flex-col ${compact ? "h-[500px]" : "h-[calc(100vh-8rem)]"} rounded-2xl bg-slate-900/60 border border-white/5 overflow-hidden`}>
      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-sky-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-slate-950" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-semibold text-sm">DevMentor</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">AI Tutor</div>
          </div>
        </div>
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger data-testid="model-select" className="w-32 h-8 text-xs bg-slate-950/60 border-white/10"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10">
            <SelectItem value="claude">Claude 4.6</SelectItem>
            <SelectItem value="gpt">GPT 5.4</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-fuchsia-500 to-sky-500 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-slate-950" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Olá! Sou o DevMentor</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">Pergunte qualquer coisa sobre programação. Explico com palavras simples.</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} data-testid={`msg-${m.role}`}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              m.role === "user"
                ? "bg-sky-500 text-slate-950 rounded-br-sm"
                : "bg-slate-800/60 border border-white/5 rounded-bl-sm"
            }`}>
              {m.role === "user" ? (
                <p className="text-sm whitespace-pre-wrap font-medium">{m.content}</p>
              ) : (
                m.content ? <MarkdownLite text={m.content} /> :
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-white/5">
        <div className="flex items-end gap-2">
          <Textarea
            data-testid="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder={t("typeMessage")}
            rows={1}
            className="resize-none bg-slate-950/60 border-white/10 min-h-[44px] max-h-32"
          />
          <Button data-testid="chat-send" onClick={() => send()} disabled={streaming || !input.trim()}
            className="h-11 w-11 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 flex-shrink-0 p-0">
            {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
