import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { DetectDocumentTextCommand, TextractClient } from '@aws-sdk/client-textract';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { BlockType } from '@briancullen/aws-textract-parser';
import { S3Event, S3EventRecord } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { mock, mockDeep } from 'jest-mock-extended';
import { handler } from './raw-recipe-image-event';

const s3ClientMock = mockClient(S3Client);
const textractClientMock = mockClient(TextractClient);
const dynamoDocMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
    s3ClientMock.reset();
    textractClientMock.reset();
    textractClientMock.resolves({});
    dynamoDocMock.reset();
    dynamoDocMock.resolves({});
});

test(`GIVEN the handler receives an s3 event
WHEN s3 fails load to the file
THEN the handler throws`, async () => {
    s3ClientMock.on(GetObjectCommand).rejects({});
    const mockEvent = mock<S3Event>({ Records: [mock<S3EventRecord>()] });
    await expect(handler(mockEvent, mock(), mock())).rejects.toThrow();
});

test(`GIVEN the handler receives an s3 event
WHEN textract fails to receive the image
THEN the handler throws an error`, async () => {
    s3ClientMock.on(GetObjectCommand).resolves({});
    textractClientMock.on(DetectDocumentTextCommand).rejects();
    const mockEvent = mockDeep<S3Event>({ Records: [mock<S3EventRecord>()] });
    await handler(mockEvent, mock(), mock());

    await expect(handler(mockEvent, mock(), mock())).rejects.toThrow();
});

test(`GIVEN the handler receives an s3 event
WHEN textract detects RECIPE text
THEN the handler completes successfully`, async () => {
    textractClientMock
        .on(DetectDocumentTextCommand, {
            Document: {
                S3Object: { Bucket: 'pre-processing-bucket', Name: 'recipeImageId' },
            },
        })
        .resolves({ Blocks: [{ BlockType: 'LINE', Text: 'PLEASE FUCKING WORK!' }] });

    // console.log('🚀', textractClientMock.commandCalls(DetectDocumentTextCommand));

    const mockEvent = mockDeep<S3Event>({
        Records: [
            mockDeep<S3EventRecord>({
                s3: { object: { key: 'recipeImageId' }, bucket: { name: 'pre-processing-bucket' } },
            }),
        ],
    });

    await expect(handler(mockEvent, mock(), mock())).resolves.not.toThrow();
    expect(dynamoDocMock.commandCalls(PutCommand).length).toBe(1);
});
