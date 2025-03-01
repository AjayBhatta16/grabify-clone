let puppeteer = require('puppeteer')

async function scrape(url) {
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    const output = {
        title: await page.title()
    }
    return output
}

module.exports = scrape 