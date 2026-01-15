export const SnakeCaseToTitle = (t: string): string => {
    return t
        .toLowerCase()
        .split('_')
        .map((x) => (x ? x[0].toUpperCase() + x.slice(1) : ''))
        .join(' ');
};
