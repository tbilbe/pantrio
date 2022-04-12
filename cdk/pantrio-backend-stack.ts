import * as cdk from '@aws-cdk/core';
import * as path from 'path';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3n from '@aws-cdk/aws-s3-notifications';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apigateway from '@aws-cdk/aws-apigateway';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as iam from '@aws-cdk/aws-iam';
import * as cognito from '@aws-cdk/aws-cognito';
import { Duration } from '@aws-cdk/core';
export interface PantrioStackProps extends cdk.StackProps {
    stage: string;
    jwksEndpoint: string;
}

export class PantrioBackendStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props: PantrioStackProps) {
        const userPoolId = 'eu-west-1_cg6JmiwED';
        const userpoolClientId = '4jbs296gqffjd7dd0gjeljs6v1';

        super(scope, id, props);

        const recipeTable = new dynamodb.Table(this, `Table`, {
            tableName: `Pantrio-table-${props.stage}`,
            partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
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

        // cognito - create user pool and user pool client
        const userpool = new cognito.UserPool(this, 'pantrio-users', {
            userPoolName: 'pantrio-userpool',
            selfSignUpEnabled: true,
            signInAliases: {
                email: true,
            },
            autoVerify: {
                email: true,
            },
            passwordPolicy: {
                minLength: 6,
                requireLowercase: true,
                requireDigits: true,
                requireUppercase: false,
                requireSymbols: false,
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        const standardCognitoAttributes = {
            givenName: true,
            familyName: true,
            email: true,
            emailVerified: true,
            locale: true,
            fullname: true,
            nickname: true,
            phoneNumber: true,
            preferredUsername: true,
            timezone: true,
            lastUpdateTime: true,
        };

        const clientReadAttributes = new cognito.ClientAttributes().withStandardAttributes(standardCognitoAttributes);

        const clientWriteAttributes = new cognito.ClientAttributes().withStandardAttributes({
            ...standardCognitoAttributes,
            emailVerified: false,
            phoneNumberVerified: false,
        });
        // // 👇 User Pool Client
        const userPoolClient = new cognito.UserPoolClient(this, 'userpool-client', {
            userPool: userpool,
            authFlows: {
                adminUserPassword: true,
                custom: true,
                userSrp: true,
            },
            supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
            readAttributes: clientReadAttributes,
            writeAttributes: clientWriteAttributes,
        });

        const customAuthorizerLambda = new NodejsFunction(this, 'CustomAuthorizerLambda', {
            memorySize: 256,
            timeout: cdk.Duration.seconds(10),
            runtime: lambda.Runtime.NODEJS_14_X,
            handler: 'handler',
            entry: path.join(__dirname, `/../src/handlers/http/custom-authorizer/index.ts`),
            environment: {
                JWKS_ENDPOINT_URL: props.jwksEndpoint,
            },
        });

        const customAuthorizer = new apigateway.TokenAuthorizer(this, 'CustomAuthorizer', {
            handler: customAuthorizerLambda,
            identitySource: 'method.request.header.Authorization',
            resultsCacheTtl: Duration.minutes(0),
        });

        const cognitoPolicyStatement = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'cognito-idp:AdminGetUser',
                'cognito-idp:AdminEnableUser',
                'cognito-idp:AdminDisableUser',
                'cognito-idp:AdminCreateUser',
                'cognito-idp:AdminInitiateAuth',
                'cognito-idp:AdminRespondToAuthChallenge',
                'cognito-idp:AdminConfirmSignUp',
            ],
            resources: [
                `arn:aws:cognito-idp:${userpool.stack.region}:${userpool.stack.account}:userpool/${userpool.userPoolId}`,
            ],
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
            environment: {
                TABLE_NAME: recipeTable.tableName,
            },
        });

        recipeTable.grantReadWriteData(getIngredientsResult);

        const getInitialPantrioState = new NodejsFunction(this, 'GetInitialPantrioState', {
            functionName: `${this.stackName}-GetInitialPantrioState`,
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_14_X,
            memorySize: 256,
            entry: path.join(__dirname, `/../src/handlers/http/get-initial-state/index.ts`),
            environment: {
                TABLE_NAME: recipeTable.tableName,
            },
        });
        recipeTable.grantReadData(getInitialPantrioState);

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

        const getAllRecipesLambda = new NodejsFunction(this, 'GetAllRecipes', {
            functionName: `${this.stackName}-GetAllRecipes`,
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_14_X,
            memorySize: 256,
            entry: path.join(__dirname, `/../src/handlers/http/get-all-recipes/index.ts`),
            environment: {
                TABLE_NAME: recipeTable.tableName,
            },
        });

        recipeTable.grantReadData(getAllRecipesLambda);

        const handlePostRawRecipeImage = new NodejsFunction(this, 'HandlePostRawRecipeImage', {
            functionName: `${this.stackName}-HandlePostRawRecipeImage`,
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_14_X,
            memorySize: 256,
            entry: path.join(__dirname, `/../src/handlers/http/post-recipe-image/index.ts`),
            environment: {
                BUCKET_NAME: rawRecipesBucket.bucketName,
            },
        });

        rawRecipesBucket.grantPut(handlePostRawRecipeImage);

        //Auth lambdas

        const userSignUp = new NodejsFunction(this, 'UserSignUp', {
            functionName: `${this.stackName}-UserSignUp`,
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_14_X,
            memorySize: 256,
            entry: path.join(__dirname, `/../src/handlers/http/user-auth/sign-up/index.ts`),
            environment: {
                USER_POOL_ID: userPoolId,
                USER_POOL_CLIENT_ID: userpoolClientId,
            },
        });

        userSignUp.addToRolePolicy(cognitoPolicyStatement);
        const userSignIn = new NodejsFunction(this, 'UserSignIn', {
            functionName: `${this.stackName}-UserSignIn`,
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_14_X,
            memorySize: 256,
            entry: path.join(__dirname, `/../src/handlers/http/user-auth/sign-in/index.ts`),
            environment: {
                USER_POOL_ID: userPoolId,
                USER_POOL_CLIENT_ID: userpoolClientId,
            },
        });

        userSignIn.addToRolePolicy(cognitoPolicyStatement);

        const userSignOut = new NodejsFunction(this, 'UserSignOut', {
            functionName: `${this.stackName}-UserSignOut`,
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_14_X,
            memorySize: 256,
            entry: path.join(__dirname, `/../src/handlers/http/user-auth/sign-out/index.ts`),
            environment: {
                USER_POOL_ID: userPoolId,
                USER_POOL_CLIENT_ID: userpoolClientId,
            },
        });

        // api
        const api = new apigateway.RestApi(this, 'PantrioApi', {
            restApiName: 'Recipe Service',
            description: 'this service provides access to recipe storage and parsing',
        });
        // api authorizer
        // const auth = new apigateway.CfnAuthorizer(this, 'Authorizor', {
        //     restApiId: api.restApiId,
        //     type: apigateway.AuthorizationType.COGNITO,
        //     providerArns: [userpool.userPoolArn],
        //     name: 'CognitoAuthorizer',
        //     // REQUIRED - https://github.com/aws/aws-cdk/issues/2561
        //     identitySource: 'method.request.header.Authorization',
        // });
        //a. AUTH-stuffs
        const authRoutes = api.root.addResource('auth');
        const signUp = authRoutes.addResource('sign-up');
        const signIn = authRoutes.addResource('sign-in');
        const signOut = authRoutes.addResource('sign-out');

        signUp.addMethod('POST', new apigateway.LambdaIntegration(userSignUp));
        signIn.addMethod('POST', new apigateway.LambdaIntegration(userSignIn));
        signOut.addMethod('POST', new apigateway.LambdaIntegration(userSignOut));

        //1. presigned url
        api.root.addResource('s3').addMethod('GET', new apigateway.LambdaIntegration(getUrlForRecipeUploadLambda), {
            authorizer: customAuthorizer,
        });
        /** /ingredients */
        const ingredients = api.root.addResource('ingredients');

        // get initial data for first load
        /** GET /ingredients/initial-load */
        const loadInitialState = ingredients.addResource('load-initial-state');
        loadInitialState.addMethod('GET', new apigateway.LambdaIntegration(getInitialPantrioState), {
            authorizer: customAuthorizer,
        });

        //2. update meta ingredients for a complete recipe item
        /** POST /ingredients/update-ingredients-metadata */
        const updateIngredients = ingredients.addResource('update-ingredients-metadata');
        updateIngredients.addMethod('POST', new apigateway.LambdaIntegration(updateIngredientsMeta), {
            authorizer: customAuthorizer,
        });

        //3. get ingredients from textract result
        /** GET ingredients/get-pantrio-result */
        const getPantrioResult = ingredients.addResource('get-pantrio-result');
        getPantrioResult.addMethod('GET', new apigateway.LambdaIntegration(getIngredientsResult), {
            authorizer: customAuthorizer,
        });

        //4. get all recipes
        /** GET /recipes/get-all-recipes */
        const getAllRecipes = ingredients.addResource('get-all-recipes');
        getAllRecipes.addMethod('GET', new apigateway.LambdaIntegration(getAllRecipesLambda), {
            authorizer: customAuthorizer,
        });
    }
}
