export class Shader {
    private static defaultVertexSource = '\
    attribute vec2 vertex;\
    attribute vec2 _texCoord;\
    varying vec2 texCoord;\
    void main() {\
        texCoord = _texCoord;\
        gl_Position = vec4(vertex * 2.0 - 1.0, 0.0, 1.0);\
    }';

    private static defaultFragmentSource = '\
    uniform sampler2D texture;\
    varying vec2 texCoord;\
    void main() {\
        gl_FragColor = texture2D(texture, texCoord);\
    }';

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
    constructor(vertexSource, fragmentSource, context: WebGLRenderingContext) {
        this.gl = context;

        this.vertexAttribute = null;
        this.texCoordAttribute = null;

        this.program = this.gl.createProgram();

        vertexSource = vertexSource || Shader.defaultVertexSource;
        fragmentSource = fragmentSource || Shader.defaultFragmentSource;
        fragmentSource = 'precision highp float;' + fragmentSource; // annoying requirement is annoying

        this.gl.attachShader(this.program, this.compileSource(this.gl.VERTEX_SHADER, vertexSource));
        this.gl.attachShader(this.program, this.compileSource(this.gl.FRAGMENT_SHADER, fragmentSource));

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

    // textures are uniforms too but for some reason can't be specified by gl.uniform1f,
    // even though floating point numbers represent the integers 0 through 7 exactly
    public textures(textures) {
        this.gl.useProgram(this.program);
        for (const name in textures) {
            if (!textures.hasOwnProperty(name)) continue;
            this.gl.uniform1i(this.gl.getUniformLocation(this.program, name), textures[name]);
        }

        return this;
    };

    private static vertexBuffers = new WeakMap<WebGLRenderingContext, WebGLBuffer>();
    private static texCoordBuffers = new WeakMap<WebGLRenderingContext, WebGLBuffer>();
    public drawRect(left?: number, top?: number, right?: number, bottom?: number) {
        const viewport = this.gl.getParameter(this.gl.VIEWPORT);

        if (top === undefined) top = 0;
        if (left === undefined) left = 0;
        if (right === undefined) right = 1;
        if (bottom === undefined) bottom = 1;

        top    = (top    - viewport[1]) / viewport[3];
        left   = (left   - viewport[0]) / viewport[2];
        right  = (right  - viewport[0]) / viewport[2];
        bottom = (bottom - viewport[1]) / viewport[3];

        let vertexBuffer = Shader.vertexBuffers.get(this.gl);
        let texCoordBuffer = Shader.texCoordBuffers.get(this.gl);

        if (vertexBuffer == null) {
            vertexBuffer = this.gl.createBuffer();
            Shader.vertexBuffers.set(this.gl, vertexBuffer);
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([ left, top, left, bottom, right, top, right, bottom ]), this.gl.STATIC_DRAW);

        if (texCoordBuffer == null) {
            texCoordBuffer = this.gl.createBuffer();
            Shader.texCoordBuffers.set(this.gl, texCoordBuffer);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([ 0, 0, 0, 1, 1, 0, 1, 1 ]), this.gl.STATIC_DRAW);
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

        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    };

    private static shaders = new WeakMap<WebGLRenderingContext, Shader>();
    public static getDefaultShader(gl: WebGLRenderingContext) {
        if (!Shader.shaders.has(gl)) Shader.shaders.set(gl, new Shader(null, null, gl));
        return Shader.shaders.get(gl);
    };
}