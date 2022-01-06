export class MissingEnvironmentVariableError extends Error {
    constructor(varName: string) {
        super(`Variable ${varName} is empty`);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = MissingEnvironmentVariableError.name;
    }
}

export const getEnvironmentVariableOrThrow = (variableName: string) => {
    const environmentVariable = process.env[variableName];
    if (!environmentVariable) {
        throw new MissingEnvironmentVariableError(variableName);
    }

    return environmentVariable;
};
