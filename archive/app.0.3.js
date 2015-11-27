"use strict";

var data = {
  mapCenter: {lat: 53.339821, lng: -6.2362889999999425}, // default map center: Google Dublin, Ireland
  places: ko.observableArray([]),
  filteredPlaces: ko.observableArray([]),
  categories: [''],
  radius: 1000,
  bounds: new google.maps.LatLngBounds(),
};

var view = {
  map: new google.maps.Map(document.getElementById('map-canvas')),
  infowindow: new google.maps.InfoWindow(),
  icons: ["https://maps.gstatic.com/mapfiles/place_api/icons/lodging-71.png",
  "https://maps.gstatic.com/mapfiles/place_api/icons/stadium-71.png",
  "https://maps.gstatic.com/mapfiles/place_api/icons/bar-71.png",
  "https://maps.gstatic.com/mapfiles/place_api/icons/restaurant-71.png",
  "https://maps.gstatic.com/mapfiles/place_api/icons/cafe-71.png",
  "https://maps.gstatic.com/mapfiles/place_api/icons/shopping-71.png"],
  markers: []
};

function getIcons() {
  view.icons = [];
  var iconSet = new Set();
  for (var i = 0, group; group = data.places[i]; i++ ) {
    for (var j = 0; j < group.length; j++) {
      iconSet.add(group[j].icon);
    }
  }
  iconSet.forEach(function(value) {
    view.icons.push(value);
  });
}

function initNeighbourhood(center) {
  markerControl.removeMarkers();
  view.map.setCenter(center);
  view.infowindow.open(view.map)
  view.infowindow.setPosition(center);
  getNearbyPlaces(center);
  view.map.setZoom(14);
}

function initMap() {
  view.map.setOptions({
    center: data.mapCenter,
    zoom: 14,
    minZoom: 3,
    maxZoom: 18,
    mapTypeControlOptions: {
        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
        position: google.maps.ControlPosition.BOTTOM_LEFT
    }
  });
  getCurrentLocation();
}

function getCurrentLocation() {
  markerControl.setMapOnAll(null);
  if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        data.mapCenter = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        initNeighbourhood(data.mapCenter);
        var marker = new google.maps.Marker({
          map: view.map,
          anchorPoint: new google.maps.Point(-6, -29),
          icon: 'images/user.png'
        });
        marker.setPosition(data.mapcenter);
        view.infowindow.setContent(
          '<div><strong>' + "You are Here" + '</strong><br>according browser data...'
        );
        view.infowindow.open(view.map, marker);
      }, function() {
        handleLocationError(true, view.infowindow, view.map.getCenter());
      });
    } else {
      // Browser doesn't support Geolocation
      handleLocationError(false, view.infowindow, view.map.getCenter());
    }
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  initNeighbourhood(pos);
  var defaultLocation = '<div><strong>' + "Default Location in case..." + '</strong><br>'
  infoWindow.setPosition(pos);
  infoWindow.setContent(browserHasGeolocation ?
      defaultLocation + 'Error: The Geolocation service failed.' :
      defaultLocation + 'Error: Your browser doesn\'t support geolocation.');
}

function autoComplete() {
  var input = /** @type {!HTMLInputElement} */(
      document.getElementById('search-bar'));
  var autocomplete = new google.maps.places.Autocomplete(input);
  autocomplete.bindTo('bounds', view.map);
  autocomplete.addListener('place_changed', function() {
  var place = autocomplete.getPlace();
  if (!place.geometry) {
    window.alert("Autocomplete's returned place contains no geometry");
    return;
  }
  initNeighbourhood(place.geometry.location);
  markerControl.addMarker(place);
  infowindowControl.addInfowindow(place);
  });
}

var markerControl = {
  addMarker: function(place) {
    var marker = new google.maps.Marker({
      map: view.map,
      anchorPoint: new google.maps.Point(-6, -29)
    });
    marker.setIcon(/** @type {google.maps.Icon} */({
      url: place.icon,
      size: new google.maps.Size(25, 25),
      origin: new google.maps.Point(0, 0),
      anchor: new google.maps.Point(17, 34),
      scaledSize: new google.maps.Size(25, 25)
    }));
    marker.setPosition(place.geometry.location);
    view.markers.push(marker);
  },

  // Sets the map on all markers in the array.
  setMapOnAll: function(map) {
    for (var i = 0; i < view.markers.length; i++) {
      view.markers[i].setMap(map);
    }
  },

  // Removes the markers from the map, but keeps them in the array.
  clearMarkers: function() {
    markerControl.setMapOnAll(null);
  },

  // remove markers from the map
  removeMarkers: function() {
    markerControl.clearMarkers();
    view.markers = []
  }
}

var infowindowControl = {
  addInfowindow: function(place) {
    var address = '';
    if (place.address_components) {
      address = [
        (place.address_components[0] && place.address_components[0].short_name || ''),
        (place.address_components[1] && place.address_components[1].short_name || ''),
        (place.address_components[2] && place.address_components[2].short_name || '')
      ].join(' ');
    }
    view.infowindow.setContent('<div><strong>' + place.name + '</strong><br>' + place.formatted_address + '</div>');
    view.infowindow.open(view.map, view.markers[0]);
  }
}

function getNearbyPlaces(center) {
  var service = new google.maps.places.PlacesService(view.map);
  service.nearbySearch({
    location: center,
    radius: data.radius,
    types: data.categories
  }, processResults);
}

function processResults(results, status, pagination) {
  var placesList = document.getElementById('places');
  if (status !== google.maps.places.PlacesServiceStatus.OK) {
    return;
  } else {
    data.places.push(results);
    getIcons();
    for (var i = 0, place; place = results[i]; i++) {
      markerControl.addMarker(place);
      placesList.innerHTML += '<li>' + place.name + '</li>';
    }
    if (pagination.hasNextPage) {
      var moreButton = document.getElementById('more');

      moreButton.disabled = false;

      moreButton.addEventListener('click', function() {
        moreButton.disabled = true;
        pagination.nextPage();
      });
    }
  }
}

initMap();
autoComplete();

$(function() {
  for (var i = 0, icon; icon =  view.icons[i]; i++) {
    $('#filters').append( '<button type="button" class="btn btn-default"><img src="' + icon + '"></button><br>' );
  };
  $('[group~=controls]').show(1000);
  $('#hide').click(function() {
      var glyph = '', currentGlyph = $(this).children('span').attr('class');
      if (currentGlyph.slice(29) === 'left') {
        glyph = currentGlyph.replace('left', 'right')
      }
      else {
        glyph = currentGlyph.replace('right', 'left')
      }

      $(this).siblings('div').animate({width: "toggle"}, 500);
      $(this).children('span').attr('class', glyph);
  });
});

//---------------------------------------------------------------------------------------------------------------------------
