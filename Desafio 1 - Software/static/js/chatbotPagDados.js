/**
 * Função auxiliar para obter o(s) valor(es) selecionado(s) de um <select>.
 */
const getSelectValues = (id) => {
    const select = document.getElementById(id);
    if (!select) return [];

    let selecionados = Array.from(select.selectedOptions).map(opt => opt.value);

    if (id === "filtro-projeto") {
        if (selecionados.includes("")) {
            return Array.from(select.options)
                .map(opt => opt.value)
                .filter(v => v && v !== "__all__");
        }
        return selecionados;
    }

    return selecionados.filter(v => v !== "");
};

// ---- Função para separar texto da IA e o item solicitado ----
const extrairConteudoEMarcador = (textoCompleto, marcador = "#DOCUMENTO_SOLICITADO:") => {
    const index = textoCompleto.indexOf(marcador);

    if (index === -1) {
        return { mensagem: textoCompleto.trim(), item: null };
    }

    return {
        mensagem: textoCompleto.substring(0, index).trim(),
        item: textoCompleto.substring(index + marcador.length).trim() || null
    };
};

// Histórico
const mensagens = [
    { role: "system", content: "Você é um assistente útil e educado." }
];

let aguardandoResposta = false; // ⚠️ Flag para evitar envio múltiplo

// ---- Função de scroll centralizada ----
function scrollChat() {
    const chat = document.getElementById('chat');
    chat.scrollTop = chat.scrollHeight;
}

// ---- Digitando com scroll ----
function mostrarDigitando() {
    const chat = document.getElementById('chat');
    const div = document.createElement('div');
    div.className = 'message typing';
    div.id = 'digitando';
    div.innerHTML = `<span></span><span></span><span></span>`;
    chat.appendChild(div);
    scrollChat();
}

function removerDigitando() {
    const div = document.getElementById('digitando');
    if (div) div.remove();
}

// ---- Adiciona mensagem no chat com scroll ----
function adicionarMensagem(texto, tipo) {
    const chat = document.getElementById('chat');
    const div = document.createElement('div');
    div.className = `message ${tipo}`;

    if (tipo === 'bot') {
        div.innerHTML = `<span class="bot-msg-text">${texto}</span>`;
    } else {
        div.textContent = texto;
    }

    chat.appendChild(div);
    scrollChat();
}

// ---- Envio principal ----
function enviarFiltros() {
    if (aguardandoResposta) return; // Bloqueia envio múltiplo
    const input = document.getElementById('inputMsg');
    const texto = input.value.trim();
    if (!texto) return;

    aguardandoResposta = true;
    input.disabled = true; // Bloqueia input enquanto processa

    const filtros = {
        projetos: getSelectValues("filtro-projeto"),
        classificacao: getSelectValues("filtro-classificacao"),
        categoria: getSelectValues("filtro-categoria"),
        fase: getSelectValues("filtro-fase"),
        duracao: getSelectValues("filtro-duracao"),
    };

    adicionarMensagem(texto, 'user');
    mensagens.push({ role: "user", content: texto });
    input.value = "";

    mostrarDigitando();

    fetch("/chatbot_dados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filtros, pergunta_usuario: texto })
    })
    .then(res => res.json())
    .then(data => {
        removerDigitando();

        let msgFinal = data.mensagem || "⚠️ Nenhuma resposta do servidor.";
        if (data.resultado_como_fazer && data.resultado_como_fazer.trim() !== "") {
            msgFinal += `\n\nTrecho encontrado no '${data.nome_arquivo}':\n\n${data.resultado_como_fazer}`;
        }

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
        scrollChat();

        mensagens.push({ role: "assistant", content: msgFinal });

    })
    .catch(err => {
        removerDigitando();
        console.error("Erro na requisição:", err);
        adicionarMensagem("❌ Erro ao se comunicar com o servidor.", 'bot');
        scrollChat();
    })
    .finally(() => {
        aguardandoResposta = false;
        input.disabled = false;
        input.focus();
    });
}

// ---- Eventos ----
document.querySelectorAll("#filtro-projeto, #filtro-nome, #filtro-classificacao, #filtro-categoria, #filtro-fase, #filtro-duracao")
    .forEach(el => el.addEventListener("change", enviarFiltros));

document.addEventListener("DOMContentLoaded", enviarFiltros);

document.getElementById("inputMsg").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        enviarFiltros();
    }
});

// ---- Mensagem inicial ----
function mostrarMensagemInicial() {
    mostrarDigitando();
    setTimeout(() => {
        removerDigitando();
        const mensagemInicial = "Olá! Sou seu assistente :) Como posso ajudar?";
        adicionarMensagem(mensagemInicial, 'bot');
        mensagens.push({ role: "assistant", content: mensagemInicial });
    }, 500);
}

window.addEventListener('load', mostrarMensagemInicial);
