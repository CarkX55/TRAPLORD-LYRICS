import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json();
    
    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json({ error: "No API key provided" }, { status: 400 });
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`);
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    const models = (data.models || [])
      .filter((m: { supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m: { name: string; displayName?: string }) => {
        const id = m.name.replace("models/", "");
        let name = m.displayName || id;
        if (id.includes("gemini-2.5") || id.includes("gemini-3")) name = `✨ ${name}`;
        else if (id.includes("gemini-2.0")) name = `🔥 ${name}`;
        else if (id.includes("gemini-1.5")) name = `📊 ${name}`;
        return { id, name };
      });

    return NextResponse.json({ models });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching models";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
