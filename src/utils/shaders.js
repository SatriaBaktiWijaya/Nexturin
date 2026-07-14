export const VERTEX_SHADER = `#version 300 es
  in vec2 position;
  out vec2 v_texCoord;
  void main() {
    v_texCoord = position * 0.5 + 0.5;
    // Flip Y for texture coordinates
    v_texCoord.y = 1.0 - v_texCoord.y;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

export const FRAGMENT_SHADER = `#version 300 es
  precision mediump float;
  in vec2 v_texCoord;
  out vec4 fragColor;
  
  uniform sampler2D u_image;
  uniform vec2 u_resolution;
  uniform float u_time;
  
  // Effect type selection:
  // 0: Dither, 1: Halftone (Classic), 2: Fluted Glass, 3: Halftone Dots, 4: Halftone CMYK, 5: Water
  uniform int u_effectType;
  
  // Dither parameters
  uniform float u_ditherSize;
  uniform float u_colorSteps;
  uniform int u_ditherType; // 0: random, 1: 2x2, 2: 4x4, 3: 8x8
  
  // Halftone (Classic) parameters
  uniform float u_halftoneSize;
  uniform float u_halftoneSharpness;
  
  // Fluted Glass parameters
  uniform float u_flutedSize;
  uniform int u_flutedShape; // 0: lines, 1: wave, 2: zigzag
  uniform float u_flutedAngle;
  uniform int u_flutedDistortionShape; // 0: prism, 1: lens
  uniform float u_flutedDistortion;
  uniform float u_flutedShadows;
  uniform float u_flutedHighlights;
  uniform float u_flutedStretch;
  uniform float u_flutedBlur;
  uniform float u_flutedEdges;
  uniform vec3 u_colorShadow;
  
  // Halftone Dots parameters
  uniform int u_dotGridType; // 0: grid, 1: hex
  uniform int u_dotShapeType; // 0: normal, 1: gooey
  uniform float u_dotRadius;
  uniform float u_dotContrast;
  uniform float u_dotSize;
  uniform float u_dotGrain;

  // Halftone CMYK parameters
  uniform float u_cmykSize;
  uniform float u_cmykNoise;
  uniform float u_cmykSoftness;
  uniform float u_cmykContrast;
  uniform float u_cmykGainC;
  uniform float u_cmykGainM;
  uniform float u_cmykGainY;
  uniform float u_cmykGainK;
  uniform float u_cmykFloodC;
  uniform float u_cmykFloodM;
  uniform float u_cmykFloodY;
  uniform float u_cmykFloodK;
  uniform vec3 u_colorC;
  uniform vec3 u_colorM;
  uniform vec3 u_colorY;
  uniform vec3 u_colorK;
  
  // Water parameters
  uniform float u_waterSize;
  uniform float u_waterSpeed;
  uniform float u_waterWaves;
  uniform float u_waterCaustic;
  uniform float u_waterHighlights;
  uniform float u_waterLayering;
  uniform float u_waterEdges;
  
  // Color controls
  uniform vec3 u_colorBack;
  uniform vec3 u_colorFront;
  uniform vec3 u_colorHighlight;
  uniform bool u_originalColors;
  uniform bool u_inverted;
  
  // Image adjustments
  uniform float u_brightness;
  uniform float u_contrast;
  uniform float u_gamma;
  uniform float u_saturation;

  // Bayer threshold lookups
  float getBayer2x2(int x, int y) {
    float m[4] = float[](
      0.0, 0.75,
      0.5, 0.25
    );
    return m[y * 2 + x];
  }

  float getBayer4x4(int x, int y) {
    float m[16] = float[](
       0.0, 8.0, 2.0, 10.0,
      12.0, 4.0, 14.0, 6.0,
       3.0, 11.0, 1.0, 9.0,
      15.0, 7.0, 13.0, 5.0
    );
    return m[y * 4 + x] / 16.0;
  }

  float getBayer8x8(int x, int y) {
    float m[64] = float[](
       0.0, 48.0, 12.0, 60.0,  3.0, 51.0, 15.0, 63.0,
      32.0, 16.0, 44.0, 28.0, 35.0, 19.0, 47.0, 31.0,
       8.0, 56.0,  4.0, 52.0, 11.0, 59.0,  7.0, 55.0,
      40.0, 24.0, 36.0, 20.0, 43.0, 27.0, 39.0, 23.0,
       2.0, 50.0, 14.0, 62.0,  1.0, 49.0, 13.0, 61.0,
      34.0, 18.0, 46.0, 30.0, 33.0, 17.0, 45.0, 29.0,
      10.0, 58.0,  6.0, 54.0,  9.0, 57.0,  5.0, 53.0,
      42.0, 26.0, 38.0, 22.0, 41.0, 25.0, 37.0, 21.0
    );
    return m[y * 8 + x] / 64.0;
  }

  // Random noise generator
  float pseudoRandom(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }

  // Rotate coordinates for angles
  vec2 rotate(vec2 p, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
  }

  // Get halftone circle intensity for a channel (rotated square grid)
  float getHalftoneDot(vec2 fragCoord, float angle, float size, float channelVal, float sharpness) {
    vec2 rotated = rotate(fragCoord, angle);
    vec2 cell = floor(rotated / size) + 0.5;
    vec2 localUV = (rotated - (cell * size)) / size;
    float dist = length(localUV);
    float radius = sqrt(channelVal) * 0.7071;
    return smoothstep(radius + sharpness, radius - sharpness, dist);
  }

  // Get hexagonal grid local coordinates
  vec2 getHexGrid(vec2 p, float size, out vec2 cellId) {
    vec2 s = vec2(1.0, 1.7320508); // 1.732 is sqrt(3)
    vec2 gridUV = p / size;
    
    vec4 hexCenter = floor(vec4(gridUV, gridUV - vec2(0.5, 0.5)) / s.xyxy) + 0.5;
    vec4 hexLocal = gridUV.xyxy - hexCenter * s.xyxy;
    
    if (dot(hexLocal.xy, hexLocal.xy) < dot(hexLocal.zw, hexLocal.zw)) {
      cellId = hexCenter.xy;
      return hexLocal.xy;
    } else {
      cellId = hexCenter.zw + 0.5;
      return hexLocal.zw;
    }
  }

  void main() {
    vec2 fragCoord = v_texCoord * u_resolution;
    
    if (u_effectType == 2) {
      // -------------------- FLUTED GLASS EFFECT --------------------
      // Rotate coordinates
      float radAngle = u_flutedAngle * 3.14159265 / 180.0;
      vec2 rotated = rotate(fragCoord, radAngle);
      
      // Calculate repeat wave
      float stripeWidth = max(2.0, u_flutedSize * 150.0);
      float stripeX = rotated.x / stripeWidth;
      
      // Select shape
      float wave = 0.0;
      if (u_flutedShape == 0) {
        // lines (linear ramp)
        wave = abs(fract(stripeX) - 0.5) * 2.0;
      } else if (u_flutedShape == 1) {
        // wave (sine curve)
        wave = sin(stripeX * 6.2831853) * 0.5 + 0.5;
      } else if (u_flutedShape == 2) {
        // zigzag
        float stripeY = rotated.y / (stripeWidth * 2.0);
        float shift = abs(fract(stripeY) - 0.5) * 2.0;
        wave = abs(fract(stripeX + shift * 0.5) - 0.5) * 2.0;
      }
      
      // Select distortion profile
      float profile = 0.0;
      if (u_flutedDistortionShape == 0) {
        // prism (flat slope)
        profile = wave;
      } else {
        // lens (spherical curve)
        profile = sqrt(max(0.0, 1.0 - pow((wave - 0.5) * 2.0, 2.0)));
      }
      
      // Normal map calculation for refraction
      float normalX = (profile - 0.5) * 2.0;
      
      // Blur and margins
      float edgeDist = min(min(v_texCoord.x, 1.0 - v_texCoord.x), min(v_texCoord.y, 1.0 - v_texCoord.y));
      float edgeFactor = smoothstep(0.0, max(0.01, u_flutedEdges * 0.1), edgeDist);
      
      // Distort texture coordinate
      vec2 dir = vec2(cos(radAngle), sin(radAngle));
      vec2 refractUV = v_texCoord + dir * normalX * u_flutedDistortion * 0.05 * edgeFactor;
      refractUV = clamp(refractUV, 0.0, 1.0);
      
      // Sample distorted image
      vec3 col = texture(u_image, refractUV).rgb;
      
      // Shadowing / Highlight
      float shadowIntensity = max(0.0, normalX) * u_flutedShadows * 0.6;
      float highlightIntensity = pow(1.0 - abs(normalX), 5.0) * u_flutedHighlights * 0.8;
      
      col = mix(col, u_colorShadow, shadowIntensity);
      col = mix(col, u_colorHighlight, highlightIntensity);
      
      // Apply general adjustments
      col = (col - 0.5) * (1.0 + u_contrast) + 0.5 + u_brightness;
      float luma = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(luma), col, 1.0 + u_saturation);
      col = pow(clamp(col, 0.0, 1.0), vec3(u_gamma));
      
      fragColor = vec4(col, 1.0);
      return;
    }
    
    if (u_effectType == 5) {
      // -------------------- WATER CAUSTICS EFFECT --------------------
      float timeVal = u_time * u_waterSpeed * 0.001;
      vec2 p = v_texCoord * max(1.0, u_waterSize * 6.0);
      
      // Waves loop (zozuar recursive sine noise)
      vec2 pOffset = p;
      for (int i = 1; i < 5; i++) {
        float fi = float(i);
        pOffset += sin(pOffset.yx + vec2(timeVal * fi, timeVal * 1.4 * fi)) * u_waterWaves * 0.5;
        pOffset += cos(pOffset.yx - vec2(timeVal * 0.8 * fi, timeVal * fi)) * u_waterWaves * 0.5;
        pOffset = pOffset * 1.5;
      }
      
      // Caustic logic
      float causticLuma = length(sin(pOffset)) * u_waterCaustic * 0.25;
      
      // Distort texture coordinate based on wave vector
      float edgeDist = min(min(v_texCoord.x, 1.0 - v_texCoord.x), min(v_texCoord.y, 1.0 - v_texCoord.y));
      float edgeFactor = smoothstep(0.0, max(0.01, u_waterEdges * 0.15), edgeDist);
      vec2 refractUV = v_texCoord + sin(pOffset) * u_waterWaves * 0.012 * edgeFactor;
      refractUV = clamp(refractUV, 0.0, 1.0);
      
      // Sample distorted image
      vec3 col = texture(u_image, refractUV).rgb;
      
      // Overlay caustic highlight
      col += vec3(causticLuma) * u_colorHighlight * u_waterHighlights * 2.0;
      
      // Apply adjustments
      col = (col - 0.5) * (1.0 + u_contrast) + 0.5 + u_brightness;
      float luma = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(luma), col, 1.0 + u_saturation);
      col = pow(clamp(col, 0.0, 1.0), vec3(u_gamma));
      
      fragColor = vec4(col, 1.0);
      return;
    }
    
    // For dithering and halftone, we pre-adjust image colors
    vec4 texColor = texture(u_image, v_texCoord);
    vec3 rgb = texColor.rgb;
    
    rgb = (rgb - 0.5) * (1.0 + u_contrast) + 0.5 + u_brightness;
    rgb = clamp(rgb, 0.0, 1.0);
    
    float initialLuma = dot(rgb, vec3(0.299, 0.587, 0.114));
    rgb = mix(vec3(initialLuma), rgb, 1.0 + u_saturation);
    rgb = clamp(rgb, 0.0, 1.0);
    rgb = pow(rgb, vec3(u_gamma));
    
    if (u_effectType == 0) {
      // -------------------- DITHERING MODE --------------------
      vec2 ditherCoord = floor(fragCoord / max(0.5, u_ditherSize));
      
      float threshold = 0.5;
      if (u_ditherType == 0) {
        threshold = pseudoRandom(ditherCoord);
      } else if (u_ditherType == 1) {
        threshold = getBayer2x2(int(mod(ditherCoord.x, 2.0)), int(mod(ditherCoord.y, 2.0)));
      } else if (u_ditherType == 2) {
        threshold = getBayer4x4(int(mod(ditherCoord.x, 4.0)), int(mod(ditherCoord.y, 4.0)));
      } else if (u_ditherType == 3) {
        threshold = getBayer8x8(int(mod(ditherCoord.x, 8.0)), int(mod(ditherCoord.y, 8.0)));
      }

      float gray = dot(rgb, vec3(0.299, 0.587, 0.114));
      
      float steps = max(1.0, u_colorSteps - 1.0);
      float value = gray * steps;
      float integerPart = floor(value);
      float fractionalPart = fract(value);
      
      float finalLevel = integerPart;
      if (fractionalPart > threshold) {
        finalLevel += 1.0;
      }
      float normLevel = finalLevel / steps;
      normLevel = clamp(normLevel, 0.0, 1.0);
      
      if (u_inverted) {
        normLevel = 1.0 - normLevel;
      }

      vec3 finalColor;
      if (u_originalColors) {
        float origLuma = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
        if (origLuma > 0.0) {
          finalColor = texColor.rgb * (normLevel / origLuma);
        } else {
          finalColor = vec3(normLevel);
        }
        finalColor = clamp(finalColor, 0.0, 1.0);
      } else {
        if (normLevel < 0.5) {
          finalColor = mix(u_colorBack, u_colorFront, normLevel * 2.0);
        } else {
          finalColor = mix(u_colorFront, u_colorHighlight, (normLevel - 0.5) * 2.0);
        }
      }
      
      fragColor = vec4(finalColor, texColor.a);
      
    } else if (u_effectType == 1) {
      // -------------------- HALFTONE (CLASSIC) MODE --------------------
      float k = 1.0 - max(max(rgb.r, rgb.g), rgb.b);
      float c = (1.0 - rgb.r - k) / max(1e-5, 1.0 - k);
      float m = (1.0 - rgb.g - k) / max(1e-5, 1.0 - k);
      float y = (1.0 - rgb.b - k) / max(1e-5, 1.0 - k);
      
      float angleC = 15.0 * 3.14159265 / 180.0;
      float angleM = 75.0 * 3.14159265 / 180.0;
      float angleY = 0.0 * 3.14159265 / 180.0;
      float angleK = 45.0 * 3.14159265 / 180.0;
      
      float size = max(1.0, u_halftoneSize);
      float sharpness = max(0.01, u_halftoneSharpness);
      
      float dotC = getHalftoneDot(fragCoord, angleC, size, c, sharpness);
      float dotM = getHalftoneDot(fragCoord, angleM, size, m, sharpness);
      float dotY = getHalftoneDot(fragCoord, angleY, size, y, sharpness);
      float dotK = getHalftoneDot(fragCoord, angleK, size, k, sharpness);
      
      if (u_inverted) {
        dotC = 1.0 - dotC;
        dotM = 1.0 - dotM;
        dotY = 1.0 - dotY;
        dotK = 1.0 - dotK;
      }
      
      vec3 finalColor;
      
      if (u_originalColors) {
        vec3 paper = u_colorBack;
        vec3 cyanInk = vec3(0.0, 1.0, 1.0);
        vec3 magentaInk = vec3(1.0, 0.0, 1.0);
        vec3 yellowInk = vec3(1.0, 1.0, 0.0);
        vec3 blackInk = vec3(0.0, 0.0, 0.0);
        
        vec3 color = paper;
        color = mix(color, color * cyanInk, dotC);
        color = mix(color, color * magentaInk, dotM);
        color = mix(color, color * yellowInk, dotY);
        color = mix(color, color * blackInk, dotK);
        finalColor = clamp(color, 0.0, 1.0);
      } else {
        float totalInk = max(max(dotC, dotM), max(dotY, dotK));
        if (totalInk < 0.5) {
          finalColor = mix(u_colorHighlight, u_colorFront, totalInk * 2.0);
        } else {
          finalColor = mix(u_colorFront, u_colorBack, (totalInk - 0.5) * 2.0);
        }
      }
      
      fragColor = vec4(finalColor, texColor.a);
      
    } else if (u_effectType == 3) {
      // -------------------- HALFTONE DOTS MODE (SINGLE COLOR) --------------------
      float gray = dot(rgb, vec3(0.299, 0.587, 0.114));
      gray = mix(gray, (gray - 0.5) * (1.0 + u_dotContrast) + 0.5, 1.0);
      gray = clamp(gray, 0.0, 1.0);
      
      // Choose grid type
      vec2 localUV;
      vec2 cellId;
      float dSize = max(2.0, u_dotSize * 30.0);
      
      if (u_dotGridType == 1) {
        // hexagonal grid
        localUV = getHexGrid(fragCoord, dSize, cellId);
      } else {
        // rectangular grid
        vec2 cell = floor(fragCoord / dSize) + 0.5;
        localUV = (fragCoord - (cell * dSize)) / dSize;
        cellId = cell;
      }
      
      float dist = length(localUV);
      
      // Sample gray value at center of dot to prevent aliasing artifact blocks
      vec2 centerTexCoord = (cellId * dSize) / u_resolution;
      if (u_dotGridType == 1) {
        vec2 s = vec2(1.0, 1.7320508);
        centerTexCoord = (cellId * s * dSize) / u_resolution;
      }
      centerTexCoord = clamp(centerTexCoord, 0.0, 1.0);
      float sampledGray = dot(texture(u_image, centerTexCoord).rgb, vec3(0.299, 0.587, 0.114));
      sampledGray = clamp(sampledGray, 0.0, 1.0);
      
      // Calculate dot radius
      float radius = sampledGray * u_dotRadius * 0.5;
      float sharpness = 0.08;
      
      float dotFactor = 0.0;
      if (u_dotShapeType == 1) {
        // gooey metaball shape
        float field = exp(-dist * dist / max(0.01, radius * radius * 0.8));
        dotFactor = smoothstep(0.4, 0.5, field * radius);
      } else {
        // normal sharp circles
        dotFactor = smoothstep(radius + sharpness, radius - sharpness, dist);
      }
      
      if (u_inverted) {
        dotFactor = 1.0 - dotFactor;
      }
      
      // Grain overlay
      float grain = pseudoRandom(fragCoord) * u_dotGrain;
      dotFactor = clamp(dotFactor + grain - u_dotGrain * 0.5, 0.0, 1.0);
      
      vec3 finalColor;
      if (u_originalColors) {
        finalColor = mix(u_colorBack, rgb, dotFactor);
      } else {
        finalColor = mix(u_colorBack, u_colorFront, dotFactor);
      }
      
      fragColor = vec4(finalColor, texColor.a);
      
    } else if (u_effectType == 4) {
      // -------------------- HALFTONE CMYK (ADVANCED) MODE --------------------
      // CMYK values
      float k = 1.0 - max(max(rgb.r, rgb.g), rgb.b);
      float c = (1.0 - rgb.r - k) / max(1e-5, 1.0 - k);
      float m = (1.0 - rgb.g - k) / max(1e-5, 1.0 - k);
      float y = (1.0 - rgb.b - k) / max(1e-5, 1.0 - k);
      
      // Apply gains and floods
      c = clamp(c * (1.0 + u_cmykGainC) + u_cmykFloodC, 0.0, 1.0);
      m = clamp(m * (1.0 + u_cmykGainM) + u_cmykFloodM, 0.0, 1.0);
      y = clamp(y * (1.0 + u_cmykGainY) + u_cmykFloodY, 0.0, 1.0);
      k = clamp(k * (1.0 + u_cmykGainK) + u_cmykFloodK, 0.0, 1.0);
      
      // Screen angles
      float angleC = 15.0 * 3.14159265 / 180.0;
      float angleM = 75.0 * 3.14159265 / 180.0;
      float angleY = 0.0 * 3.14159265 / 180.0;
      float angleK = 45.0 * 3.14159265 / 180.0;
      
      float size = max(2.0, u_cmykSize * 30.0);
      float softness = max(0.01, u_cmykSoftness * 0.3);
      
      // Add grid noise jitter
      vec2 noiseOffset = vec2(pseudoRandom(floor(fragCoord / size))) * u_cmykNoise * size * 0.3;
      vec2 noisyCoord = fragCoord + noiseOffset;
      
      float dotC = getHalftoneDot(noisyCoord, angleC, size, c, softness);
      float dotM = getHalftoneDot(noisyCoord, angleM, size, m, softness);
      float dotY = getHalftoneDot(noisyCoord, angleY, size, y, softness);
      float dotK = getHalftoneDot(noisyCoord, angleK, size, k, softness);
      
      if (u_inverted) {
        dotC = 1.0 - dotC;
        dotM = 1.0 - dotM;
        dotY = 1.0 - dotY;
        dotK = 1.0 - dotK;
      }
      
      vec3 finalColor;
      
      // Subtractive color mixing on back paper background
      vec3 paper = u_colorBack;
      vec3 inkC = u_colorC;
      vec3 inkM = u_colorM;
      vec3 inkY = u_colorY;
      vec3 inkK = u_colorK;
      
      vec3 color = paper;
      color = mix(color, color * inkC, dotC);
      color = mix(color, color * inkM, dotM);
      color = mix(color, color * inkY, dotY);
      color = mix(color, color * inkK, dotK);
      
      // Apply contrast to final print look
      color = (color - 0.5) * (1.0 + u_cmykContrast) + 0.5;
      finalColor = clamp(color, 0.0, 1.0);
      
      fragColor = vec4(finalColor, texColor.a);
    }
  }
`;
