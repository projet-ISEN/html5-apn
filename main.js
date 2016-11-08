// Grab elements, create settings, etc.
let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let shootButton = document.getElementById("shoot");
let resetButton = document.getElementById("reset");
let picLong = document.getElementById("picLong");
let picLat = document.getElementById("picLat");
let picAlt = document.getElementById("picAlt");
let picDate = document.getElementById("picDate");
let context = canvas.getContext('2d');
let target = document.getElementById("target").getContext('2d');
let dateField = document.getElementById("infos");

var position = {};

video.addEventListener('canplay', (event) => {
    event.preventDefault();
    window.requestAnimationFrame(play);
});

navigator.getUserMedia({ 
  video: true,
  audio: false 
}, (stream) => {
    streaming = true;
    video.src = URL.createObjectURL(stream);
    video.play();
}, (err) => {
  console.error("Your browser doesn't support this feature", err);
});

/**
 * Trigger photo take
 */
shootButton.addEventListener("click", (e) => {
	
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    picLong.innerHTML = position.longitude;
    picLat.innerHTML = position.latitude;
    picAlt.innerHTML = position.altitude;
    picDate.innerHTML = new Date();
});

/**
 * Trigger photo reset
 */
resetButton.addEventListener('click', (e) => {

    context.clearRect(0, 0, canvas.width, canvas.height);
    picLong.innerHTML = "";
    picLat.innerHTML = "";
    picAlt.innerHTML = "";
    picDate.innerHTML = "";
});

function handlePosition(pos) {
  // pos.latitude	The latitude as a decimal number (always returned)
  // pos.longitude	The longitude as a decimal number (always returned)
  // pos.accuracy	The accuracy of position (always returned)
  // pos.altitude	The altitude in meters above the mean sea level (returned if available)
  // pos.altitudeAccuracy	The altitude accuracy of position (returned if available)
  // pos.heading	The heading as degrees clockwise from North (returned if available)
  // pos.speed The speed in meters per second (returned if available)
  console.log(pos);
  position = pos;
}

if (navigator.geolocation) {
        navigator.geolocation.watchPosition(handlePosition, (err) => {
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
} else {
  console.error("Your browser doesn't support this feature");
}

function play() {

    let width = canvas.getAttribute('width');
    let height = canvas.getAttribute('height');

    if(streaming) {
      context.drawImage(video, 0, 0, width, height);
    }

    context.beginPath();
    context.arc(width / 2, height / 2, width / 8, 0, 2 * Math.PI);
    context.lineWidth = 2;
    //context.strokeStyle = 'black';
    context.stroke();

    context.beginPath();
    context.moveTo(width / 4, height / 2);
    context.lineTo(width / 4 + width / 2, height / 2);
    //context.strokeStyle = 'red';
    context.stroke();

    context.beginPath();
    context.moveTo(width / 2, height / 4);
    context.lineTo(width / 2, height / 4 + height / 2);
    //context.strokeStyle = 'red';
    context.stroke();

    window.requestAnimationFrame(play);
}