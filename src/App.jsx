import React, { useState, useRef } from "react";
import DitherCanvas from "./components/DitherCanvas";
import { PRESETS } from "./utils/presets";
import "./App.css";

const AESTHETIC_PHOTOS = [
  "https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?q=80&w=1200&auto=format&fit=crop", // Neon Cyberpunk
  "https://images.unsplash.com/photo-1507504038482-7621c518d50d?q=80&w=1200&auto=format&fit=crop", // Elegant Flowers
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop", // Synthwave Abstract
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1200&auto=format&fit=crop", // Moody Portrait
  "https://picsum.photos/id/1025/1200/800", // Pug in blanket (high contrast)
  "https://picsum.photos/id/1043/1200/800"  // Landscape (high contrast)
];

const DEFAULT_SVG = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgODAwIDYwMCI+PHJlY3Qgd2lkdGg9IjgwMCIgaGVpZ2h0PSI2MDAiIGZpbGw9IiMwZjBmMWMiLz48Y2lyY2xlIGN4PSI0MDAiIGN5PSIzMDAiIHI9IjE4MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmYwMDdmIiBzdHJva2Utd2lkdGg9IjYiLz48Y2lyY2xlIGN4PSI0MDAiIGN5PSIzMDAiIHI9IjEzMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDBmZmZmIiBzdHJva2Utd2lkdGg9IjQiLz48bGluZSB4MT0iMTAwIiB5MT0iMzAwIiB4Mj0iNzAwIiB5Mj0iMzAwIiBzdHJva2U9IiM4YmFjMGYiIHN0cm9rZS13aWR0aD0iMyIvPjxsaW5lIHgxPSI0MDAiIHkxPSI1MCIgeDI9IjQwMCIgeTI9IjU1MCIgc3Ryb2tlPSIjOGJhYzBmIiBzdHJva2Utd2lkdGg9IjMiLz48dGV4dCB4PSI0MDAiIHk9IjMxMiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzIiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjZmZmZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBsZXR0ZXItc3BhY2luZz0iMiI+RElUSEVSQ1JBRlQ8L3RleHQ+PC9zdmc+";

const getRandomPhoto = () => {
  const index = Math.floor(Math.random() * AESTHETIC_PHOTOS.length);
  return `${AESTHETIC_PHOTOS[index]}&sig=${Date.now()}`;
};

function App() {
  const ditherCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [imageSrc, setImageSrc] = useState(DEFAULT_SVG);
  const [activeTab, setActiveTab] = useState("shader"); // shader, palette, adjustments
  const [copiedCode, setCopiedCode] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState("png");
  
  // Effect type state:
  // 0: Dither, 1: Halftone (Classic), 2: Fluted Glass, 3: Halftone Dots, 4: Halftone CMYK, 5: Water
  const [effectType, setEffectType] = useState(0); 

  // Dither parameters
  const [ditherType, setDitherType] = useState(3); // 8x8
  const [ditherSize, setDitherSize] = useState(2);
  const [colorSteps, setColorSteps] = useState(4);
  
  // Halftone (Classic) parameters
  const [halftoneSize, setHalftoneSize] = useState(8);
  const [halftoneSharpness, setHalftoneSharpness] = useState(0.08);

  // Fluted Glass parameters
  const [flutedSize, setFlutedSize] = useState(0.5);
  const [flutedShape, setFlutedShape] = useState(0); // 0: lines, 1: wave, 2: zigzag
  const [flutedAngle, setFlutedAngle] = useState(0);
  const [flutedDistortionShape, setFlutedDistortionShape] = useState(0); // 0: prism, 1: lens
  const [flutedDistortion, setFlutedDistortion] = useState(0.5);
  const [flutedShadows, setFlutedShadows] = useState(0.25);
  const [flutedHighlights, setFlutedHighlights] = useState(0.1);
  const [flutedEdges, setFlutedEdges] = useState(0.25);
  const [colorShadow, setColorShadow] = useState("#000000");

  // Halftone Dots parameters
  const [dotGridType, setDotGridType] = useState(0); // 0: grid, 1: hex
  const [dotShapeType, setDotShapeType] = useState(0); // 0: normal, 1: gooey
  const [dotRadius, setDotRadius] = useState(1.25);
  const [dotContrast, setDotContrast] = useState(0.4);
  const [dotSize, setDotSize] = useState(0.5);
  const [dotGrain, setDotGrain] = useState(0.2);

  // Halftone CMYK parameters
  const [cmykSize, setCmykSize] = useState(0.2);
  const [cmykNoise, setCmykNoise] = useState(0.2);
  const [cmykSoftness, setCmykSoftness] = useState(0.5);
  const [cmykContrast, setCmykContrast] = useState(0.0);
  const [cmykGainC, setCmykGainC] = useState(0.3);
  const [cmykGainM, setCmykGainM] = useState(0.0);
  const [cmykGainY, setCmykGainY] = useState(0.2);
  const [cmykGainK, setCmykGainK] = useState(0.0);
  const [cmykFloodC, setCmykFloodC] = useState(0.15);
  const [cmykFloodM, setCmykFloodM] = useState(0.0);
  const [cmykFloodY, setCmykFloodY] = useState(0.0);
  const [cmykFloodK, setCmykFloodK] = useState(0.0);
  const [colorC, setColorC] = useState("#00b3ff");
  const [colorM, setColorM] = useState("#fc4f9d");
  const [colorY, setColorY] = useState("#ffd900");
  const [colorK, setColorK] = useState("#231f20");

  // Water parameters
  const [waterSize, setWaterSize] = useState(1.0);
  const [waterSpeed, setWaterSpeed] = useState(1.0);
  const [waterWaves, setWaterWaves] = useState(0.3);
  const [waterCaustic, setWaterCaustic] = useState(0.1);
  const [waterHighlights, setWaterHighlights] = useState(0.07);
  const [waterEdges, setWaterEdges] = useState(0.8);

  // Custom color palette states
  const [colorBack, setColorBack] = useState("#f2f1e8");
  const [colorFront, setColorFront] = useState("#2b2b2b");
  const [colorHighlight, setColorHighlight] = useState("#ffffff");
  const [originalColors, setOriginalColors] = useState(false);
  const [inverted, setInverted] = useState(false);

  // Adjustment states
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0.1);
  const [gamma, setGamma] = useState(1.0);
  const [saturation, setSaturation] = useState(0);
  
  // Display fit
  const [fit, setFit] = useState("cover");
  const [dragActive, setDragActive] = useState(false);

  const applyPreset = (preset) => {
    // Always apply color palette
    setOriginalColors(preset.originalColors);
    setColorBack(preset.colorBack);
    setColorFront(preset.colorFront);
    setColorHighlight(preset.colorHighlight);

    // Only apply dither pattern parameters and adjustment presets if currently in Dither mode
    if (effectType === 0) {
      setDitherType(preset.type === "random" ? 0 : preset.type === "2x2" ? 1 : preset.type === "4x4" ? 2 : 3);
      setDitherSize(preset.size);
      setColorSteps(preset.colorSteps);
      setBrightness(preset.brightness);
      setContrast(preset.contrast);
      setGamma(preset.gamma);
    }
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
    let componentCode = "";
    const cleanUrl = imageSrc.startsWith("data:") ? "your-image-url.jpg" : imageSrc.split("&")[0];
    
    if (effectType === 0) {
      const ditherTypeName = ditherType === 0 ? "random" : ditherType === 1 ? "2x2" : ditherType === 2 ? "4x4" : "8x8";
      componentCode = `import { ImageDithering } from '@paper-design/shaders-react';

<ImageDithering
  width={1280}
  height={720}
  image="${cleanUrl}"
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
    } else if (effectType === 1) {
      componentCode = `import { ImageHalftone } from '@paper-design/shaders-react';

<ImageHalftone
  width={1280}
  height={720}
  image="${cleanUrl}"
  colorBack="${colorBack}"
  colorFront="${colorFront}"
  colorHighlight="${colorHighlight}"
  originalColors={${originalColors}}
  inverted={${inverted}}
  size={${halftoneSize}}
  sharpness={${halftoneSharpness}}
  fit="${fit}"
/>`;
    } else if (effectType === 2) {
      const shapes = ["lines", "wave", "zigzag"];
      const dShapes = ["prism", "lens"];
      componentCode = `import { FlutedGlass } from '@paper-design/shaders-react';

<FlutedGlass
  width={1280}
  height={720}
  image="${cleanUrl}"
  colorBack="${colorBack}"
  colorShadow="${colorShadow}"
  colorHighlight="${colorHighlight}"
  size={${flutedSize}}
  shadows={${flutedShadows}}
  highlights={${flutedHighlights}}
  shape="${shapes[flutedShape]}"
  angle={${flutedAngle}}
  distortionShape="${dShapes[flutedDistortionShape]}"
  distortion={${flutedDistortion}}
  edges={${flutedEdges}}
  fit="${fit}"
/>`;
    } else if (effectType === 3) {
      const grids = ["grid", "hex"];
      const types = ["ink", "gooey"];
      componentCode = `import { HalftoneDots } from '@paper-design/shaders-react';

<HalftoneDots
  width={1280}
  height={720}
  image="${cleanUrl}"
  colorBack="${colorBack}"
  colorFront="${colorFront}"
  originalColors={${originalColors}}
  type="${types[dotShapeType]}"
  grid="${grids[dotGridType]}"
  inverted={${inverted}}
  size={${dotSize}}
  radius={${dotRadius}}
  contrast={${dotContrast}}
  grainMixer={${dotGrain}}
  fit="${fit}"
/>`;
    } else if (effectType === 4) {
      componentCode = `import { HalftoneCMYK } from '@paper-design/shaders-react';

<HalftoneCMYK
  width={1280}
  height={720}
  image="${cleanUrl}"
  colorBack="${colorBack}"
  colorC="${colorC}"
  colorM="${colorM}"
  colorY="${colorY}"
  colorK="${colorK}"
  size={${cmykSize}}
  gridNoise={${cmykNoise}}
  softness={${cmykSoftness}}
  contrast={${cmykContrast}}
  gainC={${cmykGainC}}
  gainM={${cmykGainM}}
  gainY={${cmykGainY}}
  gainK={${cmykGainK}}
  floodC={${cmykFloodC}}
  floodM={${cmykFloodM}}
  floodY={${cmykFloodY}}
  floodK={${cmykFloodK}}
  fit="${fit}"
/>`;
    } else if (effectType === 5) {
      componentCode = `import { Water } from '@paper-design/shaders-react';

<Water
  width={1280}
  height={720}
  image="${cleanUrl}"
  colorBack="${colorBack}"
  colorHighlight="${colorHighlight}"
  highlights={${waterHighlights}}
  edges={${waterEdges}}
  waves={${waterWaves}}
  caustic={${waterCaustic}}
  size={${waterSize}}
  speed={${waterSpeed}}
  fit="${fit}"
/>`;
    }
    
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
                <p>Drop image here to process</p>
              </div>
            </div>
          )}
          <DitherCanvas
            ref={ditherCanvasRef}
            imageSrc={imageSrc}
            effectType={effectType}
            
            // Dither
            ditherType={ditherType}
            ditherSize={ditherSize}
            colorSteps={colorSteps}
            
            // Halftone Classic
            halftoneSize={halftoneSize}
            halftoneSharpness={halftoneSharpness}
            
            // Fluted Glass
            flutedSize={flutedSize}
            flutedShape={flutedShape}
            flutedAngle={flutedAngle}
            flutedDistortionShape={flutedDistortionShape}
            flutedDistortion={flutedDistortion}
            flutedShadows={flutedShadows}
            flutedHighlights={flutedHighlights}
            flutedEdges={flutedEdges}
            colorShadow={colorShadow}
            
            // Halftone Dots
            dotGridType={dotGridType}
            dotShapeType={dotShapeType}
            dotRadius={dotRadius}
            dotContrast={dotContrast}
            dotSize={dotSize}
            dotGrain={dotGrain}

            // Halftone CMYK
            cmykSize={cmykSize}
            cmykNoise={cmykNoise}
            cmykSoftness={cmykSoftness}
            cmykContrast={cmykContrast}
            cmykGainC={cmykGainC}
            cmykGainM={cmykGainM}
            cmykGainY={cmykGainY}
            cmykGainK={cmykGainK}
            cmykFloodC={cmykFloodC}
            cmykFloodM={cmykFloodM}
            cmykFloodY={cmykFloodY}
            cmykFloodK={cmykFloodK}
            colorC={colorC}
            colorM={colorM}
            colorY={colorY}
            colorK={colorK}
            
            // Water
            waterSize={waterSize}
            waterSpeed={waterSpeed}
            waterWaves={waterWaves}
            waterCaustic={waterCaustic}
            waterHighlights={waterHighlights}
            waterEdges={waterEdges}

            // General
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
          <div className="effect-select-container">
            <label className="sidebar-section-title">Visual Effect</label>
            <div className="effects-grid">
              {[
                { label: "Dither", val: 0 },
                { label: "Halftone", val: 1 },
                { label: "Glass", val: 2 },
                { label: "Dots", val: 3 },
                { label: "CMYK", val: 4 },
                { label: "Water", val: 5 }
              ].map((opt) => (
                <button
                  key={opt.val}
                  className={`effect-card-btn ${effectType === opt.val ? "active" : ""}`}
                  onClick={() => {
                    setEffectType(opt.val);
                    // Adjust colors and originalColors states for optimal initial visual defaults of new effects
                    if (opt.val === 2) {
                      setOriginalColors(true); // Fluted glass defaults to showing image colors
                    } else if (opt.val === 4) {
                      setOriginalColors(true); // CMYK dots default to print color overlay
                    } else if (opt.val === 5) {
                      setOriginalColors(true); // Water defaults to original image
                    }
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

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
                
                {/* 1. DITHER EFFECT SETTINGS */}
                {effectType === 0 && (
                  <>
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
                  </>
                )}

                {/* 2. HALFTONE (CLASSIC) SETTINGS */}
                {effectType === 1 && (
                  <>
                    <div className="control-item">
                      <div className="control-header">
                        <label>Dot Grid Size</label>
                        <span className="control-val">{halftoneSize.toFixed(1)}px</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="24"
                        step="0.5"
                        value={halftoneSize}
                        onChange={(e) => setHalftoneSize(parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="control-item">
                      <div className="control-header">
                        <label>Dot Smoothness</label>
                        <span className="control-val">{(halftoneSharpness * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.01"
                        max="0.4"
                        step="0.01"
                        value={halftoneSharpness}
                        onChange={(e) => setHalftoneSharpness(parseFloat(e.target.value))}
                      />
                    </div>
                  </>
                )}

                {/* 3. FLUTED GLASS SETTINGS */}
                {effectType === 2 && (
                  <>
                    <div className="control-item">
                      <div className="control-header">
                        <label>Glass Ridge Size</label>
                        <span className="control-val">{flutedSize.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="1.0"
                        step="0.01"
                        value={flutedSize}
                        onChange={(e) => setFlutedSize(parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="control-item">
                      <label>Glass Profile Shape</label>
                      <div className="toggle-group">
                        {[
                          { label: "Lines", val: 0 },
                          { label: "Wave", val: 1 },
                          { label: "ZigZag", val: 2 }
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            className={`toggle-btn ${flutedShape === opt.val ? "active" : ""}`}
                            onClick={() => setFlutedShape(opt.val)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="control-item">
                      <div className="control-header">
                        <label>Angle</label>
                        <span className="control-val">{flutedAngle}°</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="180"
                        step="5"
                        value={flutedAngle}
                        onChange={(e) => setFlutedAngle(parseInt(e.target.value))}
                      />
                    </div>

                    <div className="control-item">
                      <label>Distortion Shape</label>
                      <div className="toggle-group">
                        {[
                          { label: "Prism", val: 0 },
                          { label: "Lens", val: 1 }
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            className={`toggle-btn ${flutedDistortionShape === opt.val ? "active" : ""}`}
                            onClick={() => setFlutedDistortionShape(opt.val)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="control-item">
                      <div className="control-header">
                        <label>Distortion Power</label>
                        <span className="control-val">{flutedDistortion.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={flutedDistortion}
                        onChange={(e) => setFlutedDistortion(parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="control-item">
                      <div className="control-header">
                        <label>Shadows Overlay</label>
                        <span className="control-val">{flutedShadows.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={flutedShadows}
                        onChange={(e) => setFlutedShadows(parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="control-item">
                      <div className="control-header">
                        <label>Highlights Overlay</label>
                        <span className="control-val">{flutedHighlights.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={flutedHighlights}
                        onChange={(e) => setFlutedHighlights(parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="control-item">
                      <div className="control-header">
                        <label>Edge Distortion Softness</label>
                        <span className="control-val">{flutedEdges.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={flutedEdges}
                        onChange={(e) => setFlutedEdges(parseFloat(e.target.value))}
                      />
                    </div>
                  </>
                )}

                {/* 4. HALFTONE DOTS (MONO) SETTINGS */}
                {effectType === 3 && (
                  <>
                    <div className="control-item">
                      <label>Grid Alignment</label>
                      <div className="toggle-group">
                        {[
                          { label: "Square", val: 0 },
                          { label: "Hexagonal", val: 1 }
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            className={`toggle-btn ${dotGridType === opt.val ? "active" : ""}`}
                            onClick={() => setDotGridType(opt.val)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="control-item">
                      <label>Dot Style</label>
                      <div className="toggle-group">
                        {[
                          { label: "Ink", val: 0 },
                          { label: "Gooey", val: 1 }
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            className={`toggle-btn ${dotShapeType === opt.val ? "active" : ""}`}
                            onClick={() => setDotShapeType(opt.val)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="control-item">
                      <div className="control-header">
                        <label>Dot Frequency / Size</label>
                        <span className="control-val">{dotSize.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="1.5"
                        step="0.01"
                        value={dotSize}
                        onChange={(e) => setDotSize(parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="control-item">
                      <div className="control-header">
                        <label>Dot Max Radius</label>
                        <span className="control-val">{dotRadius.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="3.0"
                        step="0.05"
                        value={dotRadius}
                        onChange={(e) => setDotRadius(parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="control-item">
                      <div className="control-header">
                        <label>Contrast</label>
                        <span className="control-val">{dotContrast.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="-0.5"
                        max="1.5"
                        step="0.05"
                        value={dotContrast}
                        onChange={(e) => setDotContrast(parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="control-item">
                      <div className="control-header">
                        <label>Grain Overlay</label>
                        <span className="control-val">{(dotGrain * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={dotGrain}
                        onChange={(e) => setDotGrain(parseFloat(e.target.value))}
                      />
                    </div>
                  </>
                )}

                {/* 5. HALFTONE CMYK (ADVANCED) SETTINGS */}
                {effectType === 4 && (
                  <>
                    <div className="control-item">
                      <div className="control-header">
                        <label>CMYK Dot Size</label>
                        <span className="control-val">{cmykSize.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="1.5"
                        step="0.01"
                        value={cmykSize}
                        onChange={(e) => setCmykSize(parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="control-item">
                      <div className="control-header">
                        <label>Grid Alignment Noise</label>
                        <span className="control-val">{(cmykNoise * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={cmykNoise}
                        onChange={(e) => setCmykNoise(parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="control-item">
                      <div className="control-header">
                        <label>Ink Softness / Blur</label>
                        <span className="control-val">{cmykSoftness.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.01"
                        max="1.0"
                        step="0.01"
                        value={cmykSoftness}
                        onChange={(e) => setCmykSoftness(parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="control-item">
                      <div className="control-header">
                        <label>Print Contrast</label>
                        <span className="control-val">{cmykContrast.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="-0.5"
                        max="1.0"
                        step="0.05"
                        value={cmykContrast}
                        onChange={(e) => setCmykContrast(parseFloat(e.target.value))}
                      />
                    </div>
                  </>
                )}

                {/* 6. WATER SHADER SETTINGS */}
                {effectType === 5 && (
                  <>
                    <div className="control-item">
                      <div className="control-header">
                        <label>Water Caustic Size</label>
                        <span className="control-val">{waterSize.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="4.0"
                        step="0.1"
                        value={waterSize}
                        onChange={(e) => setWaterSize(parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="control-item">
                      <div className="control-header">
                        <label>Animation Speed</label>
                        <span className="control-val">{waterSpeed.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="3.0"
                        step="0.1"
                        value={waterSpeed}
                        onChange={(e) => setWaterSpeed(parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="control-item">
                      <div className="control-header">
                        <label>Ripples / Waves distortion</label>
                        <span className="control-val">{waterWaves.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={waterWaves}
                        onChange={(e) => setWaterWaves(parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="control-item">
                      <div className="control-header">
                        <label>Caustic Strength</label>
                        <span className="control-val">{waterCaustic.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={waterCaustic}
                        onChange={(e) => setWaterCaustic(parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="control-item">
                      <div className="control-header">
                        <label>Caustic Highlights</label>
                        <span className="control-val">{waterHighlights.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.01"
                        value={waterHighlights}
                        onChange={(e) => setWaterHighlights(parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="control-item">
                      <div className="control-header">
                        <label>Edge Distortion Softness</label>
                        <span className="control-val">{waterEdges.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={waterEdges}
                        onChange={(e) => setWaterEdges(parseFloat(e.target.value))}
                      />
                    </div>
                  </>
                )}

                <div className="control-item row-flex">
                  <label>Image Fit Mode</label>
                  <select value={fit} onChange={(e) => setFit(e.target.value)} className="select-input">
                    <option value="contain">Contain</option>
                    <option value="cover">Cover</option>
                  </select>
                </div>

                {/* Show color toggles except for effects that require standard RGB like Water or Glass */}
                {effectType !== 2 && effectType !== 5 && (
                  <div className="control-item checkbox-item">
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={originalColors}
                        onChange={(e) => setOriginalColors(e.target.checked)}
                      />
                      <span className="checkmark"></span>
                      {effectType === 0 && "Use Original Colors"}
                      {effectType === 1 && "CMYK Screen Print Mode"}
                      {effectType === 3 && "Use Original Image Colors"}
                      {effectType === 4 && "Color Ink Print Blend"}
                    </label>
                  </div>
                )}

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

                {/* DYNAMIC PALETTE PICKERS BASED ON EFFECT TYPE */}
                {effectType === 4 ? (
                  // CMYK INK CHANNEL PICKERS
                  <div className="custom-palette-picker">
                    <label className="sub-label">CMYK Screen Inks</label>
                    <div className="presets-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                      <div className="picker-item">
                        <label>Cyan Ink</label>
                        <div className="color-input-wrapper">
                          <input type="color" value={colorC} onChange={(e) => setColorC(e.target.value)} />
                          <span className="color-hex">{colorC.toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="picker-item">
                        <label>Magenta Ink</label>
                        <div className="color-input-wrapper">
                          <input type="color" value={colorM} onChange={(e) => setColorM(e.target.value)} />
                          <span className="color-hex">{colorM.toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="picker-item">
                        <label>Yellow Ink</label>
                        <div className="color-input-wrapper">
                          <input type="color" value={colorY} onChange={(e) => setColorY(e.target.value)} />
                          <span className="color-hex">{colorY.toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="picker-item">
                        <label>Black Ink</label>
                        <div className="color-input-wrapper">
                          <input type="color" value={colorK} onChange={(e) => setColorK(e.target.value)} />
                          <span className="color-hex">{colorK.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="picker-item" style={{ marginTop: "8px" }}>
                      <label>Paper Background</label>
                      <div className="color-input-wrapper">
                        <input type="color" value={colorBack} onChange={(e) => setColorBack(e.target.value)} />
                        <span className="color-hex">{colorBack.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                ) : effectType === 2 ? (
                  // FLUTED GLASS COLOR PICKERS
                  <div className="custom-palette-picker">
                    <label className="sub-label">Glass Lighting Tint</label>
                    <div className="picker-row">
                      <div className="picker-item">
                        <label>Shadows</label>
                        <div className="color-input-wrapper">
                          <input type="color" value={colorShadow} onChange={(e) => setColorShadow(e.target.value)} />
                          <span className="color-hex">{colorShadow.toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="picker-item">
                        <label>Highlights</label>
                        <div className="color-input-wrapper">
                          <input type="color" value={colorHighlight} onChange={(e) => setColorHighlight(e.target.value)} />
                          <span className="color-hex">{colorHighlight.toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="picker-item">
                        <label>Background</label>
                        <div className="color-input-wrapper">
                          <input type="color" value={colorBack} onChange={(e) => setColorBack(e.target.value)} />
                          <span className="color-hex">{colorBack.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // STANDARD PALETTE PICKERS
                  !originalColors && (
                    <div className="custom-palette-picker">
                      <label className="sub-label">Custom Palette</label>
                      <div className="picker-row">
                        <div className="picker-item">
                          <label>Background</label>
                          <div className="color-input-wrapper">
                            <input type="color" value={colorBack} onChange={(e) => setColorBack(e.target.value)} />
                            <span className="color-hex">{colorBack.toUpperCase()}</span>
                          </div>
                        </div>
                        <div className="picker-item">
                          <label>Foreground</label>
                          <div className="color-input-wrapper">
                            <input type="color" value={colorFront} onChange={(e) => setColorFront(e.target.value)} />
                            <span className="color-hex">{colorFront.toUpperCase()}</span>
                          </div>
                        </div>
                        <div className="picker-item">
                          <label>Highlight</label>
                          <div className="color-input-wrapper">
                            <input type="color" value={colorHighlight} onChange={(e) => setColorHighlight(e.target.value)} />
                            <span className="color-hex">{colorHighlight.toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            {activeTab === "adjust" && (
              <div className="control-group">
                {/* CMYK ADVANCED INK ADJUSTMENTS */}
                {effectType === 4 && (
                  <>
                    <label className="sub-label">CMYK Ink Floods</label>
                    <div className="control-item">
                      <div className="control-header">
                        <label>Cyan Flood</label>
                        <span className="control-val">{cmykFloodC.toFixed(2)}</span>
                      </div>
                      <input type="range" min="-0.5" max="0.5" step="0.05" value={cmykFloodC} onChange={(e) => setCmykFloodC(parseFloat(e.target.value))} />
                    </div>
                    <div className="control-item">
                      <div className="control-header">
                        <label>Magenta Flood</label>
                        <span className="control-val">{cmykFloodM.toFixed(2)}</span>
                      </div>
                      <input type="range" min="-0.5" max="0.5" step="0.05" value={cmykFloodM} onChange={(e) => setCmykFloodM(parseFloat(e.target.value))} />
                    </div>
                    <div className="control-item">
                      <div className="control-header">
                        <label>Yellow Flood</label>
                        <span className="control-val">{cmykFloodY.toFixed(2)}</span>
                      </div>
                      <input type="range" min="-0.5" max="0.5" step="0.05" value={cmykFloodY} onChange={(e) => setCmykFloodY(parseFloat(e.target.value))} />
                    </div>
                    <div className="control-item">
                      <div className="control-header">
                        <label>Black Flood</label>
                        <span className="control-val">{cmykFloodK.toFixed(2)}</span>
                      </div>
                      <input type="range" min="-0.5" max="0.5" step="0.05" value={cmykFloodK} onChange={(e) => setCmykFloodK(parseFloat(e.target.value))} />
                    </div>

                    <label className="sub-label" style={{ marginTop: "10px" }}>CMYK Ink Gains</label>
                    <div className="control-item">
                      <div className="control-header">
                        <label>Cyan Gain</label>
                        <span className="control-val">{cmykGainC.toFixed(2)}</span>
                      </div>
                      <input type="range" min="-1.0" max="1.0" step="0.05" value={cmykGainC} onChange={(e) => setCmykGainC(parseFloat(e.target.value))} />
                    </div>
                    <div className="control-item">
                      <div className="control-header">
                        <label>Magenta Gain</label>
                        <span className="control-val">{cmykGainM.toFixed(2)}</span>
                      </div>
                      <input type="range" min="-1.0" max="1.0" step="0.05" value={cmykGainM} onChange={(e) => setCmykGainM(parseFloat(e.target.value))} />
                    </div>
                    <div className="control-item">
                      <div className="control-header">
                        <label>Yellow Gain</label>
                        <span className="control-val">{cmykGainY.toFixed(2)}</span>
                      </div>
                      <input type="range" min="-1.0" max="1.0" step="0.05" value={cmykGainY} onChange={(e) => setCmykGainY(parseFloat(e.target.value))} />
                    </div>
                    <div className="control-item">
                      <div className="control-header">
                        <label>Black Gain</label>
                        <span className="control-val">{cmykGainK.toFixed(2)}</span>
                      </div>
                      <input type="range" min="-1.0" max="1.0" step="0.05" value={cmykGainK} onChange={(e) => setCmykGainK(parseFloat(e.target.value))} />
                    </div>
                  </>
                )}

                {/* STANDARD PICTURE CONTROLS */}
                <label className="sub-label">Image Correction</label>
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
                    min="-1.0"
                    max="1.0"
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
