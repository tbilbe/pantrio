import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { dynamoClient } from '~helpers/dynamo';
import { getEnvironmentVariableOrThrow } from '~helpers/utils';
import { pantrioParser } from '~services/parser/parse-recipe-ingredients';
import { DynamoDBStreamHandler } from '~types/aws-lambda';
const tableName = getEnvironmentVariableOrThrow('TABLE_NAME');

export const handler: DynamoDBStreamHandler = async (event) => {
    try {
        console.log('🚧 event 🚧', JSON.stringify(event, null, 4));
        event.Records.map(async (record) => {
            if (record.eventName !== 'INSERT') {
                console.log('🚧 ', 'record is not insert', '🚧');
                return;
            }
            const pk = record.dynamodb?.Keys?.pk.S;
            const sk = record.dynamodb?.Keys?.sk.S;

            if (!pk) throw new Error('NO Primary Key');
            if (!sk) throw new Error('NO Sort Key');

            if (!pk.includes('RECIPE#')) return;

            const image = record.dynamodb?.NewImage;
            if (!image) {
                throw new Error('No new image');
            }

            const rawRecipe = unmarshall(image);
            console.log('🚀 ~ file: textract-result.ts ~ line 31 ~ event.Records.map ~ rawRecipe', rawRecipe);

            // do the parsing in here!
            // const parsedRecipeIngredients = parseThis(rawRecipe);
            // // send to the processed datastore
            // const processedIngredients = {
            //     processedIngredients: parsedRecipeIngredients,
            //     pk,
            //     sk,
            // };

            // await dynamoClient.send(
            //     new PutCommand({
            //         TableName: tableName,
            //         Item: processedIngredients,
            //     }),
            // );
        });
    } catch (error) {
        throw error;
    }
};

const parseThis = (dummyObj: string[]) => {
    const results = pantrioParser.getIngredientsFromText(dummyObj, true);

    return results;
};
