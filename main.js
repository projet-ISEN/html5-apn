// Grab elements, create settings, etc.
var canvas = document.getElementById('canvas');
var video = document.getElementById('video');
var shootButton = document.getElementById("shoot");
var resetButton = document.getElementById("reset");
var saveButton = document.getElementById("save");
var tracking = document.getElementById('tracking');
var picLong = document.getElementById("picLong");
var picLat = document.getElementById("picLat");
var picAlt = document.getElementById("picAlt");
var picDate = document.getElementById("picDate");
var context = canvas.getContext('2d');
var dateField = document.getElementById("infos");
var cardselector = $(".cardZone");
/**
 * GPS position
 */
var position = {};
var map = {};
var mapMarkers = [];

/**
 * Canvas
 */
var stateStream = true;
var lastImageRedraw = false;
window.notify = console.info;

/**
 * Init DB
 */
var db = new Dexie("cameraApp");
var dbOK = true;
var pics = [];
db.version(1).stores({
    pics: 'id, url, gps'
});

db.open().catch((e) => {
    console.error(e);
    dbOK = false;
});

/**
 * Draw a target on canvas
 */
function drawTarget() {
    var unitWidth       = canvas.width / 8;
    var unitHeight      = canvas.height / 8;
    context.lineCap     = 'round';
    context.lineWidth   = 3;
    // Circle
    context.beginPath();
    context.arc(canvas.width / 2, canvas.height / 2, canvas.width / 8, 0, 2*Math.PI);
    context.stroke();
    // Vertical axes
    context.moveTo(2*unitWidth, 4*unitHeight);
    context.lineTo(3*unitWidth, 4*unitHeight);
    context.stroke();
    context.moveTo(5*unitWidth, 4*unitHeight);
    context.lineTo(6*unitWidth, 4*unitHeight);
    context.stroke();
    // Horizontal axes
    context.moveTo(4*unitWidth, 2*unitHeight);
    context.lineTo(4*unitWidth, 3*unitHeight);
    context.stroke();
    context.moveTo(4*unitWidth, 5*unitHeight);
    context.lineTo(4*unitWidth, 6*unitHeight);
    context.stroke();
}

/**
 * Add a card in DOM
 * 
 * @param Object pic
 */
function addCard(pic){
    cardselector.append("<div class='col s6 m3 l3' id='"+pic.id+"'><div class='card'><div class='card-image waves-effect waves-block waves-light'><i class='material-icons delete-card' onclick='devarePic("+pic.id+")'>delete</i><i class='material-icons download-card' onclick=\"downloadCard('"+pic.url+"')\">play_for_work</i><img class='activator' src='"+pic.url+"'><span class='card-title'>"+(new Date(pic.id)).toLocaleString(navigator.language)+"</span></div><div class='card-reveal'><span class='card-title grey-text text-darken-4'><i class='material-icons right'>close</i></span><p>Long. : "+pic.gps.long+"</br>Lat. : "+pic.gps.lat+"</p></div></div></div>");
}

/**
 * Request and start Camera
 */
navigator.getUserMedia({
  audio: false,
  video: {
    width: {
        min: 400,
        ideal: 600,
        max: 800
    },
    height: {
        min: 400,
        ideal: 600,
        max: 800
    },
  }
}, (stream) => {
    video.src = URL.createObjectURL(stream);
}, (err) => {
  console.error("Your browser doesn't support this feature", err);
});

/**
 * draw Camera stream on canvas, add the target, freeze if photo is taken
 */
function drawCamera() {
    if(stateStream) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        drawTarget();
    } else {
        if (!lastImageRedraw) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            lastImageRedraw = true;
        }
    }
    window.requestAnimationFrame(drawCamera);
}


/**
 * When a photo taken
 */
shootButton.addEventListener("click", (e) => {
    stateStream = false;
    var now = Date.now();
    context.drawImage(video, 0, 0, video.width, video.height);
    picLong.value = position.longitude;
    picLat.value = position.latitude;
    picDate.value = (new Date(now)).toLocaleString(navigator.language);
    var temp=  {
        id: now,
        url: canvas.toDataURL(),
        gps: {
            long: position.longitude,
            lat: position.latitude,
            alt: position.altitude
        }
    };
    // STORE PICS
    db.pics.put(temp).then(() => {
        notify('Cheese !')
    }).catch((err) =>  {
        notify(error);
    });

    addCard(temp);
    // Update MAP
    addMarker(position.latitude, position.longitude, `<img src=\"${canvas.toDataURL()}\" />`);
    map.flyTo(L.latLng(position.latitude, position.longitude));
});

/**
 * When photo is reset
 */
resetButton.addEventListener('click', (e) => {
    stateStream = true;
    lastImageRedraw = false;
    picLong.value = "";
    picLat.value = "";
    picAlt.value = "";
    picDate.value = "";
});

/**
 * When you want to save a photo
 */
saveButton.addEventListener('click', (e)=> {
    downloadFile(canvas.toDataURL());
});

/**
 * Open tracking window
 */
tracking.addEventListener('click', (e) => {
    // Pause stream
    stateStream = false;
    window.open('./tracking.html', '_blank', "menubar=0,titlebar=0,scrollbars=0,width=250,height=250,toolbar=0");
    notify('Click on new popup to take a photo');
});

/**
 * When we get response from tracking window
 */
window.addEventListener('message', (e) => {
    // unPause camera stream
    stateStream = true;
    if(e.data.img) {
        console.log("We got an image!");

        // STORE PICS
        var tmp = {
            id: Date.now(),
            url: e.data.img,
            gps: {
                long: position.longitude,
                lat: position.latitude,
                alt: position.altitude
            }
        };
        db.pics.put(tmp).then(() => {
            console.info('Image stored');
        }).catch((err) =>  {
            console.error(error);
        });
        addCard(tmp);

        // Update MAP
        addMarker(position.latitude, position.longitude, `<img src=\"${e.data.img}\" />`);
        map.flyTo(L.latLng(position.latitude, position.longitude));
    }
});

/**
 *
 * @param {any} data
 * @returns
 */
function buildList(data) {
    var i, item, ref = {}, counts = {};
    function ul() {
        return document.createElement('ul');
    }
    function li(text) {
        var e = document.createElement('li');
        e.appendChild(document.createTextNode(text));
        return e;
    }

    ref[0] = ul();
    counts[0] = 1;

    for (i = 0; i < data.length; ++i) {
        ref[data[i].parentId].appendChild(li(data[i]['name'])); // create <li>
        ref[data[i].id] = ul(); // assume + create <ul>
        ref[data[i].parentId].appendChild(ref[data[i].id]);
        counts[data[i].id] = 0;
        counts[data[i].parentId] += 1;
    }

    for (i in counts) // for every <ul>
        if (counts[i] === 0) // if it never had anything appened to it
            ref[i].parentNode.removeChild(ref[i]); // remove it
    return ref[0];
}

/**
 * Add a marker on map
 *
 * @param float lat
 * @param float lng
 * @param string content
 */
function addMarker(lat, lng, content) {
    var tmpMarker = L.marker([lat, lng])
    .bindPopup( new L.popup({
        minWidth: screen.width / 10,
        closeButton: false
    })
    .setContent(content));
    mapMarkers.push(tmpMarker);
    tmpMarker.addTo(map);
}

/**
 * Devare an image in DB and in dom
 * 
 * @param TS id
 */
function devarePic(id) {
    db.pics.devare(id)
    .then(
        (res) => {
            notify(`Picture n°${id} devared`)
            document.getElementById(id).remove();
        },
        (err) => {
            notify('Fail to remove your picture.')
        }
    )
}

/**
 * Call from dom, download url
 * 
 * @param {any} url
 */
function downloadCard(url) {
    downloadFile(url);
}

/**
 * Force browser to download url
 * 
 * @param {any} sUrl
 * @returns
 */
function downloadFile(sUrl) {
    isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
    isSafari = navigator.userAgent.toLowerCase().indexOf('safari') > -1;
    if (/(iP)/g.test(navigator.userAgent)) {
       window.open(sUrl, '_blank');
       return false;
    }
    if (isChrome || isSafari) {
        var link = document.createElement('a');
        link.href = sUrl;
        link.setAttribute('target','_blank');

        if (link.download !== undefined) {
            var fileName = sUrl.substring(sUrl.lastIndexOf('/') + 1, sUrl.length);
            link.download = fileName;
        }
        if (document.createEvent) {
            var e = document.createEvent('MouseEvents');
            e.initEvent('click', true, true);
            link.dispatchEvent(e);
            return true;
        }
    }
    if (sUrl.indexOf('?') === -1) {
        sUrl += '?download';
    }
    window.open(sUrl, '_blank');
    return true;
}

/**
 * Initialisation
 */
window.onload = () => {

    // MAP
    map = L.map('map').setView([46.498967, 2.418279], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.se/hydda/full/{z}/{x}/{y}.png', {})
    .addTo(map);
    for (marker of mapMarkers) {
        marker.addTo(map);
    }
    // CAMERA TO Canvas
    window.requestAnimationFrame(drawCamera);

    // Start to watch GPS position
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition( (pos) => {
            position = pos.coords;
        }, (err) => {
            switch(err.code) {
                case err.PERMISSION_DENIED:
                    console.error("User denied the request for Geolocation.");
                    break;
                case err.POSITION_UNAVAILABLE:
                    console.error("Location information is unavailable.");
                    break;
                case err.TIMEOUT:
                    console.error("The request to get user location timed out.");
                    break;
                case err.UNKNOWN_ERROR:
                    console.error("An unknown error occurred.");
                    break;
            }
        });
    }
    else {
        console.error("Your browser doesn't support this feature");
    }

    db.pics.each( (pic) => {
        addCard(pic);
        addMarker(pic.gps.lat, pic.gps.long, `<img src=\"${pic.url}\" />`)
    } );

    // SERVICE WORKER
    if('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            insecure: true
        })
        .then((registration) => {
            console.info('Service Worker Registered');
        });
        navigator.serviceWorker.ready.then((registration) => {
            console.info('Service Worker Ready');
        });
    }

    // Notification request
    if (!("Notification" in window)) {
        alert("Your browser doesn't support notifications");
    }
    else if (Notification.permission === "granted") {
        window.notify = (txt) => {
            var n = new Notification('HTML5 Photo app', {
                body: txt,
                icon: 'images/logo.png'
            });
            setTimeout(() => {
                n.close()
            }, 3000);
        };
    }
    else if (Notification.permission !== 'denied') {
        Notification.requestPermission(function (permission) {
            if(!('permission' in Notification)) {
                Notification.permission = permission;
            }
            if (permission === "granted") {
                window.notify = (txt) => {
                    var n = new Notification('HTML5 Photo app', {
                        body: txt,
                        icon: 'images/logo.png'
                    });
                    setTimeout(() => {
                        n.close()
                    }, 3000);
                }
            }
        });
    }
}
