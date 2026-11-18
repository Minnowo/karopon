// The message shown under a form field the server rejected (docs/api-errors.md).

type FieldErrorProps = {
    // Referenced by the field's aria-describedby so screen readers read the message with it.
    id: string;
    message: string | undefined;
};

// FieldError renders message under its field, or nothing when there is no message.
// The field itself sets aria-invalid and aria-describedby={id}.
export function FieldError({id, message}: FieldErrorProps) {
    if (!message) {
        return null;
    }
    return (
        <small id={id} className="text-c-error">
            {message}
        </small>
    );
}
