/* HSNutrición — Lógica de la aplicación */

(function () {
  "use strict";

  /* ---------------- Escalas para las barras de macros (valores de referencia altos) ---------------- */
  const ESCALAS = { kcal: 900, carbs: 100, proteinas: 40, grasas: 100, fibra: 12 };
  const ETIQUETAS_MACRO = {
    kcal: "Calorías", carbs: "Carbohidratos", azucares: "  de los cuales azúcares",
    proteinas: "Proteínas", grasas: "Grasas", grasasSat: "  de las cuales saturadas",
    fibra: "Fibra", sodio: "Sodio"
  };

  /* ================= Detección de alimentos en texto ================= */
  function detectarAlimentos(texto) {
    const norm = normalizar(texto);
    const encontrados = [];
    const usados = new Set();
    let restante = norm;

    for (const { alias, food } of INDICE_ALIAS) {
      if (usados.has(food.id)) continue;
      const patron = new RegExp("(^|[^a-z0-9áéíóúñ])" + escapeRegExp(alias) + "($|[^a-z0-9áéíóúñ])");
      if (patron.test(restante)) {
        encontrados.push(food);
        usados.add(food.id);
        // Evita que un alias corto (p.ej. "pan") vuelva a machacar uno largo ya usado
        restante = restante.replace(new RegExp(escapeRegExp(alias), "g"), " ");
      }
    }
    return encontrados;
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /* ================= Render de tarjetas ================= */
  function crearBarraMacro(clave, valor) {
    const max = ESCALAS[clave] || 100;
    const pct = Math.max(2, Math.min(100, (valor / max) * 100));
    const unidad = clave === "kcal" ? "kcal" : "g";
    const wrap = document.createElement("div");
    wrap.className = "macro-row";
    wrap.innerHTML = `
      <div class="macro-row-head"><b>${ETIQUETAS_MACRO[clave]}</b><span>${valor} ${unidad}</span></div>
      <div class="macro-track"><div class="macro-fill fill-${clave}" data-pct="${pct}"></div></div>`;
    return wrap;
  }

  function crearTablaMacros(food) {
    const cont = document.createElement("div");
    cont.className = "macro-table";
    ["kcal", "carbs", "proteinas", "grasas", "fibra"].forEach(clave => {
      cont.appendChild(crearBarraMacro(clave, food[clave]));
    });
    const extra = document.createElement("p");
    extra.className = "food-motivo";
    extra.style.marginTop = "0";
    extra.innerHTML = `De las grasas, <b>${food.grasasSat} g</b> son saturadas · de los carbohidratos, <b>${food.azucares} g</b> son azúcares · sodio: <b>${food.sodio} mg</b> <span style="color:var(--ink-faint)">(por 100 g)</span>`;
    cont.appendChild(extra);
    return cont;
  }

  function crearSustituto(sub) {
    const el = document.createElement("div");
    el.className = "sub-item";
    el.innerHTML = `
      <div class="sub-head">
        <span class="food-emoji">${sub.emoji}</span>
        <strong>${sub.nombre}</strong>
        ${sub.mejor ? '<span class="sub-best">Mejor opción</span>' : ""}
      </div>
      <p class="sub-porque">${sub.porque}</p>
      <div class="sub-macros">
        <span><b>${sub.kcal}</b> kcal</span>
        <span><b>${sub.grasas}</b> g grasas</span>
        <span><b>${sub.grasasSat}</b> g saturadas</span>
        <span><b>${sub.carbs}</b> g carbs</span>
        <span><b>${sub.proteinas}</b> g proteína</span>
        <span><b>${sub.fibra}</b> g fibra</span>
      </div>`;
    return el;
  }

  function crearCitas(estudios) {
    const cont = document.createElement("div");
    cont.className = "citas";
    if (!estudios || !estudios.length) {
      cont.innerHTML = `<p class="citas-title">📚 No se encontraron estudios de PubMed específicos para este alimento; la ficha se basa en tablas de composición estándar.</p>`;
      return cont;
    }
    cont.innerHTML = `<p class="citas-title">📚 Estudios consultados en PubMed</p>` +
      estudios.map((e, i) =>
        `<a class="cita-item" href="${e.url}" target="_blank" rel="noopener noreferrer">[${i + 1}] ${e.titulo}${e.revista ? " — " + e.revista : ""}${e.anio ? " (" + e.anio + ")" : ""}</a>`
      ).join("");
    return cont;
  }

  function crearTarjetaAlimento(food, { conSustitutos = true, estudios = null } = {}) {
    const card = document.createElement("article");
    card.className = "food-card";
    card.innerHTML = `
      ${food.fuente === "ia" ? '<div class="ai-ribbon">🤖 Ficha generada por IA, respaldada por PubMed</div>' : ""}
      <div class="food-card-head">
        <span class="food-emoji">${food.emoji}</span>
        <div class="food-title">
          <h4>${food.nombre}</h4>
          <span class="food-cat">${food.categoria}</span>
        </div>
        <span class="badge badge-${food.rating}" title="Calificación nutricional">${food.rating}</span>
      </div>
      <p class="food-motivo">${food.motivo}</p>
    `;
    card.appendChild(crearTablaMacros(food));

    if (conSustitutos && food.sustitutos.length) {
      const toggle = document.createElement("button");
      toggle.className = "food-card-footer-toggle";
      toggle.innerHTML = `<span>Ver sustituto${food.sustitutos.length > 1 ? "s" : ""} recomendado${food.sustitutos.length > 1 ? "s" : ""}</span>
        <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>`;
      const subCont = document.createElement("div");
      subCont.className = "substitutes";
      food.sustitutos.forEach(s => subCont.appendChild(crearSustituto(s)));

      toggle.addEventListener("click", () => {
        toggle.classList.toggle("open");
        subCont.classList.toggle("open");
      });

      card.appendChild(toggle);
      card.appendChild(subCont);
    } else if (conSustitutos) {
      const ok = document.createElement("p");
      ok.className = "food-motivo";
      ok.style.background = "var(--green-50)";
      ok.style.borderColor = "var(--green-400)";
      ok.textContent = "✅ Este alimento ya es una excelente elección: no necesita sustituto.";
      card.appendChild(ok);
    }
    if (estudios !== null) {
      card.appendChild(crearCitas(estudios));
    }
    return card;
  }

  function animarBarras(root) {
    root.querySelectorAll(".macro-fill").forEach(el => {
      const pct = el.dataset.pct;
      requestAnimationFrame(() => { el.style.width = pct + "%"; });
    });
  }

  // Ejecuta cada bloque de forma aislada: si uno falla (p.ej. por un elemento que
  // no existe tras una caché desincronizada entre HTML y JS), el resto de la
  // página sigue funcionando en vez de quedar completamente en blanco.
  function seguro(nombre, fn) {
    try {
      fn();
    } catch (err) {
      console.error(`[HSNutrición] Fallo en "${nombre}":`, err);
    }
  }

  /* ================= Reveal on scroll (va primero: es lo que hace visible el contenido) ================= */
  seguro("reveal-on-scroll", () => {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(el => io.observe(el));
  });

  /* ================= Guía completa (contenido visible por defecto) ================= */
  seguro("guia-completa", () => {
    const guiaGrid = document.getElementById("guiaGrid");
    const buscadorGuia = document.getElementById("buscadorGuia");
    const filtroCategoria = document.getElementById("filtroCategoria");
    const filtroRating = document.getElementById("filtroRating");

    const categorias = [...new Set(FOODS.map(f => f.categoria))].sort();
    filtroCategoria.innerHTML = '<option value="">Todas las categorías</option>' +
      categorias.map(c => `<option value="${c}">${c}</option>`).join("");

    function renderGuia() {
      const q = normalizar(buscadorGuia.value);
      const cat = filtroCategoria.value;
      const rating = filtroRating.value;
      const lista = FOODS.filter(f =>
        (!q || normalizar(f.nombre).includes(q)) &&
        (!cat || f.categoria === cat) &&
        (!rating || f.rating === rating)
      );
      guiaGrid.innerHTML = "";
      if (!lista.length) {
        guiaGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--ink-faint)">No se han encontrado alimentos con ese filtro.</p>';
        return;
      }
      lista.forEach((food, i) => {
        const card = crearTarjetaAlimento(food);
        card.style.animationDelay = Math.min(i * 0.04, 0.4) + "s";
        guiaGrid.appendChild(card);
      });
      animarBarras(guiaGrid);
    }
    [buscadorGuia, filtroCategoria, filtroRating].forEach(el => el.addEventListener("input", renderGuia));
    renderGuia();
  });

  /* ================= Contador hero ================= */
  seguro("contador-hero", () => {
    const statFoods = document.getElementById("statFoods");
    const total = FOODS.length;
    let n = 0;
    const step = Math.max(1, Math.round(total / 30));
    const iv = setInterval(() => {
      n += step;
      if (n >= total) { n = total; clearInterval(iv); }
      statFoods.textContent = n;
    }, 30);
  });

  /* ================= Menú móvil ================= */
  seguro("menu-movil", () => {
    document.getElementById("navToggle").addEventListener("click", () => {
      document.getElementById("mainNav").classList.toggle("open-mobile");
    });
  });

  /* ================= Pestañas del analizador ================= */
  let analyzerStatus;
  seguro("pestanas-analizador", () => {
    analyzerStatus = document.getElementById("analyzerStatus");
    document.querySelectorAll(".tab").forEach(tab => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(t => { t.classList.remove("active"); t.setAttribute("aria-selected", "false"); });
        document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
        tab.classList.add("active");
        tab.setAttribute("aria-selected", "true");
        document.querySelector(`.tab-panel[data-panel="${tab.dataset.tab}"]`).classList.add("active");
        if (analyzerStatus) analyzerStatus.textContent = "";
      });
    });
  });

  /* ================= Analizador: texto ================= */
  seguro("analizador-texto", () => {
    const resultsSection = document.getElementById("results");
    const resultsGrid = document.getElementById("resultsGrid");
    const resultsCount = document.getElementById("resultsCount");
    const emptyState = document.getElementById("emptyState");

    window.__mostrarResultados = function mostrarResultados(alimentos, origen) {
      resultsGrid.innerHTML = "";
      if (!alimentos.length) {
        if (analyzerStatus) analyzerStatus.textContent = "No hemos reconocido ningún alimento de nuestra guía local en " + origen + ". Prueba a ser más específico, o búscalo con IA + PubMed más abajo 👇";
        resultsSection.hidden = true;
        emptyState.hidden = false;
        return;
      }
      if (analyzerStatus) analyzerStatus.textContent = "";
      emptyState.hidden = true;
      resultsSection.hidden = false;
      resultsCount.textContent = `${alimentos.length} alimento${alimentos.length > 1 ? "s" : ""} detectado${alimentos.length > 1 ? "s" : ""}`;
      alimentos.forEach((food, i) => {
        const card = crearTarjetaAlimento(food);
        card.style.animationDelay = (i * 0.06) + "s";
        resultsGrid.appendChild(card);
      });
      animarBarras(resultsGrid);
      resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    document.getElementById("btnAnalizarTexto").addEventListener("click", () => {
      const texto = document.getElementById("inputTexto").value.trim();
      if (!texto) {
        if (analyzerStatus) analyzerStatus.textContent = "Escribe primero qué has comido.";
        return;
      }
      const alimentos = detectarAlimentos(texto);
      window.__mostrarResultados(alimentos, "el texto");
    });
  });

  /* ================= Analizador: imagen ================= */
  seguro("analizador-imagen", () => {
    const dropzone = document.getElementById("dropzone");
    const inputImagen = document.getElementById("inputImagen");
    const dropzoneEmpty = document.getElementById("dropzoneEmpty");
    const previewImagen = document.getElementById("previewImagen");
    const btnAnalizarImagen = document.getElementById("btnAnalizarImagen");
    let imagenBase64 = null;
    let imagenMime = null;

    dropzone.addEventListener("click", () => inputImagen.click());
    ["dragover", "dragenter"].forEach(evt =>
      dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.add("drag-over"); })
    );
    ["dragleave", "drop"].forEach(evt =>
      dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.remove("drag-over"); })
    );
    dropzone.addEventListener("drop", e => {
      const file = e.dataTransfer.files[0];
      if (file) cargarImagen(file);
    });
    inputImagen.addEventListener("change", () => {
      if (inputImagen.files[0]) cargarImagen(inputImagen.files[0]);
    });

    // Redimensiona la imagen en el propio navegador (máx. 1024px) antes de enviarla,
    // para que el payload sea pequeño y rápido de subir.
    function redimensionarImagen(dataUrl, maxDim = 1024, calidad = 0.85) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", calidad));
        };
        img.onerror = reject;
        img.src = dataUrl;
      });
    }

    function cargarImagen(file) {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = await redimensionarImagen(reader.result);
        imagenMime = "image/jpeg";
        imagenBase64 = dataUrl.split(",")[1];
        previewImagen.src = dataUrl;
        previewImagen.hidden = false;
        dropzoneEmpty.hidden = true;
        btnAnalizarImagen.disabled = false;
      };
      reader.readAsDataURL(file);
    }

    async function detectarAlimentosEnImagen(base64, mime) {
      const resp = await fetch("/api/analyze-image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: mime })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || ("respuesta " + resp.status));
      return data.texto || "";
    }

    btnAnalizarImagen.addEventListener("click", async () => {
      if (!imagenBase64) return;

      btnAnalizarImagen.disabled = true;
      btnAnalizarImagen.textContent = "Analizando imagen…";
      if (analyzerStatus) analyzerStatus.textContent = "Consultando al modelo de visión…";

      try {
        const nombres = await detectarAlimentosEnImagen(imagenBase64, imagenMime);
        const alimentos = detectarAlimentos(nombres);
        window.__mostrarResultados(alimentos, "la imagen");
      } catch (err) {
        console.error(err);
        if (analyzerStatus) analyzerStatus.textContent = "No se pudo analizar la imagen (" + err.message + "). Puedes describir la comida en la pestaña de texto.";
      } finally {
        btnAnalizarImagen.disabled = false;
        btnAnalizarImagen.innerHTML = 'Analizar imagen <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M13 5l7 7-7 7-1.41-1.41L16.17 13H4v-2h12.17l-4.58-4.59L13 5z"/></svg>';
      }
    });
  });

  /* ================= Modal informativo sobre la IA ================= */
  seguro("modal-info-ia", () => {
    const modalOverlay = document.getElementById("modalOverlay");
    function abrirModal() { modalOverlay.hidden = false; }
    function cerrarModal() { modalOverlay.hidden = true; }

    document.getElementById("btnSettings").addEventListener("click", abrirModal);
    document.getElementById("modalClose").addEventListener("click", cerrarModal);
    document.getElementById("modalOk").addEventListener("click", cerrarModal);
    modalOverlay.addEventListener("click", e => { if (e.target === modalOverlay) cerrarModal(); });
  });

  /* ================= Búsqueda de alimentos con IA + PubMed ================= */
  seguro("busqueda-ia-pubmed", () => {
    const inputAiLookup = document.getElementById("inputAiLookup");
    const btnAiLookup = document.getElementById("btnAiLookup");
    const aiLookupStatus = document.getElementById("aiLookupStatus");
    const aiLookupResult = document.getElementById("aiLookupResult");

    async function buscarConIA(alimento) {
      const clave = "hsn_ai_" + normalizar(alimento);
      const cache = sessionStorage.getItem(clave);
      if (cache) return JSON.parse(cache);

      const resp = await fetch("/api/food-lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ alimento })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || ("respuesta " + resp.status));
      sessionStorage.setItem(clave, JSON.stringify(data));
      return data;
    }

    async function ejecutarBusquedaIA() {
      const alimento = inputAiLookup.value.trim();
      if (!alimento) {
        aiLookupStatus.textContent = "Escribe primero el nombre de un alimento.";
        return;
      }
      btnAiLookup.disabled = true;
      aiLookupStatus.textContent = "Consultando PubMed y generando la ficha… puede tardar unos segundos.";
      aiLookupResult.innerHTML = "";
      try {
        const { food, estudios } = await buscarConIA(alimento);
        aiLookupStatus.textContent = "";
        const card = crearTarjetaAlimento(food, { estudios });
        aiLookupResult.appendChild(card);
        animarBarras(aiLookupResult);
        card.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (err) {
        console.error(err);
        aiLookupStatus.textContent = "No se pudo completar la búsqueda (" + err.message + "). Prueba de nuevo en unos segundos.";
      } finally {
        btnAiLookup.disabled = false;
      }
    }

    btnAiLookup.addEventListener("click", ejecutarBusquedaIA);
    inputAiLookup.addEventListener("keydown", e => { if (e.key === "Enter") ejecutarBusquedaIA(); });
  });

})();
