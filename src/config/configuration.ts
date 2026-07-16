export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8000', 10),
  database: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_DATABASE_URL,
  },
  frontendUrl: process.env.FRONTEND_URL,
  cookieSecret: process.env.COOKIE_SECRET,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '30m',
  },
  cookie: {
    refreshName: process.env.COOKIE_REFRESH_NAME || 'refreshToken',
    path: process.env.COOKIE_PATH || '/',
    sameSite: (process.env.COOKIE_SAME_SITE || 'lax') as 'lax' | 'strict' | 'none',
    secure: process.env.COOKIE_SECURE
      ? process.env.COOKIE_SECURE === 'true'
      : process.env.NODE_ENV === 'production',
    signed: process.env.COOKIE_SIGNED === 'true',
  },
  session: {
    absoluteDays: parseInt(process.env.SESSION_ABSOLUTE_DAYS || '1', 10),
    rememberMeDays: parseInt(process.env.SESSION_REMEMBER_ME_DAYS || '30', 10),
    idleMinutes: parseInt(process.env.SESSION_IDLE_MINUTES || '120', 10),
    multiDevice: process.env.SESSION_MULTI_DEVICE === 'true',
  },
  otp: {
    length: parseInt(process.env.OTP_LENGTH || '6', 10),
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10),
    maxResends: parseInt(process.env.OTP_MAX_RESENDS || '5', 10),
    resendCooldownSeconds: parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10),
    bcryptRounds: parseInt(process.env.OTP_BCRYPT_ROUNDS || '10', 10),
  },
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    passwordHistorySize: parseInt(process.env.PASSWORD_HISTORY_SIZE || '10', 10),
  },
  throttle: {
    ttlMs: parseInt(process.env.THROTTLE_TTL_MS || '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '20', 10),
    authLimit: parseInt(process.env.THROTTLE_AUTH_LIMIT || '10', 10),
  },
  branding: {
    companyName: process.env.BRAND_COMPANY_NAME || process.env.APP_NAME || 'PEB CRM',
    companyLogo: process.env.BRAND_COMPANY_LOGO || '',
    primaryColor: process.env.BRAND_PRIMARY_COLOR || '#0F766E',
    supportEmail: process.env.BRAND_SUPPORT_EMAIL || process.env.SMTP_FROM_EMAIL || '',
    website: process.env.BRAND_WEBSITE || process.env.FRONTEND_URL || '',
    address: process.env.BRAND_ADDRESS || '',
    phone: process.env.BRAND_PHONE || '',
    socialLinks: {
      linkedin: process.env.BRAND_SOCIAL_LINKEDIN || '',
      twitter: process.env.BRAND_SOCIAL_TWITTER || '',
      facebook: process.env.BRAND_SOCIAL_FACEBOOK || '',
    },
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    fromName: process.env.SMTP_FROM_NAME || process.env.BRAND_COMPANY_NAME || 'PEB CRM',
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
    secure: process.env.SMTP_SECURE === 'true',
    pool: process.env.SMTP_POOL !== 'false',
    maxConnections: parseInt(process.env.SMTP_MAX_CONNECTIONS || '5', 10),
    maxMessages: parseInt(process.env.SMTP_MAX_MESSAGES || '100', 10),
    verifyOnBoot: process.env.SMTP_VERIFY_ON_BOOT !== 'false',
    // 4 = IPv4 only (required on Render where Gmail IPv6 is often ENETUNREACH)
    family: parseInt(process.env.SMTP_IP_FAMILY || '4', 10),
    connectionTimeoutMs: parseInt(process.env.SMTP_CONNECTION_TIMEOUT_MS || '10000', 10),
    greetingTimeoutMs: parseInt(process.env.SMTP_GREETING_TIMEOUT_MS || '10000', 10),
    socketTimeoutMs: parseInt(process.env.SMTP_SOCKET_TIMEOUT_MS || '15000', 10),
    dnsTimeoutMs: parseInt(process.env.SMTP_DNS_TIMEOUT_MS || '5000', 10),
  },
  mail: {
    // smtp | gmail | zoho | resend | auto (SMTP first, Resend HTTPS fallback)
    provider: (process.env.MAIL_PROVIDER || 'smtp').toLowerCase(),
    queueEnabled: process.env.MAIL_QUEUE_ENABLED !== 'false',
    queueConcurrency: parseInt(process.env.MAIL_QUEUE_CONCURRENCY || '2', 10),
    queueMaxAttempts: parseInt(process.env.MAIL_QUEUE_MAX_ATTEMPTS || '5', 10),
    resendApiKey: process.env.RESEND_API_KEY || '',
    resendFromEmail: process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '',
  },
});
