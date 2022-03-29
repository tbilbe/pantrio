#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { PantrioBackendStack, PantrioStackProps } from '../cdk/pantrio-backend-stack';

const app = new cdk.App();

const stackProps: PantrioStackProps = {
    stage: 'dev',
    env: {
        account: '110308496740',
        region: 'eu-west-1',
    },
    jwksEndpoint: `https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_cg6JmiwED/.well-known/jwks.json`,
};

new PantrioBackendStack(app, 'PantrioBackendStack', stackProps);
