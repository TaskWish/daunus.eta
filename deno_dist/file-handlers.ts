// express is set like: app.engine('html', require('eta').renderFile)

import EtaErr from "./err.ts";
import compile from "./compile.ts";
import { getConfig } from "./config.ts";
import { getPath, readFile, loadFile } from "./file-utils.ts";
import { copyProps } from "./utils.ts";
import { promiseImpl } from "./polyfills.ts";

/* TYPES */

import { EtaConfig, PartialConfig } from "./config.ts";
import { TemplateFunction } from "./compile.ts";

export type CallbackFn = (err: Error | null, str?: string) => void;

interface FileOptions extends EtaConfig {
  filename: string;
}

interface DataObj {
  settings?: {
    [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  };
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/* END TYPES */

/**
 * Get the template from a string or a file, either compiled on-the-fly or
 * read from cache (if enabled), and cache the template if needed.
 *
 * If `options.cache` is true, this function reads the file from
 * `options.filename` so it must be set prior to calling this function.
 *
 * @param {Options} options   compilation options
 * @param {String} [template] template source
 * @return {(TemplateFunction|ClientFunction)}
 * Depending on the value of `options.client`, either type might be returned.
 * @static
 */

function handleCache(options: FileOptions): TemplateFunction {
  var filename = options.filename;

  if (options.cache) {
    var func = options.templates.get(filename);
    if (func) {
      return func;
    } else {
      return loadFile(filename, options);
    }
  }

  return compile(readFile(filename), options);
}

/**
 * Try calling handleCache with the given options and data and call the
 * callback with the result. If an error occurs, call the callback with
 * the error. Used by renderFile().
 *
 * @param {Options} options    compilation options
 * @param {Object} data        template data
 * @param {RenderFileCallback} cb callback
 * @static
 */

function tryHandleCache(options: FileOptions, data: object, cb: CallbackFn) {
  var result;
  if (!cb) {
    // No callback, try returning a promise
    if (typeof promiseImpl === "function") {
      return new promiseImpl(function (resolve: Function, reject: Function) {
        try {
          result = handleCache(options)(data, options);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
    } else {
      throw EtaErr(
        "Please provide a callback function, this env doesn't support Promises",
      );
    }
  } else {
    try {
      handleCache(options)(data, options, cb);
    } catch (err) {
      return cb(err);
    }
  }
}

/**
 * Get the template function.
 *
 * If `options.cache` is `true`, then the template is cached.
 *
 * @param {String}  path    path for the specified file
 * @param {Options} options compilation options
 * @return {(TemplateFunction|ClientFunction)}
 * Depending on the value of `options.client`, either type might be returned
 * @static
 */

// TODO: error if file path doesn't exist
function includeFile(path: string, options: EtaConfig) {
  // the below creates a new options object, using the parent filepath of the old options object and the path
  var newFileOptions = getConfig({ filename: getPath(path, options) }, options);
  // TODO: make sure properties are currectly copied over
  return handleCache(newFileOptions as FileOptions);
}

function renderFile(filename: string, data: DataObj, cb?: CallbackFn) {
  var Config: FileOptions = getConfig(
    (data as PartialConfig) || {},
  ) as FileOptions;
  // TODO: make sure above doesn't error. We do set filename down below

  if (data.settings) {
    // Pull a few things from known locations
    if (data.settings.views) {
      Config.views = data.settings.views;
    }
    if (data.settings["view cache"]) {
      Config.cache = true;
    }
    // Undocumented after Express 2, but still usable, esp. for
    // items that are unsafe to be passed along with data, like `root`
    var viewOpts = data.settings["view options"];

    if (viewOpts) {
      copyProps(Config, viewOpts);
    }
  }

  Config.filename = filename; // Make sure filename is right

  return tryHandleCache(Config, data, cb as CallbackFn);
}

export { includeFile, renderFile };
