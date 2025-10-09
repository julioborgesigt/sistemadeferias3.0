// createAdmin.js (Corrigido)

// ADICIONADO: Esta linha carrega as variáveis do arquivo .env
// e garante que o script use as credenciais de 'production'.
require('dotenv').config();

const readline = require('readline');
const bcrypt = require('bcrypt');
const db = require('./models');
const Admin = db.Admin;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Digite o email do admin (ex: driguatu@gmail.com): ', (email) => {
  rl.question('Digite o nome do admin (ex: Administrador): ', (nome) => {
    rl.question('Digite a NOVA senha do admin: ', async (password) => {
      if (!password) {
        console.error('A senha não pode ser vazia.');
        rl.close();
        return;
      }
      try {
        await db.sequelize.authenticate(); // Testa a conexão primeiro
       

        const existingAdmin = await Admin.findOne({ where: { email } });
        
        if (existingAdmin) {
        
          // A senha será hasheada automaticamente pelo hook do model
          await existingAdmin.update({ password: password, nome: nome });
          
        } else {
       
          // A senha será hasheada automaticamente pelo hook do model
          await Admin.create({ email, nome, password: password });
        
        }
      } catch (error) {
        console.error('Ocorreu um erro:', error);
      } finally {
        rl.close();
        await db.sequelize.close();
      }
    });
  });
});