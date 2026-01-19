/**
 * Shader Manager
 * Handles shader loading, #include preprocessing, compilation, and linking
 */

export class ShaderManager {
    constructor(gl, basePath = 'src/shaders') {
        this.gl = gl;
        this.basePath = basePath;
        this.shaderCache = new Map();
        this.programCache = new Map();
        this.uniformLocations = new Map();
    }

    /**
     * Load shader source from file
     */
    async loadShaderSource(path) {
        if (this.shaderCache.has(path)) {
            return this.shaderCache.get(path);
        }

        const fullPath = `${this.basePath}/${path}`;
        const response = await fetch(fullPath);

        if (!response.ok) {
            throw new Error(`Failed to load shader: ${fullPath} (${response.status})`);
        }

        const source = await response.text();
        this.shaderCache.set(path, source);
        return source;
    }

    /**
     * Process #include directives in shader source
     * Supports: #include "path/to/file.glsl"
     */
    async preprocessIncludes(source, currentPath = '') {
        const includeRegex = /#include\s+"([^"]+)"/g;
        const includes = [];
        let match;

        // Find all includes
        while ((match = includeRegex.exec(source)) !== null) {
            includes.push({
                fullMatch: match[0],
                path: match[1]
            });
        }

        // Process includes
        for (const include of includes) {
            // Resolve relative path
            const basedir = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
            let includePath = include.path;

            // Handle relative paths
            if (includePath.startsWith('./')) {
                includePath = basedir + includePath.substring(2);
            } else if (!includePath.startsWith('/')) {
                includePath = basedir + includePath;
            }

            // Load and preprocess included file
            const includeSource = await this.loadShaderSource(includePath);
            const processedInclude = await this.preprocessIncludes(includeSource, includePath);

            // Replace include directive with processed source
            source = source.replace(include.fullMatch, processedInclude);
        }

        return source;
    }

    /**
     * Compile a shader
     */
    compileShader(source, type) {
        const gl = this.gl;
        const shader = gl.createShader(type);

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);

            // Parse error message to add helpful context
            const typeStr = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';
            throw new Error(`${typeStr} shader compilation failed:\n${info}\n\nSource:\n${this.addLineNumbers(source)}`);
        }

        return shader;
    }

    /**
     * Add line numbers to source for debugging
     */
    addLineNumbers(source) {
        return source
            .split('\n')
            .map((line, i) => `${String(i + 1).padStart(4)}: ${line}`)
            .join('\n');
    }

    /**
     * Create and link a shader program
     */
    createProgram(vertexShader, fragmentShader) {
        const gl = this.gl;
        const program = gl.createProgram();

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error(`Shader program linking failed:\n${info}`);
        }

        return program;
    }

    /**
     * Load, preprocess, compile, and link shaders
     */
    async loadProgram(vertexPath, fragmentPath, name = 'default') {
        console.log(`Loading shader program: ${name}`);
        console.log(`  Vertex: ${vertexPath}`);
        console.log(`  Fragment: ${fragmentPath}`);

        const gl = this.gl;

        // Load and preprocess vertex shader
        let vertexSource = await this.loadShaderSource(vertexPath);
        vertexSource = await this.preprocessIncludes(vertexSource, vertexPath);

        // Load and preprocess fragment shader
        let fragmentSource = await this.loadShaderSource(fragmentPath);
        fragmentSource = await this.preprocessIncludes(fragmentSource, fragmentPath);

        // Compile shaders
        const vertexShader = this.compileShader(vertexSource, gl.VERTEX_SHADER);
        const fragmentShader = this.compileShader(fragmentSource, gl.FRAGMENT_SHADER);

        // Link program
        const program = this.createProgram(vertexShader, fragmentShader);

        // Clean up individual shaders (they're linked now)
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        // Cache program
        this.programCache.set(name, program);

        // Initialize uniform location cache for this program
        this.uniformLocations.set(name, new Map());

        console.log(`Shader program "${name}" loaded successfully`);
        return program;
    }

    /**
     * Get a cached program
     */
    getProgram(name = 'default') {
        return this.programCache.get(name);
    }

    /**
     * Use a shader program
     */
    useProgram(name = 'default') {
        const program = this.getProgram(name);
        if (program) {
            this.gl.useProgram(program);
        }
        return program;
    }

    /**
     * Get uniform location (cached)
     */
    getUniformLocation(programName, uniformName) {
        const cache = this.uniformLocations.get(programName);
        if (!cache) {
            console.warn(`Program "${programName}" not found`);
            return null;
        }

        if (cache.has(uniformName)) {
            return cache.get(uniformName);
        }

        const program = this.getProgram(programName);
        const location = this.gl.getUniformLocation(program, uniformName);
        cache.set(uniformName, location);

        if (location === null) {
            console.warn(`Uniform "${uniformName}" not found in program "${programName}"`);
        }

        return location;
    }

    /**
     * Set uniform values with automatic type detection
     */
    setUniform(programName, name, value) {
        const gl = this.gl;
        const location = this.getUniformLocation(programName, name);

        if (location === null) return;

        if (typeof value === 'number') {
            gl.uniform1f(location, value);
        } else if (typeof value === 'boolean') {
            gl.uniform1i(location, value ? 1 : 0);
        } else if (Number.isInteger(value)) {
            gl.uniform1i(location, value);
        } else if (Array.isArray(value) || value instanceof Float32Array) {
            switch (value.length) {
                case 2:
                    gl.uniform2fv(location, value);
                    break;
                case 3:
                    gl.uniform3fv(location, value);
                    break;
                case 4:
                    gl.uniform4fv(location, value);
                    break;
                case 9:
                    gl.uniformMatrix3fv(location, false, value);
                    break;
                case 16:
                    gl.uniformMatrix4fv(location, false, value);
                    break;
                default:
                    console.warn(`Unsupported uniform array length: ${value.length}`);
            }
        }
    }

    /**
     * Set integer uniform
     */
    setUniformInt(programName, name, value) {
        const gl = this.gl;
        const location = this.getUniformLocation(programName, name);
        if (location !== null) {
            gl.uniform1i(location, value);
        }
    }

    /**
     * Set multiple uniforms at once
     */
    setUniforms(programName, uniforms) {
        for (const [name, value] of Object.entries(uniforms)) {
            this.setUniform(programName, name, value);
        }
    }

    /**
     * Clean up resources
     */
    dispose() {
        const gl = this.gl;

        for (const program of this.programCache.values()) {
            gl.deleteProgram(program);
        }

        this.shaderCache.clear();
        this.programCache.clear();
        this.uniformLocations.clear();
    }
}
