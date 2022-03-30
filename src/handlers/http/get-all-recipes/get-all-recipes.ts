import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient } from '~helpers/dynamo';
import { getEnvironmentVariableOrThrow } from '~helpers/utils';

const tableName = getEnvironmentVariableOrThrow('TABLE_NAME');

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const userId = event.requestContext.authorizer?.sub ?? event.requestContext.authorizer?.username;

        if (!userId) throw new Error('invalid user id');
        console.log('👨🏽‍🍳 event 🦄', JSON.stringify(event, null, 4));

        console.log('got here!');

        const res = await dynamoClient.send(
            new QueryCommand({
                TableName: tableName,
                KeyConditionExpression: '#user = :user',
                ExpressionAttributeValues: {
                    ':user': `USER#${userId}`,
                },
                ExpressionAttributeNames: { '#user': 'pk' },
            }),
        );

        console.log('got here! 2');

        // const recipeTitles = res.Items?.map((el) => ({
        //     title: el.recipeMeta.title,
        //     id: el.sk.split('#')[1],
        // }));

        console.log('got here!');

        const response: APIGatewayProxyResult = {
            statusCode: 200,
            body: JSON.stringify(res.Items),
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
