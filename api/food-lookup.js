// POST /api/food-lookup   body: { alimento: "kéfir" }
//
// Genera la ficha nutricional de un alimento que no está en la guía local,
// respaldándola en estudios científicos reales de PubMed:
//   1. Pide a Gemini una consulta de búsqueda en inglés para ese alimento.
//   2. Busca en PubMed (NCBI E-utilities) y descarga los resúmenes (abstracts) más relevantes.
//   3. Pide a Gemini que redacte la ficha (macros, calificación A-E y sustitutos)
//      citando esos estudios reales entre corchetes, p.ej. [1].
//
// Usa la API gratuita de Google Gemini; la clave vive solo en el servidor (GEMINI_API_KEY).

import { callGemini, extraerJSON } from "./_lib/gemini.js";
import { buscarPMIDs, obtenerMetadatos, obtenerAbstract } from "./_lib/pubmed.js";

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    foodEn: { type: "string" },
    query: { type: "string" }
  },
  required: ["foodEn", "query"]
};

const SUSTITUTO_SCHEMA = {
  type: "object",
  properties: {
    nombre: { type: "string" },
    emoji: { type: "string" },
    mejor: { type: "boolean" },
    kcal: { type: "number" },
    carbs: { type: "number" },
    azucares: { type: "number" },
    proteinas: { type: "number" },
    grasas: { type: "number" },
    grasasSat: { type: "number" },
    fibra: { type: "number" },
    sodio: { type: "number" },
    porque: { type: "string" }
  },
  required: ["nombre", "emoji", "mejor", "kcal", "carbs", "azucares", "proteinas", "grasas", "grasasSat", "fibra", "sodio", "porque"]
};

const FICHA_SCHEMA = {
  type: "object",
  properties: {
    nombre: { type: "string" },
    categoria: { type: "string" },
    emoji: { type: "string" },
    rating: { type: "string", enum: ["A", "B", "C", "D", "E"] },
    kcal: { type: "number" },
    carbs: { type: "number" },
    azucares: { type: "number" },
    proteinas: { type: "number" },
    grasas: { type: "number" },
    grasasSat: { type: "number" },
    fibra: { type: "number" },
    sodio: { type: "number" },
    motivo: { type: "string" },
    sustitutos: { type: "array", items: SUSTITUTO_SCHEMA }
  },
  required: ["nombre", "categoria", "emoji", "rating", "kcal", "carbs", "azucares", "proteinas", "grasas", "grasasSat", "fibra", "sodio", "motivo", "sustitutos"]
};

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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Falta configurar GEMINI_API_KEY en las variables de entorno de Vercel." });
  }

  const alimento = (req.body?.alimento || "").toString().trim().slice(0, 80);
  if (!alimento) {
    return res.status(400).json({ error: "Falta el nombre del alimento." });
  }

  try {
    // 1) Consulta de búsqueda en inglés para PubMed
    const plan = extraerJSON(await callGemini(apiKey, {
      input: `Traduces alimentos al inglés y generas consultas de búsqueda para PubMed sobre sus efectos en la salud. Alimento: "${alimento}". Genera una query de PubMed en inglés (con operadores AND/OR si procede) para encontrar estudios sobre sus efectos nutricionales o en la salud cardiovascular/metabólica. Responde solo con el JSON solicitado.`,
      responseSchema: PLAN_SCHEMA
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
    const fichaTexto = await callGemini(apiKey, {
      input: `Eres un dietista-nutricionista. Los valores nutricionales son de referencia por 100 g, basados en tablas de composición de alimentos estándar. El campo "motivo" debe justificar la calificación citando los estudios recibidos entre corchetes (p.ej. [1]) cuando sea pertinente. Propón 1-2 sustitutos reales más saludables; si el alimento ya es una opción muy saludable, "sustitutos" puede ir vacío []. Si el alimento es una grasa para cocinar o untar, considera recomendar AOVE (aceite de oliva virgen extra) como mejor opción cuando aplique, explicando el porqué.

Alimento a analizar: "${alimento}".

Estudios científicos encontrados en PubMed:
${estudiosTexto}

Genera la ficha nutricional en español siguiendo el esquema JSON solicitado.`,
      responseSchema: FICHA_SCHEMA
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
