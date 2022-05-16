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
}

module.exports = DataEditor