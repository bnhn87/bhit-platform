import { GetServerSideProps } from 'next';

// This page ensures /job (root) is permanently redirected to /jobs
export default function LegacyJobRootRedirect() {
    return null;
}

export const getServerSideProps: GetServerSideProps = async () => {
    return {
        redirect: {
            destination: '/jobs',
            permanent: true, // 301 Redirect
        },
    };
};
