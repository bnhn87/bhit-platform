import React, { useState } from "react";

import { theme } from "../../lib/theme";

interface PhotoItem {
  name: string;
  url: string;
  id?: string;
  created_at?: string;
  size?: number;
  type?: string;
}

interface PhotoGridProps {
  items: PhotoItem[];
  onDelete?: (name: string) => void;
  onUpload?: (files: FileList) => Promise<void>;
  loading?: boolean;
  title?: string;
  maxColumns?: number;
  itemSize?: number;
  allowUpload?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function PhotoGrid({
  items,
  onDelete,
  onUpload,
  loading = false,
  title = "Photos",
  maxColumns = 6,
  itemSize = 120,
  allowUpload = true,
  className,
  style
}: PhotoGridProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !onUpload) return;

    setUploading(true);
    try {
      await onUpload(files);
    } catch (error: unknown) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)}KB`;
    return `${Math.round(kb / 1024 * 10) / 10}MB`;
  };

  return (
    <div 
      className={className}
      style={{ 
        padding: 16, 
        ...style 
      }}
    >
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between", 
        marginBottom: 12 
      }}>
        <div style={{ 
          fontWeight: 600, 
          fontSize: 16,
          display: "flex",
          alignItems: "center",
          gap: 8
        }}>
          {title}
          <span style={{ 
            fontSize: 12, 
            color: theme.colors.textSubtle,
            background: theme.colors.panelAlt,
            padding: "2px 6px",
            borderRadius: 12
          }}>
            {items.length}
          </span>
        </div>
        
        {allowUpload && onUpload && (
          <label style={{
            padding: "6px 12px",
            background: theme.colors.accent,
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: uploading ? "not-allowed" : "pointer",
            fontSize: 12,
            fontWeight: 600,
            opacity: uploading ? 0.6 : 1,
            transition: "all 0.2s ease"
          }}>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              disabled={uploading || loading}
              style={{ display: "none" }}
            />
            {uploading ? "Uploading..." : "Add Photos"}
          </label>
        )}
      </div>

      {loading && (
        <div style={{ 
          color: theme.colors.textSubtle, 
          fontSize: 14,
          textAlign: "center",
          padding: 20
        }}>
          Loading photos...
        </div>
      )}

      {!loading && items.length === 0 ? (
        <div style={{ 
          color: theme.colors.textSubtle, 
          fontSize: 14,
          textAlign: "center",
          padding: 40,
          border: `2px dashed ${theme.colors.border}`,
          borderRadius: 8,
          background: theme.colors.panelAlt
        }}>
          {allowUpload && onUpload ? "No photos yet. Click 'Add Photos' to upload." : "No photos yet."}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fill, minmax(${itemSize}px, 1fr))`,
            gap: 12,
            maxWidth: `${maxColumns * (itemSize + 12)}px`
          }}
        >
          {items.map((img) => (
            <div 
              key={img.name || img.id} 
              style={{ 
                position: "relative", 
                borderRadius: 8, 
                overflow: "hidden", 
                border: `1px solid ${theme.colors.border}`,
                background: theme.colors.panelAlt,
                cursor: "pointer",
                transition: "transform 0.2s ease"
              }}
              onClick={() => setSelectedPhoto(img.url)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: itemSize * 0.8,
                  background: `url(${img.url}) center/cover`,
                  display: "block"
                }}
              />
              
              {/* Image info overlay */}
              <div style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
                padding: "16px 8px 6px 8px",
                color: "white",
                fontSize: 11
              }}>
                <div style={{ 
                  whiteSpace: "nowrap", 
                  overflow: "hidden", 
                  textOverflow: "ellipsis",
                  fontWeight: 500
                }}>
                  {img.name}
                </div>
                {(img.size || img.created_at) && (
                  <div style={{ 
                    fontSize: 10, 
                    opacity: 0.8,
                    marginTop: 2
                  }}>
                    {[
                      img.size ? formatFileSize(img.size) : null,
                      img.created_at ? new Date(img.created_at).toLocaleDateString() : null
                    ].filter(Boolean).join(" • ")}
                  </div>
                )}
              </div>

              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(img.name);
                  }}
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    padding: "4px 6px",
                    fontSize: 12,
                    background: "rgba(0,0,0,0.8)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "white",
                    borderRadius: 4,
                    cursor: "pointer",
                    opacity: 0,
                    transition: "opacity 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = theme.colors.danger;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(0,0,0,0.8)";
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Photo modal */}
      {selectedPhoto && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20
          }}
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            style={{
              maxWidth: "90%",
              maxHeight: "90%",
              borderRadius: 8,
              background: `url(${selectedPhoto}) center/contain no-repeat`,
              minWidth: "300px",
              minHeight: "300px"
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setSelectedPhoto(null)}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              background: "rgba(0,0,0,0.8)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "white",
              borderRadius: 6,
              padding: "8px 12px",
              cursor: "pointer",
              fontSize: 16
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export type { PhotoItem, PhotoGridProps };
