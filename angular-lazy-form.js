'use strict';

function lazyFormService(){
  var lazyFormService = {};
  var uniqueID = 0;

  var rowSize = {
    1: [12,4, 8],
    2: [6, 4, 8],
    3: [4, 5, 7],
    4: [3, 6, 6],
    6: [2, 6, 6]
  };

  function FormField(props){
    this._id = '_' + uniqueID++;
    this._name = props._name || '';
    this.name = props.name || '';
    this.mandatory = props.mandatory || false;
    this.value = props.value || '';
    this.type = props.type || 'input';
    this.options = props.options || [];

    if (rowSize[props.rowSize]){
      this.width = rowSize[props.rowSize][0];      
      this.widthCaption = rowSize[props.rowSize][1];
      this.widthField = rowSize[props.rowSize][2];
    } else {
      this.widthCaption = 12; 
      this.widthCaption = 4;
      this.widthField = 8;
    }
  };

  function niceName(name){
    var newName = name+'';
    //kill control
    ['text', 'url', 'select'].forEach(function(prefix){
      if (((name+'')).substr(0,prefix.length) === prefix){
        newName = ((name+'')).substr(prefix.length);
        newName = newName.replace(/([a-z])([A-Z])/g, '$1 $2');
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
  lazyFormService.generateForm = function(obj, helper){
    var formFields = [],
        typeHandler = {};

    /**
     * If JSON attribute is a string create either
     * - text field
     * - textarea
     * - select field
     */
    typeHandler['string'] = function(name, value, path, mods){
      var isTextArea = ((name+'')).substr(0,4) === 'text';
      var isSelect = ((name+'')).substr(0,6) === 'select';

      var type = isTextArea ? 'textarea' : 'text';
      type = isSelect ? 'select' : type;

      var props = {
        _name: path + name,
        name: niceName(name),
        type: type,
        value: value
      };

      if (isSelect){
        if (!angular.isArray(helper[name])){
          throw 'generateForm: select field ' + name + 
          ' must have array of values defined in form-helper['+name+'] '; 
        }
        props.options = helper[name];
      }
      angular.copy(props, mods);
      return new FormField(props);
    };

    /**
     * If JSON attribute is a number create a number field
     */
    typeHandler['number'] = function(name, value, path, mods){
      var props = {
        _name: path + name,
        name: niceName(name),
        type: 'number',
        value: value || 0
      };
      angular.extend(props, mods);
      console.log('number', props);
      return new FormField(props);
    };

    /**
     * If JSON Attribute is a object
     */
    typeHandler['object'] = function(name, value, path){
      //analyse object
      var mods = {
        rowSize:1
      };

      var analysis = {
        count: 0,
        types:{
          number: 0,
          string: 0,
          object: 0
        }
      };

      for (var x in value){
        analysis.count += 1;
        analysis.types[typeof value[x]] += 1;
      }

      if (analysis.count === analysis.types.number &&
          (
            analysis.count === 2 ||
            analysis.count === 3 ||
            analysis.count === 4  
          )){
        mods.rowSize = analysis.count;
        
      }
      console.log('mods', mods, analysis);

      //subobject header
      formFields.push(new FormField({
        type: 'h2',
        name: niceName(name) 
      }));

      var objectType = 'default';
      //

      if (objectType === 'default'){
        analyseObj(value, path + name + '.', mods);
      }

      //subobject footer
      formFields.push(new FormField({
        type: 'hr'
      }));      
      return false;
    };

    /**
     * Analyse the current object
     */
    var analyseObj = function(obj, path, mods){
      var xType; //type of current object property
      //run type handler for all object properties
      for (var x in obj){
        xType = (typeof obj[x]); 
        if (typeHandler[xType]){
          var newField = typeHandler[xType](x, obj[x], path || '', mods);
          if (angular.isObject(newField)){
            formFields.push(newField);
          }
        } else {
          throw 'generateForm: no handler for attribute type ' + xType;
        }
      }
    }

    analyseObj(obj); //start the madness

    return formFields;
  };


  var updateTypeHandler = {};

  updateTypeHandler['text'] = function(value){
    return '' + value;
  };

  updateTypeHandler['textarea'] = function(value){
    return '' + value;
  };    

  updateTypeHandler['number'] = function(value){
    return value || 0;
  };

  updateTypeHandler['select'] = function(value){
    return '' + value;
  };      

  lazyFormService.updateField = function(target, field){
    if (field._name){
      var targetObject = target,
          fieldPath = field._name.split('.');

      var finalAttribute = fieldPath[fieldPath.length-1];

      for (var i=0, ii=fieldPath.length-1;i<ii;i+=1){
        targetObject = targetObject[fieldPath[i]];
      }

      if (updateTypeHandler[field.type]){
        targetObject[finalAttribute] = updateTypeHandler[field.type](field.value);
        //console.log(field._name + 'updated to', targetObject[finalAttribute]);
      }
    }
  };  

  //applies form changes to target model
  lazyFormService.updateFields = function(target, source){
    var field; //current field
    console.log('updateFields', target, source);
    for (var i=0, ii=source.length; i<ii; i+=1){
      field = source[i];
      lazyFormService.updateField(target, field);
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
        
        '<div ng-repeat="field in formFields" class="col-md-{{field.width}}">',

          '<!-- Text input-->',
          '<div ng-if="field.type==\'text\'" class="form-group">',
            '<label ng-bind="field.name" class="col-md-{{field.widthCaption}} control-label" for="textinput">Text Input</label>  ',
            '<div class="col-md-{{field.widthField}}">',
            '<input name="{{field.name}}" ng-model="field.value" ng-change="ctrl.updateLive(field)" type="text" placeholder="" class="form-control input-md">',
            '<span ng-if="field.hint" class="help-block">help</span> ',
            '</div>',
          '</div>',

          '<!-- Number input-->',
          '<div ng-if="field.type==\'number\'" class="form-group">',
            '<label ng-bind="field.name" class="col-md-{{field.widthCaption}} control-label" for="textinput">Text Input</label>  ',
            '<div class="col-md-{{field.widthField}}">',
            '<input name="{{field.name}}" ng-model="field.value" ng-change="ctrl.updateLive(field)" type="number" placeholder="0" class="form-control input-md">',
            '<span ng-if="field.hint" class="help-block">help</span> ',
            '</div>',
          '</div>',


          '<!-- Textarea -->',
          '<div ng-if="field.type==\'textarea\'" class="form-group">',
            '<label ng-bind="field.name" class="col-md-{{field.widthCaption}} control-label" for="textarea">Text Area</label>',
            '<div class="col-md-{{field.widthField}}">',
              '<textarea class="form-control" name="{{field.name}}" ng-model="field.value" ng-change="ctrl.updateLive(field)"></textarea>',
            '</div>',
          '</div>',

          '<!-- Select Basic -->',
          '<div ng-if="field.type==\'select\'" class="form-group">',
            '<label ng-bind="field.name" class="col-md-{{field.widthCaption}} control-label" for="{{field.name}}"></label>',
            '<div class="col-md-{{field.widthField}}">',
              '<select ng-model="field.value" ',
                      'ng-change="ctrl.updateLive(field)" ',
                      'ng-options="value for value in field.options" ',
                      'name="{{field.name}}" class="form-control">',
              '</select>',
          '  </div>',
          '</div>',

          //additional styles
          '<legend ng-if="field.type===\'h2\'"><small ng-bind="field.name"></small></legend>',

          '<div class="col-md-12" ng-if="field.type===\'hr\'">&nbsp;</div>' +

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
        updateLive: function(field){
          lazyFormService.updateField($scope.liveData, field);
        },
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
          //console.log('save', $scope.id, $scope.ctrl.newId);
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
          
          $scope.formFields = lazyFormService.generateForm(newval, $scope.formHelper);
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