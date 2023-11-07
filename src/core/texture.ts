export class Texture {
    private gl: WebGLRenderingContext;
    private id: WebGLTexture;

    private format: number;
    private type: number;

    constructor(format: number, type: number, gl: WebGLRenderingContext) {
        this.gl = gl;
        this.id = gl.createTexture();
        this.format = format;
        this.type = type;

        gl.bindTexture(gl.TEXTURE_2D, this.id);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    public loadContentsOf(element: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement) {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.id);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.format, this.format, this.type, element);
    }

    public destroy() {
        this.gl.deleteTexture(this.id);
        this.id = null;
    }

    public use(unit?: number) {
        this.gl.activeTexture(this.gl.TEXTURE0 + (unit || 0));
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.id);
    }

    public unuse(unit?: number) {
        this.gl.activeTexture(this.gl.TEXTURE0 + (unit || 0));
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }
}