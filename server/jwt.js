import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(
    process.env.APP_SECRET || 'dev-secret-must-be-at-least-32-chars-long!!'
);

const ISSUER = 'rappakalja';
const AUDIENCE = 'rappakalja';
const EXPIRATION = '24h';

export async function createToken(payload) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setExpirationTime(EXPIRATION)
        .sign(secret);
}

export async function verifyToken(token) {
    try {
        const { payload } = await jwtVerify(token, secret, {
            issuer: ISSUER,
            audience: AUDIENCE
        });
        return payload;
    } catch {
        return null;
    }
}
