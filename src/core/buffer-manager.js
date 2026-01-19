/**
 * Buffer Manager
 * Creates and manages geometry buffers for ray marching
 */

export class BufferManager {
    constructor(gl) {
        this.gl = gl;
        this.vao = null;
        this.positionBuffer = null;

        this._createFullScreenQuad();
    }

    /**
     * Create a full-screen quad for ray marching
     * Uses clip-space coordinates (-1 to 1)
     */
    _createFullScreenQuad() {
        const gl = this.gl;

        // Create VAO
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        // Vertex positions for full-screen triangle
        // Using a single triangle that covers the entire screen
        // This is more efficient than a quad (4 vertices, 6 indices)
        const positions = new Float32Array([
            -1.0, -1.0,  // Bottom-left
             3.0, -1.0,  // Beyond bottom-right (will be clipped)
            -1.0,  3.0   // Beyond top-left (will be clipped)
        ]);

        // Create position buffer
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        // Set up vertex attribute
        // Attribute 0: position (vec2)
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        // Unbind VAO
        gl.bindVertexArray(null);
    }

    /**
     * Bind the full-screen quad VAO
     */
    bind() {
        this.gl.bindVertexArray(this.vao);
    }

    /**
     * Unbind VAO
     */
    unbind() {
        this.gl.bindVertexArray(null);
    }

    /**
     * Draw the full-screen quad
     */
    draw() {
        this.bind();
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
        this.unbind();
    }

    /**
     * Clean up resources
     */
    dispose() {
        const gl = this.gl;

        if (this.positionBuffer) {
            gl.deleteBuffer(this.positionBuffer);
            this.positionBuffer = null;
        }

        if (this.vao) {
            gl.deleteVertexArray(this.vao);
            this.vao = null;
        }
    }
}
