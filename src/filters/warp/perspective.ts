import {Matrix, Quad} from '../../core/matrix';
import {PerspectiveRenderer} from '../../index';
import {matrixWarp} from './matrixwarp';

export function perspective(before: Quad, after: Quad, renderer: PerspectiveRenderer) {
    const a = Matrix.getSquareToQuad(after);
    const b = Matrix.getSquareToQuad(before);

    const c = Matrix.multiply(a.inverse, b);
    matrixWarp(c, renderer);
}