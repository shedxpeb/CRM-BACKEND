const { randomBytes } = require('crypto');
const { createHash } = require('crypto');

// Simulate the token service
const jwt = require('@nestjs/jwt');
const config = {
  jwt: {
    secret: 'dev-secret-key-at-least-32-characters-long-for-testing-jwt',
    expiresIn: '30m',
    accessExpiresIn: '30m',
  },
};

const jwtService = new jwt.JwtService({
  secret: config.jwt.secret,
  signOptions: { expiresIn: config.jwt.accessExpiresIn },
});

const token = jwtService.sign({
  sub: 'test-user-id',
  email: 'test@example.com',
  role: 'USER',
  organizationId: 'org-123',
});
console.log('Generated token:', token);

// Decode the token to check exp
const parts = token.split('.');
const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
console.log('Decoded payload:', payload);
console.log('exp:', payload.exp);
console.log('iat:', payload.iat);
console.log('exp - iat:', payload.exp - payload.iat);
console.log('Expected: 1800 seconds (30 minutes)');

// Also test with atob like the frontend does
console.log('\n--- Frontend atob decoding ---');
const b64 = parts[1];
try {
  const decoded = atob(b64);
  console.log('atob decoded:', decoded.substring(0, 100));
} catch(e) {
  console.log('atob error:', e.message);
}

// Test base64url decode
function base64urlDecode(str) {
  // Replace base64url chars with base64 chars
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding
  while (base64.length % 4) base64 += '=';
  return atob(base64);
}

try {
  const decoded = base64urlDecode(b64);
  console.log('base64url decoded:', decoded.substring(0, 100));
  const payload2 = JSON.parse(decoded);
  console.log('exp from base64url:', payload2.exp);
  console.log('exp - iat from base64url:', payload2.exp - payload2.iat);
} catch(e) {
  console.log('base64url decode error:', e.message);
}