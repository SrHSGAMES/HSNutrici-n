// POST /api/analyze-image
// Recibe una imagen en base64 y devuelve los nombres de alimentos que la IA reconoce en ella.
// Usa la API gratuita de Google Gemini; la clave vive solo en el servidor
// (variable de entorno GEMINI_API_KEY), nunca se expone al navegador.

import { callGemini } from "./_lib/gemini.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Falta configurar GEMINI_API_KEY en las variables de entorno de Vercel." });
  }

  const { imageBase64, mimeType } = req.body || {};
  if (!imageBase64 || !mimeType) {
    return res.status(400).json({ error: "Falta la imagen." });
  }
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(mimeType)) {
    return res.status(400).json({ error: "Formato de imagen no soportado." });
  }
  if (imageBase64.length > 6_000_000) {
    return res.status(413).json({ error: "La imagen es demasiado grande." });
  }

  try {
    const texto = await callGemini(apiKey, {
      input: [
        {
          type: "text",
          text: "Enumera en español, separados por comas y sin explicaciones, todos los alimentos o productos alimenticios que reconozcas en esta imagen (por ejemplo: mantequilla, pan blanco, refresco)."
        },
        { type: "image", data: imageBase64, mime_type: mimeType }
      ]
    });
    res.status(200).json({ texto });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
