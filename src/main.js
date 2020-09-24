/**
 * This template is a production ready boilerplate for developing with `CheerioCrawler`.
 * Use this to bootstrap your projects using the most up-to-date code.
 * If you're looking for examples or want to learn more, see README.
 */

const Apify = require('apify');
const { handleStart, handleList, handleDetail } = require('./routes');

const { utils: { log } } = Apify;

Apify.main(async () => {
    const baseUrl = 'https://crautos.com/autosusados/';

    const requestQueue = await Apify.openRequestQueue();
    await requestQueue.addRequest({url:baseUrl});

    let detailCount = 1;
    let listCount = 1;

    const crawler = new Apify.PuppeteerCrawler({
        requestQueue,
        useSessionPool: true,
        persistCookiesPerSession: true,
        // Be nice to the websites.
        // Remove to unleash full power.
        maxConcurrency: 50,
        // Increase the timeout for processing of each page.
        handlePageTimeoutSecs: 30,
        // Limit to 10 requests per one crawl
        maxRequestsPerCrawl: 4,

        handlePageFunction: async (puppePageInput) => {
            const { url, userData: { label } } = puppePageInput.request;
            switch (label) {
                case 'LIST':
                    log.info(`Page opened - ${label} - #${listCount++}`, { label, url });
                    return handleList(puppePageInput, requestQueue, baseUrl);
                case 'DETAIL':
                    log.info(`Page opened - ${label} - #${detailCount++}`, { label, url });
                    return handleDetail(puppePageInput, requestQueue, baseUrl);
                default:
                    return handleStart(puppePageInput, requestQueue, baseUrl);
            }
        },
    });

    log.info('Starting the crawl.');
    await crawler.run();
    log.info('Crawl finished.');
});
