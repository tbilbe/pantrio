import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoClient, dynamoDocClient } from '~helpers/dynamo';
import { getEnvironmentVariableOrThrow } from '~helpers/utils';
const tableName = getEnvironmentVariableOrThrow('TABLE_NAME');

type RecipeMeta = {
    title: string;
    locationOfRecipe: string;
    servingSize: number;
    mealTime: string;
    cuisine: string;
    recipeId: string;
};

type Ingredient = {
    unit: string;
    amount: number;
    ingredient: string;
    instruction: string;
};

type Recipe = {
    recipeMeta: RecipeMeta;
    pantrioIngredientsV2: Ingredient[];
    rawTextResults: string[];
    pk: string;
};

export const handler: APIGatewayProxyHandler = async (event) => {
    // grab the userId from the event header
    // grab the photo id in the request
    // use the photo id and userId to query dynamo for the result
    try {
        console.log('🦄 ', JSON.stringify(event, null, 4));
        const { photoid } = event.pathParameters as Record<string, unknown>;
        console.log(
            '🚀 ~ file: get-ingredients-result.ts ~ line 37 ~ consthandler:APIGatewayProxyHandler= ~ photoId',
            photoid,
        );

        const res = await dynamoClient.send(
            new QueryCommand({
                TableName: tableName,
                KeyConditionExpression: '#id = :value',
                ExpressionAttributeValues: {
                    ':value': `RECIPE#${photoid}`,
                },
                ExpressionAttributeNames: { '#id': 'pk' },
            }),
        );

        console.log('🚀 ~ file: get-ingredients-result.ts ~ line 52 ~ consthandler:APIGatewayProxyHandler= ~ res', res);

        if (!res.Items?.length) throw new Error('urgh, we lost the recipe!');

        const resultForFrontEnd = res.Items as unknown as Recipe[];
        console.log(
            '🚀 ~ file: get-ingredients-result.ts ~ line 58 ~ consthandler:APIGatewayProxyHandler= ~ resultForFrontEnd',
            resultForFrontEnd,
        );

        // do some stuff here! will have the full db object should do some validation on it
        // do some filtering and remove any unwanted shizz

        // const rawResult = resultForFrontEnd[0].rawTextResults; // not used yet!
        const ingredients = resultForFrontEnd[0].pantrioIngredientsV2;
        console.log(
            '🚀 ~ file: get-ingredients-result.ts ~ line 64 ~ consthandler:APIGatewayProxyHandler= ~ ingredients',
            ingredients,
        );

        const validIngredients = ingredients.map((el) => {
            if (el.amount > 0 && el.unit) {
                return el;
            } else {
                // need more validation but if no amount then check the raw results block
                return {
                    instruction: el.instruction,
                    unknownValue: true,
                };
            }
        });

        console.log('validated ->', JSON.stringify(validIngredients, null, 4));

        const response: APIGatewayProxyResult = {
            statusCode: 200,
            body: JSON.stringify(validIngredients),
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

// const validCheck = (el: Ingredient) => {
//     if (el.amount > 0 && el.unit !== null) {
//         // we def have something
//         return el;
//     } else if (el.amount === 0 && el.unit) {
//         // we have something but not sure!
//     }
// }
