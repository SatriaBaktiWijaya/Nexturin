import React, { useState, useRef } from "react";
import DitherCanvas from "./components/DitherCanvas";
import { PRESETS } from "./utils/presets";
import "./App.css";

const DEFAULT_SVG = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgODAwIDYwMCI+PHJlY3Qgd2lkdGg9IjgwMCIgaGVpZ2h0PSI2MDAiIGZpbGw9IiMwZjBmMWMiLz48Y2lyY2xlIGN4PSI0MDAiIGN5PSIzMDAiIHI9IjE4MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmYwMDdmIiBzdHJva2Utd2lkdGg9IjYiLz48Y2lyY2xlIGN4PSI0MDAiIGN5PSIzMDAiIHI9IjEzMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDBmZmZmIiBzdHJva2Utd2lkdGg9IjQiLz48bGluZSB4MT0iMTAwIiB5MT0iMzAwIiB4Mj0iNzAwIiB5Mj0iMzAwIiBzdHJva2U9IiM4YmFjMGYiIHN0cm9rZS13aWR0aD0iMyIvPjxsaW5lIHgxPSI0MDAiIHkxPSI1MCIgeDI9IjQwMCIgeTI9IjU1MCIgc3Ryb2tlPSIjOGJhYzBmIiBzdHJva2Utd2lkdGg9IjMiLz48dGV4dCB4PSI0MDAiIHk9IjMxMiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzIiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjZmZmZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBsZXR0ZXItc3BhY2luZz0iMiI+RElUSEVSQ1JBRlQ8L3RleHQ+PC9zdmc+";

const AESTHETIC_PHOTOS = [
  "https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?q=80&w=1200&auto=format&fit=crop", // Neon Cyberpunk
  "https://images.unsplash.com/photo-1507504038482-7621c518d50d?q=80&w=1200&auto=format&fit=crop", // Elegant Flowers
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop", // Synthwave Abstract
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1200&auto=format&fit=crop", // Moody Portrait
  "https://picsum.photos/id/1025/1200/800", // Pug in blanket (high contrast)
  "https://picsum.photos/id/1043/1200/800"  // Landscape (high contrast)
];

const getRandomPhoto = () => {
  const index = Math.floor(Math.random() * AESTHETIC_PHOTOS.length);
  // Add a timestamp parameter to prevent caching and force a fresh fetch
  return `${AESTHETIC_PHOTOS[index]}&sig=${Date.now()}`;
};

function App() {
  const ditherCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [imageSrc, setImageSrc] = useState(DEFAULT_SVG);
  const [activeTab, setActiveTab] = useState("shader"); // shader, palette, adjustments
  const [copiedCode, setCopiedCode] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState("png");

  // Shader configuration states initialized to Classic GameBoy style
  const [ditherType, setDitherType] = useState(3); // 8x8
  const [ditherSize, setDitherSize] = useState(2);
  const [colorSteps, setColorSteps] = useState(4);
  const [originalColors, setOriginalColors] = useState(false);
  const [inverted, setInverted] = useState(false);
  
  // Custom color palette states
  const [colorBack, setColorBack] = useState("#0f380f");
  const [colorFront, setColorFront] = useState("#8bac0f");
  const [colorHighlight, setColorHighlight] = useState("#9bbc0f");

  // Adjustment states
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0.1);
  const [gamma, setGamma] = useState(1.0);
  const [saturation, setSaturation] = useState(0);
  
  // Display fit
  const [fit, setFit] = useState("contain");
  const [dragActive, setDragActive] = useState(false);

  const applyPreset = (preset) => {
    setDitherType(preset.type === "random" ? 0 : preset.type === "2x2" ? 1 : preset.type === "4x4" ? 2 : 3);
    setDitherSize(preset.size);
    setColorSteps(preset.colorSteps);
    setOriginalColors(preset.originalColors);
    setColorBack(preset.colorBack);
    setColorFront(preset.colorFront);
    setColorHighlight(preset.colorHighlight);
    setBrightness(preset.brightness);
    setContrast(preset.contrast);
    setGamma(preset.gamma);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageSrc(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const loadRandomPhoto = () => {
    setImageSrc(getRandomPhoto());
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageSrc(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const copyCodeToClipboard = () => {
    const ditherTypeName = ditherType === 0 ? "random" : ditherType === 1 ? "2x2" : ditherType === 2 ? "4x4" : "8x8";
    const componentCode = `import { ImageDithering } from '@paper-design/shaders-react';

<ImageDithering
  width={1280}
  height={720}
  image="${imageSrc.startsWith("data:") ? "your-image-url.jpg" : imageSrc.split("&")[0]}"
  colorBack="${colorBack}"
  colorFront="${colorFront}"
  colorHighlight="${colorHighlight}"
  originalColors={${originalColors}}
  inverted={${inverted}}
  type="${ditherTypeName}"
  size={${ditherSize}}
  colorSteps={${colorSteps}}
  fit="${fit}"
/>`;
    
    navigator.clipboard.writeText(componentCode).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  return (
    <div className="app-container" onDragEnter={handleDrag}>
      <header className="app-header">
        <div className="header-logo">
          <div className="logo-icon"></div>
          <span className="logo-text">dither.<span>craft</span></span>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={loadRandomPhoto}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            Random Image
          </button>
          <button className="btn btn-primary" onClick={triggerFileInput}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            Upload Photo
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            style={{ display: "none" }} 
          />
        </div>
      </header>

      <main className="app-content">
        <div 
          className={`viewport-area ${dragActive ? "drag-active" : ""}`}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          {dragActive && (
            <div className="drag-overlay">
              <div className="drag-overlay-card">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <p>Drop image here to dither</p>
              </div>
            </div>
          )}
          <DitherCanvas
            ref={ditherCanvasRef}
            imageSrc={imageSrc}
            ditherType={ditherType}
            ditherSize={ditherSize}
            colorSteps={colorSteps}
            colorBack={colorBack}
            colorFront={colorFront}
            colorHighlight={colorHighlight}
            originalColors={originalColors}
            inverted={inverted}
            brightness={brightness}
            contrast={contrast}
            gamma={gamma}
            saturation={saturation}
            fit={fit}
          />
          <div className="canvas-badge">WebGL Accelerated</div>
        </div>

        <aside className="control-sidebar">
          <div className="sidebar-tabs">
            <button 
              className={`tab-btn ${activeTab === "shader" ? "active" : ""}`} 
              onClick={() => setActiveTab("shader")}
            >
              Shader
            </button>
            <button 
              className={`tab-btn ${activeTab === "palette" ? "active" : ""}`} 
              onClick={() => setActiveTab("palette")}
            >
              Palette
            </button>
            <button 
              className={`tab-btn ${activeTab === "adjust" ? "active" : ""}`} 
              onClick={() => setActiveTab("adjust")}
            >
              Adjust
            </button>
          </div>

          <div className="tab-content">
            {activeTab === "shader" && (
              <div className="control-group">
                <div className="control-item">
                  <label>Dither Pattern</label>
                  <div className="toggle-group">
                    {[
                      { label: "Noise", val: 0 },
                      { label: "2x2", val: 1 },
                      { label: "4x4", val: 2 },
                      { label: "8x8", val: 3 }
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        className={`toggle-btn ${ditherType === opt.val ? "active" : ""}`}
                        onClick={() => setDitherType(opt.val)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="control-item">
                  <div className="control-header">
                    <label>Pixel Grid Size</label>
                    <span className="control-val">{ditherSize.toFixed(1)}px</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={ditherSize}
                    onChange={(e) => setDitherSize(parseFloat(e.target.value))}
                  />
                </div>

                <div className="control-item">
                  <div className="control-header">
                    <label>Color Levels</label>
                    <span className="control-val">{colorSteps}</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="7"
                    step="1"
                    value={colorSteps}
                    onChange={(e) => setColorSteps(parseInt(e.target.value))}
                  />
                </div>

                <div className="control-item row-flex">
                  <label>Image Fit Mode</label>
                  <select value={fit} onChange={(e) => setFit(e.target.value)} className="select-input">
                    <option value="contain">Contain</option>
                    <option value="cover">Cover</option>
                  </select>
                </div>

                <div className="control-item checkbox-item">
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={originalColors}
                      onChange={(e) => setOriginalColors(e.target.checked)}
                    />
                    <span className="checkmark"></span>
                    Use Original Colors
                  </label>
                </div>

                <div className="control-item checkbox-item">
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={inverted}
                      onChange={(e) => setInverted(e.target.checked)}
                    />
                    <span className="checkmark"></span>
                    Invert Output Colors
                  </label>
                </div>
              </div>
            )}

            {activeTab === "palette" && (
              <div className="control-group">
                <label className="sub-label">Presets</label>
                <div className="presets-grid">
                  {PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      className="preset-card"
                      onClick={() => applyPreset(preset)}
                    >
                      <div className="preset-colors">
                        {preset.originalColors ? (
                          <div className="preset-rainbow"></div>
                        ) : (
                          <>
                            <span style={{ backgroundColor: preset.colorBack }} />
                            <span style={{ backgroundColor: preset.colorFront }} />
                            <span style={{ backgroundColor: preset.colorHighlight }} />
                          </>
                        )}
                      </div>
                      <span className="preset-name">{preset.name}</span>
                    </button>
                  ))}
                </div>

                {!originalColors && (
                  <div className="custom-palette-picker">
                    <label className="sub-label">Custom Palette</label>
                    <div className="picker-row">
                      <div className="picker-item">
                        <label>Background</label>
                        <div className="color-input-wrapper">
                          <input
                            type="color"
                            value={colorBack}
                            onChange={(e) => setColorBack(e.target.value)}
                          />
                          <span className="color-hex">{colorBack.toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="picker-item">
                        <label>Foreground</label>
                        <div className="color-input-wrapper">
                          <input
                            type="color"
                            value={colorFront}
                            onChange={(e) => setColorFront(e.target.value)}
                          />
                          <span className="color-hex">{colorFront.toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="picker-item">
                        <label>Highlight</label>
                        <div className="color-input-wrapper">
                          <input
                            type="color"
                            value={colorHighlight}
                            onChange={(e) => setColorHighlight(e.target.value)}
                          />
                          <span className="color-hex">{colorHighlight.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "adjust" && (
              <div className="control-group">
                <div className="control-item">
                  <div className="control-header">
                    <label>Brightness</label>
                    <span className="control-val">{brightness > 0 ? `+${brightness.toFixed(2)}` : brightness.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="-0.5"
                    max="0.5"
                    step="0.05"
                    value={brightness}
                    onChange={(e) => setBrightness(parseFloat(e.target.value))}
                  />
                </div>

                <div className="control-item">
                  <div className="control-header">
                    <label>Contrast</label>
                    <span className="control-val">{contrast > 0 ? `+${contrast.toFixed(2)}` : contrast.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="-0.5"
                    max="0.5"
                    step="0.05"
                    value={contrast}
                    onChange={(e) => setContrast(parseFloat(e.target.value))}
                  />
                </div>

                <div className="control-item">
                  <div className="control-header">
                    <label>Gamma</label>
                    <span className="control-val">{gamma.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.1"
                    value={gamma}
                    onChange={(e) => setGamma(parseFloat(e.target.value))}
                  />
                </div>

                <div className="control-item">
                  <div className="control-header">
                    <label>Saturation</label>
                    <span className="control-val">{saturation > 0 ? `+${saturation.toFixed(2)}` : saturation.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.1"
                    value={saturation}
                    onChange={(e) => setSaturation(parseFloat(e.target.value))}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="sidebar-footer">
            <button className="btn btn-secondary w-full" onClick={copyCodeToClipboard}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              {copiedCode ? "Copied!" : "Copy Component Props"}
            </button>
            <div className="download-row" style={{ display: "flex", gap: "8px", width: "100%" }}>
              <select 
                value={downloadFormat} 
                onChange={(e) => setDownloadFormat(e.target.value)}
                className="select-input format-select"
                style={{ width: "90px", textAlignLast: "center" }}
              >
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
                <option value="pdf">PDF</option>
              </select>
              <button 
                className="btn btn-primary btn-lg" 
                style={{ flex: 1 }}
                onClick={() => ditherCanvasRef.current?.download(downloadFormat)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                Download
              </button>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;
