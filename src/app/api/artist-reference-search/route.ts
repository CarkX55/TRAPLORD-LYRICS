import { NextRequest, NextResponse } from "next/server";
import { generateArtistReference } from "@/lib/reference-generator";

export const runtime = "nodejs";
export const maxDuration = 60;

interface SearchBody {
  artistId: string;
  artistName: string;
  geminiApiKey?: string;
  geminiModel?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SearchBody;

    if (!body.artistId?.trim() || !body.artistName?.trim()) {
      return NextResponse.json(
        { error: "Falta artistId o artistName" },
        { status: 400 }
      );
    }

    const ref = await generateArtistReference({
      artistId: body.artistId,
      artistName: body.artistName,
      geminiApiKey: body.geminiApiKey,
      geminiModel: body.geminiModel,
    });

    if (!ref) {
      return NextResponse.json(
        { error: "No se pudo generar referencia para este artista" },
        { status: 500 }
      );
    }

    return NextResponse.json(ref);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error generando referencia";
    console.error("[artist-reference-search] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
