from flask import Flask
from flask_bcrypt import Bcrypt
from extensions import csrf, db
from views_chatbot import chatbot_bp

app = Flask(__name__)

csrf.init_app(app)

app.config.from_pyfile('config.py')

# Precisa criar um arquivo .py, IDEIA DE COMO CRIAR: 

##  INICIO  ##

# from urllib.parse import quote_plus
# import os
# from sqlalchemy import create_engine


# senha_login = quote_plus("senha_login_bd")
# nome_do_bd = f"{insira aq o bd criado}

# SECRET_KEY = 'senha_secreta'

# SQLALCHEMY_TRACK_MODIFICATIONS = False

# SQLALCHEMY_DATABASE_URI = \
#     '{SGBD}://{usuario}:{senha}@{servidor}/{database}'.format(
#         SGBD = 'mysql+mysqldb',
#         usuario = 'root',
#         senha = senha_login,
#         servidor = 'localhost:3306',
#         database = '{nome_do_bd}'
#     )

# engine = create_engine(SQLALCHEMY_DATABASE_URI)

# #caminho absoluta para a pasta de destino
# BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# UPLOAD_PATH = os.path.join(BASE_DIR, 'uploads')

# PDF_PATH = os.path.join(BASE_DIR, 'pdf_files')

# TEMP_PATH = os.path.join(BASE_DIR, 'temp_files')

# LOGS_PATH = os.path.join(BASE_DIR, 'logs')

# RESUMO_PATH = os.path.join(LOGS_PATH, 'resumo_files')

# DIALOGO_PATH = os.path.join(LOGS_PATH, 'dialogos_files')

# ALLOWED_EXTENSIONS = {'csv', 'xlsx'}

##  FIM  ##

db.init_app(app)

bcrypt = Bcrypt(app)

app.register_blueprint(chatbot_bp)

from views_index import *
from views_uploads import *
from views_user import *
from views_dados import *

if __name__  == '__main__':
    app.run(debug=True)