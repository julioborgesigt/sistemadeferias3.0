// controllers/authController.js (VERSÃO DE DEBUG AVANÇADO)
const bcrypt = require('bcrypt');
const { Admin } = require('../models');

function loginForm(req, res) {
 
  res.render('login');
}

async function login(req, res) {

  try {
    const { email, password } = req.body;
   

    const admin = await Admin.findOne({ where: { email } });

    if (!admin) {
     
      req.flash('error_msg', 'Email ou senha inválidos.');
      return res.redirect('/auth/login');
    }

  
    const isPasswordMatch = await bcrypt.compare(password, admin.password);

    if (!isPasswordMatch) {
      
      req.flash('error_msg', 'Email ou senha inválidos.');
      return res.redirect('/auth/login');
    }

   
    req.session.admin = {
      id: admin.id,
      email: admin.email,
      nome: admin.nome
    };

    req.session.save((err) => {
      if (err) {
        console.error('--- [CONTROLLER]: ERRO AO SALVAR SESSÃO!', err);
        req.flash('error_msg', 'Ocorreu um erro ao iniciar a sessão.');
        return res.redirect('/auth/login');
      }
    
      res.redirect('/users/dashboard');
    });

  } catch (error) {
    console.error("--- [CONTROLLER]: ERRO INESPERADO NO BLOCO TRY/CATCH:", error);
    req.flash('error_msg', 'Ocorreu um erro inesperado.');
    res.redirect('/auth/login');
  }
}

function logout(req, res) {

  req.session.destroy(err => {
    if (err) {
      console.error("Erro ao fazer logout:", err);
    }
    res.redirect('/auth/login');
  });
}

module.exports = {
  loginForm,
  login,
  logout,
};  