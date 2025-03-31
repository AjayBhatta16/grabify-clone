const { exec } = require("child_process")
const { promisify } = require("util")
const { JSDOM } = require("jsdom")

const execPromise = promisify(exec)

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
    const { stdout } = await execPromise(`curl ${url}`)
    const jsdom = new JSDOM(stdout)

    const document = jsdom.window.document

    const pageTitle = document.querySelector('title')?.textContent ?? ''
    const ogImageUrl = document.querySelector("meta[property='og:image']")?.content ?? ''

    return {
        pageTitle,
        ogImageUrl,
    }
}

// uncomment the next line to test locally
// scrape('https://github.com/AjayBhatta16').then(console.log)