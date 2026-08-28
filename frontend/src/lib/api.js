import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("devstart_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const streamChat = async (body, onDelta, onDone, onError) => {
  const token = localStorage.getItem("devstart_token");
  try {
    const res = await fetch(`${API}/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok || !res.body) throw new Error("Falha ao conectar");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.delta) onDelta(data.delta);
          if (data.error) onError?.(data.error);
          if (data.done) onDone?.();
        } catch {}
      }
    }
    onDone?.();
  } catch (e) {
    onError?.(e.message);
  }
};
