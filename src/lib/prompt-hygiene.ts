export interface ContaminationFinding {
  token: string;
  category: "instructional_leak" | "diagnostic_leak" | "template_leak" | "allowed_user_term" | "structural_term";
  severity: "info" | "warning" | "critical";
  reason: string;
}

export interface PromptHygieneReport {
  isClean: boolean;
  score: number; // 0 to 100
  criticalCount: number;
  warningCount: number;
  findings: ContaminationFinding[];
}

// Internal instructional sequences that should NEVER leak verbatim into user lyrics
const FORBIDDEN_INSTRUCTIONAL_SEQUENCES = [
  "fumo loud",
  "veo el futuro",
  "same squad",
  "los números en la mesa",
  "billetes azules",
  "anti-coro escolar",
  "prohibición radical",
  "call & response dialéctico",
  "pocket american bounce",
  "anáfora de anclaje",
  "triplet ostinato"
];

// Structural terms that are natural and permissible in hip-hop lyrics
const STRUCTURAL_ALLOWED_WORDS = new Set([
  "clean", "clear", "facts", "yeah", "up", "never", "always", "truuu", "bounce", "drop",
  "cut", "pause", "intro", "verse", "chorus", "hook", "outro", "beat", "sauce", "wuh"
]);

/**
 * Audits generated lyrics for accidental prompt contamination / instructional vocabulary reuse.
 */
export function auditPromptContamination(
  lyrics: string,
  userExplicitTokens: string[] = []
): PromptHygieneReport {
  const findings: ContaminationFinding[] = [];
  const lowerLyrics = lyrics.toLowerCase();

  // Normalize user tokens
  const userAllowed = new Set(
    userExplicitTokens.map(t => t.toLowerCase().trim()).filter(Boolean)
  );

  // 1. Check exact forbidden instructional sequences (CRITICAL)
  for (const seq of FORBIDDEN_INSTRUCTIONAL_SEQUENCES) {
    if (lowerLyrics.includes(seq)) {
      // Check if user explicitly asked for this exact sequence in customTopic
      if (userAllowed.has(seq)) {
        findings.push({
          token: seq,
          category: "allowed_user_term",
          severity: "info",
          reason: `El usuario incluyó explícitamente "${seq}" en su temática`,
        });
      } else {
        findings.push({
          token: seq,
          category: "instructional_leak",
          severity: "critical",
          reason: `Secuencia instructiva interna "${seq}" detectada en la letra generada (Prompt Bleed)`,
        });
      }
    }
  }

  // 2. Check individual token leakage if it matches internal system diagnostic terms
  const diagnosticTerms = ["instructionprompt", "sunotagsmode", "dynamismmode", "flowpocketmode", "narrativearc"];
  for (const term of diagnosticTerms) {
    if (lowerLyrics.includes(term)) {
      findings.push({
        token: term,
        category: "diagnostic_leak",
        severity: "critical",
        reason: `Variable interna del sistema "${term}" filtrada al texto`,
      });
    }
  }

  const criticalCount = findings.filter(f => f.severity === "critical").length;
  const warningCount = findings.filter(f => f.severity === "warning").length;
  const isClean = criticalCount === 0 && warningCount === 0;
  const score = Math.max(0, 100 - criticalCount * 40 - warningCount * 15);

  return {
    isClean,
    score,
    criticalCount,
    warningCount,
    findings,
  };
}

export interface MetadataLeakFinding {
  term: string;
  source: "artist_bio" | "label_name" | "flow_descriptor";
  isExemptedByUser: boolean;
  reason: string;
}

export interface MetadataLeakReport {
  hasLeak: boolean;
  leaks: MetadataLeakFinding[];
  sanitizedLyrics: string;
}

// Known internal artist bio descriptors and label terms that often leak into generation
const INTERNAL_METADATA_TERMS: Array<{ term: string; source: MetadataLeakFinding["source"] }> = [
  { term: "quality control", source: "label_name" },
  { term: "qc the label", source: "label_name" },
  { term: "rey del tresillo", source: "flow_descriptor" },
  { term: "1017 thug", source: "label_name" },
  { term: "brick squad", source: "label_name" },
  { term: "murda beatz", source: "label_name" },
  { term: "zaytoven piano", source: "flow_descriptor" },
  { term: "grand hustle", source: "label_name" },
  { term: "freebandz", source: "label_name" },
  { term: "cactus jack label", source: "label_name" },
  { term: "savage mode ii", source: "artist_bio" }
];

/**
 * Audits lyrics for accidental prompt metadata leakage with strict precedence:
 * User Explicit Input > Scene Facts > Internal Metadata.
 * If user explicitly requested the term, it is exempted and preserved.
 */
export function auditMetadataLeakage(
  lyrics: string,
  userExplicitTokens: string[] = []
): MetadataLeakReport {
  const leaks: MetadataLeakFinding[] = [];
  const lowerLyrics = lyrics.toLowerCase();

  // Normalize user explicit tokens for comparison
  const userAllowed = new Set(
    userExplicitTokens.map(t => t.toLowerCase().trim()).filter(Boolean)
  );

  let sanitized = lyrics;

  for (const item of INTERNAL_METADATA_TERMS) {
    if (lowerLyrics.includes(item.term)) {
      // Check if user explicitly provided this term
      const isExempted = userAllowed.has(item.term) || 
        Array.from(userAllowed).some(ut => ut.includes(item.term) || item.term.includes(ut));

      if (isExempted) {
        leaks.push({
          term: item.term,
          source: item.source,
          isExemptedByUser: true,
          reason: `Término "${item.term}" permitido porque fue solicitado explícitamente por el usuario`,
        });
      } else {
        leaks.push({
          term: item.term,
          source: item.source,
          isExemptedByUser: false,
          reason: `Fuga de metadatos internos del sistema ("${item.term}") no solicitada por el usuario`,
        });

        // Clean out unintentional leaks from lyrics while preserving rhythm
        const regex = new RegExp(item.term, "gi");
        if (item.term === "quality control") {
          sanitized = sanitized.replace(regex, "Real street motion");
        } else if (item.term === "rey del tresillo") {
          sanitized = sanitized.replace(regex, "el jefe del bloque");
        } else {
          sanitized = sanitized.replace(regex, "street business");
        }
      }
    }
  }

  const hasLeak = leaks.some(l => !l.isExemptedByUser);

  return {
    hasLeak,
    leaks,
    sanitizedLyrics: sanitized,
  };
}

/**
 * Sanitizes user input before entering prompt builder to prevent syntax breaks or accidental tokens.
 */
export function sanitizeUserInput(input: string): string {
  if (!input) return "";
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/[{}\\]/g, "")
    .trim();
}

export interface ClicheAuditFinding {
  token: string;
  category: "corporate_cliche" | "generic_moralizing" | "sports_broadcast_language" | "lazy_ai_loop";
  severity: "critical" | "warning";
  barIndex?: number;
  lineText: string;
  reason: string;
  matchedPattern: string;
}

export interface ClicheAuditReport {
  hasCliche: boolean;
  criticalCount: number;
  warningCount: number;
  findings: ClicheAuditFinding[];
}

// 100% Audit-only catalogs with flexive lemma regex patterns
export const AUDIT_CORPORATE_CLICHES: readonly RegExp[] = [
  /\binviert[a-z]* duro\b/i,
  /\bmultiplic[a-z]* (?:las )?ganancias\b/i,
  /\bstake en la red\b/i,
  /\bcontrola[a-z]* el game\b/i,
  /\brendimiento pasivo\b/i,
  /\blibertad financiera\b/i,
  /\bhaciendo networking\b/i,
  /\bholding en la wallet\b/i,
  /\bganancias rindiendo\b/i,
  /\brindiendo mientras duermo\b/i,
];

export const AUDIT_MORALIZING_TROPES: readonly RegExp[] = [
  /\bla lealtad no se compra(?: en la tienda)?\b/i,
  /\bno aceptamos ratas\b/i,
  /\blealtad ante todo\b/i,
  /\blos verdaderos se quedan\b/i,
  /\bla traici[óo]n se paga cara\b/i,
  /\bla lealtad no se vende\b/i,
  /\bla lealtad vale m[áa]s que\b/i,
  /\blealtad hasta la tumba\b/i,
  /\bla lealtad se paga con\b/i,
];

export const AUDIT_SPORTS_BROADCAST: readonly RegExp[] = [
  /\bl[íi]nea de la nba\b/i,
  /\bcorte limpio swish\b/i,
  /\bstephen curry desde (?:el |la )?(?:mitad|court|centro|cancha)\b/i,
  /\btiro de tres puntos\b/i,
  /\btiro en suspensi[óo]n\b/i,
  /\bbal[óo]n en las manos\b/i,
];

export const AUDIT_LAZY_AI_MIST: readonly RegExp[] = [
  /\bel humo me da (?:la )?estrategia\b/i,
  /\bel humo me aclara la visi[óo]n\b/i,
  /\bla sativa me aclara la visi[óo]n\b/i,
  /\bveo el futuro bien claro\b/i,
  /\bel humo me susurra\b/i,
  /\bla niebla en el penthouse\b/i,
];

/**
 * 100% Audit-only evaluation of generated or repaired lyrics for tired AI clichés.
 * Catches corporate pitch speak, moralizing motivational quotes, and robotic broadcast loops.
 * Never injected into LLM prompts to prevent prompt bleed.
 */
export function auditCliches(
  lyrics: string,
  userExplicitTokens: string[] = []
): ClicheAuditReport {
  const findings: ClicheAuditFinding[] = [];
  if (!lyrics || !lyrics.trim()) {
    return { hasCliche: false, criticalCount: 0, warningCount: 0, findings: [] };
  }

  const userAllowed = new Set(
    userExplicitTokens.map((t) => t.toLowerCase().trim()).filter(Boolean)
  );

  const lines = lyrics.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("["));

  lines.forEach((line, idx) => {
    // 1. Corporate Clichés
    for (const pattern of AUDIT_CORPORATE_CLICHES) {
      const match = line.match(pattern);
      if (match) {
        const token = match[0];
        if (!userAllowed.has(token.toLowerCase())) {
          findings.push({
            token,
            category: "corporate_cliche",
            severity: "critical",
            barIndex: idx,
            lineText: line,
            reason: `Cliché corporativo/financiero artificial detectado: "${token}"`,
            matchedPattern: pattern.source,
          });
        }
      }
    }

    // 2. Moralizing Tropes
    for (const pattern of AUDIT_MORALIZING_TROPES) {
      const match = line.match(pattern);
      if (match) {
        const token = match[0];
        if (!userAllowed.has(token.toLowerCase())) {
          findings.push({
            token,
            category: "generic_moralizing",
            severity: "critical",
            barIndex: idx,
            lineText: line,
            reason: `Discurso moralizante o frase de autoayuda detectada: "${token}"`,
            matchedPattern: pattern.source,
          });
        }
      }
    }

    // 3. Sports Broadcast Language
    for (const pattern of AUDIT_SPORTS_BROADCAST) {
      const match = line.match(pattern);
      if (match) {
        const token = match[0];
        // If user explicitly requested the player/term, exempt it
        const isExempted = Array.from(userAllowed).some(
          (ut) => token.toLowerCase().includes(ut) || ut.includes(token.toLowerCase())
        );
        if (!isExempted) {
          findings.push({
            token,
            category: "sports_broadcast_language",
            severity: "warning",
            barIndex: idx,
            lineText: line,
            reason: `Lenguaje de retransmisión deportiva televisiva detectado: "${token}"`,
            matchedPattern: pattern.source,
          });
        }
      }
    }

    // 4. Lazy AI Mist
    for (const pattern of AUDIT_LAZY_AI_MIST) {
      const match = line.match(pattern);
      if (match) {
        const token = match[0];
        if (!userAllowed.has(token.toLowerCase())) {
          findings.push({
            token,
            category: "lazy_ai_loop",
            severity: "critical",
            barIndex: idx,
            lineText: line,
            reason: `Muletilla o bucle perezoso de IA detectado: "${token}"`,
            matchedPattern: pattern.source,
          });
        }
      }
    }
  });

  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;
  const hasCliche = criticalCount > 0 || warningCount > 0;

  return {
    hasCliche,
    criticalCount,
    warningCount,
    findings,
  };
}
