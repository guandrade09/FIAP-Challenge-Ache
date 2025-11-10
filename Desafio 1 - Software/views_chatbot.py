import os
import re
from extensions import csrf
from flask import request, jsonify
from config_chatbots import chatbot_bp, perguntar_para_ia, resumir_conversa_pela_segIA
from config import UPLOAD_PATH, PDF_PATH
import pandas as pd
from filtragemdados import tratar_dados_do_arquivo, cruzarDadosPDF
from utils import salvar_conversa, ler_conversa_ultimos_5_minutos, salvar_resumo, normalizar_objeto
from erros import *

# Rota principal para receber mensagens via POST
@chatbot_bp.route("/enviar", methods=["POST"])
def receber_mensagem():
    dados_js = request.get_json()
    pergunta_usuario = dados_js.get("mensagens", "")
    lista_arquivos = dados_js.get("arquivos", [])
    nomes_arquivos = dados_js.get("nomesArquivos", [])
    qtd_arquivos = len(lista_arquivos)
    dados_atuais = {}
    try:
        dfs = []
        arquivos = []

        if qtd_arquivos < 3 and qtd_arquivos != 0:

            for nome_arquivo in lista_arquivos:
                arquivos.append(nome_arquivo)
                caminho_completo = os.path.join(UPLOAD_PATH, nome_arquivo)
                if not os.path.exists(caminho_completo):
                    return jsonify({"status": "sucesso",
                                    "mensagem": f"Não existe dados a serem lidos, por favor insira alguma planilha para leitura e analise dos dados!",
                                    "codigo": 2}), 402

                # Padroniza colunas para cada DataFrame lido
                df = tratar_dados_do_arquivo(caminho_completo)

                dfs.append(df)

            # Após o for, concatena os dfs se houver
            if dfs:
                df_geral = pd.concat(dfs, ignore_index=True)
                df_geral = df_geral.sort_values(by=['número', '%_concluída'], ascending=[True, False])
                df_100 = df_geral[df_geral['%_concluída'] == 100]
                df_menorq100 = df_geral[df_geral['%_concluída'] != 100]
                dadosComCondicaoA = df_geral[df_geral['condição'] == "A"]
                dadosComCondicaoB = df_geral[df_geral['condição'] == "B"]
                dadosComCondicaoC = df_geral[df_geral['condição'] == "C"]
                dadosComCondicaoSempre = df_geral[df_geral['condição'] == "Sempre"]
                dadosNumeros = df_geral['número']

                                # NOVA LÓGICA CORRIGIDA E OTIMIZADA PARA OS DOCUMENTOS
                if 'documento_referência' in df_geral.columns:
                    # Filtra os valores nulos e pega apenas os nomes únicos
                    lista_docRefs = df_geral['documento_referência'].dropna().unique().tolist()
                else:
                    lista_docRefs = [] # Se a coluna não existe, a lista é vazia

                if 'como_fazer' in df_geral.columns:
                    lista_comoFazer = df_geral['como_fazer'].dropna().unique().tolist()
                else:
                    lista_comoFazer = [] # Se a coluna não existe, a lista é vazia
                # FIM DA NOVA LÓGICA

                dadosCom100deConclusao = df_100.to_dict(orient='records')
                dadosMenorq100 = df_menorq100.to_dict(orient='records')
                
                qtdDados_100 = len(dadosCom100deConclusao)
                qtdDados_menorq100 = len(dadosMenorq100)

                qtdDadosCondA = len(dadosComCondicaoA)
                qtdDadosCondB = len(dadosComCondicaoB)
                qtdDadosCondC = len(dadosComCondicaoC)
                qtdDadosCondD = len(dadosComCondicaoSempre)

                qntdDados = qtdDadosCondA + qtdDadosCondB + qtdDadosCondC + qtdDadosCondD

                dados_atuais["qnt_dados"] = qntdDados
                dados_atuais["arquivos"] = nomes_arquivos
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
                dados_atuais['numeros'] = dadosNumeros

            # 1️⃣ Lê as conversas dos últimos 5 minutos
            todas_conversas = ler_conversa_ultimos_5_minutos()

            # 2️⃣ Pede o resumo para a IA secundária
            resumo = resumir_conversa_pela_segIA(todas_conversas)

            # 3️⃣ Salva o resumo como arquivo JSON
            salvar_resumo(resumo)

            # 4️⃣ Passa o resumo para a IA principal
            resposta_da_ia = perguntar_para_ia(pergunta_usuario, dados_atuais, nomes_arquivos, resumo)

            # 5️⃣ Salva a conversa atual normalmente
            salvar_conversa("usuario", pergunta_usuario, resposta_da_ia)



            # 6 Conferir se existe hiperlink na coluna de DOCREF
            # hyperlinks = []
            # for arq in lista_arquivos:
            #     caminho = os.path.join(UPLOAD_PATH, arq)
            #     hyperlinks.extend(extrair_hyperlinks(caminho, "documento_referência"))
            #     links_encontrados = extrair_hyperlinks_sharepoint(caminho, "documento_referência")
                
            # print(links_encontrados)
            # print("🔗 LINKS DETECTADOS:", hyperlinks)


            # 7 Procurar documento de COMO FAZER com base na string sendo passada
            print(F"RESPOSTA DA IA: {resposta_da_ia}")
            MARCADOR = f"#DOCUMENTO_SOLICITADO:"

            # Verifica se o marcador está na resposta
            if MARCADOR in resposta_da_ia:
                # Divide a string e pega o segundo elemento (o texto após o marcador)
                item = resposta_da_ia.split(MARCADOR, 1)

                # ATRIBUIÇÃO CORRETA: Sobrescreve o valor da string
                # Adicionado .strip() para limpar espaços em branco indesejados
                objeto_ser_procurado_raw = item[1].strip()
                objeto_ser_procurado = normalizar_objeto(objeto_ser_procurado_raw)
                mensagem_da_ia = item[0].strip()

            else: 
                # Se o marcador não for encontrado, você pode manter o valor anterior
                # ou definir um valor padrão, como uma string vazia.
                item = None
                objeto_ser_procurado = "" # Exemplo de como zerar a string
                mensagem_da_ia = resposta_da_ia

            trecho_achado = None  # <- garante que existe a variável
            caminho_achado = None
            nome_arquivo_achado = None

            if not objeto_ser_procurado:
                # IA não passou um marcador válido → não procurar
                trecho_achado = ""
                caminho_achado = ""
                nome_arquivo_achado = ""

            else:
                achados = cruzarDadosPDF(objeto_ser_procurado, PDF_PATH)
                if achados:
                    vistos = set()
                    for ref in achados:
                        chave = (ref['arquivo'], ref['trecho'].strip().lower())
                        if chave not in vistos:
                            vistos.add(chave)
                            trecho_achado = ref['trecho'].strip().lower().capitalize().replace("\n", " ")
                            caminho_achado = ref['caminho']
                            nome_arquivo_achado = ref['arquivo'].replace("_", " ").replace(".pdf", "")
                            break

                        # (opcional) apenas 1 print real
                        print(f"Arquivo: {chave['arquivo']}\nPagina: {chave('pagina')}\nTrecho: {chave['trecho']}\nCaminho: {chave['caminho']}")
                        print(f"MENSAGEM DA IA:\n{mensagem_da_ia}")
                        print('não achou nada')

            return jsonify({"status": "sucesso",
                        "mensagem": f"{mensagem_da_ia}",
                        "item": f"{objeto_ser_procurado}",
                        "resultado_como_fazer": trecho_achado if trecho_achado else "",
                        "resultado_link": caminho_achado,
                        "nome_arquivo": nome_arquivo_achado,
                        "codigo": 0})
    
        elif len(lista_arquivos) >= 3:
            return jsonify({"status" : "sucesso",
                            "mensagem": "⚠️ Limite de 2 arquivos por leitura!",
                            "codigo": 3
            })
        else:
            return jsonify({"status": "sucesso",
                    "mensagem": "⚠️ Você ainda não selecionou nenhum arquivo. Escolha um da lista para continuar!",
                    "codigo": 1})

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

csrf.exempt(chatbot_bp)