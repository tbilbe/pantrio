#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { PantrioBackendStack, PantrioStackProps } from '../cdk/pantrio-backend-stack';

const app = new cdk.App();

const stackProps: PantrioStackProps = {
    stage: 'dev',
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT ?? '',
        region: process.env.CDK_DEFAULT_REGION ?? '',
    },
};

new PantrioBackendStack(app, 'PantrioBackendStack', stackProps);
