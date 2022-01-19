import { s3Client } from '~helpers/s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { GetObjectCommand, PutObjectCommand, PutObjectCommandInput } from '@aws-sdk/client-s3';
import { getEnvironmentVariableOrThrow } from '~helpers/utils';
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
    // event logged out in cloudwatch is lowercase photoid for some reason!
    const photo = event.headers['photoid'];
    console.log('🚀 🦄 ~ file: get-signed-url.ts ~ line 25 ~ getUploadURL ~ photo', photo);
    const Key = `${photo}`;
    const URL_EXPIRATION_SECONDS = 60;

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
