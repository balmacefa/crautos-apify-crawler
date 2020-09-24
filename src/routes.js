const Apify = require('apify');

const { utils: { log } } = Apify;


exports.handleStart = async ({ page }, requestQueue) => {
    // Handle Start URLs
    // Click the "buscar" button
    await Apify.utils.puppeteer.enqueueLinksByClickingElements({
        page,
        requestQueue,
        selector: 'input.btn-success',
        transformRequestFunction: request => {
            request.userData.label = 'LIST';
            request.useExtendedUniqueKey = true;
            request.noRetry = true;
            return request;
        }
    });
};

exports.handleList = async ({ page }, requestQueue) => {
    // Handle pagination

    const linksFromPage = await page.$$eval('form .inventory>a', links => {
        let hrefs = [];
        for (var i = 0; i < links.length; i++) {
            hrefs.push(links[i].href);
        }
        return hrefs;
    });

    for (let i = 0; i < linksFromPage.length; i++) {
        await requestQueue.addRequest({
            url: linksFromPage[i],
            userData: {
                label: "DETAIL"
            }
        });
    }

    //find the next page
    try {

        await page.$eval('.fa-angle-right', next => {
            next.parentElement.id = "NEXT_PAGE"
        });

        await Apify.utils.puppeteer.enqueueLinksByClickingElements({
            page,
            requestQueue,
            selector: '#NEXT_PAGE',
            transformRequestFunction: request => {
                request.userData.label = 'LIST';
                request.useExtendedUniqueKey = true;
                request.noRetry = true;
                return request;
            }
        });
    } catch (error) {
        log.info('End of the pages');
    }
};


exports.handleDetail = async ({ page, request }, requestQueue) => {
    // Handle details


    const data = await page.$eval('#geninfo table', table => {
        var data = {};

        //get first img

        for (var i = 1; i <= 15; i++) {
            //get the table info
            data[table.rows[i].cells[0].innerHTML.trim()] = table.rows[i].cells[1].innerHTML.trim();
        }

        data['visto'] = table.rows[16].cells[0].innerHTML.trim().match(/\d+/g).join('');

        data['detalles'] = table.rows[17].cells[0].innerHTML.trim();

        // sanatize Cicindrada and Kilometraje
        // Remove cc and ,
        data['Cilindrada'] = data['Cilindrada'].match(/\d+/g).join('');
        //remove KM and ,
        if (data['Kilometraje' !== 'ND']) {
            data['Kilometraje'] = data['Kilometraje'].match(/\d+/g).join('');
        }

        return data;
    });

    data['img'] = await page.$eval('#largepic', img => img.src);
    data['url'] = request.url;

    const dataHeader = await page.$$eval('h2', header => {

        //marcas
        const marcas = ["ACURA", "ALFA", "ROMEO", "AMC", "ARO", "ASIA", "ASTON", "MARTIN", "AUDI", "AUSTIN", "BAW", "BENTLEY", "BLUEBIRD", "BMW", "BRILLIANCE", "BUICK", "BYD", "CADILLAC", "CHANA", "CHANGAN", "CHERY", "CHEVROLET", "CHRYSLER", "CITROEN", "DACIA", "DAEWOO", "DAIHATSU", "DATSUN", "DODGE/RAM", "DODGE", "RAM", "DONFENG(ZNA)", "DONFENG", "ZNA", "EAGLE", "FAW", "FERRARI", "FIAT", "FORD", "FOTON", "FREIGHTLINER", "GEELY", "GENESIS", "GEO", "GMC", "GONOW", "GREAT", "WALL", "HAFEI", "HAIMA", "HEIBAO", "HIGER", "HINO", "HONDA", "HUMMER", "HYUNDAI", "INFINITI", "INTERNATIONAL", "ISUZU", "IVECO", "JAC", "JAGUAR", "JEEP", "JINBEI", "JMC", "JONWAY", "KENWORTH", "KIA", "LADA", "LAMBORGHINI", "LANCIA", "LAND", "ROVER", "LEXUS", "LIFAN", "LINCOLN", "LOTUS", "MACK", "MAGIRUZ", "MAHINDRA", "MASERATI", "MAZDA", "MERCEDES", "BENZ", "MERCURY", "MG", "MINI", "MITSUBISHI", "NISSAN", "OLDSMOBILE", "OPEL", "PETERBILT", "PEUGEOT", "PLYMOUTH", "POLARSUN", "PONTIAC", "PORSCHE", "PROTON", "RAMBLER", "RENAULT", "REVA", "ROLLS", "ROYCE", "ROVER", "SAAB", "SAMSUNG", "SATURN", "SCANIA", "SCION", "SEAT", "SKODA", "SMART", "SOUEAST", "SSANG", "YONG", "SUBARU", "SUZUKI", "TIANMA", "TIGER", "TRUCK", "TOYOTA", "VOLKSWAGEN", "VOLVO", "WESTERN", "STAR", "YUGO", "ZOTYE"];

        const data = {};

        const detalleAuto = header[0].innerText.toUpperCase().split('\n');

        data['año'] = detalleAuto[1];
        data['precioCRC'] = header[1].innerText.match(/\d+/g).join('');

        for (let i = 0; i < marcas.length; i++) {
            if (detalleAuto[0].includes(marcas[i])) {
                data['marca'] = marcas[i];
                data['modelo'] = detalleAuto[0].replace(data['marca'], '').trim();
                break;
            }
        }

        return data;
    });

    const saveData = { ...data, ...dataHeader };

    await Apify.pushData(saveData);
};
