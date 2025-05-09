const button = document.querySelector('#submit')
const errText = document.querySelector('#errtxt')
const userID = document.querySelector('#userID')
const password = document.querySelector('#password')

function setErrMsg(errMsg) {
    errText.textContent = errMsg 
}

button.addEventListener('click', (e) => {
    e.preventDefault()
    if(!userID.value || userID.value.length == 0) {
        setErrMsg('Please enter a user ID')
        return
    }
    if(!password.value || password.value.length == 0) {
        setErrMsg('Please enter a password')
        return 
    }
    let reqData = {
        username: userID.value,
        password: password.value
    }
    fetch(`${window.location.origin}/user/verify`, {
        method: "POST",
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify(reqData)
    }).then(res => {
        if (!res.ok) {
            return res.json().then(errorData => {
                throw new Error(errorData.message ?? 'Something went wrong.')
            })
        }
        
        return res.json()
    }).then(res => {
        localStorage.setItem('token', res.token)
        window.location = '/dashboard'
    }).catch(err => setErrMsg(err.message ?? 'An unknown error has occurred.'))
})