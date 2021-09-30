#!/usr/bin/env node

const fs = require('fs')
const path = require('path');
const babel = require('@babel/core')
const getBabelConfig = require('./src/getBabelConfig')
const opts = getBabelConfig({ target: 'browser', type: 'esm' }).opts
const vfs = require("vinyl-fs")
const gulpIf = require('gulp-if')
const gulpLess = require('gulp-less')
const through = require('through2')
const yargs = require('yargs/yargs')
const hideBin = require('yargs/helpers').hideBin

const argv = yargs(hideBin(process.argv)).argv

const cwd = process.cwd()
const join = path.join
// const srcPath = join(cwd, "components");
const targetPath = join(cwd, 'esbabel');
var srcPath = join(cwd, argv.entry || 'src/components');
console.log(srcPath)

const babelTransformRegexp = /\.jsx?$/;

function isTransform(path) {
  return babelTransformRegexp.test(path);
}

const patterns = [
  join(srcPath, "**/*"),
  `!${join(srcPath, "**/fixtures{,/**}")}`,
  `!${join(srcPath, "**/demos{,/**}")}`,
  `!${join(srcPath, "**/__test__{,/**}")}`,
  `!${join(srcPath, "**/__tests__{,/**}")}`,
  `!${join(srcPath, "**/*.mdx")}`,
  `!${join(srcPath, "**/*.md")}`,
  `!${join(srcPath, "**/*.+(test|e2e|spec).+(js|jsx|ts|tsx)")}`,
  `!${join(srcPath, "**/tsconfig{,.*}.json")}`,
  `!${join(srcPath, "**/**stories.js")}`,
];

let lessInBabelMode = false

vfs.src(patterns, {
  allowEmpty: true,
  base: srcPath
})
// .pipe(
//   gulpIf(
//     f => lessInBabelMode && /\.less$/.test(f.path),
//     gulpLess(lessInBabelMode || {})
//   )
// )
.pipe(
  gulpIf(
    f => isTransform(f.path), 
    through.obj((file, env, cb) => {
      console.log(file.contents)
      try {
        // vfs.src 读取文件默认是buffer状态， 所以通过babel.transform转换后需要在转换成buffer
        file.contents = Buffer.from(
          babel.transform(file.contents, {
            ...opts,
            // filename: file.path,
            // 不读取外部的babel.config.js配置文件，全采用babelOpts中的babel配置来构建
            configFile: false,
          }).code
        );
        // .jsx -> .js
        file.path = file.path.replace(path.extname(file.path), ".js");
        cb(null, file);
      } catch (e) {
        // signale.error(`Compiled faild: ${file.path}`);
        console.error(`Compiled faild: ${file.path}`);
        cb(null);
      }
    })
  )
)
.pipe(vfs.dest(targetPath)); //写入文件
