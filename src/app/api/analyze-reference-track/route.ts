import { NextRequest, NextResponse } from "next/server";
import { analyzeReferenceTrack } from "@/lib/track-analyzer";

export const runtime = "nodejs";
export const maxDuration = 60;

interface AnalyzeBody {
  lyrics: string;
  geminiApiKey?: string;
  geminiModel?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AnalyzeBody;

    if (!body.lyrics?.trim()) {
      return NextResponse.json({ error: "Falta la letra para analizar" }, { status: 400 });
    }

    const analysis = await analyzeReferenceTrack({
      lyrics: body.lyrics,
      geminiApiKey: body.geminiApiKey,
      geminiModel: body.geminiModel,
    });

    if (!analysis) {
      return NextResponse.json({ error: "No se pudo analizar la letra" }, { status: 500 });
    }

    return NextResponse.json(analysis);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error analizando referencia";
    console.error("[analyze-reference-track] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
