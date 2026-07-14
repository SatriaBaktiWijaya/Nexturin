import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { VERTEX_SHADER, FRAGMENT_SHADER } from "../utils/shaders";

// Helper to convert HEX to normalized float array [r, g, b]
const hexToRgb = (hex) => {
  const cleanHex = hex.replace(/^#/, "");
  if (cleanHex.length !== 6 && cleanHex.length !== 8) return [1, 1, 1];
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return [r, g, b];
};

const DitherCanvas = forwardRef(({
  imageSrc,
  effectType = 0,
  
  // Dither parameters
  ditherType = 2,
  ditherSize = 2,
  colorSteps = 2,
  
  // Halftone (Classic) parameters
  halftoneSize = 8,
  halftoneSharpness = 0.05,
  
  // Fluted Glass parameters
  flutedSize = 0.5,
  flutedShape = 0,
  flutedAngle = 0,
  flutedDistortionShape = 0,
  flutedDistortion = 0.5,
  flutedShadows = 0.25,
  flutedHighlights = 0.1,
  flutedEdges = 0.25,
  colorShadow = "#000000",
  
  // Halftone Dots parameters
  dotGridType = 0,
  dotShapeType = 0,
  dotRadius = 1.0,
  dotContrast = 0.4,
  dotSize = 0.5,
  dotGrain = 0.2,

  // Halftone CMYK parameters
  cmykSize = 0.2,
  cmykNoise = 0.2,
  cmykSoftness = 0.5,
  cmykContrast = 0,
  cmykGainC = 0,
  cmykGainM = 0,
  cmykGainY = 0,
  cmykGainK = 0,
  cmykFloodC = 0,
  cmykFloodM = 0,
  cmykFloodY = 0,
  cmykFloodK = 0,
  colorC = "#00b3ff",
  colorM = "#fc4f9d",
  colorY = "#ffd900",
  colorK = "#231f20",
  
  // Water parameters
  waterSize = 1.0,
  waterSpeed = 1.0,
  waterWaves = 0.3,
  waterCaustic = 0.1,
  waterHighlights = 0.07,
  waterEdges = 0.8,

  // General parameters
  colorBack = "#000000",
  colorFront = "#ffffff",
  colorHighlight = "#ffffff",
  originalColors = false,
  inverted = false,
  brightness = 0,
  contrast = 0,
  gamma = 1,
  saturation = 0,
  fit = "contain"
}, ref) => {
  const canvasRef = useRef(null);
  const glRef = useRef(null);
  const programRef = useRef(null);
  const textureRef = useRef(null);
  const positionBufferRef = useRef(null);
  const imageRef = useRef(null);
  const [loading, setLoading] = useState(true);
  
  const animationFrameIdRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  // Expose download functionality
  useImperativeHandle(ref, () => ({
    download: (format = "png", filename = "dithered-image") => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;

      if (format === "pdf") {
        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>${filename}</title>
                <style>
                  @page { size: ${canvas.width}px ${canvas.height}px; margin: 0; }
                  html, body { margin: 0; padding: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; background: #000000; }
                  img { max-width: 100%; max-height: 100%; object-fit: contain; }
                </style>
              </head>
              <body>
                <img src="${dataUrl}" onload="setTimeout(() => { window.print(); window.close(); }, 300);" />
              </body>
            </html>
          `);
          printWindow.document.close();
        }
        return;
      }

      const mimeType = format === "jpg" ? "image/jpeg" : "image/png";
      const ext = format === "jpg" ? "jpg" : "png";
      const link = document.createElement("a");
      link.download = `${filename}.${ext}`;
      link.href = canvas.toDataURL(mimeType, 0.95);
      link.click();
    }
  }));

  const compileShader = (gl, source, type) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  // Set up WebGL 2 Context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true });
    if (!gl) {
      console.error("WebGL 2 not supported by this browser");
      return;
    }
    glRef.current = gl;

    const vs = compileShader(gl, VERTEX_SHADER, gl.VERTEX_SHADER);
    const fs = compileShader(gl, FRAGMENT_SHADER, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return;
    }
    programRef.current = program;

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
      ]),
      gl.STATIC_DRAW
    );
    positionBufferRef.current = positionBuffer;

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    textureRef.current = texture;

    return () => {
      if (glRef.current) {
        glRef.current.deleteTexture(texture);
        glRef.current.deleteBuffer(positionBuffer);
        glRef.current.deleteProgram(program);
        glRef.current.deleteShader(vs);
        glRef.current.deleteShader(fs);
      }
    };
  }, []);

  // Handle image load
  useEffect(() => {
    if (!imageSrc) return;
    setLoading(true);
    const img = new Image();
    if (!imageSrc.startsWith("data:image/svg+xml")) {
      img.crossOrigin = "anonymous";
    }
    img.src = imageSrc;
    img.onload = () => {
      imageRef.current = img;
      setLoading(false);
      render();
    };
    img.onerror = (err) => {
      console.error("Failed to load image:", imageSrc, err);
      setLoading(false);
    };
  }, [imageSrc]);

  // Request animation frame for animated shaders (like Water)
  useEffect(() => {
    const tick = () => {
      if (glRef.current && programRef.current && imageRef.current && !loading) {
        render();
      }
      if (effectType === 5) {
        animationFrameIdRef.current = requestAnimationFrame(tick);
      }
    };

    if (effectType === 5) {
      animationFrameIdRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [effectType, loading]);

  // Re-render when parameters change (if not in active water loop)
  useEffect(() => {
    if (!loading && imageRef.current && effectType !== 5) {
      render();
    }
  }, [
    loading,
    effectType,
    ditherType,
    ditherSize,
    colorSteps,
    halftoneSize,
    halftoneSharpness,
    flutedSize,
    flutedShape,
    flutedAngle,
    flutedDistortionShape,
    flutedDistortion,
    flutedShadows,
    flutedHighlights,
    flutedEdges,
    colorShadow,
    dotGridType,
    dotShapeType,
    dotRadius,
    dotContrast,
    dotSize,
    dotGrain,
    cmykSize,
    cmykNoise,
    cmykSoftness,
    cmykContrast,
    cmykGainC,
    cmykGainM,
    cmykGainY,
    cmykGainK,
    cmykFloodC,
    cmykFloodM,
    cmykFloodY,
    cmykFloodK,
    colorC,
    colorM,
    colorY,
    colorK,
    waterSize,
    waterSpeed,
    waterWaves,
    waterCaustic,
    waterHighlights,
    waterEdges,
    colorBack,
    colorFront,
    colorHighlight,
    originalColors,
    inverted,
    brightness,
    contrast,
    gamma,
    saturation,
    fit
  ]);

  const render = () => {
    const gl = glRef.current;
    const program = programRef.current;
    const img = imageRef.current;
    const canvas = canvasRef.current;

    if (!gl || !program || !img || !canvas) return;

    const container = canvas.parentElement;
    const containerWidth = container ? container.clientWidth : 800;
    const containerHeight = container ? container.clientHeight : 600;

    let displayWidth = img.width || 800;
    let displayHeight = img.height || 600;

    const imageAspect = displayWidth / displayHeight;
    const containerAspect = containerWidth / containerHeight;

    if (fit === "cover") {
      if (imageAspect > containerAspect) {
        displayHeight = containerHeight;
        displayWidth = containerHeight * imageAspect;
      } else {
        displayWidth = containerWidth;
        displayHeight = containerWidth / imageAspect;
      }
    } else {
      if (imageAspect > containerAspect) {
        displayWidth = containerWidth;
        displayHeight = containerWidth / imageAspect;
      } else {
        displayHeight = containerHeight;
        displayWidth = containerHeight * imageAspect;
      }
    }

    canvas.width = displayWidth;
    canvas.height = displayHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBufferRef.current);
    const positionAttributeLocation = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textureRef.current);
    
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    } catch (e) {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = img.width || 800;
      tempCanvas.height = img.height || 600;
      const ctx = tempCanvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tempCanvas);
      }
    }

    // Set uniform values
    gl.uniform1i(gl.getUniformLocation(program, "u_image"), 0);
    gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), canvas.width, canvas.height);
    
    // Time uniform
    const elapsed = Date.now() - startTimeRef.current;
    gl.uniform1f(gl.getUniformLocation(program, "u_time"), elapsed);
    
    // Effect selection
    gl.uniform1i(gl.getUniformLocation(program, "u_effectType"), effectType);
    
    // Dither parameters
    gl.uniform1f(gl.getUniformLocation(program, "u_ditherSize"), ditherSize);
    gl.uniform1f(gl.getUniformLocation(program, "u_colorSteps"), colorSteps);
    gl.uniform1i(gl.getUniformLocation(program, "u_ditherType"), ditherType);
    
    // Halftone (Classic) parameters
    gl.uniform1f(gl.getUniformLocation(program, "u_halftoneSize"), halftoneSize);
    gl.uniform1f(gl.getUniformLocation(program, "u_halftoneSharpness"), halftoneSharpness);
    
    // Fluted Glass parameters
    gl.uniform1f(gl.getUniformLocation(program, "u_flutedSize"), flutedSize);
    gl.uniform1i(gl.getUniformLocation(program, "u_flutedShape"), flutedShape);
    gl.uniform1f(gl.getUniformLocation(program, "u_flutedAngle"), flutedAngle);
    gl.uniform1i(gl.getUniformLocation(program, "u_flutedDistortionShape"), flutedDistortionShape);
    gl.uniform1f(gl.getUniformLocation(program, "u_flutedDistortion"), flutedDistortion);
    gl.uniform1f(gl.getUniformLocation(program, "u_flutedShadows"), flutedShadows);
    gl.uniform1f(gl.getUniformLocation(program, "u_flutedHighlights"), flutedHighlights);
    gl.uniform1f(gl.getUniformLocation(program, "u_flutedEdges"), flutedEdges);
    gl.uniform3fv(gl.getUniformLocation(program, "u_colorShadow"), new Float32Array(hexToRgb(colorShadow)));
    
    // Halftone Dots parameters
    gl.uniform1i(gl.getUniformLocation(program, "u_dotGridType"), dotGridType);
    gl.uniform1i(gl.getUniformLocation(program, "u_dotShapeType"), dotShapeType);
    gl.uniform1f(gl.getUniformLocation(program, "u_dotRadius"), dotRadius);
    gl.uniform1f(gl.getUniformLocation(program, "u_dotContrast"), dotContrast);
    gl.uniform1f(gl.getUniformLocation(program, "u_dotSize"), dotSize);
    gl.uniform1f(gl.getUniformLocation(program, "u_dotGrain"), dotGrain);

    // Halftone CMYK parameters
    gl.uniform1f(gl.getUniformLocation(program, "u_cmykSize"), cmykSize);
    gl.uniform1f(gl.getUniformLocation(program, "u_cmykNoise"), cmykNoise);
    gl.uniform1f(gl.getUniformLocation(program, "u_cmykSoftness"), cmykSoftness);
    gl.uniform1f(gl.getUniformLocation(program, "u_cmykContrast"), cmykContrast);
    gl.uniform1f(gl.getUniformLocation(program, "u_cmykGainC"), cmykGainC);
    gl.uniform1f(gl.getUniformLocation(program, "u_cmykGainM"), cmykGainM);
    gl.uniform1f(gl.getUniformLocation(program, "u_cmykGainY"), cmykGainY);
    gl.uniform1f(gl.getUniformLocation(program, "u_cmykGainK"), cmykGainK);
    gl.uniform1f(gl.getUniformLocation(program, "u_cmykFloodC"), cmykFloodC);
    gl.uniform1f(gl.getUniformLocation(program, "u_cmykFloodM"), cmykFloodM);
    gl.uniform1f(gl.getUniformLocation(program, "u_cmykFloodY"), cmykFloodY);
    gl.uniform1f(gl.getUniformLocation(program, "u_cmykFloodK"), cmykFloodK);
    gl.uniform3fv(gl.getUniformLocation(program, "u_colorC"), new Float32Array(hexToRgb(colorC)));
    gl.uniform3fv(gl.getUniformLocation(program, "u_colorM"), new Float32Array(hexToRgb(colorM)));
    gl.uniform3fv(gl.getUniformLocation(program, "u_colorY"), new Float32Array(hexToRgb(colorY)));
    gl.uniform3fv(gl.getUniformLocation(program, "u_colorK"), new Float32Array(hexToRgb(colorK)));
    
    // Water parameters
    gl.uniform1f(gl.getUniformLocation(program, "u_waterSize"), waterSize);
    gl.uniform1f(gl.getUniformLocation(program, "u_waterSpeed"), waterSpeed);
    gl.uniform1f(gl.getUniformLocation(program, "u_waterWaves"), waterWaves);
    gl.uniform1f(gl.getUniformLocation(program, "u_waterCaustic"), waterCaustic);
    gl.uniform1f(gl.getUniformLocation(program, "u_waterHighlights"), waterHighlights);
    gl.uniform1f(gl.getUniformLocation(program, "u_waterEdges"), waterEdges);

    // Color configurations
    gl.uniform3fv(gl.getUniformLocation(program, "u_colorBack"), new Float32Array(hexToRgb(colorBack)));
    gl.uniform3fv(gl.getUniformLocation(program, "u_colorFront"), new Float32Array(hexToRgb(colorFront)));
    gl.uniform3fv(gl.getUniformLocation(program, "u_colorHighlight"), new Float32Array(hexToRgb(colorHighlight)));
    
    gl.uniform1i(gl.getUniformLocation(program, "u_originalColors"), originalColors ? 1 : 0);
    gl.uniform1i(gl.getUniformLocation(program, "u_inverted"), inverted ? 1 : 0);
    
    gl.uniform1f(gl.getUniformLocation(program, "u_brightness"), brightness);
    gl.uniform1f(gl.getUniformLocation(program, "u_contrast"), contrast);
    gl.uniform1f(gl.getUniformLocation(program, "u_gamma"), gamma);
    gl.uniform1f(gl.getUniformLocation(program, "u_saturation"), saturation);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  return (
    <div style={{
      width: "100%",
      height: "100%",
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      background: "radial-gradient(circle, #1a1a2e 0%, #0d0d13 100%)",
    }}>
      {loading && (
        <div style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          color: "#8bac0f",
          fontFamily: "monospace",
          zIndex: 10
        }}>
          <span>LOADING TEXTURE...</span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          opacity: loading ? 0 : 1,
          maxWidth: "100%",
          maxHeight: "100%",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
          borderRadius: "8px",
          transition: "opacity 0.3s ease",
          imageRendering: "pixelated"
        }}
      />
    </div>
  );
});

DitherCanvas.displayName = "DitherCanvas";

export default DitherCanvas;
