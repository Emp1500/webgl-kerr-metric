#version 300 es

// ============================================================================
// Vertex Shader for Full-Screen Ray Marching
// ============================================================================

// Input: clip-space position of full-screen triangle
layout(location = 0) in vec2 a_position;

// Output to fragment shader
out vec2 v_uv;

void main() {
    // Pass position as UV coordinates
    // Transform from [-1, 1] to [0, 1]
    v_uv = a_position * 0.5 + 0.5;

    // Pass through clip-space position
    gl_Position = vec4(a_position, 0.0, 1.0);
}
