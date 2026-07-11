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
  
  // Effect type selection: 0: Dither, 1: Halftone
  uniform int u_effectType;
  
  // Dither parameters
  uniform float u_ditherSize;
  uniform float u_colorSteps;
  uniform int u_ditherType; // 0: random, 1: 2x2, 2: 4x4, 3: 8x8
  
  // Halftone parameters
  uniform float u_halftoneSize;
  uniform float u_halftoneSharpness;
  
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

  // Rotate coordinates for Halftone Screen angles
  vec2 rotate(vec2 p, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
  }

  // Get halftone circle intensity for a channel
  float getHalftoneDot(vec2 fragCoord, float angle, float size, float channelVal, float sharpness) {
    vec2 rotated = rotate(fragCoord, angle);
    vec2 cell = floor(rotated / size) + 0.5;
    vec2 localUV = (rotated - (cell * size)) / size;
    float dist = length(localUV);
    
    // Sample channelVal at the center of the grid cell to prevent blocky artifacts
    // In simple shader, we just use the current pixel value
    float radius = sqrt(channelVal) * 0.7071;
    return smoothstep(radius + sharpness, radius - sharpness, dist);
  }

  void main() {
    // Sample original color
    vec4 texColor = texture(u_image, v_texCoord);
    vec3 rgb = texColor.rgb;
    
    // Apply contrast and brightness adjustments
    rgb = (rgb - 0.5) * (1.0 + u_contrast) + 0.5 + u_brightness;
    rgb = clamp(rgb, 0.0, 1.0);
    
    // Apply saturation adjustment
    float luma = dot(rgb, vec3(0.299, 0.587, 0.114));
    rgb = mix(vec3(luma), rgb, 1.0 + u_saturation);
    rgb = clamp(rgb, 0.0, 1.0);
    
    // Apply gamma correction
    rgb = pow(rgb, vec3(u_gamma));
    
    vec2 fragCoord = v_texCoord * u_resolution;
    
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
      
    } else {
      // -------------------- CMYK HALFTONE MODE --------------------
      // Convert RGB to CMYK
      float k = 1.0 - max(max(rgb.r, rgb.g), rgb.b);
      float c = (1.0 - rgb.r - k) / max(1e-5, 1.0 - k);
      float m = (1.0 - rgb.g - k) / max(1e-5, 1.0 - k);
      float y = (1.0 - rgb.b - k) / max(1e-5, 1.0 - k);
      
      // Standard screen angles for CMYK (in radians)
      float angleC = 15.0 * 3.14159265 / 180.0;
      float angleM = 75.0 * 3.14159265 / 180.0;
      float angleY = 0.0 * 3.14159265 / 180.0;
      float angleK = 45.0 * 3.14159265 / 180.0;
      
      // Get halftone values (0 or 1, anti-aliased)
      float size = max(1.0, u_halftoneSize);
      float sharpness = max(0.01, u_halftoneSharpness);
      
      float dotC = getHalftoneDot(fragCoord, angleC, size, c, sharpness);
      float dotM = getHalftoneDot(fragCoord, angleM, size, m, sharpness);
      float dotY = getHalftoneDot(fragCoord, angleY, size, y, sharpness);
      float dotK = getHalftoneDot(fragCoord, angleK, size, k, sharpness);
      
      // Invert dots if requested
      if (u_inverted) {
        dotC = 1.0 - dotC;
        dotM = 1.0 - dotM;
        dotY = 1.0 - dotY;
        dotK = 1.0 - dotK;
      }
      
      vec3 finalColor;
      
      if (u_originalColors) {
        // Multi-color offset print on paper look
        // Back color acts as paper background (default is cream white)
        vec3 paper = u_colorBack;
        
        // CMYK subtractive paint overlay
        vec3 cyanInk = vec3(0.0, 1.0, 1.0);
        vec3 magentaInk = vec3(1.0, 0.0, 1.0);
        vec3 yellowInk = vec3(1.0, 1.0, 0.0);
        vec3 blackInk = vec3(0.0, 0.0, 0.0);
        
        // Subtractive color mixing simulation
        vec3 color = paper;
        color = mix(color, color * cyanInk, dotC);
        color = mix(color, color * magentaInk, dotM);
        color = mix(color, color * yellowInk, dotY);
        color = mix(color, color * blackInk, dotK);
        finalColor = clamp(color, 0.0, 1.0);
      } else {
        // Mono/3-Color custom halftone
        // We evaluate total luma of combined dots
        float totalInk = max(max(dotC, dotM), max(dotY, dotK));
        
        // Map total ink to our 3 palette colors (light background, dark ink)
        if (totalInk < 0.5) {
          finalColor = mix(u_colorHighlight, u_colorFront, totalInk * 2.0);
        } else {
          finalColor = mix(u_colorFront, u_colorBack, (totalInk - 0.5) * 2.0);
        }
      }
      
      fragColor = vec4(finalColor, texColor.a);
    }
  }
`;
