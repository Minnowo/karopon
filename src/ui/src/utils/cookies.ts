export const GetCookieValue = (name: string): string | null =>
    document.cookie.match(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`)?.pop() ?? null;
