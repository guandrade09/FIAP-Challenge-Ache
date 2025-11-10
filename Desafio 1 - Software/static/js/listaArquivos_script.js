// Atribui evento de clique em cada checkbox
document.querySelectorAll(".checkbox-arquivo").forEach(checkbox => {
    checkbox.addEventListener("change", atualizarSelecao);
});

// Atualiza a seleção e envia para o chat
function atualizarSelecao() {
    const selecionados = [];

    document.querySelectorAll(".checkbox-arquivo:checked").forEach(checkbox => {
        const nome = checkbox.dataset.nome;
        const caminho = checkbox.closest("li").dataset.caminho;
        selecionados.push({ nome, caminho });
    });

    // 🔄 Salva os arquivos selecionados no localStorage
    localStorage.setItem("arquivosSelecionados", JSON.stringify(selecionados));

    // 🧹 Remove a última mensagem enviada pelo bot antes de mostrar a nova
    removerUltimaMensagemBot();

    // 🔒 Verifica se há PDFs selecionados e bloqueia/desbloqueia o botão de Excel
    const temPDF = selecionados.some(a => a.nome.toLowerCase().endsWith(".pdf"));
    bloquearBotaoExcel(temPDF);

    // 💬 Atualiza mensagem do bot conforme a seleção
    if (selecionados.length === 0) {
        adicionarMensagem("Nenhum arquivo selecionado.", "bot");
    } else if (selecionados.length === 1) {
        adicionarMensagem(`📄 Arquivo selecionado: ${selecionados[0].nome}`, "bot");
    } else {
        const lista = selecionados.map((a, i) => `📄 ${i + 1}. ${a.nome}`).join("\n");
        adicionarMensagem(`📁 Múltiplos arquivos selecionados:\n${lista}`, "bot");
    }

    /*console.log("Arquivos selecionados:", selecionados);*/
}

// ✅ Seleciona apenas checkboxes das abas abertas (accordion ativo)
document.getElementById("btn-todos").addEventListener("click", () => {
    const ativos = document.querySelectorAll(".accordion-item.ativo .checkbox-arquivo");
    if (ativos.length === 0) return; // Nenhuma aba aberta

    ativos.forEach(checkbox => {
        checkbox.checked = true;
    });
    atualizarSelecao();
});

// ✅ Remove todas as marcações (independente da aba)
document.getElementById("btn-remover-marcacoes").addEventListener("click", () => {
    document.querySelectorAll(".checkbox-arquivo").forEach(checkbox => {
        checkbox.checked = false;
    });
    atualizarSelecao();
});

// Clique no botão para gerar Excel
document.getElementById("btn-gerar-excel").addEventListener("click", function () {
    // Se o botão estiver bloqueado, não faz nada
    if (this.disabled) return;

    // Pega todos os arquivos selecionados (com extensão)
    const selecionados = [];
    document.querySelectorAll(".checkbox-arquivo:checked").forEach(chk => {
        const caminho = chk.closest(".item-arquivo").dataset.caminho; // 👈 pega o caminho completo
        if (caminho) selecionados.push(caminho);
    });

    if (selecionados.length === 0) {
        alert("Selecione pelo menos um arquivo para gerar o Excel.");
        return;
    }

    fetch("/gerar_excel", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ arquivos: selecionados })
    })
    .then(res => res.json())
    .then(data => {
        console.log("Resposta do servidor:", data);
        if (data.status === "sucesso") {
            window.location.href = data.url_download; // Força o download
        } else {
            alert("Erro: " + data.mensagem);
        }
    })
    .catch(err => {
        console.error("Erro ao enviar para Flask:", err);
        alert("Erro ao gerar o Excel.");
    });
});

// ✅ Função do accordion — mantém a lógica de abrir/fechar
function toggleAccordion(header) {
    const item = header.parentElement;
    item.classList.toggle("ativo");
    const seta = header.querySelector(".seta");
    seta.classList.toggle("girar");
}

// 🧩 --- FUNÇÕES ADICIONADAS ABAIXO ---

// 🔒 Função que bloqueia ou desbloqueia o botão Gerar Excel
function bloquearBotaoExcel(bloquear) {
    const btnExcel = document.getElementById("btn-gerar-excel");
    if (!btnExcel) return;

    if (bloquear) {
        // Bloqueia o botão com cadeado
        btnExcel.disabled = true;
        btnExcel.innerHTML = `<i class="fa-solid fa-lock"></i> Bloqueado para PDFs`;
        btnExcel.classList.add("bloqueado");
    } else {
        // Restaura o botão normalmente
        btnExcel.disabled = false;
        btnExcel.innerHTML = `<i class="fa-solid fa-file-excel"></i> Gerar Excel`;
        btnExcel.classList.remove("bloqueado");
    }
}

// 🧹 Função que remove a última mensagem enviada pelo bot
function removerUltimaMensagemBot() {
    const mensagens = document.querySelectorAll(".mensagem.bot");
    if (mensagens.length > 0) {
        const ultimaMensagem = mensagens[mensagens.length - 1];
        ultimaMensagem.style.transition = "opacity 0.3s ease";
        ultimaMensagem.style.opacity = "0";
        setTimeout(() => ultimaMensagem.remove(), 300);
    }
}
    