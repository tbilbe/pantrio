import { APIGatewayProxyHandler } from 'aws-lambda';

export const handler: APIGatewayProxyHandler = (event, context) => {
    try {
        console.log('🐝 event 🚧', JSON.stringify(event, null, 4));
        console.log('⚡️ CONTEXT', JSON.stringify(context, null, 4));

        const userId = event.requestContext.authorizer;
        console.log('🚀 ~ file: post-recipe-image.ts ~ line 9 ~ userId', JSON.stringify(userId, null, 4));
    } catch (err) {
        console.log('💀 error', err);
        throw err;
    }
};
