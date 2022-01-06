import { DetectDocumentTextCommand } from '@aws-sdk/client-textract';
import { textractClient } from '~helpers/textract';
import { S3Handler } from 'aws-lambda';
import textractParser, { BlockType, Document } from '@briancullen/aws-textract-parser';
import { dynamoDocClient } from '~helpers/dynamo';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { getEnvironmentVariableOrThrow } from '~helpers/utils';

const stage = process.env.stage;
const tableName = getEnvironmentVariableOrThrow('TABLE_NAME');

export const handler: S3Handler = async (event) => {
    try {
        console.log('✏️ event ->', JSON.stringify(event, null, 4));
        console.table(event);
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

        const results = [];
        if (output.Blocks) {
            for (const item of output.Blocks) {
                if (item.BlockType === BlockType.Line) {
                    results.push(item.Text);
                }
            }
        }

        console.log('🚧 ->', results);

        const photoId = object.key;

        await dynamoDocClient.send(
            new PutCommand({
                TableName: tableName,
                Item: {
                    pk: `RECIPE#${photoId}`,
                    sk: `CREATED#${new Date().toISOString()}`,
                    rawTextResults: results,
                },
            }),
        );
    } catch (e) {
        console.error('error:', e);
        throw e;
    }
};
