import {
    DetectDocumentTextCommandInput,
    DetectDocumentTextCommand,
    DetectDocumentTextCommandOutput,
    StartDocumentTextDetectionCommand,
} from '@aws-sdk/client-textract';
import { marshall } from '@aws-sdk/util-dynamodb';
import { textractClient } from '@helpers/textract';
import { S3Handler } from 'aws-lambda';
import textractParser, { Document } from '@briancullen/aws-textract-parser';
import { dynamoDocClient } from '@helpers/dynamo';
import { PutItemCommand } from '@aws-sdk/client-dynamodb';

const stage = process.env.stage;

export const handler: S3Handler = async (event) => {
    try {
        console.log('event', event);
        const { bucket, object } = event.Records[0].s3;

        // await s3Client.send(
        //     new GetObjectCommand({ Bucket: record.s3.bucket.name, Key: fileName }),
        // );

        const textractResponse: DetectDocumentTextCommandOutput = await textractClient.send(
            new StartDocumentTextDetectionCommand({
                DocumentLocation: {
                    S3Object: {
                        Bucket: bucket.name,
                        Name: object.key,
                    },
                },
                NotificationChannel: {
                    RoleArn: 'blah',
                    SNSTopicArn: 'blah',
                },
            }),
        );
        console.log(textractResponse.$metadata.requestId);
        console.log('🚀 ~ file: raw-recipe-image-event.ts ~ line 27 ~ return ~ textractResponse', textractResponse);

        // const tParse = textractParser.parseDetectTextResponse(textractResponse) ?? null;
        // console.log('got the doc here! -> tParse: ', tParse);

        const userIdInHereMaybe = event.Records[0].s3.object.key;

        const dynamoItem = marshall({ pk: `USER#${userIdInHereMaybe}`, sk: `CREATED#${new Date().toISOString()}` });

        await dynamoDocClient.send(new PutItemCommand({ TableName: `Recipe-${stage}`, Item: dynamoItem }));

        // const parseResults = parser.getIngredientsFromText(
        //   tParse,
        //   true
        // );
    } catch (e) {
        console.error('error:', e);
        throw e;
    }
};
