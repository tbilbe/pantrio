import { APIGatewayAuthorizerHandler } from 'aws-lambda';
import { getEnvironmentVariableOrThrow } from '~helpers/utils';
import { decode, verify } from 'jsonwebtoken';
import { pickBy } from 'lodash';

import jwksClient from 'jwks-rsa';

const jwksEndpointUrl = getEnvironmentVariableOrThrow('JWKS_ENDPOINT_URL');

const client = jwksClient({
    jwksUri: jwksEndpointUrl,
});

export const handler: APIGatewayAuthorizerHandler = async (event) => {
    try {
        console.log('event', JSON.stringify(event, null, 4));

        if (event.type !== 'TOKEN') {
            throw new Error('REQUEST event type not supported');
        }

        const keys = await client.getSigningKeys();
        const token = event.authorizationToken.replace('Bearer', '').trim();

        const decoded = decode(token, { complete: true });
        if (!decoded) {
            throw Error('Invalid token');
        }

        const key = keys.find((x) => x.kid === decoded.header.kid);
        if (!key) {
            throw Error('Signing key not found');
        }

        const publicKey = key.getPublicKey();
        verify(token, publicKey);

        const userId = decoded.payload.sub as string;

        if (userId) {
            return {
                principalId: userId,
                policyDocument: {
                    Statement: [{ Action: 'execute-api:Invoke', Effect: 'allow', Resource: event.methodArn }],
                    Version: '2012-10-17',
                },
                // Auth lambda response context can only contain claims of type string | number | boolean
                // https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html
                context: {
                    ...(pickBy(
                        decoded.payload,
                        (val) => typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean',
                    ) as Record<string, string | number | boolean>),
                    userId,
                },
            };
        }
    } catch (error) {
        console.log('error', error);
    }

    return {
        principalId: '',
        policyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: 'deny',
                    Resource: '*',
                },
            ],
        },
    };
};
