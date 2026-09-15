"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Copy,
  Check,
  Terminal,
  Clock,
  Cpu,
  Layers,
  Sparkles,
  Info,
  ChevronRight,
  FileCode2,
} from "lucide-react";
import { toast } from "sonner";
import type { GenerationProcessLog, GenerationStageLog } from "@/lib/generation-logger";

interface GenerationLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: GenerationProcessLog | null;
}

export function GenerationLogModal({ open, onOpenChange, log }: GenerationLogModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedStageTab, setSelectedStageTab] = useState<string>("0");

  const handleCopy = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} copiado`);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  if (!log) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl bg-card/95 border-border/70 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Terminal className="w-5 h-5 text-cyber" /> Logs de Generación
            </DialogTitle>
            <DialogDescription>
              Aún no hay registros de generación en esta sesión. Genera una letra para inspeccionar el proceso.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const { contextSummary, stages } = log;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-card/95 border-border/80 backdrop-blur-xl shadow-2xl">
        <DialogHeader className="p-5 border-b border-border/50 bg-background/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyber/10 border border-cyber/30 text-cyber">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  Auditoría & Logs de Estudio
                  <Badge variant="outline" className="text-[10px] font-mono border-cyber/50 text-cyber bg-cyber/10">
                    {log.mode === "pipeline_3_pass" ? "Pipeline 3 Pasadas" : log.mode === "regenerate_section" ? "Regeneración Parcial" : "Single Pass"}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Inspecciona los prompts exactos de cada fase, respuestas crudas y decisiones de ingeniería métrica.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-pink-400" />
                {log.modelUsed}
              </Badge>
              <Badge variant="secondary" className="font-mono text-xs flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                {(log.totalDurationMs / 1000).toFixed(2)}s
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Resumen Superior */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3.5 bg-muted/20 border-b border-border/40 text-xs font-mono">
          <div className="p-2 rounded bg-background/50 border border-border/40">
            <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Artista / Flow</span>
            <span className="font-semibold text-foreground truncate block">
              {contextSummary.artistName} {contextSummary.featureArtistName ? `ft. ${contextSummary.featureArtistName}` : ""}
            </span>
          </div>
          <div className="p-2 rounded bg-background/50 border border-border/40">
            <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Tempo & Mood</span>
            <span className="font-semibold text-foreground truncate block">{contextSummary.bpm}</span>
          </div>
          <div className="p-2 rounded bg-background/50 border border-border/40">
            <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Spanglish (Obj / Real)</span>
            <span className="font-semibold text-foreground block">
              {contextSummary.spanglishTarget}% / {contextSummary.spanglishActual}%
            </span>
          </div>
          <div className="p-2 rounded bg-background/50 border border-border/40">
            <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Tier Métrica / Dirty</span>
            <span className="font-semibold text-foreground block">
              Tier {contextSummary.rhymeTier ?? 2} · Nivel {contextSummary.dirtyLevel ?? 2}
            </span>
          </div>
        </div>

        {/* Contenedor de Pestañas */}
        <Tabs defaultValue="stages" className="flex-1 flex flex-col min-h-0">
          <div className="px-5 border-b border-border/40 bg-background/20 flex items-center justify-between">
            <TabsList className="bg-transparent h-11 p-0 gap-4">
              <TabsTrigger
                value="stages"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-cyber data-[state=active]:text-cyber rounded-none px-2 h-11 text-xs"
              >
                <Layers className="w-3.5 h-3.5 mr-1.5" /> Pasadas del Pipeline ({stages.length})
              </TabsTrigger>
              <TabsTrigger
                value="raw"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-pink-400 data-[state=active]:text-pink-400 rounded-none px-2 h-11 text-xs"
              >
                <FileCode2 className="w-3.5 h-3.5 mr-1.5" /> Salida Cruda vs Limpia
              </TabsTrigger>
            </TabsList>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(JSON.stringify(log, null, 2), "all_log", "Log completo en JSON")}
              className="h-7 text-xs border-border/60 hover:bg-cyber/10 hover:text-cyber"
            >
              {copiedKey === "all_log" ? <Check className="w-3 h-3 mr-1 text-slime" /> : <Copy className="w-3 h-3 mr-1" />}
              Copiar Todo (JSON)
            </Button>
          </div>

          {/* TAB 1: Pasadas del Pipeline */}
          <TabsContent value="stages" className="flex-1 flex flex-col m-0 min-h-0">
            {/* Sub-selector de Pasada */}
            <div className="flex border-b border-border/30 bg-muted/10 p-2 gap-2 overflow-x-auto">
              {stages.map((stage, idx) => (
                <button
                  key={stage.stageId}
                  onClick={() => setSelectedStageTab(String(idx))}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all text-left whitespace-nowrap ${
                    selectedStageTab === String(idx)
                      ? "bg-cyber/20 text-cyber border border-cyber/40 shadow-sm"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-background border border-current text-[10px] flex items-center justify-center font-mono">
                    {idx + 1}
                  </span>
                  <span>{stage.stageName.split(":")[0]}</span>
                  <span className="text-[10px] opacity-70 font-mono">{(stage.durationMs / 1000).toFixed(1)}s</span>
                </button>
              ))}
            </div>

            {/* Detalle de la Pasada Seleccionada */}
            {stages[Number(selectedStageTab)] && (
              <div className="flex-1 flex flex-col min-h-0">
                {(() => {
                  const stage: GenerationStageLog = stages[Number(selectedStageTab)];
                  return (
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/40 min-h-0">
                      {/* Columna Izquierda: Prompt Enviado */}
                      <div className="flex flex-col min-h-0 h-full">
                        <div className="p-3 bg-muted/20 border-b border-border/40 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                              <Terminal className="w-3.5 h-3.5 text-cyber" /> Prompt Inyectado al Modelo
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {stage.prompt.length} chars
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(stage.prompt, `prompt_${stage.stageId}`, "Prompt")}
                            className="h-6 text-xs text-muted-foreground hover:text-cyber px-2"
                          >
                            {copiedKey === `prompt_${stage.stageId}` ? <Check className="w-3 h-3 text-slime" /> : <Copy className="w-3 h-3" />}
                          </Button>
                        </div>
                        <ScrollArea className="flex-1 p-3.5 bg-black/30">
                          <pre className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap text-muted-foreground select-text">
                            {stage.prompt}
                          </pre>
                        </ScrollArea>
                      </div>

                      {/* Columna Derecha: Respuesta en Bruto */}
                      <div className="flex flex-col min-h-0 h-full">
                        <div className="p-3 bg-muted/20 border-b border-border/40 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-slime" /> Salida del Modelo (Fase {Number(selectedStageTab) + 1})
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {stage.rawResponse.length} chars
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(stage.rawResponse, `res_${stage.stageId}`, "Respuesta")}
                            className="h-6 text-xs text-muted-foreground hover:text-slime px-2"
                          >
                            {copiedKey === `res_${stage.stageId}` ? <Check className="w-3 h-3 text-slime" /> : <Copy className="w-3 h-3" />}
                          </Button>
                        </div>
                        <ScrollArea className="flex-1 p-3.5 bg-black/40">
                          <pre className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap text-foreground/90 select-text">
                            {stage.rawResponse}
                          </pre>
                        </ScrollArea>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: Raw Output vs Clean Output */}
          <TabsContent value="raw" className="flex-1 flex flex-col m-0 min-h-0">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/40 min-h-0">
              {/* Salida en bruto final */}
              <div className="flex flex-col min-h-0 h-full">
                <div className="p-3 bg-muted/20 border-b border-border/40 flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <FileCode2 className="w-3.5 h-3.5 text-pink-400" /> Salida Final sin Filtrar (Directo de la IA)
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(log.finalRawLyrics, "final_raw", "Salida cruda")}
                    className="h-6 text-xs text-muted-foreground hover:text-pink-400 px-2"
                  >
                    {copiedKey === "final_raw" ? <Check className="w-3 h-3 text-slime" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
                <ScrollArea className="flex-1 p-3.5 bg-black/40">
                  <pre className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap text-muted-foreground select-text">
                    {log.finalRawLyrics}
                  </pre>
                </ScrollArea>
              </div>

              {/* Salida limpia Suno */}
              <div className="flex flex-col min-h-0 h-full">
                <div className="p-3 bg-muted/20 border-b border-border/40 flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-slime" /> Letra Parseada & Sanitizada (Para Suno AI)
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(log.cleanedLyrics, "cleaned_lyrics", "Letra final")}
                    className="h-6 text-xs text-muted-foreground hover:text-slime px-2"
                  >
                    {copiedKey === "cleaned_lyrics" ? <Check className="w-3 h-3 text-slime" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
                <ScrollArea className="flex-1 p-3.5 bg-black/30">
                  <pre className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap text-foreground select-text">
                    {log.cleanedLyrics}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
