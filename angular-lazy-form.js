'use strict';

function lazyFormService(){
  var lazyFormService = {};
  var uniqueID = 0;

  function FormField(props){
    this._id = '_' + uniqueID++;
    this._name = props._name;
    this.name = props.name;
    this.mandatory = props.mandatory || false;
    this.value = props.value || '';
    this.type = props.type || 'input';
  };

  function niceName(name){
    var newName = name+'';
    //kill control
    ['text', 'url'].forEach(function(prefix){
      if (((name+'')).substr(0,prefix.length) === prefix){
        newName = ((name+'')).substr(prefix.length);
        if (prefix === 'url'){
          newName += ' URL';
        }
      }
    });

    if (newName.substr(0,1) !== newName.substr(0,1).toUpperCase()){
      newName = newName.substr(0,1).toUpperCase() + newName.substr(1);
    }

    return newName;
  }


  //creates form out of json object
  lazyFormService.generateForm = function(obj){
    var formFields = [],
        xType, //type of current object property
        typeHandler = {};


    typeHandler['string'] = function(name, value){
      var isTextArea = ((name+'')).substr(0,4) === 'text';

      var props = {
        _name: name,
        name: niceName(name),
        type: isTextArea ? 'textarea' : 'text',
        value: value
      };
      return new FormField(props);
    };

    typeHandler['number'] = function(name, value){
      var props = {
        _name: name,
        name: niceName(name),
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

    typeHandler['text'] = function(value){
      return '' + value;
    };

    typeHandler['textarea'] = function(value){
      return '' + value;
    };    

    typeHandler['number'] = function(value){
      return value || 0;
    };

    for (var i=0, ii=source.length; i<ii; i+=1){
      field = source[i];
      if (typeHandler[field.type]){
        target[field._name] = typeHandler[field.type](field.value);
        console.log(field._name + 'updated to', target[field.name]);
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
        '<legend ng-if="!newRecord">Edit <span ng-bind="id"></span></legend>',
        '<legend ng-if="newRecord">New Record</legend>',

        '<!-- Text input-->',
        '<div ng-if="newRecord" class="form-group">',
          '<label class="col-md-4 control-label" for="textinput">Filename</label>  ',
          '<div class="col-md-8">',
          '<input ng-model="ctrl.newId" type="text" placeholder="" class="form-control input-md">',
          '<span ng-if="field.hint" class="help-block">help</span> ',
          '</div>',
        '</div>',
        
        '<div ng-repeat="field in formFields">',

          '<!-- Text input-->',
          '<div ng-if="field.type==\'text\'" class="form-group">',
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


          '<!-- Textarea -->',
          '<div ng-if="field.type==\'textarea\'" class="form-group">',
            '<label ng-bind="field.name" class="col-md-4 control-label" for="textarea">Text Area</label>',
            '<div class="col-md-8">',
              '<textarea class="form-control" name="{{field.name}}" ng-model="field.value"></textarea>',
            '</div>',
          '</div>',


        '</div>',

        '<!-- Button (Double) -->',
        '<div class="form-group">',
          '<label class="col-md-4 control-label"> </label>',
          '<div class="col-md-8">',
            '<button ng-click="save()" ng-disabled="ctrl.isEqual()" class="btn btn-success">Save</button> ',
            '<button ng-click="ctrl.reset()" class="btn btn-default">Reset</button>',
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
      'id':'=?',
      'formHelper':'=',
      'onSave': '&'
    },
    controller: function($scope){
      $scope.ctrl = {
        newId: '',
        isEqual: function(){
          return angular.equals($scope.originalFields, $scope.formFields);
        },
        reset: function(){
          $scope.formFields = angular.copy($scope.originalFields);
        }
      };
      $scope.save = function(){
        if ($scope.newRecord){
          $scope.id = $scope.ctrl.newId;
          console.log('save', $scope.id, $scope.ctrl.newId);
        }

        lazyFormService.updateFields($scope.formData, $scope.formFields);
        $scope.onSave({id:$scope.id, doc: $scope.formData});
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
          $scope.originalFields = angular.copy($scope.formFields);

          $scope.newRecord = ($scope.id.indexOf('/_new') >= 0);
        }
      }, true);

    }
  };
}


angular.module('angularLazyForm', [])
  .factory('lazyFormService', lazyFormService)
  .directive('lazyForm', LazyFormDirective);