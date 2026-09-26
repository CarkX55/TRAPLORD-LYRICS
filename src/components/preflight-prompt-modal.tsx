"use client";

import React, { useState, useEffect } from "react";
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
  Sliders,
  Send,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  RefreshCw,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import type { BeatPrompt } from "@/lib/trap-data";
import type { SunoStyleLayers } from "@/lib/prompt-builder";

export interface PreflightPromptData {
  stage1Prompt?: string;
  stage2Prompt?: string;
  unifiedPrompt?: string;
  holisticPrompt?: string;
  beatPrompt?: BeatPrompt;
  sunoStylePrompt?: string;
  sunoLayers?: SunoStyleLayers;
  artistName?: string;
  featureArtistName?: string;
  modelName?: string;
  pipelineMode?: "studio" | "fast" | "holistic";
  spanglishPercent?: number;
  bpmInfo?: string;
  temperature?: number;
  inputsChangedSinceCompile?: boolean;
}

interface PreflightPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promptData: PreflightPromptData | null;
  loading: boolean;
  onConfirmGenerate: (editedPrompt?: string) => void;
  onRecompile?: () => void;
  alwaysShow: boolean;
  onToggleAlwaysShow: (val: boolean) => void;
}

export function PreflightPromptModal({
  open,
  onOpenChange,
  promptData,
  loading,
  onConfirmGenerate,
  onRecompile,
  alwaysShow,
  onToggleAlwaysShow,
}: PreflightPromptModalProps) {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("active");
  const [editedPrompt, setEditedPrompt] = useState<string>("");

  const compiledPrompt =
    promptData?.holisticPrompt ||
    promptData?.unifiedPrompt ||
    promptData?.stage1Prompt ||
    "";

  // Sync edited prompt with compiled prompt whenever new data arrives or modal opens
  useEffect(() => {
    if (compiledPrompt) {
      setEditedPrompt(compiledPrompt);
    }
  }, [compiledPrompt, open]);

  const isEdited = Boolean(
    editedPrompt.trim() &&
      compiledPrompt.trim() &&
      editedPrompt.trim() !== compiledPrompt.trim()
  );

  const handleCopy = (text: string, tabKey: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTab(tabKey);
    toast.success(`${label} copiado al portapapeles`);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const handleRestoreCompiled = () => {
    setEditedPrompt(compiledPrompt);
    toast.info("Prompt restaurado al estado original compilado");
  };

  const isLongPrompt = editedPrompt.length > 12000;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] bg-card/95 border-border/70 backdrop-blur-xl flex flex-col p-6 overflow-hidden">
        <DialogHeader className="shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slime/10 border border-slime/30 flex items-center justify-center">
                <Eye className="w-4 h-4 text-slime" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                  Inspección Pre-Vuelo: Ghostwriter Prompt
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Inspecciona o edita el prompt antes de transmitirlo a Google Gemini. Se enviará exactamente el texto activo.
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
              <Badge variant="outline" className="border-emerald-400/40 text-emerald-300 bg-emerald-400/5 font-mono text-[10px]">
                {isEdited ? "✏️ Prompt Editado" : "⚡ Holístico (1 Pasada)"}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 min-h-[350px] flex flex-col items-center justify-center gap-3">
            <div className="trap-spinner !w-8 !h-8 !border-2" />
            <p className="text-xs text-muted-foreground animate-pulse">
              Compilando arquitectura holística en 5 capas, ADN musical y contexto vocal...
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
                <TabsTrigger value="active" className="text-xs data-[state=active]:bg-slime data-[state=active]:text-black flex items-center gap-1">
                  <Edit3 className="w-3.5 h-3.5" /> Prompt Activo {isEdited && "(Modificado)"}
                </TabsTrigger>
                <TabsTrigger value="suno" className="text-xs data-[state=active]:bg-slime data-[state=active]:text-black flex items-center gap-1">
                  <Music2 className="w-3.5 h-3.5" /> Suno & Beat
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                {isEdited && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/10 flex items-center gap-1"
                    onClick={handleRestoreCompiled}
                    title="Restaurar el texto original compilado desde los controles de la UI"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Restaurar Compilado
                  </Button>
                )}
                {onRecompile && promptData?.inputsChangedSinceCompile && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 flex items-center gap-1"
                    onClick={onRecompile}
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Recompilar
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-border/50 text-muted-foreground hover:text-foreground"
                  onClick={() => handleCopy(editedPrompt, "active", "Prompt activo")}
                >
                  {copiedTab === "active" ? <Check className="w-3.5 h-3.5 text-slime mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                  {copiedTab === "active" ? "Copiado" : "Copiar"}
                </Button>
              </div>
            </div>

            {/* TAB: ACTIVE PROMPT (EDITABLE) */}
            <TabsContent value="active" className="flex-1 flex flex-col min-h-0 pt-2 m-0 data-[state=inactive]:hidden">
              {/* Telemetría y estado de caracteres */}
              <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 pb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono">
                    Compilado: <strong>{compiledPrompt.length.toLocaleString()}</strong> chars
                  </span>
                  <span>•</span>
                  <span className="font-mono">
                    Activo: <strong className={isEdited ? "text-amber-400 font-bold" : "text-slate-300"}>{editedPrompt.length.toLocaleString()}</strong> chars
                  </span>
                  <span>•</span>
                  <span>
                    Estado:{" "}
                    {isEdited ? (
                      <span className="text-amber-300 font-medium inline-flex items-center gap-1">
                        <Edit3 className="w-3 h-3" /> Modificado manualmente
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-medium inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Sin editar (Compilado puro)
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Info className="w-3.5 h-3.5 text-cyber" />
                  <span>Se enviará exactamente el prompt activo.</span>
                </div>
              </div>

              {/* Advertencia si supera los 12.000 caracteres */}
              {isLongPrompt && (
                <div className="mb-2 p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    El prompt supera los 12.000 caracteres ({editedPrompt.length.toLocaleString()}). Puede causar tiempos de respuesta más lentos o alto consumo de cuota en Google Gemini.
                  </span>
                </div>
              )}

              {/* Editor directo de prompt */}
              <div className="flex-1 min-h-[300px] flex flex-col rounded-lg border border-border/50 bg-black/70 overflow-hidden focus-within:border-slime/50 transition-colors">
                <textarea
                  value={editedPrompt}
                  onChange={(e) => setEditedPrompt(e.target.value)}
                  className="w-full flex-1 p-4 bg-transparent font-mono text-xs leading-relaxed text-slate-200 resize-none outline-none selection:bg-slime/20 selection:text-slime"
                  placeholder="Escribe o edita el prompt que se transmitirá a Gemini..."
                  spellCheck={false}
                />
              </div>
            </TabsContent>

            {/* TAB: SUNO & BEAT */}
            <TabsContent value="suno" className="flex-1 flex flex-col min-h-0 pt-2 m-0 space-y-3 overflow-y-auto data-[state=inactive]:hidden">
              <div className="space-y-2 p-3 bg-black/40 border border-border/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slime flex items-center gap-1.5">
                    <Music2 className="w-3.5 h-3.5" /> Prompt de Estilo Suno v4.5 (4 Capas)
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
              Mostrar siempre inspección antes de generar
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
                onConfirmGenerate(isEdited ? editedPrompt : undefined);
              }}
              className="text-xs h-9 bg-gradient-to-r from-slime to-emerald-400 text-black font-semibold hover:opacity-90 glow-slime flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {isEdited ? "Disparar con Prompt Editado" : "Confirmar y Transmitir al LLM"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
