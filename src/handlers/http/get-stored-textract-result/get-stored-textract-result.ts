import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoClient, dynamoDocClient } from '~helpers/dynamo';
import { getEnvironmentVariableOrThrow } from '~helpers/utils';
const tableName = getEnvironmentVariableOrThrow('TABLE_NAME');

export const handler: APIGatewayProxyHandler = async (event) => {
    // grab the userId from the event header
    // grab the photo id in the request
    // use the photo id and userId to query dynamo for the result
    try {
        // const { photoId } = JSON.parse(event.body);
        const photoId = 'test';
        const res = await dynamoClient.send(
            new QueryCommand({
                TableName: tableName,
                KeyConditionExpression: 'pk = :value',
                ExpressionAttributeValues: {
                    ':value': `RECIPE#${photoId}`,
                },
            }),
        );

        if (!res.Items?.length) throw new Error('urgh, we lost the recipe!');

        const respsonse: APIGatewayProxyResult = {
            statusCode: 200,
            body: JSON.stringify(res.Items),
        };

        return respsonse;
    } catch (error) {
        const errResponse: APIGatewayProxyResult = {
            statusCode: 200,
            body: JSON.stringify(error, null, 4),
        };

        return errResponse;
    }
};
