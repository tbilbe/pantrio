import '@aws-cdk/assert/jest';
import * as cdk from '@aws-cdk/core';
import {
    arrayWith,
    expect as cdkExepct,
    countResourcesLike,
    haveResourceLike,
    objectLike,
    stringLike,
} from '@aws-cdk/assert';
import { CfnFunction } from '@aws-cdk/aws-lambda';
import { cloneDeep, merge } from 'lodash';
import { PantrioBackendStack, PantrioStackProps } from './pantrio-backend-stack';

let stack: PantrioBackendStack;
const makeStackProps = (overrides: Partial<PantrioStackProps> = {}): PantrioStackProps => {
    return merge(
        {},
        {
            stage: 'dev',
            tags: {
                service: 'pantrio-component',
                env: 'dev',
            },
            env: {
                account: 'test',
                region: 'test',
            },
            environment: {},
        },
        overrides,
    );
};

const stackProps = makeStackProps();

beforeAll(() => {
    const app = new cdk.App();
    stack = new PantrioBackendStack(app, 'MyTestStack', stackProps);
});

test('An S3 pre-signed url lambda is created', () => {
    cdkExepct(stack).to(
        haveResourceLike('AWS::Lambda::Function', {
            FunctionName: `${stack.stackName}-get-signed-url-test`,
            Environment: {
                Variables: {},
            },
        }),
    );
});
