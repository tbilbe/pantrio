import { APIGatewayProxyHandlerV2, APIGatewayProxyResult } from 'aws-lambda/trigger/api-gateway-proxy';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        // check the jwt is valid then clear the jwt
        console.log('👋🏽 bye event', JSON.stringify(event, null, 4));
        return {
            statusCode: 200,
            msg: 'ok',
        };
    } catch (err) {
        console.log('🤮 error', JSON.stringify(err, null, 4));
        const errResponse: APIGatewayProxyResult = {
            statusCode: 400,
            body: (err as unknown as any).message,
        };
        return errResponse;
    }
};
