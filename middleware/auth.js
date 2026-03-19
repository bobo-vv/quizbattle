function requireAuth(req, res, next) {
  if (!req.session || !req.session.hostId) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  next();
}

module.exports = { requireAuth };
