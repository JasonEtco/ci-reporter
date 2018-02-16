const path = require('path')

module.exports = {
  entry: ['babel-polyfill', './src/index.js'],
  target: 'node',
  module: {
    rules: [{
      test: /\.js$/,
      use: {
        loader: 'babel-loader',
        options: {
          plugins: [
            ['transform-object-rest-spread', { useBuiltIns: true }]
          ]
        }
      }
    }]
  },
  output: {
    libraryTarget: 'commonjs',
    path: path.join(__dirname, 'dist'),
    filename: 'index.js'
  }
}
