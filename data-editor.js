const fs = require('fs')
const uuid = require('uuid')

const CODECHARS = ('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789').split('')

class DataEditor {
    constructor(dataFile) {
        this.dataFile = dataFile
        this.data = ''
        this.openDataFile()
    }
    openDataFile() {
        fs.readFile(this.dataFile, (err, data) => {
            if(err) throw err
            this.data = JSON.parse(data)
        })
    }
    save() {
        fs.writeFile(this.dataFile, JSON.stringify(this.data), err => {
            if(err) console.log(err)
        })
    }
    createUser(username, email, password) {
        this.data.users.push({
            username: username,
            email: email,
            password: password,
            links: []
        })
        this.save()
    }
    validateNewUsername(username) {
        return (this.data.users.filter(user => user.username==username).length == 0)
    }
    validateNewUserEmail(email) {
        return (this.data.users.filter(user => user.email==email).length == 0)
    }
    validateNewUUID(id) {
        return !this.data.authTokens.some(token => token.id == id)
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
        this.data.authTokens.push(token)
        this.save()
        return token 
    }
    checkCredentials(userID, passwd) {
        let user = this.data.users.filter(usr => usr.password == passwd && (usr.username == userID || usr.email == userID))
        return user.length > 0 ? this.generateAuthToken(user[0].username) : false 
    }
    checkAuthToken(tokenStr) {
        let token = JSON.parse(tokenStr)
        if(this.data.authTokens.filter(t => t.username==token.username && t.id==token.id).length > 0) {
            return this.getUser(token.username)
        } 
        return false 
    } 
    getUser(userID) {
        let user = this.data.users.filter(usr => usr.username == userID || usr.email == userID)
        return user[0]
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
        fetch('http://ip-api.com/json/'+click.ip).then(res => res.json()).then(res => {
            click
        })
        this.data.links.forEach(link => {
            if(link.redirectID == linkID) {
                link.clicks.push(click)
            }
        })
        this.save()
    }
}

module.exports = DataEditor