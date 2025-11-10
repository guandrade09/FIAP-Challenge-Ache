import os
import re
from datetime import datetime, timedelta
from config import DIALOGO_PATH, RESUMO_PATH
import json
import shutil

#LISTAGEM DE ARQUIVOS PARA PAGINA DE LISTA DE ARQUIVOS !FINALIZADO!
def lista_arquivos(pasta_base):

    pasta = os.path.join(os.getcwd(), pasta_base)
    nome_ignorado = 'Modelo.xlsx'
    arquivos = []

    for root, dirs, files in os.walk(pasta):
        for file in files:
            # Ignora o arquivo modelo
            if file == nome_ignorado:
                continue

            caminho_absoluto = os.path.join(root, file)
            caminho_relativo = os.path.relpath(caminho_absoluto, pasta)
            lista_nomes = caminho_relativo.split("\\")
            lista_nomes = lista_nomes[-1]
            extensao = lista_nomes.split(".")
            extensao = extensao[1]


            lista_nomes = lista_nomes.replace("_", " ").replace(".xlsx", "").replace(".pdf", "")

            arquivos.append({
                'caminho': caminho_relativo.replace('\\', '/'),
                'nome': lista_nomes,
                'extensao': f".{extensao}"
            })

    # Ordena numericamente
    arquivos.sort(
        key=lambda x: int(re.search(r'n(\d+)', x['caminho']).group(1))
        if re.search(r'n(\d+)', x['caminho']) else float('inf')
    )

    return arquivos

#CONTADOR DE ARQUIVOS DA LISTA DE ARQUIVOS !FINALIZADO!
def contar_projetos(pasta_base):
    maior_numero = 0
    for raiz, subpastas, arquivos in os.walk(pasta_base):
        for arquivo in arquivos:
            # tenta capturar números no final do nome do arquivo
            match = re.search(r'(\d+)', arquivo)
            if match:
                numero = int(match.group(1))
                if numero > maior_numero:
                    maior_numero = numero
    
    # se não encontrou nenhum, começa em 1
    return maior_numero + 1

#FUNÇÃO APENAS PARA LIMPAR O CACHE VAZIO ARMAZENADO !FINALIZADO!
def limpaCacheArquivo(pasta_base):
    agora = datetime.now()
    
    ano_atual_str = f"{agora.year}" 
    mes_atual_str = f"{agora.month:02d}" 
    dia_atual_str = f"{agora.day:02d}" 

    print(f"DEBUG → Data de hoje a manter: {ano_atual_str}/{mes_atual_str}/{dia_atual_str}")

    try:
        itens_na_raiz = os.listdir(pasta_base)
    except FileNotFoundError:
        print(f"A pasta base não foi encontrada: {pasta_base}")
        return
    except OSError as e:
        print(f"Erro ao acessar a pasta base: {e}")
        return

    # A. PERCORRE OS ANOS (Primeiro Nível: YYYY)
    for ano_dir in itens_na_raiz:
        caminho_ano = os.path.join(pasta_base, ano_dir)

        # 1. FILTRO CRÍTICO DE VALIDAÇÃO: 
        # Só processa se for um diretório E tiver exatamente 4 dígitos.
        if not os.path.isdir(caminho_ano) or not ano_dir.isdigit() or len(ano_dir) != 4:
            print(f"DEBUG → Ignorando item na raiz (Não é uma pasta de ano): {ano_dir}")
            continue

        # Lógica de Remoção de Ano Anterior
        if ano_dir < ano_atual_str:
            print(f"Removendo Ano Antigo (Completo): {caminho_ano}")
            try:
                shutil.rmtree(caminho_ano)
            except OSError as e:
                print(f"Erro ao remover {caminho_ano}: {e}")
            continue

        # ------------------------------------------------------------------
        # Se chegou até aqui, o ano é o atual. Entra no nível do MÊS (MM)
        # ------------------------------------------------------------------
        
        try:
            itens_no_mes = os.listdir(caminho_ano)
        except OSError as e:
            print(f"Erro ao acessar {caminho_ano}: {e}")
            continue

        # B. PERCORRE OS MESES (Segundo Nível: MM)
        for mes_dir in itens_no_mes:
            caminho_mes = os.path.join(caminho_ano, mes_dir)
            
            # 2. FILTRO CRÍTICO DE VALIDAÇÃO: 
            # Só processa se for um diretório E tiver exatamente 2 dígitos.
            if not os.path.isdir(caminho_mes) or not mes_dir.isdigit() or len(mes_dir) != 2:
                print(f"DEBUG → Ignorando item em {ano_dir} (Não é uma pasta de mês): {mes_dir}")
                continue

            # Lógica de Remoção de Mês Anterior
            if mes_dir < mes_atual_str:
                print(f"Removendo Mês Antigo no Ano Atual: {caminho_mes}")
                try:
                    shutil.rmtree(caminho_mes)
                except OSError as e:
                    print(f"Erro ao remover {caminho_mes}: {e}")
                continue
            
            # ------------------------------------------------------------------
            # Se chegou aqui, o Mês é o atual. Entra no nível do DIA (DD)
            # ------------------------------------------------------------------

            # C. PERCORRE OS DIAS (Terceiro Nível: DD)
            for dia_dir in os.listdir(caminho_mes):
                caminho_dia = os.path.join(caminho_mes, dia_dir)

                # 3. FILTRO CRÍTICO DE VALIDAÇÃO: 
                if not os.path.isdir(caminho_dia) or not dia_dir.isdigit() or len(dia_dir) != 2:
                    continue 

                # Lógica de Remoção de Dia Anterior
                if dia_dir < dia_atual_str:
                    print(f"Removendo Dia Antigo no Mês Atual: {caminho_dia}")
                    try:
                        shutil.rmtree(caminho_dia)
                    except OSError as e:
                        print(f"Erro ao remover {caminho_dia}: {e}")
                        
                elif dia_dir == dia_atual_str:
                    print(f"Manutenção: Pasta do dia de hoje '{caminho_dia}' será mantida.")
                    
            # D. LIMPEZA DE PASTAS DE MÊS VAZIAS
            # Verifica se a pasta do Mês ficou vazia e não é o mês atual
            if not os.listdir(caminho_mes) and mes_dir != mes_atual_str:
                print(f"Removendo pasta de Mês vazia: {caminho_mes}")
                try:
                    os.rmdir(caminho_mes)
                except OSError as e:
                    print(f"Erro ao remover pasta vazia {caminho_mes}: {e}")

        # E. LIMPEZA DE PASTAS DE ANO VAZIAS
        # Após limpar os meses, verifica se a pasta do Ano ficou vazia e não é o ano atual
        if not os.listdir(caminho_ano) and ano_dir != ano_atual_str:
            print(f"Removendo pasta de Ano vazia: {caminho_ano}")
            try:
                os.rmdir(caminho_ano)
            except OSError as e:
                print(f"Erro ao remover pasta vazia {caminho_ano}: {e}")

    # Não há risco de remover a pasta_base aqui, pois o código só remove subdiretórios.
    print(f"Concluída a limpeza em {pasta_base}. Pasta base não foi removida.")



#FUNÇÃO PARA SALVAR LOGS EM JSON COM ESTRUTURA HIERARQUICA !FINALIZADO!
def salvar_conversa(usuario, mensagem, resposta):
    agora = datetime.now()
    ano = str(agora.year)
    mes = f"{agora.month:02d}"
    dia = f"{agora.day:02d}"
    hora = f"{agora.hour:02d}"
    minutos = f"{agora.minute:02d}"

    criar_pasta = os.path.join(DIALOGO_PATH, ano, mes, dia)
    os.makedirs(criar_pasta, exist_ok=True)

    nome_arquivo = f'log_conversa_h{hora}-m{minutos}.json'
    caminho_arquivo = os.path.join(criar_pasta, nome_arquivo)
    
    conversa = {
        "conversa": [
            {"papel": "usuario", "nome": usuario, "mensagem": mensagem},
            {"papel": "assistente", "nome": "AcheIA", "mensagem": resposta}
        ]
    }

    with open(caminho_arquivo, "a", encoding="utf-8") as f:
        json.dump(conversa, f, ensure_ascii=False)
        f.write("\n")  # separa conversas no arquivo JSONL
    
    return caminho_arquivo


def ler_conversa_ultimos_5_minutos():
    """
    Lê apenas os arquivos de conversa criados nos últimos 3 minutos.
    Retorna uma lista de blocos JSON (cada linha = um diálogo salvo).
    """
    conversas = []
    agora = datetime.now()
    limite_tempo = agora - timedelta(minutes=3)

    for raiz, _, arquivos in os.walk(DIALOGO_PATH):
        for arquivo in arquivos:
            if not arquivo.endswith(".json"):
                continue

            # Extrai hora e minuto do nome do arquivo (ex: log_conversa_h19-m24.json)
            try:
                partes = arquivo.split("_")
                for parte in partes:
                    if parte.startswith("h") and "-m" in parte:
                        hora = int(parte[1:3])
                        minuto = int(parte.split("-m")[1].split(".")[0])
                        break
                else:
                    continue  # se não encontrar o padrão, pula o arquivo

                # Extrai data da estrutura de pastas (ano/mes/dia)
                partes_pasta = raiz.split(os.sep)
                ano, mes, dia = map(int, partes_pasta[-3:])

                data_arquivo = datetime(ano, mes, dia, hora, minuto)

                # Se o arquivo for mais recente que o limite, lê
                if data_arquivo >= limite_tempo:
                    caminho_arquivo = os.path.join(raiz, arquivo)
                    with open(caminho_arquivo, "r", encoding="utf-8") as f:
                        for linha in f:
                            linha = linha.strip()
                            if not linha:
                                continue
                            try:
                                bloco = json.loads(linha)
                                conversas.append(bloco)
                            except json.JSONDecodeError:
                                print(f"⚠️ Erro ao decodificar JSON: {caminho_arquivo}")
            except Exception as e:
                print(f"⚠️ Erro ao processar nome do arquivo '{arquivo}': {e}")

    return conversas

def formatar_conversa_para_texto(conversas):
    texto = ""
    for bloco in conversas:
        if "conversa" in bloco:
            for linha in bloco["conversa"]:
                texto += f"{linha['papel']}: {linha['mensagem']}\n"
    return texto.strip()

def salvar_resumo(resumo_texto):
    agora = datetime.now()
    ano = str(agora.year)
    mes = f"{agora.month:02d}"
    dia = f"{agora.day:02d}"

    pasta_dia = os.path.join(RESUMO_PATH, ano, mes, dia)
    os.makedirs(pasta_dia, exist_ok=True)

    caminho_resumo = os.path.join(pasta_dia, f"resumo_h{agora.hour:02d}-m{agora.minute:02d}.json")

    with open(caminho_resumo, "w", encoding="utf-8") as f:
        json.dump({"resumo": resumo_texto, "gerado_em": agora.isoformat()}, f, ensure_ascii=False, indent=2)

    return caminho_resumo


def normalizar_objeto(obj):
    if not obj:
        return ""
    
    obj = obj.strip()

    # 1) Se já está no formato correto: Texto.9, Texto9, Texto 9 → normaliza
    padrao = re.search(r"(texto\.?\s?\d+)", obj, re.IGNORECASE)
    if padrao:
        return padrao.group(1).replace(" ", "").replace("Texto", "Texto.").lower().capitalize()

    # 2) Se IA retornou uma frase longa → ignorar
    if len(obj.split()) > 3:  
        return ""

    return obj
