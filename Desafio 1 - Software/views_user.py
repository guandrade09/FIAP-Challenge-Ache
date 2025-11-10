from server import app
from flask import render_template, request, session, flash, redirect, url_for
from helpers import FormularioUsuario
from models import Usuarios
from flask_bcrypt import check_password_hash

@app.route('/login')
def login():
    form = FormularioUsuario()
    return render_template('codexis/login.html', form=form)

@app.route('/autenticar', methods=['POST',])
def autenticar():
    form = FormularioUsuario(request.form)

    usuario = Usuarios.query.filter_by(email=form.email.data).first()

    senha = check_password_hash(usuario.senha, form.senha.data)
    
    if usuario and senha:
        session['usuario_logado'] = usuario.nome
        flash(session['usuario_logado'] + ' logado com sucesso')
        return redirect(url_for('index'))
    else:
        flash("Email ou senha invalido!")
        return redirect(url_for('login'))


@app.route('/logout')
def logout():
    session['usuario_logado'] = None
    flash('Logout efetuado com sucesso!')
    return redirect(url_for('login'))