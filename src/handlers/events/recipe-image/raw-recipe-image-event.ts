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

export const handler: S3Handler = async (event) => {
    try {
        console.log('✏️ event ->', JSON.stringify(event, null, 4));
        const { bucket, object } = event.Records[0].s3;

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
        const photoId = object.key;

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

        const vslidatedParsingV2 = tryParsingRecipeIngredientsV2.map((el) => {
            if (el.parsed.ingredient.length > 0) {
                return {
                    instruction: el.rawIngredientString,
                    unit: el.parsed.unit,
                    amount: el.parsed.quantity,
                    ingredient: el.parsed.ingredient,
                };
            } else {
                return {
                    unknownKey: 'parsed value not readable by parser V2',
                    instruction: el.rawIngredientString,
                };
            }
        });

        await dynamoDocClient.send(
            new PutCommand({
                TableName: tableName,
                Item: {
                    pk: `RECIPE#${photoId}`,
                    rawTextResults: rawResults,
                    // pantrioIngredients: validatedParsingV1,
                    pantrioIngredientsV2: vslidatedParsingV2,
                },
            }),
        );
    } catch (e) {
        console.error('error:', e);
        throw e;
    }
};
