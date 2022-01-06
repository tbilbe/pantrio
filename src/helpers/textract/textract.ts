import { TextractClient } from '@aws-sdk/client-textract';

export const textractClient = new TextractClient({
    region: 'eu-west-1',
});
