const express = require('express')
const cors = require('cors')
const requestIp = require('request-ip')
const DataEditor = require('./data-editor')

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended: true}))

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

app.post('/user/create', (req, res) => {
    if(!dataEditor.validateNewUser(req.body.username, req.body.email)) {
        res.json({
            status: '400',
            message: 'Username or email already taken'
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
            token: dataEditor.createAuthToken(req.body.username)
        })
    }
})

app.listen(3000)