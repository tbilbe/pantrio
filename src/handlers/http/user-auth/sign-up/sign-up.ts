import { APIGatewayProxyHandlerV2, APIGatewayProxyResult } from 'aws-lambda/trigger/api-gateway-proxy';
import { CognitoIdentityServiceProvider } from 'aws-sdk';
import { getEnvironmentVariableOrThrow } from '~helpers/utils';

const userpoolIdKey = getEnvironmentVariableOrThrow('USER_POOL_ID');
const userpoolClientIdKey = getEnvironmentVariableOrThrow('USER_POOL_CLIENT_ID');

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('🧐 event', JSON.stringify(event, null, 4));
        if (!event || !event.body) {
            throw new Error('no body with request');
        }

        const { email, password } = JSON.parse(event.body);
        const cognito = new CognitoIdentityServiceProvider();
        await cognito
            .adminCreateUser({
                UserPoolId: userpoolIdKey,
                Username: email,
                MessageAction: 'SUPPRESS',
                TemporaryPassword: password,
            })
            .promise();

        console.log('got here - 1');

        const initAuthResponse = await cognito
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

        console.log('got here - 2');
        if (initAuthResponse.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
            await cognito
                .adminRespondToAuthChallenge({
                    ChallengeName: 'NEW_PASSWORD_REQUIRED',
                    ClientId: userpoolClientIdKey,
                    UserPoolId: userpoolIdKey,
                    ChallengeResponses: {
                        USERNAME: email,
                        NEW_PASSWORD: password,
                    },
                    Session: initAuthResponse.Session,
                })
                .promise();

            console.log('got here - 3');

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
        } else {
            throw new Error('Oops! Something went wrong');
        }
    } catch (err) {
        console.log('🤮 error', JSON.stringify(err, null, 4));
        const errResponse: APIGatewayProxyResult = {
            statusCode: 400,
            body: (err as unknown as any).message,
        };
        return errResponse;
    }
};
