$(function() {
  var data = {
    userLocation: {},
    targetLocation: {},
    neighborhoodRadius: 1000,
  };

  var brain = {
    locateUser: function() {
      var startPos;
      var geoOptions = {
         timeout: 10 * 1000
      }

      var geoSuccess = function(position) {
        startPos = position;
        data.userLocation = (startPos.coords.latitude, startPos.coords.longitude);
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
    }


  };

})
