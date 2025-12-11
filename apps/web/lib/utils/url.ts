export const getSiteUrl = () => {
    // 1. If explicitly set in environment (e.g. production)
    if (process.env.NEXT_PUBLIC_SITE_URL) {
        return process.env.NEXT_PUBLIC_SITE_URL;
    }

    // 2. If Vercel environment (preview or production)
    if (process.env.NEXT_PUBLIC_VERCEL_URL) {
        return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
    }

    // 3. Client-side fallback to window location
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }

    // 4. Default fallback for development
    return 'http://localhost:3000';
};
