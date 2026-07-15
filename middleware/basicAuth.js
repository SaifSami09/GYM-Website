// middleware/basicAuth.js
// Protects admin endpoints with HTTP Basic Auth.
// Credentials are set via ADMIN_USER and ADMIN_PASSWORD env variables.

function basicAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';

  if (!authHeader.startsWith('Basic ')) {
    return challenge(res);
  }

  const base64 = authHeader.slice(6);
  let decoded;
  try {
    decoded = Buffer.from(base64, 'base64').toString('utf8');
  } catch {
    return challenge(res);
  }

  const colonIdx = decoded.indexOf(':');
  if (colonIdx < 0) return challenge(res);

  const user = decoded.slice(0, colonIdx);
  const pass = decoded.slice(colonIdx + 1);

  const validUser = process.env.ADMIN_USER     || 'admin';
  const validPass = process.env.ADMIN_PASSWORD || 'admin123';

  if (user === validUser && pass === validPass) {
    return next();
  }

  return challenge(res);
}

function challenge(res) {
  res.set('WWW-Authenticate', 'Basic realm="IronForge Admin"');
  return res.status(401).send('Unauthorized');
}

module.exports = basicAuth;
