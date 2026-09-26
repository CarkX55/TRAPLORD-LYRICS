// Test harness & contract validation for the Holistic Ghostwriter Engine (Paso 0)
import {
  buildHolisticPrompt,
  buildSectionRegenerationPrompt,
  resolveFunctionalArtistStyle,
  type FunctionalArtistStyle,
  type SectionRegenerationParams,
  type PromptParams,
} from "../src/lib/prompt-builder";
import { BPM_VIBES, STRUCTURES, MOODS, getArtistById } from "../src/lib/trap-data";

async function runTests() {
  console.log("=================================================================");
  console.log("🧪 PASO 0: TEST HARNESS & VALIDACIÓN DE CONTRATOS (MOTOR HOLÍSTICO)");
  console.log("=================================================================\n");

  // 1. Validar resolveFunctionalArtistStyle
  console.log("1. Probando resolveFunctionalArtistStyle para Yung Beef y Morad...");
  const ybStyle = resolveFunctionalArtistStyle("yungbeef");
  console.log("   Yung Beef Timbre:", ybStyle.timbre);
  console.log("   Yung Beef Cadence:", ybStyle.cadence);
  console.log("   Yung Beef RhymeTexture:", ybStyle.rhymeTexture);

  if (!ybStyle.timbre || !ybStyle.cadence || !ybStyle.dialectAndVocabulary) {
    throw new Error("❌ Error en resolveFunctionalArtistStyle: faltan campos obligatorios");
  }
  console.log("   ✅ resolveFunctionalArtistStyle funciona correctamente.\n");

  // 2. Validar buildHolisticPrompt
  console.log("2. Probando buildHolisticPrompt...");
  const dummyParams: PromptParams = {
    artistId: "yungbeef",
    featureArtistId: "",
    moodId: "mood_dark",
    topics: ["Calle y supervivencia", "Dinero y lealtad"],
    customTopic: "Llamada nocturna desde la plaza con el socio",
    spanglishPercent: 15,
    bpmVibe: BPM_VIBES[5], // 130-135 BPM
    structure: STRUCTURES[0],
    narrativeArcId: "none",
    narrativeArcDesc: "",
    producerId: "none",
    producerTag: "",
    customDictionary: "la guantá, joseo, los kilos",
    dynamicMarkers: true,
  };

  const holisticPrompt = buildHolisticPrompt(dummyParams);
  console.log("   Longitud del Prompt Holístico Compilado:", holisticPrompt.length, "caracteres");
  console.log("   Líneas totales:", holisticPrompt.split("\n").length);

  // Verificaciones de invariantes
  if (!holisticPrompt.includes("CAPA 1: MISIÓN DE ESTUDIO")) {
    throw new Error("❌ Falta CAPA 1 en buildHolisticPrompt");
  }
  if (!holisticPrompt.includes("CAPA 2: NÚCLEO CREATIVO & CONFLICTO")) {
    throw new Error("❌ Falta CAPA 2 en buildHolisticPrompt");
  }
  if (!holisticPrompt.includes("CAPA 3: IDENTIDAD VOCAL FUNCIONAL")) {
    throw new Error("❌ Falta CAPA 3 en buildHolisticPrompt");
  }
  if (!holisticPrompt.includes("CAPA 4: MAPA ESTRUCTURAL")) {
    throw new Error("❌ Falta CAPA 4 en buildHolisticPrompt");
  }
  if (!holisticPrompt.includes("CAPA 5: FORMATO DE SALIDA")) {
    throw new Error("❌ Falta CAPA 5 en buildHolisticPrompt");
  }
  if (holisticPrompt.length > 9000) {
    console.warn("⚠️ Advertencia: El prompt supera los 9000 caracteres recomendados.");
  } else {
    console.log("   ✅ Prompt holístico compacto y jerarquizado dentro del presupuesto ideal (<9000 chars).");
  }
  console.log("   ✅ buildHolisticPrompt validado con éxito.\n");

  // 3. Validar buildSectionRegenerationPrompt
  console.log("3. Probando buildSectionRegenerationPrompt con contexto de vecindad...");
  const sampleSong = `[Intro]
Yeah, la noche está fría en el bloque...

[Chorus]
Bolsillo lleno pero la mente vacía
Cuentas claras antes de que llegue el día

[Verse 1]
Bajé al portal con la capucha puesta
Mirando a los lados por si alguien contesta
El dinero no duerme, yo tampoco duermo
Tres llamadas perdidas en el cuaderno

[Chorus]
Bolsillo lleno pero la mente vacía
Cuentas claras antes de que llegue el día

[Verse 2]
El coche arrancado en doble fila
La sombra en la esquina me vigila
El socio me jura que no sabe nada
Pero el cristal roto cuenta la jugada

[Outro]
Se apagan las luces del barrio...`;

  const regenParams: SectionRegenerationParams = {
    sectionName: "Verse 2",
    sectionType: "lyrical",
    artistStyle: ybStyle.timbre + ", " + ybStyle.cadence,
    exactLines: 4,
    fullLyrics: sampleSong,
    narrativeRole: "La sospecha se confirma: el socio traiciona y el coche está listo para huir",
    factsToPreserve: ["El coche en doble fila", "Llamadas perdidas del verso 1", "El cristal roto"],
    previousSectionTail: "Bolsillo lleno pero la mente vacía\nCuentas claras antes de que llegue el día",
    nextSectionHead: "Se apagan las luces del barrio...",
    neighborHookAnchor: "Bolsillo lleno pero la mente vacía",
    anchors: {
      requiredPhrases: ["el cristal roto"],
    },
  };

  const regenPrompt = buildSectionRegenerationPrompt(regenParams);
  console.log("   Longitud del Prompt de Regeneración:", regenPrompt.length, "caracteres");

  if (!regenPrompt.includes("FICHA OPERATIVA DE REGENERACIÓN")) {
    throw new Error("❌ Falta la Ficha Operativa en buildSectionRegenerationPrompt");
  }
  if (!regenPrompt.includes("Vecindad Anterior")) {
    throw new Error("❌ Falta contexto de vecindad anterior en buildSectionRegenerationPrompt");
  }
  if (!regenPrompt.includes("Vecindad Posterior")) {
    throw new Error("❌ Falta contexto de vecindad posterior en buildSectionRegenerationPrompt");
  }
  if (!regenPrompt.includes("Frase Ancla Vecina")) {
    throw new Error("❌ Falta neighborHookAnchor en buildSectionRegenerationPrompt");
  }
  console.log("   ✅ buildSectionRegenerationPrompt validado con éxito con Ficha Operativa.\n");

  // 4. Validar sección instrumental en regeneración
  console.log("4. Probando regeneración de sección instrumental ([Beat Drop])...");
  const instrumentalRegen = buildSectionRegenerationPrompt({
    sectionName: "Beat Drop",
    sectionType: "instrumental",
    artistStyle: "Heavy 808 sub bass drop",
    fullLyrics: sampleSong,
    narrativeRole: "Explosión rítmica de bajo sin voces",
    factsToPreserve: [],
  });

  if (instrumentalRegen.includes("líneas de texto cantado")) {
    throw new Error("❌ Error: Se exigieron líneas de texto cantado para una sección instrumental");
  }
  if (!instrumentalRegen.includes("NO CONTIENE LÍRICA CANTADA")) {
    throw new Error("❌ Falta indicación de no-lírica para sección instrumental");
  }
  console.log("   ✅ Regeneración instrumental respeta tipo sin exigir exactLines.\n");

  console.log("=================================================================");
  console.log("🎉 TODOS LOS CONTRATOS Y FIXTURES DEL PASO 0 VALIDADOS CON ÉXITO");
  console.log("=================================================================");
}

runTests().catch(err => {
  console.error("❌ Fallo en las pruebas:", err);
  process.exit(1);
});
