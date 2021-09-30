// import { extname } from 'path';
const join = require('path').join
const extname = require('path').extname

const cwd = process.cwd()
const babelConfPath = jion(cwd, '.babelrc')
const babelConf = require(babelConfPath)
consle.log(babelConf, 'custonBabelConf')

function transformImportLess2Css() {
  return {
      name: 'transform-import-less-to-css',
      visitor: {
          ImportDeclaration(path, source) {
              const re = /\.less$/;
              if(re.test(path.node.source.value)){
                path.node.source.value = path.node.source.value.replace(re, '.css');
              }
          }
      }
  }
}

module.exports = function(opts) {
  const { target, typescript, type= 'esm', runtimeHelpers = true, filePath, browserFiles, nodeFiles, nodeVersion, lazy, lessInBabelMode } = opts;
  let isBrowser = target === 'browser';
  if (filePath) {
    if (extname(filePath) === '.tsx' || extname(filePath) === '.jsx') {
      isBrowser = true;
    } else {
      if (isBrowser) {
        if (nodeFiles.includes(filePath)) isBrowser = false;
      } else {
        if (browserFiles.includes(filePath)) isBrowser = true;
      }
    }
  }
  const targets = isBrowser ? { browsers: ['last 2 versions', 'Firefox ESR', '> 1%', 'ie >= 11']} : { node: nodeVersion || 6 };

  return {
    opts: {
      presets: [
        ...(typescript ? [require.resolve('@babel/preset-typescript')] : []),
        [require.resolve('@babel/preset-env'), {
          targets,
          // "useBuiltIns": "usage",
          // "corejs": 3,
          modules: type === 'esm' ? false : 'auto'
        }],
        ...(isBrowser ? [require.resolve('@babel/preset-react')] : []),
      ],
      plugins: [
        ...((type === 'cjs' && lazy && !isBrowser)
          ? [[require.resolve('@babel/plugin-transform-modules-commonjs'), {
            lazy: true,
          }]]
          : []),
        ...(lessInBabelMode ? [transformImportLess2Css] : []),
        // https://cnpmjs.org/package/babel-plugin-react-require
        require.resolve('babel-plugin-react-require'),
        // https://blog.csdn.net/ixygj197875/article/details/79263912 支持动态import导入
        require.resolve('@babel/plugin-syntax-dynamic-import'),
        // 可以使用 export v from "mod";
        require.resolve('@babel/plugin-proposal-export-default-from'),
        // 其他提案级别的插件 https://babeljs.io/docs/en/babel-plugin-proposal-export-namespace-from
        // export * as ns from "mod";
        require.resolve('@babel/plugin-proposal-export-namespace-from'),
        require.resolve('@babel/plugin-proposal-do-expressions'),
        require.resolve('@babel/plugin-proposal-nullish-coalescing-operator'),
        require.resolve('@babel/plugin-proposal-optional-chaining'),
        [require.resolve('@babel/plugin-proposal-decorators'), { legacy: true }],
        ["import", 
          {
            "libraryName": "antd",
            "libraryDirectory": "es",
            "style": true // "css" // `style: true` 会加载 less 文件
          }, "antd"
        ],
        [
          "import",
          {
            "libraryName": "lodash",
            "libraryDirectory": "",
            "camel2DashComponentName": false
          }, "lodash"
        ],
        // [require.resolve('@babel/plugin-proposal-class-properties'), { loose: true }],
        ...(runtimeHelpers
          ? [[require.resolve('@babel/plugin-transform-runtime'), {
            useESModules: isBrowser && (type === 'esm'),
            version: require('@babel/runtime/package.json').version,
          }]]
          : []),
        ...(process.env.COVERAGE
            ? [require.resolve('babel-plugin-istanbul')]
            : []
        ),
        ...babelConf?.plugins
      ],
    },
    isBrowser,
  };
}
