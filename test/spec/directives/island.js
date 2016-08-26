'use strict';

describe('Directive: island', function () {

  // load the directive's module
  beforeEach(module('islandApp'));

  var element,
    scope;

  beforeEach(inject(function ($rootScope) {
    scope = $rootScope.$new();
  }));

  it('should make hidden element visible', inject(function ($compile) {
    element = angular.element('<island></island>');
    element = $compile(element)(scope);
    expect(element.text()).toBe('this is the island directive');
  }));
});
