//google maps
var map, placesList;
function initialize() {
  var pyrmont;
  var newyork = new google.maps.LatLng(40.69847032728747, -73.9514422416687);
  var address = (document.getElementById('my-address'));
  var autocomplete = new google.maps.places.Autocomplete(address);
  autocomplete.setTypes(['geocode']);
  google.maps.event.addListener(autocomplete, 'place_changed',
  function() {
      var place = autocomplete.getPlace();
      if (!place.geometry) {
          return;
      }

  var address = '';
  if (place.address_components) {
      address = [
          (place.address_components[0] && place.address_components[0].short_name || ''),
          (place.address_components[1] && place.address_components[1].short_name || ''),
          (place.address_components[2] && place.address_components[2].short_name || '')
          ].join(' ');
  }
  });
  /*
    working neighborhood with preset coords
  */


  if(navigator.geolocation) {
    browserSupportFlag = true;
    navigator.geolocation.getCurrentPosition(
      function(position) {
        pyrmont = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
        var myOptions = {
          center: pyrmont,
          zoom: 15,
          mapTypeId: google.maps.MapTypeId.ROADMAP
        };
        map = new google.maps.Map(document.getElementById('map-canvas'), myOptions);
    },
    function() {
      handleNoGeolocation(browserSupportFlag);
    });
  }

  var request = {
    location: pyrmont,
    radius: 1000,
    types: ['store']
  };

  placesList = document.getElementById('places');

  var service = new google.maps.places.PlacesService(map);
  service.nearbySearch(request, callback);
}

function callback(results, status, pagination) {
  if (status != google.maps.places.PlacesServiceStatus.OK) {
    return;
  } else {
    createMarkers(results);

    if (pagination.hasNextPage) {
      var moreButton = document.getElementById('more');

      moreButton.disabled = false;

      google.maps.event.addDomListenerOnce(moreButton, 'click',
          function() {
        moreButton.disabled = true;
        pagination.nextPage();
      });
    }
  }
}

function createMarkers(places) {
  var bounds = new google.maps.LatLngBounds();

  for (var i = 0, place; place = places[i]; i++) {
    var image = {
      url: place.icon,
      size: new google.maps.Size(71, 71),
      origin: new google.maps.Point(0, 0),
      anchor: new google.maps.Point(17, 34),
      scaledSize: new google.maps.Size(25, 25)
    };

    var marker = new google.maps.Marker({
      map: map,
      icon: image,
      title: place.name,
      position: place.geometry.location
    });

    placesList.innerHTML += '<li>' + place.name + '</li>';

    bounds.extend(place.geometry.location);
  }
  map.fitBounds(bounds);
}

function codeAddress() {
  geocoder = new google.maps.Geocoder();
  var address = document.getElementById("my-address").value;
  geocoder.geocode( { 'address': address}, function(results, status) {
    if (status == google.maps.GeocoderStatus.OK) {
      var pyrmont = new google.maps.LatLng(results[0].geometry.location.lat(), results[0].geometry.location.lng());

      map = new google.maps.Map(document.getElementById('map-canvas'), {
        center: pyrmont,
        zoom: 17
      });

    }

    else {
      alert("Geocode was not successful for the following reason: " + status);
    }
  });
}
google.maps.event.addDomListener(window, 'load', initialize);

var myLocation = function() {
  var startPos;
  var geoOptions = {
     timeout: 10 * 1000
  }

  var geoSuccess = function(position) {
    var pyrmont = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

    map.setCenter(pyrmont);
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
