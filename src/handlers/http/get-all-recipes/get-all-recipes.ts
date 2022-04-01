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

        const allRecipes = [];

        const userRecipesResponse = await dynamoClient.send(
            new QueryCommand({
                TableName: tableName,
                KeyConditionExpression: 'pk = :user',
                ExpressionAttributeValues: {
                    ':user': `USER#${userId}`,
                },
            }),
        );

        // if initial query comes back and is less than 5 recipes keep the initial in the lambda
        if (userRecipesResponse.Items && userRecipesResponse.Items.length < 5) {
            const initialRecipesResponse = await dynamoClient.send(
                new QueryCommand({
                    TableName: tableName,
                    KeyConditionExpression: 'pk = :initialRecipes',
                    ExpressionAttributeValues: {
                        ':initialRecipes': `INITIAL_RECIPES`,
                    },
                }),
            );

            if (initialRecipesResponse.Items) {
                console.log(
                    '🚀 ~ file: get-all-recipes.ts ~ line 44 ~ consthandler:APIGatewayProxyHandler= ~ initialRecipesResponse.Items',
                    initialRecipesResponse.Items,
                );
                allRecipes.push(...initialRecipesResponse.Items);
            }
        }

        if (userRecipesResponse.Items) {
            console.log(
                '🚀 ~ file: get-all-recipes.ts ~ line 49 ~ consthandler:APIGatewayProxyHandler= ~ userRecipesResponse.Items',
                userRecipesResponse.Items,
            );
            allRecipes.push(...userRecipesResponse.Items);
            console.log(
                '🚀 ~ file: get-all-recipes.ts ~ line 51 ~ consthandler:APIGatewayProxyHandler= ~ allRecipes',
                allRecipes,
            );
        }

        // do some validation here on allRecipes to check they have an id and title
        const validRecipes = allRecipes.filter((el) => el.id && el.title);
        console.log(
            '🚀 ~ file: get-all-recipes.ts ~ line 54 ~ consthandler:APIGatewayProxyHandler= ~ validRecipes',
            validRecipes,
        );

        const response: APIGatewayProxyResult = {
            statusCode: 200,
            body: JSON.stringify(validRecipes),
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
