const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/mid');
const { requirePro } = require('../middleware/pro');

router.get('/private', authenticate, (req, res) => {
  res.json({
    message: 'Acces privat OK',
    user: req.user
  });
});

router.get('/pro-only', authenticate, requirePro, (req, res) => {
  res.json({ message: 'Acces PRO OK' });
});

module.exports = router;
