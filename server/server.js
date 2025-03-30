const express = require('express')
const cors = require('cors')
const requestIp = require('request-ip')
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const fs = require('fs')

const DataEditor = require('./data-editor')

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(express.static(__dirname + '/public'))
app.set('view engine','ejs')
app.use(bodyParser.json())

const SECRET_KEY = process.env.SECRET_KEY ?? fs.readFileSync(__dirname + '/secrets/jwt-guid.txt')

let dataEditor = new DataEditor()

const authenticate = (req, res, next) => {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Access denied" });

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(403).json({ message: "Invalid token" });
        console.log('jwt user:', decoded)
        req.user = decoded;
        next();
    });
};

app.get('/health-check', (_, res) => res.status(200).message('The App is Running'))

app.get('/', (_, res) => {
    res.sendFile('public/index.html', {root: __dirname})
})

app.get('/sitemap.xml', (_, res) => {
    res.sendFile('public/sitemap.xml', {root: __dirname})
})

app.get('/robots.txt', (_, res) => {
    res.sendFile('public/robots.txt', {root: __dirname})
})

app.get('/login', (_, res) => {
    res.sendFile('public/login.html', {root: __dirname})
})

app.get('/signup', (_, res) => {
    res.sendFile('public/signup.html', {root: __dirname})
})

app.get('/dashboard', (_, res) => {
    res.sendFile('public/dashboard.html', {root: __dirname})
})

app.get('/createlink', (_, res) => {
    res.sendFile('public/createlink.html', {root: __dirname})
})

app.get('/viewlink/:id', async (req, res) => {
    let response = await dataEditor.getLinkByTrackingID(req.params.id)

    if (!response.item) {
        res.status(response.status).message(response.message)
    }

    res.render('viewlink', {
        link: JSON.stringify(response.item), 
        redirectID: response.item.displayID
    })
})

app.post('/user/create', async (req, res) => {
    const response = await dataEditor.createNewUser(req.body)

    if (!response.item) {
        res.status(response.status).message(response.message)
    }

    const token = jwt.sign({ username: response.item.username }, SECRET_KEY, { expiresIn: "1h" })

    res.status(response.status).json({
        data: response.item,
        token,
    })
})

app.post('/user/verify', async (req, res) => {
    const response = await dataEditor.getUser(req.body.username, req.body.password)

    console.log('Login - getUser result:', response)
    
    if (!response.item) {
        res.status(response.status).message(response.message)
    }

    const token = jwt.sign({ username: response.item.username },  SECRET_KEY, { expiresIn: "1h" })

    res.status(response.status).json({
        data: response.item,
        token,
    })
})

app.post('/user/info', authenticate, async (req, res) => {
    const response = await dataEditor.getUser(req.user.username, null, true);

    res.status(response.status).json({
        data: response.item,
    })
})

app.post('/link/create', authenticate, async (req, res) => {
    const response = await dataEditor.createLink(
        req.user.username, req.body.redirectURL, req.body.note
    )

    if (!response.item) {
        res.status(response.status).message(response.message)
    }

    res.status(response.status).json({
        data: response.item,
    })
})

app.get('/:id', async (req, res) => {
    console.log("getting link record by redirect ID...")

    if (req.params.id.length !== 6) {
        res.status(404)
    }

    let getLinkResult = await dataEditor.getLinkByDisplayID(req.params.id)
    let link = getLinkResult.item
    console.log(link)

    console.log(`getting user record for link owner: ${link.createdBy}...`)

    let userAgent = req.get('User-Agent')

    let click = {
        linkID: req.params.id,
        timestamp: Date.now(),
        ip: requestIp.getClientIp(req),
        userAgent
    }

    /* TODO: implement as microservice
    let device = detector.detect(userAgent)
    let click = {
        date: Date.now(),
        ip: requestIp.getClientIp(req),
        userAgent: userAgent,
        os: `${device.os.name} ${device.os.version}`,
        client: `${device.client.type} - ${device.client.name} ${device.client.version}`,
        device: `${device.device.type} - ${device.device.type} ${device.device.model}`
    }*/

    // TODO: implement as microservice
    // sendMail(user, click)

    console.log("adding new click record...")

    await dataEditor.addClick(click)

    console.log("rendering redirect page...")

    // TODO: implement as microservice
    // let urlData = await scrape(link.targetURL)
    res.render('redirect', {targetURL: link.redirectURL, title: ''})
})

app.listen(process.env.PORT || 5001)
