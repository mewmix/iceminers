const path = require("path"); //  REQUIRED for path resolution
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: "./src/main.ts",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"), //  Uses 'path' correctly
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "index.html", //  Ensures index.html is copied to dist/
      favicon: "public/favicon.ico", // Optional: Ensures favicon is available
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, "dist"), //  Serves from the correct folder
    },
    compress: true,
    port: 8080,
    hot: true, // Enables HMR (Hot Module Replacement)
  },
};

