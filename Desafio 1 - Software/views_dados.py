from flask import render_template, request, jsonify, send_file
from server import app
from models import Projeto
from extensions import csrf
from sqlalchemy import cast, Integer
from datetime import datetime
import os
import re
import pandas as pd
from config import UPLOAD_PATH, TEMP_PATH, PDF_PATH
from utils import salvar_conversa, ler_conversa_ultimos_5_minutos, salvar_resumo
from config_chatbots import perguntar_para_ia, resumir_conversa_pela_segIA
from filtragemdados import cruzarDadosPDF
from erros import *
import pandas as pd

@app.route('/dados')
def dados():
    tarefas = (
    Projeto.query
        .distinct(Projeto.numero)  # garante números únicos
        .order_by(cast(Projeto.numero, Integer).asc())
        .all()
)
    
    categorias = [f.categoria for f in Projeto.query.with_entities(Projeto.categoria).distinct()]
    fases = [f.fase for f in Projeto.query.with_entities(Projeto.fase).distinct()]
    classificacoes = [f.classificacao for f in Projeto.query.with_entities(Projeto.classificacao).distinct()]
    projetos = [f.nomeArquivo for f in Projeto.query.with_entities(Projeto.nomeArquivo).distinct()]
    duracoes = sorted(
        set([f.duracao for f in Projeto.query.with_entities(Projeto.duracao).distinct()]),
        key=lambda x: int(str(x).split()[0]) if str(x).split()[0].isdigit() else 9999
    )

    return render_template('codexis/dados.html', titulo='Demonstração de dados', tarefas=tarefas, fases=fases, 
                           categorias=categorias, classificacoes=classificacoes, projetos=projetos, duracoes=duracoes)

@app.route('/gerar_exportar', methods=['POST'])
def gerar_exportar():
    try:
        dados = request.get_json().get("dados", [])

        if not dados:
            return jsonify({"status": "erro", "mensagem": "Nenhum dado recebido"}), 400

        # Caminho do modelo
        caminho_modelo = os.path.join(UPLOAD_PATH, "Modelo.xlsx")
        if not os.path.exists(caminho_modelo):
            return jsonify({"status": "erro", "mensagem": "Modelo não encontrado"}), 500

        # Carregar modelo como DataFrame
        df_modelo = pd.read_excel(caminho_modelo)

        # Padronizar cabeçalhos
        df_modelo.columns = (
            df_modelo.columns.str.strip()
            .str.lower()
            .str.replace(' ', '_')
        )

        # Converter os dados recebidos em DataFrame
        df_dados = pd.DataFrame(dados, columns=df_modelo.columns)

        # Substitui os dados do modelo pelos filtrados
        df_modelo = df_dados

        # Salvar excel
        agora = datetime.now()
        mes = f"{agora.month:02d}"
        dia = f"{agora.day:02d}"
        ano = f"{agora.year:02d}"

        #criar alocação
        pasta_final = os.path.join(TEMP_PATH, 'tarefas_filtradas_geradas',ano,  mes, dia,)
        os.makedirs(pasta_final, exist_ok=True)

        caminho_saida = os.path.join(pasta_final, f"tarefas_filtradas-dia{dia}-{mes}m.xlsx")
        df_modelo.to_excel(caminho_saida, index=False)

        # Enviar para download
        return send_file(
            caminho_saida,
            as_attachment=True,
            download_name="tarefas_filtradas.xlsx",
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

    except Exception as e:
        return jsonify({"status": "erro", "mensagem": str(e)}), 500
    
csrf.exempt(gerar_exportar)

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
                'porcConcluida': task.porcentagemConcluida,
                'projeto': (task.nomeArquivo or '').replace('.xlsx','').lower()
            } 
            for task in tasks
        ]

        # Retorna os dados em formato JSON
        return jsonify(tasks_data)
    except Exception as e:
        # Em caso de erro, retorne uma resposta de erro
        print(f"Erro no servidor: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/chatbot_dados', methods=['POST'])
@csrf.exempt
def chatbot_dados():
    dados_atuais = {}

    df_vazio = pd.DataFrame() 
    df_projeto = df_vazio
    df_100 = df_vazio
    df_menorq100 = df_vazio
    df_condA = df_vazio
    df_condB = df_vazio
    df_condC = df_vazio
    df_condSempre = df_vazio
    lista_docRefs = []
    lista_comoFazer = []
    dadosNumeros = []

    try:

        dados_js = request.get_json()
        filtros = dados_js.get('filtros', {})
        encontrado = False
        
        # 1. Obtenha a lista de projetos do front-end
        projetos_selecionados = filtros.get("projetos", [])
        projeto = projetos_selecionados[0].split(".")

        # 2. Comparações 
            # 1º - Comparando se há mais de um arquivo, caso verdadeiro ele pede para o usuario selecionar apenas 1 projeto
        if projetos_selecionados[0] == "__all__":
            return jsonify({    
                "status": "sucesso",
                "mensagem": f"⚠️ Por favor, verifique se existe algum projeto para ser lido, caso exista, selecione apenas um para máxima eficiência!",
                "codigo": 1
            }), 200
        
            # 2º - Caso tenha apenas um projeto selecionado.
        elif projetos_selecionados[0] != "__all__":
            projeto = projetos_selecionados[0]
            for raiz, subpastas, arquivos in os.walk(UPLOAD_PATH):
                for arquivo in arquivos:
                    if arquivo == projeto:
                        caminho_arquivo = os.path.join(raiz, arquivo)  # ✅ caminho completo
                        df_projeto = pd.read_excel(caminho_arquivo)
                        # 3º - Reparar a coluna dados do excel
                        if "% Concluída" in df_projeto.columns:
                            df_projeto['% Concluída'] = df_projeto['% Concluída'] * 100

                        df_100 = df_projeto[df_projeto['% Concluída'] == 100]
                        df_menorq100 = df_projeto[df_projeto['% Concluída'] != 100]
                        df_condA = df_projeto[df_projeto['Condição'] == "A"]
                        df_condB = df_projeto[df_projeto['Condição'] == "B"]
                        df_condC = df_projeto[df_projeto['Condição'] == "C"]
                        df_condSempre = df_projeto[df_projeto['Condição'] == "Sempre"]
                        dadosNumeros = df_projeto['Número']

                        # NOVA LÓGICA CORRIGIDA E OTIMIZADA PARA OS DOCUMENTOS
                        if 'Documento Referência' in df_projeto.columns:
                            # Filtra os valores nulos e pega apenas os nomes únicos
                            lista_docRefs = df_projeto['Documento Referência'].dropna().unique().tolist()
                        else:
                            lista_docRefs = [] # Se a coluna não existe, a lista é vazia

                        if 'Como Fazer' in df_projeto.columns:
                            lista_comoFazer = df_projeto['Como Fazer'].dropna().unique().tolist()
                        else:
                            lista_comoFazer = [] # Se a coluna não existe, a lista é vazia
                        # FIM DA NOVA LÓGICA


                        encontrado = True
                        break
                if encontrado:
                    break
        
        if not encontrado:
            return jsonify({
                "status": "erro",
                "mensagem": f"O arquivo '{projetos_selecionados[0]}' não foi encontrado no servidor.",
                "codigo": 2
            }), 404
        
        # 3. Armazenar todos os dados do arquivo selecionado
        
        dadosCom100deConclusao = df_100.to_dict(orient='records')

        dadosMenorq100 = df_menorq100.to_dict(orient='records')

        dadosComCondicaoA = df_condA.to_dict(orient='records')
        dadosComCondicaoB = df_condB.to_dict(orient='records')
        dadosComCondicaoC = df_condC.to_dict(orient='records')
        dadosComCondicaoSempre = df_condSempre.to_dict(orient='records')

        qtdDados_100 = len(dadosCom100deConclusao)
        qtdDados_menorq100 = len(dadosMenorq100)

        qtdDadosCondA = len(dadosComCondicaoA)
        qtdDadosCondB = len(dadosComCondicaoB)
        qtdDadosCondC = len(dadosComCondicaoC)
        qtdDadosCondD = len(dadosComCondicaoSempre)

        qntdDados = qtdDadosCondA + qtdDadosCondB + qtdDadosCondC + qtdDadosCondD

        dados_atuais["qnt_dados"] = qntdDados
        dados_atuais["arquivos"] = projeto[0]
        dados_atuais["dados_igual_100"] = dadosCom100deConclusao
        dados_atuais["qntdDados_100"] = qtdDados_100
        dados_atuais["dados_menos_100"] = dadosMenorq100
        dados_atuais["qntdDados_menorq100"] = qtdDados_menorq100
        dados_atuais["qtdDeArquivosConA"] = qtdDadosCondA
        dados_atuais["qtdDeArquivosConB"] = qtdDadosCondB
        dados_atuais["qtdDeArquivosConC"] = qtdDadosCondC
        dados_atuais["qtdDeArquivosConSempre"] = qtdDadosCondD
        dados_atuais["docs_refs"] = lista_docRefs
        dados_atuais["docs_ComoFazer"] = lista_comoFazer
        dados_atuais["numeros"] = dadosNumeros

        # 4. Ler pergunta do usuario.
        pergunta_usuario = dados_js.get("pergunta_usuario", "")

        #3º - Ler conversa com segunda IA

        # 1️⃣ Lê as conversas dos últimos 5 minutos
        todas_conversas = ler_conversa_ultimos_5_minutos()

        # 2️⃣ Pede o resumo para a IA secundária
        resumo = resumir_conversa_pela_segIA(todas_conversas)

        # 3️⃣ Salva o resumo como arquivo JSON
        salvar_resumo(resumo)

        # 4️⃣ Passa o resumo para a IA principal
        resposta_da_ia = perguntar_para_ia(pergunta_usuario, dados_atuais, projeto[0], resumo)

        # 5️⃣ Salva a conversa atual normalmente
        salvar_conversa("usuario", pergunta_usuario, resposta_da_ia)


        #5. Indentificar a pergunta caso necessario

        # 7 Procurar documento de COMO FAZER com base na string sendo passada
        MARCADOR = f"#DOCUMENTO_SOLICITADO:"

        # Verifica se o marcador está na resposta
        if MARCADOR in resposta_da_ia:
            # Divide a string e pega o segundo elemento (o texto após o marcador)
            item = resposta_da_ia.split(MARCADOR, 1)

            # ATRIBUIÇÃO CORRETA: Sobrescreve o valor da string
            # Adicionado .strip() para limpar espaços em branco indesejados
            objeto_ser_procurado = item[1].strip()
            mensagem_da_ia = item[0].strip()

            match = re.search(r'(\d+)', pergunta_usuario)
            print(match)

        else: 
            # Se o marcador não for encontrado, você pode manter o valor anterior
            # ou definir um valor padrão, como uma string vazia.
            item = None
            objeto_ser_procurado = "" # Exemplo de como zerar a string
            mensagem_da_ia = resposta_da_ia

        trecho_achado = None  # <- garante que existe a variável
        caminho_achado = None
        nome_arquivo_achado = None

        if objeto_ser_procurado:
            achados = cruzarDadosPDF(objeto_ser_procurado, PDF_PATH)

            if achados and len(achados) > 0:
                trecho_achado = achados[0]['trecho']  # pega só o primeiro trecho
                caminho_achado = achados[0]['caminho']
                nome_arquivo_achado = achados[0]['arquivo']

                trecho_achado = trecho_achado.lower().capitalize().replace("\n", " ")
                nome_arquivo_achado = nome_arquivo_achado.replace("_", " ").replace(".pdf", "")

                for r in achados:
                    print(f"Arquivo: {r['arquivo']}\nPagina: {r['pagina']}\nTrecho: {r['trecho']}\nCaminho: {r['caminho']}")
            else:
                print('não achou nada')

            
                

        #6. Passar download do arquivo para o 
        return jsonify({"status": "sucesso",
                        "mensagem": f"{mensagem_da_ia}",
                        "item": f"{objeto_ser_procurado}",
                        "resultado_como_fazer": trecho_achado if trecho_achado else "",
                        "resultado_link": caminho_achado,
                        "nome_arquivo": nome_arquivo_achado,
                        "codigo": 0})

# --- CAMINHOS DE ERRO ---
    except AIGenerationError as e:
        # Erro de segurança, tokens, etc.
        print(f"LOG: Geração da IA interrompida: {e.reason}")
        return jsonify({"status": "error", "erro": "A IA não pôde gerar uma resposta."}), 503

    except AIResponseStructureError as e:
        # Bug nosso ou da API
        print(f"LOG: Estrutura da resposta inválida: {str(e)}")
        return jsonify({"status": "error", "erro": "Erro interno ao processar resposta da IA."}), 500
    
    except AIError as e:
        # Outro erro
        print(f"LOG: Erro genérico da IA: {str(e)}")
        return jsonify({"status": "error", "erro": "Erro desconhecido na IA."}), 500
    
csrf.exempt(chatbot_dados)

@app.route('/documento/<item>')
def documento(item):
    # Exemplo: renderizar uma página HTML com os detalhes
    return render_template('documento.html', item=item)



@app.route('/download_pdf', methods=['GET'])
def download_arquivo_pdf():
    # 1. Obtém o caminho do parâmetro 'path' da URL
    caminho_completo_raw = request.args.get('path')
    
    if not caminho_completo_raw:
        return jsonify({"erro": "Parâmetro 'path' ausente."}), 400

    # Normaliza o caminho para lidar com barras e garantir que seja absoluto
    caminho_completo = os.path.abspath(caminho_completo_raw)

    # 2. VERIFICAÇÃO DE SEGURANÇA (MUITO IMPORTANTE!)
    if not caminho_completo.startswith(PDF_PATH):
        return jsonify({"erro": "Acesso negado. O arquivo não está no diretório permitido."}), 403

    try:
        nome_arquivo = os.path.basename(caminho_completo)
        
        return send_file(
            caminho_completo, 
            as_attachment=True, 
            download_name=nome_arquivo
        )
    except FileNotFoundError:
        return jsonify({"erro": f"Arquivo não encontrado: {caminho_completo}"}), 404
    except Exception as e:
        return jsonify({"erro": f"Erro interno: {str(e)}"}), 500


csrf.exempt(download_arquivo_pdf)
