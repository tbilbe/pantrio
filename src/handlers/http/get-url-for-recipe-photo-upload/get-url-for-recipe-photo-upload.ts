import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { apiGatewayResult } from '~helpers/api-gateway';
import { s3Client } from '~helpers/s3';
import { getEnvironmentVariableOrThrow } from '~helpers/utils';

const { IMAGE_PNG, IMAGE_JPEG, IMAGE_JPG, APPLICATION_PDF } = LetterUploadURLRequestBody.fileType;
const fileTypes = [IMAGE_PNG, IMAGE_JPEG, IMAGE_JPG, APPLICATION_PDF];

const bucketName = getEnvironmentVariableOrThrow('BUCKET_NAME');

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        console.log('🚧 -> event', JSON.stringify(event, null, 4));
        if (!event.body) throw new Error('Missing body');

        const body = JSON.parse(event.body) as LetterUploadURLRequestBody;
        if (!body.orderId || !body.fileType) throw new Error('Missing fields in body');

        if (!fileTypes.includes(body.fileType)) throw new Error('Invalid file type');

        const userId = event.requestContext.authorizer?.userId;
        if (!userId) throw new Error('Missing user ID');

        // Structure gives us room to expand with multiple file uploads
        const Key = `${userId}/${body.orderId}/${new Date().toISOString()}/1`;

        const url = await createPresignedPost(s3Client, {
            Bucket: bucketName,
            Key,
            Conditions: [
                ['content-length-range', 0, 1000000 * 25],
                ['eq', '$Content-Type', body.fileType],
            ],
            Expires: 60 * 2,
        });

        return apiGatewayResult({ body: { message: 'Retrieved presigned URL', ...url } });
    } catch (error) {
        setTag('error', error);

        return apiGatewayResult({
            statusCode: 400,
            body: { message: getErrorMessage(error) },
        });
    }
};
