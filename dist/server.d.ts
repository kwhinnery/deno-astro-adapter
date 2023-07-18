import type { SSRManifest } from 'astro';
interface Options {
    port?: number;
    hostname?: string;
    start?: boolean;
}
export declare function start(manifest: SSRManifest, options: Options): void;
export declare function createExports(manifest: SSRManifest, options: Options): {
    stop(): Promise<void>;
    running(): boolean;
    start(): Promise<void>;
    handle(request: Request): Promise<Response>;
};
export {};
