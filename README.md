# FMAjax

##### !!!
##### macOS 10.12.4 includes a security update which prevents a file:/ url which includes the boot volume name from being valid.  For this reason, getting the url of a file in the temp directory is no longer as simple as using `Get ( TemporaryPath )`.  FMAjax now contains a fix, but if you need to update an exiting solution, you can copy over `fmajax.return_temp_path` and copy the new contents of `fmajax.set_hash ( data )`.
##### !!!
 
#

FMAjax is a javascript library and accompanying FileMaker module which includes functions to facilitate communication with a web viewer without reloading the page.  It helps you call FileMaker scripts from a web viewer application and return data to the web viewer.  The two important parts of accomplishing this are using the onhashchange javascript event to get data to the web viewer via the url and using jsonp to load files into the web viewer asynchronously.  These solutions work across Mac, Windows, and iOS, hosted and local files.  FileMaker 13.0v2 is required.

A chronology of events might help explain how it works
<ol>
<li>On initialization, web code files are exported to the temporary directory.</li>
<li>These files are then loaded into their corresponding web viewers.</li>
<li>The fmajax.js javascript library is also exported and referenced in the pages loaded in the web viewers.</li>
<li>The user interacts with the web viewer and does something that requires data to be retrieved from FileMaker.</li>
<li>An fmp:// url is triggered in the web viewer which includes any needed variables and parameters.</li>
<li>This url opens a FileMaker script which gathers the data or takes any needed actions.</li>
<li>The data is sent to an fmajax FileMaker script.</li>
<li>The script exports the data to a file or to the hash of the web viewer's source url.</li>
<li>If the data was exported to a file, then the hash of the web viewer's source url is updated.</li>
<li>If the data was exported to a file, the web viewer loads the files as a javascript file and processed the data.</li>
<li>If the data was sent to the hash, then it is processed directly by the web viewer.</li>
</ol>

Data can also be pushed from FileMaker to a web viewer by starting on step 7

There are three tables for the FMAjax module
<ol>
<li>web_viewer_code - stores code for web files</li>
<li>web_viewer_insances - stores data relating to each web viewer</li>
<li>FMAjax - base table with globals and user preferences</li>
</ol>

See the FMAjax.fmp12 file for installation instructions