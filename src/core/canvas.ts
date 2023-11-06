import {Shader} from './shader';
import {Texture} from './texture';

function initialize(width, height) {
    const info = canvasData.get(this);
    if (!info) throw new Error('Canvas is not initialized');

    let type = info.gl.UNSIGNED_BYTE;

    // Go for floating point buffer textures if we can, it'll make the bokeh
    // filter look a lot better. Note that on Windows, ANGLE does not let you
    // render to a floating-point texture when linear filtering is enabled.
    // See https://crbug.com/172278 for more information.
    if (info.gl.getExtension('OES_texture_float') && info.gl.getExtension('OES_texture_float_linear')) {
        const testTexture = new Texture(100, 100, info.gl.RGBA, info.gl.FLOAT, info.gl);
        try {
            // Only use gl.FLOAT if we can render to it
            testTexture.drawTo(() => type = info.gl.FLOAT);
        } catch (e) {}
        testTexture.destroy();
    }

    if (info.texture) info.texture.destroy();
    if (info.spareTexture) info.spareTexture.destroy();

    this.width = width;
    this.height = height;

    info.texture = new Texture(width, height, info.gl.RGBA, type, info.gl);
    info.spareTexture = new Texture(width, height, info.gl.RGBA, type, info.gl);

    info.extraTexture = info.extraTexture || new Texture(0, 0, info.gl.RGBA, type, info.gl);
    info.flippedShader = info.flippedShader || new Shader(null, '\
        uniform sampler2D texture;\
        varying vec2 texCoord;\
        void main() {\
            gl_FragColor = texture2D(texture, vec2(texCoord.x, 1.0 - texCoord.y));\
        }\
    ', info.gl);

    info.isInitialized = true;
}

/*
   Draw a texture to the canvas, with an optional width and height to scale to.
   If no width and height are given then the original texture width and height
   are used.
*/
function draw(texture: Texture | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement, gl: WebGLRenderingContext, width?: number, height?: number) {
    if (!(texture instanceof Texture)) return draw.call(this, Texture.fromElement(texture, gl), gl, width, height);

    const info = canvasData.get(this);
    if (!info) throw new Error('Canvas is not initialized');

    if (!info.isInitialized || texture.width != this.width || texture.height != this.height)
        initialize.call(this, width ?? texture.width, height ?? texture.height);

    texture.use();
    info.texture.drawTo(() => Shader.getDefaultShader(gl).drawRect());

    return this;
}

function update() {
    const info = canvasData.get(this);
    if (!info) throw new Error('Canvas is not initialized');

    info.texture.use();
    info.flippedShader.drawRect();
    return this;
}

export function simpleShader(shader, uniforms, textureIn, textureOut) {
    const info = canvasData.get(this);
    if (!info) throw new Error('Canvas is not initialized');

    (textureIn || info.texture).use();
    info.spareTexture.drawTo(() => shader.uniforms(uniforms).drawRect());
    info.spareTexture.swapWith(textureOut || this._.texture);
}

const canvasData = new WeakMap<HTMLCanvasElement, any>();
export function canvas() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('experimental-webgl', { premultipliedAlpha: false });
    if (!gl) throw new Error('This browser does not support WebGL');

    canvasData.set(canvas, {
        gl: gl,
        isInitialized: false,
        texture: null,
        spareTexture: null,
        flippedShader: null
    });

    return canvas;
}

// function runPerspective() {
//     const a = [175,156,496,55,161,279,504,330];
//     const b = [197,146,496,55,198,241,504,330];
//
//     canvas
//         .draw(texture)
//         .perspective(
//             a,
//             b
//         )
//         .update();
// }