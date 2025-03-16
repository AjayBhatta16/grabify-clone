const emailRe = /.+@.+\..+/

const button = document.querySelector('#submit')
const errText = document.querySelector('#errtxt')
const username = document.querySelector('#username')
const email = document.querySelector('#email')
const password = document.querySelector('#password')

function setErrMsg(errMsg) {
    errText.textContent = errMsg 
}

button.addEventListener('click', (e) => {
    e.preventDefault()
    if(!username.value || username.value.length == 0) {
        setErrMsg('Please enter a username')
        return
    }
    if(!email.value || email.value.length == 0) {
        setErrMsg('Please enter an email')
        return 
    }
    if(!password.value || password.value.length == 0) {
        setErrMsg('Please enter a password')
        return 
    }
    if(!emailRe.test(email.value)) {
        setErrMsg('Please enter a valid email address')
        return 
    }
    let reqData = {
        username: username.value,
        email: email.value,
        password: password.value
    }
    fetch(`${window.location.origin}/user/create`, {
        method: "POST",
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify(reqData)
    }).then(res => {
        return res.json()
    }).then(res => {
        localStorage.setItem('token', res.token)
        window.location = '/dashboard'
    }).catch(err => setErrMsg(err.message ?? 'An unknown error has occurred.'))
})