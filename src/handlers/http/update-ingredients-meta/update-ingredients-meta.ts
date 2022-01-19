import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyHandler, APIGatewayProxyHandlerV2, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoClient } from '~helpers/dynamo';
import { getEnvironmentVariableOrThrow } from '~helpers/utils';

const tableName = getEnvironmentVariableOrThrow('TABLE_NAME');

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('🍌 ->', JSON.stringify(event, null, 4));

        if (!event.body) {
            throw new Error('no body in request!');
        }
        // const { title, id, ingredients, mealTime, cuisine } = JSON.parse(event.body);
        const recipeMeta = JSON.parse(event.body);
        console.log(
            '🚀 ~ file: update-ingredients-meta.ts ~ line 16 ~ consthandler:APIGatewayProxyHandlerV2= ~ recipeMeta',
            recipeMeta,
            event.body,
        );
        const { photoid } = event.pathParameters as Record<string, unknown>;
        console.log(
            '🚀 ~ file: update-ingredients-meta.ts ~ line 21 ~ consthandler:APIGatewayProxyHandlerV2= ~ photoid',
            photoid,
        );
        if (!photoid) {
            throw new Error('no photo id in path params');
        }

        if (!recipeMeta) {
            throw new Error('no recipe metaData');
        }

        await dynamoClient.send(
            new UpdateCommand({
                TableName: tableName,
                Key: {
                    pk: `RECIPE#${photoid}`,
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
            message: `updated ${photoid}`,
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
