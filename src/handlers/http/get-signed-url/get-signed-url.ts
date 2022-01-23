import { s3Client } from '~helpers/s3';
import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { GetObjectCommand, PutObjectCommand, PutObjectCommandInput } from '@aws-sdk/client-s3';
import { getEnvironmentVariableOrThrow } from '~helpers/utils';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
const bucketName = getEnvironmentVariableOrThrow('BUCKET_NAME');

export const handler: APIGatewayProxyHandler = async (event) => {
    return await getUploadURL(event);
};

const getUploadURL = async (event: APIGatewayProxyEvent) => {
    /*
     using random here for now, want to grab the user id somehow from headers and decode the jwt maybs
    event.headers.auth ? decode the token 
    */

    // todo
    /* 
        grab the event and inside the initial event the photo id should be in there add this 
        uuid to the 
    */

    console.log(JSON.stringify(event, null, 4));
    const photo = event.headers['photoid'];
    const Key = `${photo}`;
    const URL_EXPIRATION_SECONDS = 300;

    // Get signed URL from S3
    const s3Params: PutObjectCommandInput = {
        Bucket: bucketName,
        Key,
    };

    const command = new PutObjectCommand(s3Params);

    const uploadURL = await getSignedUrl(s3Client, command, { expiresIn: URL_EXPIRATION_SECONDS });

    const signedURL = JSON.stringify({
        uploadURL: uploadURL,
        Key,
    });

    const result: APIGatewayProxyResult = {
        statusCode: 200,
        body: signedURL,
    };

    return result;
};
