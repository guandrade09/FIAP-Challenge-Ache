from dotenv import load_dotenv
import os
import google.generativeai as genai
from google.generativeai.types import Tool, FunctionDeclaration
from flask import Blueprint
from erros import *
from utils import formatar_conversa_para_texto
import time
from typing import Annotated

# Carrega variáveis de ambiente
load_dotenv()

CHAVE_API_GOOGLE = os.getenv("GEMINI_API_KEY")
CHAVE_API_OUTRA = os.getenv("GEMINI_API_KEY_VINI")
CHAVE_API_RESERVA = os.getenv("GEMINI_API_KEY_GUSTAVO")
CHAVE_API_RESERVA_2 = os.getenv("GEMINI_API_KEY_EXTRA")

# Blueprint para organização
chatbot_bp = Blueprint("chatbot", __name__)

def buscar_documentos(
    nome_documento_a_procurar: Annotated[str, "Nome exato ou parcial do documento a ser encontrado"],
    contexto_docs: Annotated[dict, "Dicionário contendo listas de documentos de referência e 'texto' e o numéro para auxilío."]
) -> str:
    """
    Busca um documento no contexto atual de dados.
    Retorna o nome exato se for encontrado.
    """

    nome_procurado_normalizado = nome_documento_a_procurar.strip().lower()
    listas_documentos = [
        contexto_docs.get('numeros', []),
        contexto_docs.get('docs_refs', []),
        contexto_docs.get('docs_ComoFazer', [])
    ]
    
    for lista in listas_documentos:
        if isinstance(lista, list):
            for nome_documento in lista:
                nome_normalizado = nome_documento.lower().strip()
                if nome_procurado_normalizado in nome_normalizado:
                    return f"Documento encontrado com sucesso: {nome_documento}"
    
    return f"Documento não encontrado. Item buscado: '{nome_documento_a_procurar}'."

buscar_documentos_tool = Tool(
    function_declarations=[
        FunctionDeclaration(
            name="buscar_documentos",
            description="Busca um documento de referência ou 'texto' com base no nome ou código do item use o numero para auxilio.",
            parameters={
                "type": "object",
                "properties": {
                    "nome_documento_a_procurar": { # Argumento correto
                        "type": "string",
                        "description": "Nome exato ou parcial do documento que o usuário está perguntando."
                    }
                },
                "required": ["nome_documento_a_procurar"]
            }
        )
    ]
)
# ========================
# IA PRINCIPAL (projetos)
# ========================
genai.configure(api_key=CHAVE_API_RESERVA_2) # <-- SÓ TROCAR A API KEY AQ

prompt_sistema = "Você é um auxiliar de gerenciamento de projetos contente e educado."

configuracao_modelo_comunicacao = {
    "temperature": 0.8,
    "top_p": 1.0,
    "top_k": 100,
    "max_output_tokens": 1024
}

modelo_primeiro = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    system_instruction=prompt_sistema,
    generation_config=configuracao_modelo_comunicacao,
    tools=[buscar_documentos_tool]
)


def perguntar_para_ia(pergunta_usuario, contexto_dados, nome_arquivo="", resumo=""):
    def extrair_valor(v):
        """Tratamento universal de valores de args"""
        if hasattr(v, "string_value"):
            return v.string_value
        if hasattr(v, "number_value"):
            return v.number_value
        if hasattr(v, "bool_value"):
            return v.bool_value
        return str(v)
    prompt_final = f"""
## CONTEXTO DOS DADOS
Abaixo estão os dados de gerenciamento de projeto atuais:

* Total de Dados: {contexto_dados.get('qnt_dados', 'N/A')}
* Todos os Números: {contexto_dados.get('numeros', 'N/A')}
* Nome dos Projetos/Arquivos: {nome_arquivo}
* Dados 100% Concluídos: {contexto_dados.get('dados_igual_100', 'N/A')}
* Quantidade 100% Concluídos: {contexto_dados.get('qntdDados_100', 0)}
* Dados Não Concluídos (!= 100%): {contexto_dados.get('dados_menos_100', 'N/A')}
* Quantidade Não Concluídos: {contexto_dados.get('qntdDados_menorq100', 0)}
* Condição A: {contexto_dados.get('qtdDeArquivosConA', 0)}
* Condição B: {contexto_dados.get('qtdDeArquivosConB', 0)}
* Condição C: {contexto_dados.get('qtdDeArquivosConC', 0)}
* Condição SEMPRE: {contexto_dados.get('qtdDeArquivosConSempre', 0)}
* Coluna 'Como Fazer': {contexto_dados.get('docs_ComoFazer')}
* Coluna 'Documentos de Referencia': {contexto_dados.get('docs_refs')}

## HISTÓRICO DE CONVERSA (RESUMO)
{resumo}

## INSTRUÇÕES
Responda de forma educada, apenas com base no contexto e histórico acima.
Não invente informações e evite formatação com asteriscos (*).

# NOVA REGRAS CRÍTICAS
1. Caso seja uma pergunta que não envolva "Como Fazer" ou "Documento de referencia", apenas responda a pergunta com base nos dados passado anteriormente!
2. Se o usuário mencionar qualquer nome de documento, item, ID, referência ou código, use a ferramenta "buscar_documentos" com o nome exato mencionado, comparando com as listas 'docs_refs' e 'docs_ComoFazer' do contexto.
3. Identificar o trecho de "COMO FAZER" ou "REFERÊNCIA" mais relevante para a `PERGUNTA` do usuário, caso exista nos dados USE! **sem citar o `HISTÓRICO DE CONVERSA (RESUMO)` na saída.**
4. **Restrição CRÍTICA de Saída:** **NUNCA** inclua, cite ou repita qualquer conteúdo do `HISTÓRICO DE CONVERSA (RESUMO)` ou dos `CONTEXTO DOS DADOS` na sua resposta. O texto deve ser novo e conciso.
5.  **Formato de Controle (PARA O CÓDIGO):** A **ÚLTIMA LINHA** da sua resposta **DEVE ser o marcador de controle** para a busca. Use apenas o trecho de referência/busca mais curto possível.

**FORMATO DE SAÍDA OBRIGATÓRIO (COM QUEBRA DE LINHA CRÍTICA):**

A resposta deve ser composta de **DUAS LINHAS SEPARADAS**.

LINHA 1: [MENSAGEM CONSISA E EDUCADA AO USUÁRIO FINAL]
LINHA 2: #[MARCADOR DE CONTROLE]

**EXEMPLO OBRIGATÓRIO (para "Quero saber o como fazer do número 6"):**
#DOCUMENTO_SOLICITADO: Texto.6

**Em caso de Dúvida ou Não Encontrado:**

* Se houver dados informados nos dados utilize-os.
* Se a pergunta não puder ser mapeada para um trecho de busca relevante, neste caso, **NÃO** retorne a string `#DOCUMENTO_SOLICITADO:`, retorne ``


## PERGUNTA
{pergunta_usuario}
"""
    prompt_com_historico = [prompt_final]
    
    try:
        # 1. PRIMEIRA CHAMADA
        response = modelo_primeiro.generate_content(prompt_com_historico)
        # print("DEBUG → Tipo de resposta:", type(response))

        # Inicializa resposta_final com o resultado da primeira chamada.
        # Se nenhuma função for chamada, esta será a resposta final.
        resposta_final = response 
        
        # Verifica se o modelo quer chamar uma função
        if (response.candidates and
            response.candidates[0].content.parts and
            hasattr(response.candidates[0].content.parts[0], "function_call")):

            funcao = response.candidates[0].content.parts[0].function_call
            nome = funcao.name
            args = {} # Inicializa args para evitar erros de escopo
            if funcao.args:
                args = {k: extrair_valor(v) for k, v in funcao.args.items()}

            if nome == "buscar_documentos":
                
                # ... (Sua lógica de execução de buscar_documentos para obter 'resultado') ...
                # Garanta que a chave 'nome_documento_a_procurar' exista, usando .get()
                nome_doc_a_proprocurar = args.get("nome_documento_a_procurar")
                
                if nome_doc_a_proprocurar:
                    resultado = buscar_documentos(
                        nome_documento_a_procurar=nome_doc_a_proprocurar,
                        contexto_docs=contexto_dados
                    )
                else:
                    resultado = "Documento não encontrado. O nome não foi especificado."


                # --- LÓGICA DE SEGUNDA CHAMADA (Mantendo sua sintaxe de dicionário) ---
                user_turn_dict = {"role": "user", "parts": [{"text": prompt_final}]}
                
                # 2. Constrói a chamada da IA (Turno do Modelo)
                model_function_call_dict = {
                    "role": "model",
                    "parts": [{
                        "function_call": {
                            "name": nome,
                            "args": args
                        }
                    }]
                }

                # 3. Constrói o resultado da função (Turno da Função)
                function_response_dict = {
                    "role": "function", 
                    "parts": [{
                        "function_response": {
                            "name": nome, 
                            "response": {
                                "resultado": resultado 
                            }
                        }
                    }]
                }

                historico_para_segunda_chamada = [
                    user_turn_dict, 
                    model_function_call_dict,
                    function_response_dict
                ]

                # 4. SEGUNDA CHAMADA: Sobrescreve 'resposta_final'
                resposta_final = modelo_primeiro.generate_content(contents=historico_para_segunda_chamada)
                
                # Se o documento foi encontrado, anexe a tag (você precisará desta lógica)
                nome_arquivo_encontrado = None
                if "Documento encontrado com sucesso:" in resultado:
                    nome_arquivo_encontrado = resultado.replace("Documento encontrado com sucesso:", "").strip()
                
                # Lógica de Retorno para o caso de função (retorna o texto da resposta_final)
                if hasattr(resposta_final, "text") and resposta_final.text:
                    texto_resposta = resposta_final.text.strip()
                    if nome_arquivo_encontrado:
                        return f"{texto_resposta} #DOCUMENTO_SOLICITADO:{nome_arquivo_encontrado}"
                    return texto_resposta
                return resultado # Fallback, se a IA não responder, retorna o resultado da busca

        # 5. CASO NÃO HAJA CHAMADA DE FUNÇÃO (Usa o 'resposta_final' da linha 17)
        if hasattr(resposta_final, "text") and resposta_final.text:
            return resposta_final.text.strip()

        print("⚠️ A IA não retornou texto compreensível.")
        return perguntar_para_ia(pergunta_usuario, contexto_dados, nome_arquivo="", resumo="")

    except Exception as e:
        print("❌ Erro interno da IA:", e)
        return f"Erro interno da IA: {e}"


# ===========================
# IA SECUNDÁRIA (resumo)
# ===========================
# Cria um cliente separado para evitar conflito de chave

configuracao_modelo_analista = {
    "temperature": 0.2,
    "top_p": 0.9,
    "top_k": 64,
    "max_output_tokens": 1024,
    "response_mime_type": "application/json" # O MAIS IMPORTANTE
}

cliente_secundario = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    system_instruction="Sou um leitor de conversa e faço um breve resumo da conversa em formato JSON.",
    generation_config=configuracao_modelo_analista
)

def resumir_conversa_pela_segIA(conversas):
    try:
        # Se for lista de blocos JSON, transforma em texto legível
        if isinstance(conversas, list):
            texto_conversa = formatar_conversa_para_texto(conversas)
        else:
            texto_conversa = str(conversas)

        prompt = f"""
        Você é um assistente que lê conversas entre um usuário e uma IA.
        Faça um breve resumo da conversa, em formato JSON, com os campos:
        - "assuntos_relevantes": lista dos principais temas discutidos
        - "acoes_da_IA": resumo do que a IA fez (respostas, avisos, etc.)
        - "progresso_geral": status geral do projeto (se aplicável)
        - "observacoes": observações extras úteis para entender o histórico

        Conversa completa:
        {texto_conversa}
        """

        resposta = cliente_secundario.generate_content(prompt)
        return resposta.text.strip()

    except Exception as e:
        erro_str = str(e)
        if "429" in erro_str:
            print("⚠️ Limite de requisições atingido. Aguardando 15 segundos...")

            time.sleep(15)
            # tenta novamente uma única vez
            return resumir_conversa_pela_segIA(conversas)
        raise AIError(f"Erro ao resumir conversa: {erro_str}")