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
};

new PantrioBackendStack(app, 'PantrioBackendStack', stackProps);
