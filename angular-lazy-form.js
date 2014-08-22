'use strict';

function lazyFormService(){
  var lazyFormService = {};
  var uniqueID = 0;

  function FormField(props){
    this._id = '_' + uniqueID++;
    this.name = props.name || 'unknown';
    this.mandatory = props.mandatory || false;
    this.value = props.value || '';
    this.type = props.type || 'input';
  };

  lazyFormService.generateForm = function(obj){
    var formFields = [],
        xType, //type of current object property
        typeHandler = {};


    typeHandler['string'] = function(name, value){
      var props = {
        name: name,
        type: 'input',
        value: value
      };
      return new FormField(props);
    };


    //run type handler for all object properties
    for (var x in obj){
      xType = (typeof obj[x]);
      if (typeHandler[xType]){
        formFields.push(typeHandler[xType](x, obj[x]));
      }
    }

    return formFields;
  };

  return lazyFormService;
}



function LazyFormDirective(lazyFormService){
  return {
    template: [
      '<div class="some-directive">',
        '<form novalidate name="lazy" class="form-horizontal">',
        '<fieldset>',

        '<!-- Form Name -->',
        '<legend>Lazy Form</legend>',

        '</fieldset>',
        '</form>',
        '<pre ng-bind="formFields | json"></pre>',
        '<pre ng-bind="formData | json"></pre>',
      '</div>'
    ].join(''),
    restrict: 'E',
    scope:{
      'formData':'=',
      'formHelper':'='
    },
    link: function ($scope, $element, $attrs) {
      console.log('$scope', $scope);



      //parse input into form
      $scope.$watch(function(){
        return $scope.formData;
      }, function(newval, oldval){
        if (typeof newval === 'object'){
          $scope.formFields = lazyFormService.generateForm(newval);
        }
      }, true);

    }
  };
}


angular.module('angularLazyForm', [])
  .factory('lazyFormService', lazyFormService)
  .directive('lazyForm', LazyFormDirective);