import {Quad} from './core/matrix';
import {perspective} from './filters/warp/perspective';
import {Texture} from './core/texture';
import {Shader} from './core/shader';

require('./OES_texture_float_linear-polyfill.js');

export class PerspectiveRenderer {
    private a: Quad;
    private b: Quad;

    private source: HTMLCanvasElement;
    private target: HTMLCanvasElement;

    private info: any;

    public width: number;
    public height: number;

    constructor(canvas: HTMLCanvasElement, a: Quad, b: Quad, width: number, height: number) {
        this.a = a;
        this.b = b;

        this.width = width;
        this.height = height;

        this.source = canvas;
        this.setTarget(document.createElement('canvas'));
    }

    public setA(a: Quad) {
        this.a = a;
    }

    public setB(b: Quad) {
        this.b = b;
    }

    public setSource(canvas: HTMLCanvasElement) {
        this.source = canvas;
    }

    public setTarget(canvas: HTMLCanvasElement) {
        this.target = canvas;

        const gl = canvas.getContext('experimental-webgl', { premultipliedAlpha: false });
        if (!gl) throw new Error('This browser does not support WebGL');

        this.info = {
            gl: gl,
            isInitialized: false,
            texture: null,
            spareTexture: null,
            flippedShader: null
        };

        this.initialize();
    }

    public getTarget() {
        return this.target;
    }

    public render() {
        const texture = Texture.fromElement(this.source, this.info.gl);
        texture.use();

        this.info.texture.drawTo(() => Shader.getDefaultShader(this.info.gl).drawRect());

        perspective(this.a, this.b, this);

        this.info.texture.use();
        this.info.flippedShader.drawRect();
    }

    private initialize() {
        let type = this.info.gl.UNSIGNED_BYTE;

        // Go for floating point buffer textures if we can, it'll make the bokeh
        // filter look a lot better. Note that on Windows, ANGLE does not let you
        // render to a floating-point texture when linear filtering is enabled.
        // See https://crbug.com/172278 for more this.information.
        if (this.info.gl.getExtension('OES_texture_float') && this.info.gl.getExtension('OES_texture_float_linear')) {
            const testTexture = new Texture(100, 100, this.info.gl.RGBA, this.info.gl.FLOAT, this.info.gl);
            try {
                // Only use gl.FLOAT if we can render to it
                testTexture.drawTo(() => type = this.info.gl.FLOAT);
            } catch (e) {}
            testTexture.destroy();
        }

        if (this.info.texture) this.info.texture.destroy();
        if (this.info.spareTexture) this.info.spareTexture.destroy();

        this.target.width = this.width;
        this.target.height = this.height;

        this.info.texture = new Texture(this.width, this.height, this.info.gl.RGBA, type, this.info.gl);
        this.info.spareTexture = new Texture(this.width, this.height, this.info.gl.RGBA, type, this.info.gl);

        this.info.extraTexture = this.info.extraTexture || new Texture(0, 0, this.info.gl.RGBA, type, this.info.gl);
        this.info.flippedShader = this.info.flippedShader || new Shader(null, '\
        uniform sampler2D texture;\
        varying vec2 texCoord;\
        void main() {\
            gl_FragColor = texture2D(texture, vec2(texCoord.x, 1.0 - texCoord.y));\
        }\
    ', this.info.gl);

        this.info.isInitialized = true;
    }

    private simpleShader(shader: Shader, uniforms) {
        this.info.texture.use();
        this.info.spareTexture.drawTo(() => shader.uniforms(uniforms).drawRect());
        this.info.spareTexture.swapWith(this.info.texture);
    }
}

export { Vector2 } from './core/vector';
export { Matrix } from './core/matrix';