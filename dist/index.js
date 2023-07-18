import esbuild from "esbuild";
import * as fs from "fs";
import * as npath from "path";
import { fileURLToPath } from "url";
const SHIM = `globalThis.process = {
	argv: [],
	env: Deno.env.toObject(),
};`;
const DENO_VERSION = `0.177.0`;
const COMPATIBLE_NODE_MODULES = [
  "assert",
  "assert/strict",
  "async_hooks",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "constants",
  "crypto",
  "dgram",
  "diagnostics_channel",
  "dns",
  "events",
  "fs",
  "fs/promises",
  "http",
  // 'http2',
  "https",
  "inspector",
  "module",
  "net",
  "os",
  "path",
  "path/posix",
  "path/win32",
  "perf_hooks",
  "process",
  "punycode",
  "querystring",
  "readline",
  "repl",
  "stream",
  "stream/promises",
  "stream/web",
  "string_decoder",
  "sys",
  "timers",
  "timers/promises",
  // 'tls',
  "trace_events",
  "tty",
  "url",
  "util",
  "util/types",
  // 'v8',
  // 'vm',
  // 'wasi',
  // 'webcrypto',
  "worker_threads",
  "zlib",
];
const DENO_IMPORTS_SHIM = `@astrojs/deno/__deno_imports.js`;
const DENO_IMPORTS =
  `export { Server } from "https://deno.land/std@${DENO_VERSION}/http/server.ts"
export { serveFile } from 'https://deno.land/std@${DENO_VERSION}/http/file_server.ts';
export { fromFileUrl } from "https://deno.land/std@${DENO_VERSION}/path/mod.ts";`;
function getAdapter(args) {
  return {
    name: "@astrojs/deno",
    serverEntrypoint: "@astrojs/deno/server.js",
    args: args ?? {},
    exports: ["stop", "handle", "start", "running"],
  };
}
const denoImportsShimPlugin = {
  name: "@astrojs/deno:shim",
  setup(build) {
    build.onLoad({ filter: /__deno_imports\.js$/ }, async (args) => {
      return {
        contents: DENO_IMPORTS,
        loader: "js",
      };
    });
  },
};
const denoRenameNodeModulesPlugin = {
  name: "@astrojs/esbuild-rename-node-modules",
  setup(build) {
    const filter = new RegExp(
      COMPATIBLE_NODE_MODULES.map((mod) => `(^${mod}$)`).join("|"),
    );
    build.onResolve(
      { filter },
      (args) => ({ path: "node:" + args.path, external: true }),
    );
  },
};
function createIntegration(args) {
  let _buildConfig;
  let _vite;
  return {
    name: "@astrojs/deno",
    hooks: {
      "astro:config:done": ({ setAdapter, config }) => {
        setAdapter(getAdapter(args));
        _buildConfig = config.build;
        if (config.output === "static") {
          console.warn(
            `[@astrojs/deno] \`output: "server"\` or \`output: "hybrid"\` is required to use this adapter.`,
          );
          console.warn(
            `[@astrojs/deno] Otherwise, this adapter is not required to deploy a static site to Deno.`,
          );
        }
      },
      "astro:build:setup": ({ vite, target }) => {
        if (target === "server") {
          _vite = vite;
          vite.resolve = vite.resolve ?? {};
          vite.resolve.alias = vite.resolve.alias ?? {};
          vite.build = vite.build ?? {};
          vite.build.rollupOptions = vite.build.rollupOptions ?? {};
          vite.build.rollupOptions.external =
            vite.build.rollupOptions.external ?? [];
          const aliases = [{
            find: "react-dom/server",
            replacement: "react-dom/server.browser",
          }];
          if (Array.isArray(vite.resolve.alias)) {
            vite.resolve.alias = [...vite.resolve.alias, ...aliases];
          } else {
            for (const alias of aliases) {
              vite.resolve.alias[alias.find] = alias.replacement;
            }
          }
          vite.ssr = {
            noExternal: COMPATIBLE_NODE_MODULES,
          };
          if (Array.isArray(vite.build.rollupOptions.external)) {
            vite.build.rollupOptions.external.push(DENO_IMPORTS_SHIM);
          } else if (typeof vite.build.rollupOptions.external !== "function") {
            vite.build.rollupOptions.external = [
              vite.build.rollupOptions.external,
              DENO_IMPORTS_SHIM,
            ];
          }
        }
      },
      "astro:build:done": async () => {
        var _a, _b, _c;
        const entryUrl = new URL(_buildConfig.serverEntry, _buildConfig.server);
        const pth = fileURLToPath(entryUrl);
        await esbuild.build({
          target: "esnext",
          platform: "browser",
          entryPoints: [pth],
          outfile: pth,
          allowOverwrite: true,
          format: "esm",
          bundle: true,
          external: [
            ...COMPATIBLE_NODE_MODULES.map((mod) => `node:${mod}`),
            "@astrojs/markdown-remark",
          ],
          plugins: [denoImportsShimPlugin, denoRenameNodeModulesPlugin],
          banner: {
            js: SHIM,
          },
        });
        try {
          const chunkFileNames =
            ((_c = (_b = (_a = _vite == null ? void 0 : _vite.build) == null
                  ? void 0
                  : _a.rollupOptions) == null
                ? void 0
                : _b.output) == null
              ? void 0
              : _c.chunkFileNames) ?? `chunks/chunk.[hash].mjs`;
          const chunkPath = npath.dirname(chunkFileNames);
          const chunksDirUrl = new URL(chunkPath + "/", _buildConfig.server);
          await fs.promises.rm(chunksDirUrl, { recursive: true, force: true });
        } catch {
        }
      },
    },
  };
}
export { createIntegration as default, getAdapter };
