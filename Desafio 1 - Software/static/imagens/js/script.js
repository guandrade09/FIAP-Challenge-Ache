/* 

Dinâmicas presentes nesse .js:

- Upload
- Chatbot

O que falta:

- Feedback de importação
- Arquivos recentes

*/

const mensagens = [
    { role: "system", content: "Você é um assistente útil e educado." }
];

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const uploadStatus = document.getElementById('uploadStatus');

dropzone.addEventListener('click', () => {
    fileInput.click();
});

dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        uploadFile(files[0]);
    }
});

fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        uploadFile(fileInput.files[0]);
    }
});

window.addEventListener('load', () => {
    mostrarMensagemInicial();
});

document.getElementById("inputMsg").addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        event.preventDefault(); // evita o comportamento padrão se necessário
        enviarMensagem();
    }
});

function uploadFile(file) {
    uploadStatus.innerHTML = "Enviando arquivo...";

    const formData = new FormData();
    formData.append('arquivo', file);

    console.log("Hello!");

    fetch('/upload', {
        method: 'POST',
        body: formData
    })

    .then(response => {
        if (!response.ok) {
            throw new Error('Erro na requisição.');
        }
        return response.json();
    })

    .then(result => {
        console.log("Resultado completo:", result);
        if (result.status === 'sucesso') {
        uploadStatus.innerHTML = `<p style="color:green;">${result.mensagem}</p>`;
        } else {
        uploadStatus.innerHTML = `<p style="color:red;">❌ Erro: ${result.mensagem || 'Erro desconhecido.'}</p>`;
        }
    })

    .catch(error => {
        console.error('Erro:', error);
        uploadStatus.innerHTML = `<p style="color:red;">Falha ao enviar o arquivo. ${error}.</p>`;
    });
}

function mostrarMensagemInicial() {
    const mensagemInicial = "Olá! Eu sou seu assistente. Como posso ajudar você hoje?";
    adicionarMensagem(mensagemInicial, 'bot');
    mensagens.push({ role: "assistant", content: mensagemInicial });
}

function adicionarMensagem(texto, tipo) {
    const chat = document.getElementById('chat');
    const div = document.createElement('div');
    div.className = `message ${tipo}`;
    div.textContent = texto;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight; // auto-scroll
}

function enviarMensagem() {
    const input = document.getElementById('inputMsg');
    const texto = input.value.trim();
    if (!texto) return;

    adicionarMensagem(texto, 'user');
    mensagens.push({ role: "user", content: texto });
    input.value = "";

    fetch("/enviar", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ mensagens: mensagens })
    })
    .then(res => res.json())
    .then(data => {
        adicionarMensagem(data.content, 'bot');
        mensagens.push({ role: "assistant", content: data.content });
    });
}

