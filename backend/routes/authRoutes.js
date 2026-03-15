const express = require('express');
const { registerUser, loginUser } = require('../controllers/authController');

const router = express.Router();

router.post('/register', (req, res, next) => {
    console.log('[DEBUG] Register route hit');
    registerUser(req, res, next);
});

router.post('/login', (req, res, next) => {
    console.log('[DEBUG] Login route hit');
    loginUser(req, res, next);
});

module.exports = router;

