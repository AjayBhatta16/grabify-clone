const fs = require('fs')
const uuid = require('uuid')
const http = require('http')
const bcrypt = require("bcrypt");

const firebaseAdmin = require("firebase-admin")
const { initializeApp } = require("firebase-admin/app")

const resolvedDbKeyFilePath = path.resolve(__dirname, "secrets/serviceAccountKey.json")

const firestoreServiceAccountKey = require(resolvedDbKeyFilePath);

const collections = {
    USERS: 'users',
    LINKS: 'links',
    CLICKS: 'clicks'
}

const CODECHARS = ('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789').split('')

class DataEditor {
    constructor() {
        initializeApp({
            credential: firebaseAdmin.credential.cert(firestoreServiceAccountKey),
        })
        this.db = firebaseAdmin.firestore()
    }

    // CRUD interfaces
    async create(collectionName, data) {
        try {
            const item = await this.db.collection(collectionName).add(data)

            return {
                success: true,
                item,
            }
        } catch(error) {
            console.log(`Error creating data in ${collectionName}: ${error}`)
            return {
                success: false,
                error,
            }
        }
    }

    async read(collectionName, filter = (data => data)) {
        try {
            const snapshot = await this.db.collection(collectionName).get()
            const allData = snapshot.docs.map(doc => doc.data())
            const filteredData = filter(allData)

            return {
                success: true,
                result: filteredData,
            }
        } catch(error) {
            console.log(`Error reading data from ${collectionName}: ${error}`)
            return {
                success: false,
                error,
            }
        }
    }

    async update(collectionName, filterKey, filterValue, newData) {
        try {
            const snapshot = await this.db
                .collection(collectionName)
                .where(filterKey, '==', filterValue)
                .get()

            if (snapshot.empty) {
                throw new Error(`No data found for ${filterKey} ${filterValue}`)
            }

            snapshot.forEach(async (doc) => await doc.ref.update(newData))

            return {
                success: true,
            }
        } catch(error) {
            console.log(`Error updating data in collection ${collectionName}: ${error}`)
            return {
                success: false,
                error
            }
        }
    }

    generateApiResponse(dbResult) {
        if (dbResult.success) {
            return {
                status: 200,
                item: dbResult.item ?? {},
                data: dbResult.filteredData ?? [],
            }
        } else {
            return {
                status: 500,
                message: 'A database error has occurred.'
            }
        }
    }

    // Login & Signup
    async hashPassword(password) {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        return hashedPassword;
    }

    async createNewUser(user) {
        const duplicateUser = await this.read(
            collections.USERS,
            (data => data.username === user.username || data.email === user.email)
        )

        if (!!duplicateUser) {
            return {
                status: 409,
                message: data.username === user.username
                    ? 'A user with this username already exists'
                    : 'A user with this email already exists',
            }
        }

        user.password = await this.hashPassword(user.password)
        user.links = []
        user.premiumUser = false

        const dbResult = await this.create(collections.USERS, user)

        return this.generateApiResponse(dbResult)
    }

    async getUser(username, password, jwtBypass = false) {
        if (!jwtBypass) {
            password = await this.hashPassword(password)
        }

        const dbResult = await this.read(
            collections.USERS,
            (data => 
                (data.username === username || data.email === username)
                && (jwtBypass || data.password === password)
            )
        )

        return this.generateApiResponse(dbResult)
    }
    
    async getLinksByUser(username) {
        return new Promise((resolve, reject) => {
            this.db.all(fs.readFileSync('./sql/select-links-for-user.sql', 'utf-8'), [username], (err, rows) => {
                resolve(rows.map(row => row.trackingID))
            })
        })
    }
    async getLinkByTrackingID(linkID) {
        return new Promise((resolve, reject) => {
            this.db.get(fs.readFileSync('./sql/select-link-by-tracking.sql', 'utf-8'), [linkID], async (err, row) => {
                if(!!row) {
                    let linkData = {
                        trackingID: row.trackingID,
                        redirectID: row.redirectID,
                        targetURL: row.targetURL,
                        notes: row.notes,
                        clicks: await this.getClicksForLink(linkID)
                    }
                    resolve(linkData)
                } else {
                    resolve(false)
                }
            })
        })
    }
    async getClickCount(linkID) {
        return new Promise((resolve, reject) => {
            this.db.all(fs.readFileSync('./sql/select-click-by-link.sql', 'utf-8'), [linkID], (err, rows) => {
                resolve(!!rows ? rows.length : 0)
            })
        })
    }
    getClicksForLink(linkID) {
        return new Promise((resolve, reject) => {
            let clicks = []
            this.db.all(fs.readFileSync('./sql/select-click-by-link.sql', 'utf-8'), [linkID], (err, rows) => {
                rows.forEach(row => {
                    clicks.push({
                        date: row.clickDate,
                        ip: row.ip,
                        userAgent: row.userAgent,
                        os: row.os,
                        client: row.client,
                        device: row.device,
                        location: row.clickLocation,
                        isp: row.isp,
                        organization: row.organization,
                        asn: row.asn,
                        mobile: row.mobile,
                        proxy: row.proxy,
                        hosting: row.hosting
                    })
                })
                resolve(clicks)
            })
        })
    }
    async getLinkByRedirectID(linkID) {
        return new Promise((resolve, reject) => {
            this.db.get(fs.readFileSync('./sql/select-link-by-redirect.sql', 'utf-8'), [linkID], async (err, row) => {
                if(!!row) {
                    resolve({
                        trackingID: row.trackingID,
                        redirectID: row.redirectID,
                        targetURL: row.targetURL,
                        notes: row.notes,
                        ownerID: row.ownerID,
                        clicks: await this.getClicksForLink(linkID)
                    })
                } else {
                    resolve(false)
                }
            })
        })
    }
    async newTrackingID() {
        let newID = ''
        for(let i = 0; i < 6; i++) {
            let n = CODECHARS[Math.floor(Math.random()*CODECHARS.length)]
            newID += n 
        }
        let duplicate = await this.getLinkByTrackingID(newID)
        while(duplicate) {
            for(let i = 0; i < 6; i++) {
                let n = CODECHARS[Math.floor(Math.random()*CODECHARS.length)]
                newID += n 
            }
            duplicate = await this.getLinkByTrackingID(newID)
        }
        return newID
    }
    async newRedirectID() {
        let newID = ''
        for(let i = 0; i < 6; i++) {
            let n = CODECHARS[Math.floor(Math.random()*CODECHARS.length)]
            newID += n 
        }
        let duplicate = await this.getLinkByRedirectID(newID)
        while(duplicate) {
            for(let i = 0; i < 6; i++) {
                let n = CODECHARS[Math.floor(Math.random()*CODECHARS.length)]
                newID += n 
            }
            duplicate = await this.getLinkByRedirectID(newID)
        }
        return newID
    }
    async createLink(username, targetURL, note) {
        if(targetURL.indexOf('http://') != 0 && targetURL.indexOf('https://') != 0) {
            targetURL = 'http://' + targetURL
        }
        let newTrackingID = await this.newTrackingID()
        let newRedirectID = await this.newRedirectID()
        let newLink = {
            trackingID: newTrackingID,
            redirectID: newRedirectID,
            targetURL: targetURL,
            note: note,
            clicks: []
        }
        await this.db.run(
            fs.readFileSync('./sql/insert-link.sql', 'utf-8'),
            [newTrackingID, newRedirectID, targetURL, username, note]
        )
        return newLink
    }
    async addClick(linkID, click) {
        let ipData = await this.getIPData(click.ip)
        await this.db.run(
            fs.readFileSync('./sql/insert-click.sql', 'utf-8'),
            [
                click.date, click.ip, click.userAgent, click.os, click.client, click.device,
                ipData.location, ipData.isp, ipData.organization, ipData.asn, ipData.mobile, ipData.proxy, ipData.hosting,
                linkID
            ]
        )
    }
    getIPData(ip) {
        return new Promise((resolve, reject) => {
            http.get(`http://ip-api.com/json/${ip}?fields=status,message,city,regionName,country,isp,org,as,mobile,proxy,hosting`, res => {
                let data = ''
                res.on('data', chunk => {
                    data += chunk
                })
                res.on('end', () => {
                    let dataObj = JSON.parse(data)
                    resolve({
                        location: dataObj.city + ', ' + dataObj.regionName + ', ' + dataObj.country,
                        isp: dataObj.isp,
                        organization: dataObj.org,
                        asn: dataObj.as,
                        mobile: dataObj.mobile ? "yes" : "no",
                        proxy: dataObj.proxy ? "yes" : "no",
                        hosting: dataObj.hosting ? "yes" : "no"
                    })
                })
            }).on('error', err => {
                console.log(err)
            })
        })
        
    }
}

module.exports = DataEditor
