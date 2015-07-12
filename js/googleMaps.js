//google maps
var canvas = document.getElementById("googleMap");
canvas.style.width  = window.innerWidth + 'px';
canvas.style.height = window.innerHeight + 'px';

function initialize() {
  var mapOptions = {
    center:new google.maps.LatLng(52, -8),
    zoom:5,
    mapTypeId:google.maps.MapTypeId.ROADMAP,
    minZoom: 3,
    maxZoom: 18,
    panControl: false,
    zoomControl: false,
    mapTypeControl: true,
    mapTypeControlOptions: {
        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
        position: google.maps.ControlPosition.RIGHT_BOTTOM},
    scaleControl: false,
    streetViewControl: false,
  };
  var map = new google.maps.Map(document.getElementById("googleMap"),mapOptions);
}
google.maps.event.addDomListener(window, 'load', initialize);

window.onload = function() {
  var startPos;
  var geoOptions = {
     timeout: 10 * 1000
  }

  var geoSuccess = function(position) {
    startPos = position;
    alert("lat: " + startPos.coords.latitude, "Lan: " + startPos.coords.longitude);
  };
  var geoError = function(error) {
    console.log('Error occurred. Error code: ' + error.code);
    // error.code can be:
    //   0: unknown error
    //   1: permission denied
    //   2: position unavailable (error response from location provider)
    //   3: timed out
  };

  navigator.geolocation.getCurrentPosition(geoSuccess, geoError, geoOptions);
};

