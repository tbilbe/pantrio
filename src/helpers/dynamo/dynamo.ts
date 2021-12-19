import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export type DynamoAttributes<T extends Record<string, unknown> = Record<string, unknown>> = {
    pk: string;
    sk: string;
} & T;

export const dynamoClient = new DynamoDBClient({});

export const dynamoDocClient = DynamoDBDocumentClient.from(dynamoClient);
