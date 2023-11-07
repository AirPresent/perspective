export class Vector2 {
    public x: number;
    public y: number;
    constructor(x: number, y: number) {
        this.x = x; this.y = y;
    }

    public sub(b: Vector2) {
        return new Vector2(this.x - b.x, this.y - b.y);
    }

    public add(b: Vector2) {
        return new Vector2(this.x + b.x, this.y + b.y);
    }

    public mult(b: number) {
        return new Vector2(this.x * b, this.y * b);
    }

    public determinant(b: Vector2) {
        return this.x*b.y - b.x*this.y;
    }

    public length() {
        return Math.sqrt(this.x*this.x + this.y*this.y);
    }

    public equals(b: Vector2) {
        return this.x === b.x && this.y === b.y;
    }

    public toArray() {
        return [this.x, this.y];
    }
}