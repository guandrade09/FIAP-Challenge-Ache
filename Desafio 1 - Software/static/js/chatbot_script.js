/**
 * Histórico de mensagens enviado ao servidor
 */
const mensagens = [
    { role: "system", content: "Você é um assistente útil e educado." }
];

let aguardandoResposta = false; // ⚠️ Flag para bloquear envio múltiplo

/**
 * Função para enviar mensagem ao servidor e processar a resposta
 */
function enviarMensagem() {
    if (aguardandoResposta) return; // Bloqueia envio se já houver uma mensagem em processamento

    const input = document.getElementById('inputMsg');
    const texto = input.value.trim();
    if (!texto) return;

    // Verifica arquivos selecionados
    const selecionados = [...document.querySelectorAll(".checkbox-arquivo:checked")].map(chk => ({
        nome: chk.dataset.nome,
        caminho: chk.closest(".item-arquivo").dataset.caminho
    }));

    if (selecionados.length === 0) {
        adicionarMensagem("⚠️ Você não selecionou nenhum arquivo para consulta!", "bot");
        return;
    }

    // Bloqueia input e marca que estamos aguardando resposta
    aguardandoResposta = true;
    input.disabled = true;

    adicionarMensagem(texto, 'user');
    mensagens.push({ role: "user", content: texto });
    input.value = "";

    localStorage.setItem("arquivosSelecionados", JSON.stringify(selecionados));
    mostrarDigitando();

    fetch("/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            mensagens: mensagens,
            arquivos: selecionados.map(a => a.caminho),
            nomesArquivos: selecionados.map(a => a.nome)
        })
    })
    .then(res => res.json())
    .then(data => {
        removerDigitando();

        console.log(`Status: ${data.status}\nMensagem: ${data.mensagem}\nItem: ${data.item}\n Trecho: ${data.resultado_como_fazer}\n Caminho: ${data.resultado_link}\nNome do arquivo: ${data.nome_arquivo}\nCodigo: ${data.codigo}`)

        let msgFinal = data.mensagem || "⚠️ Nenhuma resposta do servidor.";
        if (data.resultado_como_fazer && data.resultado_como_fazer.trim() !== "") {
            msgFinal += `\n\nTrecho encontrado no ${data.nome_arquivo}:\n\n${data.resultado_como_fazer}`;
        }

        // Cria balão do bot
        const chat = document.getElementById("chat");
        const div = document.createElement("div");
        div.className = "message bot";

        const p = document.createElement("p");
        p.classList.add("bot-text");
        p.textContent = msgFinal;
        div.appendChild(p);

        if (data.resultado_link) {
            const btnDownload = document.createElement("a");
            btnDownload.href = `/download_pdf?path=${encodeURIComponent(data.resultado_link)}`;
            btnDownload.target = "_blank";
            btnDownload.rel = "noopener noreferrer";
            btnDownload.textContent = `⬇️ Baixar ${data.nome_arquivo}`;
            btnDownload.classList.add("bot-download-button");
            div.appendChild(btnDownload);
        }

        chat.appendChild(div);
        chat.scrollTop = chat.scrollHeight;

        mensagens.push({ role: "assistant", content: msgFinal });

    })
    .catch(err => {
        removerDigitando();
        console.error("Erro na requisição:", err);
        adicionarMensagem("❌ Erro ao se comunicar com o servidor.", 'bot');
        chat.scrollTop = chat.scrollHeight;
    })
    .finally(() => {
        // Libera o envio novamente
        aguardandoResposta = false;
        input.disabled = false;
        input.focus();
    });
}

/**
 * Adiciona uma mensagem ao chat
 */
function adicionarMensagem(texto, tipo) {
    const chat = document.getElementById('chat');
    const div = document.createElement('div');
    div.className = `message ${tipo}`;

    if (tipo === 'bot') {
        div.innerHTML = texto;
    } else {
        div.textContent = texto;
    }

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

/**
 * Mensagem inicial automática
 */
function mostrarMensagemInicial() {
    mostrarDigitando();
    setTimeout(() => {
        removerDigitando();
        const mensagemInicial = "Olá! Eu sou seu assistente. Como posso ajudar você hoje?";
        adicionarMensagem(mensagemInicial, 'bot');
        mensagens.push({ role: "assistant", content: mensagemInicial });
    }, 500);
}

/**
 * Indicador "digitando..."
 */
function mostrarDigitando() {
    const chat = document.getElementById('chat');
    const div = document.createElement('div');
    div.className = 'message typing';
    div.id = 'digitando';
    div.innerHTML = `<span></span><span></span><span></span>`;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

function removerDigitando() {
    const div = document.getElementById('digitando');
    if (div) div.remove();
}

/**
 * Enviar com ENTER
 */
document.getElementById("inputMsg").addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        enviarMensagem();
    }
});

window.addEventListener('load', () => {
    mostrarMensagemInicial();
});
