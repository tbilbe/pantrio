import { APIGatewayProxyHandler } from 'aws-lambda';
import { getEnvironmentVariableOrThrow } from '~helpers/utils';
const tableName = getEnvironmentVariableOrThrow('TABLE_NAME');

export const handler: APIGatewayProxyHandler = (event) => {
    try {
        console.log('🦺 - event', JSON.stringify(event, null, 4));
        console.log('todo');
        /*
        grab the id header
        grab the body and do an update... 
        */
    } catch (error) {}
};
