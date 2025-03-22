const puppeteer = require('puppeteer')

exports.scrapeURL = async (req, res) => {
    try {
        const scrapeResult = await scrape(req.body.url)
        res.status(200).json(scrapeResult)
    }
    catch(err) {
        res.status(500).json({
            message: 'Error scraping URL',
            error: err,
        })
    }
}

async function scrape(url) {
    const browser = await puppeteer.launch()
    const page = await browser.newPage()

    await page.goto(url, { waitUntil: 'networkidle2' })

    const pageTitle = await page.title()

    const ogImageUrl = await page.$eval(
        'meta[property="og:image"]',
        (meta) => meta ? meta.content : null
    )

    return {
        pageTitle,
        ogImageUrl,
    }
}

// uncomment the next line to test locally
// scrape('https://github.com/AjayBhatta16').then(console.log)