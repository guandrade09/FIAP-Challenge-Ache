from flask import render_template, redirect, session, url_for, jsonify
from server import app
from utils import lista_arquivos, limpaCacheArquivo
from config import UPLOAD_PATH, TEMP_PATH, DIALOGO_PATH, RESUMO_PATH, PDF_PATH

@app.route('/')
def index():
    arquivos = lista_arquivos(UPLOAD_PATH)
    pdfs = lista_arquivos(PDF_PATH)

    #Limpando cache temp_file
    limpaCacheArquivo(TEMP_PATH)

    #Limpando cache LOGS/Dialogo
    limpaCacheArquivo(DIALOGO_PATH)

    #Limpando cache LOGS/RESUMO
    limpaCacheArquivo(RESUMO_PATH)

    #Limpando cache PDF_file
    limpaCacheArquivo(PDF_PATH)

    if 'usuario_logado' not in session or session['usuario_logado'] == None:
        return redirect(url_for('login'))
    return render_template('codexis/index.html', titulo='Upload de Arquivo CSV - Dashboard Aché', projetos=arquivos, pdfs=pdfs)

@app.route('/listar_arquivos', methods=["GET"])
def listar_arquivos():
    todos_arquivos = []
    xlsx = lista_arquivos(UPLOAD_PATH)
    pdfs = lista_arquivos(PDF_PATH)
    todos_arquivos = xlsx + pdfs

    return jsonify([
        {"nome": p["nome"], "caminho": p["caminho"], "extensao": p["extensao"]}
        for p in todos_arquivos
    ])
    
@app.route('/teste')
def teste():
    return render_template('codexis/teste.html', titulo="TESTE")

