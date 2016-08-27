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
      templateUrl: '/views/many.html',
      restrict: 'E',
      controllerAs: 'islandCtrl',
      controller: ['$scope', '$element', function($scope, $element) {
        var self = this;
        self.margin = 50;
        self.size = 800;
        self.seed = 1;
        self.lowerBound = 0.125;
        self.higherBound = 0.95;
        self.breaks = 1;
        self.margin = 10;
        self.outterPoints = 10;
        self.coastVar = 30;
        self.breaks = 2;
        self.random = false;
        self.scaler = 1;
        self.zoom = 1;
        self.map = false;
        self.lineThickness = self.size / 2;

        var testColors = {
          ocean: 'white',
          water: 'white',
          sand: 'black',
          path: '#ccc',
          grass: 'white',
          marker: 'black'
        }

        var realColors = {
          ocean: '#0183A6',
          water: '#00bcf0',
          sand: '#F4F784',
          path: '#f5941d',
          grass: '#53990c',
          marker: 'white'
        }

        var mapColors = {
          ocean: '#c4ac7c',
          water: '#c4ac7c',
          sand: '#354536',
          path: '#5e6a58',
          grass: '#c4ac7c',
          marker: '#9e391a'
        }

        var roadMin = 0.4;
        var canvasSize = self.size + self.margin;

        var seed = self.seed;

        function random() {
          var x = Math.sin(seed++) * 10000;
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
            return v.clone().subtract(center).length();
          }).min().value();

        }

        function drawMaps(coastLine, drawnPath, lineThickness, colors, targetCanvas, targetCtx, holder, options) {
          if (!options) {
            options = {};
          }

          targetCtx.save();

          //Draw ocean
          if (options.ocean) {
            targetCtx.save();
            targetCtx.fillStyle = colors.ocean;
            targetCtx.fillRect(0, 0, targetCanvas[0].width, targetCanvas[0].height);
            targetCtx.restore();
          }

          //Draw Land
          //shallows
          targetCtx.beginPath();
          targetCtx.moveTo(coastLine[0].x, coastLine[0].y);

          var i = 0;
          for (i = 1; i < coastLine.length - 2; i++) {
            var xc = (coastLine[i].x + coastLine[i + 1].x) / 2;
            var yc = (coastLine[i].y + coastLine[i + 1].y) / 2;
            targetCtx.quadraticCurveTo(coastLine[i].x, coastLine[i].y, xc, yc);
          }
          targetCtx.quadraticCurveTo(coastLine[i].x, coastLine[i].y, coastLine[i + 1].x, coastLine[i + 1].y);

          targetCtx.closePath();
          targetCtx.lineWidth = lineThickness / 20;
          targetCtx.strokeStyle = colors.water;
          targetCtx.stroke();

          //sand
          targetCtx.beginPath();
          targetCtx.moveTo(coastLine[0].x, coastLine[0].y);

          if (options.smooth) {
            var i = 0;
            for (i = 1; i < coastLine.length - 2; i++) {
              var xc = (coastLine[i].x + coastLine[i + 1].x) / 2;
              var yc = (coastLine[i].y + coastLine[i + 1].y) / 2;
              targetCtx.quadraticCurveTo(coastLine[i].x, coastLine[i].y, xc, yc);
            }
            targetCtx.quadraticCurveTo(coastLine[i].x, coastLine[i].y, coastLine[i + 1].x, coastLine[i + 1].y);
          } else {
            _(coastLine).each(function(p) {
              targetCtx.lineTo(p.x, p.y);
            })
          }

          targetCtx.closePath();
          targetCtx.lineWidth = lineThickness / 80;
          targetCtx.strokeStyle = colors.sand;
          targetCtx.stroke();
          targetCtx.fillStyle = colors.grass;
          targetCtx.fill();


          //Draw Road
          if (options.road && drawnPath.length > 1) {
            targetCtx.beginPath();
            targetCtx.moveTo(drawnPath[0].x, drawnPath[0].y);

            var i = 0;
            for (i = 1; i < drawnPath.length - 2; i++) {
              if (drawnPath[i]._bend) {
                var xc = (drawnPath[i].x + drawnPath[i + 1].x) / 2;
                var yc = (drawnPath[i].y + drawnPath[i + 1].y) / 2;
                targetCtx.quadraticCurveTo(drawnPath[i].x, drawnPath[i].y, xc, yc);
              } else {
                targetCtx.lineTo(drawnPath[i].x, drawnPath[i].y);
              }
            }

            if (drawnPath[i]._bend) {
              targetCtx.quadraticCurveTo(drawnPath[i].x, drawnPath[i].y, drawnPath[i + 1].x, drawnPath[i + 1].y);
            } else {
              targetCtx.lineTo(drawnPath[i].x, drawnPath[i].y);
              if (drawnPath[i + 1]) {
                targetCtx.lineTo(drawnPath[i + 1].x, drawnPath[i + 1].y);
              }
            }

            targetCtx.closePath();
            targetCtx.lineWidth = (lineThickness / 200);
            targetCtx.strokeStyle = colors.path;
            targetCtx.stroke();
          }

          //Draw POIs
          if (options.pois) {
            _(drawnPath).each(function(p, i) {
              if (!p._bend) {
                targetCtx.save();
                targetCtx.fillStyle = colors.marker;
                targetCtx.fillRect(p.x - (lineThickness / 200), p.y - (lineThickness / 200), lineThickness / 100, lineThickness / 100);
                targetCtx.restore();
              }
            })
          }

          targetCtx.restore();

          if (options.append) {
            var innerHolder = $('<div>').addClass(options.class);
            //break the canvas into pieces
            var block = (targetCanvas[0].width / self.breaks);
            for (var c = 0; c < self.breaks; c++) {
              var row = $('<div class="tile-holder">');
              innerHolder.append(row);
              for (var r = 0; r < self.breaks; r++) {
                var canvas = document.createElement('canvas');
                canvas.height = block;
                canvas.width = block;
                canvas.getContext('2d').drawImage(targetCanvas[0], r * block, c * block, block, block, 0, 0, block, block);
                row.append($('<img>').attr('src', canvas.toDataURL()));
              }
            }

            holder.append(innerHolder);
          }
          return innerHolder;
        };

        self.generateIsland = function(x, y, size, roadPoints, overSeed) {
          seed = overSeed;

          var islandData = {
            roadPath: [],
            seed: overSeed,
            roadPoints: roadPoints
          };

          var center = new Victor(x, y);

          islandData.coastLine = (function defineCoast() {
            var outterPath = [];
            var coastLine = [];

            //Generate points for coastline
            Array.apply(null, {
              length: self.outterPoints
            }).forEach(function(v, i) {
              var vic = new Victor(0, 1)
                .rotate(Math.PI * 2 * (i / self.outterPoints))
                .multiplyScalar((size / 2) * randomBetween(self.lowerBound, self.higherBound))
                //.multiplyScalar((size / 2) )
                .add(center);


              //Add a middle point
              if (outterPath.length) {
                for (var j = 0; j < 2; j++) {
                  var last = _(outterPath).last().clone();
                  //var middle = getMiddlePoint(last, vic).rotateDeg(randomBetween(-self.coastVar / 5, self.coastVar / 5));
                  var middle = getMiddlePoint(last, vic).add(last.clone().subtract(vic).multiplyScalar(0.5).rotateDeg(randomBetween(-30, 30)))
                  outterPath.push(middle);
                }
              }
              outterPath.push(vic.unfloat());
            });

            //Create CoastLine
            _.each(outterPath, function(p, index) {
              var dest = outterPath[index + 1 < outterPath.length ? index + 1 : 0];
              var iterations = dest.clone().subtract(p).length() / (size / 65);
              var destVecStep = dest.clone().subtract(p).divideScalar(iterations);

              for (var i = 0; i < iterations; i++) {
                var s = p.clone()
                  .add(destVecStep.clone().multiplyScalar(i))
                  .add(destVecStep.clone().rotateDeg(randomBetween(-self.coastVar, self.coastVar)));
                coastLine.push(s.unfloat());
              }
            });

            islandData.drawnPath = (function defineRoads() {
              islandData.roadPath = [];
              //Inner Path
              for (var i = 0; i < roadPoints; i++) {
                //determine which coastline points you are between and select the one with the smaller distance from center
                var angle = ((i) / roadPoints) * Math.PI * 2;

                //create a vector rotated & scaled to somewhere on that length
                var p = new Victor(0, 1)
                  .rotate(angle)

                var pAngle = p.verticalAngle();

                //Check all coastal points that are the same angle direction from center
                var roadMax = getBoundingDistance(pAngle, coastLine, center);

                p.multiplyScalar(roadMax * 0.99)
                  .add(center)

                islandData.roadPath.push(p.unfloat());
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

              _(islandData.roadPath).each(function(p, i) {
                drawnPath.push(p.unfloat());
                if (islandData.roadPath[i + 1]) {
                  var middle = getMiddlePoint(p, islandData.roadPath[i + 1]);
                  var one = moveMiddle(p, middle);
                  var two = moveMiddle(middle, islandData.roadPath[i + 1]);
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
            })();
            return coastLine;
          })();
          return islandData;
        }

        // self.drawIsland = function(islandData, targetCanvas) {
        //   holder.empty();
        //   canvasSize = self.size + self.margin;
        //
        //   if (self.map) {
        //     //create a second overlay canvas
        //     var targetCanvas = $('<canvas height="' + (canvasSize) + '" width="' + (canvasSize) + '"></canvas>');
        //     var targetCtx = targetCanvas[0].getContext('2d');
        //     var innerHolder = drawMaps(islandData.coastLine, islandData.drawnPath, self.size, mapColors, targetCanvas, targetCtx, holder, {
        //       road: true,
        //       smooth: true,
        //       class: 'map-overlay'
        //     })
        //
        //     self.paper = innerHolder.oriDomi({
        //       vPanels: 6
        //     }).oriDomi(true);
        //     self.paper.accordion(0, 'right');
        //   }
        // }
        var holder = $element.find('#map-holder')
        holder.empty();
        var targetCanvas = $('<canvas height="' + (canvasSize) + '" width="' + (canvasSize) + '"></canvas>');
        var targetCtx = targetCanvas[0].getContext('2d');

        var islands = {
          children: [],
          value: self.size * 0.5,
        };

        var islandNum = 13;
        var totalSize = self.size * 0.5;

        for (var i = 0; i < islandNum; i++) {
          var size = Math.max(random() * (totalSize / 3), 10);
          totalSize -= size;
          islands.children.push({
            value: size,
            margin: 20,
            seed: random(),
            roadPoints: ~~(Math.random() * 30) + 1
          });
        }

        var pack = d3.pack()
          .size([self.size, self.size])
          //.nodes(x).shift().children;

        self.islands = pack(d3.hierarchy(islands)).children;

        var innerHolder;

        self.islands.forEach(function(v, i) {

          v.data = self.generateIsland(v.x, v.y, (v.r * 2) - 10, v.data.roadPoints, v.data.seed)

          innerHolder = drawMaps(v.data.coastLine, v.data.drawnPath, self.lineThickness, mapColors, targetCanvas, targetCtx, holder, {
            ocean: i == 0,
            road: false,
            smooth: true,
            pois: true,
            class: 'map-canvas',
            append: i == (islandNum - 1)
          })
        })

        self.paper = $('#map-holder').oriDomi({
          vPanels: 6
        }).oriDomi(true);
        //self.paper.accordion(10, 'right');

        self.openMap = function() {
          $('#map-interaction-holder').show();
          self.paper.accordion(0)
        }

        self.drawDetailIsland = function(index, openMap) {
          if (self.paper && openMap) {
            self.paper.accordion(80, 'right');
            $('#map-interaction-holder').hide();
          }

          var holder = $element.find('#island-holder');
          holder.empty();

          $('.detail-overlay').remove();
          var targetCanvas = $('<canvas height="' + (canvasSize) + '" width="' + (canvasSize) + '"></canvas>');
          var targetCtx = targetCanvas[0].getContext('2d');

          var island = self.generateIsland(self.size / 2, self.size / 2, self.size, self.islands[index].data.roadPoints, self.islands[index].data.seed)

          drawMaps(island.coastLine, island.drawnPath, self.lineThickness * 2, realColors, targetCanvas, targetCtx, holder, {
            ocean: true,
            road: true,
            smooth: true,
            pois: true,
            class: 'detail-overlay',
            append: true
          });
        }

        setTimeout(function() {
          self.drawDetailIsland(0, false);

        }, 100);

      }]
    };
  });
