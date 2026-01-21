/**
 * Multi-Factor Authentication Service
 * TOTP-based 2FA implementation
 */

import crypto from 'crypto';

// Base32 alphabet for TOTP secrets
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export interface MFASetup {
    secret: string;
    otpAuthUrl: string;
    qrCodeDataUrl: string;
    backupCodes: string[];
}

export interface MFAVerification {
    valid: boolean;
    usedBackupCode?: boolean;
}

/**
 * Generate a random base32 secret for TOTP
 */
export function generateSecret(length: number = 20): string {
    const buffer = crypto.randomBytes(length);
    let secret = '';
    for (let i = 0; i < buffer.length; i++) {
        secret += BASE32_ALPHABET[buffer[i] % 32];
    }
    return secret;
}

/**
 * Generate OTP Auth URL for authenticator apps
 */
export function generateOTPAuthUrl(
    secret: string,
    accountName: string,
    issuer: string = 'PPL26'
): string {
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedAccount = encodeURIComponent(accountName);
    return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generate QR code as data URL
 * Note: In production, use a library like 'qrcode'
 */
export async function generateQRCode(otpAuthUrl: string): Promise<string> {
    // Placeholder - in production use: const QRCode = require('qrcode');
    // return await QRCode.toDataURL(otpAuthUrl);

    // For now, return a placeholder that can be replaced
    return `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><text x='50%' y='50%' text-anchor='middle'>QR:${otpAuthUrl.slice(0, 20)}...</text></svg>`;
}

/**
 * Generate backup codes for account recovery
 */
export function generateBackupCodes(count: number = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    return codes;
}

/**
 * Setup MFA for a user
 */
export async function setupMFA(accountName: string): Promise<MFASetup> {
    const secret = generateSecret();
    const otpAuthUrl = generateOTPAuthUrl(secret, accountName);
    const qrCodeDataUrl = await generateQRCode(otpAuthUrl);
    const backupCodes = generateBackupCodes();

    return {
        secret,
        otpAuthUrl,
        qrCodeDataUrl,
        backupCodes
    };
}

/**
 * Decode base32 string to buffer
 */
function base32Decode(encoded: string): Buffer {
    const cleaned = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');
    const bits: number[] = [];

    for (const char of cleaned) {
        const val = BASE32_ALPHABET.indexOf(char);
        if (val === -1) continue;
        bits.push(...val.toString(2).padStart(5, '0').split('').map(Number));
    }

    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.slice(i, i + 8).join(''), 2));
    }

    return Buffer.from(bytes);
}

/**
 * Generate TOTP code for a given time
 */
function generateTOTP(secret: string, time: number = Date.now()): string {
    const key = base32Decode(secret);
    const counter = Math.floor(time / 30000);

    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter));

    const hmac = crypto.createHmac('sha1', key);
    hmac.update(counterBuffer);
    const hash = hmac.digest();

    const offset = hash[hash.length - 1] & 0xf;
    const code = (
        ((hash[offset] & 0x7f) << 24) |
        ((hash[offset + 1] & 0xff) << 16) |
        ((hash[offset + 2] & 0xff) << 8) |
        (hash[offset + 3] & 0xff)
    ) % 1000000;

    return code.toString().padStart(6, '0');
}

/**
 * Verify a TOTP token
 */
export function verifyTOTP(
    token: string,
    secret: string,
    window: number = 1
): boolean {
    const now = Date.now();

    for (let i = -window; i <= window; i++) {
        const time = now + (i * 30000);
        const expected = generateTOTP(secret, time);
        if (token === expected) {
            return true;
        }
    }

    return false;
}

/**
 * Verify MFA token or backup code
 */
export async function verifyMFA(
    token: string,
    secret: string,
    backupCodes: string[],
    markBackupUsed?: (code: string) => Promise<void>
): Promise<MFAVerification> {
    // Check TOTP first
    if (verifyTOTP(token, secret)) {
        return { valid: true, usedBackupCode: false };
    }

    // Check backup codes
    const normalizedToken = token.toUpperCase().replace(/[^A-Z0-9]/g, '');
    for (const code of backupCodes) {
        const normalizedCode = code.replace(/-/g, '');
        if (normalizedToken === normalizedCode) {
            if (markBackupUsed) {
                await markBackupUsed(code);
            }
            return { valid: true, usedBackupCode: true };
        }
    }

    return { valid: false };
}

/**
 * Hash backup codes for storage
 */
export function hashBackupCodes(codes: string[]): string[] {
    return codes.map(code =>
        crypto.createHash('sha256').update(code).digest('hex')
    );
}

/**
 * Verify against hashed backup codes
 */
export function verifyHashedBackupCode(token: string, hashedCodes: string[]): string | null {
    const normalizedToken = token.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const tokenHash = crypto.createHash('sha256').update(normalizedToken).digest('hex');

    const index = hashedCodes.indexOf(tokenHash);
    if (index !== -1) {
        return hashedCodes[index]; // Return hash so caller can mark it as used
    }

    return null;
}
