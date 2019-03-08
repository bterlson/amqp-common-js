// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// @ts-check

import nodeResolve from "rollup-plugin-node-resolve";
import multiEntry from "rollup-plugin-multi-entry";
import cjs from "rollup-plugin-commonjs";
import replace from "rollup-plugin-replace";
import { uglify } from "rollup-plugin-uglify";
import sourcemaps from "rollup-plugin-sourcemaps";

import path from "path";

const pkg = require("./package.json");
const depNames = Object.keys(pkg.dependencies);
const input = "dist-esm/lib/index.js";
const production = process.env.NODE_ENV === "production";

export function nodeConfig(test = false) {
  const externalNodeBuiltins = [
    'os', 'events', 'net', 'tls',
    'path', 'fs', 'url', 'util',
    'stream', 'punycode', 'http',
    'https', 'assert', 'crypto',
    'timers', 'string_decoder', 'zlib'];

  const baseConfig = {
    input: input,
    external: depNames.concat(externalNodeBuiltins),
    output: { file: "dist/index.js", format: "cjs", sourcemap: true },
    plugins: [
      sourcemaps(),
      replace({
        delimiters: ["", ""],
        values: {
          // replace dynamic checks with if (true) since this is for node only.
          // Allows rollup's dead code elimination to be more aggressive.
          "if (isNode)": "if (true)"
        }
      }),
      nodeResolve({ preferBuiltins: true }),
      cjs()
    ]
  };

  if (test) {
    // entry point is every test file
    baseConfig.input = "dist-esm/test/**/*.spec.js";
    baseConfig.plugins.unshift(multiEntry({ exports: false }));

    // different output file
    baseConfig.output.file = "test-dist/index.js";

    // mark assert as external
    baseConfig.external.push();

  } else if (production) {
    baseConfig.plugins.push(uglify());
  }

  return baseConfig;
}

export function browserConfig(test = false) {
  const baseConfig = {
    input: input,
    output: { file: "browser/index.js", format: "umd", name: "Azure.AMQPCommon", sourcemap: true },
    plugins: [
      sourcemaps(),
      replace(
        {
          delimiters: ["", ""],
          values: {
            // replace dynamic checks with if (false) since this is for
            // browser only. Rollup's dead code elimination will remove
            // any code guarded by if (isNode) { ... }
            "if (isNode)": "if (false)"
          }
        }
      ),
      nodeResolve({
        preferBuiltins: false,
        browser: true
      }),
      cjs()
    ]
  };

  if (test) {
    baseConfig.input = "dist-esm/test/**/*.spec.js";
    baseConfig.plugins.unshift(multiEntry({ exports: false }));
    baseConfig.output.file = "test-browser/index.js";
  } else if (production) {
    baseConfig.plugins.push(uglify());
  }

  return baseConfig;
}

