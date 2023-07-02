const fs = require('fs')
const uuid = require('uuid')
const http = require('http')
const sqlite3 = require('sqlite3').verbose()

const CODECHARS = ('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789').split('')

class DataEditor {
    constructor() {
        this.authTokens = []
        if(fs.existsSync('./appdata.db')) {
            this.db = new sqlite3.Database('./appdata.db', err => {
                if(err) {
                    console.log(`ERROR Opening Existing Database: ${err}`)
                }
                console.log('SUCCESS: Connected to database appdata.db')
            })
        } else {
            this.db = new sqlite3.Database('./appdata.db', err => {
                if(err) {
                    console.log(`ERROR Creating Database: ${err}`)
                }
                console.log('SUCCESS: Created and connected to database')
            })
            this.db.run(fs.readFileSync('./sql/create-user-table.sql', 'utf-8'))
            this.db.run(fs.readFileSync('./sql/create-link-table.sql', 'utf-8'))
            this.db.run(fs.readFileSync('./sql/create-click-table.sql', 'utf-8'))
        }
    }
    closeDB() {
        this.db.close(err => {
            if(err) {
                console.log(`ERROR Closing Database: ${err}`)
            }
            console.log('Database connection closed')
        })
    }
    save() {
        fs.writeFile(this.dataFile, JSON.stringify(this.data), err => {
            if(err) console.log(err)
        })
    }
    createUser(username, email, password) {
        this.db.run(
            fs.readFileSync('./sql/insert-user.sql', 'utf-8'),
            [username, password, email]
        )
        //this.save()
    }
    validateNewUsername(username) {
        return new Promise((resolve, reject) => {
            this.db.get(fs.readFileSync('./sql/select-user-duplicate-name.sql', 'utf-8'), [username], (err, row) => {
                resolve(!!row)
            })
        })
    }
    validateNewUserEmail(email) {
        return new Promise((resolve, reject) => {
            this.db.get(fs.readFileSync('./sql/select-user-duplicate-email.sql', 'utf-8'), [email], (err, row) => {
                resolve(!!row)
            })
        })
    }
    validateNewUUID(id) {
        return !this.authTokens.some(token => token.id == id)
    }
    generateNewUUID() {
        let id = uuid.v4()
        if(!this.validateNewUUID(id)) {
            return this.generateNewUUID()
        }
        return id 
    }
    generateAuthToken(username) {
        let id = this.generateNewUUID()
        let token = {
            username: username,
            id: id
        }
        this.authTokens.push(token)
        return token 
    }
    checkCredentials(userID, passwd) {
        return new Promise((resolve, reject) => {
            this.db.get(fs.readFileSync('./sql/select-user-for-auth.sql', 'utf-8'), [userID, passwd], (err, row) => {
                resolve(!!row ? this.generateAuthToken(row.username) : false)
            })
        })
    }
    async checkAuthToken(tokenStr) {
        let token = JSON.parse(tokenStr)
        if(this.authTokens.filter(t => t.username==token.username && t.id==token.id).length > 0) {
            return await this.getUser(token.username)
        } 
        return false 
    } 
    async getUser(userID) {
        return new Promise(async (resolve, reject) => {
            let user = {}
            this.db.get(fs.readFileSync('./sql/select-user-full.sql', 'utf-8'), [userID, userID], async (err, row) => {
                if(row) {
                    user.username = row.username
                    user.email = row.email
                    user.passwd = row.passwd
                    user.links = await this.getLinksByUser(user.username)
                    resolve(user)
                }
            })
        })
    }
    async getLinksByUser(username) {
        return new Promise((resolve, reject) => {
            this.db.all(fs.readFileSync('./sql/select-links-for-user.sql', 'utf-8'), [username], (err, rows) => {
                resolve(rows.map(row => row.trackingID))
            })
        })
    }
    getLinkByTrackingID(linkID) {
        let link = this.data.links.filter(link => link.trackingID == linkID)
        return link.length > 0 ? link[0] : false
    }
    getLinkByRedirectID(linkID) {
        let link = this.data.links.filter(link => link.redirectID == linkID)
        return link.length > 0 ? link[0] : false
    }
    newTrackingID() {
        let newID = ''
        for(let i = 0; i < 6; i++) {
            let n = CODECHARS[Math.floor(Math.random()*CODECHARS.length)]
            newID += n 
        }
        while(this.getLinkByTrackingID(newID)) {
            for(let i = 0; i < 6; i++) {
                let n = CODECHARS[Math.floor(Math.random()*CODECHARS.length)]
                newID += n 
            }
        }
        return newID
    }
    newRedirectID() {
        let newID = ''
        for(let i = 0; i < 6; i++) {
            let n = CODECHARS[Math.floor(Math.random()*CODECHARS.length)]
            newID += n 
        }
        while(this.getLinkByRedirectID(newID)) {
            for(let i = 0; i < 6; i++) {
                let n = CODECHARS[Math.floor(Math.random()*CODECHARS.length)]
                newID += n 
            }
        }
        return newID
    }
    createLink(username, targetURL, note) {
        if(targetURL.indexOf('http://') != 0 && targetURL.indexOf('https://') == 0) {
            targetURL = 'http://' + targetURL
        }
        let newLink = {
            trackingID: this.newTrackingID(),
            redirectID: this.newRedirectID(),
            targetURL: targetURL,
            note: note,
            clicks: []
        }
        this.data.links.push(newLink)
        this.data.users.forEach(user => {
            if(user.username == username) {
                user.links.push(newLink.trackingID)
            }
        })
        this.save()
        return newLink
    }
    getUserByLinkRedirect(linkID) {
        return this.data.users.filter(user => user.links.filter(link => link==linkID).length > 0)
    }
    addClick(linkID, click) {
        this.data.links.forEach(link => {
            if(link.redirectID == linkID) {
                link.clicks.push(click)
                this.getIPData(link.clicks[link.clicks.length-1])
            }
        })
        this.save()
    }
    getIPData(click) {
        http.get(`http://ip-api.com/json/${click.ip}?fields=status,message,city,regionName,country,isp,org,as,mobile,proxy,hosting`, res => {
            let data = ''
            res.on('data', chunk => {
                data += chunk
            })
            res.on('end', () => {
                let dataObj = JSON.parse(data)
                click.location = dataObj.city + ', ' + dataObj.regionName + ', ' + dataObj.country
                click.isp = dataObj.isp
                click.organization = dataObj.org
                click.asn = dataObj.as
                click.mobile = dataObj.mobile ? "yes" : "no"
                click.proxy = dataObj.proxy ? "yes" : "no"
                click.hosting = dataObj.hosting ? "yes" : "no"
                this.save()
            })
        }).on('error', err => {
            console.log(err)
        })
    }
}

module.exports = DataEditor
