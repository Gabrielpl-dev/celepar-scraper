// ===== Extrator Cod2 por cultura — Agrotóxicos PR =====
// Cole no DevTools Console (F12) da página de listagem e rode.

(function extrair(cultura) {
  const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const alvo = norm(cultura);

  const linhas = [];
  document.querySelectorAll("tr").forEach(tr => {
    const tds = tr.querySelectorAll(":scope > td");
    if (tds.length < 4) return;

    const a = tds[0].querySelector("a");
    if (!a) return;

    const nomeCultura = a.textContent.trim();
    if (norm(nomeCultura) !== alvo) return;

    // Cod2 vem no onclick: fullScreen("linkea.asp?Cod=18&Cod1=2249&Cod2=566")
    const onclick = a.getAttribute("onclick") || "";
    const m = onclick.match(/Cod2=(\d+)/);
    if (!m) return;

    linhas.push({
      Cultura: nomeCultura,
      Cod2: m[1],
      Alvo: tds[2].textContent.trim()
    });
  });

  if (!linhas.length) {
    console.warn(`Nenhum registro para "${cultura}".`);
    return [];
  }

  console.table(linhas);
  console.log(`Total: ${linhas.length} registros`);

  // Copia CSV pra área de transferência (pronto pra colar no Excel/Sheets)
  const csv = ["Cultura,Cod2,Alvo",
    ...linhas.map(r => `"${r.Cultura}","${r.Cod2}","${r.Alvo.replace(/"/g,'""')}"`)
  ].join("\n");
  copy(csv);
  console.log("✅ CSV copiado pra área de transferência.");

  return linhas;
})("Abacaxi"); // ← troque a cultura aqui