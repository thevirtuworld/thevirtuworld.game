declare module 'simplex-noise' {
  export default class SimplexNoise {
    constructor(seed?: string | number);
    noise2D(x: number, y: number): number;
    noise3D(x: number, y: number, z: number): number;
    noise4D(x: number, y: number, z: number, w: number): number;
  }
}
