import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { mock } from 'jest-mock-extended';
import { DynamoDBRecord } from '~types/aws-lambda';
import { handler } from './textract-result';

const dynamoDocMock = mockClient(DynamoDBDocumentClient);

const createMockStreamEvent = (records: Record<string, unknown>[] = []) => ({
    Records: records.map(
        (i) =>
            ({
                eventName: 'INSERT',
                dynamodb: {
                    NewImage: marshall(i),
                    Keys: marshall({ pk: i.pk, sk: i.sk }, { removeUndefinedValues: true }),
                },
            } as DynamoDBRecord),
    ),
});

beforeEach(() => {
    dynamoDocMock.reset();
    dynamoDocMock.resolves({});
});

test(`GIVEN a call to the handler 
WHEN the dynamo stream does not contain raw textract data
THEN the handler throws`, async () => {
    const mockEvt = createMockStreamEvent([
        {
            Records: [
                {
                    dynamodb: {
                        Keys: {
                            pk: { S: 'USER#fake_user_id' },
                            sk: { S: `CREATED#${new Date().toISOString()}` },
                            notRawTextractAttr: { S: 'no data here' },
                        },
                    },
                },
            ],
        },
    ]);

    await expect(handler(mockEvt, mock(), mock())).rejects.toThrow();
});

test(`GIVEN a call to the handler
WHEN the stream event contains raw textract data
THEN the handler writes back in to dynamo`, async () => {
    const mockEvt = createMockStreamEvent([
        {
            Records: [
                {
                    dynamodb: {
                        Keys: {
                            pk: { S: 'USER#fake_user_id' },
                            sk: { S: `CREATED#${new Date().toISOString()}` },
                            rawTextResults: ['hi i am a string'],
                        },
                    },
                },
            ],
        },
    ]);

    await expect(handler(mockEvt, mock(), mock())).resolves.not.toThrow();
    expect(dynamoDocMock.commandCalls(PutCommand).length).toBe(1);
});
