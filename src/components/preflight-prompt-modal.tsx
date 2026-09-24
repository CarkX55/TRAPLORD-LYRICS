"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Copy,
  Check,
  Eye,
  FileCode2,
  Sparkles,
  Music2,
  Mic2,
  Sliders,
  Send,
  X,
  Layers,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";
import type { BeatPrompt } from "@/lib/trap-data";
import type { SunoStyleLayers } from "@/lib/prompt-builder";

export interface PreflightPromptData {
  stage1Prompt?: string;
  stage2Prompt?: string;
  unifiedPrompt?: string;
  beatPrompt?: BeatPrompt;
  sunoStylePrompt?: string;
  sunoLayers?: SunoStyleLayers;
  artistName?: string;
  featureArtistName?: string;
  modelName?: string;
  pipelineMode?: "studio" | "fast";
  spanglishPercent?: number;
  bpmInfo?: string;
  temperature?: number;
}

interface PreflightPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promptData: PreflightPromptData | null;
  loading: boolean;
  onConfirmGenerate: () => void;
  alwaysShow: boolean;
  onToggleAlwaysShow: (val: boolean) => void;
}

export function PreflightPromptModal({
  open,
  onOpenChange,
  promptData,
  loading,
  onConfirmGenerate,
  alwaysShow,
  onToggleAlwaysShow,
}: PreflightPromptModalProps) {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("stage1");

  const handleCopy = (text: string, tabKey: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTab(tabKey);
    toast.success(`${label} copiado al portapapeles`);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const stage1Text = promptData?.stage1Prompt || promptData?.unifiedPrompt || "";
  const stage2Text = promptData?.stage2Prompt || "";
  const unifiedText = promptData?.unifiedPrompt || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-card/95 border-border/70 backdrop-blur-xl flex flex-col p-6 overflow-hidden">
        <DialogHeader className="shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slime/10 border border-slime/30 flex items-center justify-center">
                <Eye className="w-4 h-4 text-slime" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                  Inspección Pre-Vuelo: Prompt para IA
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Revisa con precisión de estudio los prompts y parámetros que se transmitirán a Google Gemini antes de ejecutar.
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {promptData?.artistName && (
                <Badge variant="outline" className="border-slime/40 text-slime bg-slime/5 font-mono text-[10px]">
                  🎤 {promptData.artistName} {promptData.featureArtistName ? `feat. ${promptData.featureArtistName}` : ""}
                </Badge>
              )}
              {promptData?.modelName && (
                <Badge variant="outline" className="border-cyber/40 text-cyber bg-cyber/5 font-mono text-[10px]">
                  ⚡ {promptData.modelName}
                </Badge>
              )}
              {promptData?.pipelineMode && (
                <Badge variant="outline" className="border-purple-400/40 text-purple-300 bg-purple-400/5 font-mono text-[10px]">
                  🎛️ {promptData.pipelineMode === "studio" ? "Estudio (2 Pasadas)" : "Rápido (1 Pasada)"}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 min-h-[350px] flex flex-col items-center justify-center gap-3">
            <div className="trap-spinner !w-8 !h-8 !border-2" />
            <p className="text-xs text-muted-foreground animate-pulse">
              Compilando arquitectura de prompts, ADN musical y células de escritura...
            </p>
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col min-h-0 mt-3"
          >
            <div className="flex items-center justify-between border-b border-border/50 pb-2 shrink-0">
              <TabsList className="bg-black/40 border border-border/40 p-0.5">
                <TabsTrigger value="stage1" className="text-xs data-[state=active]:bg-slime data-[state=active]:text-black">
                  🎛️ Pasada 1 (Topliner)
                </TabsTrigger>
                {stage2Text && (
                  <TabsTrigger value="stage2" className="text-xs data-[state=active]:bg-slime data-[state=active]:text-black">
                    ✍️ Pasada 2 (Ghostwriter)
                  </TabsTrigger>
                )}
                {unifiedText && (
                  <TabsTrigger value="unified" className="text-xs data-[state=active]:bg-slime data-[state=active]:text-black">
                    📄 Prompt Unificado
                  </TabsTrigger>
                )}
                <TabsTrigger value="suno" className="text-xs data-[state=active]:bg-slime data-[state=active]:text-black">
                  🎚️ Suno & Beat
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                {activeTab === "stage1" && stage1Text && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-border/50 text-muted-foreground hover:text-foreground"
                    onClick={() => handleCopy(stage1Text, "stage1", "Prompt de Pasada 1")}
                  >
                    {copiedTab === "stage1" ? <Check className="w-3.5 h-3.5 text-slime mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                    {copiedTab === "stage1" ? "Copiado" : "Copiar"}
                  </Button>
                )}
                {activeTab === "stage2" && stage2Text && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-border/50 text-muted-foreground hover:text-foreground"
                    onClick={() => handleCopy(stage2Text, "stage2", "Prompt de Pasada 2")}
                  >
                    {copiedTab === "stage2" ? <Check className="w-3.5 h-3.5 text-slime mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                    {copiedTab === "stage2" ? "Copiado" : "Copiar"}
                  </Button>
                )}
                {activeTab === "unified" && unifiedText && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-border/50 text-muted-foreground hover:text-foreground"
                    onClick={() => handleCopy(unifiedText, "unified", "Prompt unificado")}
                  >
                    {copiedTab === "unified" ? <Check className="w-3.5 h-3.5 text-slime mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                    {copiedTab === "unified" ? "Copiado" : "Copiar"}
                  </Button>
                )}
              </div>
            </div>

            {/* TAB: STAGE 1 */}
            <TabsContent value="stage1" className="flex-1 flex flex-col min-h-0 pt-2 m-0 data-[state=inactive]:hidden">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 pb-1">
                <span>Instrucción maestra para Topliner: Hooks canónicos, mantras y dialecto.</span>
                <span>{stage1Text.length.toLocaleString()} caracteres (~{Math.round(stage1Text.length / 4)} tokens)</span>
              </div>
              <ScrollArea className="flex-1 rounded-lg border border-border/50 bg-black/60 p-4 font-mono text-xs leading-relaxed text-slate-300">
                <pre className="whitespace-pre-wrap font-mono">{stage1Text || "No disponible."}</pre>
              </ScrollArea>
            </TabsContent>

            {/* TAB: STAGE 2 */}
            {stage2Text && (
              <TabsContent value="stage2" className="flex-1 flex flex-col min-h-0 pt-2 m-0 data-[state=inactive]:hidden">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 pb-1">
                  <span>Instrucción maestra para Ghostwriter: Versos completos, células de escritura y flow skeleton.</span>
                  <span>{stage2Text.length.toLocaleString()} caracteres (~{Math.round(stage2Text.length / 4)} tokens)</span>
                </div>
                <ScrollArea className="flex-1 rounded-lg border border-border/50 bg-black/60 p-4 font-mono text-xs leading-relaxed text-slate-300">
                  <pre className="whitespace-pre-wrap font-mono">{stage2Text}</pre>
                </ScrollArea>
              </TabsContent>
            )}

            {/* TAB: UNIFIED */}
            {unifiedText && (
              <TabsContent value="unified" className="flex-1 flex flex-col min-h-0 pt-2 m-0 data-[state=inactive]:hidden">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 pb-1">
                  <span>Prompt consolidado de arquitectura de estudio (Direct Pipeline).</span>
                  <span>{unifiedText.length.toLocaleString()} caracteres (~{Math.round(unifiedText.length / 4)} tokens)</span>
                </div>
                <ScrollArea className="flex-1 rounded-lg border border-border/50 bg-black/60 p-4 font-mono text-xs leading-relaxed text-slate-300">
                  <pre className="whitespace-pre-wrap font-mono">{unifiedText}</pre>
                </ScrollArea>
              </TabsContent>
            )}

            {/* TAB: SUNO & BEAT */}
            <TabsContent value="suno" className="flex-1 flex flex-col min-h-0 pt-2 m-0 space-y-3 overflow-y-auto data-[state=inactive]:hidden">
              <div className="space-y-2 p-3 bg-black/40 border border-border/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slime flex items-center gap-1.5">
                    <Music2 className="w-3.5 h-3.5" /> Prompt de Estilo Suno v4.5
                  </span>
                  {promptData?.sunoStylePrompt && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] text-muted-foreground hover:text-foreground"
                      onClick={() => handleCopy(promptData.sunoStylePrompt!, "sunoStyle", "Estilo Suno")}
                    >
                      <Copy className="w-3 h-3 mr-1" /> Copiar
                    </Button>
                  )}
                </div>
                <p className="font-mono text-xs bg-black/60 p-2.5 rounded border border-border/30 text-amber-300">
                  {promptData?.sunoStylePrompt || "No disponible"}
                </p>
              </div>

              {promptData?.beatPrompt && (
                <div className="space-y-2 p-3 bg-black/40 border border-border/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-cyber flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" /> Beat Prompt de Producción
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] text-muted-foreground hover:text-foreground"
                      onClick={() => handleCopy(promptData.beatPrompt!.description, "beatPrompt", "Beat Prompt")}
                    >
                      <Copy className="w-3 h-3 mr-1" /> Copiar
                    </Button>
                  </div>
                  <p className="font-mono text-xs bg-black/60 p-2.5 rounded border border-border/30 text-cyan-300">
                    {promptData.beatPrompt.description}
                  </p>
                  <div className="flex gap-2 flex-wrap text-[10px] text-muted-foreground pt-1">
                    <span>Tags: <strong>{promptData.beatPrompt.styleTags}</strong></span>
                    <span>•</span>
                    <span>Energía: <strong>{promptData.beatPrompt.energy}</strong></span>
                    {promptData.beatPrompt.instruments?.length > 0 && (
                      <>
                        <span>•</span>
                        <span>Instrumentos: <strong>{promptData.beatPrompt.instruments.join(", ")}</strong></span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="shrink-0 pt-4 border-t border-border/50 flex sm:items-center justify-between gap-4 mt-2">
          <div className="flex items-center gap-2">
            <Switch
              id="always-show-preflight"
              checked={alwaysShow}
              onCheckedChange={onToggleAlwaysShow}
            />
            <Label htmlFor="always-show-preflight" className="text-xs text-muted-foreground cursor-pointer select-none">
              Mostrar siempre esta inspección antes de generar
            </Label>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-9 border-border/60 hover:bg-white/5"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onConfirmGenerate();
              }}
              className="text-xs h-9 bg-gradient-to-r from-slime to-emerald-400 text-black font-semibold hover:opacity-90 glow-slime flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Confirmar y Transmitir al LLM
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
