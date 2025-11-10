document.addEventListener('DOMContentLoaded', () => {
    // Filtros
    const filtroNome = document.getElementById('filtro-nome');
    const filtroClassificacao = document.getElementById('filtro-classificacao');
    const filtroFase = document.getElementById('filtro-fase');
    const filtroCategoria = document.getElementById('filtro-categoria');
    const filtroProjeto = document.getElementById('filtro-projeto');
    const filtroDuracao = document.getElementById('filtro-duracao');
    const botoesCondicao = document.querySelectorAll('.btn.cond');
    const noResultsRow = document.getElementById('no-results-row');
    const filtroConclusaoText = document.getElementById('filtro-conclusao-text');
    const filtroConclusaoSlider = document.getElementById('filtro-conclusao-slider');
    const toggleConclusaoFiltro = document.getElementById('toggle-conclusao-filtro');

    // Gantt
    const ganttContainer = document.getElementById('ganttContainer');
    const modeBtn = document.getElementById('btn-mode');
    const modeDisplay = document.getElementById('gantt-mode-display');
    const container = document.getElementById('ganttContainer');
    const button = document.getElementById('fullscreen-btn');

    // Progress Box
    const progressBarMedia = document.querySelector('.progress-box .progress');
    const progressTextMedia = document.querySelector('.progress-text-media');

    let condicaoAtiva = "Todos";

    // Double Slider Ranger (filtro-conclusao)
    let sliderOne = document.getElementById("slider-1");
    let sliderTwo = document.getElementById("slider-2");
    let displayValOne = document.getElementById("range1");
    let displayValTwo = document.getElementById("range2");
    let sliderTrack = document.querySelector(".slider-track");
    let minGap = 0;

    window.filteredTasksData = window.tasksData || [];

    // Atualizar 1ª bolinha (filtro-conlusao)
    function slideOne(){
        if(parseInt(sliderTwo.value) - parseInt(sliderOne.value) <= minGap){
            sliderOne.value = parseInt(sliderTwo.value) - minGap;
        }
        displayValOne.textContent = sliderOne.value + "%";
        fillColor();
    }

    // Atualizar 2ª bolinha (filtro-conclusao)
    function slideTwo(){
        if(parseInt(sliderTwo.value) - parseInt(sliderOne.value) <= minGap){
            sliderTwo.value = parseInt(sliderOne.value) + minGap;
        }
        displayValTwo.textContent = sliderTwo.value + "%";
        fillColor();
    }

    // Atualizar a slider-tracker (filtro-conclusao)
    function fillColor(){
        let percent1 = sliderOne.value;
        let percent2 = sliderTwo.value;
        sliderTrack.style.background = `linear-gradient(to right, #dadae5 ${percent1}% , #e6007e ${percent1}% , #e6007e ${percent2}%, #dadae5 ${percent2}%)`;
    }

    // Função de média de progresso (progress box)
    function atualizarMediaProgresso() {
        const linhasTabela = document.querySelectorAll('.tabela-tarefas tbody tr.lista-dados');
        if (!linhasTabela || !progressBarMedia || !progressTextMedia) return;

        let soma = 0;
        let total = 0;

        linhasTabela.forEach(linha => {
            if (linha.style.display !== "none") {
                const celula = linha.cells[9];
                let valor = 0;

                const barraCelula = celula.querySelector('.table-progress-bar');
                if (barraCelula) {
                    valor = parseFloat(barraCelula.style.width.replace('%','')) || 0;
                } else {
                    valor = parseFloat(celula.textContent.trim().replace('%','')) || 0;
                }

                soma += valor;
                total++;
            }
        });

        const media = total > 0 ? Math.round(soma / total) : 0;

        progressBarMedia.style.width = media + '%';
        progressTextMedia.textContent = media + '%';

        window.conclusaoGeral = media; // Valor global da conclusão
    }

    // Função principal de filtros
    function aplicarFiltros() {
        const linhasTabela = document.querySelectorAll('.tabela-tarefas tbody tr.lista-dados');

        const termoNome = (filtroNome.value || "").trim().toLowerCase();
        const termoClassificacao = (filtroClassificacao.value || "").trim().toLowerCase();
        const termoFase = filtroFase.value || "";
        const termoCategoria = (filtroCategoria.value || "").trim().toLowerCase();
        const termoProjeto = (filtroProjeto.value || "__all__").trim().replace(/\.xlsx$/i,'').toLowerCase();
        const termoDuracao = filtroDuracao.value || "";
        const condicao = (condicaoAtiva || "Todos").toLowerCase();

        const isTextActive = filtroConclusaoText.style.display !== 'none';
        const termoConclusao = (filtroConclusaoText.value || "").trim().replace('%', '');
        const valorNumerico = parseFloat(termoConclusao);

        // Define a faixa de conclusão a ser usada no filtro (conclMin e conclMax)
        const conclMin = (isTextActive && !isNaN(valorNumerico) && valorNumerico >= 0 && valorNumerico <= 100)
            ? valorNumerico
            : (isTextActive ? 0 : (parseInt(sliderOne.value) || 0));
        const conclMax = (isTextActive && !isNaN(valorNumerico) && valorNumerico >= 0 && valorNumerico <= 100)
            ? valorNumerico
            : (isTextActive ? 100 : (parseInt(sliderTwo.value) || 100));

        let resultadosVisiveis = 0;
        let totalDuracao = 0;

        linhasTabela.forEach(linha => {
            const celulas = linha.cells;
            const nome = (celulas[5].textContent || "").trim().toLowerCase();
            const classificacao = (celulas[1].textContent || "").trim().toLowerCase();
            const categoria = (celulas[2].textContent || "").trim().toLowerCase();
            const fase = (celulas[3].textContent || "").trim();
            const condicaoLinha = (celulas[4].textContent || "").trim().toLowerCase();
            const projeto = ((linha.dataset.projeto || "").trim().replace(/\.xlsx$/i,'')).toLowerCase();
            const duracao = (celulas[6].textContent || "");
            const barra = celulas[9].querySelector('.table-progress-bar');

            let conclusao = barra ? parseFloat(barra.style.width.replace('%','')) : parseFloat(celulas[9].textContent.replace('%','')) || 0;

            const matchNome = nome.includes(termoNome);
            const matchClassificacao = classificacao.includes(termoClassificacao);
            const matchCategoria = termoCategoria === "" || categoria === termoCategoria;
            const matchFase = termoFase === "" || fase === termoFase;
            const matchCondicao = condicao === "todos" || condicaoLinha === condicao;
            const matchConclusao = conclusao >= conclMin && conclusao <= conclMax;
            const matchProjeto = termoProjeto === "__all__" || projeto.includes(termoProjeto);
            const matchDuracao = termoDuracao === "" || duracao === termoDuracao;

            const isMatch = matchNome && matchClassificacao && matchCategoria && matchFase && matchCondicao && matchConclusao && matchProjeto && matchDuracao;

            linha.style.display = isMatch ? "" : "none";

            if (isMatch) {
                resultadosVisiveis++;
                let diasRestantes = parseInt(duracao) || 0;
                if (conclusao > 0 && conclusao < 100) diasRestantes *= (1 - conclusao/100);
                if (conclusao === 100) diasRestantes = 0;
                totalDuracao += diasRestantes;
            }
        });

        noResultsRow.style.display = resultadosVisiveis === 0 ? "" : "none";

        // Atualiza progress box
        atualizarMediaProgresso();

        // Atualiza o dashboard
        const filteredTasks = window.tasksData.filter(task => {
            const taskNome = (task.nome || "").toLowerCase();
            const taskClassificacao = (task.classificacao || "").toLowerCase();
            const taskCategoria = (task.categoria || "").toLowerCase();
            const taskFase = task.fase || "";
            const taskCondicao = (task.condicao || "").toLowerCase();
            const taskConclusao = task.porcConcluida || 0;
            const taskProjeto = (task.projeto || "").replace(/\.xlsx$/i,'').toLowerCase();
            const taskDuracao = task.duracao || "";

            const matchNome = taskNome.includes(termoNome);
            const matchClassificacao = taskClassificacao.includes(termoClassificacao);
            const matchCategoria = termoCategoria === "" || taskCategoria === termoCategoria;
            const matchFase = termoFase === "" || taskFase === termoFase;
            const matchCondicao = condicao === "todos" || taskCondicao === condicao;

            // Usa as novas variáveis condicionais
            const matchConclusao = taskConclusao >= conclMin && taskConclusao <= conclMax;
            const matchProjeto = termoProjeto === "__all__" || taskProjeto.includes(termoProjeto);
            const matchDuracao = termoDuracao === "" || taskDuracao === termoDuracao;

            return matchNome && matchClassificacao && matchCategoria && matchFase && matchCondicao && matchConclusao && matchProjeto && matchDuracao;
        });

        const filteredTasksGantt = window.tasksData.filter(task => {
            const taskProjeto = (task.projeto || "").replace(/\.xlsx$/i,'').toLowerCase();
            const matchProjeto = termoProjeto === "__all__" || taskProjeto.includes(termoProjeto);
            
            return matchProjeto;
        });

        window.filteredTasksData = filteredTasks;

        //Chama as funções do dashboard.js com dados filtrados
        updateDonutChart(filteredTasks);
        updatePhaseProgress(filteredTasks);
        updateNextTask(filteredTasks);
        updatePrevision(filteredTasks);
        updateSumDuration(filteredTasks);
        updateGantt(filteredTasksGantt, currentMode);
    }

    // Eventos dos filtros
    filtroNome.addEventListener('input', aplicarFiltros);
    filtroClassificacao.addEventListener('input', aplicarFiltros);
    filtroFase.addEventListener('change', aplicarFiltros);
    filtroCategoria.addEventListener('change', aplicarFiltros);
    filtroProjeto.addEventListener('change', aplicarFiltros);
    filtroDuracao.addEventListener('change', aplicarFiltros);
    filtroConclusaoText.addEventListener('input', aplicarFiltros);
    toggleConclusaoFiltro.addEventListener('click', toggleFiltroConclusao);

    // Eventos de condição
    botoesCondicao.forEach(botao => {
        botao.addEventListener('click', () => {
            botoesCondicao.forEach(b => b.classList.remove('ativo'));
            botao.classList.add('ativo');
            condicaoAtiva = botao.dataset.condicao;
            aplicarFiltros();
        });
    });

    // Eventos dos sliders (filtro-conclusao)
    sliderOne.addEventListener('input', () => { slideOne(); aplicarFiltros(); });
    sliderTwo.addEventListener('input', () => { slideTwo(); aplicarFiltros(); });

    // Inicialização (filtro-conclusao)
    slideOne();
    slideTwo();
    aplicarFiltros();

    // Exportar
    document.getElementById('btn-exportar').addEventListener('click', () => {
        const dadosSelecionados = [];
        document.querySelectorAll('.tabela-tarefas tbody tr.lista-dados').forEach(linha => {
            if (linha.style.display !== "none") {
                const celulas = Array.from(linha.cells).map(c => c.textContent.trim());
                dadosSelecionados.push(celulas);
            }
        });

        fetch('/gerar_exportar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dados: dadosSelecionados })
        })

        .then(response => {
            if (!response.ok) throw new Error("Erro ao exportar Excel");
            return response.blob();
        })

        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "tarefas_filtradas.xlsx";
            document.body.appendChild(a);
            a.click();
            a.remove();
        })
        .catch(err => console.error("Erro:", err));
    });

    window.isGanttFullscreen = false;
    
    //Funções para tela cheia
    if (button && container) {
        button.addEventListener('click', () => {
            console.log('Clicado');
            // Verifica se algum elemento está em modo tela cheia
            if (document.fullscreenElement) {
                // Se estiver em tela cheia, sai do modo
                document.exitFullscreen();
            } else {
                if (container.requestFullscreen) {
                    container.requestFullscreen();
                } else if (container.mozRequestFullScreen) { /* Firefox */
                    container.mozRequestFullScreen();
                } else if (container.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
                    container.webkitRequestFullscreen();
                } else if (container.msRequestFullscreen) { /* IE/Edge */
                    container.msRequestFullscreen();
                }
            }
        });

        if (modeBtn && modeDisplay) {
            modeBtn.addEventListener('click', () => {
                // Alterna o modo
                window.currentMode = window.currentMode === 'general' ? 'sequential' : 'general';
                
                // Atualiza o texto de exibição
                modeDisplay.textContent = window.currentMode === 'general' ? 'Modo Geral' : 'Modo Ordenado';

                // Atualiza o gráfico com o novo modo
                aplicarFiltros();
            });
        }

        // Monitora a mudança de estado de tela cheia
        const fullscreenChangeHandler = () => {
            // 1. Atualiza o estado
            window.isGanttFullscreen = document.fullscreenElement === container;
            
            console.log("Tela Cheia: Mudança de estado detectada.");
            console.log("window.isGanttFullscreen (após atualização):", window.isGanttFullscreen);
            
            aplicarFiltros();
        };

        document.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement === container) {
                button.textContent = ' ⛋ ';
            } else {
                button.textContent = ' ⛶ ';
            }
        }); 

        document.addEventListener('fullscreenchange', fullscreenChangeHandler);
        document.addEventListener('mozfullscreenchange', fullscreenChangeHandler);
        document.addEventListener('webkitfullscreenchange', fullscreenChangeHandler);
        document.addEventListener('msfullscreenchange', fullscreenChangeHandler);
    }

    function toggleFiltroConclusao() {
        const filtroConclusaoText = document.getElementById('filtro-conclusao-text');
        const filtroConclusaoSlider = document.getElementById('filtro-conclusao-slider');
        const toggleTextSpan = document.getElementById('toggle-text');
        const sliderOne = document.getElementById("slider-1");
        const sliderTwo = document.getElementById("slider-2");

        const isTextActive = filtroConclusaoText.style.display !== 'none';

        if (isTextActive) {
            // Mudar para Double Slider
            filtroConclusaoText.style.display = 'none';
            filtroConclusaoSlider.style.display = 'flex';
            toggleTextSpan.textContent = "Texto";
            filtroConclusaoText.value = '';
        } else {
            // Mudar para Text Input
            filtroConclusaoText.style.display = 'block';
            filtroConclusaoSlider.style.display = 'none';
            toggleTextSpan.textContent = "Slider";

            // Reinicia os valores do slider para a faixa total (0-100)
            sliderOne.value = 0;
            sliderTwo.value = 100;

            // Chama as funções para atualizar visualmente
            slideOne();
            slideTwo();
        }

        // Aplica os filtros para recalcular com o filtro ativo
        aplicarFiltros();
    } 
});

// Botões das Abas
const tabButtons = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");

tabButtons.forEach(button => {
    button.addEventListener("click", () => {
        // Remove active de todos
        tabButtons.forEach(btn => btn.classList.remove("active"));
        tabContents.forEach(content => content.classList.remove("active"));

        // Ativa o clicado
        button.classList.add("active");
        document.getElementById(button.dataset.tab).classList.add("active");

        aplicarFiltros();
    });
});