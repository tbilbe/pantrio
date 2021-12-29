import {
    StartDocumentTextDetectionCommand,
    GetDocumentTextDetectionCommand,
    DetectDocumentTextCommand,
} from '@aws-sdk/client-textract';
import { textractClient } from '~helpers/textract';
import { S3Handler } from 'aws-lambda';
import textractParser, { BlockType, Document } from '@briancullen/aws-textract-parser';
import { dynamoDocClient } from '~helpers/dynamo';
import { PutCommand } from '@aws-sdk/lib-dynamodb';

const stage = process.env.stage;

export const handler: S3Handler = async (event) => {
    try {
        console.log('event ->', event);
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

        const userIdInHereMaybe = object.key;

        const dynamoItem = {
            pk: `USER#${userIdInHereMaybe}`,
            sk: `CREATED#${new Date().toISOString()}`,
            rawTextResults: results,
        };

        await dynamoDocClient.send(new PutCommand({ TableName: `Recipe-${stage}`, Item: dynamoItem }));
    } catch (e) {
        console.error('error:', e);
        throw e;
    }
};
