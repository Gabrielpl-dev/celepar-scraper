// ===== Busca por Cod2 — Agrotóxicos PR =====
// Cole no DevTools Console (F12) da página de listagem e rode.

(function buscarPorCod2(cod2Alvo) {
  const alvo = String(cod2Alvo).trim();
  const resultados = [];

  document.querySelectorAll("tr").forEach(tr => {
    const tds = tr.querySelectorAll(":scope > td");
    if (tds.length < 4) return;

    const a = tds[0].querySelector("a");
    if (!a) return;

    const onclick = a.getAttribute("onclick") || "";
    const m = onclick.match(/Cod2=(\d+)/);
    if (!m || m[1] !== alvo) return;

    resultados.push({
      Cultura: a.textContent.trim(),
      Cod2:    m[1],
      Alvo:    tds[2].textContent.trim()
    });
  });

  if (!resultados.length) {
    console.warn(`⚠️ Nenhuma cultura encontrada com Cod2 = ${alvo}.`);
    return [];
  }

  // Culturas únicas (sem duplicatas por nome)
  const unicas = [...new Map(resultados.map(r => [r.Cultura, r])).values()];

  console.log(`\n🔎 Cod2 = ${alvo} → encontrado em ${unicas.length} cultura(s):\n`);
  console.table(unicas);

  // CSV para Excel/Sheets
  const esc = s => `"${String(s).replace(/"/g, '""')}"`;
  const csv = [
    "Cod2,Cultura,Alvo",
    ...unicas.map(r => [r.Cod2, r.Cultura, r.Alvo].map(esc).join(","))
  ].join("\n");
  copy(csv);
  console.log("📋 CSV copiado para a área de transferência.");

  return unicas;
})(566); // ← troque o Cod2 aqui