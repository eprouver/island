'use strict';

/**
 * @ngdoc directive
 * @name islandApp.directive:island
 * @description
 * # island
 */
angular.module('islandApp')
  .directive('island', function() {
    return {
      templateUrl: '/views/island.html',
      restrict: 'E',
      controllerAs: 'islandCtrl',
      controller: ['$scope', '$element', function($scope, $element) {
        var self = this;
        self.margin = 44;
        self.size = 1000;
        self.seed = 1;
        self.lowerBound = 0.125;
        self.higherBound = 0.95
        self.outterPoints = 10;
        self.coastVar = 30;
        self.roadPoints = 10;
        self.breaks = 1;

        self.zoom = 1;

        var roadMin = 0.4;
        var canvasSize = self.size + self.margin;

        var colors = {
          ocean: '#0183A6',
          water: '#00bcf0',
          sand: 'yellow',
          path: '#f5941d',
          grass: '#53990c'
        }

        var targetCanvas = $('<canvas height="' + (canvasSize) + '" width="' + (canvasSize) + '"></canvas>');
        var targetCtx = targetCanvas[0].getContext('2d');
        var holder = $element.find('#island-holder')

        function random() {
          var x = Math.sin(self.seed++) * 10000;
          return x - Math.floor(x);
        }

        function randomBetween(low, high) {
          return (random() * (high - low)) + low
        }

        function getMiddlePoint(last, vic) {
          return vic.clone()
            .subtract(last)
            .multiplyScalar(0.5)
            .add(last)
        }

        function getBoundingDistance(pAngle, arr, center, i) {

          return _.chain(arr).filter(function(v) {
            var vAngle = v.clone().subtract(center).verticalAngle();

            return Math.abs(vAngle - pAngle) < 0.2;
          }).map(function(v) {

            if (i !== undefined) {
              targetCtx.save();
              targetCtx.fillStyle = ['red', 'green', 'blue'][i % 3];
              targetCtx.fillRect(v.x, v.y, 5, 5);
              targetCtx.restore();
            }

            return v.clone().subtract(center).length();
          }).min().value();

        }

        self.drawIsland = function(x, y, size) {
          holder.empty();
          var center = new Victor(x,y);
          targetCtx.save();
          targetCtx.fillStyle = colors.ocean;
          targetCtx.fillRect(0, 0, canvasSize, canvasSize);
          targetCtx.restore();

          var coastLine = (function defineCoast() {
            var outterPath = [];
            var coastLine = [];

            targetCtx.save();
            targetCtx.fillStyle = 'green';
            targetCtx.fillRect(center.x - 2.5, center.y - 2.5, 10, 10);
            targetCtx.restore();
            targetCtx.fillRect(center.x, center.y, 5, 5);

            //Generate points for coastline
            for (var i = 0; i < self.outterPoints; i++) {
              var vic = new Victor(0, 1)
                .rotate(Math.PI * 2 * (i / self.outterPoints))
                .multiplyScalar((size / 2) * randomBetween(self.lowerBound, self.higherBound))
                .add(center);

              //Add a middle point
              if (outterPath.length) {
                var last = _(outterPath).last().clone();
                var middle = getMiddlePoint(last, vic).rotateDeg(randomBetween(-self.coastVar / 5, self.coastVar / 5));
                outterPath.push(middle);
              }

              outterPath.push(vic);
            }

            //Create CoastLine
            _.each(outterPath, function(p, index) {
              var dest = outterPath[index + 1 < outterPath.length ? index + 1 : 0];
              var iterations = dest.clone().subtract(p).length() / 15;
              var destVecStep = dest.clone().subtract(p).divideScalar(iterations);

              for (var i = 0; i < iterations; i++) {
                var s = p.clone()
                  .add(destVecStep.clone().multiplyScalar(i))
                  .add(destVecStep.clone().rotateDeg(randomBetween(-self.coastVar, self.coastVar)));
                coastLine.push(s);
              }
            });

            return coastLine;

          })();

          var drawnPath = (function defineRoads() {
            var roadPath = [];
            //Inner Path
            for (var i = 0; i < self.roadPoints; i++) {
              //determine which coastline points you are between and select the one with the smaller distance from center
              var angle = ((i) / self.roadPoints) * Math.PI * 2;

              //create a vector rotated & scaled to somewhere on that length
              var p = new Victor(0, 1)
                .rotate(angle)

              var pAngle = p.verticalAngle();

              //Check all coastal points that are the same angle direction from center
              var roadMax = getBoundingDistance(pAngle, coastLine, center);

              // targetCtx.restore();

              p
              //Scale out the point
              //.multiplyScalar(randomBetween((size/2) * roadMin, roadMax * 0.9))
              //.multiplyScalar((((Math.sin(Math.PI * 2 * perc * (random() * 10)) + 1) * 0.5) * (roadMax/4)) + roadMax * 0.55)
                .multiplyScalar(roadMax * randomBetween(0.6, 1))
                .add(center)

              roadPath.push(p);
            }

            //Add Middle Road Bends
            var drawnPath = [];

            function moveMiddle(start, end) {
              var middle = getMiddlePoint(start, end);
              var pAngle = middle.clone().subtract(center).verticalAngle();
              var roadMax = getBoundingDistance(pAngle, coastLine, center);

              if (middle.clone().subtract(center).length() > roadMax) {
                while (middle.clone().subtract(center).length() > roadMax) {
                  middle.add(center.clone().subtract(middle).multiplyScalar(0.1))
                }

                return middle;
              }
            }

            _(roadPath).each(function(p, i) {
              drawnPath.push(p);
              if (roadPath[i + 1]) {
                var middle = getMiddlePoint(p, roadPath[i + 1]);
                var one = moveMiddle(p, middle);
                var two = moveMiddle(middle, roadPath[i + 1]);
                if (one) {
                  one._bend = true;
                  drawnPath.push(one);
                }
                if (two) {
                  two._bend = true;
                  drawnPath.push(two);
                }
              }
            });

            return drawnPath;
          })()

          //Draw Land
          targetCtx.beginPath();
          targetCtx.moveTo(coastLine[0].x, coastLine[0].y);
          _(coastLine).each(function(p) {
            targetCtx.lineTo(p.x, p.y);
          })
          targetCtx.closePath();
          targetCtx.lineWidth = 20;
          targetCtx.strokeStyle = colors.water;
          targetCtx.stroke();

          targetCtx.beginPath();
          targetCtx.moveTo(coastLine[0].x, coastLine[0].y);
          _(coastLine).each(function(p) {
            targetCtx.lineTo(p.x, p.y);
          })
          targetCtx.closePath();
          targetCtx.lineWidth = 10;
          targetCtx.strokeStyle = colors.sand;
          targetCtx.stroke();
          targetCtx.fillStyle = colors.grass;
          targetCtx.fill();


          //Draw Road
          targetCtx.beginPath();
          targetCtx.moveTo(drawnPath[0].x, drawnPath[0].y);

          _(drawnPath).each(function(p, i) {
            targetCtx.lineTo(p.x, p.y);
          })

          targetCtx.closePath();
          targetCtx.lineWidth = 5;
          targetCtx.strokeStyle = colors.path;
          targetCtx.stroke();

          //Draw POIs
          _(drawnPath).each(function(p, i) {
            if (!p._bend) {
              targetCtx.save();
              targetCtx.fillStyle = 'black';
              targetCtx.fillRect(p.x - 5, p.y - 5, 10, 10);
              targetCtx.restore();
            }
          })


          //break the canvas into pieces
          var block = (canvasSize/ self.breaks);
          for(var c = 0; c < self.breaks; c++){
            var row = $('<div class="tile-holder">');
            holder.append(row);
            for(var r = 0; r < self.breaks; r++){
              var canvas = document.createElement('canvas');
              canvas.height = block;
              canvas.width = block;
              canvas.getContext('2d').drawImage(targetCanvas[0], r * block, c * block, block, block,  0, 0, block, block);
              row.append(canvas);
            }
          }
        }

        self.drawIsland(self.size / 2, self.size / 2, self.size);
        //self.drawIsland(new Victor(100, 100), 100);

      }]
    };
  });