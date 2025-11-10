document.querySelectorAll('#colunas-form input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        const colIndex = parseInt(checkbox.dataset.col);
        const tabela = document.querySelector('.tabela-dados');
        
        tabela.querySelectorAll('tr').forEach(row => {
            if (row.cells[colIndex]) {
                row.cells[colIndex].style.display = checkbox.checked ? '' : 'none';
            }
        });
    });
});

function updateFiltro() {
    const numero = document.getElementById('pesquisa_numero').value.trim().toLowerCase();
    const classificacao = document.getElementById('pesquisa_classificacao').value.trim().toLowerCase();
    const condicaoInput = document.getElementById('pesquisa_condicao').value.trim().toUpperCase();
    const porcentagem = document.getElementById('pesquisa_%concluida').value.trim().toLowerCase();

    const condicoesValidas = ["A", "B", "C", "SEMPRE"];
    const linhas = document.querySelectorAll('.tabela-dados tbody tr');

    linhas.forEach(linha => {
        const celulas = linha.getElementsByTagName("td");

        const matchNumero = celulas[0]?.textContent.toLowerCase().includes(numero);
        const matchClassificacao = celulas[1]?.textContent.toLowerCase().includes(classificacao);
        const matchCondicao = (condicaoInput === "" || (
            condicoesValidas.includes(condicaoInput) &&
            celulas[4]?.textContent.trim().toUpperCase() === condicaoInput
        ));
        const matchPorcentagem = porcentagem === "" || celulas[9]?.textContent.trim() === `${porcentagem}%`;

        const mostrar = matchNumero && matchClassificacao && matchCondicao && matchPorcentagem;
        linha.style.display = mostrar ? "" : "none";
    });
}

// Vincular os filtros
document.getElementById('pesquisa_numero').addEventListener('input', updateFiltro);
document.getElementById('pesquisa_classificacao').addEventListener('input', updateFiltro);
document.getElementById('pesquisa_condicao').addEventListener('input', updateFiltro);
document.getElementById('pesquisa_%concluida').addEventListener('input', updateFiltro);




