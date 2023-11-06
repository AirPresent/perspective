import {Matrix, Quad} from '../../core/matrix';

export function perspective(before: Quad, after: Quad, gl: WebGLRenderingContext) {
    const a = Matrix.getSquareToQuad(after);
    const b = Matrix.getSquareToQuad(before);

    const c = Matrix.multiply(a.inverse, b);
    return this.matrixWarp(c, gl);
}