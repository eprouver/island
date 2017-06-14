'use strict';

angular.module('islandApp')
  .directive('islandPixel', function() {

    return {
      templateUrl: '/views/island.html',
      restrict: 'E',
      replace: true,
      scope: {
        progressService: '='
      },
      controllerAs: 'islandCtrl',
      controller: ['$scope', '$element', function($scope, $element) {

        var self = this;
        self.margin = 50;
        self.size = window.innerWidth * 1.25;
        self.seed = 1;
        self.lowerBound = 0.25;
        self.higherBound = 1;
        self.margin = 10;
        self.outterPoints = 10;
        self.coastVar = 30;
        self.breaks = 2;
        self.random = false;
        self.scaler = 1;
        self.zoom = 1;
        self.map = false;
        self.lineThickness = self.size * 0.7;
        self.islandNum = 2;
        self.empties = 1;

        // var testColors = {
        //   ocean: '#000',
        //   water: '#222',
        //   sand: '#444',
        //   path: '#666',
        //   grass: '#888',
        //   marker: '#aaa'
        // }

        var realColors = {
          ocean: '#0183A6',
          water: '#00bcf0',
          sand: '#F4F784',
          path: '#f5941d',
          grass: '#53990c',
          marker: '#C97D20',
          startColor: '#80FF00',
          endColor: '#DB2A2A',
          air: '#fefefe'
        }

        // var mapColors = {
        //   ocean: '#c4ac7c',
        //   water: '#D7BE8D',
        //   sand: '#354536',
        //   path: '#5e6a58',
        //   grass: '#c4ac7c',
        //   marker: 'yellow' //'#9e391a'
        // }

        var roadMin = 0.4;
        var canvasSize = self.size + self.margin;
        var seed = self.seed;

        $scope.$watch('progressService', function(n,o){
          if(n){
            seed = parseFloat(($scope.progressService.trackId || ($scope.progressService.grade + $scope.progressService.subject)).replace(/\D+/g, '').splice(1,'.'));
          }
        })

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

        function drawMaps(coastLine, drawnPath, lineThickness, colors, targetCanvas, targetCtx, options) {
          if (!options) {
            options = {};
          }

          targetCtx.save();

          //Draw ocean
          if (options.ocean) {
            var img = document.getElementById("rm-water");
            var pat = targetCtx.createPattern(img, "repeat");

            targetCtx.save();
            targetCtx.fillStyle = pat;
            targetCtx.rect(0, 0, targetCanvas[0].width, targetCanvas[0].height);
            targetCtx.fill();
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
          targetCtx.lineWidth = lineThickness / 35;
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
            var ropt = [{
              t: 50,
              c: '#fff'
            }, {
              t: 60,
              c: '#444'
            }, {
              t: 1000,
              c: '#fff'
            }]

            for (var r = 0; r < 3; r++) {
              targetCtx.save();
              if (r == 2) {
                targetCtx.setLineDash([lineThickness / 300, lineThickness / 300]);
              }

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

              targetCtx.lineJoin = 'round';
              targetCtx.lineCap = 'round';
              targetCtx.lineWidth = (lineThickness / ropt[r].t);
              targetCtx.strokeStyle = ropt[r].c;
              targetCtx.stroke();
              targetCtx.restore();
            }
          }

          //Draw Houses
          if (options.housePoints) {
            _(options.housePoints).sort(function(a, b) {
              return a.y - b.y;
            }).forEach(function(p, i) {
              if (i > 0) {
                var houseImg = document.getElementById("rm-house");
                targetCtx.drawImage(houseImg, p.x - 20, p.y - 20);
              }

            })
          }

          if (options.center && drawnPath.length > 2) {
            // targetCtx.fillStyle = 'black';
            // targetCtx.fillRect(options.center.x, options.center.y, 10, 10);

            // var mountImage = document.getElementById("rm-mount");
            // targetCtx.drawImage(mountImage, options.center.x - 64, options.center.y - 128);

          }


          //Draw POIs
          if (options.pois) {
            _(drawnPath).filter(function(p, i) {
              if (p._bend) {
                return false;
              }
              return true;
            }).filter(function(p, i) {
              if (options.hideComplete) {
                if (options.scores[i] == 3) {
                  return false;
                }
              }
              return true;
            }).forEach(function(p, i, arr) {

              targetCtx.save();

              targetCtx.beginPath();
              targetCtx.arc(p.x, p.y, lineThickness / 150 * (options.road ? 1 : 1.4), 0, 2 * Math.PI, false);
              targetCtx.strokeStyle = null;

              if (options.direction) {
                if (i == 0) {
                  targetCtx.fillStyle = colors.startColor;
                } else if (i == arr.length - 1) {
                  targetCtx.fillStyle = colors.endColor;
                } else {
                  targetCtx.fillStyle = colors.marker;

                }
              }

              targetCtx.closePath();
              targetCtx.fill();
              targetCtx.restore();

            })
          }

          targetCtx.restore();

          return;
        };

        self.append = function(targetCanvas, addClass, holder) {
          var innerHolder = $('<div>').addClass(addClass);
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

        self.generateIsland = function(x, y, size, roadPoints, overSeed) {
          seed = overSeed;

          var islandData = {
            roadPath: [],
            seed: overSeed,
            roadPoints: roadPoints,
            housePoints: []
          };

          islandData.center = new Victor(x, y);
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
                .add(islandData.center);


              //Add a middle point
              if (outterPath.length) {
                for (var j = 0; j < 2; j++) {
                  var last = _(outterPath).last().clone();
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
              var direction = (random() > 0.5) ? 1 : -1;
              var angle, p, pAngle, roadMax;

              for (var i = 0; i < roadPoints; i++) {
                //determine which coastline points you are between and select the one with the smaller distance from center
                angle = ((i) / roadPoints) * Math.PI * 1.6 * direction;

                //create a vector rotated & scaled to somewhere on that length
                p = new Victor(0, 1)
                  .rotate(angle)

                pAngle = p.verticalAngle();

                //Check all coastal points that are the same angle direction from center
                roadMax = getBoundingDistance(pAngle, coastLine, islandData.center);

                p.multiplyScalar(roadMax * 0.99)
                  .add(islandData.center)

                islandData.roadPath.push(p.unfloat());
              }

              if (roadPoints > 2 || roadPoints == 0) {
                var houses = 3 + ~~(random() * roadPoints)
                for (var i = 0; i < houses; i++) {
                  angle = ((i) / roadPoints) * Math.PI * 1.6 * direction;

                  p = new Victor(0, 1)
                    .rotate(angle)
                  pAngle = p.verticalAngle();

                  //Check all coastal points that are the same angle direction from center
                  roadMax = getBoundingDistance(pAngle, coastLine, islandData.center);

                  p.multiplyScalar(-roadMax * random() * 0.3)
                    .add(islandData.center)

                  islandData.housePoints.push(p.unfloat());
                }

              }

              //Add Middle Road Bends
              var drawnPath = [];

              function moveMiddle(start, end) {
                var middle = getMiddlePoint(start, end);
                var pAngle = middle.clone().subtract(islandData.center).verticalAngle();
                var roadMax = getBoundingDistance(pAngle, coastLine, islandData.center);

                if (middle.clone().subtract(islandData.center).length() > roadMax) {
                  while (middle.clone().subtract(islandData.center).length() > roadMax) {
                    middle.add(islandData.center.clone().subtract(middle).multiplyScalar(0.1))
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



        self.drawIsland = function() {
          self.empties = ~~(random() * 6);
          var holder = $element.find('#island-holder');
          self.islandNum = $scope.progressService.currentTopics.length + self.empties;
          holder.empty();
          var targetCanvas = $('<canvas height="' + (canvasSize) + '" width="' + (canvasSize) + '"></canvas>');
          var targetCtx = targetCanvas[0].getContext('2d');

          var islands = {
            children: []
          }

          var totalSize = self.size;
          var next = 0;
          var totalPois = $scope.progressService.currentTopics.reduce(function(c, n) {
            return c + n.poisNum;
          }, 0);

          totalPois = totalPois + self.empties;

          for (var i = 0; i < self.islandNum; i++) {
            var poisNum = $scope.progressService.currentTopics[i] ? $scope.progressService.currentTopics[i].poisNum : 0;
            var size = ((poisNum || 1) / totalPois) * totalSize;
            totalSize -= size;
            islands.children.push({
              value: size,
              margin: 20,
              seed: random(),
              roadPoints: $scope.progressService.currentTopics[i] ? $scope.progressService.currentTopics[i].poisNum : 0,
              next: (i == next)
            });
          }

          var pack = d3.layout.pack()
            .size([self.size, self.size])
            .sort(function(a, b) {
              return a.value - b.value;
            })
            .value(function(d) {
              return d.value;
            })
            .padding(30)

          self.islands = pack.nodes(islands);

          self.islands.shift();

          var innerHolder;

          self.drawDetailIsland = function(index, openMap) {

            self.currentTopic = $scope.progressService.currentTopics[index];
            self.currentPois = $scope.progressService.pois.filter(function(v) {
              return v.topicIndex == index
            });

            var holder = $element.find('#island-holder');
            holder.empty();

            $('.detail-overlay').remove();
            var targetCanvas = $('<canvas height="' + (canvasSize) + '" width="' + (canvasSize) + '"></canvas>');
            var targetCtx = targetCanvas[0].getContext('2d');

            var island = self.generateIsland(self.size / 2, self.size / 2, self.size, self.islands[index].roadPoints, self.islands[index].seed)
            self.currentIsland = island;

            drawMaps(island.coastLine, island.drawnPath, self.lineThickness * 2, realColors, targetCanvas, targetCtx, {
              ocean: true,
              road: true,
              smooth: true,
              pois: true,
              class: 'detail-overlay',
              append: true,
              direction: true,
              finished: 3
            });
          }

          //Draw the map (with all of the islands)
          var pois = angular.copy($scope.progressService.pois);
          self.islands.forEach(function(v, i) {

            v.islandData = self.generateIsland(v.x, v.y, (v.r * 2) - 10, v.roadPoints, v.seed);
            v.islandData.roadPath.forEach(function(p, i) {
              p.poi = pois.shift();
            })

            drawMaps(v.islandData.coastLine, v.islandData.drawnPath, self.lineThickness * 1.4, realColors, targetCanvas, targetCtx, {
              ocean: i == 0,
              road: v.roadPoints > 0,
              smooth: true,
              pois: v.roadPoints > 0,
              hideComplete: false,
              direction: true,
              scores: $scope.progressService.pois.filter(function(v) {
                return v.topicIndex == i
              }).map(function(v) {
                return v.stars
              }),
              center: v.islandData.center
              //housePoints: v.islandData.housePoints
            })
          });

          var flagImg = document.getElementById("rm-finish-flag");
          var oversea = _.chain(self.islands).map(function(v) {
            return [_(v.islandData.drawnPath).first(), _(v.islandData.drawnPath).last()];
          }).flatten().shift().value();
          oversea = oversea.slice(0, oversea.length - self.empties)

          targetCtx.save();
          targetCtx.setLineDash([10, 10]);
          targetCtx.lineWidth = 4;
          targetCtx.strokeStyle = realColors.air;
          var method = 0;

          _.chain(oversea).filter(function(v) {
            return v;
          }).each(function(p, i, arr) {

            targetCtx.shadowColor = 'rgba(0,0,0, 0.8)';
            targetCtx.shadowBlur = 20;
            targetCtx.shadowOffsetX = 15;
            targetCtx.shadowOffsetY = 15;

            if (i % 2 == 1) {
              if (method % 2 == 1) {
                var offset = -(self.size / 3) * random();
              } else {
                var offset = (self.size / 3) * random();
              }
              targetCtx.bezierCurveTo(arr[i - 1].x, p.y - offset, p.x, p.y - offset, p.x, p.y);

              method += 1;


            } else {
              targetCtx.drawImage(flagImg, p.x - 21, p.y - 47);
              if (i !== 0) {
                targetCtx.globalAlpha = 0.6;
                targetCtx.stroke();
                targetCtx.globalAlpha = 1;
              }

              targetCtx.beginPath();
              targetCtx.moveTo(p.x, p.y);
            }
          })

          targetCtx.restore();


          self.append(targetCanvas, 'map-canvas', holder);

          // setTimeout(function() {
          //   self.drawDetailIsland(0, false);
          //
          // }, 1000);
        }


      }]
    };
  });
