import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient } from '~helpers/dynamo';
import { getEnvironmentVariableOrThrow } from '~helpers/utils';

const tableName = getEnvironmentVariableOrThrow('TABLE_NAME');

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        if (!event.headers.Authorization) throw new Error('no auth headers');
        console.log('👨🏽‍🍳 event 🦄', JSON.stringify(event, null, 4));

        const res = await dynamoClient.send(
            new QueryCommand({
                TableName: tableName,
                KeyConditionExpression: '#user = :user',
                ExpressionAttributeValues: {
                    ':user': `USER#testUser`,
                },
                ExpressionAttributeNames: { '#user': 'pk' },
            }),
        );

        const recipeTitles = res.Items?.map((el) => ({
            title: el.recipeMeta.title,
            id: el.sk.split('#')[1],
        }));

        const response: APIGatewayProxyResult = {
            statusCode: 200,
            body: JSON.stringify(recipeTitles),
        };
        return response;
    } catch (error) {
        const errResponse: APIGatewayProxyResult = {
            statusCode: 400,
            body: JSON.stringify(error, null, 4),
        };
        return errResponse;
    }
};
