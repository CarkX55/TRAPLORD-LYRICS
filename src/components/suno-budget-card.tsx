"use client";

import React, { useMemo, useState } from "react";
import {
  auditSunoBudget,
  serializeCompactSuno,
  type SunoBudgetAudit,
} from "@/lib/suno-budget";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Mic2,
  Copy,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { toast } from "sonner";

interface SunoBudgetCardProps {
  lyrics: string;
  bpm?: number;
  className?: string;
}

export function SunoBudgetCard({ lyrics, bpm = 135, className = "" }: SunoBudgetCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Compute live budget metrics
  const budget: SunoBudgetAudit = useMemo(() => {
    return auditSunoBudget(lyrics, bpm);
  }, [lyrics, bpm]);

  // Compute compact version and character savings
  const compactResult = useMemo(() => {
    return serializeCompactSuno(lyrics);
  }, [lyrics]);

  const handleCopyExact = async () => {
    if (!lyrics.trim()) {
      toast.error("No hay letra para copiar.");
      return;
    }
    try {
      await navigator.clipboard.writeText(lyrics);
      toast.success("Letra completa copiada (100% fiel al estudio)");
    } catch {
      toast.error("Error al copiar al portapapeles.");
    }
  };

  const handleCopyCompact = async () => {
    if (!compactResult.text.trim()) {
      toast.error("No hay letra para copiar.");
      return;
    }
    try {
      await navigator.clipboard.writeText(compactResult.text);
      toast.success(
        `Letra compacta copiada para Suno (${compactResult.savings > 0 ? `-${compactResult.savings} chars ahorrados` : "formato optimizado"})`
      );
    } catch {
      toast.error("Error al copiar al portapapeles.");
    }
  };

  if (!lyrics || !lyrics.trim()) {
    return null;
  }

  // Visual status styles based on TRAPLORD safety policy
  const statusColors = {
    safe: "text-emerald-400 bg-emerald-950/40 border-emerald-800/60",
    warning: "text-amber-400 bg-amber-950/40 border-amber-800/60",
    critical: "text-orange-400 bg-orange-950/40 border-orange-800/60",
    overflow: "text-rose-400 bg-rose-950/40 border-rose-800/60",
  };

  const progressPercent = Math.min(100, Math.round((budget.charCount / budget.hardCharLimit) * 100));
  const safePercent = Math.round((budget.safeCharLimit / budget.hardCharLimit) * 100);

  return (
    <div
      className={`rounded-xl border bg-zinc-950/80 backdrop-blur-md p-4 text-xs transition-all ${
        budget.status === "critical" || budget.status === "overflow"
          ? "border-rose-800/50 shadow-[0_0_20px_rgba(244,63,94,0.1)]"
          : "border-zinc-800 shadow-lg shadow-black/40"
      } ${className}`}
    >
      {/* Header: Title & Safety Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-zinc-100 tracking-wide uppercase text-[11px]">
            Suno Budget Guardian
          </span>
          <span
            className={`px-2 py-0.5 rounded-full border text-[10px] font-medium flex items-center gap-1 ${
              statusColors[budget.status]
            }`}
            title="Política de seguridad preventiva de TRAPLORD para asegurar que Suno AI procese la canción completa sin cortar el Outro."
          >
            {budget.status === "safe" ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <AlertTriangle className="w-3 h-3" />
            )}
            {budget.statusBadge}
          </span>
        </div>

        {/* Action Buttons: Copiar Exacto / Copiar Compacto */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopyExact}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 transition-colors border border-zinc-700/60 text-[11px]"
            title="Copia el 100% de la letra y corchetes tal como están en el editor"
          >
            <Copy className="w-3 h-3 text-zinc-400" />
            Copiar Exacto
          </button>
          <button
            type="button"
            onClick={handleCopyCompact}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-200 transition-colors border border-cyan-700/50 text-[11px] font-medium"
            title="Optimiza espacios y elimina notas no funcionales sin borrar líneas líricas ni ad-libs"
          >
            <Layers className="w-3 h-3 text-cyan-400" />
            Copiar Compacto
            {compactResult.savings > 0 && (
              <span className="px-1 py-0.2 rounded bg-cyan-900/80 text-[10px] text-cyan-300 font-mono">
                -{compactResult.savings}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 pb-3">
        {/* Metric 1: Character Budget */}
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/80 p-2.5">
          <div className="flex items-center justify-between text-zinc-400 text-[10px] mb-1">
            <span>Caracteres Suno</span>
            <span className="font-mono text-zinc-500">Máx {budget.hardCharLimit}</span>
          </div>
          <div className="text-base font-bold font-mono tracking-tight text-zinc-100 flex items-baseline gap-1">
            <span
              className={
                budget.charCount > budget.safeCharLimit
                  ? "text-amber-400"
                  : "text-zinc-100"
              }
            >
              {budget.charCount.toLocaleString()}
            </span>
            <span className="text-[11px] text-zinc-500 font-normal">/ {budget.safeCharLimit} safe</span>
          </div>
          {/* Visual Progress Bar */}
          <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-2 overflow-hidden relative">
            {/* Safe marker notch */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-zinc-600 z-10"
              style={{ left: `${safePercent}%` }}
              title="Límite preventivo seguro (3.800 chars)"
            />
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                budget.status === "safe"
                  ? "bg-emerald-500"
                  : budget.status === "warning"
                  ? "bg-amber-500"
                  : "bg-rose-500"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Vocal Syllables */}
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/80 p-2.5">
          <div className="flex items-center justify-between text-zinc-400 text-[10px] mb-1">
            <span>Sílabas Vocales</span>
            <Mic2 className="w-3 h-3 text-indigo-400" />
          </div>
          <div className="text-base font-bold font-mono tracking-tight text-zinc-100">
            {budget.syllableCount.toLocaleString()}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">Cuerpo lírico cantado</div>
        </div>

        {/* Metric 3: Estimated Runtime Range */}
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/80 p-2.5">
          <div className="flex items-center justify-between text-zinc-400 text-[10px] mb-1">
            <span>Duración Estimada</span>
            <Clock className="w-3 h-3 text-cyan-400" />
          </div>
          <div className="text-base font-bold font-mono tracking-tight text-cyan-300">
            {budget.durationEstimate.formatted}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">
            ~{bpm} BPM (Rango aprox.)
          </div>
        </div>

        {/* Metric 4: Outro Preservation */}
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/80 p-2.5">
          <div className="flex items-center justify-between text-zinc-400 text-[10px] mb-1">
            <span>Outro en Texto</span>
            {budget.outroComplete ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-3 h-3 text-amber-400" />
            )}
          </div>
          <div
            className={`text-xs font-semibold mt-1 leading-snug ${
              budget.outroComplete ? "text-emerald-300" : "text-amber-300"
            }`}
          >
            {budget.outroMessage}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">Texto exportado completo</div>
        </div>
      </div>

      {/* Section Breakdown Accordion Toggle */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="flex items-center justify-between w-full text-zinc-400 hover:text-zinc-200 py-1 text-[11px] transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Info className="w-3 h-3 text-zinc-500" />
            <span>Distribución de peso por secciones ({budget.sectionBudgets.length} secciones)</span>
          </span>
          {showBreakdown ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        {showBreakdown && (
          <div className="mt-2 pt-2 border-t border-zinc-800/60 space-y-1.5">
            {budget.sectionBudgets.map((sec, idx) => (
              <div key={idx} className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-300 truncate max-w-[140px]">
                  [{sec.sectionName}]
                </span>
                <div className="flex items-center gap-3 text-zinc-400 font-mono text-[10px]">
                  <span>{sec.barsCount} compases</span>
                  <span>{sec.syllableCount} síl.</span>
                  <span className="w-12 text-right text-zinc-300 font-medium">
                    {sec.charCount} ch ({sec.charPercent}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
