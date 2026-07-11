import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { VERTEX_SHADER, FRAGMENT_SHADER } from "../utils/shaders";

// Helper to convert HEX to normalized float array [r, g, b]
const hexToRgb = (hex) => {
  const cleanHex = hex.replace(/^#/, "");
  if (cleanHex.length !== 6) return [1, 1, 1];
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return [r, g, b];
};

const DitherCanvas = forwardRef(({
  imageSrc,
  ditherType = 2,
  ditherSize = 2,
  colorSteps = 2,
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

  // Expose the download function to the parent component supporting multiple formats
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

  // Helper to compile shader
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

  // Set up WebGL context once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true });
    if (!gl) {
      console.error("WebGL 2 not supported by this browser");
      return;
    }
    glRef.current = gl;

    // Compile shaders & Link Program
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

    // Create & setup position buffer
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

    // Create texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    textureRef.current = texture;

    return () => {
      // Cleanup
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
    
    // SVG data URLs do not need crossOrigin and setting it can sometimes fail in some browsers
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

  // Handle parameters update (re-render)
  useEffect(() => {
    if (!loading && imageRef.current) {
      render();
    }
  }, [
    loading,
    ditherType,
    ditherSize,
    colorSteps,
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

    // Set canvas dimensions based on image aspect ratio and fit behavior
    const container = canvas.parentElement;
    const containerWidth = container ? container.clientWidth : 800;
    const containerHeight = container ? container.clientHeight : 600;

    let displayWidth = img.width || 800;
    let displayHeight = img.height || 600;

    // Handle "cover" / "contain" mapping logic inside canvas layout
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
    } else { // contain
      if (imageAspect > containerAspect) {
        displayWidth = containerWidth;
        displayHeight = containerWidth / imageAspect;
      } else {
        displayHeight = containerHeight;
        displayWidth = containerHeight * imageAspect;
      }
    }

    // Set canvas resolution to match display size
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.useProgram(program);

    // Bind and set vertex buffer and attributes on every draw
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBufferRef.current);
    const positionAttributeLocation = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    // Upload texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textureRef.current);
    
    // Upload image data to GPU
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    } catch (e) {
      console.warn("Texture upload warning, retrying with drawImage fallback:", e);
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
    gl.uniform1f(gl.getUniformLocation(program, "u_ditherSize"), ditherSize);
    gl.uniform1f(gl.getUniformLocation(program, "u_colorSteps"), colorSteps);
    gl.uniform1i(gl.getUniformLocation(program, "u_ditherType"), ditherType);

    gl.uniform3fv(gl.getUniformLocation(program, "u_colorBack"), new Float32Array(hexToRgb(colorBack)));
    gl.uniform3fv(gl.getUniformLocation(program, "u_colorFront"), new Float32Array(hexToRgb(colorFront)));
    gl.uniform3fv(gl.getUniformLocation(program, "u_colorHighlight"), new Float32Array(hexToRgb(colorHighlight)));
    
    gl.uniform1i(gl.getUniformLocation(program, "u_originalColors"), originalColors ? 1 : 0);
    gl.uniform1i(gl.getUniformLocation(program, "u_inverted"), inverted ? 1 : 0);
    
    gl.uniform1f(gl.getUniformLocation(program, "u_brightness"), brightness);
    gl.uniform1f(gl.getUniformLocation(program, "u_contrast"), contrast);
    gl.uniform1f(gl.getUniformLocation(program, "u_gamma"), gamma);
    gl.uniform1f(gl.getUniformLocation(program, "u_saturation"), saturation);

    // Draw full-screen quad
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
