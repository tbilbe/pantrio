import { SNSHandler } from 'aws-lambda';

export const handler: SNSHandler = (event) => {
    try {
        console.log('event', JSON.stringify(event, null, 4));
        let JobId = '';
        JobId = event['Records'][0]['Sns']['Message'];
    } catch (error) {}
};
