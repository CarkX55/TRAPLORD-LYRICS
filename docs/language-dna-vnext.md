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

### A. Desacople Epistemológico y Masa Silábica Esperada
Para garantizar que el predictor pre-generación y el auditor post-generación midan la misma magnitud conceptual, la ponderación de secciones no se calcula por compases simples (*bar-weighted*), sino por **masa silábica esperada** (*syllable-weighted*):
- $\text{expectedSyllablesPerBar}_i$: Cadencia silábica típica según la función musical (7 en intro/outro, 9 en hook/chorus, 14 en verso/drill).
- $\text{expectedSyllables}_i = \text{bars}_i \times \text{expectedSyllablesPerBar}_i$.
- Ponderador de masa silábica:
  $$W_i = \frac{\text{expectedSyllables}_i}{\sum_j \text{expectedSyllables}_j}$$
- **Ratio Previsto**:
  $$\text{predictedEnglishRatio} = \sum_i W_i r_i$$
- **Ratio Observado**: Ratio medido empíricamente post-generación por el Language Audit sobre las sílabas efectivas del AST compilado:
  $$\text{observedEnglishRatio} = \frac{\text{sílabas en inglés observadas}}{\text{total de sílabas observadas}}$$

La cadena conceptual queda estrictamente estructurada como:
```text
expected syllable mass
        ↓
planned ratio
        ↓
LLM generation
        ↓
actual syllable mass
        ↓
observed ratio
```

### B. Formulación Matemática del Solver y Target Global Explícito ($T_{\text{eff}}$)
Para garantizar matemáticamente la igualdad con la meta solicitada sin depender de un hiperparámetro de penalización blanda ($\lambda$), el solver opera bajo un problema de proyección de dos pasos:

1. **Target Efectivo**:
   $$T_{\text{eff}} = \operatorname{clip}(T, T_{\min}, T_{\max})$$

2. **Optimización con Restricción de Igualdad Exacta**:
   $$\min_r \sum_i W_i (r_i - p_i)^2 \quad \text{sujeto a} \quad l_i \le r_i \le u_i \quad \text{y} \quad \sum_i W_i r_i = T_{\text{eff}}$$
   donde $p_i$ es la preferencia lingüística del intérprete para la sección $i$, y $[l_i, u_i]$ son las restricciones de caja naturales del artista (ej. $[0.20, 1.00]$ para raperos angloparlantes de Atlanta; $[0.00, 0.70]$ para drillers hispanohablantes boricuas).
   
Esta formulación preserva exactamente $T_{\text{eff}}$ ($\text{predictedEnglishRatio} = T_{\text{eff}}$) mientras minimiza la pérdida cuadrática frente a la preferencia de cada intérprete.

### C. Espacio Global Alcanzable, Estados de Viabilidad y Diagnóstico de Frontera
El espacio global de metas alcanzables para la configuración vocal de la canción queda acotado por:
$$T_{\min} = \sum_i W_i l_i, \qquad T_{\max} = \sum_i W_i u_i$$

Con una tolerancia numérica $\epsilon = 0.02$, los estados de viabilidad del target global se definen analíticamente sobre este intervalo:
- **`FEASIBLE`**: $T_{\min} + \epsilon < T < T_{\max} - \epsilon$ (la meta solicitada cae holgadamente en el interior del espacio alcanzable; el solver preserva $\text{predictedEnglishRatio} = T$).
- **`CLAMPED`**: $|T - T_{\min}| \le \epsilon$ o $|T - T_{\max}| \le \epsilon$ (la meta solicitada se sitúa exactamente en o alcanza un extremo alcanzable global).
- **`INFEASIBLE`**: $T < T_{\min} - \epsilon$ o $T > T_{\max} + \epsilon$ (la meta solicitada queda estrictamente fuera del espacio alcanzable; el sistema registra el target original en `targetEnglishRatio`, proyecta al extremo alcanzable en `effectiveTargetEnglishRatio = T_eff`, y establece $\text{predictedEnglishRatio} = T_{\text{eff}}$).

**Diagnóstico Ortogonal de Restricciones Activas**:
La activación de una restricción de caja individual en una sección ($r_i = l_i$ o $r_i = u_i$) dentro de una meta global factible no altera el `allocationStatus` (que sigue siendo `FEASIBLE`), sino que se reporta de forma independiente mediante:
$$\text{boundaryConstraintActive} = \exists \, i : (r_i = l_i \lor r_i = u_i)$$

### D. Asignación Operacional de Bandas de Tolerancia Truncadas a $[0, 1]$
Existe una separación ontológica inequívoca entre la variable optimizada por el solver y la evaluada por las bandas:
```text
Language Allocation Solver
→ optimiza predictedEnglishRatio

Language Audit
→ mide observedEnglishRatio

Soft/Hard language bands
→ se aplican a observedEnglishRatio
```
Las bandas de tolerancia se aplican sobre `observedEnglishRatio` con truncado formal en los extremos para garantizar coherencia en metas limítrofes (ej. $T = 0.95$ produce $[0.83, 1.00]$, jamás $> 1$):
$$\text{softLower} = \max(0, T - 0.05), \qquad \text{softUpper} = \min(1, T + 0.05)$$
$$\text{hardLower} = \max(0, T - 0.12), \qquad \text{hardUpper} = \min(1, T + 0.12)$$

### E. Prioridad Universal en Cascada para `SpanishFlavor = auto`
1. Sabor explícito en la UI (`requestedFlavor !== "auto"`).
2. Configuración por defecto de proyecto (`projectDefaultFlavor !== "auto"`).
3. Feature hispanohablante nativo (ej. Offset ft. Yovngchimi $\to$ `puerto_rico`).
4. Artista principal hispanohablante nativo (ej. Yovngchimi o Morad $\to$ `puerto_rico` o `spain`).
5. **Fallback universal agnóstico**: Pan-latino urbano contemporáneo (`neutral_latam`).

---

## 5. Aislamiento Git y Trazabilidad

```text
Benchmark execution:
  tag    = benchmark-contract-v1-frozen
  commit = 43d92c0

Current product main:
  commit = 22ca20d
```

- **Regla de Recogida de Datos**: La suite de evaluación del Benchmark Contract v1 se ejecuta estrictamente desde `git checkout 43d92c0`.
- **Evolución del Producto**: Esta especificación de Language DNA vNext reside y evoluciona en la rama `main` (`22ca20d` y posteriores).
