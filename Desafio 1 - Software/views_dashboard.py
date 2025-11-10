from flask import render_template, jsonify
from server import app
from models import Projeto  # Verifique se a classe está importada corretamente

@app.route('/dashboard')
def dashboard():
    tarefas = Projeto.query.order_by(Projeto.numero)
    fases = [f.fase for f in Projeto.query.with_entities(Projeto.fase).distinct()]
    nomeArquivos = [f.nomeArquivo for f in Projeto.query.with_entities(Projeto.nomeArquivo).distinct()]
    return render_template('codexis/dashboard.html', titulo='Dashboard | KPIs', tarefas=tarefas, fases=fases, nomeArquivos=nomeArquivos)

@app.route('/api/dashboard-data')
def get_dashboard_data():
    try:
        tasks = Projeto.query.order_by(Projeto.numero).all()
        
        # Converte os objetos para uma lista de dicionários
        tasks_data = [
            {
                'id': task.id,
                'numero': task.numero,
                'classificacao': task.classificacao,
                'categoria': task.categoria,
                'fase': task.fase,
                'condicao': task.condicao,
                'nome': task.nome,
                'duracao': task.duracao,
                'comoFazer': task.comoFazer,
                'docRef': task.docReferencia,
                'porcConcluida': task.porcentagemConcluida
            } 
            for task in tasks
        ]

        # Retorna os dados em formato JSON
        return jsonify(tasks_data)
    except Exception as e:
        # Em caso de erro, retorne uma resposta de erro
        print(f"Erro no servidor: {e}")
        return jsonify({'error': str(e)}), 500
    