const button = document.querySelector('#submit')
const errText = document.querySelector('#errtxt')
const targetURL = document.querySelector('#targetURL')
const note = document.querySelector('#note')

const urlRe = /(http[s]?:\/\/)?\w+\.[\w\.\/\?]/

function setErrMsg(errMsg) {
    errText.textContent = errMsg 
}

button.addEventListener('click', (e) => {
    e.preventDefault()
    if(!targetURL.value || targetURL.value.length == 0) {
        setErrMsg('Please enter a target URL')
        return 
    }
    if(!urlRe.test(targetURL.value)) {
        setErrMsg('Please enter a valid URL')
        return 
    }
    fetch(`${env.proto}://${env.domain}/link/create`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            token: localStorage.getItem('token'),
            targetURL: targetURL.value,
            note: (note.value && note.value.length > 0) ? note.value : null 
        })
    }).then(res => {
        return res.json()
    }).then(res => {
        if(res.status == '400') {
            setErrMsg(res.message)
            return 
        }
        window.location = '/dashboard'
    })
})