import axios from 'axios';
import { decode, verify } from 'jsonwebtoken';

export const handler = async (token: string) => {
    try {
        const keys: { kid: string }[] = await axios.get(
            'https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_cg6JmiwED/.well-known/jwks.json',
        );
        const removeBearerFromToken = token.replace('Bearer', '').trim();
        const decoded = decode(removeBearerFromToken, { complete: true });

        if (!decoded || !decoded.payload) {
            console.error(`token not decoded: ${removeBearerFromToken}; unmodified: ${token}`);
            throw Error('Invalid token');
        }
        const key = keys.find((x) => x.kid === decoded.header.kid);

        if (!key) {
            throw Error('Signing key not found');
        }
        const publicKey = key.kid;
        verify(token, publicKey);
        return { claims: decoded.payload };
    } catch (err) {
        console.log('error', JSON.stringify(err, null, 4));
        return new Error('User Authentication issue');
    }
};
