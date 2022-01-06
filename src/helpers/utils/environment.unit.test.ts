import { getEnvironmentVariableOrThrow, MissingEnvironmentVariableError } from './environment';

test(`GIVEN a call to the environmentVariable or throw
WHEN it is successful
THEN it gives back a string value`, async () => {
    process.env.TEST_VAR = 'TESTING_123';

    expect(getEnvironmentVariableOrThrow('TEST_VAR')).toBe('TESTING_123');
    expect(() => getEnvironmentVariableOrThrow('FAKE_DO_NOT_FIND')).toThrow(MissingEnvironmentVariableError);
});

test(`GIVEN a call to the environmentVariable or throw
WHEN it is not successful
THEN it throws`, async () => {
    expect(() => getEnvironmentVariableOrThrow('FAKE_DO_NOT_FIND')).toThrow(MissingEnvironmentVariableError);
});
