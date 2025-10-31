// apps/web/pages/smart-quote.tsx

import { useState, DragEvent } from 'react';

type ParsedProduct = {
  productCode: string;
  quantity: number;
  cleanDescription: string;
};

const ActionCard = ({ title, description, onClick }: { title: string; description: string; onClick: () => void; }) => (
  <button
    onClick={onClick}
    style={{
      background: '#0e141b',
      border: '1px solid #1d2733',
      borderRadius: '12px',
      padding: '32px',
      textAlign: 'center',
      cursor: 'pointer',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      color: '#e8eef6',
    }}
  >
    <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{title}</h3>
    <p style={{ margin: '8px 0 0', color: '#9fb2c8' }}>{description}</p>
    <div style={{ marginTop: 'auto', color: '#3b82f6', fontWeight: 'bold' }}>Proceed &rarr;</div>
  </button>
);

const HomePage = ({ onSelectView }: { onSelectView: (view: string) => void; }) => (
  <div style={{ textAlign: 'center', padding: '16px' }}>
    <h1 style={{ fontSize: '36px', fontWeight: 'bold' }}>Welcome to SmartQuote</h1>
    <p style={{ fontSize: '18px', color: '#9fb2c8', marginBottom: '32px' }}>
      Your intelligent quoting assistant. Choose an option below to get started.
    </p>
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '24px',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      <ActionCard
        title="Parse Documents"
        description="AI-powered extraction from text or files."
        onClick={() => onSelectView('parsing')}
      />
      <ActionCard
        title="Manual Entry"
        description="Build a quote by selecting products."
        onClick={() => onSelectView('manual')}
      />
      <ActionCard
        title="Quote History"
        description="View your previously saved quotes."
        onClick={() => onSelectView('history')}
      />
      <ActionCard
        title="Admin Panel"
        description="Customize application settings."
        onClick={() => onSelectView('admin')}
      />
    </div>
  </div>
);

const InitialInput = ({
  onParse,
  isLoading
}: {
  onParse: (formData: FormData) => void;
  isLoading: boolean;
}) => {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(prev => [...prev, ...Array.from(event.target.files!)]);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files) {
      setFiles(prev => [...prev, ...Array.from(event.dataTransfer.files)]);
    }
  };

  const removeFile = (fileName: string) => {
    setFiles(prev => prev.filter(file => file.name !== fileName));
  };

  const handleSubmit = () => {
    if (!text.trim() && files.length === 0) return;

    const formData = new FormData();
    if (text.trim()) {
      formData.append('textContent', text.trim());
    }
    files.forEach(file => {
      formData.append('files', file);
    });

    onParse(formData);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Parse Document</h2>
      <p style={{ color: '#9fb2c8', marginBottom: '16px' }}>
        Paste text and/or upload files to extract product details.
      </p>

      <label
        htmlFor="file-upload"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          display: 'block',
          border: `2px dashed ${isDragging ? '#3b82f6' : '#2a3a4a'}`,
          borderRadius: '8px',
          padding: '24px',
          textAlign: 'center',
          marginBottom: '16px',
          cursor: 'pointer',
        }}
      >
        Drag & drop files here, or click to select
      </label>
      <input
        id="file-upload"
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.xlsx,.csv"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {files.length > 0 && (
        <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {files.map((file, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#0e141b',
                padding: '8px 12px',
                borderRadius: '6px',
              }}
            >
              <span>📄 {file.name}</span>
              <button
                onClick={() => removeFile(file.name)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Or paste additional text here..."
        style={{
          width: '100%',
          minHeight: '150px',
          background: '#0e141b',
          border: '1px solid #1d2733',
          borderRadius: '8px',
          color: 'white',
          padding: '12px',
          fontSize: '14px',
          resize: 'vertical',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '16px', gap: '12px' }}>
        <button
          onClick={handleSubmit}
          disabled={isLoading || (!text.trim() && files.length === 0)}
          style={{
            padding: '10px 16px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            opacity: (isLoading || (!text.trim() && files.length === 0)) ? 0.5 : 1,
          }}
        >
          {isLoading ? 'Parsing...' : 'Parse'}
        </button>
      </div>
    </div>
  );
};

export default function SmartQuotePage() {
  const [view, setView] = useState('home');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async (formData: FormData) => {
    setIsLoading(true);
    setParsedProducts([]);
    setError(null);

    try {
      const response = await fetch('/api/parse-quote', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || `Server error: ${response.status}`);
      }

      if (!Array.isArray(data.products)) {
        throw new Error('Invalid response format: expected { products: [...] }');
      }

      setParsedProducts(data.products);
    } catch (err: any) {
      setError(`❌ Parse Failed: ${err.message}`);
      console.error('Parse error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    switch (view) {
      case 'home':
        return <HomePage onSelectView={setView} />;
      case 'parsing':
        return (
          <div style={{ padding: '16px' }}>
            <InitialInput onParse={handleParse} isLoading={isLoading} />
            {error && (
              <p
                style={{
                  color: '#ef4444',
                  textAlign: 'center',
                  marginTop: '16px',
                  background: '#2a1a1a',
                  padding: '10px',
                  borderRadius: '8px',
                }}
              >
                {error}
              </p>
            )}
            {parsedProducts.length > 0 && (
              <div style={{ maxWidth: '800px', margin: '24px auto 0' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Parsed Products</h3>
                <div style={{
                  background: '#0e141b',
                  border: '1px solid #1d2733',
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#1d2733' }}>
                      <tr>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Qty</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Product Code</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedProducts.map((p, index) => (
                        <tr key={index} style={{ borderTop: '1px solid #1d2733' }}>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>{p.quantity}</td>
                          <td style={{ padding: '12px 16px' }}>{p.productCode}</td>
                          <td style={{ padding: '12px 16px' }}>{p.cleanDescription}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <button
              onClick={() => setView('home')}
              style={{
                marginTop: '24px',
                background: 'transparent',
                border: '1px solid #2a3a4a',
                borderRadius: '8px',
                color: '#9fb2c8',
                padding: '8px 16px',
                cursor: 'pointer',
              }}
            >
              ← Back to Home
            </button>
          </div>
        );
      default:
        return <HomePage onSelectView={setView} />;
    }
  };

  return <div>{renderContent()}</div>;
}