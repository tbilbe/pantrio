import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoDocClient } from '~helpers/dynamo';
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
    try {
        console.log('🦄 get ingredients result 🦄', JSON.stringify(event, null, 4));
        if (!event.headers.photoid) throw new Error('no photo id header value');
        const photoId = event.headers['photoid'] ?? event.headers['photoId'];

        const userId = event.requestContext.authorizer?.sub ?? event.requestContext.authorizer?.username;
        console.log('🦁, 📸', userId, photoId);
        const params = {
            TableName: tableName,
            KeyConditionExpression: 'pk = :RECIPE_ITEM And sk = :user',
            ExpressionAttributeValues: {
                ':RECIPE_ITEM': `RECIPE_ITEM`,
                ':user': `${userId}`,
            },
            ScanIndexForward: false,
        };

        // 'from work bench'
        // const p2 = {
        //     TableName: 'Pantrio-table-dev',
        //     ScanIndexForward: true,
        //     ConsistentRead: false,
        //     KeyConditionExpression: '#bef90 = :bef90 And #bef91 = :bef91',
        //     ExpressionAttributeValues: {
        //         ':bef90': {
        //             S: 'USER#5f1d5761-bcb2-44b2-9a95-ef6943fd19be',
        //         },
        //         ':bef91': {
        //             S: 'PHOTOID#c4638e94-ceef-4cb4-815f-02b2952c05f5.jpg',
        //         },
        //     },
        //     ExpressionAttributeNames: {
        //         '#bef90': 'pk',
        //         '#bef91': 'sk',
        //     },
        // };
        console.log('🐎', params);
        const res = await dynamoDocClient.send(new QueryCommand(params));
        console.log('🚀 ~ file: get-ingredients-result.ts ~ line 67 ~ consthandler:APIGatewayProxyHandler= ~ res', res);

        if (!res.Items) throw new Error('urgh, we lost the recipe!');

        const resultForFrontEnd = res.Items;

        // do some stuff here! will have the full db object should do some validation on it
        // do some filtering and remove any unwanted shizz

        // const rawResult = resultForFrontEnd[0].rawTextResults; // not used yet!
        const ingredients = resultForFrontEnd[0];

        // do some really dumb parsing here...

        // const dumbParse = pantrioParserV2(ingredients.rawTextResults);

        const mapping = {
            rawTextResults: ingredients.rawTextResults,
            parsed: ingredients.parsedIngredients,
        };

        const response: APIGatewayProxyResult = {
            statusCode: 200,
            body: JSON.stringify(mapping),
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

const dumbParse = (wordsList: string[]) => {};
