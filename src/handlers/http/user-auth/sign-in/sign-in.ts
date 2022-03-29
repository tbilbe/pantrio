import { APIGatewayProxyHandlerV2, APIGatewayProxyResult } from 'aws-lambda/trigger/api-gateway-proxy';
import { CognitoIdentityServiceProvider } from 'aws-sdk';
import { getEnvironmentVariableOrThrow } from '~helpers/utils';

const userpoolIdKey = getEnvironmentVariableOrThrow('USER_POOL_ID');
const userpoolClientIdKey = getEnvironmentVariableOrThrow('USER_POOL_CLIENT_ID');
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        if (!event || !event.body) {
            throw new Error('no body with request');
        }

        const { email, password } = JSON.parse(event.body);
        const cognito = new CognitoIdentityServiceProvider();
        const cognitoSignin = await cognito
            .adminInitiateAuth({
                AuthFlow: 'ADMIN_NO_SRP_AUTH',
                ClientId: userpoolClientIdKey,
                UserPoolId: userpoolIdKey,
                AuthParameters: {
                    USERNAME: email,
                    PASSWORD: password,
                },
            })
            .promise();

        const response: APIGatewayProxyResult = {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST',
            },
            body: JSON.stringify(cognitoSignin),
            isBase64Encoded: false,
        };

        return response;
    } catch (err) {
        console.log('🤮 error', JSON.stringify(err, null, 4));
        const errResponse: APIGatewayProxyResult = {
            statusCode: 400,
            body: (err as unknown as any).message,
        };
        return errResponse;
    }
};
