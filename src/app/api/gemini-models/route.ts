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

    if (data.models && Array.isArray(data.models)) {
      const modelNames = data.models.map((m: any) => m.name?.replace("models/", ""));
      console.log(`[gemini-models] Google API returned ${modelNames.length} models:`, modelNames.join(", "));
    }

    // Filter out embeddings, vision-only, tts, audio, and all deprecated 1.x/2.x models that return 404
    const models = (data.models || [])
      .filter((m: { name?: string; supportedGenerationMethods?: string[] }) => {
        const id = (m.name || "").replace("models/", "").toLowerCase();
        if (!m.supportedGenerationMethods?.includes("generateContent")) return false;
        // Filter out non-text generation models
        if (id.includes("embedding") || id.includes("aqa") || id.includes("imagen") || id.includes("tts")) return false;
        // Filter out deprecated models that fail with HTTP 404/410 in v1beta
        if (
          id.includes("1.0") ||
          id.includes("1.5") ||
          id.includes("2.0") ||
          id.includes("2.5") ||
          id.includes("exp-11") ||
          id.includes("exp-12") ||
          id.includes("thinking-exp")
        ) {
          return false;
        }
        return true;
      })
      .map((m: { name: string; displayName?: string }) => {
        const id = m.name.replace("models/", "");
        let name = m.displayName || id;
        if (id.includes("3.5") && (id.includes("lite") || id.includes("flash-lite"))) {
          name = `⚡ ${name} (Ultra Rápido · Anti-503 · Máxima Disponibilidad)`;
        } else if (id.includes("3.5") && id.includes("flash")) {
          name = `🚀 ${name} (Rápido y Estable · Alta Capacidad)`;
        } else if (id === "gemini-3.6-flash") {
          name = `🔥 ${name} (Recomendado por Google · Ultrarrápido)`;
        } else if (id.includes("3.7") && id.includes("flash")) {
          name = `✨ ${name} (Generación 3.7)`;
        } else if (id.includes("3.8") && id.includes("flash")) {
          name = `🧠 ${name} (Frontier 3.8 · Sujeto a alta demanda 503)`;
        } else if (id.includes("pro")) {
          name = `💎 ${name} (Pro Deep Reasoning)`;
        } else {
          name = `✨ ${name}`;
        }
        return { id, name };
      })
      .sort((a: { id: string }, b: { id: string }) => {
        const priorityOrder = [
          "gemini-3.5-flash-lite",
          "gemini-3.5-flash",
          "gemini-3.6-flash",
          "gemini-3.7-flash",
          "gemini-3.8-flash",
          "gemini-3.6-pro",
        ];
        const aIndex = priorityOrder.indexOf(a.id);
        const bIndex = priorityOrder.indexOf(b.id);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
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
