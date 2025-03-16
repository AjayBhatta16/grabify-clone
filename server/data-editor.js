const fs = require('fs')
const uuid = require('uuid')
const http = require('http')
const bcrypt = require("bcrypt");
const path = require('path')

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
    trackingIDs = []
    displayIDs = []

    constructor() {
        initializeApp({
            credential: firebaseAdmin.credential.cert(firestoreServiceAccountKey),
        })
        this.db = firebaseAdmin.firestore()

        this.readAll(collections.LINKS)
            .then(({ data }) => {
                data.forEach(link => {
                    this.trackingIDs.push(link.trackingID)
                    this.displayIDs.push(link.displayID)
                })
            })
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

    async readAll(collectionName, filter = (data => data)) {
        try {
            const snapshot = await this.db.collection(collectionName).get()
            const allData = snapshot.docs.map(doc => doc.data())
            const filteredData = allData.filter(filter)

            return {
                success: true,
                data: filteredData,
            }
        } catch(error) {
            console.log(`Error reading data from ${collectionName}: ${error}`)
            return {
                success: false,
                error,
            }
        }
    }

    async readOne(collectionName, filter = (data => data)) {
        try {
            const snapshot = await this.db.collection(collectionName).get()
            const allData = snapshot.docs.map(doc => doc.data())
            const filteredData = allData.filter(filter)

            return {
                success: true,
                item: filteredData[0],
            }
        } catch(error) {
            console.log(`Error reading data from ${collectionName}: ${error}`)
            return {
                success: false,
                error,
            }
        }
    }

    async update(collectionName, filterKey, filterValue, change = (data => data)) {
        try {
            const snapshot = await this.db
                .collection(collectionName)
                .where(filterKey, '==', filterValue)
                .get()

            if (snapshot.empty) {
                throw new Error(`No data found for ${filterKey} ${filterValue}`)
            }

            snapshot.forEach(async (doc) => await doc.ref.update(change(doc.data())))

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
                status: !!dbResult.item || !!dbResult.data?.length ? 200 : 400,
                item: dbResult.item ?? {},
                data: dbResult.data ?? [],
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
        const duplicateUser = await this.readOne(
            collections.USERS,
            (data => data.username === user.username || data.email === user.email)
        )

        if (!!duplicateUser.item) {
            return {
                status: 409,
                message: duplicateUser.item.username === user.username
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
        console.log('username:', username)
        const dbResult = await this.readOne(
            collections.USERS,
            (data => 
                (data.username === username || data.email === username)
            )
        )

        if (!!dbResult.item) {
            const correctPassword = jwtBypass || await bcrypt.compare(password, dbResult.item.password)
            if (!correctPassword) {
                dbResult.item = null
                return this.generateApiResponse(dbResult)
            }

            dbResult.item = await this.populateLinkInfo(dbResult.item)
            dbResult.item.password = undefined
        }

        return this.generateApiResponse(dbResult)
    }

    // Links 
    async populateLinkInfo(user) {
        const dbResult = await this.readAll(
            collections.LINKS,
            (data => 
                user.links.some(id => data.trackingID === id)
            )
        )

        user.links = dbResult.data ?? []

        return user
    }
    
    async getLinkByTrackingID(trackingID) {
        const dbResult = await this.readOne(
            collections.LINKS,
            (data =>
                data.trackingID === trackingID
            )
        )

        return this.generateApiResponse(dbResult)
    }

    async getLinkByDisplayID(displayID) {
        const dbResult = await this.readOne(
            collections.LINKS,
            (data =>
                data.displayID === displayID
            )
        )

        return this.generateApiResponse(dbResult)
    }

    generateLinkID() {
        let newID = ''
        for(let i = 0; i < 6; i++) {
            let n = CODECHARS[Math.floor(Math.random()*CODECHARS.length)]
            newID += n 
        }

        return newID
    }

    async newTrackingID() {
        let newID = this.generateLinkID()
        let duplicate = this.trackingIDs.some(id => id === newID)

        while(duplicate) {
            newID = this.generateLinkID()
            duplicate = this.trackingIDs.some(id => id === newID)
        }

        return newID
    }

    async newDisplayID() {
        let newID = this.generateLinkID()
        let duplicate = this.displayIDs.some(id => id === newID)

        while(duplicate) {
            newID = this.generateLinkID()
            duplicate = this.displayIDs.some(id => id === newID)
        }

        return newID
    }

    async createLink(createdBy, redirectURL, note) {
        if(redirectURL.indexOf('http://') != 0 && redirectURL.indexOf('https://') != 0) {
            redirectURL = 'http://' + redirectURL
        }

        let trackingID = await this.newTrackingID()
        let displayID = await this.newDisplayID()

        let newLink = {
            trackingID,
            displayID,
            redirectURL,
            note,
            clicks: [],
            loginAttempts: [],
            createdBy,
            useLogin: false,
        }

        const dbResult = await this.create(collections.LINKS, newLink)

        await this.update(
            collections.USERS, 'username', createdBy,
            data => ({
                ...data,
                links: data.links ? [...data.links, trackingID] : [trackingID],
            })
        )

        return this.generateApiResponse(dbResult)
    }

    async addClick(click) {
        click.clickID = `${click.linkID}_${click.timestamp}`

        const dbResult = await this.create(collections.CLICKS, click)

        await this.update(
            collections.LINKS, 'displayID', click.linkID,
            data => ({
                ...data,
                clicks: data.clicks ? [...data.clicks, click] : [click]
            }),
        )

        return this.generateApiResponse(dbResult)
    }
    
    // TODO: implement as microservice
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
