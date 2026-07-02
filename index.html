// POST /api/food-lookup   body: { alimento: "kéfir" }
//
// Genera la ficha nutricional de un alimento que no está en la guía local,
// respaldándola en estudios científicos reales de PubMed:
//   1. Pide a Claude una consulta de búsqueda en inglés para ese alimento.
//   2. Busca en PubMed (NCBI E-utilities) y descarga los resúmenes (abstracts) más relevantes.
//   3. Pide a Claude que redacte la ficha (macros, calificación A-E y sustitutos)
//      citando esos estudios reales entre corchetes, p.ej. [1].
//
// La clave de Anthropic vive solo en el servidor (ANTHROPIC_API_KEY).

import { callClaude, extraerJSON } from "./_lib/claude.js";
import { buscarPMIDs, obtenerMetadatos, obtenerAbstract } from "./_lib/pubmed.js";

const ESQUEMA = `{"nombre":"","categoria":"","emoji":"","rating":"A|B|C|D|E","kcal":0,"carbs":0,"azucares":0,"proteinas":0,"grasas":0,"grasasSat":0,"fibra":0,"sodio":0,"motivo":"","sustitutos":[{"nombre":"","emoji":"","mejor":true,"kcal":0,"carbs":0,"azucares":0,"proteinas":0,"grasas":0,"grasasSat":0,"fibra":0,"sodio":0,"porque":""}]}`;

function normalizarId(alimento) {
  return "ia_" + alimento
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Falta configurar ANTHROPIC_API_KEY en las variables de entorno de Vercel." });
  }

  const alimento = (req.body?.alimento || "").toString().trim().slice(0, 80);
  if (!alimento) {
    return res.status(400).json({ error: "Falta el nombre del alimento." });
  }

  try {
    // 1) Consulta de búsqueda en inglés para PubMed
    const plan = extraerJSON(await callClaude(apiKey, {
      maxTokens: 200,
      system: 'Traduces alimentos al inglés y generas consultas de búsqueda para PubMed sobre sus efectos en la salud. Respondes solo con JSON: {"foodEn": "...", "query": "..."}',
      messages: [{
        role: "user",
        content: `Alimento: "${alimento}". Genera una query de PubMed en inglés (con operadores AND/OR si procede) para encontrar estudios sobre sus efectos nutricionales o en la salud cardiovascular/metabólica.`
      }]
    }));

    const pmids = await buscarPMIDs(plan.query, 5);
    const metadatos = await obtenerMetadatos(pmids);
    const conAbstract = await Promise.all(
      metadatos.slice(0, 4).map(async m => ({ ...m, abstract: await obtenerAbstract(m.pmid) }))
    );

    const estudiosTexto = conAbstract.length
      ? conAbstract.map((e, i) =>
          `[${i + 1}] ${e.titulo} (${e.revista}, ${e.anio}) — PMID ${e.pmid}\nResumen: ${e.abstract || "no disponible"}`
        ).join("\n\n")
      : "No se encontraron estudios relevantes en PubMed para este alimento.";

    // 2) Ficha nutricional redactada por la IA, citando los estudios reales encontrados
    const fichaTexto = await callClaude(apiKey, {
      maxTokens: 900,
      system: `Eres un dietista-nutricionista. Devuelves SIEMPRE un único objeto JSON válido (sin texto adicional ni markdown) con este esquema exacto: ${ESQUEMA}. Los valores nutricionales son de referencia por 100 g, basados en tablas de composición de alimentos estándar. El campo "motivo" debe justificar la calificación citando los estudios recibidos entre corchetes (p.ej. [1]) cuando sea pertinente. Propón 1-2 sustitutos reales más saludables; si el alimento ya es una opción muy saludable, "sustitutos" puede ir vacío []. Si el alimento es una grasa para cocinar o untar, considera recomendar AOVE (aceite de oliva virgen extra) como mejor opción cuando aplique, explicando el porqué.`,
      messages: [{
        role: "user",
        content: `Alimento a analizar: "${alimento}".\n\nEstudios científicos encontrados en PubMed:\n${estudiosTexto}\n\nGenera la ficha nutricional en español siguiendo el esquema indicado.`
      }]
    });

    const ficha = extraerJSON(fichaTexto);
    ficha.id = normalizarId(alimento);
    ficha.aliases = [alimento.toLowerCase()];
    ficha.fuente = "ia";

    res.status(200).json({ food: ficha, estudios: conAbstract });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
