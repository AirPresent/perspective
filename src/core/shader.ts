export class MatrixShader {
    private static vertexSource = `
        attribute vec2 vertex;
        attribute vec2 _texCoord;
        
        varying vec2 texCoord;
        
        void main() {
            texCoord = _texCoord;
            gl_Position = vec4(vertex * 2.0 - 1.0, 0.0, 1.0);
        }
    `;

    private static fragmentSource = `
        precision highp float;
        uniform mat3 matrix;
        uniform sampler2D texture;
        
        uniform vec2 texSize;
        varying vec2 texCoord;
        
        void main() {
            vec2 coord = texCoord * texSize;
            vec3 warp = matrix * vec3(coord, 1.0);
            
            coord = warp.xy / warp.z;
            coord.y = texSize.y - coord.y;
            
            gl_FragColor = texture2D(texture, coord / texSize);
            
            vec2 clampedCoord = clamp(coord, vec2(0.0), texSize);
            if (coord != clampedCoord) gl_FragColor.a *= max(0.0, 1.0 - length(coord - clampedCoord)); /* fade to transparent if we are outside the image */
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
    private texCoordAttribute: number;
    private program: WebGLProgram;

    private gl: WebGLRenderingContext;
    constructor(context: WebGLRenderingContext) {
        this.gl = context;

        this.vertexAttribute = null;
        this.texCoordAttribute = null;

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
    private static texCoordBuffers = new WeakMap<WebGLRenderingContext, WebGLBuffer>();
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
        let texCoordBuffer = MatrixShader.texCoordBuffers.get(this.gl);

        if (vertexBuffer == null) {
            vertexBuffer = this.gl.createBuffer();
            MatrixShader.vertexBuffers.set(this.gl, vertexBuffer);
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

        if (texCoordBuffer == null) {
            texCoordBuffer = this.gl.createBuffer();
            MatrixShader.texCoordBuffers.set(this.gl, texCoordBuffer);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
        }

        if (this.vertexAttribute == null) {
            this.vertexAttribute = this.gl.getAttribLocation(this.program, 'vertex');
            this.gl.enableVertexAttribArray(this.vertexAttribute);
        }
        if (this.texCoordAttribute == null) {
            this.texCoordAttribute = this.gl.getAttribLocation(this.program, '_texCoord');
            this.gl.enableVertexAttribArray(this.texCoordAttribute);
        }

        this.gl.useProgram(this.program);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
        this.gl.vertexAttribPointer(this.vertexAttribute, 2, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
        this.gl.vertexAttribPointer(this.texCoordAttribute, 2, this.gl.FLOAT, false, 0, 0);

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    };
}