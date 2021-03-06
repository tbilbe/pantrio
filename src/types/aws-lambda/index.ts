import { AttributeValue as AttributeValueDynamo } from '@aws-sdk/client-dynamodb';
import { Handler } from 'aws-lambda';

export type AttributeValue = AttributeValueDynamo;
// http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_streams_StreamRecord.html
export interface StreamRecord {
    ApproximateCreationDateTime?: number | undefined;
    Keys?: { [key: string]: AttributeValue } | undefined;
    NewImage?: { [key: string]: AttributeValue } | undefined;
    OldImage?: { [key: string]: AttributeValue } | undefined;
    SequenceNumber?: string | undefined;
    SizeBytes?: number | undefined;
    StreamViewType?: 'KEYS_ONLY' | 'NEW_IMAGE' | 'OLD_IMAGE' | 'NEW_AND_OLD_IMAGES' | undefined;
}
// http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_streams_Record.html
export interface DynamoDBRecord {
    awsRegion?: string | undefined;
    dynamodb?: StreamRecord | undefined;
    eventID?: string | undefined;
    eventName?: 'INSERT' | 'MODIFY' | 'REMOVE' | undefined;
    eventSource?: string | undefined;
    eventSourceARN?: string | undefined;
    eventVersion?: string | undefined;
    userIdentity?: {
        principalId?: string;
        type?: string;
    };
}
// http://docs.aws.amazon.com/lambda/latest/dg/eventsources.html#eventsources-ddb-update
export interface DynamoDBStreamEvent {
    Records: DynamoDBRecord[];
}
export type DynamoDBStreamHandler = Handler<DynamoDBStreamEvent, void>;
