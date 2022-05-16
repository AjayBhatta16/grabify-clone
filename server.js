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

app.listen(3000)