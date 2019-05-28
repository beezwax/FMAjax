/* eslint-disable */
describe('noConflict', function() {
  var alt;

  it('preserves original', function() {
    alt = fmajax.noConflict();
    chai.assert.equal(fmajax, 'test');
  });

  it('returns fmajax', function() {
    chai.assert.typeOf(alt.noConflict, 'function');
    window.fmajax = alt;
  })
});

describe('setParams', function() {
  after(function() {
    fmajax.setParams({onHashChange: null});
    location.hash = '';
  });
  it('sets onHashChange', function(done) {
    fmajax.setParams({
      onHashChange: function() {
        done();
      }
    });
    location.hash = (new Date()).toISOString();
  });
  it('loads initial hash', function(done) {
    fmajax.setParams({
      onHashChange: function() {
        done();
      },
      loadInitialHash: true
    });
  });
});

describe('fmpURL', function() {
  var parameters = {
    db: '† †',
    param: '‡+‡',
    script: '∆&',
    varObj: {
      $_var1: '∫$',
      $_var2: '∑'
    }
  };
  var expectedURL = 'fmp://$/%E2%80%A0%20%E2%80%A0?script=%E2%88%86%26&param=%E2%80%A1%2B%E2%80%A1&%24_var1=%E2%88%AB%24&%24_var2=%E2%88%91';

  describe('fmpURL', function() {
    it('returns expected url', function() {
      chai.assert.equal(fmajax.fmpURL(parameters), expectedURL)
    });
    it('returns expected url with default db', function() {
      var params = {param: '‡‡', script: '∆'};
      var expected = 'fmp://$/theDB?script=%E2%88%86&param=%E2%80%A1%E2%80%A1';
      chai.assert.equal(fmajax.fmpURL(params), expected)
    });
    it('returns expected url with no param', function() {
      var params = {script: '∆'};
      var expected = 'fmp://$/theDB?script=%E2%88%86';
      chai.assert.equal(fmajax.fmpURL(params), expected)
    });
  });

  describe('callFmpURL', function() {
    it('calls the expected url', function(done) {
      function clickListener(evt) {
        var href = evt.target.getAttribute('href');
        evt.preventDefault();
        chai.assert.equal(href, expectedURL);
      }
      document.body.addEventListener('click', clickListener);
      fmajax.callFmpURL(parameters);
      document.body.removeEventListener('click', clickListener);
      done();
    });
  });
});

describe('getFile', function() {
  it('loads a file', function(done) {
    fmajax.getFile('get_file_test_1.js');
    window.resolveGetFile = function() {
      chai.assert.ok(true);
      done();
    }
  });

  it('handles success', function(done) {
    fmajax.getFile({
      file: 'get_file_test_2.js',
      success: function(evt) {
        chai.assert.instanceOf(evt, Event);
        done();
      }
    })
  });

  it('handles failure', function(done) {
    fmajax.getFile({
      file: 'get_file_test_3.js',
      fail: function(errorMessage) {
        chai.assert.equal(errorMessage, "load failure for 'get_file_test_3.js'");
        done();
      }
    })
  });
});

describe('receiveData', function() {
  function clickListener(evt) {
    evt.preventDefault();
  }
  it('receives correct data', function() {
    document.body.addEventListener('click', clickListener);
    fmajax.callFmpURL({
      db: '† †',
      script: '∆',
      success: function(data) {
        chai.assert.equal(data, 'some data')
      }
    });
    fmajax.receiveData('some data');
    document.body.removeEventListener('click', clickListener);
  });
});

describe('urlParam', function() {
  it('gets param', function() {
    chai.assert.equal(fmajax.urlParam('animal'), 'zebra')
  });

  it('gets all params', function() {
    chai.assert.deepEqual(fmajax.urlParam.all(), {db: 'theDB', fruit: 'apple', animal: 'zebra', isZoo: undefined});
  });

  it('knows that param exists', function() {
    chai.assert.isTrue(fmajax.urlParam.exists('isZoo'));
  });

  it('knows that param does not exist', function() {
    chai.assert.isFalse(fmajax.urlParam.exists('color'));
  });

});
