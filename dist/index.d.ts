import type { AstroAdapter, AstroIntegration } from 'astro';
interface Options {
    port?: number;
    hostname?: string;
}
export declare function getAdapter(args?: Options): AstroAdapter;
export default function createIntegration(args?: Options): AstroIntegration;
export {};
