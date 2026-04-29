// ===== Comparador de Cod2 entre duas culturas — Agrotóxicos PR =====
// Cole no DevTools Console (F12) da página de listagem e rode.

(function compararCulturas(cultura1, cultura2) {
  const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

  // Extrai Map<Cod2, Alvo> para uma cultura
  function extrair(cultura) {
    const alvo = norm(cultura);
    const mapa = new Map();

    document.querySelectorAll("tr").forEach(tr => {
      const tds = tr.querySelectorAll(":scope > td");
      if (tds.length < 4) return;

      const a = tds[0].querySelector("a");
      if (!a) return;
      if (norm(a.textContent) !== alvo) return;

      const onclick = a.getAttribute("onclick") || "";
      const m = onclick.match(/Cod2=(\d+)/);
      if (!m) return;

      mapa.set(m[1], tds[2].textContent.trim());
    });

    return mapa;
  }

  const m1 = extrair(cultura1);
  const m2 = extrair(cultura2);

  if (!m1.size) { console.warn(`Nenhum registro para "${cultura1}".`); return null; }
  if (!m2.size) { console.warn(`Nenhum registro para "${cultura2}".`); return null; }

  console.log(`📊 ${cultura1}: ${m1.size} Cod2 | ${cultura2}: ${m2.size} Cod2`);

  const exclusivos1 = [];
  const exclusivos2 = [];
  const comuns      = [];

  for (const [cod2, alvo] of m1) {
    if (m2.has(cod2)) {
      comuns.push({ Cod2: cod2, [`Alvo_${cultura1}`]: alvo, [`Alvo_${cultura2}`]: m2.get(cod2) });
    } else {
      exclusivos1.push({ Cod2: cod2, Alvo: alvo });
    }
  }
  for (const [cod2, alvo] of m2) {
    if (!m1.has(cod2)) exclusivos2.push({ Cod2: cod2, Alvo: alvo });
  }

  // Se os dois conjuntos são idênticos → nada a mostrar de diferente
  if (!exclusivos1.length && !exclusivos2.length) {
    console.log(`✅ Tudo igual — "${cultura1}" e "${cultura2}" têm exatamente os mesmos Cod2 (${comuns.length}).`);
    return { exclusivos1: [], exclusivos2: [], comuns };
  }

  console.groupCollapsed(`🟦 Exclusivos de "${cultura1}" (${exclusivos1.length})`);
  if (exclusivos1.length) console.table(exclusivos1); else console.log("(nenhum)");
  console.groupEnd();

  console.groupCollapsed(`🟩 Exclusivos de "${cultura2}" (${exclusivos2.length})`);
  if (exclusivos2.length) console.table(exclusivos2); else console.log("(nenhum)");
  console.groupEnd();

  console.groupCollapsed(`🟨 Comuns às duas (${comuns.length})`);
  if (comuns.length) console.table(comuns); else console.log("(nenhum)");
  console.groupEnd();

  // CSV unificado pra colar no Excel/Sheets
  const esc = s => `"${String(s).replace(/"/g, '""')}"`;
  const linhas = [
    "Categoria,Cod2,Cultura,Alvo",
    ...exclusivos1.map(r => ["Exclusivo_1", r.Cod2, cultura1, r.Alvo].map(esc).join(",")),
    ...exclusivos2.map(r => ["Exclusivo_2", r.Cod2, cultura2, r.Alvo].map(esc).join(",")),
    ...comuns.map(r => ["Comum", r.Cod2, `${cultura1} | ${cultura2}`,
                        `${r[`Alvo_${cultura1}`]} | ${r[`Alvo_${cultura2}`]}`].map(esc).join(","))
  ];
  copy(linhas.join("\n"));
  console.log("📋 CSV unificado (com coluna Categoria) copiado pra área de transferência.");

  return { exclusivos1, exclusivos2, comuns };
})("Abacaxi", "Banana"); // ← troque as duas culturas aqui