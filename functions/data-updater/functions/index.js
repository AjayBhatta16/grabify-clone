const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { FieldValue } = require("firebase-admin")
const DeviceDetector = require('node-device-detector')
const axios = require('axios')

const admin = require("firebase-admin")
admin.initializeApp()
const db = admin.firestore()

const deviceDetector = new DeviceDetector()

const collections = {
    USERS: 'users',
    LINKS: 'links',
    CLICKS: 'clicks'
}

const IP_API_URI = 'http://ip-api.com/json'
const IP_API_FIELDS = 'status,message,city,regionName,country,isp,org,as,mobile,proxy,hosting'
const WEB_SCRAPER_URI = 'https://us-east4-linkwire-urls.cloudfunctions.net/scrapeURL'

exports.firestoreLinkTrigger = onDocumentCreated(
    `${collections.LINKS}/{docID}`,
    async (event) => {
        try {
            const linkData = event.data.data()

            const scraperResponse = await axios.post(WEB_SCRAPER_URI, { url: linkData.redirectURL })
            const redirectData = JSON.parse(scraperResponse)

            linkData.siteTitle = redirectData.pageTitle
            linkData.siteBannerURL = redirectData.ogImageUrl

            event.data.ref.update(linkData)
        }
        catch (error) {
            console.error('Error processing inbound link data:', error)
        }
    }
)

exports.firestoreClickTrigger = onDocumentCreated(
    `${collections.CLICKS}/{docID}`,
    async (event) => {
        try {
            const clickData = event.data.data()

            if (!clickData.linkID) {
                throw new Error('required attribute linkID missing from incoming click data')
            }

            if (!!clickData.userAgent) {
                let device = deviceDetector.detect(clickData.userAgent)

                clickData.os = `${device.os.name} ${device.os.version}`
                clickData.client = `${device.client.type} - ${device.client.name} ${device.client.version}`
                clickData.device = `${device.device.type} - ${device.device.type} ${device.device.model}`
            }

            if (!!clickData.ipAddress) {
                let ipApiResponse = await axios.get(`${IP_API_URI}/${clickData.ipAddress}?fields=${IP_API_FIELDS}`)

                let ipData = JSON.parse(ipApiResponse)

                clickData.location = `${ipData.city}, ${ipData.regionName}, ${ipData.country}`
                clickData.isp = ipData.isp 
                clickData.asn = ipData.asn
                clickData.organization = ipData.org 
                clickData.mobile = ipData.mobile ? 'Yes' : 'No'
                clickData.proxy = ipData.proxy ? 'Yes' : 'No'
                clickData.hosting = ipData.hosting ? 'Yes' : 'No'
            }

            // TODO: Call Email microservice here ~ Full Integration

            const linksRef = db.collection(collections.LINKS)
            const snapshot = await linksRef.where('displayID', '==', clickData.linkID).limit(1).get()

            if (!snapshot || snapshot.empty) {
                throw new Error(`no link was found with displayID ${clickData.linkID}`)
            }

            const docRef = snapshot.docs[0].ref 

            await docRef.update({
                clicks: FieldValue.arrayUnion(clickData)
            })
        }
        catch (error) {
            console.error('Error processing inbound click data:', error)
        }
    }
)