#framework
from flask import request, jsonify, abort, send_from_directory, send_file, redirect, url_for, flash

#arquivos
from urllib.parse import unquote
from werkzeug.utils import secure_filename
from tempfile import NamedTemporaryFile
from datetime import datetime
import pandas as pd
from unidecode import unidecode

#sistema
import shutil
import os

#.pys
from utils import contar_projetos
from filtragemdados import filtrar_dados_projetos, inserir_dados_projetos, tratar_dados_do_arquivo, compatibilidade_arquivo
from helpers import verificar_vazio, encontrar_caminho_completo
from config import UPLOAD_PATH, TEMP_PATH, PDF_PATH
from models import Projeto
from extensions import csrf, db
from server import app

#INSERIR ARQUIVO PARA LISTA DE ARQUIVO  !FINALIZADO!
@app.route("/upload", methods=["POST"])
def upload():
    if 'arquivo' not in request.files:
        return jsonify({'status': 'erro', 'mensagem': 'Nenhum arquivo enviado.'}), 400

    arquivo = request.files['arquivo']
    nome_arquivo = secure_filename(arquivo.filename)

    compativel = compatibilidade_arquivo(arquivo)

    if compativel != True:
        return jsonify({"status": "erro", "mensagem" : f"{compativel}"}), 401   

    if verificar_vazio(arquivo):
        return jsonify({'status': 'erro', 'mensagem': 'Arquivo está vazio ou inválido!'}), 400

    try:
        # 🧪 Etapa 1: salvar temporariamente
        temp_file = NamedTemporaryFile(delete=False, suffix=os.path.splitext(nome_arquivo)[1])
        caminho_temp = temp_file.name
        arquivo.save(caminho_temp)
        temp_file.close()

        # 📄 Etapa 2: tratar conteúdo
        df_filtrado = filtrar_dados_projetos(caminho_temp)
        resultado = inserir_dados_projetos(df_filtrado, nome_arquivo)

        if not resultado:
            return jsonify({"status": "erro", "mensagem": "O arquivo enviado já existe!"}), 400

        # 🗂️ Etapa 3: salvar na pasta correta
        agora = datetime.now()
        ano = str(agora.year)
        mes = f"{agora.month:02d}"
        dia = f"{agora.day:02d}"

        pasta_final = os.path.join(UPLOAD_PATH, ano, mes, dia)
        os.makedirs(pasta_final, exist_ok=True)

        nome_base = f"Lista_de_projetos_n{contar_projetos(pasta_final)}"
        nome_final = f"{nome_base}.xlsx"
        caminho_final = os.path.join(pasta_final, nome_final)

        shutil.move(caminho_temp, caminho_final)

        # ✅ Atualiza o nome do arquivo no banco
        Projeto.query.filter_by(nomeArquivo=nome_arquivo).update({"nomeArquivo": nome_final})
        db.session.commit()

        caminho_relativo = os.path.relpath(caminho_final, UPLOAD_PATH).replace("\\", "/")


        return jsonify({'status': 'sucesso',
                         'mensagem': 'Upload e inserção realizados com sucesso!',
                         'caminho': caminho_relativo}), 200

    except Exception as e:
        return jsonify({'status': 'erro', 'mensagem': str(e)}), 500

csrf.exempt(upload)

#BAIXAR ARQUIVO QUE FOI CLICADO EM 'BAIXAR'     !FINALIZADO!
@app.route("/download_arquivo/<path:filename>")
def download_arquivo(filename):

    if ".pdf" in filename:
        caminho_absoluto = os.path.abspath(os.path.join(PDF_PATH, filename))
    else:
        caminho_absoluto = os.path.abspath(os.path.join(UPLOAD_PATH, filename))

    if not os.path.exists(caminho_absoluto):
        return abort(404)

    # Extrai o nome base (até o primeiro underline com hora)
    nome_arquivo_real = os.path.basename(caminho_absoluto)
    print(nome_arquivo_real)

    # Ex: 'Lista_de_projetos_n5_20h-33m-10s.xlsx' => 'Lista_de_projetos_n5.xlsx'
    nome_arquivo_real = nome_arquivo_real

    pasta, nome = os.path.split(caminho_absoluto)
    return send_from_directory(
        pasta,
        nome,
        as_attachment=True,
        download_name=nome_arquivo_real  # ✅ Nome simplificado no download
    )

#GERAR E ARMAZENAR ARQUIVO DOS EXCEL'S SELECIONADOS  !FINALIZADO!
@app.route("/gerar_excel", methods=["POST"])
def gerar_excel():
    try:
        dados = request.get_json()
        arquivos = dados.get("arquivos", [])

        if len(arquivos) >= 1:
            for i in arquivos:
                if ".pdf" in i:
                    return jsonify({"status": "erro",
                                    "mensagem": "Desmarque os arquivos PDF's para gerar o EXCEL"})

        if not arquivos:
            return jsonify({"status": "erro", "mensagem": "Nenhum arquivo selecionado"}), 400

        # Caminho para o modelo (somente cabeçalho)
        caminho_modelo = os.path.join(UPLOAD_PATH, "Modelo.xlsx")
        if not os.path.exists(caminho_modelo):
            return jsonify({"status": "erro", "mensagem": "Modelo não encontrado"}), 500

        df_modelo = pd.read_excel(caminho_modelo)

        # Padroniza igual aos dados
        df_modelo.columns = df_modelo.columns.str.strip().str.lower().str.replace(' ', '_')

        novo_cabeçalho = list(df_modelo.columns)

        dfs = []

        for nome_arquivo in arquivos:
            caminho_completo = os.path.join(UPLOAD_PATH, nome_arquivo)

            if caminho_completo is None or not os.path.exists(caminho_completo):
                return jsonify({
                    "status": "erro",
                    "mensagem": f"Arquivo não encontrado: {nome_arquivo}"
                }), 404

            df = tratar_dados_do_arquivo(caminho_completo)

            # Alinha as colunas de df com as do modelo (ajustando o número de colunas)

            dfs.append(df)

        if not dfs:
            return jsonify({"status": "erro", "mensagem": "Nenhum dado válido encontrado"}), 400
        
        df_dados = pd.concat(dfs, ignore_index=True)

        # --- Ordena para que maior % venha primeiro ---
        df_dados = df_dados.sort_values(by=['número', '%_concluída'], ascending=[True, False])

        # --- Remove duplicatas mantendo apenas o de maior % para cada número ---
        df_dados = df_dados.drop_duplicates(subset=['número'], keep='first')

        # --- Agora sim remove duplicatas completas pelo cabeçalho ---
        df_dados = df_dados.drop_duplicates(subset=novo_cabeçalho, keep='first')

        # Ordena pelo primeiro campo do cabeçalho
        df_dados = df_dados.sort_values(by=novo_cabeçalho[0], ascending=True).reset_index(drop=True)

        # Junta com o modelo
        df_final = pd.concat([df_modelo, df_dados], ignore_index=True)

        #Necessario pq a função tratar_dados_arquivos está multiplicando por 100   /   Exemplo de como acessar a coluna '%_concluida' sem erro
        if '%_concluída' in df_final.columns:
            # Remove '%' se vier como string e converte para número
            df_final['%_concluída'] = (
                pd.to_numeric(df_final['%_concluída'].astype(str).str.replace('%', ''), errors='coerce') / 100
                )

        if not set(novo_cabeçalho).issubset(set(df_final.columns)):
            return jsonify({
                "status": "erro",
                "mensagem": f"O arquivo {nome_arquivo} não tem todas as colunas esperadas."
            }), 400

        # Agora df_final está alinhado, com cabeçalho modelo e dados organizados
        
        # Salva Excel final
        agora = datetime.now()
        mes = f"{agora.month:02d}"
        dia = f"{agora.day:02d}"
        ano = f"{agora.year:02d}"

        pasta_final = os.path.join(TEMP_PATH, 'arquivos_gerados',ano,  mes, dia)
        os.makedirs(pasta_final, exist_ok=True)
        

        caminho_saida = os.path.join(pasta_final, f"excel_gerado-dia{dia}-{mes}m.xlsx")

        with pd.ExcelWriter(caminho_saida, engine='xlsxwriter') as writer:
            df_final.to_excel(writer, index=False, sheet_name='Dados')

            workbook  = writer.book
            worksheet = writer.sheets['Dados']

            if '%_concluída' in df_final.columns:
                formato_porcentagem = workbook.add_format({'num_format': '0%'})
                col_idx = list(df_final.columns).index('%_concluída')
                worksheet.set_column(col_idx, col_idx, 7, formato_porcentagem)


        return jsonify({
            "status": "sucesso",
            "url_download": f"/download_excel/{os.path.basename(caminho_saida)}"
        })

    except Exception as e:
        return jsonify({"status": "erro", "mensagem": str(e)}), 500

csrf.exempt(gerar_excel)

#BAIXAR ARQUIVO GERADO      !FINALIZADO!
@app.route("/download_excel/<path:filename>")
def download_excel(filename):
    caminho_completo = encontrar_caminho_completo(filename, TEMP_PATH)
    return send_from_directory(caminho_completo, filename, download_name="Arquivos_selecionados.xlsx", as_attachment=True)

#BAIXAR EXCEL MODELO        !FINALIZADO!
@app.route("/modelo")
def modelo():
    caminho_arquivo = os.path.join(os.getcwd(), UPLOAD_PATH, "Modelo.xlsx")
    return send_file(caminho_arquivo,download_name="Planilha_Modelo.xlsx", as_attachment=True)

#DELETAR ARQUIVO QNDO FOR CLICADO 'DELETAR'        !FINALIZADO!
@app.route("/deletar_arquivo/<path:filename>", methods=["DELETE", "GET"])
def deletar_arquivo(filename):
    try:
        filename = unquote(filename)
        nome_arquivo = os.path.basename(filename)

        if ".pdf" in filename:
            caminho_completo = os.path.join(PDF_PATH, filename)
            novo_nome = nome_arquivo.replace("_"," ").replace(".pdf", "")
            if os.path.exists(caminho_completo):
                os.remove(caminho_completo)
            else:
                return jsonify({"erro": f"Arquivo não encontrado: {novo_nome}"}), 404

            return jsonify({"status": "sucesso",
                            "mensagem": f"{novo_nome} removido do sistema!"}), 200
        else:
            caminho_completo = os.path.join(UPLOAD_PATH, filename)
            nome_base = nome_arquivo
        
        novo_nome = nome_arquivo.replace("_"," ").replace(".xlsx", "").replace(".pdf", "")

        # 🧹 Remove do banco
        registros_removidos = Projeto.query.filter_by(nomeArquivo=nome_base).delete()
        db.session.commit()

        # 🔥 Remove do sistema de arquivos
        if os.path.exists(caminho_completo):
            os.remove(caminho_completo)
        else:
            return jsonify({"erro": f"Arquivo não encontrado: {caminho_completo}"}), 404

        return jsonify({
            "status": "sucesso",
            "removidos": registros_removidos ,
            "mensagem": f"{registros_removidos} registros removidos e arquivo '{novo_nome}' deletado com sucesso!"
        }), 200

    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    
csrf.exempt(deletar_arquivo)

@app.route('/upload-pdf', methods=['POST'])
def upload_pdf():

    agora = datetime.now()
    ano = f"{agora.year:02d}"
    mes = f"{agora.month:02d}"
    dia = f"{agora.day:02d}"

    if 'arquivo_pdf' not in request.files:
        return jsonify({"message": "Nenhum arquivo enviado"}), 400

    file = request.files['arquivo_pdf']

    filename = unidecode(file.filename).replace(" ", "_")

    # valida se é PDF
    if not file.filename.lower().endswith('.pdf'):
        return jsonify({"message": "Apenas arquivos PDF são permitidos."}), 400

    novo_nome = file.filename
    novo_nome = f"Documento_de_referencia_n{contar_projetos(PDF_PATH)}.pdf"

    nome_amigavel = novo_nome.replace("_", " ").replace(".pdf", "")
    
    caminho_final = os.path.join(PDF_PATH, ano, mes, dia)
    filepath = os.path.join(caminho_final, novo_nome)

    os.makedirs(caminho_final, exist_ok=True)

    file.save(filepath)

    return jsonify({"status": "sucesso",
                    "message": f"{filename} enviado com sucesso e salvo como '{nome_amigavel}'!",
                      "arquivo": filename}), 200

csrf.exempt(upload_pdf)