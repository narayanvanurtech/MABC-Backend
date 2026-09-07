import { config } from '../config.js';
import { verifyToken } from '../utils.js';
import { User } from '../models/User.js';

export async function requireAuth(req, res, next) {
  try {
    const payload = readToken(req);
    if (!payload?.userId) return res.status(401).json({ message: 'Login required' });

    const user = await User.findById(payload.userId);
    if (!user) return res.status(401).json({ message: 'Login required' });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Login required' });
  }
}

export async function optionalAuth(req, _res, next) {
  try {
    const payload = readToken(req);
    if (!payload?.userId) {
      req.user = null;
      return next();
    }

    const user = await User.findById(payload.userId);
    req.user = user || null;
    next();
  } catch {
    req.user = null;
    next();
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

function readToken(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return verifyToken(token, config.auth.secret);
}
