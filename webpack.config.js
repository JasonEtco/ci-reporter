const path = require('path')

module.exports = {
  entry: ['babel-polyfill', './index.js'],
  target: 'node',
  module: {
    loaders: [{
      test: /\.js$/,
      loaders: ['babel-loader'],
      include: [
        __dirname
      ]
    }]
  },
  output: {
    libraryTarget: 'commonjs',
    path: path.join(__dirname, '.webpack'),
    filename: 'index.js'
  }
}
