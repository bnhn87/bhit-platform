// pages/_app.tsx
import type { AppProps } from "next/app";
import Head from "next/head";
import AppNav from "@/components/AppNav";
import "@/styles/globals.css"; // keep if present

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>BHIT OS</title>
      </Head>
      <AppNav />
      <main style={{ padding: 16 }}>
        <Component {...pageProps} />
      </main>
    </>
  );
}
