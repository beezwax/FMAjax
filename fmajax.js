/**
 * FMAjax Javascript Library v1.1
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
      _overwritten = window[namespace], // store existing fmajax variable in case of overwrite
      _create;

  _create = function() {
    var getfileurl = 'getfile_',
        timeout_limit = 3000,
        timeoutTimer,
        dataReceicedCallback,
        dataFailCallback,
        hashChangeCallback,
        db_name,
        busy = false,

    // private methods
        _init,
        _handleHashChange,
        _queue,

    // public methods
        noConflict,
        setParams,
        callFmpURL,
        getFile,
        receiveData,
        urlParam;

    _init = function() {
      window.addEventListener('hashchange', _handleHashChange);
    };

    _handleHashChange = function () {
      var hash = window.location.hash ? decodeURIComponent(decodeURIComponent(window.location.hash.substring(1))) : '';

      /* if the first character of the hash is a number, the webviewer fails to recognize it, so we escape it with an underscore */
      if(hash.substr(0,1) == "_") {
        hash = hash.substr(1);
      }
      if(hash.substr(0, getfileurl.length) === getfileurl) {
        busy = false;
        var datafile = hash.substr(hash.indexOf('_', getfileurl.length)+1);
        getFile({file: datafile});
      } else if(typeof hashChangeCallback === 'function'){
        hashChangeCallback(hash);
      }
    };

    /* if the script is already waiting for data when it is called again, this will queue up the following calls and execute them in order after the function completes */
    _queue = {
      array: [],
      wrap: function(fn, context, params) {
        return function() {
          fn.apply(context, params);
        };
      },
      push: function(fn, context, params) {
        this.array.push(this.wrap(fn, context, params));
      },
      call: function(){
        dataReceicedCallback = undefined;
        dataFailCallback = undefined;
        busy = false;
        if(this.array.length) {
          (this.array.shift())();
        }
      }
    };

    /**
     * If called, this method returns the library so the user can assign it to a different variable.  It also restores the variable of conflicting name if one existed when the library was loaded.
     * @returns {Object} - this library
     *
     * newName = fmajax.noConflict();
     */
    noConflict = function() {
      if(window.hasOwnProperty(namespace)){
        window[namespace] = _overwritten;
        return self;
      } else {
        return false;
      }
    };

    /**
     * This method is called to set optional parameters, some of which are required for certain methods to function
     * @param {Object} p - wrapper object
     * @param {number} [p.timeout_limit] - Time in milliseconds that the app should wait for a response from FileMaker before calling the fail function
     * @param {string} [p.db_name] - The URL safe database name.  Necessary for the usage of callFmpURL()
     * @param {function} [p.onHashChange] - a function that is called when the hashchange event is triggered.
     * @param {boolean} [p.loadInitialHash] - determines if the hash should be processed on page load
     *
     * fmajax.setParams({
           'db_name': 'finance',
           'timout_limit': 6000,
           'onHashChange': updateMessage,
           'loadInitialHash': true
          });
     */
    setParams = function(p) {
      p = p || {};
      timeout_limit = p['timeout_limit'] || timeout_limit;
      db_name = p['db_name'];
      hashChangeCallback = p.onHashChange;
      if(p['loadInitialHash']) {
        _handleHashChange();
      }
    };

    /**
     * Construct and calls an fmp:// url to call a script in FileMaker
     * @param {Object} p - wrapper object
     * @param {string} p.script - the name of the script to be called
     * @param {string} p.db - the name of the filemaker db to invoke
     * @param {string} p.dbPath - the path of the filemaker db to invoke
     * @param {function} [p.success] - this assumes that the calling function will be expecting a response, this function is called if a response is received from FileMaker
     * @param {function} [p.fail] - this assumes that the calling function will be expecting a response, this function is called if a response is not received from FileMaker before the specified timeout
     * @param {number} [p.timeout=timeout_limit] - overrides the timeout_limit set in setParams.  Time in milliseconds that the app should wait for a response from FileMaker before calling the fail function
     * @param {string} [p.param] - FileMaker script parameter
     * @param {Object} [p.var_obj] - an object literal of variables names and associated values to send to FileMaker
     * @param {boolean} [p.include_url_params] - when true, will map all url GET parameters to variable names
     *
     * @returns {string|boolean} - the fully constructed url that was just called or true if the script was loaded into the queue
     *
     * fmajax.callFmpURL({
            script:'get_message',
            timeout:6000,
            var_obj:{'$_getmessage':1, '$_wv': fmajax.urlParam('wv')},
            include_url_params: true,
            success: showdata,
            fail: function(data) {
                alert(data);
            }
           });
     */
    callFmpURL = function(p) {
      var timeout,
          param_str,
          var_str,
          key,
          url,
          href,
          db_path;

      db_name = p.db || db_name || urlParam('db');
      db_path = p.dbPath || '$';
      var fmpurl = db_name ? 'fmp://' + db_path + '/' + db_name : false;
      if(!fmpurl || !fmpurl.length) {
        throw 'callFmpURL is unavailable because the database filename has not been set. To pass necessary parameters, use ' + namespace + '.setParams() or set the "db" GET parameter in your web viewer url or in the $_GET_params variable at the top of the "fmajax.set_hash ( data )" Filemaker script.';
      }
      if(busy) {
        _queue.push(callFmpURL, this, arguments);
        return true;
      }

      if(p === undefined || p['script'] === undefined) {
        throw "error: no script name provided to callFmpURL()";
      }

      if(p.success && typeof p.success === 'function'){
        dataReceicedCallback = p.success;

        /* only wait for a response if a callback is defined */
        busy = true;
      }
      if(p.fail && typeof p.fail === 'function'){
        dataFailCallback = p.fail;
      }
      timeout = p['timeout'] || timeout_limit;

      param_str = p['param'] !== undefined ? "&param=" + encodeURIComponent(p['param']) : "";
      var_str = '';
      if (typeof p['var_obj'] === 'object') {
        for (key in p['var_obj']) {
          if (p['var_obj'].hasOwnProperty(key)) {
            var_str += "&" + encodeURIComponent(key);
            var_str += "=" + encodeURIComponent(p['var_obj'][key]);
          }
        }
      }
      if (p['include_url_params']) {
        var params = urlParam.all();
        for (key in params) {
          if (params.hasOwnProperty(key)) {
            var_str += "&$_" + encodeURIComponent(key);
            var_str += "=" + encodeURIComponent(params[key]);
          }
        }
      }
      url = fmpurl + "?script=" + encodeURIComponent(p['script']) + param_str + var_str;

      href = window.location.href;
      //window.location.href = url;
      var body = document.getElementsByTagName('body')[0];
      var a = document.createElement('a');
      a.href = url;
      a.style.display = 'none';
      body.appendChild(a);
      a.click();
      a.parentNode.removeChild(a);
      console.log(url);

      /* this fixes an internet explorer bug where the window would stop responding to hash changes set in the filemaker url field */
      if(href.indexOf('#') > -1) {
        setTimeout(function(){
          window.location.href = href;
        }, 1);
      }
      timeoutTimer = setTimeout(function() {
        if(typeof dataFailCallback === 'function') {
          dataFailCallback("no response from filemaker before timeout (" + timeout + "ms)");
          _queue.call();
        }
      }, timeout);
      return url;
    };

    /**
     * Loads a javascript file
     * @param {Object} p - wrapper object
     * @param {string} p.file - name(or path) of the file to be loaded
     * @param {number} [p.timeout=timeout_limit] - overrides the timeout_limit set in setParams.  Time in milliseconds that the app should wait for the file to load
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
    getFile =  function (p) {
      var filename,
          timeout;

      if(busy) {
        _queue.push(getFile, this, arguments);
        return true;
      }

      timeout = p.timeout || timeout_limit;

      filename = typeof p === 'object' && p.file && p.file.length ? p.file : typeof p === 'string' ? p : undefined;
      var successCallback = p.success,
          failureCallback = p.fail,
          script_block,
          date = new Date(),
          onloadTimer,
          _resolve;

      _resolve = function(status, error_message, evt) {
        if(status == 'success') {
          if(typeof successCallback === 'function') {
            successCallback(evt);
          }
        } else {
          error_message = !error_message ? "load failure for  '" + filename + "'" : error_message;
        }
        try {
          script_block.parentElement.removeChild(script_block);
        } catch (ignore) {}

        script_block = null;
        _queue.call();
        if(error_message && error_message.length){
          if(typeof failureCallback === 'function') {
            failureCallback(error_message);
          } else {
            throw error_message;
          }
        }
      };

      if(!filename) {
        throw "no file specified in call to getFile()";
      }
      busy = true;

      script_block = document.createElement('script');
      script_block.type = 'text/javascript';

      /* utc is added as parameter to the filename to prevent the file being retrieved from cache */
      script_block.src = filename + '?' + date.getTime();

      /* if(script_block) prevents premature manipulation if function is called multiple times before a script file loads.  This is why we set it to false after is is removed in _resolve() */
      if (script_block) {

        script_block.addEventListener('error', function() {
          clearTimeout(onloadTimer);
          _resolve('fail');
        });

        if (script_block.readyState){  // ie
          script_block.onreadystatechange = function(){
            if (script_block.readyState == "loaded" ||
                script_block.readyState == "complete"){
              script_block.onreadystatechange = null;
              clearTimeout(onloadTimer);
              _resolve('success');
            }
          };
        } else {  // others
          script_block.onload = function(e){
            clearTimeout(onloadTimer);
            _resolve('success', undefined ,  e);
          };
        }
        try {
          document.head.appendChild(script_block);
        } catch (e) {
          _resolve('fail');
        }

        /* only called for browsers which don't fire the error event on script load failure (ie<8?) This might be removable */
        onloadTimer = setTimeout(function() {
          if(script_block){
            _resolve('fail');
          }
        }, timeout);
      }
      return true;
    };

    /**
     * This should only be called by the file generated by FileMaker.  It should never be initiated manually.
     * @param data
     */
    receiveData = function(data) {
      clearTimeout(timeoutTimer);
      busy = false;
      if(typeof dataReceicedCallback === 'function') {
        dataReceicedCallback(data);
      }
      dataReceicedCallback = undefined;
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
      var _params = location.search.split(/[?&]/).slice(1).map(function(paramPair) {
        return paramPair.split(/=(.+)?/).slice(0, 2);
      }).reduce(function (obj, pairArray) {
        obj[decodeURIComponent(pairArray[0])] = pairArray[1] === undefined ? undefined : decodeURIComponent(pairArray[1]);
        return obj;
      }, {});

      /**
       * @lends urlParam
       * @public
       * @param {string} param
       * @returns {string|undefined}
       */
      var getParam = function (param) {
        return _params.hasOwnProperty(param) ? _params[param] : undefined;
      };

      /**
       * @method urlParam.exists
       * @public
       * @param {string} param
       * @returns {boolean}
       */
      getParam.exists = function (param) {
        return _params.hasOwnProperty(param);
      };

      /**
       * @method urlParam.all
       * @public
       * @returns {object}
       */
      getParam.all = function () {
        return _params
      };

      return getParam;
    })();

    _init();

    /* public methods */
    return {
      noConflict: noConflict,
      setParams: setParams,
      callFmpURL: callFmpURL,
      getFile: getFile,
      receiveData: receiveData,
      urlParam: urlParam
    };
  };

  /* this will overwrite any exiting window[namespace], but not before it is stored in _namespace where it can be restored with noConflict() */
  if(window[namespace] === undefined || window[namespace] !== self) {
    self = _create();
    window[namespace] = self;
  }

}(this, this.document));