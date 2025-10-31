import dynamic from "next/dynamic";
import Script from "next/script";

const SmartQuote = dynamic(() => import("@/modules/smartquote/App"), { ssr: false });

export default function SmartQuotePage() {
  return (
    <>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" strategy="afterInteractive" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" strategy="afterInteractive" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js" strategy="afterInteractive" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" strategy="afterInteractive" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js" strategy="lazyOnload" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.5.0/mammoth.browser.min.js" strategy="afterInteractive" />
      <div style={{
        fontSize: 'clamp(12px, 2.5vw, 14px)',
        lineHeight: '1.4',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        width: '100%',
        maxWidth: '100vw',
        minHeight: '100vh',
        overflow: 'auto',
        boxSizing: 'border-box',
        padding: '0',
        margin: '0'
      }}>
        <SmartQuote />
      </div>
    </>
  );
}
