document.getElementById("btn-import-pdf").addEventListener("click", () => {
    document.getElementById("pdf-input").click();
});

document.getElementById("pdf-input").addEventListener("change", async () => {
    const file = document.getElementById("pdf-input").files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("arquivo_pdf", file);

    try {
        const response = await fetch("/upload-pdf", {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (response.ok && result.status === "sucesso") {
            alert(result.message || "✅ PDF enviado com sucesso!");
            
            // ✅ Atualiza a lista de arquivos automaticamente
            atualizarListaArquivos();
        } else {
            alert(result.message || "❌ Erro ao enviar o PDF.");
        }

    } catch (error) {
        console.error("Erro no upload do PDF:", error);
        alert("❌ Falha ao enviar o PDF.");
    }
});
