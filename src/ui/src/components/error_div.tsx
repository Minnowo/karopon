type ErrorDivProps = {
    errorMsg: string | null;
    className?: string;
};

export function ErrorDiv({errorMsg, className}: ErrorDivProps) {
    if (!errorMsg) {
        return null;
    }

    return <div className={`w-full text-left text-c-red font-bold ${className ?? ''}`}>{errorMsg}</div>;
}
