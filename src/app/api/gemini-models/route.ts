import { NextRequest, NextResponse } from "next/server";
import { getEffectiveApiKey, hasAvailableApiKey } from "@/lib/gemini-config";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function GET() {
  const hasEnvKey = hasAvailableApiKey();
  return NextResponse.json({ hasEnvKey });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const apiKey = (body.apiKey && String(body.apiKey).trim()) || process.env.GEMINI_API_KEY?.trim();
    
    if (!apiKey) {
      return NextResponse.json({ error: "No API key provided" }, { status: 400 });
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    const models = (data.models || [])
      .filter((m: { name?: string; supportedGenerationMethods?: string[] }) => {
        const id = (m.name || "").replace("models/", "").toLowerCase();
        if (!m.supportedGenerationMethods?.includes("generateContent")) return false;
        // Filter out embeddings, vision-only, tts, and audio/aqa models
        if (id.includes("embedding") || id.includes("aqa") || id.includes("imagen") || id.includes("tts")) return false;
        // Filter out old deprecated expired models that throw 404/410
        if (id === "gemini-1.0-pro" || id.includes("exp-11") || id.includes("exp-12")) return false;
        return true;
      })
      .map((m: { name: string; displayName?: string }) => {
        const id = m.name.replace("models/", "");
        let name = m.displayName || id;
        if (id === "gemini-2.0-flash") name = `🔥 ${name} (Recomendado · Rápido y Estable)`;
        else if (id === "gemini-2.0-flash-lite" || id.includes("flash-lite")) name = `⚡ ${name} (Ultra Rápido)`;
        else if (id === "gemini-1.5-flash") name = `⚡ ${name} (Alta Cuota)`;
        else if (id.includes("thinking")) name = `🧠 ${name} (Razonamiento)`;
        else if (id.includes("gemini-2.0")) name = `🔥 ${name}`;
        else if (id.includes("gemini-1.5")) name = `📊 ${name}`;
        else if (id.includes("gemini-3")) name = `✨ ${name}`;
        return { id, name };
      })
      .sort((a: { id: string }, b: { id: string }) => {
        if (a.id === "gemini-2.0-flash") return -1;
        if (b.id === "gemini-2.0-flash") return 1;
        if (a.id.includes("flash") && !b.id.includes("flash")) return -1;
        if (!a.id.includes("flash") && b.id.includes("flash")) return 1;
        return a.id.localeCompare(b.id);
      });

    return NextResponse.json({ models, hasEnvKey: hasAvailableApiKey() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching models";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
