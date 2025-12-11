// POD Upload Page
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback, useState, useEffect } from 'react';

import { useRequireAuth } from '../../hooks/useRequireAuth';
import type { Supplier } from '../../lib/pod/types';
import { theme } from '../../lib/theme';

export default function UploadPOD() {
  const router = useRouter();
  const { session } = useRequireAuth();

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (session) {
      fetchSuppliers();
    }
  }, [session]);

  async function fetchSuppliers() {
    try {
      const res = await fetch('/api/suppliers');
      const result = await res.json();
      if (result.success) {
        setSuppliers(result.suppliers || []);
      }
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
    }
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  function validateAndSetFile(selectedFile: File) {
    setError('');

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Invalid file type. Please upload PDF or image files (JPG, PNG, WEBP).');
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError('File too large. Maximum size is 10MB.');
      return;
    }

    setFile(selectedFile);
  }

  async function handleUpload() {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setError('');

      const formData = new FormData();
      formData.append('file', file);
      if (selectedSupplier) formData.append('supplier_id', selectedSupplier);
      if (notes) formData.append('notes', notes);
      formData.append('upload_source', 'web_dashboard');

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 70);
          setUploadProgress(percentComplete);
        }
      });

      const uploadPromise = new Promise<any>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (err) {
              reject(new Error('Invalid response from server'));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));
      });

      xhr.open('POST', '/api/pods/upload');
      xhr.send(formData);

      const result = await uploadPromise;

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      setUploadProgress(80);
      await new Promise(resolve => setTimeout(resolve, 500));
      setUploadProgress(100);

      router.push(`/pods/${result.pod.id}`);
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  return (
    <>
      <Head>
        <title>Upload POD • BHIT Work OS</title>
      </Head>

      <div style={{ padding: 24 }}>
        <header style={{ marginBottom: 24 }}>
          <button
            onClick={() => router.push('/pods')}
            style={{
              background: 'none',
              border: 'none',
              color: theme.colors.textSubtle,
              cursor: 'pointer',
              marginBottom: 8,
              fontSize: 14
            }}
          >
            ← Back to POD Manager
          </button>
          <h1 style={{ margin: 0, color: theme.colors.text, fontSize: 28, fontWeight: 700 }}>Upload POD</h1>
          <p style={{ margin: '8px 0 0 0', color: theme.colors.textSubtle }}>Upload a Proof of Delivery document</p>
        </header>

        {error && (
          <div style={{
            marginBottom: 16,
            padding: 12,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 8,
            color: '#ef4444'
          }}>
            {error}
          </div>
        )}

        <div className="glassmorphic-panel" style={{ padding: 24, marginBottom: 24 }}>
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              style={{
                border: dragging ? '2px dashed #3b82f6' : `2px dashed ${theme.colors.border}`,
                borderRadius: 8,
                padding: 48,
                textAlign: 'center',
                background: dragging ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
              <p style={{ color: theme.colors.text, fontSize: 16, marginBottom: 8 }}>
                Drag & drop your POD here
              </p>
              <p style={{ color: theme.colors.textSubtle, fontSize: 13, marginBottom: 16 }}>
                or click to browse files
              </p>
              <input
                type="file"
                id="file-input"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <label
                htmlFor="file-input"
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  background: theme.colors.accent,
                  color: '#fff',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14
                }}
              >
                Browse Files
              </label>
              <p style={{ color: theme.colors.textSubtle, fontSize: 11, marginTop: 16 }}>
                Supported: PDF, JPG, PNG, WEBP (max 10MB)
              </p>
            </div>
          ) : (
            <div style={{ padding: 16, border: `1px solid ${theme.colors.border}`, borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ fontSize: 32 }}>{file.type.includes('pdf') ? '📄' : '🖼️'}</div>
                  <div>
                    <p style={{ color: theme.colors.text, fontWeight: 600, margin: 0 }}>{file.name}</p>
                    <p style={{ color: theme.colors.textSubtle, fontSize: 13, margin: '4px 0 0 0' }}>
                      {formatFileSize(file.size)} • {file.type.split('/')[1].toUpperCase()}
                    </p>
                  </div>
                </div>
                {!uploading && (
                  <button
                    onClick={() => setFile(null)}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 4,
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: 13
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>

              {file.type.includes('image') && (
                <div style={{ background: '#000', borderRadius: 8, padding: 16, display: 'flex', justifyContent: 'center', height: 200 }}>
                  <img src={URL.createObjectURL(file)} alt="Preview" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', borderRadius: 4 }} />
                </div>
              )}
            </div>
          )}
        </div>

        {file && (
          <div className="glassmorphic-panel" style={{ padding: 24, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 16px 0', color: theme.colors.text, fontSize: 16, fontWeight: 600 }}>Details</h3>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: theme.colors.textSubtle, fontSize: 13, marginBottom: 4, fontWeight: 600 }}>
                Supplier (Optional)
              </label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                disabled={uploading}
                style={{
                  width: '100%',
                  padding: 10,
                  background: theme.colors.panelAlt,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: 6,
                  color: theme.colors.text,
                  fontSize: 14
                }}
              >
                <option value="">Select supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <p style={{ color: theme.colors.textSubtle, fontSize: 11, marginTop: 4 }}>
                AI will attempt to identify the supplier if not specified
              </p>
            </div>

            <div>
              <label style={{ display: 'block', color: theme.colors.textSubtle, fontSize: 13, marginBottom: 4, fontWeight: 600 }}>
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={uploading}
                placeholder="Add any additional notes..."
                style={{
                  width: '100%',
                  padding: 10,
                  background: theme.colors.panelAlt,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: 6,
                  color: theme.colors.text,
                  fontSize: 14,
                  minHeight: 80,
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        )}

        {uploading && (
          <div className="glassmorphic-panel" style={{ padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: theme.colors.text, fontWeight: 600, fontSize: 14 }}>
                {uploadProgress < 70 ? 'Uploading...' : uploadProgress < 100 ? 'Processing with AI...' : 'Complete!'}
              </span>
              <span style={{ color: theme.colors.textSubtle, fontSize: 14 }}>{uploadProgress}%</span>
            </div>
            <div style={{ width: '100%', height: 8, background: theme.colors.border, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                width: `${uploadProgress}%`,
                height: '100%',
                background: theme.colors.accent,
                transition: 'width 0.3s',
                borderRadius: 4
              }} />
            </div>
            <p style={{ color: theme.colors.textSubtle, fontSize: 13, marginTop: 8 }}>
              {uploadProgress < 70 && 'Uploading file to server...'}
              {uploadProgress >= 70 && uploadProgress < 100 && 'AI is extracting delivery information...'}
              {uploadProgress >= 100 && 'Redirecting to POD details...'}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => router.push('/pods')}
            disabled={uploading}
            style={{
              padding: '12px 24px',
              background: theme.colors.panel,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: 6,
              color: theme.colors.text,
              cursor: uploading ? 'not-allowed' : 'pointer',
              opacity: uploading ? 0.5 : 1,
              fontSize: 14,
              fontWeight: 600
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            style={{
              flex: 1,
              padding: '12px 24px',
              background: file && !uploading ? theme.colors.accent : theme.colors.muted,
              border: 'none',
              borderRadius: 6,
              color: '#fff',
              cursor: file && !uploading ? 'pointer' : 'not-allowed',
              fontSize: 14,
              fontWeight: 600
            }}
          >
            {uploading ? 'Uploading...' : 'Upload & Process'}
          </button>
        </div>
      </div>
    </>
  );
}
