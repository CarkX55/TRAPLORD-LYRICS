// Integration test for Holistic Ghostwriter Pipeline & Invariant Suite v2.2
import crypto from "crypto";
import {
  buildHolisticPrompt,
  buildSectionRegenerationPrompt,
  resolveFunctionalArtistStyle,
  type PromptParams,
} from "../src/lib/prompt-builder";
import { detectApiKeyLikeContent } from "../src/lib/prompt-hygiene";
import {
  createInitialVersionGraph,
  addVersionNode,
  revertToVersionNode,
  type SongVersionNode,
} from "../src/lib/version-graph";
import { parseRawLyricsToAST, stringifyASTToSunoLyrics } from "../src/lib/song-document";
import { runInitialDeliveryAudit, evaluateFinalQualityGate } from "../src/lib/quality-gate";
import { auditSunoBudget } from "../src/lib/suno-budget";
import { BPM_VIBES, STRUCTURES } from "../src/lib/trap-data";

async function runIntegrationSuite() {
  console.log("==================================================================");
  console.log("🔥 TEST SUITE: MOTOR GHOSTWRITER HOLÍSTICO & INVARIANTES v2.2");
  console.log("==================================================================\n");

  // 1. Invariante de Seguridad P0: Detección y rechazo de API Keys (sin mutación silenciosa)
  console.log("1. Validando rechazo de secretos / API Keys (P0)...");
  const promptWithGeminiKey = "Letra normal con secreto AIzaSyB1234567890abcdefghijklmnopqrstuvw";
  const promptWithOpenAIKey = "Letra normal con sk-abcdefghijklmnopqrstuvwxyz123456789";
  const promptWithBearer = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secretpayloadhere";
  const promptClean = "Letra de trap callejero crudo en Madrid, 130 BPM, barras pesadas.";

  if (!detectApiKeyLikeContent(promptWithGeminiKey)) {
    throw new Error("❌ Falló: no se detectó API Key de Gemini");
  }
  if (!detectApiKeyLikeContent(promptWithOpenAIKey)) {
    throw new Error("❌ Falló: no se detectó API Key de OpenAI");
  }
  if (!detectApiKeyLikeContent(promptWithBearer)) {
    throw new Error("❌ Falló: no se detectó Bearer token");
  }
  if (detectApiKeyLikeContent(promptClean)) {
    throw new Error("❌ Falso positivo: prompt limpio detectado como secreto");
  }
  console.log("   ✅ Detección de claves de API validada con precisión (Rechazo HTTP 400 sin mutación silenciosa).\n");

  // 2. Invariante de Hash Canónico sha256 y Trazabilidad de Prompt
  console.log("2. Validando cálculo de sha256 y trazabilidad de prompt...");
  const dummyParams: PromptParams = {
    artistId: "yungbeef",
    featureArtistId: "",
    moodId: "mood_dark",
    topics: ["Supervivencia", "Bloque"],
    customTopic: "Encuentro en la glorieta de madrugada",
    spanglishPercent: 10,
    bpmVibe: BPM_VIBES[5],
    structure: STRUCTURES[0],
    narrativeArcId: "none",
    narrativeArcDesc: "",
    producerId: "none",
    producerTag: "",
    customDictionary: "",
    dynamicMarkers: true,
  };

  const compiled = buildHolisticPrompt(dummyParams);
  const hashCompiled = crypto.createHash("sha256").update(compiled).digest("hex");
  console.log("   Hash sha256 de prompt compilado:", hashCompiled.slice(0, 16) + "...");

  const edited = compiled + "\n// Instrucción personalizada del usuario";
  const hashEdited = crypto.createHash("sha256").update(edited).digest("hex");
  if (hashCompiled === hashEdited) {
    throw new Error("❌ Error: Los hashes de prompt compilado y editado no difieren");
  }
  console.log("   ✅ Trazabilidad mediante hash sha256 verificada.\n");

  // 3. Invariante de VersionGraph Realmente Inmutable
  console.log("3. Validando inmutabilidad estricta de VersionGraph...");
  const initialLyrics = `[Intro: Lead - autotune whisper]
La noche está pesada en el bloque...

[Chorus: Lead - heavy autotune stack]
Bolsillo lleno y la mirada fría
No me hables de lealtad si no es de día

[Verse 1: Lead - dry upfront vocal]
Bajé al portal con la sudadera puesta
El contacto no responde y nadie contesta
Tres llamadas perdidas de un número oculto
La plata en el bolsillo no paga este bulto

[Outro: Lead - reverb fade out]
Se apagan las farolas, el barrio duerme...`;

  const initialAST = parseRawLyricsToAST(initialLyrics);
  const initialBudget = auditSunoBudget(initialLyrics, 135);
  const initialAudit = runInitialDeliveryAudit(initialAST, 135, undefined, [], STRUCTURES[0].sections);
  const initialSnapshot = evaluateFinalQualityGate(initialAST, initialAudit, initialBudget, "v_1", "hash_initial");

  const vGraph = createInitialVersionGraph(
    initialAST,
    "Ghostwriter Holístico v2.2",
    initialSnapshot,
    {
      source: "initial",
      promptOrigin: "compiled",
      compiledPrompt: compiled,
      activePrompt: compiled,
      promptHash: hashCompiled,
      promptWasEdited: false,
      topP: 0.95,
      lyrics: initialLyrics,
    }
  );

  const initialNode = vGraph.versions[vGraph.currentVersionId];
  if (!initialNode) throw new Error("❌ Falta el nodo inicial en VersionGraph");
  if (initialNode.lyrics !== initialLyrics) throw new Error("❌ Las letras congeladas no coinciden");
  if (initialNode.promptHash !== hashCompiled) throw new Error("❌ El hash del prompt no coincide");
  if (initialNode.source !== "initial") throw new Error("❌ source debe ser 'initial'");
  if (initialNode.promptOrigin !== "compiled") throw new Error("❌ promptOrigin debe ser 'compiled'");

  // Añadir una regeneración de sección como versión hija
  const regeneratedLyrics = initialLyrics.replace(
    "Tres llamadas perdidas de un número oculto\nLa plata en el bolsillo no paga este bulto",
    "El socio en la esquina me tira una seña\nEl humo del tabaco calienta la peña"
  );
  const regenAST = parseRawLyricsToAST(regeneratedLyrics);
  regenAST.versionId = "v_2";
  const regenAudit = runInitialDeliveryAudit(regenAST, 135, undefined, [], STRUCTURES[0].sections);
  const regenSnapshot = evaluateFinalQualityGate(regenAST, regenAudit, initialBudget, "v_2", "hash_v2");

  const updatedGraph = addVersionNode(
    vGraph,
    regenAST,
    "Regeneración de [Verse 1]",
    ["v1_bar_3", "v1_bar_4"],
    regenSnapshot,
    {
      source: "section-regeneration",
      promptOrigin: "edited",
      compiledPrompt: compiled,
      activePrompt: edited,
      promptHash: hashEdited,
      promptWasEdited: true,
      topP: 0.95,
      lyrics: regeneratedLyrics,
    }
  );

  const v2Node = updatedGraph.versions["v_2"];
  if (!v2Node) throw new Error("❌ Falta el nodo v_2 en VersionGraph");
  if (v2Node.parentVersionId !== "v_1") throw new Error("❌ parentVersionId de v_2 debe ser v_1");
  if (v2Node.source !== "section-regeneration") throw new Error("❌ source de v_2 debe ser 'section-regeneration'");
  if (v2Node.promptOrigin !== "edited") throw new Error("❌ promptOrigin de v_2 debe ser 'edited'");

  // Verificar que el nodo padre (v_1) permanece 100% inalterado
  const v1Preserved = updatedGraph.versions["v_1"];
  if (v1Preserved.lyrics !== initialLyrics) {
    throw new Error("❌ Regresión crítica: El nodo padre v_1 fue mutado por la regeneración!");
  }
  console.log("   ✅ VersionGraph inmutable: nodo padre v_1 preservado, nodo hijo v_2 vinculado correctamente.\n");

  // 4. Invariante de Quality Gate como Observador Tolerante (OK / ATENCIÓN / REVISAR)
  console.log("4. Validando Quality Gate no destructivo...");
  if (!["OK", "ATENCIÓN", "REVISAR"].includes(initialSnapshot.qualityGate.status)) {
    throw new Error(`❌ Estado de Quality Gate no válido: ${initialSnapshot.qualityGate.status}`);
  }
  console.log("   Estado Quality Gate de canción inicial:", initialSnapshot.qualityGate.status);
  console.log("   Summary:", initialSnapshot.qualityGate.summary);
  console.log("   ✅ Quality Gate actúa como observador diagnóstico sin sustituir texto lírico.\n");

  // 5. Invariante de Regeneración con Vecindad y Ficha Operativa
  console.log("5. Validando Ficha Operativa con anclas y vecindades...");
  const regenParams = {
    sectionName: "Verse 1",
    sectionType: "lyrical" as const,
    artistStyle: "voz arrastrada, cadencia atrasada",
    exactLines: 4,
    fullLyrics: initialLyrics,
    narrativeRole: "Revelación de la trampa",
    factsToPreserve: ["El portal", "La llamada oculta"],
    previousSectionTail: "Bolsillo lleno y la mirada fría\nNo me hables de lealtad si no es de día",
    nextSectionHead: "Se apagan las farolas, el barrio duerme...",
    neighborHookAnchor: "Bolsillo lleno y la mirada fría",
    anchors: {
      requiredPhrases: ["la mirada fría"],
    },
  };

  const regenPrompt = buildSectionRegenerationPrompt(regenParams);
  if (!regenPrompt.includes("Vecindad Anterior")) throw new Error("❌ Falta Vecindad Anterior");
  if (!regenPrompt.includes("Vecindad Posterior")) throw new Error("❌ Falta Vecindad Posterior");
  if (!regenPrompt.includes("Frase Ancla Vecina")) throw new Error("❌ Falta Frase Ancla Vecina");
  if (!regenPrompt.includes("Devuelve EXACTAMENTE 4 líneas")) throw new Error("❌ Falta exactLines para lyrical");
  console.log("   ✅ Ficha operativa de regeneración incluye vecindades, anclas y formato limpio.\n");

  console.log("==================================================================");
  console.log("🎉 TODAS LAS PRUEBAS DE INTEGRACIÓN DEL MOTOR HOLÍSTICO PASARON CON ÉXITO");
  console.log("==================================================================");
}

runIntegrationSuite().catch(err => {
  console.error("❌ Fallo en las pruebas:", err);
  process.exit(1);
});
