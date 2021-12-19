import { s3Client } from '@helpers/s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { GetObjectCommand, GetObjectCommandInput } from '@aws-sdk/client-s3';

export const handler: APIGatewayProxyHandler = async (event) => {
    return await getUploadURL(event);
};

const getUploadURL = async (event: APIGatewayProxyEvent) => {
    /*
     using random here for now, want to grab the user id somehow from headers and decode the jwt maybs
    event.headers.auth ? decode the token 
    */
    const random = Math.floor(Math.random() * 85000);
    const Key = `${random}_${new Date().toISOString()}.jpg`;
    const URL_EXPIRATION_SECONDS = 30;

    // Get signed URL from S3
    const s3Params: GetObjectCommandInput = {
        Bucket: 'bucketName',
        Key,
    };

    const command = new GetObjectCommand(s3Params);
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
