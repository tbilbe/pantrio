import {
    StartDocumentTextDetectionCommand,
    GetDocumentTextDetectionCommand,
    DetectDocumentTextCommand,
} from '@aws-sdk/client-textract';
import { textractClient } from '@helpers/textract';
import { S3Handler } from 'aws-lambda';
import textractParser, { BlockType, Document } from '@briancullen/aws-textract-parser';
import { dynamoDocClient } from '@helpers/dynamo';
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
            // new StartDocumentTextDetectionCommand({
            //     DocumentLocation: {
            //         S3Object: {
            //             Bucket: bucket.name,
            //             Name: object.key,
            //         },
            //     },
            //     NotificationChannel: {
            //         RoleArn: 'blah',
            //         SNSTopicArn: 'blah',
            //     },
            // }),
        );
        // console.log(textractResponse.$metadata.requestId);
        // console.log('🚀 ~ file: raw-recipe-image-event.ts ~ line 27 ~ return ~ textractResponse', jobId);
        const results = [];
        if (output.Blocks) {
            for (const item of output.Blocks) {
                if (item.BlockType === BlockType.Line) {
                    results.push(item.Text);
                }
            }
        }

        console.log('🚧 ->', results);
        // if (jobId.JobId) {
        //     const textFromTextract = await textractClient.send(
        //         new GetDocumentTextDetectionCommand({
        //             JobId: jobId.JobId,
        //         }),
        //     );
        //     if (textFromTextract.Blocks) {
        //         for (const item of textFromTextract.Blocks) {
        //             if (item.BlockType === BlockType.Line) {
        //                 results.push(item.Text);
        //             }
        //         }
        //     }
        // }

        // const tParse = textractParser.parseDetectTextResponse(textractResponse) ?? null;
        // console.log('got the doc here! -> tParse: ', tParse);

        const userIdInHereMaybe = object.key;

        const dynamoItem = { pk: `USER#${userIdInHereMaybe}`, sk: `CREATED#${new Date().toISOString()}` };

        // const dynamoItem = marshall({ pk: `USER#${userIdInHereMaybe}`, sk: `CREATED#${new Date().toISOString()}` });

        await dynamoDocClient.send(new PutCommand({ TableName: `Recipe-${stage}`, Item: dynamoItem }));

        // const parseResults = parser.getIngredientsFromText(
        //   tParse,
        //   true
        // );
    } catch (e) {
        console.error('error:', e);
        throw e;
    }
};
