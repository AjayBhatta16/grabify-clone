fetch(`${env.proto}://${env.domain}/user/info`, {
    method: "POST",
    headers: {
        'Content-Type': 'application/json',
        'authorization': localStorage.getItem('token'),
    }
}).then(res => {
    return res.json()
}).then(res => {
    populateLinks(res.data?.links ?? [])
}).catch(err => {
    alert(err.message ?? 'An unknown error has occurred.')
    window.location = '/'
})

function populateLinks(links) {
    let tbody = document.querySelector('tbody')
    if(links.length == 0) {
        tbody.innerHTML += `
            <tr>
                <td colspan="6">No links found for this user</td>
            </tr>
        `
    } else {
        links.forEach((link, i) => {
            tbody.innerHTML += `
                <tr>
                    <td colspan="1">${i+1}</td>
                    <td colspan="1"><a href="/viewlink/${link.id}">${link.id}</a></td>
                    <td colspan="1">http://${env.domain}/${link.redirectID}</td>
                    <td colspan="2">${(link.note && link.note.length > 0) ? link.note : 'none'}</td>
                    <td colspan="1">${link.numClicks}</td>
                </tr>
            `
        })
    }
}