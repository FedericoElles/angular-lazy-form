'use strict';

function lazyFormService(){
  var lazyFormService = {};
  var uniqueID = 0;

  function FormField(props){
    this._id = '_' + uniqueID++;
    this.name = props.name;
    this.mandatory = props.mandatory || false;
    this.value = props.value || '';
    this.type = props.type || 'input';
  };

  //creates form out of json object
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

    typeHandler['number'] = function(name, value){
      var props = {
        name: name,
        type: 'number',
        value: value || 0
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


  //applies form changes to target model
  lazyFormService.updateFields = function(target, source){
    var field, //current field
        typeHandler = {};

    typeHandler['input'] = function(value){
      return '' + value;
    };

    typeHandler['number'] = function(value){
      return value || 0;
    };

    for (var i=0, ii=source.length; i<ii; i+=1){
      field = source[i];
      if (typeHandler[field.type]){
        target[field.name] = typeHandler[field.type](field.value);
        console.log(field.name + 'updated to', target[field.name]);
      }
    }
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

        
        '<div ng-repeat="field in formFields">',

          '<!-- Text input-->',
          '<div ng-if="field.type==\'input\'" class="form-group">',
            '<label ng-bind="field.name" class="col-md-4 control-label" for="textinput">Text Input</label>  ',
            '<div class="col-md-8">',
            '<input name="{{field.name}}" ng-model="field.value" type="text" placeholder="" class="form-control input-md">',
            '<span ng-if="field.hint" class="help-block">help</span> ',
            '</div>',
          '</div>',

          '<!-- Number input-->',
          '<div ng-if="field.type==\'number\'" class="form-group">',
            '<label ng-bind="field.name" class="col-md-4 control-label" for="textinput">Text Input</label>  ',
            '<div class="col-md-8">',
            '<input name="{{field.name}}" ng-model="field.value" type="number" placeholder="0" class="form-control input-md">',
            '<span ng-if="field.hint" class="help-block">help</span> ',
            '</div>',
          '</div>',

        '</div>',

        '<!-- Button (Double) -->',
        '<div class="form-group">',
          '<label class="col-md-4 control-label"> </label>',
          '<div class="col-md-8">',
            '<button ng-click="save()" class="btn btn-success">Save</button> ',
            '<button class="btn btn-default">Reset</button>',
          '</div>',
        '</div>',

        '</fieldset>',
        '</form>',
        '<pre ng-bind="formFields | json"></pre>',
        '<pre ng-bind="formData | json"></pre>',
      '</div>'
    ].join(''),
    restrict: 'E',
    scope:{
      'formData':'=',
      'liveData':'=?',
      'formHelper':'=',
      'onSave': '&'
    },
    controller: function($scope){
      $scope.save = function(){
        lazyFormService.updateFields($scope.formData, $scope.formFields);
        $scope.onSave();
      };
    },
    link: function ($scope, $element, $attrs) {
      console.log('$scope', $scope);

      //parse input into form
      $scope.$watch(function(){
        return $scope.formData;
      }, function(newval, oldval){
        if (typeof newval === 'object'){
          $scope.liveData = angular.copy(newval); //good idea?
          $scope.formFields = lazyFormService.generateForm(newval);
        }
      }, true);

    }
  };
}


angular.module('angularLazyForm', [])
  .factory('lazyFormService', lazyFormService)
  .directive('lazyForm', LazyFormDirective);