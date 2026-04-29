// 1. Define o que você quer buscar
var alvo = "BELURE";
var achou = false;

// Função que executa a sua lógica de busca
function realizarBusca(contexto) {
    var linhas = contexto.querySelectorAll('tr');
    
    linhas.forEach(linha => { 
        // 2. Verifica se o texto da linha tem o seu alvo 
        if (linha.innerText.toUpperCase().includes(alvo.toUpperCase())) { 
            achou = true;

            // 3. Pega a cor direto da tag <font>
            var fontTag = linha.querySelector('font'); 
            var corHTML = fontTag ? fontTag.getAttribute('color') : "Não encontrada";

            // Traduz a cor para ficar fácil de ler
            var status = (corHTML === "red") ? "❌ VERMELHO (Tóxico)" : 
                         (corHTML === "green") ? "✅ VERDE (Seguro)" : 
                         "⚪ " + corHTML;

            console.log("PRODUTO: " + linha.innerText.trim());
            console.log("STATUS:  " + status); 
            console.log("-----------------------------------");
        }
    });
}

// --- EXECUÇÃO ---

// Primeiro tenta buscar na página principal
realizarBusca(document);

// Depois busca dentro de todos os frames (o segredo para esse site!)
for (var i = 0; i < window.frames.length; i++) {
    try {
        realizarBusca(window.frames[i].document);
    } catch (e) {
        // Ignora frames protegidos por segurança
    }
}

if (!achou) { 
    console.log("Nenhum produto com '" + alvo + "' foi encontrado nesta página."); 
}
