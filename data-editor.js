const fs = require('fs')
const uuid = require('uuid')

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
}

module.exports = DataEditor