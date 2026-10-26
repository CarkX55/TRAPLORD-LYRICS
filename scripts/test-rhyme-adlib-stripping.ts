import assert from "node:assert";
import { analyzeRhymes, extractCleanSungLine, type RhymeAnalysis } from "../src/lib/rhyme-detector";
import { detectRhymeScheme, detectPattern } from "../src/lib/rhyme-scheme-detector";

console.log("=== INICIANDO TEST: IGNORAR AD-LIBS EN ANÁLISIS DE RIMAS Y PATRONES ===");

// 1. Verificar extractCleanSungLine
const testCases = [
  {
    raw: "Bajo en el Lambo no freno (skrrt)",
    expected: "Bajo en el Lambo no freno",
  },
  {
    raw: "Tengo la cuenta en de cero (yeah) (facts)",
    expected: "Tengo la cuenta en de cero",
  },
  {
    raw: "Salgo del trap *(skrrt)* y prendo el blunt (fuego!)",
    expected: "Salgo del trap y prendo el blunt",
  },
  {
    raw: "(Skrrt!) (Yeah) (Trap!)",
    expected: "",
  },
  {
    raw: "[Pause] [Vocal Cut]",
    expected: "",
  },
  {
    raw: "[Intro: Travis Scott] Yeah, la ciudad prendida fuego (fuego)",
    expected: "Yeah, la ciudad prendida fuego",
  },
];

for (const tc of testCases) {
  const cleaned = extractCleanSungLine(tc.raw);
  assert.strictEqual(cleaned, tc.expected, `extractCleanSungLine fallo en: "${tc.raw}" -> "${cleaned}"`);
  console.log(`  ✓ extractCleanSungLine("${tc.raw}") -> "${cleaned}"`);
}

// 2. Verificar que analyzeRhymes ignora ad-libs idénticos y rima las palabras cantadas
// Caso A: Dos líneas con ad-lib idéntico (skrrt) al final, pero palabras cantadas diferentes que NO riman
const noRhymeWithSameAdlib = `
[Verse 1]
Miro la ciudad desde arriba (skrrt)
Compro zapatillas en la tienda (skrrt)
`;

const resNoRhyme = analyzeRhymes(noRhymeWithSameAdlib);
const groupsWithSkrrt = resNoRhyme.groups.filter(g => g.words.includes("skrrt"));
assert.strictEqual(
  groupsWithSkrrt.length,
  0,
  "NO debe existir ningún grupo de rima con la palabra 'skrrt' de un ad-lib"
);
console.log("  ✓ Ad-libs idénticos (skrrt / skrrt) NO generan falso grupo de rima");

// Caso B: Letra AABB con ad-libs variados que distraen
const aabbWithAdlibs = `
[Verse 1]
Bajo en el Lambo no freno (skrrt)
Tengo la cuenta en de cero (yeah)
Moviendo los fardos de nuevo (fuego)
Quiero to' el banco de nuevo (facts)
`;

const resAabb = analyzeRhymes(aabbWithAdlibs);
console.log("\nGrupos de rima detectados para AABB con ad-libs:");
for (const g of resAabb.groups) {
  console.log(`  Grupo [${g.type}] ending: "${g.ending}", palabras: [${g.words.join(", ")}], líneas: [${g.lineIndices.join(", ")}]`);
}

// Comprobar que freno (línea 0) y cero (línea 1) están emparejadas (o comparten asonancia e-o)
const groupLine0 = resAabb.groups.find(g => g.lineIndices.includes(0));
const groupLine1 = resAabb.groups.find(g => g.lineIndices.includes(1));
assert(groupLine0, "La línea 0 ('freno') debe tener un grupo de rima");
assert(groupLine1, "La línea 1 ('cero') debe tener un grupo de rima");
assert.strictEqual(groupLine0.id, groupLine1.id, "Línea 0 ('freno') y Línea 1 ('cero') deben pertenecer al MISMO grupo");

// Comprobar que nuevo (líneas 2 y 3) forman su propio grupo
const groupLine2 = resAabb.groups.find(g => g.lineIndices.includes(2));
const groupLine3 = resAabb.groups.find(g => g.lineIndices.includes(3));
assert(groupLine2, "La línea 2 ('nuevo') debe tener un grupo de rima");
assert(groupLine3, "La línea 3 ('nuevo') debe tener un grupo de rima");
assert.strictEqual(groupLine2.id, groupLine3.id, "Línea 2 y 3 ('nuevo' / 'nuevo') deben pertenecer al MISMO grupo");

// 3. Verificar detectRhymeScheme con ad-libs
const schemeResult = detectRhymeScheme(aabbWithAdlibs, resAabb);
console.log(`\nEsquema de rima detectado para Verse 1: "${schemeResult.sections[0]?.pattern}"`);
console.log(`Letras asignadas por línea: [${schemeResult.sections[0]?.letters.join(", ")}]`);
assert.strictEqual(schemeResult.sections[0]?.pattern, "AABB", "El esquema detectado para Verse 1 DEBE ser 'AABB'");
assert.strictEqual(schemeResult.dominantScheme, "AABB", "El esquema dominante DEBE ser 'AABB'");

// 4. Verificar detectPattern con varias secuencias
assert.strictEqual(detectPattern(["A", "A", "B", "B"]), "AABB", "Patrón AABB");
assert.strictEqual(detectPattern(["A", "B", "A", "B"]), "ABAB", "Patrón ABAB");
assert.strictEqual(detectPattern(["A", "A", "A", "A"]), "AAAA", "Patrón AAAA");
assert.strictEqual(detectPattern(["A", "B", "B", "A"]), "ABBA", "Patrón ABBA");
assert.strictEqual(detectPattern(["A", "A", "B", "B", "C", "C", "D", "D"]), "AABB", "Patrón 8 barras AABB");
assert.strictEqual(detectPattern(["A", "B", "A", "B", "C", "D", "C", "D"]), "ABAB", "Patrón 8 barras ABAB");
assert.strictEqual(detectPattern(["A", "A", "A", "A", "A", "A", "A", "A"]), "AAAA", "Patrón 8 barras AAAA (rage)");
assert.strictEqual(detectPattern(["a", "b", "c", "d"]), "Free", "Patrón sin rima es Free");
console.log("  ✓ detectPattern resuelve correctamente AABB, ABAB, AAAA, ABBA y Free");

// 5. Verificar que las líneas de pura intro con ad-libs no rompen la sincronización de índices
const songWithIntroAdlibs = `
[Intro: Travis Scott]
(Yeah!)
(Turn me up, skrrt)
[Beat Drop]

[Verse 1]
Bajo en el Lambo no freno (skrrt)
Tengo la cuenta en de cero (yeah)
`;

const resSync = analyzeRhymes(songWithIntroAdlibs);
const schemeSync = detectRhymeScheme(songWithIntroAdlibs, resSync);

console.log("\nSincronización con Intro de puros ad-libs:");
console.log("Líneas de Verse 1 en esquema:", schemeSync.sections.find(s => s.sectionName.includes("Verse 1"))?.lineIndices);
console.log("Grupos en resSync:", resSync.groups.map(g => ({ ending: g.ending, lines: g.lineIndices })));

const verseSection = schemeSync.sections.find(s => s.sectionName.includes("Verse 1"));
assert(verseSection, "Debe existir la sección Verse 1");
// Las dos barras de Verse 1 deben rimar entre sí
const vLetters = verseSection.letters;
console.log("Letras en Verse 1:", vLetters);
assert.strictEqual(vLetters[0], vLetters[1], "Las dos barras de Verse 1 deben compartir la misma letra de rima");

console.log("\n=== TODOS LOS TESTS DE RIMA SIN AD-LIBS PASARON SATISFACTORIAMENTE (100% OK) ===");
