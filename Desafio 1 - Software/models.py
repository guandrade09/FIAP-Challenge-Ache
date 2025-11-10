from extensions import db

class Projeto(db.Model):
    __tablename__ = 'tarefas'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nomeArquivo = db.Column(db.String(255), nullable=False)
    numero = db.Column(db.String(10), nullable=False)
    classificacao = db.Column(db.String(100), nullable=False)
    categoria = db.Column(db.String(100), nullable=False)
    fase = db.Column(db.String(100), nullable=False)
    condicao = db.Column(db.String(100), nullable=False)
    nome = db.Column(db.String(255), nullable=False)
    duracao = db.Column(db.String(100), nullable=False)
    
    # Aqui você informa o nome correto no banco (snake_case)
    comoFazer = db.Column('comoFazer', db.String(500), nullable=False)
    docReferencia = db.Column('docRef', db.String(225), nullable=False)
    porcentagemConcluida = db.Column('porcConcluida', db.Integer, nullable=False)

    def __repr__(self):
        return '<Name %r>' % self.name
    
class Usuarios(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email = db.Column(db.String(50), nullable=False)
    nome = db.Column(db.String(20), nullable=False)
    senha = db.Column(db.String(100), nullable=False)

    def __repr__(self):
        return '<Name %r>' % self.name