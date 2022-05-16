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
    validateNewUser(username, email) {
        return (this.data.users.filter(user => user.username==username || user.email==email).length == 0)
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
}

module.exports = DataEditor