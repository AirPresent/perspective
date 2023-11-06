import {warpShader} from '../common';
import {Matrix} from '../../core/matrix';
import {simpleShader} from '../../core/canvas';

const matrixWarps = new WeakMap<WebGLRenderingContext, WebGLShader>();
export function matrixWarp(matrix: Matrix, gl: WebGLRenderingContext) {
    let matrixWarpShader = matrixWarps.get(gl);
    if (!matrixWarpShader) {
        matrixWarpShader = warpShader('\
        uniform mat3 matrix;\
        uniform bool useTextureSpace;\
    ', '\
        if (useTextureSpace) coord = coord / texSize * 2.0 - 1.0;\
        vec3 warp = matrix * vec3(coord, 1.0);\
        coord = warp.xy / warp.z;\
        if (useTextureSpace) coord = (coord * 0.5 + 0.5) * texSize;\
    ', gl);
        matrixWarps.set(gl, matrixWarpShader);
    }

    // Flatten all members of matrix into one big list
    let m = matrix.data.flat();

    // Extract a 3x3 matrix out of the arguments
    if (m.length == 4) {
        m = [
            m[0], m[1], 0,
            m[2], m[3], 0,
            0,    0,    1
        ];
    }
    if (m.length != 9) throw 'can only warp with 2x2 or 3x3 matrix';

    simpleShader.call(this, matrixWarpShader, {
        matrix: m,
        texSize: [this.width, this.height],
        useTextureSpace: 0
    });

    return this;
}
