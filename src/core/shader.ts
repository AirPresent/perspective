export class MatrixShader {
    private static vertexSource = `
        attribute vec2 vertex;
        attribute vec2 _texCord;
        
        varying vec2 texCord;
        
        void main() {
            texCord = _texCord;
            gl_Position = vec4(vertex * 2.0 - 1.0, 0.0, 1.0);
        }
    `;

    private static fragmentSource = `
        precision highp float;
        uniform mat3 matrix;
        uniform sampler2D texture;
        
        uniform vec2 texSize;
        uniform vec2 canvasSize;
        
        varying vec2 texCord;   
        void main() {
            vec2 v = texCord;
            v.y = 1.0 - v.y;
            
            vec3 warp = matrix * vec3(v * canvasSize, 1.0);
            v = warp.xy / warp.z;
            
            gl_FragColor = texture2D(texture, v / texSize);
            
            vec2 max = min(canvasSize, texSize);
            vec2 clamped = clamp(v, vec2(0.0), max);
            if (v != clamped) gl_FragColor.a = 0.0;
        }
    `;

    private compileSource(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) throw 'compile error: ' + this.gl.getShaderInfoLog(shader);

        return shader;
    }

    private vertexAttribute: number;
    private texCordAttribute: number;
    private program: WebGLProgram;

    private gl: WebGLRenderingContext;
    constructor(context: WebGLRenderingContext) {
        this.gl = context;

        this.vertexAttribute = null;
        this.texCordAttribute = null;

        this.program = this.gl.createProgram();

        this.gl.attachShader(this.program, this.compileSource(this.gl.VERTEX_SHADER, MatrixShader.vertexSource));
        this.gl.attachShader(this.program, this.compileSource(this.gl.FRAGMENT_SHADER, MatrixShader.fragmentSource));

        this.gl.linkProgram(this.program);
        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS))
            throw 'link error: ' + this.gl.getProgramInfoLog(this.program);
    }

    public destroy() {
        this.gl.deleteProgram(this.program);
        this.program = null;
    };

    public uniforms(uniforms) {
        this.gl.useProgram(this.program);

        for (const name in uniforms) {
            if (!uniforms.hasOwnProperty(name)) continue;

            const location = this.gl.getUniformLocation(this.program, name);
            if (location === null) continue; // will be null if the uniform isn't used in the shader

            const value = uniforms[name];
            if (Array.isArray(value)) {
                switch (value.length) {
                    case 1: this.gl.uniform1fv(location, new Float32Array(value)); continue;
                    case 2: this.gl.uniform2fv(location, new Float32Array(value)); continue;
                    case 3: this.gl.uniform3fv(location, new Float32Array(value)); continue;
                    case 4: this.gl.uniform4fv(location, new Float32Array(value)); continue;

                    case 9: this.gl.uniformMatrix3fv(location, false, new Float32Array(value)); continue;
                    case 16: this.gl.uniformMatrix4fv(location, false, new Float32Array(value)); continue;

                    default: throw `don't know how to load uniform ${name} of length ${value.length}`;
                }
            }

            if (typeof value === 'number') {
                this.gl.uniform1f(location, value);
                continue;
            }

            throw `attempted to set uniform ${name} to invalid value ${value || 'undefined'}`;
        }

        return this;
    };

    private static vertexBuffers = new WeakMap<WebGLRenderingContext, WebGLBuffer>();
    private static texCordBuffers = new WeakMap<WebGLRenderingContext, WebGLBuffer>();
    public drawRect() {
        const positions = [
            0, 0,
            0, 1,
            1, 0,
            1, 0,
            0, 1,
            1, 1,
        ];

        let vertexBuffer = MatrixShader.vertexBuffers.get(this.gl);
        let texCordBuffer = MatrixShader.texCordBuffers.get(this.gl);

        if (vertexBuffer == null) {
            vertexBuffer = this.gl.createBuffer();
            MatrixShader.vertexBuffers.set(this.gl, vertexBuffer);
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

        if (texCordBuffer == null) {
            texCordBuffer = this.gl.createBuffer();
            MatrixShader.texCordBuffers.set(this.gl, texCordBuffer);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCordBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
        }

        if (this.vertexAttribute == null) {
            this.vertexAttribute = this.gl.getAttribLocation(this.program, 'vertex');
            this.gl.enableVertexAttribArray(this.vertexAttribute);
        }
        if (this.texCordAttribute == null) {
            this.texCordAttribute = this.gl.getAttribLocation(this.program, '_texCord');
            this.gl.enableVertexAttribArray(this.texCordAttribute);
        }

        this.gl.useProgram(this.program);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
        this.gl.vertexAttribPointer(this.vertexAttribute, 2, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCordBuffer);
        this.gl.vertexAttribPointer(this.texCordAttribute, 2, this.gl.FLOAT, false, 0, 0);

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    };
}