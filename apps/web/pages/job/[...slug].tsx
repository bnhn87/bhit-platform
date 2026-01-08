import { GetServerSideProps } from 'next';

// This catch-all page ensures ANY subpath of /job/ (e.g. /job/123, /job/123/floorplan)
// is permanently redirected to the corresponding path in /jobs/.
export default function LegacyJobCatchAllRedirect() {
    return null; // No UI needed, redirect happens separate from render
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    const { slug } = context.params || {};
    // slug is string[] because it's [...slug]
    const path = Array.isArray(slug) ? slug.join('/') : slug || '';

    return {
        redirect: {
            destination: `/jobs/${path}`,
            permanent: true, // 301 Redirect
        },
    };
};
