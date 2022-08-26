import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoClient } from '~helpers/dynamo';
import { getEnvironmentVariableOrThrow } from '~helpers/utils';
const tableName = getEnvironmentVariableOrThrow('TABLE_NAME');

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const userId = event.requestContext.authorizer?.sub ?? event.requestContext.authorizer?.username;

        if (!userId) throw new Error('invalid user id');
        if (!event.body) {
            throw new Error('no body in request!');
        }

        const shoppingList = JSON.parse(event.body);

        await dynamoClient.send(
            new PutCommand({
                TableName: tableName,
                Item: {
                    pk: `SHOPPING_LIST/${userId}`,
                    sk: new Date().toISOString(),
                    ...shoppingList,
                },
            }),
        );

        const successResponse: APIGatewayProxyResult = {
            statusCode: 200,
            body: JSON.stringify({
                message: 'shopping list updated',
                body: shoppingList,
            }),
        };

        return successResponse;
    } catch (error) {
        const errResponse: APIGatewayProxyResult = {
            statusCode: 400,
            body: JSON.stringify(error, null, 4),
        };
        return errResponse;
    }
};
