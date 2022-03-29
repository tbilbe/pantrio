import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyHandler, APIGatewayProxyHandlerV2, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoClient } from '~helpers/dynamo';
import { getEnvironmentVariableOrThrow } from '~helpers/utils';

const tableName = getEnvironmentVariableOrThrow('TABLE_NAME');

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        console.log('🍔 🍎 ->', JSON.stringify(event, null, 4));

        if (!event) {
            throw new Error('no event');
        }

        if (!event.body) {
            throw new Error('no body in request!');
        }
        if (!event.headers['photoId']) {
            throw new Error('no photo id in headers');
        }
        const userId = event.requestContext.authorizer?.sub ?? event.requestContext.authorizer?.username;
        const recipeMeta = JSON.parse(event.body);
        const photoId = event.headers['photoid'];
        console.log(
            '🚀 ~ file: update-ingredients-meta.ts ~ line 21 ~ consthandler:APIGatewayProxyHandlerV2= ~ photoid',
            photoId,
        );

        if (!recipeMeta) {
            throw new Error('no recipe metaData');
        }

        await dynamoClient.send(
            new UpdateCommand({
                TableName: tableName,
                Key: {
                    pk: `USER#${userId}`,
                    sk: `PHOTOID#${photoId}`,
                },
                UpdateExpression: 'set #meta = :value',
                ExpressionAttributeNames: {
                    '#meta': 'recipeMeta',
                },
                ExpressionAttributeValues: {
                    ':value': recipeMeta,
                },
                ReturnValues: 'ALL_NEW',
            }),
        );

        const successResponse = {
            message: `updated ${photoId}`,
            body: recipeMeta,
        };

        const response: APIGatewayProxyResult = {
            statusCode: 200,
            body: JSON.stringify(successResponse),
        };
        return response;
    } catch (error) {
        const errResponse: APIGatewayProxyResult = {
            statusCode: 400,
            body: (error as unknown as any).message,
        };

        return errResponse;
    }
};
