import babel from '@rollup/plugin-babel'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import vuePlugin from 'rollup-plugin-vue'
import postcss from 'rollup-plugin-postcss'
// import json from '@rollup/plugin-json'
// import RollupPluginNodePolyfills from 'rollup-plugin-node-polyfills'
// import { uglify } from 'rollup-plugin-uglify'

// './src/common/utils/base-request.js'
export default {
  input: './src/base-request.js',
  // input: './src/user/utils/request.js',
  output: {
    file: 'lib/request.umd.js',
    // file: 'lib/user-request.umd.js',
    format: 'umd',
    name: 'request'
  },
  external: ['axios'],
  paths: {
    'axios': 'https://cdn.bootcdn.net/ajax/libs/axios/0.26.0/axios.min.js'
  },
  plugins: [
    // RollupPluginNodePolyfills(),
    resolve({ extensions: ['.vue'] }),
    commonjs(),
    vuePlugin(),
    // json(),
    // uglify(),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**'
    }),
    postcss({
      extensions: ['.css', '.sass'],
      extract: 'index.css'
    })
  ]
}

