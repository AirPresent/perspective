import {Shader} from './shader';

export class Texture {
    public static fromElement(element: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement, gl: WebGLRenderingContext) {
        const texture = new Texture(0, 0, gl.RGBA, gl.UNSIGNED_BYTE, gl);
        texture.loadContentsOf(element);

        return texture;
    };

    private static canvas = null;
    private static getCanvas(texture: Texture) {
        if (this.canvas == null) this.canvas = document.createElement('canvas');

        this.canvas.width = texture.width;
        this.canvas.height = texture.height;

        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        return ctx;
    }

    private gl: WebGLRenderingContext;
    private id: WebGLTexture;

    public width: number;
    public height: number;

    private format: number;
    private type: number;

    constructor(width: number, height: number, format: number, type: number, gl: WebGLRenderingContext) {
        this.gl = gl;
        this.id = gl.createTexture();
        this.width = width;
        this.height = height;
        this.format = format;
        this.type = type;

        gl.bindTexture(gl.TEXTURE_2D, this.id);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        if (width && height)
            gl.texImage2D(gl.TEXTURE_2D, 0, this.format, width, height, 0, this.format, this.type, null);
    }

    public loadContentsOf(element: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement) {
        this.width = element.width;
        this.height = element.height;

        if (element instanceof HTMLVideoElement) {
            this.width = element.width || element.videoWidth;
            this.height = element.height || element.videoHeight;
        }

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.id);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.format, this.format, this.type, element);
    }

    public initFromBytes(width: number, height: number, data: Iterable<number>) {
        this.width = width;
        this.height = height;

        this.format = this.gl.RGBA;
        this.type = this.gl.UNSIGNED_BYTE;

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.id);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.type, new Uint8Array(data));
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

    public ensureFormat(texture: Texture);
    public ensureFormat(width: number, height: number, format: number, type: number);

    public ensureFormat(width: Texture | number, height?: number, format?: number, type?: number) {
        // allow passing an existing texture instead of individual arguments
        if (width instanceof Texture) {
            const texture = width;
            width = texture.width;
            height = texture.height;
            format = texture.format;
            type = texture.type;
        }

        // change the format only if required
        if (width != this.width || height != this.height || format != this.format || type != this.type) {
            this.width = width;
            this.height = height;
            this.format = format;
            this.type = type;

            this.gl.bindTexture(this.gl.TEXTURE_2D, this.id);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.format, width, height, 0, this.format, this.type, null);
        }
    };

    private static frameBuffers = new WeakMap<WebGLRenderingContext, WebGLFramebuffer>();
    public drawTo(callback: () => void) {
        // start rendering to this texture
        let frameBuffer = Texture.frameBuffers.get(this.gl);
        if (frameBuffer == null) {
            frameBuffer = this.gl.createFramebuffer();
            Texture.frameBuffers.set(this.gl, frameBuffer);
        }

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, frameBuffer);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.id, 0);
        if (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) !== this.gl.FRAMEBUFFER_COMPLETE)
            throw new Error('incomplete framebuffer');

        this.gl.viewport(0, 0, this.width, this.height);

        // do the drawing
        callback();

        // stop rendering to this texture
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    };

    public fillUsingCanvas(callback: (canvas: HTMLCanvasElement) => void) {
        callback(Texture.getCanvas(this));
        this.format = this.gl.RGBA;
        this.type = this.gl.UNSIGNED_BYTE;
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.id);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, Texture.canvas);
        return this;
    };

    public toImage(image: HTMLImageElement) {
        this.use();

        Shader.getDefaultShader(this.gl).drawRect();

        const size = this.width * this.height * 4;
        const pixels = new Uint8Array(size);

        const canvas = Texture.getCanvas(this);
        const data = canvas.createImageData(this.width, this.height);

        this.gl.readPixels(0, 0, this.width, this.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
        for (let i = 0; i < size; i++) data.data[i] = pixels[i];

        canvas.putImageData(data, 0, 0);
        image.src = canvas.toDataURL();
    };

    public swapWith(other) {
        let temp;
        temp = other.id; other.id = this.id; this.id = temp;
        temp = other.width; other.width = this.width; this.width = temp;
        temp = other.height; other.height = this.height; this.height = temp;
        temp = other.format; other.format = this.format; this.format = temp;
    };
}