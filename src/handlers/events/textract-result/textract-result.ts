import { DynamoDBStreamHandler } from '~types/aws-lambda';

export const handler: DynamoDBStreamHandler = (event) => {
    try {
        console.log('event', JSON.stringify(event, null, 4));
    } catch (error) {}
};
