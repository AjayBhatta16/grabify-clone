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

app.listen(3000)