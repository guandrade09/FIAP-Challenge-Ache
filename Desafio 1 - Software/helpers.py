import os
from wtforms import StringField, validators, SubmitField, PasswordField
from flask_wtf import FlaskForm
from datetime import datetime
from config import UPLOAD_PATH

class FormularioUsuario(FlaskForm):
    email = StringField('Email', [validators.DataRequired(), validators.Length(min=1, max=40)])
    senha = PasswordField('Senha', [validators.DataRequired(), validators.Length(min=1, max=100)])
    login = SubmitField('Salvar')

#VERIFICAR SE EXISTE CONTEUDO DENTRO DO ARQUIVO !FINALIZADO!
def verificar_vazio(arquivo):
    import pandas as pd
    
    filename = arquivo.filename

    try:
        if filename.endswith('.xlsx'):
            df = pd.read_excel(arquivo)
        elif filename.endswith('.csv'):
            df = pd.read_csv(arquivo)
        else:
            return True  # trata como vazio se extensão não for aceita
    except Exception as e:
        print(f"[ERRO] Falha ao ler o arquivo: {e}")
        return True
    
    # Reposiciona o ponteiro para o início, para permitir salvar depois
    arquivo.stream.seek(0)

    # Verifica se há pelo menos uma linha após o cabeçalho
    return df.dropna(how='all').shape[0] <= 0

#FUNÇÃO PARA ENCONTRAR ARQUIVOS !FINALIZADO!
def encontrar_caminho_completo(nome_arquivo, pasta_base):
    for root, dirs, files in os.walk(pasta_base):
        if nome_arquivo in files:
            return os.path.join(nome_arquivo, root)
    return None