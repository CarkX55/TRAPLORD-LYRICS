# Language DNA Evolution: Speaker Dialect Engine & Regional Spanish Flavor (Post-Frozen)

> [!NOTE]
> **Aislamiento del Benchmark Contract v1**:
> Este documento técnico describe la evolución subsiguiente del subsistema de lenguaje (`Language DNA`) de TRAPLORD en la rama `main`.
> El **`FROZEN BENCHMARK CONTRACT v1`** (tag git `benchmark-contract-v1-frozen`, commit `43d92c0`) permanece **100% congelado e inmutable**.
> Esta evolución refina la autenticidad compositiva en el producto de producción sin alterar los estimandos, semillas, fixtures ni protocolos del benchmark experimental.

---

## 1. Principios Rectores y Correcciones Metodológicas

La arquitectura de Language DNA vNext se asienta sobre cuatro reglas cardinales:

1. **Cero Ejemplos Negativos en el Prompt (Prompt Hygiene Absoluto)**:
   - Queda terminantemente prohibido incluir frases erróneas de ejemplo en el prompt de composición (ej. jamás citar *"baloncesto profesional"*, *"fumar la llama"* o *"no compito con novatos"* en el prompt, para evitar que el LLM las reproduzca por imitación/eco).
   - El prompt recibe exclusivamente directivas de principio afirmativas y estructurales:
     ```text
     ANTI-TRANSLATION PRINCIPLE:
     Do not translate urban idioms literally.
     Preserve idiomatic expressions in their native language.
     When no natural equivalent exists, retain the original expression
     rather than manufacturing a literal translation.
     Prefer native phrasing over word-for-word translation.

     THEMATIC INTEGRITY PRINCIPLE:
     Write in authentic conversational street vernacular for this artist's cultural background.
     Never force vocabulary words artificially.
     Let slang emerge organically from the rhythm, attitude, and narrative tension.
     ```
   - Las listas de términos sospechosos y artefactos de traducción residen **exclusivamente en el auditor posterior**, jamás en el generador.

2. **Perfiles Descriptivos, Cero "Excel Checklist" de Palabras**:
   - `SpanishFlavorProfile` y `SpeakerDialectProfile` no son listas de palabras a insertar obligatoriamente. Se definen como un **espacio de características lingüísticas, sintácticas y fonéticas** (compresión conversacional caribeña, préstamos naturales de hip-hop, elisiones, etc.).
   - Los marcadores léxicos concretos se dividen en `strongRegionalMarkers`, `weakRegionalMarkers` y `contaminationMarkers`, y son utilizados **únicamente por el auditor/detector**.

3. **Puntuación Probabilística y Contextual (`dialectContaminationScore`)**:
   - La presencia de un término aislado como *"coche"* o *"novato"* no invalida una estrofa (evita falsos positivos).
   - El auditor evalúa la densidad y coincidencia en clúster: un marcador débil aporta bajo peso (+0.10), una combinación inequívocamente peninsular aporta peso moderado (+0.65), y un calco de traducción flagrante aporta peso crítico (+0.85 a +0.95).
   - Detección de sobrecarga artificial (`slang_overstuffing`): si un compás acumula 4 o más marcadores de jerga forzados mecánicamente, se registra telemetría de advertencia sin forzar reparación destructiva.

4. **El Ratio es Global y Elástico**:
   - `targetEnglishRatio` (ej. 0.70) se evalúa como una meta global ponderada por sílabas para toda la canción, no como una cuota rígida sección por sección o artista por artista.

---

## 2. Arquitectura de Dos Capas y Pipeline con Language Audit

```text
                    USER UI
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
  Language Mix    Spanish Flavor   Artist/Voice
  (e.g. 70% EN)   (e.g. PR 🇵🇷)    (e.g. Offset)
        │              │              │
        └──────────────┼──────────────┘
                       ↓
              SPEAKER DIALECT ENGINE
                       │
          ┌────────────┴────────────┐
          ↓                         ↓
 English Realization         Spanish Realization
 (Atlanta AAVE Register)     (PR Urban Spanish)
          │                         │
          └────────────┬────────────┘
                       ↓
               PROMPT HYGIENE
                       ↓
            PASS 1 TOPLINER (Chorus)
                       ↓
           PASS 2 GHOSTWRITER (Verses)
                       ↓
                  RAW AST
                       ↓
             LANGUAGE & DIALECT AUDIT
                       │
      ┌────────────────┼─────────────────┐
      ↓                ↓                 ↓
 languageRatio   dialectFit        translationArtifactScore
 (syllables)     (contextual)      & slangChecklistScore
      │                │                 │
      └────────────────┼─────────────────┘
                       ↓
                  repairScore
                       ↓
              0 / 1 SURGICAL REPAIR
    (Sustitución atómica de la barra contaminada
     preservando barId, flow, performance y locks)
                       ↓
                  RE-AUDIT
                       ↓
             HOOK BIND & QUALITY GATE
```

---

## 3. Especificación de Componentes

### A. `src/lib/dialect-engine.ts`
- Catálogo de sabores españoles (`SPANISH_FLAVOR_CATALOG`): `auto`, `puerto_rico`, `spain`, `mexico`, `dominican`, `argentina`, `neutral_latam`.
- Catálogo de dialectos de artistas (`SPEAKER_DIALECT_CATALOG`): Atlanta AAVE, Chicago Drill, Brooklyn Drill, UK Drill, Puerto Rico Drill, Spain Barrio.
- Generador de directivas de prompt limpias (`buildDialectPromptDirectives`).
- Auditor de dialecto y artefactos de traducción (`auditDialectAndTranslationArtifacts`).

### B. `src/lib/language-dna.ts`
- Modela el ADN lingüístico enriquecido con `spanishFlavor`.
- Expone perfiles dialectales tanto para la voz principal como para el artista invitado (`featureArtistId`).
- Formula directivas de lenguaje descriptivas inyectando el `ANTI-TRANSLATION PRINCIPLE`.

### C. `src/lib/artist-references.ts` & `src/lib/language-detector.ts`
- Desacoplamiento de jerga peninsular estática en el detector de idioma; resolución adaptativa según el sabor activo.
- Corrección de referencias en Yovngchimi: *"Drill boricua, no te bajes del carro (Glizzy!)"*.

### D. `src/app/api/generate/route.ts`
- Ingesta de `spanishFlavor` y cómputo de `LanguageAllocationPlan` determinista.
- **Unified Defect Set**: La auditoría dialectal alimenta `runInitialDeliveryAudit(candidateAST, ..., dialectAudit)`, garantizando que `evaluateRepairability(auditContext)` actúe como **única compuerta de decisión de reparación** (exactamente 0 o 1 llamada LLM de reparación quirúrgica, sin bifurcaciones en paralelo).
- Medición post-generación de `observedEnglishRatio` sobre el AST real emitido.

### E. `src/app/page.tsx`
- Selector visual de **Spanish Flavor** integrado en la UI (Auto, Puerto Rico 🇵🇷, España 🇪🇸, México 🇲🇽, Rep. Dominicana 🇩🇴, Argentina 🇦🇷, Pan-Latino 🌎).

---

## 4. Language Allocation Plan y Prioridad en Cascada

### A. Desacople Epistemológico: Ratio Planificado vs Ratio Observado
El solver conoce los pesos estructurales planificados de las secciones ($w_i$), pero no puede garantizar la cantidad exacta de sílabas que emitirá el LLM:
- `targetEnglishRatio`: Meta fijada por el usuario en la UI.
- `predictedEnglishRatio`: Ratio ponderado planificado previamente a la llamada generativa:
  $$\text{predictedEnglishRatio} = \sum_i w_i r_i$$
- `observedEnglishRatio`: Ratio medido empíricamente post-generación por el Language Audit:
  $$\text{observedEnglishRatio} = \frac{\text{sílabas en inglés observadas}}{\text{total de sílabas observadas}}$$

### B. Formulación Matemática del Solver
El solver optimiza los ratios de sección $r_i \in [0.0, 1.0]$ minimizando la desviación cuadrática respecto a las preferencias del intérprete $p_i$ y penalizando la desviación de la meta global $T$:
$$\min_r \left[ \sum_i w_i (r_i - p_i)^2 + \lambda \left(\sum_i w_i r_i - T\right)^2 \right]$$

### C. Estados de Viabilidad (`AllocationStatus`)
- `"FEASIBLE"`: Meta alcanzable naturalmente dentro de los rangos de las voces.
- `"CLAMPED"`: Meta en el límite que satura compases a 0.0 o 1.0.
- `"INFEASIBLE"`: Meta matemáticamente fuera del espacio alcanzable según las voces seleccionadas.

### D. Bandas de Tolerancia
- `globalSoftBand`: Margen elástico recomendado de $\pm 5\%$ (ej. 0.65 a 0.75 para meta 0.70).
- `globalHardBand`: Límite duro admisible de $\pm 12\%$ (ej. 0.58 a 0.82 para meta 0.70).

### E. Prioridad Universal en Cascada para `SpanishFlavor = auto`
1. Sabor explícito en la UI (`requestedFlavor !== "auto"`).
2. Configuración por defecto de proyecto (`projectDefaultFlavor !== "auto"`).
3. Feature hispanohablante nativo (ej. Offset ft. Yovngchimi $\to$ `puerto_rico`).
4. Artista principal hispanohablante nativo (ej. Yovngchimi o Morad $\to$ `puerto_rico` o `spain`).
5. **Fallback universal agnóstico**: Pan-latino urbano contemporáneo (`neutral_latam`).

---

## 5. Aislamiento Git y Reproducibilidad

- **Benchmark Frozen Tag**: `benchmark-contract-v1-frozen`
- **Benchmark Frozen Commit**: `43d92c0`
- **Regla de Recogida de Datos**: La suite de evaluación del Benchmark Contract v1 se ejecuta estrictamente desde `git checkout 43d92c0`.
- **Evolución del Producto**: Esta especificación de Language DNA vNext reside y evoluciona en la rama `main` (`a9bbc26` y posteriores).
