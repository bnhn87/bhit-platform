/**
 * Security Service - v2025-09-19 Specification Compliance
 * Provides comprehensive security hardening and monitoring
 */

interface SecurityPolicy {
  csp: string[];
  allowedDomains: string[];
  maxRequestSize: number;
  rateLimitRules: RateLimitRule[];
  sessionTimeout: number;
  requireMFA: boolean;
}

interface RateLimitRule {
  path: string;
  maxRequests: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
}

interface SecurityEvent {
  type: 'suspicious_activity' | 'failed_auth' | 'rate_limit' | 'xss_attempt' | 'sql_injection';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, unknown>;
  timestamp: number;
  userAgent?: string;
  ip?: string;
  userId?: string;
}

class SecurityService {
  private static instance: SecurityService;
  private policy: SecurityPolicy;
  private eventLog: SecurityEvent[] = [];
  private blockedIPs = new Set<string>();
  private suspiciousPatterns = new Map<string, number>();

  constructor() {
    this.policy = this.getDefaultSecurityPolicy();
    this.initializeSecurityMeasures();
  }

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  private getDefaultSecurityPolicy(): SecurityPolicy {
    const isDevelopment = process.env.NODE_ENV === 'development';

    return {
      csp: isDevelopment ? [
        // Development CSP - more permissive for Next.js dev features
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' ws: wss: https://*.supabase.co wss://*.supabase.co https://api.openai.com https://cdnjs.cloudflare.com",
        "frame-ancestors 'none'",
        "form-action 'self'"
      ] : [
        // Production CSP - strict security
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "upgrade-insecure-requests"
      ],
      allowedDomains: [
        'localhost:3000',
        '*.bhit.co.uk',
        '*.supabase.co',
        'cdnjs.cloudflare.com'
      ],
      maxRequestSize: 10 * 1024 * 1024, // 10MB
      rateLimitRules: [
        { path: '/api/auth/*', maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 auth requests per 15min
        { path: '/api/*', maxRequests: 100, windowMs: 15 * 60 * 1000 }, // 100 API requests per 15min
        { path: '/*', maxRequests: 1000, windowMs: 15 * 60 * 1000 } // 1000 total requests per 15min
      ],
      sessionTimeout: 8 * 60 * 60 * 1000, // 8 hours
      requireMFA: false
    };
  }

  private initializeSecurityMeasures() {
    // Skip CSP setup on client-side - should be handled by server headers
    this.setupInputSanitization();
    this.setupClickjackingProtection();
    this.setupSecureHeaders();
    this.monitorSuspiciousActivity();
  }

  private setupCSP() {
    // CSP should be set via server headers, not client-side meta tags
    // This method is kept for potential server-side usage
    if (typeof document !== 'undefined') {
      // eslint-disable-next-line no-console
      console.info('🔒 CSP should be configured via server headers for better security');
    }
  }

  private setupInputSanitization() {
    // Sanitize all form inputs
    if (typeof document !== 'undefined') {
      document.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.type === 'text' || target.tagName === 'TEXTAREA') {
          const sanitized = this.sanitizeInput(target.value);
          if (sanitized !== target.value) {
            this.logSecurityEvent({
              type: 'xss_attempt',
              severity: 'medium',
              details: {
                original: target.value,
                sanitized,
                field: target.name || target.id
              },
              timestamp: Date.now()
            });
          }
        }
      });
    }
  }

  private setupClickjackingProtection() {
    if (typeof window !== 'undefined' && window.self !== window.top) {
      // Detect if page is in iframe
      this.logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'medium',
        details: { reason: 'Page loaded in iframe - possible clickjacking attempt' },
        timestamp: Date.now()
      });

      // Optionally break out of iframe
      window.top!.location.href = window.location.href;
    }
  }

  private setupSecureHeaders() {
    // These would typically be set on the server, but we can check for them
    if (typeof window !== 'undefined') {
      const headers = [
        'X-Frame-Options',
        'X-Content-Type-Options',
        'X-XSS-Protection',
        'Strict-Transport-Security'
      ];

      // In a real implementation, these would be server-side headers
      // eslint-disable-next-line no-console
      console.info('Security headers should be configured on the server:', headers);
    }
  }

  private monitorSuspiciousActivity() {
    if (typeof window !== 'undefined') {
      // Monitor for rapid-fire requests
      const originalFetch = window.fetch;
      let requestCount = 0;
      let windowStart = Date.now();

      window.fetch = async (...args) => {
        const now = Date.now();

        // Reset counter every minute
        if (now - windowStart > 60000) {
          requestCount = 0;
          windowStart = now;
        }

        requestCount++;

        // Flag suspicious activity
        if (requestCount > 50) {
          this.logSecurityEvent({
            type: 'suspicious_activity',
            severity: 'high',
            details: {
              reason: 'Excessive API requests',
              count: requestCount,
              timeWindow: '1 minute'
            },
            timestamp: now
          });
        }

        return originalFetch(...args);
      };

      // Monitor for DevTools usage (basic detection)
      let devtools = false;
      setInterval(() => {
        if ((window.outerHeight - window.innerHeight) > 200 && !devtools) {
          devtools = true;
          this.logSecurityEvent({
            type: 'suspicious_activity',
            severity: 'low',
            details: { reason: 'Developer tools detected' },
            timestamp: Date.now()
          });
        } else if ((window.outerHeight - window.innerHeight) < 200) {
          devtools = false;
        }
      }, 5000);
    }
  }

  /**
   * Sanitize user input to prevent XSS
   */
  sanitizeInput(input: string): string {
    // Basic HTML entity encoding
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Validate and sanitize data before API requests
   */
  validateAPIRequest(data: unknown): { isValid: boolean; sanitized: unknown; warnings: string[] } {
    const warnings: string[] = [];
    const sanitized = JSON.parse(JSON.stringify(data));

    const sanitizeObject = (obj: unknown): unknown => {
      if (typeof obj === 'string') {
        const _originalLength = obj.length;
        const sanitizedString = this.sanitizeInput(obj);
        if (sanitizedString !== obj) {
          warnings.push('Potentially dangerous content sanitized');
        }
        return sanitizedString;
      }

      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }

      if (obj && typeof obj === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
          // Sanitize keys as well
          const sanitizedKey = this.sanitizeInput(key);
          result[sanitizedKey] = sanitizeObject(value);
        }
        return result;
      }

      return obj;
    };

    const sanitizedData = sanitizeObject(sanitized);

    // Check for SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/i,
      /(\b(UNION|OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(--|\/\*|\*\/)/,
      /(\b(exec|execute)\s*\()/i
    ];

    const jsonString = JSON.stringify(sanitizedData);
    for (const pattern of sqlPatterns) {
      if (pattern.test(jsonString)) {
        warnings.push('Possible SQL injection attempt detected');
        this.logSecurityEvent({
          type: 'sql_injection',
          severity: 'high',
          details: { data: jsonString.substring(0, 1000) },
          timestamp: Date.now()
        });
        break;
      }
    }

    return {
      isValid: warnings.length === 0,
      sanitized: sanitizedData,
      warnings
    };
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length: number = 32): string {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(length);
      crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // Fallback for environments without crypto.getRandomValues
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Check if content is safe for display
   */
  isSafeContent(content: string): boolean {
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^>]*>/gi,
      /<object\b[^>]*>/gi,
      /<embed\b[^>]*>/gi
    ];

    return !dangerousPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Log security events
   */
  logSecurityEvent(event: SecurityEvent): void {
    this.eventLog.push(event);

    // Keep only last 1000 events
    if (this.eventLog.length > 1000) {
      this.eventLog = this.eventLog.slice(-1000);
    }

    // Send to monitoring service
    this.sendToMonitoringService(event);

    // Take automated action for high severity events
    if (event.severity === 'high' || event.severity === 'critical') {
      this.handleHighSeverityEvent(event);
    }
  }

  private sendToMonitoringService(event: SecurityEvent): void {
    // In production, send to security monitoring service
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/security/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      }).catch(err => console.warn('Failed to log security event:', err));
    } else {
      console.warn('🔒 Security Event:', event);
    }
  }

  private handleHighSeverityEvent(event: SecurityEvent): void {
    switch (event.type) {
      case 'sql_injection':
      case 'xss_attempt':
        // Could temporarily disable form submissions
        console.error('Critical security event detected. Consider additional measures.');
        break;
      case 'suspicious_activity':
        // Could implement temporary rate limiting
        break;
    }
  }

  /**
   * Get security report
   */
  getSecurityReport(): {
    totalEvents: number;
    recentEvents: SecurityEvent[];
    threatLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
  } {
    const now = Date.now();
    const last24Hours = this.eventLog.filter(event => now - event.timestamp < 24 * 60 * 60 * 1000);

    const severityCounts = last24Hours.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let threatLevel: 'low' | 'medium' | 'high' = 'low';
    if (severityCounts.critical > 0 || severityCounts.high > 5) {
      threatLevel = 'high';
    } else if (severityCounts.medium > 10) {
      threatLevel = 'medium';
    }

    const recommendations = [];
    if (severityCounts.xss_attempt > 0) {
      recommendations.push('Review input validation and sanitization');
    }
    if (severityCounts.sql_injection > 0) {
      recommendations.push('Audit database query parameterization');
    }
    if (severityCounts.failed_auth > 5) {
      recommendations.push('Consider implementing account lockout policies');
    }

    return {
      totalEvents: this.eventLog.length,
      recentEvents: last24Hours.slice(-10),
      threatLevel,
      recommendations
    };
  }

  /**
   * Validate file upload security
   */
  validateFileUpload(file: File): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check file size
    if (file.size > this.policy.maxRequestSize) {
      errors.push(`File too large. Maximum size: ${this.policy.maxRequestSize / 1024 / 1024}MB`);
    }

    // Check file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type not allowed: ${file.type}`);
    }

    // Check filename for suspicious patterns
    if (/\.php$|\.js$|\.exe$|\.bat$|\.cmd$/i.test(file.name)) {
      errors.push('Potentially dangerous file extension');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const securityService = SecurityService.getInstance();

// React hooks for security features
export function useSecurityValidation() {
  return {
    sanitizeInput: (input: string) => securityService.sanitizeInput(input),
    validateAPIRequest: (data: unknown) => securityService.validateAPIRequest(data),
    isSafeContent: (content: string) => securityService.isSafeContent(content),
    validateFileUpload: (file: File) => securityService.validateFileUpload(file)
  };
}

export function useSecurityMonitoring() {
  return {
    logSecurityEvent: (event: Omit<SecurityEvent, 'timestamp'>) =>
      securityService.logSecurityEvent({ ...event, timestamp: Date.now() }),
    getSecurityReport: () => securityService.getSecurityReport(),
    generateSecureToken: (length?: number) => securityService.generateSecureToken(length)
  };
}