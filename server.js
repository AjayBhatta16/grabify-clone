const express = require('express')
const cors = require('cors')
const requestIp = require('request-ip')
const DataEditor = require('./data-editor')
const scrape = require('./scraper')
const sendMail = require('./mailer')
const DeviceDetector = require('node-device-detector')

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(express.static(__dirname + '/public'))
app.set('view engine','ejs')

let detector = new DeviceDetector()

let dataEditor = new DataEditor()

app.get('/', (req, res) => {
    res.sendFile('public/index.html', {root: __dirname})
})

app.get('/login', (req, res) => {
    res.sendFile('public/login.html', {root: __dirname})
})

app.get('/signup', (req, res) => {
    res.sendFile('public/signup.html', {root: __dirname})
})

app.get('/dashboard', (req, res) => {
    res.sendFile('public/dashboard.html', {root: __dirname})
})

app.get('/createlink', (req, res) => {
    res.sendFile('public/createlink.html', {root: __dirname})
})

app.get('/viewlink/:id', async (req, res) => {
    let link = await dataEditor.getLinkByTrackingID(req.params.id)
    res.render('viewlink', {link: JSON.stringify(link), redirectID: link.redirectID})
})

app.post('/user/create', async (req, res) => {
    let unameFound = await dataEditor.validateNewUsername(req.body.username)
    let emailFound = await dataEditor.validateNewUserEmail(req.body.email)
    if(unameFound) {
        console.log("duplicate username")
        res.json({
            status: '400',
            message: 'Username already taken'
        })
    } else if(emailFound) {
        res.json({
            status: '400',
            message: 'Email already taken'
        })
    } else {
        await dataEditor.createUser(
            req.body.username,
            req.body.email,
            req.body.password
        )
        res.json({
            status: '200',
            message: 'account created successfully',
            token: dataEditor.generateAuthToken(req.body.username)
        })
    }
})

app.post('/user/verify', async (req, res) => {
    let token = await dataEditor.checkCredentials(req.body.userID, req.body.password)
    if(!token) {
        res.json({
            status: '400',
            message: 'Incorrect user ID or password'
        })
    } else {
        res.json({
            status: '200',
            message: 'user logged in successfully',
            token: token 
        })
    }
})

app.post('/token/verify', async (req, res) => {
    let user = await dataEditor.checkAuthToken(req.body.token)
    if(!user) {
        res.json({
            status: '400',
            message: 'An invalid token has been provided'
        })
    } else {
        user.links = await Promise.all(user.links.map(async (linkID) => {
            let link = await dataEditor.getLinkByTrackingID(linkID)
            let clickCount = await dataEditor.getClickCount(linkID)
            return {
                id: linkID,
                redirectID: link.redirectID,
                targetURL: link.targetURL,
                note: link.note,
                numClicks: clickCount
            }
        }))
        res.json({
            status: '200',
            message: 'token validated successfully',
            user: user 
        })
    }
})

app.post('/link/create', async (req, res) => {
    let user = dataEditor.checkAuthToken(req.body.token)
    if(!user) {
        res.json({
            status: '400',
            message: 'An invalid token has been provided'
        })
    } else {
        let link = await dataEditor.createLink(JSON.parse(req.body.token).username, req.body.targetURL, req.body.note)
        res.json({
            status: '200',
            message: 'Link created successfully',
            link: link 
        })
    }
})

app.get('/:id', async (req, res) => {
    console.log("getting link record by redirect ID...")
    let link = await dataEditor.getLinkByRedirectID(req.params.id)
    console.log(link)
    console.log(`getting user record for link owner: ${link.ownerID}...`)
    let user = await dataEditor.getUser(link.ownerID)
    let userAgent = req.get('User-Agent')
    console.log("processing user agent...")
    let device = detector.detect(userAgent)
    let click = {
        date: Date.now(),
        ip: requestIp.getClientIp(req),
        userAgent: userAgent,
        os: `${device.os.name} ${device.os.version}`,
        client: `${device.client.type} - ${device.client.name} ${device.client.version}`,
        device: `${device.device.type} - ${device.device.type} ${device.device.model}`
    }
    // TODO: FIX
    // sendMail(user, click)
    console.log("adding new click record...")
    await dataEditor.addClick(link.trackingID, click)
    console.log("rendering redirect page...")
    // TODO: Make this work on replit
    // let urlData = await scrape(link.targetURL)
    res.render('redirect', {targetURL: link.targetURL, title: ''})
})

app.on('close', () => dataEditor.closeDB())

app.listen(process.env.PORT || 5001)
