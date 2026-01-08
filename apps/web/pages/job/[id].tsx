import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

// This is a physical fallback page to ensure /job/[id] NEVER returns a 404.
// It catches the legacy URL and safely redirects to the new structure.

export default function LegacyJobRedirect() {
    const router = useRouter();
    const { id } = router.query;

    useEffect(() => {
        if (id) {
            // Client-side fallback redirect
            window.location.replace(`/jobs/${id}`);
        } else {
            // If no ID for some reason, go to jobs list
            window.location.replace('/jobs');
        }
    }, [id]);

    return <div>Redirecting to new job url...</div>;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    const { id } = context.params || {};

    if (id) {
        return {
            redirect: {
                destination: `/jobs/${id}`,
                permanent: true, // 301 Redirect
            },
        };
    }

    return {
        redirect: {
            destination: '/jobs',
            permanent: true,
        },
    };
};
