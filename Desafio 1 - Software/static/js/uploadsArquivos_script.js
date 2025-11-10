const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const uploadStatus = document.getElementById('uploadStatus');

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) uploadFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) uploadFile(fileInput.files[0]);
});

function uploadFile(file) {
    uploadStatus.innerHTML = "Enviando arquivo...";

    const formData = new FormData();
    formData.append('arquivo', file);

    fetch('/upload', { method: 'POST', body: formData })
        .then(async response => {
            let data;
            try { data = await response.json(); } catch(e){ throw new Error("Resposta inválida do servidor"); }
            if (!response.ok) throw new Error(data.mensagem || "Erro desconhecido no servidor");
            return data;
        })
        .then(result => {
            if (result.status === 'sucesso') {
                uploadStatus.innerHTML = `<p style="color:green;">${result.mensagem}</p>`;
                atualizarListaArquivos(); // ✅ chama a função do lista.js
            } else {
                uploadStatus.innerHTML = `<p style="color:red;">❌ Erro: ${result.mensagem || 'Erro desconhecido.'}</p>`;
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            uploadStatus.innerHTML = `<p style="color:red;">Falha ao enviar o arquivo. ${error.message}</p>`;
        });
}
