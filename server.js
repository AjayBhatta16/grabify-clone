const express = require('express')
const cors = require('cors')
const requestIp = require('request-ip')
const DataEditor = require('./data-editor')

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(express.static(__dirname + '/public'))

let dataEditor = new DataEditor('./data.json')

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

app.get('/viewlink', (req, res) => {
    res.sendFile('public/viewlink.html', {root: __dirname})
})

app.post('/user/create', (req, res) => {
    if(!dataEditor.validateNewUsername(req.body.username)) {
        res.json({
            status: '400',
            message: 'Username already taken'
        })
    } else if(!dataEditor.validateNewUserEmail(req.body.email)) {
        res.json({
            status: '400',
            message: 'Email already taken'
        })
    } else {
        dataEditor.createUser(
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

app.post('/user/verify', (req, res) => {
    let token = dataEditor.checkCredentials(req.body.userID, req.body.password)
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

app.post('/token/verify', (req, res) => {
    let user = {...dataEditor.checkAuthToken(req.body.token)} 
    if(!user) {
        res.json({
            status: '400',
            message: 'An invalid token has been provided'
        })
    } else {
        user.links = user.links.map(linkID => {
            let link = dataEditor.getLinkByTrackingID(linkID)
            return {
                id: linkID,
                note: link.note,
                numClicks: link.clicks.length
            }
        })
        res.json({
            status: '200',
            message: 'token validated successfully',
            user: user 
        })
    }
})

app.post('/link/create', (req, res) => {
    let user = dataEditor.checkAuthToken(req.body.token)
    if(!user) {
        res.json({
            status: '400',
            message: 'An invalid token has been provided'
        })
    } else {
        let link = dataEditor.createLink(JSON.parse(req.body.token).username, req.body.targetURL, req.body.note)
        res.json({
            status: '200',
            message: 'Link created successfully',
            link: link 
        })
    }
})

app.listen(3000)