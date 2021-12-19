import { APIGatewayProxyHandler } from 'aws-lambda';

export const handler: APIGatewayProxyHandler = async (event) => {
    // grab the userId from the event header
    // grab the photo id in the request
    // use the photo id and userId to query dynamo for the result
    //
};
