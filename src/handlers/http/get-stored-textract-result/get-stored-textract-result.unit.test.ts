import { APIGatewayProxyEvent } from 'aws-lambda/trigger/api-gateway-proxy';
import { mock } from 'jest-mock-extended';
import { handler } from './get-stored-textract-result';

const createMockEvent = (body: Record<string, unknown> = {}): APIGatewayProxyEvent => {
    return {
        body: JSON.stringify(body),
        path: '/api/path/to/resource',
    } as APIGatewayProxyEvent;
};

test(`GIVEN a call to the handler
WHEN the request does not contain an id
THEN the handler throws`, async () => {
    const mockEvent = createMockEvent({ id: null });
    await expect(handler(mockEvent, mock(), mock())).rejects.toThrow();
});

test(`GIVEN a call to the handler
WHEN the request succeeds
THEN the handler returns `, async () => {
    const mockEvent = createMockEvent({ id: 1 });
    const res = await handler(mockEvent, mock(), mock());
    expect(res).toEqual({ statusCode: 200, body: JSON.stringify({ msg: 'hell yes' }) });
});
