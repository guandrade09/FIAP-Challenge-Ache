/**
 * Função auxiliar para obter o(s) valor(es) selecionado(s) de um <select>.
 * Lida com o caso especial de 'Todos os Projetos'.
 * @param {string} id - O ID do elemento select.
 * @returns {Array<string> | string} O valor ou a lista de valores selecionados.
 */
const getSelectedValues = (id) => {
    const select = document.getElementById(id);
    if (!select) return [];

    let selecionados = Array.from(select.selectedOptions).map(opt => opt.value);

    // Lógica especial para 'filtro-projeto':
    // Se 'Todos os Projetos' ("") estiver selecionado, envia a lista de TODOS os projetos reais.
    if (id === "filtro-projeto") {
        if (selecionados.includes("")) {
            // Retorna a lista de todos os projetos (exceto o valor vazio)
            return Array.from(select.options)
                .map(opt => opt.value)
                .filter(v => v && v !== "");
        }
        // Retorna o(s) projeto(s) específico(s) selecionado(s)
        return selecionados;
    }
    // Para os demais filtros, apenas retornamos os valores selecionados (excluindo o "")
    return selecionados.filter(v => v !== "");
};

/**
 * Retorna os valores de projeto a serem usados para a filtragem local nos gráficos.
 * Se "Todos os Projetos" (value="") estiver selecionado, retorna [].
 * Se todos os projetos reais estiverem selecionados, retorna [].
 * Se projetos específicos estiverem selecionados, retorna a lista deles.
 * @returns {Array<string>} A lista de projetos a serem filtrados (vazia para "Todos").
 */
const getSelectedProjectsForLocalFilter = () => {
    const select = document.getElementById("filtro-projeto");
    if (!select) return [];

    let selecionados = Array.from(select.selectedOptions).map(opt => opt.value);
    
    // Lista de todos os valores de projetos (excluindo "")
    const todosProjetosReais = Array.from(select.options)
        .map(opt => opt.value)
        .filter(v => v !== "");
    
    // Se "Todos os Projetos" (value="") estiver na lista de selecionados,
    // OU se o número de projetos reais selecionados for igual ao total de projetos reais,
    // Tratamos como "Todos os Projetos".
    if (selecionados.includes("") || (selecionados.length === todosProjetosReais.length && todosProjetosReais.every(p => selecionados.includes(p)))) {
        return []; // Retorna lista vazia, que significa "Todos" no applyFiltersToCharts
    }

    return selecionados.filter(v => v !== ""); // Retorna os projetos específicos selecionados
};


/**
 * Envia os filtros para o backend (Flask) via AJAX e recebe as opções de volta.
 */
function enviarFiltros() {
    const filtros = {};

    // 1. Guarda os valores atualmente selecionados (antes de enviar o request)
    // Isso será usado para tentar manter a seleção após a atualização das opções.
    const selectedProjeto = getSelectedValues("filtro-projeto");
    const selectedClassificacao = getSelectedValues("filtro-classificacao");
    const selectedCategoria = getSelectedValues("filtro-categoria");
    const selectedFase = getSelectedValues("filtro-fase");
    const selectedDuracao = getSelectedValues("filtro-duracao");
    
    // 2. Monta o objeto de filtros a ser enviado
    filtros.projetos = selectedProjeto; // Vai para o backend como Array de nomes de arquivos ou Array de 1 nome.
    filtros.nome = document.getElementById("filtro-nome").value || "";
    filtros.classificacao = selectedClassificacao; 
    filtros.categoria = selectedCategoria;
    filtros.fase = selectedFase;
    filtros.duracao = selectedDuracao;
    
    // Conclusão (range)
    filtros.conclusao_min = document.getElementById("slider-1").value;
    filtros.conclusao_max = document.getElementById("slider-2").value;

    // 3. Envia tudo para o backend
    fetch("/arquivos_selecionados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filtros)
    })
    .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.mensagem || "Erro no servidor");

        console.log("Precisa de correção !-> /atualizaSelecao.js ");
        
        // 4. ATUALIZAÇÃO DOS FILTROS (OPÇÕES)
        if (data.opcoes) {
            // As opções do projeto geralmente não precisam ser atualizadas, mas as outras sim.
            atualizarSelect("filtro-classificacao", data.opcoes.classificacao, "Todas as Classificações", selectedClassificacao);
            atualizarSelect("filtro-categoria", data.opcoes.categoria, "Todas as Categorias", selectedCategoria);
            atualizarSelect("filtro-fase", data.opcoes.fase, "Todas as Fases", selectedFase);
            atualizarSelect("filtro-duracao", data.opcoes.duracao, "Todas as Durações", selectedDuracao);
        }
        
        // TODO: Chamar a função de atualização da tabela principal de dados aqui.
        // Exemplo: atualizarTabela(data.tarefas);

    })
    .catch(error => {
        console.error("Erro:", error);
        // Exibe mensagem de erro (se você tiver um elemento com id="status")
        const statusElement = document.getElementById("status"); 
        if(statusElement) {
             statusElement.innerHTML = `<p style="color:red;">❌ Falha: ${error.message}</p>`;
        }
       
    });
}

/**
 * Função auxiliar para atualizar as opções de um select, mantendo a seleção se a opção existir.
 * @param {string} id - ID do select.
 * @param {Array<string>} valores - Novos valores de opção.
 * @param {string} placeholder - Texto da primeira opção ("Todos...").
 * @param {Array<string>} valoresAtuais - Valores que estavam selecionados (Array de strings).
 */
function atualizarSelect(id, valores, placeholder, valoresAtuais) {
    const select = document.getElementById(id);
    if (!select) return;

    select.innerHTML = ""; // limpa
    const valoresAtuaisSet = new Set(valoresAtuais);
    let selecaoMantida = false;
    
    // 1. Adiciona a opção inicial ("Todos...")
    const optInicial = document.createElement("option");
    optInicial.value = "";
    optInicial.textContent = placeholder;
    
    // Se 'Todos' era a única seleção, ou se nenhuma seleção válida foi mantida.
    if (valoresAtuais.length === 0) { 
        optInicial.selected = true; 
        selecaoMantida = true;
    }
    select.appendChild(optInicial);

    // 2. Adiciona as novas opções
    valores.forEach(v => {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v;
        
        // Tenta manter a seleção
        if (valoresAtuaisSet.has(v)) {
            opt.selected = true;
            selecaoMantida = true;
        }
        select.appendChild(opt);
    });
    
    // 3. Garante que 'Todos' fique selecionado se não foi possível manter nenhuma das seleções anteriores
    if (!selecaoMantida && select.options.length > 0) {
        select.options[0].selected = true; // Seleciona o placeholder
    }
}

// --- CONFIGURAÇÃO DE EVENT LISTENERS ---

// dispara sempre que algum filtro mudar
document.querySelectorAll("#filtro-projeto, #filtro-nome, #filtro-classificacao, #filtro-categoria, #filtro-fase, #filtro-duracao, #slider-1, #slider-2")
    .forEach(el => el.addEventListener("change", enviarFiltros));

// dispara automaticamente quando a página carregar
document.addEventListener("DOMContentLoaded", enviarFiltros);