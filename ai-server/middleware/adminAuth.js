// AI-strong admin protection middleware for SMARTLOCAL.AI
// Configure admin emails via ADMIN_EMAILS (comma-separated). Falls back to default.
const adminEmails = (process.env.ADMIN_EMAILS || 'tjmorrow909@gmail.com')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

module.exports = function adminAuth(req, res, next) {
  // Support a Firebase-free local mode. When AUTH_MODE=local, allow either:
  // - X-Admin-Token header matching MORROW_ADMIN_TOKEN, or
  // - Authorization: Bearer <jwt> signed with JWT_SECRET containing an email in ADMIN_EMAILS
  const AUTH_MODE = (process.env.AUTH_MODE || '').toLowerCase();
  if (AUTH_MODE === 'local') {
    const headerToken = req.headers['x-admin-token'];
    if (headerToken && headerToken === (process.env.MORROW_ADMIN_TOKEN || 'localdev')) {
      req.user = { email: (process.env.LOCAL_ADMIN_EMAIL || adminEmails[0] || 'admin@example.com') };
      return next();
    }
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      const bearer = authHeader.split(' ')[1];
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(bearer, process.env.JWT_SECRET || 'dev-secret');
        const email = (decoded.email || '').toLowerCase();
        if (!email || !adminEmails.includes(email)) {
          return res.status(403).json({ error: 'Access denied: Admin only.' });
        }
        req.user = decoded;
        return next();
      } catch (e) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
      }
    }
    return res.status(401).json({ error: 'Missing admin credentials. Provide X-Admin-Token or Bearer JWT.' });
  }

  // Default: Firebase ID token in Authorization header (Bearer)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization token.' });
  }
  const idToken = authHeader.split(' ')[1];
  const admin = require('firebase-admin');
  if (!admin.apps.length) admin.initializeApp();
  admin.auth().verifyIdToken(idToken)
    .then(decoded => {
      // AI-strong: Use LLM to analyze email for spoofing, but for now, check exact match
      const email = (decoded.email || '').toLowerCase();
      if (!email || !adminEmails.includes(email)) {
        return res.status(403).json({ error: 'Access denied: Admin only.' });
      }
      // Optionally, log AI-based anomaly detection here
      req.user = decoded;
      next();
    })
    .catch(err => {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    });
}
