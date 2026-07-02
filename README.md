# HSNutrición

Guía nutricional que detecta alimentos por texto o imagen, los califica de A a E
y recomienda sustitutos más saludables. Los alimentos que no están en la guía
local se generan al momento con IA, respaldados por estudios reales de PubMed.

## Estructura

- `index.html`, `css/styles.css`, `js/` — sitio estático (sin build).
- `js/data.js` — base de datos nutricional local (41 alimentos).
- `api/analyze-image.js` — función serverless: detecta alimentos en una foto.
- `api/food-lookup.js` — función serverless: busca en PubMed y genera con IA
  la ficha de un alimento que no está en `js/data.js`.

Las dos funciones usan `ANTHROPIC_API_KEY` **solo en el servidor**; el navegador
nunca ve la clave.

## Desplegar en Vercel

1. Sube este proyecto a un repositorio de GitHub/GitLab/Bitbucket (o usa
   `vercel` directamente desde esta carpeta).
2. En [vercel.com](https://vercel.com), importa el repositorio (framework
   preset: "Other" — no necesita build command ni output directory, es estático).
3. En **Project Settings → Environment Variables**, añade:
   - `ANTHROPIC_API_KEY` (obligatoria) — tu clave de la API de Anthropic.
   - `NCBI_API_KEY` y `NCBI_EMAIL` (opcionales) — para tener más cuota al
     consultar PubMed.
4. Despliega. La web y las funciones `/api/*` quedan servidas juntas.

### Con la CLI de Vercel

```bash
npm i -g vercel
vercel login
vercel            # despliegue de prueba
vercel env add ANTHROPIC_API_KEY
vercel --prod     # despliegue a producción
```

## Desarrollo local

Para probar solo la interfaz (sin las funciones de IA), sirve la carpeta con
cualquier servidor estático, por ejemplo `python -m http.server`.

Para probar también `/api/analyze-image` y `/api/food-lookup` necesitas la
CLI de Vercel y la variable de entorno configurada en un archivo `.env.local`
(basado en `.env.example`):

```bash
vercel dev
```

## Aviso

La información nutricional es orientativa y educativa (valores de referencia
por 100 g). No sustituye la valoración de un dietista-nutricionista o médico.
