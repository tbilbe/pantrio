import * as cdk from '@aws-cdk/core';
import * as path from 'path';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3n from '@aws-cdk/aws-s3-notifications';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apigateway from '@aws-cdk/aws-apigateway';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as iam from '@aws-cdk/aws-iam';

export interface PantrioStackProps extends cdk.StackProps {
    stage: string;
}

export class PantrioBackendStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props: PantrioStackProps) {
        super(scope, id, props);

        const recipeTable = new dynamodb.Table(this, `Table`, {
            tableName: `Pantrio-table-${props.stage}`,
            partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
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

        const rawRecipesBucket = new s3.Bucket(this, 'RawRecipesBucket', {
            bucketName: `pantrio-raw-recipes-${props.stage}`,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            cors: [corsRulesForRawImageBkt],
        });

        const processRawRecipeImage = new NodejsFunction(this, 'processRawRecipeImage', {
            functionName: `${this.stackName}-ProcessRawRecipeImage`,
            memorySize: 256,
            timeout: cdk.Duration.seconds(10),
            runtime: lambda.Runtime.NODEJS_14_X,
            handler: 'handler',
            entry: path.join(__dirname, `/../src/handlers/events/recipe-image/index.ts`),
            environment: {
                TABLE_NAME: recipeTable.tableName,
            },
        });

        processRawRecipeImage.addToRolePolicy(
            new iam.PolicyStatement({
                actions: ['textract:*'],
                resources: ['*'],
            }),
        );

        recipeTable.grantReadWriteData(processRawRecipeImage);
        recipeTable.grant(processRawRecipeImage, 'dynamodb:PutItem');
        rawRecipesBucket.grantRead(processRawRecipeImage);

        rawRecipesBucket.addEventNotification(
            s3.EventType.OBJECT_CREATED,
            new s3n.LambdaDestination(processRawRecipeImage),
        );

        const getUrlForRecipeUploadLambda = new NodejsFunction(this, 'GetUrlForRecipeUploadLambda', {
            functionName: `${this.stackName}-GetUrlForRecipeUploadLambda`,
            handler: 'handler',
            entry: path.join(__dirname, `/../src/handlers/http/get-signed-url/index.ts`),
            environment: {
                BUCKET_NAME: rawRecipesBucket.bucketName,
            },
        });

        rawRecipesBucket.grantPut(getUrlForRecipeUploadLambda);

        const getIngredientsResult = new NodejsFunction(this, 'GetIngredientsResult', {
            functionName: `${this.stackName}-GetIngredientsResult`,
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_14_X,
            memorySize: 256,
            entry: path.join(__dirname, `/../src/handlers/http/get-ingredients-result/index.ts`),
        });

        recipeTable.grantReadWriteData(getIngredientsResult);

        const updateIngredientsMeta = new NodejsFunction(this, 'UpdateIngredientsMeta', {
            functionName: `${this.stackName}-UpdateIngredientsMeta`,
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_14_X,
            memorySize: 256,
            entry: path.join(__dirname, `/../src/handlers/http/update-ingredients-meta/index.ts`),
            environment: {
                TABLE_NAME: recipeTable.tableName,
            },
        });

        recipeTable.grantReadWriteData(updateIngredientsMeta);

        const api = new apigateway.RestApi(this, 'PantrioApi', {
            restApiName: 'Recipe Service',
            description: 'this service provides access to recipe storage and parsing',
        });

        //1. presigned url
        api.root.addResource('s3').addMethod('GET', new apigateway.LambdaIntegration(getUrlForRecipeUploadLambda));
        //2. update meta ingredients for a complete recipe item
        const updateIngredients = api.root.addResource('updateIngredients');
        const updateMeta = updateIngredients.addResource('{photoid}');
        updateMeta.addMethod('POST', new apigateway.LambdaIntegration(updateIngredientsMeta)); //put method?
        //3. get ingredients from textract result
        const ingredients = api.root.addResource('ingredients');
        const singleRecipeIngredientsResult = ingredients.addResource('{photoid}');
        singleRecipeIngredientsResult.addMethod('GET', new apigateway.LambdaIntegration(getIngredientsResult));
    }
}
