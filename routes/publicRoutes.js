// routes/publicRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController'); 

// Rota para a página inicial pública
router.get('/user', (req, res) => {
  res.render('userLogin');
});

// Rota pública para exibir a página de classificação
router.get('/classification', userController.showClassification);

module.exports = router;