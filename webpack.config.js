const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const RollbarSourceMapPlugin = require('rollbar-sourcemap-webpack-plugin');
const terser = require('terser');
const fs = require('fs');
const pkg = require('./package.json');

const isDev = (process.env.NODE_ENV === 'development');
const isTest = (process.env.NODE_ENV === 'test');
const isProd = (process.env.NODE_ENV === 'production');

const VERSION = pkg.version;
const ROLLBAR_POST_TOKEN = '7e29ff3610ab407f826307c8f5ad386f';

// Enzyme as of v2.4.1 has trouble with classes
// that do not start and *end* with an alpha character
// but that will sometimes happen with the base64 hashes
// so we leave them off in the test env
const localIdentName = process.env.NODE_ENV === 'test'
  ? '[name]--[local]'
  : '[name]--[local]--[hash:base64:5]';

const styleLoaderConfiguration = {
  test: /\.less$/,
  use: [
    (isDev || isTest) ? 'style-loader' : MiniCssExtractPlugin.loader,
    {
      loader: 'css-loader',
      query: {
        importLoaders: 2,
        localIdentName,
        sourceMap: isDev,
      },
    },
    {
      loader: 'postcss-loader',
      options: {
        sourceMap: isDev,
      },
    },
    {
      loader: 'less-loader',
      options: {
        sourceMap: isDev,
        javascriptEnabled: true,
      },
    },
  ],
};

const babelLoaderConfiguration = [
  {
    test: /\.js$/,
    exclude: function(modulePath) {
      return /node_modules/.test(modulePath) && !/node_modules\/(tideline|tidepool-platform-client)/.test(modulePath);
    },
    use: {
      loader: 'babel-loader',
      options: {
        cacheDirectory: true,
      },
    },
  },
  {
    test: /\.js?$/,
    include: [
      fs.realpathSync('./node_modules/@tidepool/viz'),
    ],
    use: {
      loader: 'source-map-loader',
    },
  },
];

// This is needed for webpack to import static images in JavaScript files
const imageLoaderConfiguration = {
  test: /\.(gif|jpe?g|png|svg)$/,
  use: {
    loader: 'url-loader',
    options: {
      name: '[name].[ext]',
    },
  },
};

const fontLoaderConfiguration = [
  {
    test: /\.eot$/,
    use: {
      loader: 'url-loader',
      query: {
        limit: 10000,
        mimetype: 'application/vnd.ms-fontobject',
      },
    },
  },
  {
    test: /\.woff$/,
    use: {
      loader: 'url-loader',
      query: {
        limit: 10000,
        mimetype: 'application/font-woff',
      },
    },
  },
  {
    test: /\.ttf$/,
    use: {
      loader: 'url-loader',
      query: {
        limit: 10000,
        mimetype: 'application/octet-stream',
      },
    },
  },
];

const plugins = [
  // these values are required in the config.app.js file -- we can't use
  // process.env with webpack, we have to create these magic constants
  // individually.
  new webpack.DefinePlugin({
    'process.env': {
      'NODE_ENV': isDev ? JSON.stringify('development') : JSON.stringify('production'),
    },
    __UPLOAD_API__: JSON.stringify(process.env.UPLOAD_API || null),
    __API_HOST__: JSON.stringify(process.env.API_HOST || null),
    __INVITE_KEY__: JSON.stringify(process.env.INVITE_KEY || null),
    __LATEST_TERMS__: JSON.stringify(process.env.LATEST_TERMS || null),
    __PASSWORD_MIN_LENGTH__: JSON.stringify(process.env.PASSWORD_MIN_LENGTH || null),
    __PASSWORD_MAX_LENGTH__: JSON.stringify(process.env.PASSWORD_MAX_LENGTH || null),
    __ABOUT_MAX_LENGTH__: JSON.stringify(process.env.ABOUT_MAX_LENGTH || null),
    __I18N_ENABLED__: JSON.stringify(process.env.I18N_ENABLED || false),
    __VERSION__: JSON.stringify(VERSION),
    __ROLLBAR_POST_TOKEN__: JSON.stringify(ROLLBAR_POST_TOKEN),
    __DEV__: isDev,
    __TEST__: isTest,
    __PROD__: isProd,
    __DEV_TOOLS__: (process.env.DEV_TOOLS != null) ? process.env.DEV_TOOLS : (isDev ? true : false) //eslint-disable-line eqeqeq
  }),
  new MiniCssExtractPlugin({
    filename: isDev ? 'style.css' : 'style.[contenthash].css',
  }),
  new CopyWebpackPlugin([
    {
      from: 'static',
      transform: (content, path) => {
        if (isDev) {
         return content;
        }

        const code = fs.readFileSync(path, 'utf8');
        const result = terser.minify(code);
        return result.code;
      }
    }
  ]),
  new HtmlWebpackPlugin({
    template: 'index.ejs',
    favicon: 'favicon.ico',
  }),
];

if (isDev) {
  plugins.push(new webpack.HotModuleReplacementPlugin());
} else if (isProd) {
  plugins.push(
    /** Upload sourcemap to Rollbar */
    new RollbarSourceMapPlugin({
      accessToken: ROLLBAR_POST_TOKEN,
      version: VERSION,
      publicPath: 'http://dynamichost/dist',
    })
  );
}

const devPublicPath = process.env.WEBPACK_PUBLIC_PATH || 'http://localhost:3000/';

const entry = isDev
  ? [
    '@babel/polyfill',
    'webpack-dev-server/client?' + devPublicPath,
    'webpack/hot/only-dev-server',
    './app/main.js',
  ] : [
    '@babel/polyfill',
    './app/main.prod.js',
  ];

const output = {
  filename: 'bundle.js',
  path: path.join(__dirname, '/dist'),
  publicPath: isDev ? devPublicPath : '/',
  globalObject: `(typeof self !== 'undefined' ? self : this)`, // eslint-disable-line quotes
};

const resolve = {
  modules: [
    path.join(__dirname, 'node_modules'),
    'node_modules',
  ],
};

let devtool = process.env.WEBPACK_DEVTOOL || 'eval-source-map';
if (process.env.WEBPACK_DEVTOOL === false) devtool = undefined;

module.exports = {
  devServer: {
    publicPath: output.publicPath,
    historyApiFallback: true,
    hot: isDev,
    clientLogLevel: 'info',
  },
  devtool,
  entry,
  mode: isDev ? 'development' : 'production',
  module: {
    rules: [
      ...babelLoaderConfiguration,
      imageLoaderConfiguration,
      styleLoaderConfiguration,
      ...fontLoaderConfiguration,
    ],
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        styles: {
          name: 'styles',
          test: /\.css$/,
          chunks: 'all',
          enforce: true
        }
      }
    },
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          output: { comments: false },
          compress: {
            inline: false,
            conditionals: false,
          }
        }
      }),
      new OptimizeCSSAssetsPlugin({}),
    ],
  },
  output,
  plugins,
  resolve,
  resolveLoader: resolve,
  cache: isDev,
  watchOptions: {
    ignored: [
      /node_modules([\\]+|\/)+(?!(tideline|tidepool-platform-client|@tidepool\/viz))/,
      /(tideline|tidepool-platform-client|@tidepool\/viz)([\\]+|\/)node_modules/
    ]
  },
};
