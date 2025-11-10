function deletarArquivo(caminho) {
    fetch(`/deletar_arquivo/${encodeURIComponent(caminho)}`, { method: "DELETE" })
        .then(res => res.json())
        .then(data => {
            if(data.status === 'sucesso') {
                atualizarListaArquivos(); // ✅ chama a função do lista.js
                alert(`${data.mensagem}`)
            } else {
                alert("Erro: " + data.erro);
            }
        })
        .catch(err => console.error("Erro ao excluir:", err));
}
