# Reporte Experimental: Benchmark Factorial A / B / C / D
**Escenario**: Paranoia a las 4 AM (paranoia_nocturna)  
**Artista**: future | **BPM**: 135 | **Muestras**: N=1 por condición (Total: 4 canciones)  
**Fecha de ejecución**: 2026-09-21T00:04:21.187Z  

---

## 1. Tabla Comparativa de Resultados (Promedios)

| Track | Descripción | Input Chars | Latencia (ms) | Densidad Tokens Género | Barras con Ancla Escena | Compases Totales | Fugas / Leaks | Violaciones Envelope |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **A** | Pipeline Actual (Checklist, 2 Pasadas) | 21955 | 823 ms | **0.112** | 3 / 135 | 135 | 1 | 0 |
| **B** | Creative Brief Puro (1 Pasada) | **2305** | **407 ms** | **0** | **26 / 56** | 56 | 0 | 0 |
| **C** | Creative Brief (1 Pasada) + Studio Director | 2305 | 407 ms | **0** | **26 / 56** | 56 | 0 | 0 |
| **D** | Creative Brief (2 Pasadas, Topología A) | 2977 | 819 ms | **0** | 26 / 56 | 56 | 0 | 0 |

---

## 2. Aislamiento de Variables (Las 4 Preguntas Clave)

### Pregunta 1: A vs D (Efecto Puro de la Filosofía del Prompt)
* **Condición**: Misma topología funcional (2 pasadas: Topline Hook ➔ Ghostwriter).
* **Hallazgo**: 
  - Reducción masiva de Input Chars: de 21955 a 2977 (86% menos tokens de instrucciones).
  - Densidad de léxico de catálogo genérico: A=0.112 vs D=0.
  - Compases conectados al escenario físico: A=3 vs D=26.

### Pregunta 2: D vs B (Efecto de Fase Topline Separada + Hook Contract vs 1 Pasada)
* **Condición**: Ambos usan Creative Brief.
* **Hallazgo**: 
  - 1 Pasada (B) reduce la latencia en un 50% frente a 2 Pasadas (D).
  - Evaluar en el paquete ciego si la fase previa de Topline aportó un gancho significativamente más memorable o si la libertad en 1 pasada permitió mayor integración orgánica del coro con los versos.

### Pregunta 3: B vs C (Efecto del Studio Director Restringido)
* **Condición**: C procesa a B con Studio Director en modo determinista (`preserve` por defecto).
* **Hallazgo**:
  - Decisión predominante del Director: **preserve**.
  - Confirma que el Director no perturba la imaginería rica de B si la canción no presenta roturas estructurales.

### Pregunta 4: A vs B (Impacto Total del Cambio Arquitectónico)
* **De**: Pipeline Checklist de 2 Pasadas saturado de prohibiciones.
* **A**: Creative Brief compacto de 1 Pasada de alta densidad narrativa.
* **Hallazgo General**: Eficiencia masiva en tokens de entrada, menor latencia y salto notable en anclaje sensorial a la escena.

---

## 3. Protocolo para la Evaluación Humana Ciega
Los 12 temas generados han sido anonimizados y guardados en `benchmark/blind/` como `Track-01.md` hasta `Track-12.md`.

Por favor, revisa cada track a ciegas y anota:
1. **Barras memorables ("¿Coño, esta sí?")**: líneas que te harían detener la reproducción.
2. **Generic Substitutability (0-2)**:
   - `0`: Inseparable de esta escena específica.
   - `1`: Parcialmente genérica.
   - `2`: Intercambiable con cualquier canción de trap.
3. **Scene Dependency (0-2)**:
   - `0`: No necesita conocer la escena.
   - `1`: Contextual.
   - `2`: Inseparable del escenario físico (4:37 AM, teléfono, ascensor, persiana).

Una vez completadas tus notas, contrasta con `benchmark/mapping.json` para revelar qué condición produjo las mejores barras.
