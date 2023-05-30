import esbuild from 'esbuild';
import {readFileSync} from "fs";
import { join } from "path";
import { replaceConstExports } from "./zod-file-replacer.mjs";
import {cwd} from "./utils.mjs";
const CWD = cwd(import.meta.url);
const BASE = join(CWD, '..');

(async () => {
    /** @type {import("esbuild").BuildOptions} */
    const config = {
        entryPoints: [join(BASE, 'src/autofill.js')],
        bundle: true,
        format: 'iife',
        legalComments: 'inline',
        outfile: join(BASE, 'dist/autofill.js'),
        metafile: true,
        loader: {
            // import css files as text
            '.css': 'text'
        },
        plugins: [zodReplacerPlugin()],
    };

    // regular build
    await esbuild.build(config);

    // now remove the zod plugin and build again,
    // this time to dist/autofill-debug.js
    config.plugins = [];
    config.outfile = 'dist/autofill-debug.js'
    await esbuild.build(config);

    // un-comment these lines to see the metafile output
    // console.log(await esbuild.analyzeMetafile(regularBuild.metafile))
    // console.log(await esbuild.analyzeMetafile(debugBuild.metafile))
})();

/**
 * This plugin is used to replace all of the `export const` lines
 * in the validators with `export const x = null;` This is done
 * to strip `zod` from the final build.
 */
function zodReplacerPlugin() {
    return {
        name: 'zod-replacers',
        setup(build) {
            build.onResolve({ filter: /\.zod\.js$/ }, args => {
                return {
                    path: args.path,
                    namespace: 'zod-replacers',
                    pluginData: {
                        resolveDir: args.resolveDir,
                    }
                };
            });
            build.onLoad({ filter: /.*/, namespace: 'zod-replacers' }, args => {
                const file = readFileSync(join(args.pluginData.resolveDir, args.path), 'utf-8');
                const replaced = replaceConstExports(file);
                return {
                    contents: replaced,
                    loader: 'js'
                }
            })
        }
    }
}
