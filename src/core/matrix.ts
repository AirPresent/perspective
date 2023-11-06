import {Vector2} from './vector';
export type Quad = [Vector2, Vector2, Vector2, Vector2];

export class Matrix {
    public size: Vector2;
    public data: number[];

    public static M2x2 = new Vector2(2, 2);
    public static M3x3 = new Vector2(3, 3);
    public static M4x4 = new Vector2(4, 4);

    constructor(size: Vector2, data?: number[]) {
        this.size = size;
        this.data = data || new Array(size.x * size.y).fill(0);
    }

    public static getSquareToQuad(quad: Quad) {
        const [v0, v1, v2, v3] = quad;

        const d1 = v1.sub(v2);
        const d2 = v3.sub(v2);
        const d3 = v0.sub(v1).add(v2.sub(v3));

        const det = d1.determinant(d2);

        const a = d3.determinant(d2) / det;
        const b = d1.determinant(d3) / det;

        const x0 = v0.x;
        const y0 = v0.y;

        const A = v1.mult(a + 1).sub(v0);
        const B = v3.mult(b + 1).sub(v0);

        const M = [
            ...A.toArray(), a,
            ...B.toArray(), b,
            x0,     y0,     1,
        ]; // 3x3 matrix

        return new Matrix(Matrix.M3x3, M);
    }

    public get inverse() {
        if (!this.size.equals(Matrix.M3x3)) throw new Error('Only 3x3 matrices are supported');

        const m = this.data;
        const [a, b, c, d, e, f, g, h, i] = m;

        const det = a*e*i - a*f*h - b*d*i + b*f*g + c*d*h - c*e*g;
        const M = [
            (e*i - f*h) / det, (c*h - b*i) / det, (b*f - c*e) / det,
            (f*g - d*i) / det, (a*i - c*g) / det, (c*d - a*f) / det,
            (d*h - e*g) / det, (b*g - a*h) / det, (a*e - b*d) / det
        ];

        return new Matrix(Matrix.M3x3, M);
    }

    public static multiply(A, B) {
        if (!A.size.equals(Matrix.M3x3) || !B.size.equals(Matrix.M3x3)) throw new Error('Only 3x3 matrices are supported');

        const a = A.data;
        const b = B.data;

        const M = [
            a[0]*b[0] + a[1]*b[3] + a[2]*b[6],
            a[0]*b[1] + a[1]*b[4] + a[2]*b[7],
            a[0]*b[2] + a[1]*b[5] + a[2]*b[8],

            a[3]*b[0] + a[4]*b[3] + a[5]*b[6],
            a[3]*b[1] + a[4]*b[4] + a[5]*b[7],
            a[3]*b[2] + a[4]*b[5] + a[5]*b[8],

            a[6]*b[0] + a[7]*b[3] + a[8]*b[6],
            a[6]*b[1] + a[7]*b[4] + a[8]*b[7],
            a[6]*b[2] + a[7]*b[5] + a[8]*b[8]
        ];

        return new Matrix(Matrix.M3x3, M);
    }
}