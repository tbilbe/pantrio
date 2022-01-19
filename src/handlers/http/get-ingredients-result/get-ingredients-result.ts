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
        console.log('🦄 ', JSON.stringify(event, null, 4));
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

        const resultForFrontEnd = res.Items;

        // do some stuff here! will have the full db object should do some validation on it
        // do some filtering and remove any unwanted shizz

        const respsonse: APIGatewayProxyResult = {
            statusCode: 200,
            body: JSON.stringify(res.Items),
        };

        return respsonse;
    } catch (error) {
        const errResponse: APIGatewayProxyResult = {
            statusCode: 400,
            body: JSON.stringify(error, null, 4),
        };

        return errResponse;
    }
};
