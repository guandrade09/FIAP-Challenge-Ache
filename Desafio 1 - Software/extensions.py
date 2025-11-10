from flask_wtf.csrf import CSRFProtect
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

csrf = CSRFProtect()