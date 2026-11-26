// Lebenskompass: KI-Helfer über Gemini.
// Der Gemini-Schlüssel liegt nur hier auf dem Server (Secret GEMINI_API_KEY), nie in der App.
// Optional: Secret GEMINI_MODEL, Standard ist gemini-2.5-flash.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function antwort(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return antwort({ fehler: "Nur POST" }, 405);

  // Nur angemeldete Nutzer dürfen die KI verwenden
  const auth = req.headers.get("Authorization") ?? "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return antwort({ fehler: "Nicht angemeldet" }, 401);

  let prompt = "";
  try {
    ({ prompt } = await req.json());
  } catch {
    return antwort({ fehler: "Ungültige Anfrage" }, 400);
  }
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 60000) {
    return antwort({ fehler: "Ungültige Anfrage" }, 400);
  }

  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return antwort({ fehler: "GEMINI_API_KEY fehlt" }, 500);
  const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";

  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
    }),
  });
  if (r.status === 429) return antwort({ fehler: "Zu viele Anfragen" }, 429);
  if (!r.ok) return antwort({ fehler: "Gemini-Fehler", status: r.status }, 502);

  const j = await r.json();
  const text: string = (j?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
  try {
    return antwort(JSON.parse(text));
  } catch {
    return antwort({ antwort: text });
  }
});
