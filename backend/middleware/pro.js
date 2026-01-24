exports.requirePro = (req, res, next) => {
  if (req.user.role !== 'PRO')
    return res.status(403).json({ message: 'Acces doar PRO' });

  next();
};