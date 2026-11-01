import { Request, Response, NextFunction } from 'express';

// ==========================================
// 1. IN-MEMORY SLIDING WINDOW RATE LIMITER
// ==========================================
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export function createRateLimiter(windowMs: number = 60 * 1000, maxRequests: number = 60) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Client identifier from IP or x-forwarded-for
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();
    const record = rateLimitStore.get(clientIp);

    if (!record || now > record.resetAt) {
      rateLimitStore.set(clientIp, { count: 1, resetAt: now + windowMs });
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        error: 'Too many requests. Please slow down.',
        retryAfterSeconds: retryAfterSec,
      });
    }

    record.count += 1;
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - record.count);
    next();
  };
}

// Strict rate limiter for auth / sensitive endpoints (10 attempts per minute)
export const authRateLimiter = createRateLimiter(60 * 1000, 10);
// Standard API rate limiter (120 requests per minute)
export const apiRateLimiter = createRateLimiter(60 * 1000, 120);

// ==========================================
// 2. SECURITY HEADERS MIDDLEWARE (OWASP Compliant)
// ==========================================
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // XSS protection legacy header
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: https:; connect-src 'self' ws: wss: http: https:;"
  );
  // HTTP Strict Transport Security (HSTS)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  // Permissions Policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

// ==========================================
// 3. INPUT SANITIZATION & INJECTION PREVENTER
// ==========================================
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  const sanitizeValue = (val: any): any => {
    if (typeof val === 'string') {
      // Strip potentially malicious script tags and event handlers
      return val
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/onload=/gi, '')
        .replace(/onerror=/gi, '');
    }
    if (val && typeof val === 'object') {
      for (const k in val) {
        val[k] = sanitizeValue(val[k]);
      }
    }
    return val;
  };

  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query);
  if (req.params) req.params = sanitizeValue(req.params);
  next();
}

// ==========================================
// 4. ROLE & RESOURCE-LEVEL AUTHORIZATION
// ==========================================
export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req.headers['x-user-role'] as string) || 'employee';

    // Admin has superuser override
    if (userRole === 'admin') {
      return next();
    }

    if (!allowedRoles.includes(userRole)) {
      AuditLogger.log({
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        actorId: (req.headers['x-user-id'] as string) || 'anonymous',
        actorRole: userRole,
        resource: req.originalUrl,
        ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
        status: 'DENIED',
      });

      return res.status(403).json({
        error: `Access Denied: Role '${userRole}' is not authorized to access this resource. Required: [${allowedRoles.join(', ')}]`,
      });
    }

    next();
  };
}

// ==========================================
// 5. STRUCTURED AUDIT LOGGER (Zero Secret Leakage)
// ==========================================
export interface AuditLogEntry {
  action: string;
  actorId: string;
  actorRole: string;
  resource: string;
  ip: string;
  status: 'SUCCESS' | 'DENIED' | 'FAILED';
  details?: Record<string, any>;
  timestamp?: string;
}

const auditLogEntries: AuditLogEntry[] = [];

export class AuditLogger {
  static log(entry: AuditLogEntry) {
    // Sanitize any potential sensitive fields from details
    const sanitizedDetails = { ...(entry.details || {}) };
    delete sanitizedDetails.password;
    delete sanitizedDetails.token;
    delete sanitizedDetails.secret;

    const record: AuditLogEntry = {
      ...entry,
      details: sanitizedDetails,
      timestamp: new Date().toISOString(),
    };

    auditLogEntries.push(record);
    // Keep in memory buffer capped at 1000 entries
    if (auditLogEntries.length > 1000) {
      auditLogEntries.shift();
    }

    console.log(`[AUDIT] ${record.timestamp} [${record.status}] ${record.action} by ${record.actorId} (${record.actorRole}) on ${record.resource}`);
  }

  static getRecentLogs(limit: number = 50) {
    return auditLogEntries.slice(-limit);
  }
}
