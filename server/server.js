import Express from 'express';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { renderStylesToString } from 'emotion-server';
import initReactivesearch from '@appbaseio/reactivesearch/lib/server';
import { DataSearch, ReactiveList } from '@appbaseio/reactivesearch';

import App from '../common/App';
import BookCard from '../common/BookCard';

// settings for the ReactiveBase component
const settings = {
	app: 'good-books-ds',
	credentials: 'nY6NNTZZ6:27b76b9f-18ea-456c-bc5e-3a5263ebc63d',
};

// props for ReactiveSearch components
// we need these to run the query and get the results server side
const searchInputProps = {
	componentId: 'SearchSensor',
	dataField: ['original_title'],
	placeholder: 'Search...',
	URLParams: true,
};

const reactiveListProps = {
	componentId: 'SearchResult',
	dataField: 'original_title.raw',
	from: 0,
	size: 10,
	renderData: data => <BookCard key={data._id} data={data} />,
	react: {
		and: ['q'],
	},
};

const app = Express();
const port = 5000;

// Serve static files
// Since we're passing all requests to same handleRenderer
// We need to serve the bundle.js as it is
// Alternatively you can define your own set of routes
app.use('/dist', Express.static('dist'));

function renderFullPage(html, preloadedState) {
	return `
		<!doctype html>
		<html>
		<head>
			<title>ReactiveSearch SSR Example</title>
		</head>
		<body>
			<div id="root">${html}</div>
			<script>
				window.__PRELOADED_STATE__ = ${JSON.stringify(preloadedState)}
			</script>
			<script src="dist/bundle.js"></script>
		</body>
		</html>
    `;
}

async function handleRender(req, res) {
	// Create a new store instance and wait for results
	const store = await initReactivesearch(
		[
			{
				...searchInputProps,
				type: 'DataSearch',
				source: DataSearch,
			},
			{
				...reactiveListProps,
				type: 'ReactiveList',
				source: ReactiveList,
			},
		],
		{
			SearchSensor: 'mouse',
		},
		settings,
	);

	console.log('searchStore', store);

	// Render the component to a string
	// renderStylesToString is from emotion
	// ReactiveSearch uses emotion and this will inline the styles
	// so you can get the correct styles for ReactiveSearch's components
	// on the first load
	const html = renderStylesToString(
		renderToString(
			<App
				store={store}
				settings={settings}
				searchInputProps={searchInputProps}
				reactiveListProps={reactiveListProps}
			/>,
		),
	);

	// Send the rendered page back to the client
	res.send(renderFullPage(html, store));
}

// This is fired every time the server side receives a request
app.use(handleRender);
app.listen(port, (error) => {
	if (error) {
		console.error(error);
	} else {
		// eslint-disable-next-line
		console.info(
			`==> 🌎  Listening on port ${port}. Open up http://localhost:${port}/ in your browser.`,
		);
	}
});
