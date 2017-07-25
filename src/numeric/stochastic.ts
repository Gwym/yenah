

export interface Randomizer {

}

export class RandomizerBase {

}

function* genPseudoRandom(seed = 1) {
  while (true) {
    let x = Math.sin(seed++) * 10000;
    yield x - Math.floor(x);
  }
}

// https://en.wikipedia.org/wiki/Marsaglia_polar_method

function* genGaussian(mean: number, stdDev: number, randomizer: () => number = Math.random) {
  let spare: number | undefined

  while (true) {
    if (spare !== undefined) {
      yield spare * stdDev + mean;
      spare = undefined;
    } else {
      let u, v, s;
      do {
        u = randomizer() * 2 - 1;
        v = randomizer() * 2 - 1;
        s = u * u + v * v;
      } while (s >= 1 || s == 0);
      let mul = Math.sqrt(-2 * Math.log(s) / s);
      spare = v * mul;
      yield mean + stdDev * u * mul;
    }
  }
}

async function testAsync(p: Promise<any>) {
  let r = await p;
}

export class PseudoRandomiser {

    // Normal (Gaussian) distribution
    // See: http://www.design.caltech.edu/erik/Misc/Gaussian.html
    randGauss(rand: () => number = Math.random): number {
        let x1: number;
        let x2: number;
        let rad: number;

        do {
            x1 = 2 * rand() - 1;
            x2 = 2 * rand() - 1;
            rad = x1 * x1 + x2 * x2;
        } while (rad >= 1 || rad === 0);

        let c = Math.sqrt(-2 * Math.log(rad) / rad);

        return x1 * c;
    } // randNorm
}


// https://github.com/yahiko00/RNG-Visualizer/blob/master/libs/randMersenne.ts
export class RandMersenne {
        seedInit: number;
        seed: number;

        // Mersenne Twister variables
        private N: number;
        private M: number;
        private MATRIX_A: number;
        private UPPER_MASK: number;
        private LOWER_MASK: number;
        private mt: number[];
        private mti: number;

        constructor(seed: number = Date.now()) {
            this.seedInit = seed;
            this.seed = seed;
            this.reset(seed);
        }

        // Mersenne Twister algorithm
        // See: https://gist.github.com/banksean/300494
        rand(): number {
            let y: number;
            let mag01 = new Array(0x0, this.MATRIX_A);
            /* mag01[x] = x * MATRIX_A for x=0,1 */

            if (this.mti >= this.N) { /* generate N words at one time */
                let kk: number;

                for (kk = 0; kk < this.N - this.M; kk++) {
                y = (this.mt[kk] & this.UPPER_MASK) | (this.mt[kk + 1] & this.LOWER_MASK);
                this.mt[kk] = this.mt[kk + this.M] ^ (y >>> 1) ^ mag01[y & 0x1];
                }
                for (; kk < this.N - 1; kk++) {
                y = (this.mt[kk] & this.UPPER_MASK) | (this.mt[kk + 1] & this.LOWER_MASK);
                this.mt[kk] = this.mt[kk + (this.M - this.N)] ^ (y >>> 1) ^ mag01[y & 0x1];
                }
                y = (this.mt[this.N - 1] & this.UPPER_MASK) | (this.mt[0] & this.LOWER_MASK);
                this.mt[this.N - 1] = this.mt[this.M - 1] ^ (y >>> 1) ^ mag01[y & 0x1];

                this.mti = 0;
            }

            y = this.mt[this.mti++];

            /* Tempering */
            y ^= (y >>> 11);
            y ^= (y << 7) & 0x9d2c5680;
            y ^= (y << 15) & 0xefc60000;
            y ^= (y >>> 18);

            return (y >>> 0) * (1.0 / 4294967295.0);
        } // rand

        reset(seed?: number) {
            this.seed = seed ? seed : this.seedInit;

            // Mersenne Twister initialization
            this.N = 624;
            this.M = 397;
            this.MATRIX_A = 0x9908b0df; /* constant vector a */
            this.UPPER_MASK = 0x80000000; /* most significant w-r bits */
            this.LOWER_MASK = 0x7fffffff; /* least significant r bits */
            this.mt = new Array(this.N); /* the array for the state vector */
            this.mti = this.N + 1; /* mti==N+1 means mt[N] is not initialized */

            /* initializes mt[N] with a seed */
            this.mt[0] = this.seed >>> 0;
            for (this.mti = 1; this.mti < this.N; this.mti++) {
                let s = this.mt[this.mti - 1] ^ (this.mt[this.mti - 1] >>> 30);
                this.mt[this.mti] = (((((s & 0xffff0000) >>> 16) * 1812433253) << 16) + (s & 0x0000ffff) * 1812433253)
                + this.mti;
                /* See Knuth TAOCP Vol2. 3rd Ed. P.106 for multiplier. */
                /* In the previous versions, MSBs of the seed affect */
                /* only MSBs of the array mt[]. */
                /* 2002/01/09 modified by Makoto Matsumoto */
                this.mt[this.mti] >>>= 0;
                /* for >32 bit machines */
            }
        } // reset
}