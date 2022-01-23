import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { mocked } from 'jest-mock';
import { mock } from 'jest-mock-extended';
import { setTag } from '~helpers/observability';
import { handler } from './get-url-for-letter-upload';

jest.mock('@aws-sdk/s3-presigned-post');
const mockS3Client = mockClient(S3Client);

const defaultHeaders = {
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Origin': '*',
};

const mockPresignedPostResult = { url: 'test', fields: { test: 'test' } };

beforeEach(() => {
    mockS3Client.reset();
    mockS3Client.resolves({});

    mocked(createPresignedPost).mockResolvedValue(mockPresignedPostResult);
});

test(`GIVEN a call to the handler
WHEN the handler is successfully invoked
THEN the handler returns 200 and url string`, async () => {
    const expectedResponse = {
        headers: defaultHeaders,
        body: JSON.stringify({ message: 'Retrieved presigned URL', ...mockPresignedPostResult }),
        statusCode: 200,
    };

    const mockEvent = {
        body: JSON.stringify({ orderId: 'test', fileType: 'image/png' }),
        requestContext: { authorizer: { userId: 'test' } },
    } as unknown as APIGatewayProxyEvent;
    const res = await handler(mockEvent, mock(), mock());

    expect(res).toStrictEqual(expectedResponse);
    expect(setTag).toBeCalledWith('event', JSON.stringify(mockEvent, null, 4));
});

test(`GIVEN a call to the handler
WHEN there is no event body
THEN it returns a 400`, async () => {
    const expectedResponse = {
        headers: defaultHeaders,
        body: JSON.stringify({ message: 'Missing body' }),
        statusCode: 400,
    };

    const mockEvent = {} as APIGatewayProxyEvent;
    const res = await handler(mockEvent, mock(), mock());

    expect(res).toStrictEqual(expectedResponse);
});

test(`GIVEN a call to the handler
WHEN there is no orderId
THEN it returns a 400`, async () => {
    const expectedResponse = {
        headers: defaultHeaders,
        body: JSON.stringify({ message: 'Missing fields in body' }),
        statusCode: 400,
    };

    const mockEvent = { body: JSON.stringify({ fileType: 'image/png' }) } as APIGatewayProxyEvent;
    const res = await handler(mockEvent, mock(), mock());

    expect(res).toStrictEqual(expectedResponse);
});

test(`GIVEN a call to the handler
WHEN there is no fileType
THEN it returns a 400`, async () => {
    const expectedResponse = {
        headers: defaultHeaders,
        body: JSON.stringify({ message: 'Missing fields in body' }),
        statusCode: 400,
    };

    const mockEvent = { body: JSON.stringify({ orderId: 'test' }) } as APIGatewayProxyEvent;
    const res = await handler(mockEvent, mock(), mock());

    expect(res).toStrictEqual(expectedResponse);
});

test(`GIVEN a call to the handler
WHEN the fileType is in valid
THEN it returns a 400`, async () => {
    const expectedResponse = {
        headers: defaultHeaders,
        body: JSON.stringify({ message: 'Invalid file type' }),
        statusCode: 400,
    };

    const mockEvent = { body: JSON.stringify({ orderId: 'test', fileType: 'test' }) } as APIGatewayProxyEvent;
    const res = await handler(mockEvent, mock(), mock());

    expect(res).toStrictEqual(expectedResponse);
});

test(`GIVEN a call to the handler
WHEN the userId is missing
THEN it returns a 400`, async () => {
    const expectedResponse = {
        headers: defaultHeaders,
        body: JSON.stringify({ message: 'Missing user ID' }),
        statusCode: 400,
    };

    const mockEvent = {
        body: JSON.stringify({ orderId: 'test', fileType: 'image/png' }),
        requestContext: { authorizer: {} },
    } as unknown as APIGatewayProxyEvent;
    const res = await handler(mockEvent, mock(), mock());

    expect(res).toStrictEqual(expectedResponse);
});
