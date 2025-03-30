const mail = require('nodemailer')

const emailTemplates = {
    CLICK_NOTIFICATION: 'CLICK_NOTIFICATION',
    PASSWORD_RESET: 'PASSWORD_RESET',
}

const transporter = mail.createTransport({})

exports.sendEmail = (req, res) => {
    let mailOptions = {}

    if (req.body.template === emailTemplates.CLICK_NOTIFICATION) {
        mailOptions = clickNotificationMailOptions(req.body.toAddress, req.body.data)
    }

    if (req.body.template === emailTemplates.PASSWORD_RESET) {
        mailOptions = passwordResetMailOptions(req.body.toAddress, req.body.data)
    }

    transporter.sendMail(mailOptions, (err, info) => {
        if (!!err) {
            return res.status(500).message(`${err.name}: ${err.message}`)
        }

        return res.status(200).message(`E-Mail sent successfully: ${JSON.stringify(info)}`)
    })
}

function clickNotificationMailOptions(toAddress, clickData) {
    return {
        from: '',
        to: toAddress,
        subject: 'LinkWire - Someone clicked on your link!',
        html: `
            <h6>Somebody clicked on your tracking link!</h6>
            <ul>
                <li>Timestamp: ${clickData.timestamp}</li>
                <li>IP Address: ${clickData.ipAddress}</li>
                <li>Device Type: ${clickData.deviceType}</li>
            </ul>
            <p>Visit your LinkWire dashboard to view more info.</p>
        `,
    }
}

function passwordResetMailOptions(toAddress, requestData) {
    return {
        from: '',
        to: toAddress,
        subject: 'LinkWire - Password Reset',
        html: `
            <h6>Our records indicate that you have requested a password reset.</h6>
            <a href="${requestData.resetUrl}">
                Click here to begin the password reset process.
            </a>
            <p>If this wasn't you, please disregard this email.</p>
        `
    }
}