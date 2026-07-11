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
  uniform float u_ditherSize;
  uniform float u_colorSteps;
  uniform int u_ditherType; // 0: random, 1: 2x2, 2: 4x4, 3: 8x8
  
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

  void main() {
    // Sample original color
    vec4 texColor = texture(u_image, v_texCoord);
    vec3 rgb = texColor.rgb;
    
    // Apply contrast and brightness
    rgb = (rgb - 0.5) * (1.0 + u_contrast) + 0.5 + u_brightness;
    rgb = clamp(rgb, 0.0, 1.0);
    
    // Apply saturation adjustment
    float luma = dot(rgb, vec3(0.299, 0.587, 0.114));
    rgb = mix(vec3(luma), rgb, 1.0 + u_saturation);
    rgb = clamp(rgb, 0.0, 1.0);
    
    // Apply gamma correction
    rgb = pow(rgb, vec3(u_gamma));
    
    // Dithering calculation
    vec2 fragCoord = v_texCoord * u_resolution;
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

    // Convert pixel to gray for standard ordered dithering logic
    float gray = dot(rgb, vec3(0.299, 0.587, 0.114));
    
    // Apply threshold to scale gray levels
    float steps = max(1.0, u_colorSteps - 1.0);
    float value = gray * steps;
    float integerPart = floor(value);
    float fractionalPart = fract(value);
    
    // Dither comparison
    float finalLevel = integerPart;
    if (fractionalPart > threshold) {
      finalLevel += 1.0;
    }
    float normLevel = finalLevel / steps;
    normLevel = clamp(normLevel, 0.0, 1.0);
    
    // Invert output if requested
    if (u_inverted) {
      normLevel = 1.0 - normLevel;
    }

    // Map output to target color space
    vec3 finalColor;
    if (u_originalColors) {
      // Re-apply lightness level to original color
      float origLuma = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
      if (origLuma > 0.0) {
        finalColor = texColor.rgb * (normLevel / origLuma);
      } else {
        finalColor = vec3(normLevel);
      }
      finalColor = clamp(finalColor, 0.0, 1.0);
    } else {
      // 3-color mapping (Back -> Front -> Highlight)
      if (normLevel < 0.5) {
        // Blend between Back and Front
        finalColor = mix(u_colorBack, u_colorFront, normLevel * 2.0);
      } else {
        // Blend between Front and Highlight
        finalColor = mix(u_colorFront, u_colorHighlight, (normLevel - 0.5) * 2.0);
      }
    }
    
    fragColor = vec4(finalColor, texColor.a);
  }
`;
