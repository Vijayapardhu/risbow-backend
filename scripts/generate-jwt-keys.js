#!/usr/bin/env node
/**
 * RS256 JWT Key Pair Generator
 * 
 * Generates a 2048-bit RSA key pair for RS256 JWT signing.
 * Run: node scripts/generate-jwt-keys.js
 * 
 * Output files:
 *   - jwt-private.pem (private key for signing tokens)
 *   - jwt-public.pem (public key for verifying tokens)
 *   - .env.jwt (environment variables to add to .env)
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔐 Generating RS256 JWT Key Pair (2048-bit RSA)...\n');

// Generate RSA key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
    },
    privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
    },
});

// Output directory
const outputDir = path.join(__dirname, '..', 'keys');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Save keys to files
fs.writeFileSync(path.join(outputDir, 'jwt-private.pem'), privateKey);
fs.writeFileSync(path.join(outputDir, 'jwt-public.pem'), publicKey);

console.log('✅ Keys generated successfully!\n');
console.log(`📁 Private key: ${path.join(outputDir, 'jwt-private.pem')}`);
console.log(`📁 Public key:  ${path.join(outputDir, 'jwt-public.pem')}`);

// Generate .env format (escaped newlines for environment variables)
const privateKeyEnv = privateKey.replace(/\n/g, '\\n');
const publicKeyEnv = publicKey.replace(/\n/g, '\\n');

const envContent = `# RS256 JWT Keys (add these to your .env file)
# Generated on ${new Date().toISOString()}
# 
# IMPORTANT: Keep JWT_PRIVATE_KEY secret! Only share JWT_PUBLIC_KEY with services that verify tokens.

JWT_PRIVATE_KEY="${privateKeyEnv}"
JWT_PUBLIC_KEY="${publicKeyEnv}"
`;

fs.writeFileSync(path.join(outputDir, '.env.jwt'), envContent);
console.log(`📁 Env format:  ${path.join(outputDir, '.env.jwt')}\n`);

console.log('📋 SETUP INSTRUCTIONS:');
console.log('─'.repeat(50));
console.log('1. Copy the contents of keys/.env.jwt to your .env file');
console.log('2. Remove JWT_SECRET (no longer needed with RS256)');
console.log('3. Add keys/ to .gitignore to prevent committing keys');
console.log('4. For production, use secure key management (AWS KMS, Vault, etc.)');
console.log('');
console.log('🔒 SECURITY NOTES:');
console.log('─'.repeat(50));
console.log('• Private key: Used to SIGN tokens (keep secret on auth server)');
console.log('• Public key:  Used to VERIFY tokens (can share with other services)');
console.log('• RS256 is preferred for microservices architecture');
console.log('• HS256 (symmetric) is acceptable for single-service deployments');
