import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyEventV2 } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { mock } from 'jest-mock-extended';
import { handler } from './update-ingredients-meta';

const mockDynamoClient = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
    mockDynamoClient.reset();
    mockDynamoClient.resolves({});
});

test(`GIVEN a call to the handler
WHEN there is no body 
THEN the handler returns 400 & no body in req`, async () => {
    const mockEvent = {
        body: undefined,
        headers: {},
    } as APIGatewayProxyEventV2;
    const res = await handler(mockEvent, mock(), mock());

    expect(res).toEqual({ statusCode: 400, body: 'no body in request!' });
});

test(`GIVEN a call to the handler
WHEN there is no body
THEN the handler returns 400 and NO PHOTO ID IN REQUEST`, async () => {
    const mockEvent = {
        body: { photoIDWRONG: 'blah', recipeMeta: { title: 'hello', location: 'jamie oliver' } },
        headers: {},
    } as unknown as APIGatewayProxyEventV2;
    const res = await handler(mockEvent, mock(), mock());

    expect(res).toStrictEqual({ statusCode: 400, body: 'no photo id in request' });
});
