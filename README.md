# Olli - Screen Reader Accessibility for Data Visualization

Olli is an open-source library for converting data visualizations into accessible text structures for screen reader users. Starting with an existing visualization specification created with a supported toolkit, Olli produces a keyboard-navigable tree view with descriptions at varying levels of detail. Users can explore these structures both to get an initial overview, and to dive into the data in more detail.

## Using Olli

For a [user tutorial](https://mitvis.github.io/olli/tutorial), [quickstart guide](https://mitvis.github.io/olli/quickstart), and [examples](https://mitvis.github.io/olli/examples), see the [Olli website](https://mitvis.github.io/olli/).

## Development instructions

- Fork and clone the `mitvis/olli` repository.
- In the `olli` directory, run `npm install` to install dependencies for all packages. We use [npm workspaces](https://docs.npmjs.com/cli/v8/using-npm/workspaces) to manage the two packages in this repo.
- In the `core` or `adapters` package directories, run `npm run start` to start the webpack bundler in development mode with live reloading. Run `npm run build` to run webpack for production. (Note: `olli` must be built before `olli-adapters` the first time you run the build scripts.)
- To run scripts for both packages at the same time, run commands from the `olli` directory using the `-ws` flag, e.g. `npm run build -ws`.

### Running the docsite locally

- The documentation site uses jekyll, and is served on github pages from the `docs/` folder. See more about jekyll and gh-pages [here](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/testing-your-github-pages-site-locally-with-jekyll).
- Run `bundle exec jekyll serve` to serve the page at `localhost:4000/olli`.

### Testing local changes on the docsite

- Make sure you have run `npm run start` in both `core` and `adapters` at least once. Ensure that `docs/olli` contains both `olli-dev.js` and `adapters-dev.js`.
- Run `npm run start` in the package(s) you are developing. This starts webpack in watch mode with the dev config.
- Run `bundle exec jekyll serve --livereload` to serve the page at `localhost:4000/olli`.
- Use the example gallery at `localhost:4000/olli/examples` to test changes locally. Changes to the source files will be live updated.

## Current Visualization Library Support

- [Vega](https://vega.github.io/vega/)
- [Vega-Lite](https://vega.github.io/vega-lite)
- [ObservablePlot](https://observablehq.com/@observablehq/plot)

## Related Links

- [Making data visualization more accessible for blind and low-vision individuals | MIT News](https://news.mit.edu/2022/data-visualization-accessible-blind-0602)
- [Rich Screen Reader Experiences for Accessible Data Visualization | MIT Visualization Group](http://vis.csail.mit.edu/pubs/rich-screen-reader-vis-experiences/)

## Reporting an Issue

If you encounter issues when using Olli, please [file an issue on GitHub](https://github.com/mitvis/olli/issues). Please include enough information to reproduce the issue. For example, if the issue is a bug with a chart that Olli should support with one of its adapters, please include the spec and dataset for the chart. For accessibility issues, please share what browser and screen reader you are using.

## Contributions, Development, and Support

Interested in contributing to Olli? Please see our [contribution and development guidelines](https://github.com/mitvis/olli/blob/main/CONTRIBUTING.md), and our [code of conduct](https://vega.github.io/vega/about/code-of-conduct/).

Olli was originally created by [Matt Blanco](https://mattblanco.me/) and the library is maintained by the [MIT Visualization Group](http://vis.csail.mit.edu/).
