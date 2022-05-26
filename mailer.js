var mail = require('nodemailer');

var transporter = mail.createTransport({
    service: 'gmail',
    auth: {
        user: 'linkwiretracker@gmail.com',
        pass: 'fuckscammers'
    }
})

function sendMail(user, click) {
    let mailText = `
    ${user.username}, somebody clicked on your tracker!
    Their info:
    ${Object.keys(click).map(key => `${key}: ${click[key]}\n`).join('')}
    `
    var mailOptions = {
        from: 'linkwiretracker@gmail.com',
        to: user.email,
        subject: 'Someone clicked on your LinkWire link',
        text: mailText
    }
    transporter.sendMail(mailOptions, (error,info) => {
        if(error) {
            console.log(error);
        } else {
            console.log('Message sent: '+info.response);
        }
    })
}

module.exports = sendMail 