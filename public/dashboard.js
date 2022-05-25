let env = {
    domain: 'localhost:3000'
}

fetch(`http://${env.domain}/token/verify`, {
    method: "POST",
    headers: {'Content-Type': 'application/json'}, 
    body: JSON.stringify({token: localStorage.getItem('token')})
}).then(res => {
    return res.json()
}).then(res => {
    if(res.status == '400') {
        alert(res.message)
        window.location = '/'
    }
    populateLinks(res.user.links)
})

function populateLinks(links) {
    let tbody = document.querySelector('tbody')
    if(links.length == 0) {
        tbody.innerHTML += `
            <tr>
                <td colspan="5">No links found for this user</td>
            </tr>
        `
    } else {
        links.forEach((link, i) => {
            tbody.innerHTML += `
                <tr>
                    <td colspan="1">${i}</td>
                    <td colspan="1"><a href="/viewlink?id=${link.id}">${link.id}</a></td>
                    <td colspan="2">${link.note.length > 0 ? link.note : 'none'}</td>
                    <td colspan="1">${link.numClicks}</td>
                </tr>
            `
        })
    }
}