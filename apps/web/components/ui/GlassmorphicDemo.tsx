/**
 * GlassmorphicDemo — Showcase component for the TRUE glassmorphic design system (Qwen Specification)
 * 
 * This component demonstrates the authentic glassmorphic variants with:
 * - Lighter glass effects with precise backdrop blur
 * - Pill-to-strap click transformation
 * - CSS ::before status dots
 * - True color specifications with hover glows
 */

import React, { useState } from "react";

import { theme } from "../../lib/theme";

import {
  getGlassmorphicStyle,
  GlassmorphicElement
} from "./GlassmorphicStyles";

export default function GlassmorphicDemo() {
  const [selectedTab, setSelectedTab] = useState<"pills" | "dropdowns" | "panels" | "buttons">("pills");

  return (
    <div style={{ 
      padding: "40px", 
      minHeight: "100vh", 
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      gap: "32px"
    }}>
      <div style={{
        textAlign: "center",
        marginBottom: "24px"
      }}>
        <h1 style={{ 
          fontSize: "36px", 
          fontWeight: "800", 
          color: "white",
          margin: 0,
          marginBottom: "8px"
        }}>
          True Glassmorphic Design System
        </h1>
        <p style={{ 
          fontSize: "16px", 
          color: "rgba(255,255,255,0.7)",
          margin: 0
        }}>
          Authentic Qwen specification with pill-to-strap transformation and precise glass effects
        </p>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
        {(["pills", "dropdowns", "panels", "buttons"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={selectedTab === tab ? "glassmorphic-base glassmorphic-pill glassmorphic-glow-blue" : "glassmorphic-base glassmorphic-pill"}
            style={{
              ...getGlassmorphicStyle("pill", undefined, selectedTab === tab ? "blue" : undefined),
              textTransform: "capitalize" as const,
              padding: "10px 20px"
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Pills Demo */}
      {selectedTab === "pills" && (
        <div className="glassmorphic-base glassmorphic-panel" style={getGlassmorphicStyle("panel")}>
          <h2 style={{ color: theme.colors.text, marginBottom: "24px" }}>Status Pills</h2>
          
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
            {/* True specification colors */}
            <GlassmorphicElement variant="pill" color="installing">Installing</GlassmorphicElement>
            <GlassmorphicElement variant="pill" color="planned">Planned</GlassmorphicElement>
            <GlassmorphicElement variant="pill" color="completed">Completed</GlassmorphicElement>
            <GlassmorphicElement variant="pill" color="error">Error</GlassmorphicElement>
            <GlassmorphicElement variant="pill" color="pending">Pending</GlassmorphicElement>
            <GlassmorphicElement variant="pill" color="active">Active</GlassmorphicElement>
            <GlassmorphicElement variant="pill" color="draft">Draft</GlassmorphicElement>
          </div>
          
          <h3 style={{ color: theme.colors.text, marginBottom: "16px" }}>Size Variants</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <GlassmorphicElement variant="pill" color="blue" style={{ padding: "6px 12px", fontSize: "12px" }}>
              Small
            </GlassmorphicElement>
            <GlassmorphicElement variant="pill" color="green" style={{ padding: "8px 16px", fontSize: "14px" }}>
              Medium
            </GlassmorphicElement>
            <GlassmorphicElement variant="pill" color="orange" style={{ padding: "10px 20px", fontSize: "16px" }}>
              Large
            </GlassmorphicElement>
          </div>
        </div>
      )}

      {/* Dropdowns Demo */}
      {selectedTab === "dropdowns" && (
        <div className="glassmorphic-base glassmorphic-panel" style={getGlassmorphicStyle("panel")}>
          <h2 style={{ color: theme.colors.text, marginBottom: "24px" }}>Dropdown Elements</h2>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", color: theme.colors.text, fontWeight: "600" }}>
                Select Option
              </label>
              <select 
                className="glassmorphic-base glassmorphic-dropdown"
                style={getGlassmorphicStyle("dropdown")}
              >
                <option value="">Choose an option...</option>
                <option value="option1">Option 1</option>
                <option value="option2">Option 2</option>
                <option value="option3">Option 3</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: "block", marginBottom: "8px", color: theme.colors.text, fontWeight: "600" }}>
                Search Input
              </label>
              <input 
                type="text"
                placeholder="Type to search..."
                className="glassmorphic-base glassmorphic-dropdown"
                style={getGlassmorphicStyle("dropdown")}
              />
            </div>
          </div>
        </div>
      )}

      {/* Panels Demo */}
      {selectedTab === "panels" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
          <div className="glassmorphic-base glassmorphic-panel" style={getGlassmorphicStyle("panel")}>
            <h3 style={{ color: theme.colors.text, marginBottom: "16px" }}>Standard Panel</h3>
            <p style={{ color: theme.colors.textSubtle, margin: 0 }}>
              This is a standard glassmorphic panel with regular styling and content.
            </p>
          </div>
          
          <div className="glassmorphic-base glassmorphic-panel glassmorphic-glow-green" style={{
            ...getGlassmorphicStyle("panel", undefined, "green"),
            position: "relative" as const
          }}>
            <h3 style={{ color: theme.colors.text, marginBottom: "16px" }}>Accent Panel</h3>
            <p style={{ color: theme.colors.textSubtle, margin: 0 }}>
              This panel has a colored glow effect to draw attention or indicate status.
            </p>
          </div>
        </div>
      )}

      {/* Buttons Demo */}
      {selectedTab === "buttons" && (
        <div className="glassmorphic-base glassmorphic-panel" style={getGlassmorphicStyle("panel")}>
          <h2 style={{ color: theme.colors.text, marginBottom: "24px" }}>Interactive Buttons</h2>
          
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
            <button className="glassmorphic-base glassmorphic-button" style={getGlassmorphicStyle("button")}>
              Default Button
            </button>
            
            <button className="glassmorphic-base glassmorphic-button glassmorphic-glow-blue" style={getGlassmorphicStyle("button", undefined, "blue")}>
              Primary Action
            </button>
            
            <button className="glassmorphic-base glassmorphic-button glassmorphic-glow-green" style={getGlassmorphicStyle("button", undefined, "green")}>
              Success Action
            </button>
            
            <button className="glassmorphic-base glassmorphic-button glassmorphic-glow-red" style={getGlassmorphicStyle("button", undefined, "red")}>
              Danger Action
            </button>
          </div>
          
          <h3 style={{ color: theme.colors.text, marginBottom: "16px" }}>State Examples</h3>
          <div style={{ display: "flex", gap: "16px" }}>
            <button 
              className="glassmorphic-base glassmorphic-button glassmorphic-disabled" 
              style={getGlassmorphicStyle("button", "disabled")}
              disabled
            >
              Disabled
            </button>
            
            <button 
              className="glassmorphic-base glassmorphic-button" 
              style={{
                ...getGlassmorphicStyle("button", "clicked"),
                transform: "translateY(1px)"
              }}
            >
              Clicked State
            </button>
          </div>
        </div>
      )}

      {/* Usage Guide */}
      <div className="glassmorphic-base glassmorphic-panel" style={getGlassmorphicStyle("panel")}>
        <h2 style={{ color: theme.colors.text, marginBottom: "16px" }}>Usage Guide</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
          <div>
            <h4 style={{ color: theme.colors.accent, marginBottom: "8px" }}>CSS Classes</h4>
            <pre style={{ 
              background: "rgba(0,0,0,0.3)", 
              padding: "12px", 
              borderRadius: "8px", 
              fontSize: "12px",
              color: theme.colors.text,
              overflow: "auto"
            }}>
{`className="glassmorphic-base glassmorphic-pill"
className="glassmorphic-dropdown glassmorphic-glow-blue"
className="glassmorphic-panel glassmorphic-hover"`}
            </pre>
          </div>
          
          <div>
            <h4 style={{ color: theme.colors.accent, marginBottom: "8px" }}>React Hook</h4>
            <pre style={{ 
              background: "rgba(0,0,0,0.3)", 
              padding: "12px", 
              borderRadius: "8px", 
              fontSize: "12px",
              color: theme.colors.text,
              overflow: "auto"
            }}>
{`const style = useGlassmorphic("pill", {
  color: "blue",
  disabled: false,
  interactive: true
});`}
            </pre>
          </div>
          
          <div>
            <h4 style={{ color: theme.colors.accent, marginBottom: "8px" }}>Utility Function</h4>
            <pre style={{ 
              background: "rgba(0,0,0,0.3)", 
              padding: "12px", 
              borderRadius: "8px", 
              fontSize: "12px",
              color: theme.colors.text,
              overflow: "auto"
            }}>
{`const style = getGlassmorphicStyle(
  "dropdown", 
  "focus", 
  "green"
);`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}