const path = require('path')

module.exports = {
  entry: ['babel-polyfill', './functions/src/index.js'],
  target: 'node',
  module: {
    rules: [{
      test: /\.js$/,
      include: [
        __dirname
      ],
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['babel-preset-es2015'],
          plugins: [
            'transform-async-to-generator',
            [
              'transform-object-rest-spread',
              { useBuiltIns: true }
            ]
          ]
        }
      }
    }]
  },
  output: {
    library: 'bot',
    libraryTarget: 'commonjs',
    path: path.join(__dirname, 'functions', 'dist'),
    filename: 'index.js'
  }
}
