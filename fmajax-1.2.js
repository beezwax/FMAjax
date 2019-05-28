/**
 * FMAjax Javascript Library v1.2
 * https://github.com/beezwax/FMAjax
 *
 * Must be used with accompanying FileMaker module
 *
 * Created by Ryan Simms for beezwax data tools
 * ryansimms.com
 *
 * Date: 2015-9-10
 */
(function (window, document, undefined) {
  'use strict';
  var self = {},
      namespace = 'fmajax',
      _overwritten = window[namespace], // store existing 'fmajax' variable in case of overwrite
      _create;

  _create = function() {
    var getFileUrlString = 'getfile_',
        timeoutLimit = 3000,
        timeoutTimer,
        dataReceivedCallback,
        dataFailCallback,
        hashChangeCallback,
        dbName,
        noOp = function() {},

    // private methods
        _init,
        _handleHashChange,
        _hash,
        _objectToGetParams,
        _scriptBlock,
        _clickAnchorTag,
        _getParamsToObject,
        _extend,

    // public methods
        noConflict,
        setParams,
        callFmpURL,
        fmpURL,
        getFile,
        receiveData,
        urlParam;

    _extend = function (obj, src) {
      Object.keys(src).forEach(function(key) { obj[key] = src[key]; });
      return obj;
    };

    _init = function() {
      window.addEventListener('hashchange', _handleHashChange);
      dbName = urlParam('db');
    };

    _handleHashChange = function () {
      var datafile;
      var hash = _hash();

      if(hash.substr(0, getFileUrlString.length) === getFileUrlString) {
        datafile = hash.substr(hash.indexOf('_', getFileUrlString.length) + 1);
        getFile({file: datafile});
      } else if(typeof hashChangeCallback === 'function'){
        hashChangeCallback(hash);
      }
    };

    _hash = function() {
      var hash = window.location.hash ? decodeURIComponent(window.location.hash.substring(1)) : '';
      /* if the first character of the hash is a number, the webviewer fails to recognize it,
      so we escape it with an underscore */
      if(hash.substr(0, 1) === '_') {
        hash = hash.substr(1);
      }
      return hash
    };

    _objectToGetParams = function (obj) {
      function mapKey(key) {
        return '&' + encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]);
      }

      return Object.keys(obj || {}).map(mapKey).join('');
    };

    _getParamsToObject = function (string) {
      function paramToArray(paramPair) {
        return paramPair.split(/=(.+)?/).slice(0, 2)
      }

      function arraysToObject(obj, pairArray) {
        var decoded = pairArray[1] === undefined ? undefined : decodeURIComponent(pairArray[1]);
        obj[decodeURIComponent(pairArray[0])] = decoded;
        return obj;
      }

      return string
          .map(paramToArray)
          .reduce(arraysToObject, {});
    };

    _scriptBlock = function(p) {
      var scriptBlock = document.createElement('script'),
          remove,
          onloadTimer;

      remove = function() {
        if (document.body.contains(scriptBlock)) {
          scriptBlock.parentElement.removeChild(scriptBlock);
        }
        clearTimeout(onloadTimer);
      };

      scriptBlock.type = 'text/javascript';

      /* utc is added as parameter to the filename to prevent the file being retrieved from cache */
      scriptBlock.src = p.file + '?' + (new Date()).getTime();

      scriptBlock.addEventListener('error', function() {
        p.fail();
        remove();
      });

      if (scriptBlock.readyState){  // ie
        scriptBlock.onreadystatechange = function(){
          if (['loaded', 'complete'].indexOf(scriptBlock.readyState) > -1){
            scriptBlock.onreadystatechange = null;
            p.success();
            remove();
          }
        };
      } else {  // others
        scriptBlock.onload = function(e){
          p.success(e);
          remove();
        };
      }

      return {
        call: function () {
          onloadTimer = setTimeout(function() {
            if(scriptBlock){
              p.fail();
            }
          }, p.timeout);
          try {
            document.head.appendChild(scriptBlock);
          } catch (e) {
            p.fail();
            clearTimeout(onloadTimer)
          }
        }
      }
    };

    _clickAnchorTag = function(href) {
      var a = document.createElement('a');
      var body = document.getElementsByTagName('body')[0];

      a.href = href;
      a.style.display = 'none';
      body.appendChild(a);
      a.click();
      a.parentNode.removeChild(a);
    };

    /**
     * If called, this method returns the library so the user can assign it to a different variable.
     * It also restores the variable of conflicting name if one existed when the library was loaded.
     * @returns {Object} - this library
     *
     * newName = fmajax.noConflict();
     */
    noConflict = function() {
      if(window[namespace] !== undefined){
        window[namespace] = _overwritten;
        return self;
      } else {
        return false;
      }
    };

    /**
     * This method is called to set optional parameters, some of which are required for certain methods to function
     * @param {Object} p - wrapper object
     * @param {number} [p.timeoutLimit] - Time in milliseconds that the app should wait for a response
     * from FileMaker before calling the fail function
     * @param {string} [p.dbName] - The URL safe database name.  Necessary for the usage of callFmpURL()
     * @param {function} [p.onHashChange] - a function that is called when the hashchange event is triggered.
     * @param {boolean} [p.loadInitialHash] - determines if the hash should be processed on page load
     *
     * fmajax.setParams({
           'dbName': 'finance',
           'timoutLimit': 6000,
           'onHashChange': updateMessage,
           'loadInitialHash': true
          });
     */
    setParams = function(p) {
      p = p || {};
      timeoutLimit = p.timeoutLimit || timeoutLimit;
      dbName = p.dbName || dbName;
      hashChangeCallback = p.onHashChange;
      if(p.loadInitialHash) {
        _handleHashChange();
      }
    };

    /**
     * Construct a fmp:// url to call a script in FileMaker
     * @param {Object} p - wrapper object
     * @param {string} p.script - the name of the script to be called
     * @param {string} [p.db] - the name of the filemaker db to invoke
     * @param {string} [p.dbPath] - the path of the filemaker db to invoke
     * @param {string} [p.param] - FileMaker script parameter
     * @param {Object} [p.varObj] - an object literal of variables names and associated values to send to FileMaker
     *
     * @returns {string} - the fully constructed url
     *
     * fmajax.callFmpURL({
          script:'get_message',
          varObj:{'$_getmessage':1, '$_wv': fmajax.urlParam('wv')},
       });
     */
    fmpURL = function(p) {
      var baseUrl, scriptString, paramString;

      var defaults = {
        db: dbName,
        dbPath: '$'
      };

      if(p === undefined || p.script === undefined) {
        throw 'error: no script name provided to callFmpURL()';
      }

      p = _extend(defaults, p);

      if(!p.db.length) {
        throw 'callFmpURL is unavailable because the database filename has not been set. To pass necessary ' +
        'parameters, use ' + namespace + '.setParams() or set the "db" GET parameter in your web viewer url ' +
        'or in the $_GET_params variable at the top of the "fmajax.set_hash ( data )" Filemaker script.';
      }

      baseUrl = p.db ? 'fmp://' + p.dbPath + '/' + encodeURIComponent(p.db) : '';
      scriptString = '?script=' + encodeURIComponent(p.script);
      paramString = p.param !== undefined ? '&param=' + encodeURIComponent(p.param) : '';

      return baseUrl + scriptString + paramString + _objectToGetParams(p.varObj);
    };

    /**
     * Construct and calls an fmp:// url to call a script in FileMaker
     * @param {Object} p - wrapper object
     * @param {string} p.script - the name of the script to be called
     * @param {string} p.db - the name of the filemaker db to invoke
     * @param {string} [p.dbPath] - the path of the filemaker db to invoke
     * @param {function} [p.success] - this assumes that the calling function will be expecting a response,
     * this function is called if a response is received from FileMaker
     * @param {function} [p.fail] - this assumes that the calling function will be expecting a response,
     * this function is called if a response is not received from FileMaker before the specified timeout
     * @param {number} [p.timeout=timeoutLimit] - overrides the timeoutLimit set in setParams.
     * Time in milliseconds that the app should wait for a response from FileMaker before calling the fail function
     * @param {string} [p.param] - FileMaker script parameter
     * @param {Object} [p.varObj] - an object literal of variables names and associated values to send to FileMaker
     *
     * @returns {string} - the fully constructed url that was just called
     *
     * fmajax.callFmpURL({
            script:'get_message',
            timeout:6000,
            varObj:{'$_getmessage':1, '$_wv': fmajax.urlParam('wv')},
            success: showdata,
            fail: function(data) {
                alert(data);
            }
           });
     */
    callFmpURL = function(p) {
      var url,
          href;

      var defaults = {
        success: noOp,
        fail: noOp,
        timeout: timeoutLimit
      };

      p = _extend(defaults, p);

      dataReceivedCallback = p.success;
      dataFailCallback = p.fail;

      url = fmpURL(p);
      href = window.location.href;

      _clickAnchorTag(url);

      /* this fixes an internet explorer bug where the window would stop responding to hash changes set
      in the filemaker url field */
      if(href.indexOf('#') > -1) {
        setTimeout(function(){
          window.location.href = href;
        }, 1);
      }

      timeoutTimer = setTimeout(function() {
        if(typeof dataFailCallback === 'function') {
          dataFailCallback('no response from filemaker before timeout (' + p.timeout + 'ms)');
        }
      }, p.timeout);
      return url;
    };

    /**
     * Loads a javascript file
     * @param {Object|string} p - wrapper object
     * @param {string} p.file - name(or path) of the file to be loaded
     * @param {number} [p.timeout=timeoutLimit] - overrides the timeoutLimit set in setParams.
     * Time in milliseconds that the app should wait for the file to load
     * @param {function} [p.success] - this function is called if the file is successfully loaded
     * @param {function} [p.fail] - this function is called if a the file is not loaded before the specified timeout
     * @returns {boolean} - true is successfull
     *
     * fmajax.getFile({
            'file': 'tps_reports.js',
            'timeout': 1000,
            'success': function(e) {
                console.log(e);
            },
            'fail': function(data) {
                showErrorMessage('<br />fail: ' + data)
            }
        });
     */
    getFile = function (p) {
      var filename,
          timeout,
          successCallback = p.success,
          failureCallback = p.fail,
          scriptBlock,
          resolve;

      timeout = p.timeout || timeoutLimit;

      if (typeof p === 'object' && p.file && p.file.length) {
        filename = p.file;
      } else if (typeof p === 'string') {
        filename = p;
      } else {
        throw 'no file specified in call to getFile()';
      }

      resolve = function(status, errorMessage, evt) {
        if(status === 'success' && typeof successCallback === 'function') {
          successCallback(evt);
        } else if (status === 'fail') {
          errorMessage = !errorMessage ? "load failure for '" + filename + "'" : errorMessage;
        }

        scriptBlock = null;
        if(errorMessage && errorMessage.length && typeof failureCallback === 'function') {
          failureCallback(errorMessage);
        } else if(errorMessage && errorMessage.length) {
          throw errorMessage;
        }
      };

      scriptBlock = _scriptBlock({
        file: filename,
        success: function(e) { resolve('success', null, e) },
        fail: function() { resolve('fail') },
        timeout: timeout
      });

      /* if(scriptBlock) prevents premature manipulation if function is called multiple times before a
      script file loads.  This is why we set it to null after is is removed in _resolve() */
      if (scriptBlock) {
        scriptBlock.call()
      }
      return true;
    };
    /**
     * This should only be called by the file generated by FileMaker.  It should never be initiated manually.
     * @param data
     */
    receiveData = function(data) {
      clearTimeout(timeoutTimer);

      dataReceivedCallback(data);
      dataReceivedCallback = noOp;
    };

    /**
     * This method returns an object literal containing key:value pairs for each GET request in the url.
     * db(database name) and wv(instatiating web viewer layout object name) are sent by default.
     * More can be set via the $_GET_params variable at the top of the fmajax.set_hash ( data ) Filemaker script.
     * If a parameter is set with no value, its value is set to true
     * @name urlParam
     *
     * urlParam('wv') === 'wv_1'
     * urlParam.exists('db') === true
     */
    urlParam = (function () {
      var paramsString = location.search.split(/[?&]/).slice(1);
      var params = _getParamsToObject(paramsString);

      /**
       * @lends urlParam
       * @public
       * @param {string} param
       * @returns {string|undefined}
       */
      var getParam = function (param) {
        return params.hasOwnProperty(param) ? params[param] : undefined;
      };

      /**
       * @method urlParam.exists
       * @public
       * @param {string} param
       * @returns {boolean}
       */
      getParam.exists = function (param) {
        return params.hasOwnProperty(param);
      };

      /**
       * @method urlParam.all
       * @public
       * @returns {object}
       */
      getParam.all = function () {
        return params
      };

      return getParam;
    }());

    _init();

    /* public methods */
    return {
      noConflict: noConflict,
      setParams: setParams,
      fmpURL: fmpURL,
      callFmpURL: callFmpURL,
      getFile: getFile,
      receiveData: receiveData,
      urlParam: urlParam
    };
  };

  /* this will overwrite any existing window[namespace], but not before it is stored in _namespace
  where it can be restored with noConflict() */
  if(window[namespace] === undefined || window[namespace] !== self) {
    self = _create();
    window[namespace] = self;
  }

}(this, this.document));
