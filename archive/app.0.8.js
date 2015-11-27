"use strict";
$(function() {

  function nhViewModel() {
    // viewModel for knockout.js
    var self = this,
        map,
        infowindow,
        mapBounds,
        mapCenter = {lat: 53.339821, lng: -6.2362889999999425}, // default map center
        categories = [],
        styles = [],
        styledMap,
        marker_animation = google.maps.Animation.DROP,
        today = new Date();

    self.nearByPlaces = ko.observableArray([]); //container for object returned by google map places API nearby search service
    self.places = ko.observableArray([]); //container for object returned by google map places API searchBox service
    self.markers = ko.observableArray([]); //container for marker objects
    self.radius = ko.observable(2000); //neighborhood radius
    self.keyword = ko.observable(""); //keyword to filter markers and places
    self.placeReviews = ko.observableArray([]); //container for place review objects returned by google map places API getDetails() service
    self.placePhotos = ko.observableArray([]); //container for place photo urls returned by google map places API getDetails() service
    self.placeInFocus = ko.observable(); //place object container when opening photos and reviews via infowindows

    self.address = function(place) {
      /*
        return place address from place object
      */
      if (place.vicinity) {
        return place.vicinity
      } else {
        return place.formatted_address
      }
    }

    self.icons = ko.computed(function() {
      /*
        return icons for the btn-toolbar
      */
      var iconSet = new Set();
      var iconDict = [];
      for (var idx in self.nearByPlaces()) {
        iconSet.add(self.nearByPlaces()[idx].icon);
      }
      iconSet.forEach(function(icon) {
        iconDict.push({"icon": icon});
      });
      return iconDict;
    });

    self.rateImg = function(place) {
      /*
        chain together the rating stars based on place rating.
      */
      var rating = Math.round(place.rating * 2)/2;
      var imgHolder = [];

      for (var i = 0; i < parseInt(rating); i++) {
        imgHolder.push({"star" : "images/full-star.png"});
      }

      if (rating - parseInt(rating) != 0) {
        imgHolder.push({"star" : "images/half-star.png"});
      }

      for (var i = 0; i < parseInt(5 - rating); i++){
        imgHolder.push({"star" : "images/empty-star.png"});
      }
      return imgHolder;
    }

    self.displayedPlaces = function() {
      /*
        filter markers and places based on keyword
      */
      var places = [];
      var keyword = self.keyword().toLowerCase();
      var actualPlaces = [];

      if (self.places().length < 2) {
        actualPlaces = self.nearByPlaces();
      } else {
        actualPlaces = self.places();
      }

      if (self.keyword() != "") {
        for (var idx in actualPlaces) {

          if (actualPlaces[idx].name.toLowerCase().indexOf(keyword) != -1 ||
              actualPlaces[idx].types[0].toLowerCase().indexOf(keyword) != -1) {
                marker_animation = null;
                places.push(actualPlaces[idx]);
          }
        }
      } else {
        places = actualPlaces;
      }
      addMarkers(places);
      return places;
    }

    self.formattedType = function(data) {
      /*
       replace "_ & -" to space and first letter to uppercase in place type
       example: art_gallery => Art gallery
      */
      var formattedType = data.types[0].replace(/[_-]/g, " ");
      return formattedType.charAt(0).toUpperCase() + formattedType.substr(1, formattedType.length);
    }

    function initMap() {
      /*
        google map initialization
      */
      var mapOptions = {
        center: mapCenter,
        zoom: 14,
        minZoom: 3,
        maxZoom: 18,
        disableDefaultUI: true
      };

      map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
      infowindow = new google.maps.InfoWindow({
        pixelOffset: new google.maps.Size(-23, -10),
      });

      styledMap = new google.maps.StyledMapType(styles,{name: "Styled Map"});
      map.mapTypes.set('map_style', styledMap);
      map.setMapTypeId('map_style');

    }

    initMap();

    function getCurrentLocation() {
      /*
        Locate user using geolocation
      */
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(function(position) {
            mapCenter = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            map.setCenter(mapCenter);
            getNearbyPlaces(mapCenter);
          }, function() {
            handleLocationError(true, infowindow, map.getCenter());
          });
        } else {
          // Browser doesn't support Geolocation
          handleLocationError(false, infowindow, map.getCenter());
          getNearbyPlaces(mapCenter);
        }
    }

    function handleLocationError(browserHasGeolocation, infoWindow, pos) {
      // Handle geolocation errors
      getNearbyPlaces(mapCenter);
    }

    getCurrentLocation();

    function getNearbyPlaces(center) {
      /*
        google maps places API search pagination request
      */
      self.nearByPlaces([]);

      var service = new google.maps.places.PlacesService(map);
        service.nearbySearch  ({
        location: center,
        radius: self.radius(),
        types: categories
      }, processResults);
    }

    function processResults(results, status, pagination) {
      var bounds = new google.maps.LatLngBounds();
      var placesList = document.getElementById('places');
      if (status !== google.maps.places.PlacesServiceStatus.OK) {
        return;
      } else {
          for (var i = 0, place; place = results[i]; i++) {
            if (place.types[place.types.length - 1] != "political") {
              self.nearByPlaces.push(place);
              bounds.extend(place.geometry.location);
            }
          }
        map.fitBounds(bounds);
      }
      categories = [];
    }

    function initAutocomplete() {
      /*
        google maps places API autocomplete service
      */
      self.places([]);
      // Create the search box and link it to the UI element.
      var input = document.getElementById('search-input');
      var searchBox = new google.maps.places.SearchBox(input);

      // Bias the SearchBox results towards current map's viewport.
      map.addListener('bounds_changed', function() {
        searchBox.setBounds(map.getBounds());
        mapCenter = map.getCenter();
      });

      // Listen for the event fired when the user selects a prediction and retrieve
      // more details for that place.
      searchBox.addListener('places_changed', boxSearch);
      categories = [];

      function boxSearch() {
        var searchedPlaces = searchBox.getPlaces();
        self.places(searchedPlaces);

        if (self.places().length == 0) {
          return;
        }
        else if (self.places().length == 1) {
          getNearbyPlaces(self.places()[0].geometry.location);
          self.nearByPlaces().push(searchedPlaces[0]);
        }
        document.getElementById('search-input').value = "";
        self.keyword("");
        marker_animation = google.maps.Animation.DROP;
      }
    }

    initAutocomplete();

    function addMarkers(places) {
      /*
        add markers to the map
      */
      self.markers().forEach(function(marker) {
        // Clear out the old markers.
        marker.setMap(null);
      });
      self.markers([]);

      // For each place, get the icon, name and location.
      places.forEach(function(place) {
        var icon = {
          url: place.icon,
          size: new google.maps.Size(71, 71),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(17, 34),
          scaledSize: new google.maps.Size(25, 25)
        };

        // Create a marker for each place.
        var marker = new google.maps.Marker({
          map: map,
          icon: icon,
          title: place.name,
          animation: marker_animation,
          position: place.geometry.location
        });

        marker.addListener('click', function() {
          self.markers().forEach(function(marker) {
            marker.setAnimation(null);
          });

          if (marker.getAnimation() !== null) {
            marker.setAnimation(null);
          } else {
            marker.setAnimation(google.maps.Animation.BOUNCE);
          }
        });

        self.markers().push(marker);

        google.maps.event.addListener(marker, 'click', function() {
          addInfowindow(place, marker);
        });
      });
    }

    function addInfowindow(place, marker) {
      /*
        get details about place corresponded to the clicked marker and build the infowindow
      */
      var service = new google.maps.places.PlacesService(map);
      service.getDetails({
        placeId: place.place_id
      }, function (place, status) {
        getWikiExtract(place);
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          infowindow.setContent(
            /*
              dynamically generated info window content
            */
            '<div id="infoWindow" style="width: 220px; font-size: 14px; display: none;"><p><h3>' + place.name + '</h3></p>' +
            '<hr>' +
            '<p><span style="font-size: 15px">' + place.formatted_address + '</span></p>' +

            '<p><span style="color: #4a7ea7; font-weight: bold;">' + getOpeningHrs(place)  + '</span></p>'+
            '<br>' +
            '<div id="wiki" style="white-space: normal;"><span></span></div>' +
            '<br>' +
            getRating(place) +

            '<p><span>' + getPhone(place) + '</span></p>' +

            '<p><div class="longtext"><a href="'+ getWeb(place) +'" target="_blank">' + getWeb(place) + '<a></div>' +
            getPhotoes(place) + '</div></p>'
          );

          infowindow.open(map, marker);

          $('#infoWindow').fadeIn(1000);

          self.placePhotos(place.photos);

          document.getElementById('photoLink').addEventListener("click", function(){
            /*
              open photo viewer
            */
            $('#photoViewer').show();

            var numberOfPhotos = place.photos.length;
            var photoIdx = 0;

            updPhoto(0);

            $('#next').click(function() {
              updPhoto(1);

            });

            $('#prev').click(function() {
              updPhoto(-1);
            });

            function updPhoto(direction) {
              /*
                update which photo to be shown
              */
              photoIdx += direction;
              if (photoIdx == 0) {
                $('#prev').hide();
                $('#next').show();
              } else if (photoIdx == numberOfPhotos - 1){
                $('#next').hide();
              } else {
                $('#prev').show();
                $('#next').show();
              }
              $('#frame').children().eq(photoIdx - direction).hide();
              $('#frame').children().eq(photoIdx).show();
              updCounter()
            }

            function updCounter() {
              $('#photoCounter').text((photoIdx + 1) + " / " + numberOfPhotos);
            }

            $('#close-photo').click(function() {
              $('#frame').children().hide();
              $('#photoViewer').hide();
              photoIdx = 0;
            });

          });

          document.getElementById('reviewlink').addEventListener("click", function(){
            /*
              open review page
            */
            self.placeReviews([]);
            self.placeInFocus(place);
            var reviews = [];
            place.reviews.forEach(function(review) {
                if (review.text != "") {
                  reviews.push(review);
                }
            });

            self.placeReviews(reviews);

            $('#review-page').show();
            $('#reviews').children().show();
            $('#close-review').click(function() {
              $('#reviews').children().hide();
              $('#review-page').hide();
            });
          });
        }
      });
      google.maps.event.addListener(infowindow,'closeclick',function(){
        self.markers().forEach(function(marker) {
          marker.setAnimation(null);
        });
      });
    }

    function getOpeningHrs(place) {
      /*
        get opening hours from place object
      */
      if (place.opening_hours) {
        return place.opening_hours.weekday_text[today.getDay() - 1  ];
      } else {
        return "";
      }
    }

    function getRating(place) {
      /*
        get rating from place object and dinamically chain together the rating tag
        add rating stars and review link
      */
      var ratingTag = "";
      var starHolder = self.rateImg(place);
      if (place.rating) {
        ratingTag = '<div><span style="color: #df6d15; padding-right: 3px;">' + place.rating + '</span>'
        for (var i in starHolder) {
          ratingTag += '<img class="rate-star" src="' + starHolder[i].star + '" />'
        }

        return ratingTag + '<a id="reviewlink" style="padding-left: 15px;" href="#"">reviews</a></div>';
      } else {
        return '<span style="font-style: italic;">no rating available</span>';
      }
    }

    function getPhone(place) {
      /*
        get phone number from place object
      */
      if (place.international_phone_number) {
        return place.international_phone_number;
      } else {
        return '<span>Location:' + place.geometry.location + '</span>';
      }
    }

    function getWeb(place) {
      /*
        get website from place object
      */
      if (place.website) {
        return place.website;
      } else {
        return "";
      }
    }

    function getPhotoes(place) {
      /*
        get photo urls from place object
      */
      if (place.photos) {
        if (place.photos.length > 1 ) {
        return '<a id="photoLink" href="#"">photos<a>';
      }}
      return '<div id="photoLink"></div>';
    }

    function getWikiExtract(place) {
      /*
        get wikipedia page extract and link based on place name
      */
      var searchParam = place.name.replace(/[\s,]/g, "%20")
      var wiki = "https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=&titles=" + searchParam;

      var wikiTimeOut = setTimeout(function() {
        console.log("Wiki API failed to load."); //Could notify user but did not seemed necessary, anyhow it's useful for debug
      }, 3000);

      $.ajax({
        url: wiki,
        dataType: "jsonp",
        success: function(response) {
          var wikiTag = document.getElementById('wiki');
          for (var page in response.query.pages) {
            if (response.query.pages[page].extract == undefined || response.query.pages[page].extract == "") {

            }else {
                wikiTag.innerHTML = '<span>' + response.query.pages[page].extract.substring(0, 60) +
                "..." + '</span><a style="display: block;" href=http://en.wikipedia.org/?curid=' + response.query.pages[page].pageid +
                ' target="_blank">read more on wikipedia</a>'
            }
          }
          clearTimeout(wikiTimeOut);
        }
      });
    }

    self.clickMarker = function(place) {
      /*
        trigger click event to markers when list item is clicked
      */
      var name = place.name.toLowerCase();
      self.markers().forEach(function(marker) {
        if (marker.title.toLowerCase() === name) {
          google.maps.event.trigger(marker, 'click');
          map.setCenter({lat: marker.position.J + 0.006, lng: marker.position.M + 0.006})
        }
      });
    }

    $('#filters').on('click', 'button', function () {
      /*
        call google map API nearby serach with altered categories based on which icon pressed
        unfortunatelly there is an inconsistency with how google call place types and the
        "corresponding image" see example gym = type, fitness = img
      */
       marker_animation = google.maps.Animation.DROP;
       var fileName = $(this).children('img').attr('src').split("/");
       var rawCategory = fileName[fileName.length - 1].split("-")[0];
       categories = [];

       if (rawCategory == "fitness") {
         categories.push("gym");         // <--not nice but necessary because the inconsistency
       }

       for (var idx in googlePlaceTypes) {
         //fetch the place type from googlePlaceTypes based on icon url name
         if (googlePlaceTypes[idx].toLowerCase().indexOf(rawCategory.substring(0, 4)) != -1) {
               categories.push(googlePlaceTypes[idx]);
         }
       }
       getNearbyPlaces(map.getCenter());
    });

    $('#reset').on('click', function() {
      categories = [];
      getNearbyPlaces(map.getCenter());
    })
  }

  ko.applyBindings(new nhViewModel());

  $('#hide').click(function() {
    /*
      handle btn-toolbar click events
    */
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
