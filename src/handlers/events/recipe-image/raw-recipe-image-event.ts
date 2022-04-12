/*
    S3 lambda trigger - triggered when a new object lands in the raw Recipe bucket
    process image via textract and then result lands in dynamo
*/
import { DetectDocumentTextCommand } from '@aws-sdk/client-textract';
import { textractClient } from '~helpers/textract';
import { S3Handler } from 'aws-lambda';
import { BlockType } from '@briancullen/aws-textract-parser';
import { dynamoDocClient } from '~helpers/dynamo';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { getEnvironmentVariableOrThrow } from '~helpers/utils';
import { pantrioParserV2 } from '~services/parser/parse-recipe-ingredients';

const tableName = getEnvironmentVariableOrThrow('TABLE_NAME');

export const handler: S3Handler = async (event, context) => {
    try {
        console.log('✏️ event ->', JSON.stringify(event, null, 4));
        const { bucket, object } = event.Records[0].s3;

        console.log(
            '🚀 ~ file: raw-recipe-image-event.ts ~ line 21 ~ consthandler:S3Handler= ~ bucket, object',
            bucket,
            object,
        );

        const output = await textractClient.send(
            new DetectDocumentTextCommand({
                Document: {
                    S3Object: {
                        Bucket: bucket.name,
                        Name: object.key,
                    },
                },
            }),
        );

        const rawResults = [];
        if (output.Blocks) {
            for (const item of output.Blocks) {
                if (item.BlockType === BlockType.Line) {
                    rawResults.push(item.Text);
                }
            }
        }
        const recipeIdBlob = object.key;
        /** <userId>/<new Date.toISOString()>/photoId */
        const [userId, photoId] = recipeIdBlob.split('/');

        // try parsing the results here...

        console.log('🚧 ->', rawResults);
        const filteredRes = rawResults.filter(Boolean) as string[];

        // const tryParsingRecipeIngredients = pantrioParser.getIngredientsFromText(filteredRes, true);
        const tryParsingRecipeIngredientsV2 = pantrioParserV2(filteredRes);

        // validation around stuffs here!

        // const validatedParsingV1 = tryParsingRecipeIngredients.map((el) => {
        //     if (el.result && el.result.instruction) {
        //         return {
        //             instruction: el.result.instruction,
        //             unit: el.result.unit,
        //             amount: el.result.amount,
        //             ingredient: el.result.ingredient,
        //         };
        //     } else {
        //         return {
        //             unknownKey: 'parsed value not readable by parser V1',
        //             instruction: el.unknown.instruction,
        //         };
        //     }
        // });

        const validatedParsingV2 = tryParsingRecipeIngredientsV2.map((el) => {
            if (el.quantity && el.unit) {
                return {
                    instruction: el.rawIngredientString,
                    unit: el.unit,
                    amount: el.quantity,
                    ingredient: el.ingredient,
                };
            } else {
                return {
                    unknownKey: 'parsed value not readable by parser V2',
                    instruction: el.rawIngredientString,
                };
            }
        });

        console.log('sending to dynamo 👋🏽');

        await dynamoDocClient.send(
            new PutCommand({
                TableName: tableName,
                Item: {
                    pk: 'RECIPE_ITEM',
                    sk: `${userId}`,
                    photoId: `PHOTOID/${photoId}`,
                    createdDate: new Date().toISOString(),
                    rawTextResults: rawResults,
                    parsedIngredients: validatedParsingV2,
                },
            }),
        );
    } catch (e) {
        console.error('error:', e);
        throw e;
    }
};
