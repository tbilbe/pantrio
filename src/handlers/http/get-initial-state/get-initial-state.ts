import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoClient } from '~helpers/dynamo';
import { getEnvironmentVariableOrThrow } from '~helpers/utils';
const tableName = getEnvironmentVariableOrThrow('TABLE_NAME');

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const userId = event.requestContext.authorizer?.sub ?? event.requestContext.authorizer?.username;

        if (!userId) throw new Error('invalid user id');
        const recipes = [];
        const shoppingLists = [];

        const userRecipesResponse = await dynamoClient.send(
            new QueryCommand({
                TableName: tableName,
                KeyConditionExpression: 'pk = :recipe AND sk = :user',
                ExpressionAttributeValues: {
                    ':recipe': 'RECIPE_ITEM',
                    ':user': `${userId}`,
                },
            }),
        );

        userRecipesResponse.Items?.length && recipes.push(...userRecipesResponse.Items);

        console.log('recipes array after user recipes', recipes.length);

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

            initialRecipesResponse.Items?.length && recipes.push(...initialRecipesResponse.Items);
        }

        console.log('recipes array after adding initial recipes', recipes.length);

        const mappedRecipes = recipes.map((recipe) => ({
            id: recipe?.id,
            mealTime: recipe?.mealTime,
            recipeLocation: recipe?.recipeLocation,
            parsedIngredients: recipe?.parsedIngredients,
            cuisine: recipe?.cuisine,
            servingSize: recipe?.servingSize,
            rawTextResults: recipe?.rawTextResults,
            title: recipe?.title,
        }));

        const userShoppingListResponse = await dynamoClient.send(
            new QueryCommand({
                TableName: tableName,
                KeyConditionExpression: 'pk = :shoppingList AND sk = :user',
                ExpressionAttributeValues: {
                    ':shoppingList': `SHOPPING_LIST_ITEM`,
                    ':user': `${userId}`,
                },
            }),
        );

        userShoppingListResponse.Items?.length && shoppingLists.push(...userShoppingListResponse.Items);

        if (userShoppingListResponse.Items && userShoppingListResponse.Items.length < 5) {
            const initialShoppingListResponse = await dynamoClient.send(
                new QueryCommand({
                    TableName: tableName,
                    KeyConditionExpression: 'pk = :initialShoppingList',
                    ExpressionAttributeValues: {
                        ':initialShoppingList': `INITIAL_SHOPPING_LISTS`,
                    },
                }),
            );

            initialShoppingListResponse.Items?.length && shoppingLists.push(...initialShoppingListResponse.Items);
        }

        const mappedShoppingLists = shoppingLists.map((shoppingList) => ({
            id: shoppingList?.id,
            shoppingListTitle: shoppingList?.shoppingListTitle,
            miscItems: shoppingList?.miscItems,
            recipeTitles: shoppingList?.recipeTitles,
            shoppingListElements: shoppingList?.shoppingListElements,
        }));

        const response = {
            statusCode: 200,
            body: JSON.stringify({
                recipes: mappedRecipes,
                shoppingLists: mappedShoppingLists,
            }),
        };
        console.log(
            '🚀 ~ file: get-initial-state.ts ~ line 72 ~ consthandler:APIGatewayProxyHandler= ~ response',
            JSON.stringify(response),
        );

        return response;
    } catch (error) {
        const errResponse: APIGatewayProxyResult = {
            statusCode: 400,
            body: JSON.stringify(error, null, 4),
        };
        return errResponse;
    }
};
