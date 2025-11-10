window.graficoGantt = null; 
window.isGanttFullscreen = false;
window.currentMode = 'general'; // 'general' (alinhado a hoje) ou 'sequential' (ordenado)


// Definições de Tempo e Fases
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0); 
const TODAY_MS = TODAY.getTime(); 
const MS_PER_DAY = 24 * 60 * 60 * 1000;

let PROJECT_START_MS = 0; // Será definido dentro de updateGantt

const PHASE_NAMES = {
    1: '1. Escopo & Briefing',
    2: '2. Pesquisa e Análise',
    3: '3. Concepção e Protótipo',
    4: '4. Validação de Conceito',
    5: '5. Viabilidade',
    6: '6. Implementação'
};

/**
 * 1. AGREGAÇÃO DE DADOS POR FASE (Comum aos dois modos)
 */
const aggregatePhaseData = (apiData) => {
    const phasesData = [];
    for (let i = 1; i <= 6; i++) {
        const tasks = apiData.filter(task => parseInt(task.fase) === i);
        
        let totalDurationDays = 0;
        let completedDurationDays = 0;

        tasks.forEach(task => {
            const duration = parseFloat(task.duracao) || 0;
            const percentage = parseFloat(task.porcConcluida) || 0; 
            totalDurationDays += duration;
            completedDurationDays += (duration * percentage) / 100;
        });

        let remainingDurationDays = totalDurationDays - completedDurationDays;
        if (remainingDurationDays < 0) remainingDurationDays = 0;
        
        const totalCompletedPercentage = (totalDurationDays > 0) 
            ? (completedDurationDays / totalDurationDays) * 100 
            : 0;

        phasesData.push({
            id: i,
            name: PHASE_NAMES[i],
            totalDurationDays,
            hasSomeCompletion: totalCompletedPercentage > 0,
            is100Percent: totalCompletedPercentage >= 100,
            completedDurationMs: completedDurationDays * MS_PER_DAY,
            remainingDurationMs: remainingDurationDays * MS_PER_DAY,
            completionPercentage: totalCompletedPercentage, 
        });
    }
    return phasesData;
};

// ----------------------------------------------------------------------------------
// FUNÇÃO UNIFICADA PARA CALCULAR A ÂNCORA DE PROGRESSO EM AMBOS OS MODOS
// ----------------------------------------------------------------------------------
const calculateProgressAnchor = (phasesData, isGeneralMode) => {
    let cumulativeStartMs = 0;
    let maxCompletion = -1; 
    let criticalProgressAnchorMs = 0;
    let criticalPhaseIndex = -1;
    
    // Mapeia os pontos de base para a lógica de Anchor, independentemente do modo
    for (let i = 0; i < phasesData.length; i++) {
        const phase = phasesData[i];
        const offset = cumulativeStartMs;
        const plannedEndMs = offset + phase.completedDurationMs + phase.remainingDurationMs;
        const progressEndMs = offset + phase.completedDurationMs; 

        const percentage = phase.completionPercentage;
        
        // Regra: Encontra a MAIOR porcentagem que seja explicitamente < 100
        if (percentage < 100 && percentage > maxCompletion) {
            maxCompletion = percentage;
            criticalProgressAnchorMs = progressEndMs; 
            criticalPhaseIndex = i;
        } 
        
        // Calcula o próximo ponto de início, que é essencial para AMBOS os modos
        let nextStartMs = plannedEndMs; 
        const nextPhase = phasesData[i + 1];

        if (nextPhase && nextPhase.hasSomeCompletion) {
            nextStartMs = progressEndMs; 
        } 
        
        phasesData[i].baseProgressEndMs = progressEndMs;
        phasesData[i].baseStartMs = offset;
        
        cumulativeStartMs = nextStartMs;
    }
    
    if (maxCompletion === -1 && phasesData.length > 0) {
        criticalProgressAnchorMs = cumulativeStartMs; 
        criticalPhaseIndex = -1; 
    }

    return { 
        criticalProgressAnchorMs, 
        totalCumulativeEndMs: cumulativeStartMs, 
        criticalPhaseIndex: criticalPhaseIndex
    };
};


/**
 * FORMATADOR MODO ORDENADO ('sequential') - Apenas organiza as barras em sequência.
 */
const formatDataForSequentialMode = (apiData) => {
    const phasesData = aggregatePhaseData(apiData);
    const anchorData = calculateProgressAnchor(phasesData, false); 
    
    const chartData = {
        phases: [],             
        timeBefore: [],         
        successMs: [],          
        remainingMs: [],        
        progressEndsMs: [],     
        plannedEndsMs: [],      
        criticalProgressAnchor: anchorData.criticalProgressAnchorMs, 
        phasesData: phasesData,
    };
    
    let chartCumulativeStartMs = 0; 

    for (let i = 0; i < phasesData.length; i++) {
        const phase = phasesData[i];
        
        const timeBeforeMs = chartCumulativeStartMs;
        const successMs = phase.completedDurationMs;
        const remainingMs = phase.remainingDurationMs;
        const progressEndMs = timeBeforeMs + successMs;
        const plannedEndMs = progressEndMs + remainingMs;

        let nextStartMs = plannedEndMs; 
        const nextPhase = phasesData[i + 1];

        // Se a próxima fase tem progresso, seu início alinha-se ao fim do progresso desta
        if (nextPhase && nextPhase.hasSomeCompletion) {
            nextStartMs = progressEndMs; 
        } 
        
        chartData.phases.push(PHASE_NAMES[phase.id]);
        chartData.timeBefore.push(timeBeforeMs);
        chartData.successMs.push(successMs);
        chartData.remainingMs.push(remainingMs);
        chartData.progressEndsMs.push(progressEndMs);
        chartData.plannedEndsMs.push(plannedEndMs);

        chartCumulativeStartMs = nextStartMs;
    }
    
    return chartData;
};

/**
 * FORMATADOR MODO GERAL ('general') - Reorganiza as barras para alinhamento.
 */
const formatDataForGeneralMode = (apiData) => {
    const phasesData = aggregatePhaseData(apiData);
    const anchorData = calculateProgressAnchor(phasesData, true); 
    
    const chartData = {
        phases: [],             
        timeBefore: [],         
        successMs: [],          
        remainingMs: [],        
        progressEndsMs: [],     
        plannedEndsMs: [],      
        criticalProgressAnchor: anchorData.criticalProgressAnchorMs, 
        phasesData: phasesData, 
    };
    
    const criticalProgressAnchorMs = anchorData.criticalProgressAnchorMs;
    const criticalPhaseIndex = anchorData.criticalPhaseIndex;
    
    let chartCumulativeStartMs = 0; 
    
    for (let i = 0; i < phasesData.length; i++) {
        const phase = phasesData[i];
        
        let progressEndMs;
        let timeBeforeMs;
        let successMs;
        let remainingMs;
        
        const isCriticalOrAfter = (i >= criticalPhaseIndex && criticalPhaseIndex !== -1);

        if (phase.hasSomeCompletion) {
            if (isCriticalOrAfter && !phase.is100Percent) {
                // Fases em andamento: Alinha o progresso à âncora
                progressEndMs = criticalProgressAnchorMs;
                successMs = phase.completedDurationMs;
                timeBeforeMs = progressEndMs - successMs; 
                remainingMs = phase.remainingDurationMs;
            } else {
                // Fases anteriores ou 100%: Usa a posição base do modo Sequential
                timeBeforeMs = phase.baseStartMs;
                successMs = phase.completedDurationMs;
                remainingMs = phase.remainingDurationMs;
                progressEndMs = phase.baseProgressEndMs; 
            }
            
        } else {
            // Fases com 0%
            timeBeforeMs = chartCumulativeStartMs; 
            successMs = 0; 
            progressEndMs = timeBeforeMs; 
            remainingMs = phase.remainingDurationMs;
        }
        
        const plannedEndMs = timeBeforeMs + successMs + remainingMs;
        
        let nextStartMs = plannedEndMs; 
        const nextPhase = phasesData[i + 1];

        if (nextPhase && nextPhase.hasSomeCompletion) {
            nextStartMs = progressEndMs; 
        } 
        
        chartData.phases.push(PHASE_NAMES[phase.id]);
        chartData.timeBefore.push(timeBeforeMs);
        chartData.successMs.push(successMs);
        chartData.remainingMs.push(remainingMs);
        chartData.progressEndsMs.push(progressEndMs);
        chartData.plannedEndsMs.push(plannedEndMs);

        chartCumulativeStartMs = nextStartMs;
    }

    return chartData;
};


// ----------------------------------------------------
// PLUGIN NATIVO PARA LINHAS DE PRAZO E HOJE 
// ----------------------------------------------------
const deadlineLinesPlugin = {
    id: 'deadlineLines',
    beforeDraw: (chart, args, options) => {
        const { ctx, chartArea: { top, bottom, left, right }, scales: { x, y } } = chart;
        const formattedData = chart.config.data.formattedData;
        
        if (!formattedData || !x || !y) return;

        ctx.save();

        const isFullscreen = window.isGanttFullscreen || false;
        
        // Define o tamanho base da fonte (maior em fullscreen)
        const baseFontSize = isFullscreen ? 18 : 12; 
        const todayFontSize = isFullscreen ? 20 : 10; 
        const todayLabelHeight = isFullscreen ? 40 : 20; 
        
        const externalLabelMargin = 10; 
        const textYBase = bottom + externalLabelMargin; 
        const textPaddingFromGrid = isFullscreen ? 8 : 5; 
        const rotationAngle = -45 * Math.PI / 180; 
        
        ctx.font = `bold ${baseFontSize}px Inter, sans-serif`; 

        // NOVO: Coleção de todos os pontos a serem rotulados
        const labeledPoints = [];

        // ----------------------------------------------------------------
        // 1. Coleta dos Pontos de Rótulo (TODOS)
        // ----------------------------------------------------------------
        
        // A. Ponto INÍCIO
        labeledPoints.push({ 
            xPixel: x.getPixelForValue(0), 
            label: `INÍCIO: ${new Date(PROJECT_START_MS).toLocaleDateString('pt-BR').substring(0, 5)}`, // Substring (DD/MM)
            type: 'start'
        });

        // B. Ponto HOJE (Âncora de Progresso)
        const todayAnchorMs = formattedData.criticalProgressAnchor; 
        if (todayAnchorMs > 0) {
            labeledPoints.push({ 
                xPixel: x.getPixelForValue(todayAnchorMs), 
                label: 'HOJE', 
                type: 'today'
            });
        }

        // C. Pontos de Progresso (Progresso Ends)
        // Usamos map com os dados formatados porque eles têm a sequência correta
        formattedData.progressEndsMs.forEach((progressEndMs, index) => {
            const actualMs = formattedData.successMs[index]; 
            if (actualMs > 0) {
                labeledPoints.push({
                    xPixel: x.getPixelForValue(progressEndMs),
                    label: new Date(PROJECT_START_MS + progressEndMs).toLocaleDateString('pt-BR').substring(0, 5),
                    type: 'progress'
                });
            }
        });
        
        // D. Pontos de Prazo (Planned Ends)
        formattedData.plannedEndsMs.forEach((endMs, index) => {
            const isProjectEnd = index === formattedData.plannedEndsMs.length - 1;
            const remainingDuration = formattedData.remainingMs[index];
            
            if (remainingDuration > 0 || isProjectEnd) {
                let labelText = new Date(PROJECT_START_MS + endMs).toLocaleDateString('pt-BR').substring(0, 5);
                if (isProjectEnd) {
                    labelText = `FIM: ${labelText}`;
                }

                labeledPoints.push({
                    xPixel: x.getPixelForValue(endMs),
                    label: labelText,
                    type: 'deadline',
                    isProjectEnd: isProjectEnd
                });
            }
        });
        
        // ----------------------------------------------------------------
        // 2. Ordenação e Detecção de Colisão Vertical (Só para rótulos de data)
        // ----------------------------------------------------------------
        
        // Parâmetros de colisão
        const PUSH_OFFSET = isFullscreen ? 15 : 10; // Distância vertical entre labels
        const COLLISION_WIDTH = 20; // Largura mínima (em pixels) para considerar duas linhas 'colidindo'

        labeledPoints
            .sort((a, b) => a.xPixel - b.xPixel) // Ordena por posição X
            .filter(p => p.type !== 'today') // Exclui HOJE da colisão vertical com labels de data
            .forEach((point, index, array) => {
                point.yOffset = 0; // Inicializa o deslocamento vertical
                
                if (index > 0) {
                    const prevPoint = array[index - 1];
                    
                    if (point.xPixel - prevPoint.xPixel < COLLISION_WIDTH) {
                        point.yOffset = prevPoint.yOffset + PUSH_OFFSET;
                    }
                }
            });

        
        // ----------------------------------------------------------------
        // 3. Desenho Final (Com Deslocamento e Unicidade)
        // ----------------------------------------------------------------
        
        // NOVO: Mapa para rastrear quais coordenadas X já foram rotuladas
        const drawnDateLabels = {}; 

        // A. Linhas e Rótulo INÍCIO
        const startPoint = labeledPoints.find(p => p.type === 'start');
        
        ctx.beginPath();
        ctx.strokeStyle = '#4b5563'; 
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 2]); 
        ctx.moveTo(startPoint.xPixel, top);
        ctx.lineTo(startPoint.xPixel, bottom);
        ctx.stroke();

        ctx.save();
        ctx.translate(startPoint.xPixel, textYBase + textPaddingFromGrid + startPoint.yOffset); 
        ctx.rotate(rotationAngle);
        
        ctx.fillStyle = '#4b5563'; 
        ctx.textAlign = 'right'; 
        ctx.fillText(startPoint.label, 0, 0); 
        
        ctx.restore(); 
        ctx.setLineDash([]); 
        
        // Marca a coordenada X do INÍCIO como desenhada
        drawnDateLabels[startPoint.xPixel] = true;

        // B. Linha e Rótulos Progresso e Prazo
        labeledPoints.filter(p => p.type !== 'start' && p.type !== 'today').forEach(point => {
            const pixel = point.xPixel;
            
            // 🎯 NOVO: Verificação de Unicidade
            const isLabelDrawn = !!drawnDateLabels[pixel];

            // Se a label já foi desenhada E não for o TÉRMINO, apenas desenha a linha e pula o rótulo.
            if (isLabelDrawn && !point.isProjectEnd) {
                // Desenha a linha de tempo mesmo que o rótulo seja omitido, pois a linha é importante
                ctx.beginPath();
                ctx.strokeStyle = (point.type === 'progress') ? '#3b82f6' : '#6b7280';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([6, 6]); 
                ctx.moveTo(pixel, top); 
                ctx.lineTo(pixel, bottom); 
                ctx.stroke();
                ctx.setLineDash([]);
                return; 
            }
            
            // Desenha Linha
            ctx.beginPath();
            
            if (point.type === 'progress') {
                ctx.strokeStyle = '#3b82f6'; // Azul
                ctx.setLineDash([6, 6]); 
            } else { // type === 'deadline'
                ctx.strokeStyle = '#6b7280'; // Cinza
                ctx.setLineDash([6, 6]); 
            }
            
            ctx.lineWidth = 1.5;
            ctx.moveTo(pixel, top); 
            ctx.lineTo(pixel, bottom); 
            ctx.stroke();
            
            // Desenha Rótulo (Data)
            ctx.save();
            ctx.translate(pixel, textYBase + textPaddingFromGrid + point.yOffset); // Usa yOffset
            ctx.rotate(rotationAngle);
            
            ctx.fillStyle = (point.type === 'progress') ? '#3b82f6' : '#6b7280'; 
            ctx.textAlign = 'right';
            ctx.fillText(point.label, 0, 0); 

            ctx.restore(); 
            ctx.setLineDash([]); 

            // Marca esta coordenada X como desenhada
            drawnDateLabels[pixel] = true;
        });


        // C. Linha HOJE (Desenho separado para manter a caixa fixa no topo)
        const todayPoint = labeledPoints.find(p => p.type === 'today');
        if (todayPoint) {
            const todayPixel = todayPoint.xPixel;
            
            // Desenha Linha HOJE (Verde)
            ctx.beginPath();
            ctx.strokeStyle = '#059669'; 
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 4]); 
            ctx.moveTo(todayPixel, top);
            ctx.lineTo(todayPixel, bottom);
            ctx.stroke();
            
            ctx.setLineDash([]); 

            // RÓTULO HOJE (Caixa Verde)
            const todayLabel = "HOJE";
            const labelPadding = isFullscreen ? 8 : 5;
            const estimatedCharWidth = todayFontSize * (isFullscreen ? 0.6 : 0.5);
            const calculatedWidth = 5 * estimatedCharWidth + labelPadding * 2; 
            const labelHeight = todayLabelHeight;

            ctx.fillStyle = '#059669';
            ctx.fillRect(
                todayPixel - (calculatedWidth / 2), 
                top + labelPadding, 
                calculatedWidth, 
                labelHeight
            ); 

            ctx.font = `bold ${todayFontSize}px Inter, sans-serif`;
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            
            ctx.fillText(
                todayLabel, 
                todayPixel, 
                top + labelPadding + (labelHeight / 2) + 3 
            );
        }  
        ctx.restore();
    }
};

if (typeof Chart !== 'undefined' && typeof Chart.register === 'function') {
    Chart.register(deadlineLinesPlugin);
}

/**
 * Torna a função updateGantt global (window.) para ser acessada pelo outro script.
 */
window.updateGantt = function(data, mode) {
    const canvasElement = document.getElementById('ganttChart');
    if (!canvasElement) {
        console.error("Elemento 'ganttChart' não encontrado no DOM.");
        return;
    }

    if (window.graficoGantt) {
        window.graficoGantt.destroy();
    }
    
    if (!Array.isArray(data) || data.length === 0) {
        canvasElement.getContext('2d').clearRect(0, 0, canvasElement.width, canvasElement.height);
        window.graficoGantt = null;
        return;
    }
    
    // 1. ESCOLHE O FORMATADOR E FORMATA OS DADOS
    let formattedData;
    if (mode === 'sequential') {
        formattedData = formatDataForSequentialMode(data);
    } else { // 'general'
        formattedData = formatDataForGeneralMode(data);
    }
    
    // 🎯 CORREÇÃO CRÍTICA: O ponto de início do projeto (para cálculo de datas no plugin) deve ser
    // sempre o TODAY_MS menos a duração do progresso, para que o progresso caia em TODAY_MS no calendário.
    PROJECT_START_MS = TODAY_MS - formattedData.criticalProgressAnchor; 
    
    const ctx = canvasElement.getContext('2d');
    
    // 2. DEFINE A ESCALA DO EIXO X
    const maxTime = formattedData.plannedEndsMs.reduce((max, endMs) => Math.max(max, endMs), 0);
    const minTime = 0; 

    const MS_BUFFER = 5 * MS_PER_DAY; 
    
    const maxScale = Math.max(maxTime, formattedData.criticalProgressAnchor) + MS_BUFFER; 
    const minScale = minTime;

    const isFullscreen = window.isGanttFullscreen || false;
    const yAxisFontSize = isFullscreen ? 20 : 12;

    // 3. CORES
    const phaseColors = [
        '#3b82f6', 
        '#10b981', 
        '#f59e0b', 
        '#8b5cf6', 
        '#06b6d4', 
        '#ec4899', 
    ];

    // 4. CONFIGURAÇÃO DO GRÁFICO
    const chartConfig = {
        type: 'bar',
        data: {
            labels: formattedData.phases,
            formattedData: formattedData, 
            datasets: [
                {
                    label: 'Offset',
                    data: formattedData.timeBefore,
                    backgroundColor: 'rgba(255, 255, 255, 0)', 
                    borderColor: 'rgba(255, 255, 255, 0)',
                    categoryPercentage: 0.9, 
                    barPercentage: 0.95, 
                    stack: 'gantt', 
                },
                {
                    label: 'Progresso Concluído',
                    data: formattedData.successMs,
                    backgroundColor: phaseColors,
                    categoryPercentage: 0.9, 
                    barPercentage: 0.95, 
                    stack: 'gantt'
                },
                {
                    label: 'Duração Remanescente',
                    data: formattedData.remainingMs,
                    backgroundColor: 'rgba(180, 180, 180, 0.8)',
                    categoryPercentage: 0.9, 
                    barPercentage: 0.95, 
                    stack: 'gantt'
                },
            ]
        },
        options: {
            indexAxis: 'y', 
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear', 
                    min: minScale, 
                    max: maxScale, 
                    ticks: {
                        display: false,
                        font: { size: 10 },
                        color: '#6b7280', 
                        autoSkipPadding: 10, 
                    },
                    grid: {
                        display: false,
                        drawOnChartArea: false, 
                    },
                    stacked: true, 
                    title: { display: false }, 
                },
                y: {
                    stacked: true,
                    offset: true, 
                    grid: { display: false },
                    ticks: {
                        font: {
                            size: yAxisFontSize,
                            weight: 'bold'
                        }  
                    }
                }
            },
            plugins: {
                legend: { 
                    display: true, 
                    labels: {
                        filter: function(legendItem, chartData) { return legendItem.text !== 'Offset'; }
                    }
                },
                customOptions: { 
                    mode: mode 
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: (context) => context[0].label,
                        label: (context) => {
                            const datasetIndex = context.datasetIndex;
                            const phaseData = formattedData.phasesData.find(p => p.name === context.label);
                            
                            if (!phaseData) return null;

                            const totalPlannedMs = phaseData.completedDurationMs + phaseData.remainingDurationMs;
                            const baseCompletedMs = phaseData.completedDurationMs;
                            const remainingMs = phaseData.remainingDurationMs;
                            
                            const totalDays = Math.round(totalPlannedMs / MS_PER_DAY);
                            const actualDays = (baseCompletedMs / MS_PER_DAY).toFixed(1);
                            const remainingDays = (remainingMs / MS_PER_DAY).toFixed(1);
                            
                            const percentage = totalPlannedMs > 0 ? ((baseCompletedMs / totalPlannedMs) * 100).toFixed(2) : 0;
                            
                            if (datasetIndex === 0) { 
                                return null; 
                            } else if (datasetIndex === 1) { 
                                return `Concluído: ${percentage}% (${actualDays} dias)`;
                            } else if (datasetIndex === 2) { 
                                return `Restante: ${remainingDays} dias | Total Planejado: ${totalDays} dias`;
                            }
                            return null;
                        }
                    }
                }
            },
            layout: { 
                padding: { bottom: 100 }
            }
        }
    };

    try {
        window.graficoGantt = new Chart(ctx, chartConfig);
    } catch (error) {
        console.error("Erro ao criar o gráfico de Gantt:", error);
    }
};

// Chamada inicial (agora que updateGantt é global, ela pode ser chamada por outro script)
window.onload = () => {
    // Chamada inicial com o modo padrão ('general')
    if (typeof mockApiData !== 'undefined') {
        window.updateGantt(mockApiData, window.currentMode); 
    }   
    // Garante que o gráfico se ajusta ao redimensionar a janela
    window.addEventListener('resize', () => {
        if (window.graficoGantt) {
            // Recarrega o gráfico para recalcular as linhas de label
            window.updateGantt(mockApiData, window.currentMode); 
        }
    });
};