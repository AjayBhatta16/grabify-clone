const express = require('express')
const cors = require('cors')
const requestIp = require('request-ip')
const DataEditor = require('./data-editor')

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended: true}))

let dataEditor = new DataEditor('./data.json')

