let link = JSON.parse(linkStr.replaceAll('&#34;','"'))
const tbody = document.querySelector('tbody')
const modals = document.querySelector('#modal-container')

document.querySelector('h3').textContent += ` ${env.proto}://${env.domain}/${link.redirectID}`

if(link.clicks.length == 0) {
    tbody.innerHTML = `
        <tr>
            <td colspan="4">Nobody has clicked this link yet</td>
        </tr>
    `
} else {
    link.clicks.forEach((click, i) => {
        let modalText = ''
        for(const key in click) {
            modalText += `<li>${key}: ${click[key]}</li>`
        }
        modals.innerHTML += `
        <div class="modal fade" id="modal${i+1}" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
            <div class="modal-dialog" role="document">
                <div class="modal-content bg-dark">
                    <div class="modal-header">
                        <h5 class="modal-title" id="exampleModalLabel">IP Log Info</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <ul>
                        ${modalText}
                        </ul>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
        `       
        tbody.innerHTML += `
            <tr>
                <td>${i+1}</td>
                <td>${(new Date(click.date)).toString().split(' (')[0]}</td>
                <td>${click.ip}</td>
                <td>
                    <button type="button" class="btn btn-primary" data-toggle="modal" data-target="#modal${i+1}">
                        View
                    </button>
                </td>
            </tr>
        `
    })
}