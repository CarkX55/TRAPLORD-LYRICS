// Studio Export Helpers for TRAPLORD APP
// Generates synchronized .lrc files and studio recording sheets for booth & DAWs.

export interface StudioSheetParams {
  title?: string;
  artistName: string;
  featureName?: string;
  bpmRange: string;
  bpmVibeLabel: string;
  moodLabel: string;
  producerName?: string;
  sunoStylePrompt?: string;
  lyrics: string;
}

/**
 * Generates standard synchronized .lrc content based on BPM and bar pacing.
 */
export function generateLrcContent(
  lyrics: string,
  bpmString: string,
  artistName: string = "TRAPLORD Artist",
  title: string = "TRAPLORD Single"
): string {
  // Extract representative BPM number (e.g. "130-140" -> 135)
  const bpmParts = bpmString
    .split("-")
    .map(n => parseInt(n.trim(), 10))
    .filter(n => !isNaN(n));
  const bpm = bpmParts.length === 2 ? Math.round((bpmParts[0] + bpmParts[1]) / 2) : (bpmParts[0] ?? 130);

  // In 4/4 time, 1 bar = 4 beats = (240 / bpm) seconds
  const secondsPerBar = Math.max(1.2, Math.min(3.5, 240 / bpm));

  const lines = lyrics.split("\n");
  const lrcLines: string[] = [
    `[ti:${title}]`,
    `[ar:${artistName}]`,
    `[al:TRAPLORD Vol. 1]`,
    `[by:TRAPLORD APP]`,
    `[offset:0]`,
  ];

  let currentTime = 2.0; // start after 2 seconds intro headroom

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      currentTime += 0.5;
      continue;
    }

    const minutes = Math.floor(currentTime / 60);
    const seconds = Math.floor(currentTime % 60);
    const hundredths = Math.floor((currentTime % 1) * 100);

    const timeTag = `[${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}]`;
    lrcLines.push(`${timeTag} ${line}`);

    // If it's a section tag like [Intro], advance slightly less than full bar
    if (/^\[.*\]$/.test(line)) {
      currentTime += 1.5;
    } else {
      currentTime += secondsPerBar;
    }
  }

  return lrcLines.join("\n");
}

/**
 * Formats a clean Studio Recording Sheet for recording booth, artists & producers.
 */
export function generateStudioRecordingSheet(params: StudioSheetParams): string {
  const dateStr = new Date().toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const divider = "========================================================";
  const header = [
    divider,
    `🔥 TRAPLORD APP — FICHA DE SESIÓN DE GRABACIÓN & ESTUDIO`,
    divider,
    `📅 Fecha: ${dateStr}`,
    `🎤 Artista Principal: ${params.artistName}`,
    params.featureName ? `🤝 Artista Invitado: ${params.featureName}` : `👤 Formato: Solo Track`,
    `🎛️ Producción / Tag: ${params.producerName || "Beat Underground"}`,
    `⚡ Tempo / BPM: ${params.bpmRange} BPM (${params.bpmVibeLabel})`,
    `🎭 Atmósfera / Mood: ${params.moodLabel}`,
  ];

  if (params.sunoStylePrompt) {
    header.push(
      `🎚️ Suno v4.5 Style Prompt:`,
      `"${params.sunoStylePrompt}"`
    );
  }

  header.push(
    divider,
    `📜 LETRA ESTRUCTURADA PARA CABINA`,
    divider,
    "",
    params.lyrics.trim(),
    "",
    divider,
    `* Generado por TRAPLORD APP — Ghostwriting de Élite para Trap y Rap *`,
    divider
  );

  return header.join("\n");
}

/**
 * Triggers client-side browser file download.
 */
export function downloadClientFile(filename: string, content: string, mimeType: string = "text/plain;charset=utf-8"): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
