// RFC 9457 problem details, the body of every converted API error.
// Mirrors src/api/problem.go; the format is described in docs/api-errors.md.

export const ProblemContentType = 'application/problem+json';

export const ProblemTypeValidation = 'https://github.com/Minnowo/karopon/blob/main/docs/api-errors.md#validation-error';

export const ProblemTypeAlreadyExists = 'https://github.com/Minnowo/karopon/blob/main/docs/api-errors.md#already-exists';

export type FieldProblem = {
    // User-facing message for the field.
    detail: string;
    // JSON Pointer in URI fragment form into the request body, e.g. "#/portion".
    pointer: string;
};

export type Problem = {
    // Absent means "about:blank".
    type?: string;
    title: string;
    status: number;
    // User-facing message: what happened and what to do.
    detail?: string;
    errors?: FieldProblem[];
};
