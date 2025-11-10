// Variáveis Globais
window.tasksData = [];
window.graficoRosca = null;
window.graficoDuracoes = null;
window.graficoGantt = null;

document.addEventListener('DOMContentLoaded', function() {
    let tasksData = [];

    fetch('/api/dashboard-data')
        .then(response => {
            if (!response.ok) throw new Error('Falha ao carregar os dados');
            return response.json();
        })
        .then(data => {
            window.tasksData = data;
            updateDonutChart(data);
            updateNextTask(data);
            updatePhaseProgress(data);
            updatePrevision(data);
            updateSumDuration(data); 
            updateGantt(data);  
        })
        .catch(error => console.error('Erro:', error));
});

// Função global que lê os filtros do DOM, cria filteredTasks e atualiza todos os widgets
window.applyFiltersToCharts = function() {
    const tasks = window.tasksData || [];

    const termoNome = (document.getElementById('filtro-nome')?.value || '').trim().toLowerCase();
    const termoClassificacao = (document.getElementById('filtro-classificacao')?.value || '').trim().toLowerCase();
    const termoFase = (document.getElementById('filtro-fase')?.value || '').trim();
    const termoCategoria = (document.getElementById('filtro-categoria')?.value || '').trim().toLowerCase();
    const termoProjeto = (document.getElementById('filtro-projeto')?.value || '').trim().replace('.xlsx', '').toLowerCase();
    const termoDuracao = (document.getElementById('filtro-duracao')?.value || '').trim();

    // Condição ativa
    const condBtn = document.querySelector('.btn.cond.ativo');
    const condicaoAtiva = condBtn ? (condBtn.dataset.condicao || 'Todos') : 'Todos';

    // Obtém valores dos sliders de conclusão
    const conclMin = parseInt(document.getElementById('slider-1')?.value) || 0;
    const conclMax = parseInt(document.getElementById('slider-2')?.value) || 100;

    const filtered = tasks.filter(task => {
        const nome = (task.nome || '').toString().toLowerCase();
        const classificacao = (task.classificacao || '').toString().toLowerCase();
        const categoria = (task.categoria || '').toString().toLowerCase();
        const fase = (task.fase || '').toString();
        const conclusao = (task.porcConcluida !== undefined && task.porcConcluida !== null) ? Number(task.porcConcluida) : 0;
        const projeto = (task.projeto || "").replace('.xlsx', '').toLowerCase();
        const duracao = (task.duracao || '').toString();

        const matchNome = nome.includes(termoNome);
        const matchClassificacao = classificacao.includes(termoClassificacao);
        const matchCategoria = termoCategoria === "" || categoria === termoCategoria;
        const matchFase = termoFase === "" || fase === termoFase;
        const matchCondicao = condicaoAtiva === "Todos" || fase === condicaoAtiva || (task.condicao && task.condicao === condicaoAtiva);
        const matchConclusao = conclusao >= conclMin && conclusao <= conclMax;
        const matchProjeto = termoProjeto === "" || projeto === termoProjeto;
        const matchDuracao = termoDuracao === "" || duracao === termoDuracao;

        return matchNome && matchClassificacao && matchCategoria && matchFase && matchCondicao && matchConclusao && matchProjeto && matchDuracao;
    });

    // Atualiza os KPIs usando os dados filtrados
    updateDonutChart(filtered);
    updatePhaseProgress(filtered);
    updateNextTask(filtered);
    updatePrevision(filtered);
    updateSumDuration(filtered);
    updateGantt(filtered);
};

// Texto no centro do gráfico de rosca do "Tarefas Concluídas"
const centerTextPlugin = {
    id: 'centerText',
    beforeDraw: function(chart) {
        if (chart.options.elements.center) {
            const ctx = chart.ctx;
            const totalTasks = chart.data.datasets[0].data.reduce((sum, value) => sum + value, 0);
            const completedTasks = chart.data.datasets[0].data[0];
            const percentage = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(2) : 0;
            const text = percentage + '%';

            ctx.font = 'bold 24px sans-serif'; 
            ctx.fillStyle = '#333';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
            const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;

            ctx.fillText(text, centerX, centerY);
        }
    }
};

// Atualiza o gráfico de rosca do "Tarefas Concluídas"
function updateDonutChart(tasks) {

    const completedTasks = tasks.filter(task => task.porcConcluida === 100).length;
    const inProgressTasks = tasks.filter(task => task.porcConcluida > 0 && task.porcConcluida < 100).length;
    const pendingTasks = tasks.filter(task => task.porcConcluida === 0).length;

    const data = {
        labels: ['Concluídas', 'Em Andamento', 'Não iniciada'],
        datasets: [{
            data: [completedTasks, inProgressTasks, pendingTasks],
            backgroundColor: ['#E6007E', '#F380BF', '#cbd5e1'],
            hoverOffset: 4
        }]
    };
    
    const chartSection = document.querySelector('.tarefas_concluidas');
    chartSection.innerHTML = `
        <h1 class="titulo">Tarefas concluídas</h1>
        <canvas class="grafico_rosca" id="grafico_rosca"></canvas>
    `;

    const ctx = document.getElementById('grafico_rosca').getContext('2d');

    // Destroi o gráfico anterior
    if (window.graficoRosca) {
        window.graficoRosca.destroy();
    }

    // Cria um gráfico
    window.graficoRosca = new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        //Balãozinho mostarndo quantidade e porcentagem das seções
                        label: function(context) { 
                            let label = context.label || '';
                            let dataset = context.dataset;
                            let value = dataset.data[context.dataIndex];

                            let total = dataset.data.reduce((a, b) => a + b, 0);

                            let percentage = ((value / total) * 100).toFixed(1) + '%';

                            return label + ': ' + value + ' (' + percentage + ')';
                        }
                    }
                }
            },
            elements: { center: {} }
        },
        plugins: [centerTextPlugin] //Texto no meio do gráfico
    });

}

// Atualiza o "Próxima tarefa"
function updateNextTask(tasks) {
    let tasksInProgress = tasks.filter(task => task.porcConcluida < 100);
    if (tasksInProgress.length > 0) {
        const nextTask = tasksInProgress.reduce((prev, current) => {
            if (current.porcConcluida > prev.porcConcluida) return current;
            if (current.porcConcluida === prev.porcConcluida) {
                if (parseInt(current.numero) < parseInt(prev.numero)) return current;
            }
            return prev;
        });
        const cardElement = document.getElementById('card-cinza');
        cardElement.innerHTML = `
            <p><strong>Numero:</strong> ${nextTask.numero}</p>
            <p><strong>Classificação:</strong> ${nextTask.classificacao}</p>
            <p><strong>Fase:</strong> ${nextTask.fase}</p>
            <p><strong>Condição:</strong> ${nextTask.condicao}</p>
            <p><strong>Nome:</strong> ${nextTask.nome}</p>
            <p><strong>Duração:</strong> ${nextTask.duracao}</p>
            <p><strong>Progresso:</strong> ${nextTask.porcConcluida}%</p>
        `;
    } else {
        document.getElementById('card-cinza').innerHTML = '<p>Nenhuma tarefa em andamento nesta fase.</p>';
    }
}

// Atualiza o KPI "Fases"
function updatePhaseProgress(tasks) {
    if (tasks.length === 0) return;
    const fasesData = tasks.reduce((acc, task) => {
        if (!acc[task.fase]) {
            acc[task.fase] = { total: 0, count: 0 };
        }
        acc[task.fase].total += task.porcConcluida;
        acc[task.fase].count += 1;
        return acc;
    }, {});
    document.querySelectorAll('.fase-container').forEach(container => {
        const faseNome = container.getAttribute('data-fase');
        const barra = container.querySelector('.barra-preenchida');
        const label = container.querySelector('.progress-label');
        let porcentagem = 0;
        if (fasesData[faseNome] && fasesData[faseNome].count > 0) {
            porcentagem = (fasesData[faseNome].total / fasesData[faseNome].count).toFixed(2);
        }
        barra.style.width = `${porcentagem}%`;
        label.textContent = `${porcentagem}%`;
    });
}

let modoPrevisao = "filtrado"; // padrão: seta esquerda

function toggleArrowButton() {
    if (modoPrevisao === "filtrado") {
        modoPrevisao = "geral";
    } else {
        modoPrevisao = "filtrado";
    }

    // Define qual botão deve estar ativo
    const activeId = modoPrevisao === "filtrado" ? "arrow-btn-left" : "arrow-btn-right";
    const text = modoPrevisao === "filtrado" ? "Previsão" : "Visão Geral";

    // Aplica as mudanças na interface
    setActiveButton(activeId);
    document.getElementById("tipo-previsao").textContent = text;
    window.applyFiltersToCharts(); // 🔄 Usa os filtros
}

function setActiveButton(id) {
    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.remove("nav-btn-active");
    });
    const activeBtn = document.getElementById(id);
    if(activeBtn) activeBtn.classList.add("nav-btn-active");
}

setActiveButton("arrow-btn-left");
document.getElementById("tipo-previsao").textContent = "Previsão";

document.getElementById("arrow-btn-left").addEventListener("click", toggleArrowButton);
document.getElementById("arrow-btn-right").addEventListener("click", toggleArrowButton);

function updatePrevision(data) {
    let totalDias = 0;

    data.forEach(task => {
        const duracao = parseInt(task.duracao);

        if (modoPrevisao === "filtrado") {
            if (task.porcConcluida === 100) return;
            const restante = (1 - task.porcConcluida / 100) * duracao;
            totalDias += restante;
        } else {
            totalDias += duracao; // geral (ignora filtro de %)
        }
    });

    totalDias = Math.ceil(totalDias);

    // Converte em anos/meses/dias
    const anos = Math.floor(totalDias / 365);
    const meses = Math.floor((totalDias % 365) / 30);
    const dias = totalDias - anos * 365 - meses * 30;

    const spanDias = document.querySelector('.previsao-dias');
    let textoDias = '';
    if (anos > 0) textoDias += anos + ' ano' + (anos > 1 ? 's ' : ' ');
    if (meses > 0) textoDias += meses + ' mês' + (meses > 1 ? 'es ' : ' ');
    if (dias > 0 || textoDias === '') textoDias += dias + ' dia' + (dias > 1 ? 's' : '');
    spanDias.textContent = textoDias;

    // Data final
    const hoje = new Date();
    const previsao = new Date();
    previsao.setDate(hoje.getDate() + totalDias);

    const dia = String(previsao.getDate()).padStart(2, '0');
    const mes = String(previsao.getMonth() + 1).padStart(2, '0');
    const ano = previsao.getFullYear();

    document.querySelector('.previsao-data').textContent = `${dia}/${mes}/${ano}`;
}

// Atualiza gráfico
function updateSumDuration(data) {
    const contagem = {};

    data.forEach(task => {
        if (modoPrevisao === "filtrado") {
            if (task.porcConcluida < 100) {
                const duracao = task.duracao;
                if (!contagem[duracao]) contagem[duracao] = 0;
                contagem[duracao]++;
            }
        } else {
            // geral (considera todas as tarefas)
            const duracao = task.duracao;
            if (!contagem[duracao]) contagem[duracao] = 0;
            contagem[duracao]++;
        }
    });

    const duracoes = Object.keys(contagem).sort((a,b) => parseInt(a) - parseInt(b));
    const valores = duracoes.map(d => contagem[d]);

    const cores = ['#F596CA', '#F062AF', '#EA2D94', '#E80F86', '#D30978', '#3b82f6', '#10b981'];
    const backgroundColors = duracoes.map((_, index) => cores[index % cores.length]);

    const ctx = document.getElementById('graficoDuracoes').getContext('2d');
    if (window.graficoDuracoes) window.graficoDuracoes.destroy();

    window.graficoDuracoes = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: duracoes,
            datasets: [{
                label: modoPrevisao === "filtrado" 
                    ? 'Tarefas (incompletas)' 
                    : 'Tarefas (todas)',
                data: valores,
                backgroundColor: backgroundColors
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: context => ` ${context.parsed.y} tarefa(s)`
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
}

// function updateGantt(tasks) {
//     if (!tasks || tasks.length === 0) return;

//     // Agregar dados por fase
//     const fasesData = tasks.reduce((acc, task) => {
//         const fase = task.fase;

//         if (!fase || typeof task.duracao !== 'number' || typeof task.porcConcluida !== 'number') {
//             return acc;
//         }

//         if (!acc[fase]) {
//             acc[fase] = {
//                 diasTotal: 0,
//                 diasConcluidos: 0
//             };
//         }

//         // Soma total de dias
//         acc[fase].diasTotal += task.duracao;

//         // Soma dos dias concluídos (proporcional à porcentagem da tarefa)
//         acc[fase].diasConcluidos += (task.duracao * (task.porcConcluida / 100));

//         return acc;
//     }, {});

//     // Atualizar barras no DOM
//     document.querySelectorAll('.gantt-bar-container').forEach(container => {
//         const faseNome = container.getAttribute('data-gantt');
//         const barraPreenchida = container.querySelector('.gantt-bar-preenchida');
//         const label = container.querySelector('.gantt-label');

//         const data = fasesData[faseNome];

//         if (data && data.diasTotal > 0) {
//             const porcentagem = (data.diasConcluidos / data.diasTotal) * 100;
//             const porcFormatada = porcentagem.toFixed(2);
//             const diasConcluidos = Math.round(data.diasConcluidos);
//             const diasTotal = data.diasTotal;

//             barraPreenchida.style.width = `${porcFormatada}%`;
//             label.textContent = `${porcFormatada}% (${diasConcluidos} de ${diasTotal} dias)`;
//         } else {
//             barraPreenchida.style.width = '0%';
//             label.textContent = '0.00% (0 de 0 dias)';
//         }
//     });
// }