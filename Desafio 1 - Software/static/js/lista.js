function atualizarListaArquivos() {
    fetch("/listar_arquivos")
        .then(res => res.json())
        .then(arquivos => {
            const listaProjetos = document.querySelector(".accordion-item:nth-of-type(1) .lista-arquivos");
            const listaPDFs = document.querySelector(".accordion-item:nth-of-type(2) .lista-arquivos");

            // Limpa as duas listas
            listaProjetos.innerHTML = "";
            listaPDFs.innerHTML = "";

            arquivos.forEach(arq => {
                const li = document.createElement("li");
                li.classList.add("item-arquivo");
                li.setAttribute("data-caminho", arq.caminho);

                let icone = "";
                if (arq.extensao === ".xlsx" || arq.extensao === ".pdf") {
                    icone = `<i class="fas fa-file-excel"></i>`;
                } else if (arq.extensao === ".pdf") {
                    icone = `<i class="fas fa-file-pdf"></i>`;
                } else {
                    icone = `<i class="fas fa-file"></i>`;
                }

                li.innerHTML = `
                    <div class="info-arquivo">
                        <div class="checkbox-wrapper">
                            <input type="checkbox" class="checkbox-arquivo" data-nome="${arq.nome}">
                        </div>
                        ${icone}
                        <span class="nome-arquivo">${arq.nome}</span>
                    </div>
                    <a class="btn-baixar" href="/download_arquivo/${encodeURIComponent(arq.caminho)}" download>Baixar</a>
                    <a class="btn-deletar-arquivo" data-caminho="${arq.caminho}" href="#">Deletar</a>
                `;

                // Adiciona o item à lista correspondente
                if (arq.extensao === ".pdf") {
                    listaPDFs.appendChild(li);
                } else {
                    listaProjetos.appendChild(li);
                }
            });

            // Reatribui evento de deletar
            document.querySelectorAll(".btn-deletar-arquivo").forEach(btn => {
                btn.addEventListener("click", function (e) {
                    e.preventDefault();
                    deletarArquivo(this.getAttribute("data-caminho"));
                });
            });
        })
        .catch(err => console.error("Erro ao atualizar lista:", err));
}

// Atualiza ao carregar a página
document.addEventListener("DOMContentLoaded", atualizarListaArquivos);
