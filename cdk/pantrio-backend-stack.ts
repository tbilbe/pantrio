import * as cdk from '@aws-cdk/core';
import * as path from 'path';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3n from '@aws-cdk/aws-s3-notifications';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apigateway from '@aws-cdk/aws-apigateway';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as iam from '@aws-cdk/aws-iam';
import { DynamoEventSource } from '@aws-cdk/aws-lambda-event-sources';
import { StartingPosition } from '@aws-cdk/aws-lambda';
import { table } from 'console';

export interface PantrioStackProps extends cdk.StackProps {
    stage: string;
}

export class PantrioBackendStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props: PantrioStackProps) {
        super(scope, id, props);

        const recipeTable = new dynamodb.Table(this, `Table`, {
            tableName: `Pantrio-table-cdk-${props.stage}`,
            partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
            stream: dynamodb.StreamViewType.NEW_IMAGE,
        });

        const corsRulesForRawImageBkt: s3.CorsRule = {
            allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.HEAD],
            allowedOrigins: ['*'],
            allowedHeaders: ['*'],
        };

        const textractServiceRole = new iam.Role(this, 'TextractServiceRole', {
            assumedBy: new iam.ServicePrincipal('textract.amazonaws.com'),
        });

        // Provisions PolicyStatement for textractServiceRole
        // NOTE - addActions and addResources should have more fine-grained policy settings
        const policyStatement = new iam.PolicyStatement();
        policyStatement.addActions('*');
        policyStatement.addResources('*');
        textractServiceRole.addToPolicy(policyStatement);

        const rawRecipeImageBucket = new s3.Bucket(this, 'RawRecipeBucket', {
            bucketName: `pantrio-raw-recipe-images-${props.stage}`,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            cors: [corsRulesForRawImageBkt],
        });

        // const snsTopic = new sns.Topic(this, 'textract-complete-topic', {
        //     displayName: 'Textract Completed SNSTopic',
        // });

        const importRawRecipeImage = new NodejsFunction(this, 'ImportRawRecipeImage', {
            memorySize: 256,
            timeout: cdk.Duration.seconds(10),
            runtime: lambda.Runtime.NODEJS_14_X,
            handler: 'handler',
            entry: path.join(__dirname, `/../src/handlers/events/recipe-image/index.ts`),
            environment: {
                TABLE_NAME: recipeTable.tableName,
            },
        });

        importRawRecipeImage.addToRolePolicy(
            new iam.PolicyStatement({
                actions: ['textract:*'],
                resources: ['*'],
            }),
        );

        // snsTopic.grantPublish(textractServiceRole);

        recipeTable.grantReadWriteData(importRawRecipeImage);
        recipeTable.grant(importRawRecipeImage, 'dynamodb:PutItem');
        rawRecipeImageBucket.grantRead(importRawRecipeImage);

        rawRecipeImageBucket.addEventNotification(
            s3.EventType.OBJECT_CREATED,
            new s3n.LambdaDestination(importRawRecipeImage),
        );

        const sendTextractToDynamo = new NodejsFunction(this, 'TextractResultLambda', {
            entry: path.join(__dirname, '/../src/handlers/events/textract-result/index.ts'),
        });

        sendTextractToDynamo.addEventSource(
            new DynamoEventSource(recipeTable, {
                startingPosition: StartingPosition.LATEST,
                batchSize: 1,
            }),
        );

        const getSignedUrlToStoreRawImage = new NodejsFunction(this, 'GetSignedUrlToStoreRawImage', {
            handler: 'handler',
            entry: path.join(__dirname, `/../src/handlers/http/get-signed-url/index.ts`),
        });

        const getStoredTextractResult = new NodejsFunction(this, 'GetStoredTextractResult', {
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_14_X,
            memorySize: 256,
            entry: path.join(__dirname, `/../src/handlers/http/get-stored-textract-result/index.ts`),
        });

        const api = new apigateway.RestApi(this, 'PantrioApi', {
            restApiName: 'Recipe Service',
            description: 'this service provides access to recipe storage and parsing',
        });

        api.root.addResource('s3').addMethod('GET', new apigateway.LambdaIntegration(getSignedUrlToStoreRawImage));
        api.root.addResource('recipe').addMethod('GET', new apigateway.LambdaIntegration(getStoredTextractResult));
    }
}
