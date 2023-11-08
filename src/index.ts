import {Quad, Matrix} from './core/matrix';
import {Texture} from './core/texture';
import {MatrixShader} from './core/shader';

interface Source {
    canvas: HTMLCanvasElement;

    a: Quad;
    b: Quad;
}

export class PerspectiveRenderer {
    private sources: Source[] = [];
    private frame: HTMLCanvasElement;
    private target: HTMLCanvasElement;

    public width: number;
    public height: number;

    private texture: Texture;
    private shader: MatrixShader;

    private gl: WebGLRenderingContext;
    private ctx: CanvasRenderingContext2D;

    constructor(canvas: HTMLCanvasElement, width: number, height: number) {
        this.width = width;
        this.height = height;

        this.setTarget(canvas);

        this.frame = document.createElement('canvas');
        this.initialize();
    }

    public clearSources() {
        this.sources = [];
    }

    public addSource(canvas: HTMLCanvasElement, a: Quad, b: Quad) {
        const source = {
            canvas,

            a,
            b,
        };

        this.sources.push(source);
        return source;
    }

    public setTarget(canvas: HTMLCanvasElement) {
        this.target = canvas;
        this.ctx = canvas.getContext('2d');
    }

    public getTarget() {
        return this.target;
    }

    public render() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        for (const source of this.sources) {
            this.gl.clearColor(1, 0, 0, 0);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT);

            this.texture.loadContentsOf(source.canvas);
            this.perspective(source);

            this.ctx.drawImage(this.frame, 0, 0);
        }
    }

    private initialize() {
        this.gl = this.frame.getContext('experimental-webgl', { premultipliedAlpha: false }) as WebGLRenderingContext;
        if (!this.gl) throw new Error('This browser does not support WebGL');

        this.frame.width = this.width;
        this.frame.height = this.height;

        this.shader = new MatrixShader(this.gl);
        this.texture = new Texture(this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.gl);
    }

    perspective(source: Source) {
        const a = Matrix.getSquareToQuad(source.a);
        const b = Matrix.getSquareToQuad(source.b);
        const c = Matrix.multiply(b.inverse, a);

        const uniforms = {
            matrix: c.data.flat(),
            texSize: [source.canvas.width, source.canvas.height],
            canvasSize: [this.width, this.height],
        };

        this.gl.viewport(0, 0, this.width, this.height);

        this.texture.use();
        this.shader.uniforms(uniforms).drawRect();
    }

    destroy() {
        this.shader.destroy();
        this.texture.destroy();

        this.gl = null;
        this.ctx = null;

        this.frame = null;
        this.target = null;

        this.sources = [];
    }
}

export { Vector2 } from './core/vector';
export { Matrix } from './core/matrix';