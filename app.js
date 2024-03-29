// On initialise la latitude et la longitude 
var lat = 42.039604;
var lon = 9.012893;
var macarte = null;
var layerGroup = null;
var fondCarte = 'http://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
var test = 0;
var id;
var urlApi = 'https://appaudio1.herokuapp.com';

function initPop() {
    var modal = document.getElementById("myModal");

    var span = document.getElementsByClassName("close")[0];



    span.onclick = function() {
        modal.style.display = "none";
    }

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}

function showModal() {
    document.getElementById('myModal').style.display = "block";

}



// Fonction d'initialisation de la carte
function initMap() {
    macarte = L.map('map').setView([lat, lon], 8);
    L.tileLayer(fondCarte, {
        attribution: 'données © <a href="//osm.org/copyright">OpenStreetMap</a>/ODbL - rendu <a href="//openstreetmap.fr">OSM France</a>',
        minZoom: 1,
        Zoom: 5
    }).addTo(macarte);
    layerGroup = L.layerGroup().addTo(macarte);

}
window.onload = function() {
    // Fonction d'initialisation qui s'exécute lorsque le DOM est chargé
    initMap();
    initPop();
};


function search() {
    test = 1;
    var adress = document.getElementById('adress').value;
    const req = new XMLHttpRequest();

    req.onreadystatechange = function(event) {
        // XMLHttpRequest.DONE === 4
        if (this.readyState === XMLHttpRequest.DONE) {
            if (this.status === 200) {
                layerGroup.clearLayers();
                long = this.response.features[0].geometry.coordinates[0];
                lat = this.response.features[0].geometry.coordinates[1];
                var marker = L.marker([lat, long], { draggable: true }).addTo(layerGroup);
                marker.closePopup();
                setTimeout(() => {
                    marker.bindPopup("<div><h6 class='title is-6'>Pronciation<h6><span id='no'></span> <ul id='audio1'></ul></div> ").openPopup();
                    macarte.setView([lat, long], 11);

                    audioHandler(document.getElementById("adress").value);
                }, 500);



            } else {
                console.log("Status de la réponse: %d (%s)", this.status, this.statusText);
            }
        }
    };

    req.open('GET', 'https://api-adresse.data.gouv.fr/search/?q=' + adress, true);
    req.responseType = 'json';
    req.send(null);
}

async function record() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.start();
            fillProgress();
            const audioChunks = [];
            mediaRecorder.addEventListener("dataavailable", event => {
                audioChunks.push(event.data);
            });

            mediaRecorder.addEventListener("stop", async() => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/ogg' });
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                var userId = await generate();
                var responseUser = await sendUser(userId);


                setTimeout(async() => {
                    var response = await sendLocation(userId);


                }, 2000);

                setTimeout(async() => {
                    await sendAudio(audioBlob, id);

                }, 3000);


            });

            setTimeout(() => {
                mediaRecorder.stop();
            }, 3000);


        });
}

var progressArr = [10, 50, 75, 100];

function fillProgress() {
    progressArr.forEach((num, index) => {
        setTimeout(() => {
            var bar = document.getElementById('progress-bar');
            bar.setAttribute("value", num);
        }, 750 * index);
    });
}

function sendLocation(userId) {
    id = Date.now();
    fetch(`${urlApi}/locationName`, {
            headers: { "Content-Type": "application/json; charset=utf-8" },
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify({
                "idLoc": id,
                "village": document.getElementById("adress").value,
                "idUser": userId,
                "latitude": lat,
                "longitude": lon,
                "commentaire": document.getElementById("coms").value
            })
        }).then(response => response.json())
        .catch(error => console.error('Error:', error))
        .then(response => console.log('Success:', JSON.stringify(response)));


}

function sendUser(userId) {
    console.log(document.getElementById('residence').value)
    console.log(document.getElementById('sexe').selectedIndex.value)
    fetch(`${urlApi}/user`, {
            headers: { "Content-Type": "application/json; charset=utf-8" },
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify({
                "idUser": userId,
                "age": document.getElementById('age').value,
                "mail": document.getElementById('mail').value,
                "residence": document.getElementById('residence').value,
                "sexe": document.getElementById('sexe').selectedIndex,
            })
        }).then(response => response.json())
        .catch(error => console.error('Error:', error))
        .then(response => console.log('Success:', JSON.stringify(response)));


}

function sendAudio(audio, id) {
    var formData = new FormData();

    formData.append('audio', audio, `${Date.now()}.ogg`);
    formData.append('idLoc', id);


    fetch(`${urlApi}/audio`, {
            method: 'POST',
            mode: 'cors',
            body: formData
        })
        .then(response => response.json())
        .catch(error => console.error('Error:', error))
        .then(response => console.log('Success:', JSON.stringify(response)));
}



async function audioHandler(v) {
    let response = await fetch(`${urlApi}/audio/?village=` + v);
    let data = await response.json();

    let url1 = "https://firebasestorage.googleapis.com/v0/b/appaudio-dae64.appspot.com/o/";
    let url2 = "?alt=media&token="
    console.log(data.rows.length);
    if(data.rows.length == 0 ){
        console.log("test");
        let no = document.getElementById('audio1');
        var s = document.createElement('span');
        s.innerHTML = "Aucun enregistrement";
        no.appendChild(s);
    }

    data.rows.forEach(async rows => {
        let idUser = rows.idUser;
        var sexe;
        let responseUser = await fetch(`${urlApi}/userData/?idUser=` + idUser);
        let userData = await responseUser.json();

        if (userData.rows[0].sexe == "0") sexe = "Homme";
        else sexe = "Femme";
        var theRow = rows.audio;
        var theSentence = document.createElement('span');
        theSentence.innerHTML = `Prononcé par ${sexe}, ${userData.rows[0].age} ans, originaire de ${userData.rows[0].residence}`
        let theToken = await fetch(`${urlApi}/urlAudio/?fileName=` + theRow);
        var url = url1 + rows.audio + url2 + theToken.token;
        var theDiv = document.getElementById("audio1");
        var theLi = document.createElement('li');
        theDiv.appendChild(theLi);
        var theAudio = document.createElement('audio');
        theAudio.controls = 'controls';
        theAudio.src = `${url}`;
        theLi.appendChild(theSentence)
        theSentence.appendChild(theAudio);

    });

    console.log("response", data);

}

function generate() {
    var ALPHABET = '0123456789';
    var ID_LENGTH = 8;


    var rtn = '';
    for (var i = 0; i < ID_LENGTH; i++) {
        rtn += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));

    }
    console.log('retour', rtn)
    var result = parseInt(rtn);
    return result;


}