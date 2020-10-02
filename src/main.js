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
    const proxyConfiguration = await Apify.createProxyConfiguration();


    let detailCount = 1;
    let listCount = 1;

    const crawler = new Apify.PuppeteerCrawler({
        requestQueue,
        proxyConfiguration,
        useSessionPool: true,
        persistCookiesPerSession: true,
        launchPuppeteerOptions: {
            // Chrome with stealth should work for most websites.
            // If it doesn't, feel free to remove this.
            useChrome: true,
            stealth: true,
        },
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
