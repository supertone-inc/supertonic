/*!
 * ONNX Runtime Web v1.26.0
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
"use strict";
var ort = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // common/dist/esm/backend-impl.js
  var backends, backendsSortedByPriority, registerBackend, tryResolveAndInitializeBackend, resolveBackendAndExecutionProviders;
  var init_backend_impl = __esm({
    "common/dist/esm/backend-impl.js"() {
      "use strict";
      backends = /* @__PURE__ */ new Map();
      backendsSortedByPriority = [];
      registerBackend = (name, backend, priority) => {
        if (backend && typeof backend.init === "function" && typeof backend.createInferenceSessionHandler === "function") {
          const currentBackend = backends.get(name);
          if (currentBackend === void 0) {
            backends.set(name, { backend, priority });
          } else if (currentBackend.priority > priority) {
            return;
          } else if (currentBackend.priority === priority) {
            if (currentBackend.backend !== backend) {
              throw new Error(`cannot register backend "${name}" using priority ${priority}`);
            }
          }
          if (priority >= 0) {
            const i = backendsSortedByPriority.indexOf(name);
            if (i !== -1) {
              backendsSortedByPriority.splice(i, 1);
            }
            for (let i2 = 0; i2 < backendsSortedByPriority.length; i2++) {
              if (backends.get(backendsSortedByPriority[i2]).priority <= priority) {
                backendsSortedByPriority.splice(i2, 0, name);
                return;
              }
            }
            backendsSortedByPriority.push(name);
          }
          return;
        }
        throw new TypeError("not a valid backend");
      };
      tryResolveAndInitializeBackend = async (backendName) => {
        const backendInfo = backends.get(backendName);
        if (!backendInfo) {
          return "backend not found.";
        }
        if (backendInfo.initialized) {
          return backendInfo.backend;
        } else if (backendInfo.aborted) {
          return backendInfo.error;
        } else {
          const isInitializing = !!backendInfo.initPromise;
          try {
            if (!isInitializing) {
              backendInfo.initPromise = backendInfo.backend.init(backendName);
            }
            await backendInfo.initPromise;
            backendInfo.initialized = true;
            return backendInfo.backend;
          } catch (e) {
            if (!isInitializing) {
              backendInfo.error = `${e}`;
              backendInfo.aborted = true;
            }
            return backendInfo.error;
          } finally {
            delete backendInfo.initPromise;
          }
        }
      };
      resolveBackendAndExecutionProviders = async (options) => {
        const eps = options.executionProviders || [];
        const backendHints = eps.map((i) => typeof i === "string" ? i : i.name);
        const backendNames = backendHints.length === 0 ? backendsSortedByPriority : backendHints;
        let backend;
        const errors = [];
        const availableBackendNames = /* @__PURE__ */ new Set();
        for (const backendName of backendNames) {
          const resolveResult = await tryResolveAndInitializeBackend(backendName);
          if (typeof resolveResult === "string") {
            errors.push({ name: backendName, err: resolveResult });
          } else {
            if (!backend) {
              backend = resolveResult;
            }
            if (backend === resolveResult) {
              availableBackendNames.add(backendName);
            }
          }
        }
        if (!backend) {
          throw new Error(`no available backend found. ERR: ${errors.map((e) => `[${e.name}] ${e.err}`).join(", ")}`);
        }
        for (const { name, err } of errors) {
          if (backendHints.includes(name)) {
            console.warn(`removing requested execution provider "${name}" from session options because it is not available: ${err}`);
          }
        }
        const filteredEps = eps.filter((i) => availableBackendNames.has(typeof i === "string" ? i : i.name));
        return [
          backend,
          new Proxy(options, {
            get: (target, prop) => {
              if (prop === "executionProviders") {
                return filteredEps;
              }
              return Reflect.get(target, prop);
            }
          })
        ];
      };
    }
  });

  // common/dist/esm/backend.js
  var init_backend = __esm({
    "common/dist/esm/backend.js"() {
      "use strict";
      init_backend_impl();
    }
  });

  // common/dist/esm/version.js
  var version;
  var init_version = __esm({
    "common/dist/esm/version.js"() {
      "use strict";
      version = "1.26.0";
    }
  });

  // common/dist/esm/env-impl.js
  var logLevelValue, env;
  var init_env_impl = __esm({
    "common/dist/esm/env-impl.js"() {
      "use strict";
      init_version();
      logLevelValue = "warning";
      env = {
        wasm: {},
        webgl: {},
        webgpu: {},
        versions: { common: version },
        set logLevel(value) {
          if (value === void 0) {
            return;
          }
          if (typeof value !== "string" || ["verbose", "info", "warning", "error", "fatal"].indexOf(value) === -1) {
            throw new Error(`Unsupported logging level: ${value}`);
          }
          logLevelValue = value;
        },
        get logLevel() {
          return logLevelValue;
        }
      };
      Object.defineProperty(env, "logLevel", { enumerable: true });
    }
  });

  // common/dist/esm/env.js
  var env2;
  var init_env = __esm({
    "common/dist/esm/env.js"() {
      "use strict";
      init_env_impl();
      env2 = env;
    }
  });

  // common/dist/esm/tensor-conversion-impl.js
  var tensorToDataURL, tensorToImageData;
  var init_tensor_conversion_impl = __esm({
    "common/dist/esm/tensor-conversion-impl.js"() {
      "use strict";
      tensorToDataURL = (tensor, options) => {
        const canvas = typeof document !== "undefined" ? document.createElement("canvas") : new OffscreenCanvas(1, 1);
        canvas.width = tensor.dims[3];
        canvas.height = tensor.dims[2];
        const pixels2DContext = canvas.getContext("2d");
        if (pixels2DContext != null) {
          let width;
          let height;
          if (options?.tensorLayout !== void 0 && options.tensorLayout === "NHWC") {
            width = tensor.dims[2];
            height = tensor.dims[3];
          } else {
            width = tensor.dims[3];
            height = tensor.dims[2];
          }
          const inputformat = options?.format !== void 0 ? options.format : "RGB";
          const norm = options?.norm;
          let normMean;
          let normBias;
          if (norm === void 0 || norm.mean === void 0) {
            normMean = [255, 255, 255, 255];
          } else {
            if (typeof norm.mean === "number") {
              normMean = [norm.mean, norm.mean, norm.mean, norm.mean];
            } else {
              normMean = [norm.mean[0], norm.mean[1], norm.mean[2], 0];
              if (norm.mean[3] !== void 0) {
                normMean[3] = norm.mean[3];
              }
            }
          }
          if (norm === void 0 || norm.bias === void 0) {
            normBias = [0, 0, 0, 0];
          } else {
            if (typeof norm.bias === "number") {
              normBias = [norm.bias, norm.bias, norm.bias, norm.bias];
            } else {
              normBias = [norm.bias[0], norm.bias[1], norm.bias[2], 0];
              if (norm.bias[3] !== void 0) {
                normBias[3] = norm.bias[3];
              }
            }
          }
          const stride = height * width;
          let rTensorPointer = 0, gTensorPointer = stride, bTensorPointer = stride * 2, aTensorPointer = -1;
          if (inputformat === "RGBA") {
            rTensorPointer = 0;
            gTensorPointer = stride;
            bTensorPointer = stride * 2;
            aTensorPointer = stride * 3;
          } else if (inputformat === "RGB") {
            rTensorPointer = 0;
            gTensorPointer = stride;
            bTensorPointer = stride * 2;
          } else if (inputformat === "RBG") {
            rTensorPointer = 0;
            bTensorPointer = stride;
            gTensorPointer = stride * 2;
          }
          for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
              const R = (tensor.data[rTensorPointer++] - normBias[0]) * normMean[0];
              const G = (tensor.data[gTensorPointer++] - normBias[1]) * normMean[1];
              const B = (tensor.data[bTensorPointer++] - normBias[2]) * normMean[2];
              const A = aTensorPointer === -1 ? 255 : (tensor.data[aTensorPointer++] - normBias[3]) * normMean[3];
              pixels2DContext.fillStyle = "rgba(" + R + "," + G + "," + B + "," + A + ")";
              pixels2DContext.fillRect(j, i, 1, 1);
            }
          }
          if ("toDataURL" in canvas) {
            return canvas.toDataURL();
          } else {
            throw new Error("toDataURL is not supported");
          }
        } else {
          throw new Error("Can not access image data");
        }
      };
      tensorToImageData = (tensor, options) => {
        const pixels2DContext = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : new OffscreenCanvas(1, 1).getContext("2d");
        let image;
        if (pixels2DContext != null) {
          let width;
          let height;
          let channels;
          if (options?.tensorLayout !== void 0 && options.tensorLayout === "NHWC") {
            width = tensor.dims[2];
            height = tensor.dims[1];
            channels = tensor.dims[3];
          } else {
            width = tensor.dims[3];
            height = tensor.dims[2];
            channels = tensor.dims[1];
          }
          const inputformat = options !== void 0 ? options.format !== void 0 ? options.format : "RGB" : "RGB";
          const norm = options?.norm;
          let normMean;
          let normBias;
          if (norm === void 0 || norm.mean === void 0) {
            normMean = [255, 255, 255, 255];
          } else {
            if (typeof norm.mean === "number") {
              normMean = [norm.mean, norm.mean, norm.mean, norm.mean];
            } else {
              normMean = [norm.mean[0], norm.mean[1], norm.mean[2], 255];
              if (norm.mean[3] !== void 0) {
                normMean[3] = norm.mean[3];
              }
            }
          }
          if (norm === void 0 || norm.bias === void 0) {
            normBias = [0, 0, 0, 0];
          } else {
            if (typeof norm.bias === "number") {
              normBias = [norm.bias, norm.bias, norm.bias, norm.bias];
            } else {
              normBias = [norm.bias[0], norm.bias[1], norm.bias[2], 0];
              if (norm.bias[3] !== void 0) {
                normBias[3] = norm.bias[3];
              }
            }
          }
          const stride = height * width;
          if (options !== void 0) {
            if (options.format !== void 0 && channels === 4 && options.format !== "RGBA" || channels === 3 && options.format !== "RGB" && options.format !== "BGR") {
              throw new Error("Tensor format doesn't match input tensor dims");
            }
          }
          const step = 4;
          let rImagePointer = 0, gImagePointer = 1, bImagePointer = 2, aImagePointer = 3;
          let rTensorPointer = 0, gTensorPointer = stride, bTensorPointer = stride * 2, aTensorPointer = -1;
          if (inputformat === "RGBA") {
            rTensorPointer = 0;
            gTensorPointer = stride;
            bTensorPointer = stride * 2;
            aTensorPointer = stride * 3;
          } else if (inputformat === "RGB") {
            rTensorPointer = 0;
            gTensorPointer = stride;
            bTensorPointer = stride * 2;
          } else if (inputformat === "RBG") {
            rTensorPointer = 0;
            bTensorPointer = stride;
            gTensorPointer = stride * 2;
          }
          image = pixels2DContext.createImageData(width, height);
          for (let i = 0; i < height * width; rImagePointer += step, gImagePointer += step, bImagePointer += step, aImagePointer += step, i++) {
            image.data[rImagePointer] = (tensor.data[rTensorPointer++] - normBias[0]) * normMean[0];
            image.data[gImagePointer] = (tensor.data[gTensorPointer++] - normBias[1]) * normMean[1];
            image.data[bImagePointer] = (tensor.data[bTensorPointer++] - normBias[2]) * normMean[2];
            image.data[aImagePointer] = aTensorPointer === -1 ? 255 : (tensor.data[aTensorPointer++] - normBias[3]) * normMean[3];
          }
        } else {
          throw new Error("Can not access image data");
        }
        return image;
      };
    }
  });

  // common/dist/esm/tensor-factory-impl.js
  var bufferToTensor, tensorFromImage, tensorFromTexture, tensorFromGpuBuffer, tensorFromMLTensor, tensorFromPinnedBuffer;
  var init_tensor_factory_impl = __esm({
    "common/dist/esm/tensor-factory-impl.js"() {
      "use strict";
      init_tensor_impl();
      bufferToTensor = (buffer, options) => {
        if (buffer === void 0) {
          throw new Error("Image buffer must be defined");
        }
        if (options.height === void 0 || options.width === void 0) {
          throw new Error("Image height and width must be defined");
        }
        if (options.tensorLayout === "NHWC") {
          throw new Error("NHWC Tensor layout is not supported yet");
        }
        const { height, width } = options;
        const norm = options.norm ?? { mean: 255, bias: 0 };
        let normMean;
        let normBias;
        if (typeof norm.mean === "number") {
          normMean = [norm.mean, norm.mean, norm.mean, norm.mean];
        } else {
          normMean = [norm.mean[0], norm.mean[1], norm.mean[2], norm.mean[3] ?? 255];
        }
        if (typeof norm.bias === "number") {
          normBias = [norm.bias, norm.bias, norm.bias, norm.bias];
        } else {
          normBias = [norm.bias[0], norm.bias[1], norm.bias[2], norm.bias[3] ?? 0];
        }
        const inputformat = options.format !== void 0 ? options.format : "RGBA";
        const outputformat = options.tensorFormat !== void 0 ? options.tensorFormat !== void 0 ? options.tensorFormat : "RGB" : "RGB";
        const stride = height * width;
        const float32Data = outputformat === "RGBA" ? new Float32Array(stride * 4) : new Float32Array(stride * 3);
        let step = 4, rImagePointer = 0, gImagePointer = 1, bImagePointer = 2, aImagePointer = 3;
        let rTensorPointer = 0, gTensorPointer = stride, bTensorPointer = stride * 2, aTensorPointer = -1;
        if (inputformat === "RGB") {
          step = 3;
          rImagePointer = 0;
          gImagePointer = 1;
          bImagePointer = 2;
          aImagePointer = -1;
        }
        if (outputformat === "RGBA") {
          aTensorPointer = stride * 3;
        } else if (outputformat === "RBG") {
          rTensorPointer = 0;
          bTensorPointer = stride;
          gTensorPointer = stride * 2;
        } else if (outputformat === "BGR") {
          bTensorPointer = 0;
          gTensorPointer = stride;
          rTensorPointer = stride * 2;
        }
        for (let i = 0; i < stride; i++, rImagePointer += step, bImagePointer += step, gImagePointer += step, aImagePointer += step) {
          float32Data[rTensorPointer++] = (buffer[rImagePointer] + normBias[0]) / normMean[0];
          float32Data[gTensorPointer++] = (buffer[gImagePointer] + normBias[1]) / normMean[1];
          float32Data[bTensorPointer++] = (buffer[bImagePointer] + normBias[2]) / normMean[2];
          if (aTensorPointer !== -1 && aImagePointer !== -1) {
            float32Data[aTensorPointer++] = (buffer[aImagePointer] + normBias[3]) / normMean[3];
          }
        }
        const outputTensor = outputformat === "RGBA" ? new Tensor("float32", float32Data, [1, 4, height, width]) : new Tensor("float32", float32Data, [1, 3, height, width]);
        return outputTensor;
      };
      tensorFromImage = async (image, options) => {
        const isHTMLImageEle = typeof HTMLImageElement !== "undefined" && image instanceof HTMLImageElement;
        const isImageDataEle = typeof ImageData !== "undefined" && image instanceof ImageData;
        const isImageBitmap = typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap;
        const isString = typeof image === "string";
        let data;
        let bufferToTensorOptions = options ?? {};
        const createCanvas = () => {
          if (typeof document !== "undefined") {
            return document.createElement("canvas");
          } else if (typeof OffscreenCanvas !== "undefined") {
            return new OffscreenCanvas(1, 1);
          } else {
            throw new Error("Canvas is not supported");
          }
        };
        const createCanvasContext = (canvas) => {
          if (typeof HTMLCanvasElement !== "undefined" && canvas instanceof HTMLCanvasElement) {
            return canvas.getContext("2d");
          } else if (canvas instanceof OffscreenCanvas) {
            return canvas.getContext("2d");
          } else {
            return null;
          }
        };
        if (isHTMLImageEle) {
          const canvas = createCanvas();
          canvas.width = image.width;
          canvas.height = image.height;
          const pixels2DContext = createCanvasContext(canvas);
          if (pixels2DContext != null) {
            let height = image.height;
            let width = image.width;
            if (options !== void 0 && options.resizedHeight !== void 0 && options.resizedWidth !== void 0) {
              height = options.resizedHeight;
              width = options.resizedWidth;
            }
            if (options !== void 0) {
              bufferToTensorOptions = options;
              if (options.tensorFormat !== void 0) {
                throw new Error("Image input config format must be RGBA for HTMLImageElement");
              } else {
                bufferToTensorOptions.tensorFormat = "RGBA";
              }
              bufferToTensorOptions.height = height;
              bufferToTensorOptions.width = width;
            } else {
              bufferToTensorOptions.tensorFormat = "RGBA";
              bufferToTensorOptions.height = height;
              bufferToTensorOptions.width = width;
            }
            pixels2DContext.drawImage(image, 0, 0);
            data = pixels2DContext.getImageData(0, 0, width, height).data;
          } else {
            throw new Error("Can not access image data");
          }
        } else if (isImageDataEle) {
          let height;
          let width;
          if (options !== void 0 && options.resizedWidth !== void 0 && options.resizedHeight !== void 0) {
            height = options.resizedHeight;
            width = options.resizedWidth;
          } else {
            height = image.height;
            width = image.width;
          }
          if (options !== void 0) {
            bufferToTensorOptions = options;
          }
          bufferToTensorOptions.format = "RGBA";
          bufferToTensorOptions.height = height;
          bufferToTensorOptions.width = width;
          if (options !== void 0) {
            const tempCanvas = createCanvas();
            tempCanvas.width = width;
            tempCanvas.height = height;
            const pixels2DContext = createCanvasContext(tempCanvas);
            if (pixels2DContext != null) {
              pixels2DContext.putImageData(image, 0, 0);
              data = pixels2DContext.getImageData(0, 0, width, height).data;
            } else {
              throw new Error("Can not access image data");
            }
          } else {
            data = image.data;
          }
        } else if (isImageBitmap) {
          if (options === void 0) {
            throw new Error("Please provide image config with format for Imagebitmap");
          }
          const canvas = createCanvas();
          canvas.width = image.width;
          canvas.height = image.height;
          const pixels2DContext = createCanvasContext(canvas);
          if (pixels2DContext != null) {
            const height = image.height;
            const width = image.width;
            pixels2DContext.drawImage(image, 0, 0, width, height);
            data = pixels2DContext.getImageData(0, 0, width, height).data;
            bufferToTensorOptions.height = height;
            bufferToTensorOptions.width = width;
            return bufferToTensor(data, bufferToTensorOptions);
          } else {
            throw new Error("Can not access image data");
          }
        } else if (isString) {
          return new Promise((resolve, reject) => {
            const canvas = createCanvas();
            const context = createCanvasContext(canvas);
            if (!image || !context) {
              return reject();
            }
            const newImage = new Image();
            newImage.crossOrigin = "Anonymous";
            newImage.src = image;
            newImage.onload = () => {
              canvas.width = newImage.width;
              canvas.height = newImage.height;
              context.drawImage(newImage, 0, 0, canvas.width, canvas.height);
              const img = context.getImageData(0, 0, canvas.width, canvas.height);
              bufferToTensorOptions.height = canvas.height;
              bufferToTensorOptions.width = canvas.width;
              resolve(bufferToTensor(img.data, bufferToTensorOptions));
            };
          });
        } else {
          throw new Error("Input data provided is not supported - aborted tensor creation");
        }
        if (data !== void 0) {
          return bufferToTensor(data, bufferToTensorOptions);
        } else {
          throw new Error("Input data provided is not supported - aborted tensor creation");
        }
      };
      tensorFromTexture = (texture, options) => {
        const { width, height, download, dispose } = options;
        const dims = [1, height, width, 4];
        return new Tensor({ location: "texture", type: "float32", texture, dims, download, dispose });
      };
      tensorFromGpuBuffer = (gpuBuffer, options) => {
        const { dataType, dims, download, dispose } = options;
        return new Tensor({ location: "gpu-buffer", type: dataType ?? "float32", gpuBuffer, dims, download, dispose });
      };
      tensorFromMLTensor = (mlTensor, options) => {
        const { dataType, dims, download, dispose } = options;
        return new Tensor({ location: "ml-tensor", type: dataType ?? "float32", mlTensor, dims, download, dispose });
      };
      tensorFromPinnedBuffer = (type, buffer, dims) => new Tensor({ location: "cpu-pinned", type, data: buffer, dims: dims ?? [buffer.length] });
    }
  });

  // common/dist/esm/tensor-impl-type-mapping.js
  var NUMERIC_TENSOR_TYPE_TO_TYPEDARRAY_MAP, NUMERIC_TENSOR_TYPEDARRAY_TO_TYPE_MAP, isTypedArrayChecked, checkTypedArray;
  var init_tensor_impl_type_mapping = __esm({
    "common/dist/esm/tensor-impl-type-mapping.js"() {
      "use strict";
      NUMERIC_TENSOR_TYPE_TO_TYPEDARRAY_MAP = /* @__PURE__ */ new Map([
        ["float32", Float32Array],
        ["uint8", Uint8Array],
        ["int8", Int8Array],
        ["uint16", Uint16Array],
        ["int16", Int16Array],
        ["int32", Int32Array],
        ["bool", Uint8Array],
        ["float64", Float64Array],
        ["uint32", Uint32Array],
        ["int4", Uint8Array],
        ["uint4", Uint8Array]
      ]);
      NUMERIC_TENSOR_TYPEDARRAY_TO_TYPE_MAP = /* @__PURE__ */ new Map([
        [Float32Array, "float32"],
        [Uint8Array, "uint8"],
        [Int8Array, "int8"],
        [Uint16Array, "uint16"],
        [Int16Array, "int16"],
        [Int32Array, "int32"],
        [Float64Array, "float64"],
        [Uint32Array, "uint32"]
      ]);
      isTypedArrayChecked = false;
      checkTypedArray = () => {
        if (!isTypedArrayChecked) {
          isTypedArrayChecked = true;
          const isBigInt64ArrayAvailable = typeof BigInt64Array !== "undefined" && BigInt64Array.from;
          const isBigUint64ArrayAvailable = typeof BigUint64Array !== "undefined" && BigUint64Array.from;
          const Float16Array2 = globalThis.Float16Array;
          const isFloat16ArrayAvailable = typeof Float16Array2 !== "undefined" && Float16Array2.from;
          if (isBigInt64ArrayAvailable) {
            NUMERIC_TENSOR_TYPE_TO_TYPEDARRAY_MAP.set("int64", BigInt64Array);
            NUMERIC_TENSOR_TYPEDARRAY_TO_TYPE_MAP.set(BigInt64Array, "int64");
          }
          if (isBigUint64ArrayAvailable) {
            NUMERIC_TENSOR_TYPE_TO_TYPEDARRAY_MAP.set("uint64", BigUint64Array);
            NUMERIC_TENSOR_TYPEDARRAY_TO_TYPE_MAP.set(BigUint64Array, "uint64");
          }
          if (isFloat16ArrayAvailable) {
            NUMERIC_TENSOR_TYPE_TO_TYPEDARRAY_MAP.set("float16", Float16Array2);
            NUMERIC_TENSOR_TYPEDARRAY_TO_TYPE_MAP.set(Float16Array2, "float16");
          } else {
            NUMERIC_TENSOR_TYPE_TO_TYPEDARRAY_MAP.set("float16", Uint16Array);
          }
        }
      };
    }
  });

  // common/dist/esm/tensor-utils-impl.js
  var calculateSize, tensorReshape;
  var init_tensor_utils_impl = __esm({
    "common/dist/esm/tensor-utils-impl.js"() {
      "use strict";
      init_tensor_impl();
      calculateSize = (dims) => {
        let size = 1;
        for (let i = 0; i < dims.length; i++) {
          const dim = dims[i];
          if (typeof dim !== "number" || !Number.isSafeInteger(dim)) {
            throw new TypeError(`dims[${i}] must be an integer, got: ${dim}`);
          }
          if (dim < 0) {
            throw new RangeError(`dims[${i}] must be a non-negative integer, got: ${dim}`);
          }
          size *= dim;
        }
        return size;
      };
      tensorReshape = (tensor, dims) => {
        switch (tensor.location) {
          case "cpu":
            return new Tensor(tensor.type, tensor.data, dims);
          case "cpu-pinned":
            return new Tensor({
              location: "cpu-pinned",
              data: tensor.data,
              type: tensor.type,
              dims
            });
          case "texture":
            return new Tensor({
              location: "texture",
              texture: tensor.texture,
              type: tensor.type,
              dims
            });
          case "gpu-buffer":
            return new Tensor({
              location: "gpu-buffer",
              gpuBuffer: tensor.gpuBuffer,
              type: tensor.type,
              dims
            });
          case "ml-tensor":
            return new Tensor({
              location: "ml-tensor",
              mlTensor: tensor.mlTensor,
              type: tensor.type,
              dims
            });
          default:
            throw new Error(`tensorReshape: tensor location ${tensor.location} is not supported`);
        }
      };
    }
  });

  // common/dist/esm/tensor-impl.js
  var Tensor;
  var init_tensor_impl = __esm({
    "common/dist/esm/tensor-impl.js"() {
      "use strict";
      init_tensor_conversion_impl();
      init_tensor_factory_impl();
      init_tensor_impl_type_mapping();
      init_tensor_utils_impl();
      Tensor = class {
        /**
         * implementation.
         */
        constructor(arg0, arg1, arg2) {
          checkTypedArray();
          let type;
          let dims;
          if (typeof arg0 === "object" && "location" in arg0) {
            this.dataLocation = arg0.location;
            type = arg0.type;
            dims = arg0.dims;
            switch (arg0.location) {
              case "cpu-pinned": {
                const expectedTypedArrayConstructor = NUMERIC_TENSOR_TYPE_TO_TYPEDARRAY_MAP.get(type);
                if (!expectedTypedArrayConstructor) {
                  throw new TypeError(`unsupported type "${type}" to create tensor from pinned buffer`);
                }
                if (!(arg0.data instanceof expectedTypedArrayConstructor)) {
                  throw new TypeError(`buffer should be of type ${expectedTypedArrayConstructor.name}`);
                }
                this.cpuData = arg0.data;
                break;
              }
              case "texture": {
                if (type !== "float32") {
                  throw new TypeError(`unsupported type "${type}" to create tensor from texture`);
                }
                this.gpuTextureData = arg0.texture;
                this.downloader = arg0.download;
                this.disposer = arg0.dispose;
                break;
              }
              case "gpu-buffer": {
                if (type !== "float32" && type !== "float16" && type !== "int32" && type !== "int64" && type !== "uint32" && type !== "uint8" && type !== "bool" && type !== "uint4" && type !== "int4") {
                  throw new TypeError(`unsupported type "${type}" to create tensor from gpu buffer`);
                }
                this.gpuBufferData = arg0.gpuBuffer;
                this.downloader = arg0.download;
                this.disposer = arg0.dispose;
                break;
              }
              case "ml-tensor": {
                if (type !== "float32" && type !== "float16" && type !== "int32" && type !== "int64" && type !== "uint32" && type !== "uint64" && type !== "int8" && type !== "uint8" && type !== "bool" && type !== "uint4" && type !== "int4") {
                  throw new TypeError(`unsupported type "${type}" to create tensor from MLTensor`);
                }
                this.mlTensorData = arg0.mlTensor;
                this.downloader = arg0.download;
                this.disposer = arg0.dispose;
                break;
              }
              default:
                throw new Error(`Tensor constructor: unsupported location '${this.dataLocation}'`);
            }
          } else {
            let data;
            let maybeDims;
            if (typeof arg0 === "string") {
              type = arg0;
              maybeDims = arg2;
              if (arg0 === "string") {
                if (!Array.isArray(arg1)) {
                  throw new TypeError("A string tensor's data must be a string array.");
                }
                data = arg1;
              } else {
                const typedArrayConstructor = NUMERIC_TENSOR_TYPE_TO_TYPEDARRAY_MAP.get(arg0);
                if (typedArrayConstructor === void 0) {
                  throw new TypeError(`Unsupported tensor type: ${arg0}.`);
                }
                if (Array.isArray(arg1)) {
                  if (arg0 === "float16" && typedArrayConstructor === Uint16Array || arg0 === "uint4" || arg0 === "int4") {
                    throw new TypeError(`Creating a ${arg0} tensor from number array is not supported. Please use ${typedArrayConstructor.name} as data.`);
                  } else if (arg0 === "uint64" || arg0 === "int64") {
                    data = typedArrayConstructor.from(arg1, BigInt);
                  } else {
                    data = typedArrayConstructor.from(arg1);
                  }
                } else if (arg1 instanceof typedArrayConstructor) {
                  data = arg1;
                } else if (arg1 instanceof Uint8ClampedArray) {
                  if (arg0 === "uint8") {
                    data = Uint8Array.from(arg1);
                  } else {
                    throw new TypeError(`A Uint8ClampedArray tensor's data must be type of uint8`);
                  }
                } else if (arg0 === "float16" && arg1 instanceof Uint16Array && typedArrayConstructor !== Uint16Array) {
                  data = new globalThis.Float16Array(arg1.buffer, arg1.byteOffset, arg1.length);
                } else {
                  throw new TypeError(`A ${type} tensor's data must be type of ${typedArrayConstructor}`);
                }
              }
            } else {
              maybeDims = arg1;
              if (Array.isArray(arg0)) {
                if (arg0.length === 0) {
                  throw new TypeError("Tensor type cannot be inferred from an empty array.");
                }
                const firstElementType = typeof arg0[0];
                if (firstElementType === "string") {
                  type = "string";
                  data = arg0;
                } else if (firstElementType === "boolean") {
                  type = "bool";
                  data = Uint8Array.from(arg0);
                } else {
                  throw new TypeError(`Invalid element type of data array: ${firstElementType}.`);
                }
              } else if (arg0 instanceof Uint8ClampedArray) {
                type = "uint8";
                data = Uint8Array.from(arg0);
              } else {
                const mappedType = NUMERIC_TENSOR_TYPEDARRAY_TO_TYPE_MAP.get(arg0.constructor);
                if (mappedType === void 0) {
                  throw new TypeError(`Unsupported type for tensor data: ${arg0.constructor}.`);
                }
                type = mappedType;
                data = arg0;
              }
            }
            if (maybeDims === void 0) {
              maybeDims = [data.length];
            } else if (!Array.isArray(maybeDims)) {
              throw new TypeError("A tensor's dims must be a number array");
            }
            dims = maybeDims;
            this.cpuData = data;
            this.dataLocation = "cpu";
          }
          const size = calculateSize(dims);
          if (this.cpuData && size !== this.cpuData.length) {
            if ((type === "uint4" || type === "int4") && Math.ceil(size / 2) === this.cpuData.length) {
            } else {
              throw new Error(`Tensor's size(${size}) does not match data length(${this.cpuData.length}).`);
            }
          }
          this.type = type;
          this.dims = dims;
          this.size = size;
        }
        // #endregion
        // #region factory
        static async fromImage(image, options) {
          return tensorFromImage(image, options);
        }
        static fromTexture(texture, options) {
          return tensorFromTexture(texture, options);
        }
        static fromGpuBuffer(gpuBuffer, options) {
          return tensorFromGpuBuffer(gpuBuffer, options);
        }
        static fromMLTensor(mlTensor, options) {
          return tensorFromMLTensor(mlTensor, options);
        }
        static fromPinnedBuffer(type, buffer, dims) {
          return tensorFromPinnedBuffer(type, buffer, dims);
        }
        // #endregion
        // #region conversions
        toDataURL(options) {
          return tensorToDataURL(this, options);
        }
        toImageData(options) {
          return tensorToImageData(this, options);
        }
        // #endregion
        // #region properties
        get data() {
          this.ensureValid();
          if (!this.cpuData) {
            throw new Error("The data is not on CPU. Use `getData()` to download GPU data to CPU, or use `texture` or `gpuBuffer` property to access the GPU data directly.");
          }
          return this.cpuData;
        }
        get location() {
          return this.dataLocation;
        }
        get texture() {
          this.ensureValid();
          if (!this.gpuTextureData) {
            throw new Error("The data is not stored as a WebGL texture.");
          }
          return this.gpuTextureData;
        }
        get gpuBuffer() {
          this.ensureValid();
          if (!this.gpuBufferData) {
            throw new Error("The data is not stored as a WebGPU buffer.");
          }
          return this.gpuBufferData;
        }
        get mlTensor() {
          this.ensureValid();
          if (!this.mlTensorData) {
            throw new Error("The data is not stored as a WebNN MLTensor.");
          }
          return this.mlTensorData;
        }
        // #endregion
        // #region methods
        async getData(releaseData) {
          this.ensureValid();
          switch (this.dataLocation) {
            case "cpu":
            case "cpu-pinned":
              return this.data;
            case "texture":
            case "gpu-buffer":
            case "ml-tensor": {
              if (!this.downloader) {
                throw new Error("The current tensor is not created with a specified data downloader.");
              }
              if (this.isDownloading) {
                throw new Error("The current tensor is being downloaded.");
              }
              try {
                this.isDownloading = true;
                const data = await this.downloader();
                this.downloader = void 0;
                this.dataLocation = "cpu";
                this.cpuData = data;
                if (releaseData && this.disposer) {
                  this.disposer();
                  this.disposer = void 0;
                }
                return data;
              } finally {
                this.isDownloading = false;
              }
            }
            default:
              throw new Error(`cannot get data from location: ${this.dataLocation}`);
          }
        }
        dispose() {
          if (this.isDownloading) {
            throw new Error("The current tensor is being downloaded.");
          }
          if (this.disposer) {
            this.disposer();
            this.disposer = void 0;
          }
          this.cpuData = void 0;
          this.gpuTextureData = void 0;
          this.gpuBufferData = void 0;
          this.mlTensorData = void 0;
          this.downloader = void 0;
          this.isDownloading = void 0;
          this.dataLocation = "none";
        }
        // #endregion
        // #region tensor utilities
        ensureValid() {
          if (this.dataLocation === "none") {
            throw new Error("The tensor is disposed.");
          }
        }
        reshape(dims) {
          this.ensureValid();
          if (this.downloader || this.disposer) {
            throw new Error("Cannot reshape a tensor that owns GPU resource.");
          }
          return tensorReshape(this, dims);
        }
      };
    }
  });

  // common/dist/esm/tensor.js
  var Tensor2;
  var init_tensor = __esm({
    "common/dist/esm/tensor.js"() {
      "use strict";
      init_tensor_impl();
      Tensor2 = Tensor;
    }
  });

  // common/dist/esm/trace.js
  var TRACE, TRACE_FUNC, TRACE_FUNC_BEGIN, TRACE_FUNC_END, TRACE_EVENT_BEGIN, TRACE_EVENT_END;
  var init_trace = __esm({
    "common/dist/esm/trace.js"() {
      "use strict";
      init_env_impl();
      TRACE = (deviceType, label) => {
        if (typeof env.trace === "undefined" ? !env.wasm.trace : !env.trace) {
          return;
        }
        console.timeStamp(`${deviceType}::ORT::${label}`);
      };
      TRACE_FUNC = (msg, extraMsg) => {
        const stack = new Error().stack?.split(/\r\n|\r|\n/g) || [];
        let hasTraceFunc = false;
        for (let i = 0; i < stack.length; i++) {
          if (hasTraceFunc && !stack[i].includes("TRACE_FUNC")) {
            let label = `FUNC_${msg}::${stack[i].trim().split(" ")[1]}`;
            if (extraMsg) {
              label += `::${extraMsg}`;
            }
            TRACE("CPU", label);
            return;
          }
          if (stack[i].includes("TRACE_FUNC")) {
            hasTraceFunc = true;
          }
        }
      };
      TRACE_FUNC_BEGIN = (extraMsg) => {
        if (typeof env.trace === "undefined" ? !env.wasm.trace : !env.trace) {
          return;
        }
        TRACE_FUNC("BEGIN", extraMsg);
      };
      TRACE_FUNC_END = (extraMsg) => {
        if (typeof env.trace === "undefined" ? !env.wasm.trace : !env.trace) {
          return;
        }
        TRACE_FUNC("END", extraMsg);
      };
      TRACE_EVENT_BEGIN = (extraMsg) => {
        if (typeof env.trace === "undefined" ? !env.wasm.trace : !env.trace) {
          return;
        }
        console.time(`ORT::${extraMsg}`);
      };
      TRACE_EVENT_END = (extraMsg) => {
        if (typeof env.trace === "undefined" ? !env.wasm.trace : !env.trace) {
          return;
        }
        console.timeEnd(`ORT::${extraMsg}`);
      };
    }
  });

  // common/dist/esm/inference-session-impl.js
  var InferenceSession;
  var init_inference_session_impl = __esm({
    "common/dist/esm/inference-session-impl.js"() {
      "use strict";
      init_backend_impl();
      init_tensor();
      init_trace();
      InferenceSession = class _InferenceSession {
        constructor(handler) {
          this.handler = handler;
        }
        async run(feeds, arg1, arg2) {
          TRACE_FUNC_BEGIN();
          TRACE_EVENT_BEGIN("InferenceSession.run");
          const fetches = {};
          let options = {};
          if (typeof feeds !== "object" || feeds === null || feeds instanceof Tensor2 || Array.isArray(feeds)) {
            throw new TypeError("'feeds' must be an object that use input names as keys and OnnxValue as corresponding values.");
          }
          let isFetchesEmpty = true;
          if (typeof arg1 === "object") {
            if (arg1 === null) {
              throw new TypeError("Unexpected argument[1]: cannot be null.");
            }
            if (arg1 instanceof Tensor2) {
              throw new TypeError("'fetches' cannot be a Tensor");
            }
            if (Array.isArray(arg1)) {
              if (arg1.length === 0) {
                throw new TypeError("'fetches' cannot be an empty array.");
              }
              isFetchesEmpty = false;
              for (const name of arg1) {
                if (typeof name !== "string") {
                  throw new TypeError("'fetches' must be a string array or an object.");
                }
                if (this.outputNames.indexOf(name) === -1) {
                  throw new RangeError(`'fetches' contains invalid output name: ${name}.`);
                }
                fetches[name] = null;
              }
              if (typeof arg2 === "object" && arg2 !== null) {
                options = arg2;
              } else if (typeof arg2 !== "undefined") {
                throw new TypeError("'options' must be an object.");
              }
            } else {
              let isFetches = false;
              const arg1Keys = Object.getOwnPropertyNames(arg1);
              for (const name of this.outputNames) {
                if (arg1Keys.indexOf(name) !== -1) {
                  const v = arg1[name];
                  if (v === null || v instanceof Tensor2) {
                    isFetches = true;
                    isFetchesEmpty = false;
                    fetches[name] = v;
                  }
                }
              }
              if (isFetches) {
                if (typeof arg2 === "object" && arg2 !== null) {
                  options = arg2;
                } else if (typeof arg2 !== "undefined") {
                  throw new TypeError("'options' must be an object.");
                }
              } else {
                options = arg1;
              }
            }
          } else if (typeof arg1 !== "undefined") {
            throw new TypeError("Unexpected argument[1]: must be 'fetches' or 'options'.");
          }
          for (const name of this.inputNames) {
            if (typeof feeds[name] === "undefined") {
              throw new Error(`input '${name}' is missing in 'feeds'.`);
            }
          }
          if (isFetchesEmpty) {
            for (const name of this.outputNames) {
              fetches[name] = null;
            }
          }
          const results = await this.handler.run(feeds, fetches, options);
          const returnValue = {};
          for (const key in results) {
            if (Object.hasOwnProperty.call(results, key)) {
              const result = results[key];
              if (result instanceof Tensor2) {
                returnValue[key] = result;
              } else {
                returnValue[key] = new Tensor2(result.type, result.data, result.dims);
              }
            }
          }
          TRACE_EVENT_END("InferenceSession.run");
          TRACE_FUNC_END();
          return returnValue;
        }
        async release() {
          return this.handler.dispose();
        }
        static async create(arg0, arg1, arg2, arg3) {
          TRACE_FUNC_BEGIN();
          TRACE_EVENT_BEGIN("InferenceSession.create");
          let filePathOrUint8Array;
          let options = {};
          if (typeof arg0 === "string") {
            filePathOrUint8Array = arg0;
            if (typeof arg1 === "object" && arg1 !== null) {
              options = arg1;
            } else if (typeof arg1 !== "undefined") {
              throw new TypeError("'options' must be an object.");
            }
          } else if (arg0 instanceof Uint8Array) {
            filePathOrUint8Array = arg0;
            if (typeof arg1 === "object" && arg1 !== null) {
              options = arg1;
            } else if (typeof arg1 !== "undefined") {
              throw new TypeError("'options' must be an object.");
            }
          } else if (arg0 instanceof ArrayBuffer || typeof SharedArrayBuffer !== "undefined" && arg0 instanceof SharedArrayBuffer) {
            const buffer = arg0;
            let byteOffset = 0;
            let byteLength = arg0.byteLength;
            if (typeof arg1 === "object" && arg1 !== null) {
              options = arg1;
            } else if (typeof arg1 === "number") {
              byteOffset = arg1;
              if (!Number.isSafeInteger(byteOffset)) {
                throw new RangeError("'byteOffset' must be an integer.");
              }
              if (byteOffset < 0 || byteOffset >= buffer.byteLength) {
                throw new RangeError(`'byteOffset' is out of range [0, ${buffer.byteLength}).`);
              }
              byteLength = arg0.byteLength - byteOffset;
              if (typeof arg2 === "number") {
                byteLength = arg2;
                if (!Number.isSafeInteger(byteLength)) {
                  throw new RangeError("'byteLength' must be an integer.");
                }
                if (byteLength <= 0 || byteOffset + byteLength > buffer.byteLength) {
                  throw new RangeError(`'byteLength' is out of range (0, ${buffer.byteLength - byteOffset}].`);
                }
                if (typeof arg3 === "object" && arg3 !== null) {
                  options = arg3;
                } else if (typeof arg3 !== "undefined") {
                  throw new TypeError("'options' must be an object.");
                }
              } else if (typeof arg2 !== "undefined") {
                throw new TypeError("'byteLength' must be a number.");
              }
            } else if (typeof arg1 !== "undefined") {
              throw new TypeError("'options' must be an object.");
            }
            filePathOrUint8Array = new Uint8Array(buffer, byteOffset, byteLength);
          } else {
            throw new TypeError("Unexpected argument[0]: must be 'path' or 'buffer'.");
          }
          const [backend, optionsWithValidatedEPs] = await resolveBackendAndExecutionProviders(options);
          const handler = await backend.createInferenceSessionHandler(filePathOrUint8Array, optionsWithValidatedEPs);
          TRACE_EVENT_END("InferenceSession.create");
          TRACE_FUNC_END();
          return new _InferenceSession(handler);
        }
        startProfiling() {
          this.handler.startProfiling();
        }
        endProfiling() {
          this.handler.endProfiling();
        }
        get inputNames() {
          return this.handler.inputNames;
        }
        get outputNames() {
          return this.handler.outputNames;
        }
        get inputMetadata() {
          return this.handler.inputMetadata;
        }
        get outputMetadata() {
          return this.handler.outputMetadata;
        }
      };
    }
  });

  // common/dist/esm/inference-session.js
  var InferenceSession2;
  var init_inference_session = __esm({
    "common/dist/esm/inference-session.js"() {
      "use strict";
      init_inference_session_impl();
      InferenceSession2 = InferenceSession;
    }
  });

  // common/dist/esm/tensor-conversion.js
  var init_tensor_conversion = __esm({
    "common/dist/esm/tensor-conversion.js"() {
      "use strict";
    }
  });

  // common/dist/esm/tensor-factory.js
  var init_tensor_factory = __esm({
    "common/dist/esm/tensor-factory.js"() {
      "use strict";
    }
  });

  // common/dist/esm/onnx-model.js
  var init_onnx_model = __esm({
    "common/dist/esm/onnx-model.js"() {
      "use strict";
    }
  });

  // common/dist/esm/onnx-value.js
  var init_onnx_value = __esm({
    "common/dist/esm/onnx-value.js"() {
      "use strict";
    }
  });

  // common/dist/esm/index.js
  var esm_exports = {};
  __export(esm_exports, {
    InferenceSession: () => InferenceSession2,
    TRACE: () => TRACE,
    TRACE_EVENT_BEGIN: () => TRACE_EVENT_BEGIN,
    TRACE_EVENT_END: () => TRACE_EVENT_END,
    TRACE_FUNC_BEGIN: () => TRACE_FUNC_BEGIN,
    TRACE_FUNC_END: () => TRACE_FUNC_END,
    Tensor: () => Tensor2,
    env: () => env2,
    registerBackend: () => registerBackend
  });
  var init_esm = __esm({
    "common/dist/esm/index.js"() {
      "use strict";
      init_backend();
      init_env();
      init_inference_session();
      init_tensor();
      init_tensor_conversion();
      init_tensor_factory();
      init_trace();
      init_onnx_model();
      init_onnx_value();
    }
  });

  // web/lib/wasm/wasm-utils-env.ts
  var isNode;
  var init_wasm_utils_env = __esm({
    "web/lib/wasm/wasm-utils-env.ts"() {
      "use strict";
      isNode = false;
    }
  });

  // web/lib/wasm/proxy-worker/main.ts
  var main_exports = {};
  __export(main_exports, {
    default: () => main_default
  });
  var WORKER_NAME, isProxyWorker, main_default;
  var init_main = __esm({
    "web/lib/wasm/proxy-worker/main.ts"() {
      "use strict";
      init_wasm_core_impl();
      init_wasm_factory();
      init_wasm_utils_import();
      WORKER_NAME = "ort-wasm-proxy-worker";
      isProxyWorker = globalThis.self?.name === WORKER_NAME;
      if (isProxyWorker) {
        self.onmessage = (ev) => {
          const { type, in: message } = ev.data;
          try {
            switch (type) {
              case "init-wasm":
                initializeWebAssembly(message.wasm).then(
                  () => {
                    initRuntime(message).then(
                      () => {
                        postMessage({ type });
                      },
                      (err) => {
                        postMessage({ type, err });
                      }
                    );
                  },
                  (err) => {
                    postMessage({ type, err });
                  }
                );
                break;
              case "init-ep": {
                const { epName, env: env3 } = message;
                initEp(env3, epName).then(
                  () => {
                    postMessage({ type });
                  },
                  (err) => {
                    postMessage({ type, err });
                  }
                );
                break;
              }
              case "copy-from": {
                const { buffer } = message;
                const bufferData = copyFromExternalBuffer(buffer);
                postMessage({ type, out: bufferData });
                break;
              }
              case "create": {
                const { model, options } = message;
                createSession(model, options).then(
                  (sessionMetadata) => {
                    postMessage({ type, out: sessionMetadata });
                  },
                  (err) => {
                    postMessage({ type, err });
                  }
                );
                break;
              }
              case "release":
                releaseSession(message);
                postMessage({ type });
                break;
              case "run": {
                const { sessionId, inputIndices, inputs, outputIndices, options } = message;
                run(sessionId, inputIndices, inputs, outputIndices, new Array(outputIndices.length).fill(null), options).then(
                  (outputs) => {
                    if (outputs.some((o) => o[3] !== "cpu")) {
                      postMessage({ type, err: "Proxy does not support non-cpu tensor location." });
                    } else {
                      postMessage(
                        { type, out: outputs },
                        extractTransferableBuffers([...inputs, ...outputs])
                      );
                    }
                  },
                  (err) => {
                    postMessage({ type, err });
                  }
                );
                break;
              }
              case "end-profiling":
                endProfiling(message);
                postMessage({ type });
                break;
              default:
            }
          } catch (err) {
            postMessage({ type, err });
          }
        };
      }
      main_default = isProxyWorker ? null : (urlOverride) => new Worker(urlOverride ?? scriptSrc, { type: false ? "module" : "classic", name: WORKER_NAME });
    }
  });

  // web/lib/wasm/wasm-utils-import.ts
  var origin, getScriptSrc, scriptSrc, inferWasmPathPrefixFromScriptSrc, isSameOrigin, normalizeUrl, fallbackUrl, preload, dynamicImportDefault, createProxyWorker, importProxyWorker, embeddedWasmModule, importWasmModule;
  var init_wasm_utils_import = __esm({
    "web/lib/wasm/wasm-utils-import.ts"() {
      "use strict";
      init_wasm_utils_env();
      origin = isNode || typeof location === "undefined" ? void 0 : location.origin;
      getScriptSrc = () => {
        if (isNode) {
          return void 0;
        }
        if (false) {
          if (isEsmImportMetaUrlHardcodedAsFileUri) {
            const URL2 = URL;
            return new URL(new URL2("ort.jspi.js", void 0).href, origin).href;
          }
          return void 0;
        }
        return typeof document !== "undefined" ? document.currentScript?.src : (
          // use `self.location.href` if available
          typeof self !== "undefined" ? self.location?.href : void 0
        );
      };
      scriptSrc = getScriptSrc();
      inferWasmPathPrefixFromScriptSrc = () => {
        if (scriptSrc && !scriptSrc.startsWith("blob:")) {
          return scriptSrc.substring(0, scriptSrc.lastIndexOf("/") + 1);
        }
        return void 0;
      };
      isSameOrigin = (filename, prefixOverride) => {
        try {
          const baseUrl = prefixOverride ?? scriptSrc;
          const url = baseUrl ? new URL(filename, baseUrl) : new URL(filename);
          return url.origin === origin;
        } catch {
          return false;
        }
      };
      normalizeUrl = (filename, prefixOverride) => {
        const baseUrl = prefixOverride ?? scriptSrc;
        try {
          const url = baseUrl ? new URL(filename, baseUrl) : new URL(filename);
          return url.href;
        } catch {
          return void 0;
        }
      };
      fallbackUrl = (filename, prefixOverride) => `${prefixOverride ?? "./"}${filename}`;
      preload = async (absoluteUrl) => {
        const response = await fetch(absoluteUrl, { credentials: "same-origin" });
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      };
      dynamicImportDefault = async (url) => (await import(
        /* webpackIgnore: true */
        /* @vite-ignore */
        url
      )).default;
      createProxyWorker = // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      false ? void 0 : (init_main(), __toCommonJS(main_exports)).default;
      importProxyWorker = async () => {
        if (!scriptSrc) {
          throw new Error("Failed to load proxy worker: cannot determine the script source URL.");
        }
        if (isSameOrigin(scriptSrc)) {
          return [void 0, createProxyWorker()];
        }
        const url = await preload(scriptSrc);
        return [url, createProxyWorker(url)];
      };
      embeddedWasmModule = false ? (
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
        (false ? null : true ? null : true ? null : null).default
      ) : void 0;
      importWasmModule = async (urlOverride, prefixOverride, isMultiThreaded, isWasmOverridden) => {
        let useEmbeddedModule = embeddedWasmModule && !(urlOverride || prefixOverride);
        if (useEmbeddedModule) {
          if (!scriptSrc) {
            if (isWasmOverridden && !isMultiThreaded) {
              useEmbeddedModule = true;
            } else {
              throw new Error("cannot determine the script source URL.");
            }
          } else {
            useEmbeddedModule = isSameOrigin(scriptSrc) || isWasmOverridden && !isMultiThreaded;
          }
        }
        if (useEmbeddedModule) {
          return [void 0, embeddedWasmModule];
        } else {
          const wasmModuleFilename = false ? "ort-wasm-simd-threaded.jsep.mjs" : true ? "ort-wasm-simd-threaded.jspi.mjs" : true ? "ort-wasm-simd-threaded.asyncify.mjs" : "ort-wasm-simd-threaded.mjs";
          const wasmModuleUrl = urlOverride ?? normalizeUrl(wasmModuleFilename, prefixOverride);
          const needPreload = !isNode && isMultiThreaded && wasmModuleUrl && !isSameOrigin(wasmModuleUrl, prefixOverride);
          const url = needPreload ? await preload(wasmModuleUrl) : wasmModuleUrl ?? fallbackUrl(wasmModuleFilename, prefixOverride);
          return [needPreload ? url : void 0, await dynamicImportDefault(url)];
        }
      };
    }
  });

  // web/lib/wasm/wasm-factory.ts
  var wasm, initialized, initializing, aborted, isMultiThreadSupported, isSimdSupported, isRelaxedSimdSupported, initializeWebAssembly, getInstance;
  var init_wasm_factory = __esm({
    "web/lib/wasm/wasm-factory.ts"() {
      "use strict";
      init_wasm_utils_import();
      initialized = false;
      initializing = false;
      aborted = false;
      isMultiThreadSupported = () => {
        if (typeof SharedArrayBuffer === "undefined") {
          return false;
        }
        try {
          if (typeof MessageChannel !== "undefined") {
            new MessageChannel().port1.postMessage(new SharedArrayBuffer(1));
          }
          return WebAssembly.validate(
            new Uint8Array([
              0,
              97,
              115,
              109,
              1,
              0,
              0,
              0,
              1,
              4,
              1,
              96,
              0,
              0,
              3,
              2,
              1,
              0,
              5,
              4,
              1,
              3,
              1,
              1,
              10,
              11,
              1,
              9,
              0,
              65,
              0,
              254,
              16,
              2,
              0,
              26,
              11
            ])
          );
        } catch {
          return false;
        }
      };
      isSimdSupported = () => {
        try {
          return WebAssembly.validate(
            new Uint8Array([
              0,
              97,
              115,
              109,
              1,
              0,
              0,
              0,
              1,
              4,
              1,
              96,
              0,
              0,
              3,
              2,
              1,
              0,
              10,
              30,
              1,
              28,
              0,
              65,
              0,
              253,
              15,
              253,
              12,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              253,
              186,
              1,
              26,
              11
            ])
          );
        } catch {
          return false;
        }
      };
      isRelaxedSimdSupported = () => {
        try {
          return WebAssembly.validate(
            new Uint8Array([
              0,
              97,
              115,
              109,
              1,
              0,
              0,
              0,
              1,
              5,
              1,
              96,
              0,
              1,
              123,
              3,
              2,
              1,
              0,
              10,
              19,
              1,
              17,
              0,
              65,
              1,
              253,
              15,
              65,
              2,
              253,
              15,
              65,
              3,
              253,
              15,
              253,
              147,
              2,
              11
            ])
          );
        } catch {
          return false;
        }
      };
      initializeWebAssembly = async (flags) => {
        if (initialized) {
          return Promise.resolve();
        }
        if (initializing) {
          throw new Error("multiple calls to 'initializeWebAssembly()' detected.");
        }
        if (aborted) {
          throw new Error("previous call to 'initializeWebAssembly()' failed.");
        }
        initializing = true;
        const timeout = flags.initTimeout;
        let numThreads = flags.numThreads;
        if (flags.simd === false) {
        } else if (flags.simd === "relaxed") {
          if (!isRelaxedSimdSupported()) {
            throw new Error("Relaxed WebAssembly SIMD is not supported in the current environment.");
          }
        } else if (!isSimdSupported()) {
          throw new Error("WebAssembly SIMD is not supported in the current environment.");
        }
        if (true) {
          if (!("Suspending" in WebAssembly)) {
            throw new Error("WebAssembly JSPI is not supported in the current environment.");
          }
        }
        const multiThreadSupported = isMultiThreadSupported();
        if (numThreads > 1 && !multiThreadSupported) {
          if (typeof self !== "undefined" && !self.crossOriginIsolated) {
            console.warn(
              "env.wasm.numThreads is set to " + numThreads + ", but this will not work unless you enable crossOriginIsolated mode. See https://web.dev/cross-origin-isolation-guide/ for more info."
            );
          }
          console.warn(
            "WebAssembly multi-threading is not supported in the current environment. Falling back to single-threading."
          );
          flags.numThreads = numThreads = 1;
        }
        const wasmPaths = flags.wasmPaths;
        const wasmPrefixOverride = typeof wasmPaths === "string" ? wasmPaths : void 0;
        const mjsPathOverrideFlag = wasmPaths?.mjs;
        const mjsPathOverride = mjsPathOverrideFlag?.href ?? mjsPathOverrideFlag;
        const wasmPathOverrideFlag = wasmPaths?.wasm;
        const wasmPathOverride = wasmPathOverrideFlag?.href ?? wasmPathOverrideFlag;
        const wasmBinaryOverride = flags.wasmBinary;
        const [objectUrl, ortWasmFactory] = await importWasmModule(
          mjsPathOverride,
          wasmPrefixOverride,
          numThreads > 1,
          !!wasmBinaryOverride || !!wasmPathOverride
        );
        let isTimeout = false;
        const tasks = [];
        if (timeout > 0) {
          tasks.push(
            new Promise((resolve) => {
              setTimeout(() => {
                isTimeout = true;
                resolve();
              }, timeout);
            })
          );
        }
        tasks.push(
          new Promise((resolve, reject) => {
            const config = {
              /**
               * The number of threads. WebAssembly will create (Module.numThreads - 1) workers. If it is 1, no worker will be
               * created.
               */
              numThreads
            };
            if (wasmBinaryOverride) {
              config.wasmBinary = wasmBinaryOverride;
              config.locateFile = (fileName) => fileName;
            } else if (wasmPathOverride || wasmPrefixOverride) {
              config.locateFile = (fileName) => wasmPathOverride ?? wasmPrefixOverride + fileName;
            } else if (mjsPathOverride && mjsPathOverride.indexOf("blob:") !== 0) {
              config.locateFile = (fileName) => new URL(fileName, mjsPathOverride).href;
            } else if (objectUrl) {
              const inferredWasmPathPrefix = inferWasmPathPrefixFromScriptSrc();
              if (inferredWasmPathPrefix) {
                config.locateFile = (fileName) => inferredWasmPathPrefix + fileName;
              }
            }
            ortWasmFactory(config).then(
              // wasm module initialized successfully
              (module) => {
                initializing = false;
                initialized = true;
                wasm = module;
                resolve();
                if (objectUrl) {
                  URL.revokeObjectURL(objectUrl);
                }
              },
              // wasm module failed to initialize
              (what) => {
                initializing = false;
                aborted = true;
                reject(what);
              }
            );
          })
        );
        await Promise.race(tasks);
        if (isTimeout) {
          throw new Error(`WebAssembly backend initializing failed due to timeout: ${timeout}ms`);
        }
      };
      getInstance = () => {
        if (initialized && wasm) {
          return wasm;
        }
        throw new Error("WebAssembly is not initialized yet.");
      };
    }
  });

  // web/lib/wasm/wasm-utils.ts
  var allocWasmString, iterateExtraOptions, checkLastError;
  var init_wasm_utils = __esm({
    "web/lib/wasm/wasm-utils.ts"() {
      "use strict";
      init_wasm_factory();
      allocWasmString = (data, allocs) => {
        const wasm2 = getInstance();
        const dataLength = wasm2.lengthBytesUTF8(data) + 1;
        const dataOffset = wasm2._malloc(dataLength);
        wasm2.stringToUTF8(data, dataOffset, dataLength);
        allocs.push(dataOffset);
        return dataOffset;
      };
      iterateExtraOptions = (options, prefix, seen, handler) => {
        if (typeof options == "object" && options !== null) {
          if (seen.has(options)) {
            throw new Error("Circular reference in options");
          } else {
            seen.add(options);
          }
        }
        Object.entries(options).forEach(([key, value]) => {
          const name = prefix ? prefix + key : key;
          if (typeof value === "object") {
            iterateExtraOptions(value, name + ".", seen, handler);
          } else if (typeof value === "string" || typeof value === "number") {
            handler(name, value.toString());
          } else if (typeof value === "boolean") {
            handler(name, value ? "1" : "0");
          } else {
            throw new Error(`Can't handle extra config type: ${typeof value}`);
          }
        });
      };
      checkLastError = (message) => {
        const wasm2 = getInstance();
        const stack = wasm2.stackSave();
        try {
          const ptrSize = wasm2.PTR_SIZE;
          const paramsOffset = wasm2.stackAlloc(2 * ptrSize);
          wasm2._OrtGetLastError(paramsOffset, paramsOffset + ptrSize);
          const errorCode = Number(wasm2.getValue(paramsOffset, ptrSize === 4 ? "i32" : "i64"));
          const errorMessagePointer = wasm2.getValue(paramsOffset + ptrSize, "*");
          const errorMessage = errorMessagePointer ? wasm2.UTF8ToString(errorMessagePointer) : "";
          throw new Error(`${message} ERROR_CODE: ${errorCode}, ERROR_MESSAGE: ${errorMessage}`);
        } finally {
          wasm2.stackRestore(stack);
        }
      };
    }
  });

  // web/lib/wasm/run-options.ts
  var setRunOptions;
  var init_run_options = __esm({
    "web/lib/wasm/run-options.ts"() {
      "use strict";
      init_wasm_factory();
      init_wasm_utils();
      setRunOptions = (options) => {
        const wasm2 = getInstance();
        let runOptionsHandle = 0;
        const allocs = [];
        const runOptions = options || {};
        try {
          if (options?.logSeverityLevel === void 0) {
            runOptions.logSeverityLevel = 2;
          } else if (typeof options.logSeverityLevel !== "number" || !Number.isInteger(options.logSeverityLevel) || options.logSeverityLevel < 0 || options.logSeverityLevel > 4) {
            throw new Error(`log severity level is not valid: ${options.logSeverityLevel}`);
          }
          if (options?.logVerbosityLevel === void 0) {
            runOptions.logVerbosityLevel = 0;
          } else if (typeof options.logVerbosityLevel !== "number" || !Number.isInteger(options.logVerbosityLevel)) {
            throw new Error(`log verbosity level is not valid: ${options.logVerbosityLevel}`);
          }
          if (options?.terminate === void 0) {
            runOptions.terminate = false;
          }
          let tagDataOffset = 0;
          if (options?.tag !== void 0) {
            tagDataOffset = allocWasmString(options.tag, allocs);
          }
          runOptionsHandle = wasm2._OrtCreateRunOptions(
            runOptions.logSeverityLevel,
            runOptions.logVerbosityLevel,
            !!runOptions.terminate,
            tagDataOffset
          );
          if (runOptionsHandle === 0) {
            checkLastError("Can't create run options.");
          }
          if (options?.extra !== void 0) {
            iterateExtraOptions(options.extra, "", /* @__PURE__ */ new WeakSet(), (key, value) => {
              const keyDataOffset = allocWasmString(key, allocs);
              const valueDataOffset = allocWasmString(value, allocs);
              if (wasm2._OrtAddRunConfigEntry(runOptionsHandle, keyDataOffset, valueDataOffset) !== 0) {
                checkLastError(`Can't set a run config entry: ${key} - ${value}.`);
              }
            });
          }
          return [runOptionsHandle, allocs];
        } catch (e) {
          if (runOptionsHandle !== 0) {
            wasm2._OrtReleaseRunOptions(runOptionsHandle);
          }
          allocs.forEach((alloc) => wasm2._free(alloc));
          throw e;
        }
      };
    }
  });

  // web/lib/wasm/session-options.ts
  var getGraphOptimzationLevel, getExecutionMode, appendDefaultOptions, appendSessionConfig, appendEpOption, setExecutionProviders, setSessionOptions;
  var init_session_options = __esm({
    "web/lib/wasm/session-options.ts"() {
      "use strict";
      init_wasm_factory();
      init_wasm_utils();
      getGraphOptimzationLevel = (graphOptimizationLevel) => {
        switch (graphOptimizationLevel) {
          case "disabled":
            return 0;
          case "basic":
            return 1;
          case "extended":
            return 2;
          case "layout":
            return 3;
          case "all":
            return 99;
          default:
            throw new Error(`unsupported graph optimization level: ${graphOptimizationLevel}`);
        }
      };
      getExecutionMode = (executionMode) => {
        switch (executionMode) {
          case "sequential":
            return 0;
          case "parallel":
            return 1;
          default:
            throw new Error(`unsupported execution mode: ${executionMode}`);
        }
      };
      appendDefaultOptions = (options) => {
        if (!options.extra) {
          options.extra = {};
        }
        if (!options.extra.session) {
          options.extra.session = {};
        }
        const session = options.extra.session;
        if (!session.use_ort_model_bytes_directly) {
          session.use_ort_model_bytes_directly = "1";
        }
        if (options.executionProviders && options.executionProviders.some((ep) => (typeof ep === "string" ? ep : ep.name) === "webgpu")) {
          options.enableMemPattern = false;
        }
      };
      appendSessionConfig = (sessionOptionsHandle, key, value, allocs) => {
        const keyDataOffset = allocWasmString(key, allocs);
        const valueDataOffset = allocWasmString(value, allocs);
        if (getInstance()._OrtAddSessionConfigEntry(sessionOptionsHandle, keyDataOffset, valueDataOffset) !== 0) {
          checkLastError(`Can't set a session config entry: ${key} - ${value}.`);
        }
      };
      appendEpOption = (epOptions, key, value, allocs) => {
        const keyDataOffset = allocWasmString(key, allocs);
        const valueDataOffset = allocWasmString(value, allocs);
        epOptions.push([keyDataOffset, valueDataOffset]);
      };
      setExecutionProviders = async (sessionOptionsHandle, sessionOptions, allocs) => {
        const executionProviders = sessionOptions.executionProviders;
        for (const ep of executionProviders) {
          let epName = typeof ep === "string" ? ep : ep.name;
          const epOptions = [];
          switch (epName) {
            case "webnn":
              epName = "WEBNN";
              appendSessionConfig(sessionOptionsHandle, "session.disable_quant_qdq", "1", allocs);
              appendSessionConfig(sessionOptionsHandle, "session.disable_qdq_constant_folding", "1", allocs);
              if (typeof ep !== "string") {
                const webnnOptions = ep;
                const deviceType = webnnOptions?.deviceType;
                if (deviceType) {
                  appendSessionConfig(sessionOptionsHandle, "deviceType", deviceType, allocs);
                }
              }
              break;
            case "webgpu":
              if (true) {
                epName = "WebGPU";
                let customDevice;
                if (typeof ep !== "string") {
                  const webgpuOptions = ep;
                  if (webgpuOptions.device) {
                    if (typeof GPUDevice !== "undefined" && webgpuOptions.device instanceof GPUDevice) {
                      customDevice = webgpuOptions.device;
                    } else {
                      throw new Error("Invalid GPU device set in WebGPU EP options.");
                    }
                  }
                  const { enableGraphCapture } = sessionOptions;
                  if (typeof enableGraphCapture === "boolean" && enableGraphCapture) {
                    appendEpOption(epOptions, "enableGraphCapture", "1", allocs);
                  }
                  if (typeof webgpuOptions.preferredLayout === "string") {
                    appendEpOption(epOptions, "preferredLayout", webgpuOptions.preferredLayout, allocs);
                  }
                  if (webgpuOptions.forceCpuNodeNames) {
                    const names = Array.isArray(webgpuOptions.forceCpuNodeNames) ? webgpuOptions.forceCpuNodeNames : [webgpuOptions.forceCpuNodeNames];
                    appendEpOption(epOptions, "forceCpuNodeNames", names.join("\n"), allocs);
                  }
                  if (webgpuOptions.validationMode) {
                    appendEpOption(epOptions, "validationMode", webgpuOptions.validationMode, allocs);
                  }
                }
                const info = getInstance().webgpuRegisterDevice(customDevice);
                if (info) {
                  const [deviceId, instanceHandle, deviceHandle] = info;
                  appendEpOption(epOptions, "deviceId", deviceId.toString(), allocs);
                  appendEpOption(epOptions, "webgpuInstance", instanceHandle.toString(), allocs);
                  appendEpOption(epOptions, "webgpuDevice", deviceHandle.toString(), allocs);
                }
              } else {
                epName = "JS";
                if (typeof ep !== "string") {
                  const webgpuOptions = ep;
                  if (webgpuOptions?.preferredLayout) {
                    if (webgpuOptions.preferredLayout !== "NCHW" && webgpuOptions.preferredLayout !== "NHWC") {
                      throw new Error(`preferredLayout must be either 'NCHW' or 'NHWC': ${webgpuOptions.preferredLayout}`);
                    }
                    appendSessionConfig(sessionOptionsHandle, "preferredLayout", webgpuOptions.preferredLayout, allocs);
                  }
                }
              }
              break;
            case "wasm":
            case "cpu":
              continue;
            default:
              throw new Error(`not supported execution provider: ${epName}`);
          }
          const epNameDataOffset = allocWasmString(epName, allocs);
          const epOptionsCount = epOptions.length;
          let keysOffset = 0;
          let valuesOffset = 0;
          if (epOptionsCount > 0) {
            keysOffset = getInstance()._malloc(epOptionsCount * getInstance().PTR_SIZE);
            allocs.push(keysOffset);
            valuesOffset = getInstance()._malloc(epOptionsCount * getInstance().PTR_SIZE);
            allocs.push(valuesOffset);
            for (let i = 0; i < epOptionsCount; i++) {
              getInstance().setValue(keysOffset + i * getInstance().PTR_SIZE, epOptions[i][0], "*");
              getInstance().setValue(valuesOffset + i * getInstance().PTR_SIZE, epOptions[i][1], "*");
            }
          }
          if (await getInstance()._OrtAppendExecutionProvider(
            sessionOptionsHandle,
            epNameDataOffset,
            keysOffset,
            valuesOffset,
            epOptionsCount
          ) !== 0) {
            checkLastError(`Can't append execution provider: ${epName}.`);
          }
        }
      };
      setSessionOptions = async (options) => {
        const wasm2 = getInstance();
        let sessionOptionsHandle = 0;
        const allocs = [];
        const sessionOptions = options || {};
        appendDefaultOptions(sessionOptions);
        try {
          const graphOptimizationLevel = getGraphOptimzationLevel(sessionOptions.graphOptimizationLevel ?? "all");
          const executionMode = getExecutionMode(sessionOptions.executionMode ?? "sequential");
          const logIdDataOffset = typeof sessionOptions.logId === "string" ? allocWasmString(sessionOptions.logId, allocs) : 0;
          const logSeverityLevel = sessionOptions.logSeverityLevel ?? 2;
          if (!Number.isInteger(logSeverityLevel) || logSeverityLevel < 0 || logSeverityLevel > 4) {
            throw new Error(`log severity level is not valid: ${logSeverityLevel}`);
          }
          const logVerbosityLevel = sessionOptions.logVerbosityLevel ?? 0;
          if (!Number.isInteger(logVerbosityLevel) || logVerbosityLevel < 0 || logVerbosityLevel > 4) {
            throw new Error(`log verbosity level is not valid: ${logVerbosityLevel}`);
          }
          const optimizedModelFilePathOffset = typeof sessionOptions.optimizedModelFilePath === "string" ? allocWasmString(sessionOptions.optimizedModelFilePath, allocs) : 0;
          sessionOptionsHandle = wasm2._OrtCreateSessionOptions(
            graphOptimizationLevel,
            !!sessionOptions.enableCpuMemArena,
            !!sessionOptions.enableMemPattern,
            executionMode,
            !!sessionOptions.enableProfiling,
            0,
            logIdDataOffset,
            logSeverityLevel,
            logVerbosityLevel,
            optimizedModelFilePathOffset
          );
          if (sessionOptionsHandle === 0) {
            checkLastError("Can't create session options.");
          }
          if (sessionOptions.executionProviders) {
            await setExecutionProviders(sessionOptionsHandle, sessionOptions, allocs);
          }
          if (sessionOptions.enableGraphCapture !== void 0) {
            if (typeof sessionOptions.enableGraphCapture !== "boolean") {
              throw new Error(`enableGraphCapture must be a boolean value: ${sessionOptions.enableGraphCapture}`);
            }
            appendSessionConfig(
              sessionOptionsHandle,
              "enableGraphCapture",
              sessionOptions.enableGraphCapture.toString(),
              allocs
            );
          }
          if (sessionOptions.freeDimensionOverrides) {
            for (const [name, value] of Object.entries(sessionOptions.freeDimensionOverrides)) {
              if (typeof name !== "string") {
                throw new Error(`free dimension override name must be a string: ${name}`);
              }
              if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
                throw new Error(`free dimension override value must be a non-negative integer: ${value}`);
              }
              const nameOffset = allocWasmString(name, allocs);
              if (wasm2._OrtAddFreeDimensionOverride(sessionOptionsHandle, nameOffset, value) !== 0) {
                checkLastError(`Can't set a free dimension override: ${name} - ${value}.`);
              }
            }
          }
          if (sessionOptions.extra !== void 0) {
            iterateExtraOptions(sessionOptions.extra, "", /* @__PURE__ */ new WeakSet(), (key, value) => {
              appendSessionConfig(sessionOptionsHandle, key, value, allocs);
            });
          }
          return [sessionOptionsHandle, allocs];
        } catch (e) {
          if (sessionOptionsHandle !== 0) {
            if (wasm2._OrtReleaseSessionOptions(sessionOptionsHandle) !== 0) {
              checkLastError("Can't release session options.");
            }
          }
          allocs.forEach((alloc) => wasm2._free(alloc));
          throw e;
        }
      };
    }
  });

  // web/lib/wasm/wasm-common.ts
  var tensorDataTypeStringToEnum, tensorDataTypeEnumToString, calculateTensorSizeInBytes, tensorTypeToTypedArrayConstructor, logLevelStringToEnum, isGpuBufferSupportedType, isMLTensorSupportedType, dataLocationStringToEnum;
  var init_wasm_common = __esm({
    "web/lib/wasm/wasm-common.ts"() {
      "use strict";
      tensorDataTypeStringToEnum = (type) => {
        switch (type) {
          case "int8":
            return 3 /* int8 */;
          case "uint8":
            return 2 /* uint8 */;
          case "bool":
            return 9 /* bool */;
          case "int16":
            return 5 /* int16 */;
          case "uint16":
            return 4 /* uint16 */;
          case "int32":
            return 6 /* int32 */;
          case "uint32":
            return 12 /* uint32 */;
          case "float16":
            return 10 /* float16 */;
          case "float32":
            return 1 /* float */;
          case "float64":
            return 11 /* double */;
          case "string":
            return 8 /* string */;
          case "int64":
            return 7 /* int64 */;
          case "uint64":
            return 13 /* uint64 */;
          case "int4":
            return 22 /* int4 */;
          case "uint4":
            return 21 /* uint4 */;
          default:
            throw new Error(`unsupported data type: ${type}`);
        }
      };
      tensorDataTypeEnumToString = (typeProto) => {
        switch (typeProto) {
          case 3 /* int8 */:
            return "int8";
          case 2 /* uint8 */:
            return "uint8";
          case 9 /* bool */:
            return "bool";
          case 5 /* int16 */:
            return "int16";
          case 4 /* uint16 */:
            return "uint16";
          case 6 /* int32 */:
            return "int32";
          case 12 /* uint32 */:
            return "uint32";
          case 10 /* float16 */:
            return "float16";
          case 1 /* float */:
            return "float32";
          case 11 /* double */:
            return "float64";
          case 8 /* string */:
            return "string";
          case 7 /* int64 */:
            return "int64";
          case 13 /* uint64 */:
            return "uint64";
          case 22 /* int4 */:
            return "int4";
          case 21 /* uint4 */:
            return "uint4";
          default:
            throw new Error(`unsupported data type: ${typeProto}`);
        }
      };
      calculateTensorSizeInBytes = (dateType, dimsOrSize) => {
        const elementSize = [
          -1,
          // undefined = 0
          4,
          // float = 1
          1,
          // uint8 = 2
          1,
          // int8 = 3
          2,
          // uint16 = 4
          2,
          // int16 = 5
          4,
          // int32 = 6
          8,
          // int64 = 7
          -1,
          // string = 8
          1,
          // bool = 9
          2,
          // float16 = 10
          8,
          // double = 11
          4,
          // uint32 = 12
          8,
          // uint64 = 13
          -1,
          // complex64 = 14
          -1,
          // complex128 = 15
          -1,
          // bfloat16 = 16
          -1,
          // FLOAT8E4M3FN = 17
          -1,
          // FLOAT8E4M3FNUZ = 18
          -1,
          // FLOAT8E5M2 = 19
          -1,
          // FLOAT8E5M2FNUZ = 20
          0.5,
          // uint4 = 21
          0.5
          // int4 = 22
        ][dateType];
        const size = typeof dimsOrSize === "number" ? dimsOrSize : dimsOrSize.reduce((a, b) => a * b, 1);
        return elementSize > 0 ? Math.ceil(size * elementSize) : void 0;
      };
      tensorTypeToTypedArrayConstructor = (type) => {
        switch (type) {
          case "float16":
            return typeof Float16Array !== "undefined" && Float16Array.from ? Float16Array : Uint16Array;
          case "float32":
            return Float32Array;
          case "uint8":
            return Uint8Array;
          case "int8":
            return Int8Array;
          case "uint16":
            return Uint16Array;
          case "int16":
            return Int16Array;
          case "int32":
            return Int32Array;
          case "bool":
            return Uint8Array;
          case "float64":
            return Float64Array;
          case "uint32":
            return Uint32Array;
          case "int64":
            return BigInt64Array;
          case "uint64":
            return BigUint64Array;
          default:
            throw new Error(`unsupported type: ${type}`);
        }
      };
      logLevelStringToEnum = (logLevel) => {
        switch (logLevel) {
          case "verbose":
            return 0;
          case "info":
            return 1;
          case "warning":
            return 2;
          case "error":
            return 3;
          case "fatal":
            return 4;
          default:
            throw new Error(`unsupported logging level: ${logLevel}`);
        }
      };
      isGpuBufferSupportedType = (type) => type === "float32" || type === "float16" || type === "int32" || type === "int64" || type === "uint32" || type === "uint8" || type === "bool" || type === "uint4" || type === "int4";
      isMLTensorSupportedType = (type) => type === "float32" || type === "float16" || type === "int32" || type === "int64" || type === "uint32" || type === "uint64" || type === "int8" || type === "uint8" || type === "bool" || type === "uint4" || type === "int4";
      dataLocationStringToEnum = (location2) => {
        switch (location2) {
          case "none":
            return 0;
          case "cpu":
            return 1;
          case "cpu-pinned":
            return 2;
          case "texture":
            return 3;
          case "gpu-buffer":
            return 4;
          case "ml-tensor":
            return 5;
          default:
            throw new Error(`unsupported data location: ${location2}`);
        }
      };
    }
  });

  // web/lib/wasm/wasm-utils-load-file.ts
  var loadFile;
  var init_wasm_utils_load_file = __esm({
    "web/lib/wasm/wasm-utils-load-file.ts"() {
      "use strict";
      init_wasm_utils_env();
      loadFile = async (file) => {
        if (typeof file === "string") {
          if (isNode) {
            try {
              const { readFile } = __require("node:fs/promises");
              return new Uint8Array(await readFile(file));
            } catch (e) {
              if (e.code === "ERR_FS_FILE_TOO_LARGE") {
                const { createReadStream } = __require("node:fs");
                const stream = createReadStream(file);
                const chunks = [];
                for await (const chunk of stream) {
                  chunks.push(chunk);
                }
                return new Uint8Array(Buffer.concat(chunks));
              }
              throw e;
            }
          } else {
            const response = await fetch(file);
            if (!response.ok) {
              throw new Error(`failed to load external data file: ${file}`);
            }
            const contentLengthHeader = response.headers.get("Content-Length");
            const fileSize = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
            if (fileSize < 1073741824) {
              return new Uint8Array(await response.arrayBuffer());
            } else {
              if (!response.body) {
                throw new Error(`failed to load external data file: ${file}, no response body.`);
              }
              const reader = response.body.getReader();
              let buffer;
              try {
                buffer = new ArrayBuffer(fileSize);
              } catch (e) {
                if (e instanceof RangeError) {
                  const pages = Math.ceil(fileSize / 65536);
                  buffer = new WebAssembly.Memory({ initial: pages, maximum: pages }).buffer;
                } else {
                  throw e;
                }
              }
              let offset = 0;
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  break;
                }
                const chunkSize = value.byteLength;
                const chunk = new Uint8Array(buffer, offset, chunkSize);
                chunk.set(value);
                offset += chunkSize;
              }
              return new Uint8Array(buffer, 0, fileSize);
            }
          }
        } else if (file instanceof Blob) {
          return new Uint8Array(await file.arrayBuffer());
        } else if (file instanceof Uint8Array) {
          return file;
        } else {
          return new Uint8Array(file);
        }
      };
    }
  });

  // web/lib/wasm/jsep/tensor-view.ts
  var createView;
  var init_tensor_view = __esm({
    "web/lib/wasm/jsep/tensor-view.ts"() {
      "use strict";
      init_wasm_common();
      createView = (dataBuffer, type) => new (tensorTypeToTypedArrayConstructor(type))(dataBuffer);
    }
  });

  // web/lib/wasm/jsep/log.ts
  var logLevelPrefix, doLog, configLogLevel, debug, configureLogger, LOG, LOG_DEBUG;
  var init_log = __esm({
    "web/lib/wasm/jsep/log.ts"() {
      "use strict";
      init_wasm_common();
      logLevelPrefix = ["V", "I", "W", "E", "F"];
      doLog = (level, message) => {
        console.log(`[${logLevelPrefix[level]},${(/* @__PURE__ */ new Date()).toISOString()}]${message}`);
      };
      configureLogger = ($configLogLevel, $debug) => {
        configLogLevel = $configLogLevel;
        debug = $debug;
      };
      LOG = (logLevel, msg) => {
        const messageLevel = logLevelStringToEnum(logLevel);
        const configLevel = logLevelStringToEnum(configLogLevel);
        if (messageLevel >= configLevel) {
          doLog(messageLevel, typeof msg === "function" ? msg() : msg);
        }
      };
      LOG_DEBUG = (...args) => {
        if (debug) {
          LOG(...args);
        }
      };
    }
  });

  // web/lib/wasm/jsep/webnn/tensor-manager.ts
  var webnnDataTypeToSize, convertDataToInt32, convertInt32ToData, tensorGuid, createNewTensorId, webnnDataTypeToFallback, calculateByteLength, TensorWrapper, TensorIdTracker, TensorManagerImpl, createTensorManager;
  var init_tensor_manager = __esm({
    "web/lib/wasm/jsep/webnn/tensor-manager.ts"() {
      "use strict";
      init_wasm_common();
      init_log();
      webnnDataTypeToSize = /* @__PURE__ */ new Map([
        ["float32", 32],
        ["float16", 16],
        ["int32", 32],
        ["uint32", 32],
        ["int64", 64],
        ["uint64", 64],
        ["int8", 8],
        ["uint8", 8],
        ["int4", 4],
        ["uint4", 4]
      ]);
      convertDataToInt32 = (data, dataType) => {
        if (dataType === "int32") {
          return data;
        }
        const dataTypeSize = webnnDataTypeToSize.get(dataType);
        if (!dataTypeSize) {
          throw new Error(`WebNN backend does not support data type: ${dataType}`);
        }
        const bytesPerElement = dataTypeSize / 8;
        if (data.byteLength % bytesPerElement !== 0) {
          throw new Error(`Invalid Uint8Array length - must be a multiple of ${bytesPerElement}.`);
        }
        const numElements = data.byteLength / bytesPerElement;
        const originalArray = new (tensorTypeToTypedArrayConstructor(dataType))(data.buffer, data.byteOffset, numElements);
        switch (dataType) {
          case "int64":
          case "uint64": {
            const int32Array = new Int32Array(numElements);
            for (let i = 0; i < numElements; i++) {
              const value = originalArray[i];
              if (value > 2147483647n || value < -2147483648n) {
                throw new Error(`Can not convert int64 data to int32 - value out of range.`);
              }
              int32Array[i] = Number(value);
            }
            return new Uint8Array(int32Array.buffer);
          }
          case "int8":
          case "uint8":
          case "uint32": {
            if (dataType === "uint32") {
              if (originalArray.some((value) => value > 2147483647)) {
                throw new Error(`Can not convert uint32 data to int32 - value out of range.`);
              }
            }
            const int32Array = Int32Array.from(originalArray, Number);
            return new Uint8Array(int32Array.buffer);
          }
          default:
            throw new Error(`Unsupported data conversion from ${dataType} to 'int32'`);
        }
      };
      convertInt32ToData = (data, dataType) => {
        if (dataType === "int32") {
          return data;
        }
        if (data.byteLength % 4 !== 0) {
          throw new Error("Invalid Uint8Array length - must be a multiple of 4 (int32).");
        }
        const numElements = data.byteLength / 4;
        const int32Array = new Int32Array(data.buffer, data.byteOffset, numElements);
        switch (dataType) {
          case "int64": {
            const bigInt64Array = BigInt64Array.from(int32Array, BigInt);
            return new Uint8Array(bigInt64Array.buffer);
          }
          case "uint64": {
            if (int32Array.some((value) => value < 0)) {
              throw new Error("Can not convert int32 data to uin64 - negative value found.");
            }
            const bigUint64Array = BigUint64Array.from(int32Array, BigInt);
            return new Uint8Array(bigUint64Array.buffer);
          }
          case "int8": {
            if (int32Array.some((value) => value < -128 || value > 127)) {
              throw new Error("Can not convert int32 data to int8 - value out of range.");
            }
            const int8Array = Int8Array.from(int32Array, Number);
            return new Uint8Array(int8Array.buffer);
          }
          case "uint8": {
            if (int32Array.some((value) => value < 0 || value > 255)) {
              throw new Error("Can not convert int32 data to uint8 - value out of range.");
            }
            return Uint8Array.from(int32Array, Number);
          }
          case "uint32": {
            if (int32Array.some((value) => value < 0)) {
              throw new Error("Can not convert int32 data to uint32 - negative value found.");
            }
            const uint32Array = Uint32Array.from(int32Array, Number);
            return new Uint8Array(uint32Array.buffer);
          }
          default:
            throw new Error(`Unsupported data conversion from 'int32' to ${dataType}`);
        }
      };
      tensorGuid = 1;
      createNewTensorId = () => tensorGuid++;
      webnnDataTypeToFallback = /* @__PURE__ */ new Map([
        ["int8", "int32"],
        ["uint8", "int32"],
        ["uint32", "int32"],
        ["int64", "int32"]
      ]);
      calculateByteLength = (dataType, shape) => {
        const dataTypeSize = webnnDataTypeToSize.get(dataType);
        if (!dataTypeSize) {
          throw new Error(`WebNN backend does not support data type: ${dataType}`);
        }
        return shape.length > 0 ? Math.ceil(shape.reduce((a, b) => a * b) * dataTypeSize / 8) : 0;
      };
      TensorWrapper = class {
        constructor(descriptor) {
          // This flag is used to indicate whether the data has been converted to fallback data type.
          this.isDataConverted = false;
          const { sessionId, context, tensor, dataType, shape, fallbackDataType } = descriptor;
          this.sessionId = sessionId;
          this.mlContext = context;
          this.mlTensor = tensor;
          this.dataType = dataType;
          this.tensorShape = shape;
          this.fallbackDataType = fallbackDataType;
        }
        get tensor() {
          return this.mlTensor;
        }
        get type() {
          return this.dataType;
        }
        get fallbackType() {
          return this.fallbackDataType;
        }
        get shape() {
          return this.tensorShape;
        }
        get byteLength() {
          return calculateByteLength(this.dataType, this.tensorShape);
        }
        destroy() {
          LOG_DEBUG("verbose", () => "[WebNN] TensorWrapper.destroy");
          this.mlTensor.destroy();
        }
        write(data) {
          this.mlContext.writeTensor(this.mlTensor, data);
        }
        async read(dstBuffer) {
          if (this.fallbackDataType) {
            const data = await this.mlContext.readTensor(this.mlTensor);
            const originalData = convertInt32ToData(new Uint8Array(data), this.dataType);
            if (dstBuffer) {
              const targetBuffer = dstBuffer instanceof ArrayBuffer ? new Uint8Array(dstBuffer) : new Uint8Array(dstBuffer.buffer, dstBuffer.byteOffset, dstBuffer.byteLength);
              targetBuffer.set(originalData);
              return void 0;
            } else {
              return originalData.buffer;
            }
          } else {
            return dstBuffer ? this.mlContext.readTensor(this.mlTensor, dstBuffer) : this.mlContext.readTensor(this.mlTensor);
          }
        }
        canReuseTensor(context, dataType, shape) {
          return this.mlContext === context && this.dataType === dataType && this.tensorShape.length === shape.length && this.tensorShape.every((v, i) => v === shape[i]);
        }
        setIsDataConverted(isConverted) {
          this.isDataConverted = isConverted;
        }
      };
      TensorIdTracker = class {
        constructor(tensorManager, wrapper) {
          this.tensorManager = tensorManager;
          this.wrapper = wrapper;
        }
        get tensorWrapper() {
          return this.wrapper;
        }
        releaseTensor() {
          if (this.tensorWrapper) {
            this.tensorManager.releaseTensor(this.tensorWrapper);
            this.wrapper = void 0;
          }
        }
        async ensureTensor(sessionId, dataType, shape, copyOld) {
          const context = this.tensorManager.getMLContext(sessionId);
          const opLimits = this.tensorManager.getMLOpSupportLimits(sessionId);
          let fallbackDataType;
          if (!opLimits?.input.dataTypes.includes(dataType)) {
            fallbackDataType = webnnDataTypeToFallback.get(dataType);
            if (!fallbackDataType || opLimits?.input.dataTypes.includes(fallbackDataType)) {
              throw new Error(`WebNN backend does not support data type: ${dataType}`);
            }
            LOG_DEBUG(
              "verbose",
              () => `[WebNN] TensorIdTracker.ensureTensor: fallback dataType from ${dataType} to ${fallbackDataType}`
            );
          }
          if (this.wrapper) {
            if (this.wrapper.canReuseTensor(context, dataType, shape)) {
              return this.wrapper.tensor;
            } else {
              if (copyOld) {
                if (this.wrapper.byteLength !== calculateByteLength(dataType, shape)) {
                  throw new Error("Unable to copy data to tensor with different size.");
                }
                this.activeUpload = new Uint8Array(await this.wrapper.read());
              }
              this.tensorManager.releaseTensor(this.wrapper);
            }
          }
          const usage = typeof MLTensorUsage == "undefined" ? void 0 : MLTensorUsage.READ | MLTensorUsage.WRITE;
          this.wrapper = await this.tensorManager.getCachedTensor(
            sessionId,
            dataType,
            shape,
            usage,
            true,
            true,
            fallbackDataType
          );
          if (copyOld && this.activeUpload) {
            this.wrapper.write(this.activeUpload);
            this.activeUpload = void 0;
          }
          return this.wrapper.tensor;
        }
        upload(data) {
          let newData = data;
          if (this.wrapper) {
            if (this.wrapper.fallbackType) {
              if (this.wrapper.fallbackType === "int32") {
                newData = convertDataToInt32(data, this.wrapper.type);
                this.wrapper.setIsDataConverted(true);
              } else {
                throw new Error(`Unsupported fallback data type: ${this.wrapper.fallbackType}`);
              }
            }
            if (data.byteLength === this.wrapper.byteLength) {
              this.wrapper.write(newData);
              return;
            } else {
              LOG_DEBUG("verbose", () => "Data size does not match tensor size. Releasing tensor.");
              this.releaseTensor();
            }
          }
          if (this.activeUpload) {
            this.activeUpload.set(newData);
          } else {
            this.activeUpload = new Uint8Array(newData);
          }
        }
        async download(dstBuffer) {
          if (this.activeUpload) {
            const dstData = this.wrapper?.isDataConverted ? convertInt32ToData(this.activeUpload, this.wrapper?.type) : this.activeUpload;
            if (dstBuffer) {
              if (dstBuffer instanceof ArrayBuffer) {
                new Uint8Array(dstBuffer).set(dstData);
              } else {
                new Uint8Array(dstBuffer.buffer, dstBuffer.byteOffset, dstBuffer.byteLength).set(dstData);
              }
              return;
            } else {
              return dstData.buffer;
            }
          }
          if (!this.wrapper) {
            throw new Error("Tensor has not been created.");
          }
          if (!dstBuffer) {
            return this.wrapper.read();
          }
          return this.wrapper.read(dstBuffer);
        }
      };
      TensorManagerImpl = class {
        constructor(backend) {
          this.backend = backend;
          this.tensorTrackersById = /* @__PURE__ */ new Map();
          this.freeTensors = [];
          this.externalTensors = /* @__PURE__ */ new Set();
        }
        getMLContext(sessionId) {
          const context = this.backend.getMLContext(sessionId);
          if (!context) {
            throw new Error("MLContext not found for session.");
          }
          return context;
        }
        getMLOpSupportLimits(sessionId) {
          return this.backend.getMLOpSupportLimits(sessionId);
        }
        reserveTensorId() {
          const tensorId = createNewTensorId();
          this.tensorTrackersById.set(tensorId, new TensorIdTracker(this));
          return tensorId;
        }
        releaseTensorId(tensorId) {
          const tensorTracker = this.tensorTrackersById.get(tensorId);
          if (!tensorTracker) {
            return;
          }
          this.tensorTrackersById.delete(tensorId);
          if (tensorTracker.tensorWrapper) {
            this.releaseTensor(tensorTracker.tensorWrapper);
          }
        }
        async ensureTensor(sessionId, tensorId, dataType, shape, copyOld) {
          LOG_DEBUG(
            "verbose",
            () => `[WebNN] TensorManager.ensureTensor {tensorId: ${tensorId}, dataType: ${dataType}, shape: ${shape}, copyOld: ${copyOld}}`
          );
          const tensor = this.tensorTrackersById.get(tensorId);
          if (!tensor) {
            throw new Error("Tensor not found.");
          }
          return tensor.ensureTensor(sessionId, dataType, shape, copyOld);
        }
        upload(tensorId, data) {
          const tensor = this.tensorTrackersById.get(tensorId);
          if (!tensor) {
            throw new Error("Tensor not found.");
          }
          tensor.upload(data);
        }
        async download(tensorId, dstBuffer) {
          LOG_DEBUG(
            "verbose",
            () => `[WebNN] TensorManager.download {tensorId: ${tensorId}, dstBuffer: ${dstBuffer?.byteLength}}`
          );
          const tensorTracker = this.tensorTrackersById.get(tensorId);
          if (!tensorTracker) {
            throw new Error("Tensor not found.");
          }
          return tensorTracker.download(dstBuffer);
        }
        releaseTensorsForSession(sessionId) {
          for (const tensor of this.freeTensors) {
            if (tensor.sessionId === sessionId) {
              tensor.destroy();
            }
          }
          this.freeTensors = this.freeTensors.filter((tensor) => tensor.sessionId !== sessionId);
        }
        registerTensor(sessionId, mlTensor, dataType, shape) {
          const context = this.getMLContext(sessionId);
          const tensorId = createNewTensorId();
          const wrapper = new TensorWrapper({
            sessionId,
            context,
            tensor: mlTensor,
            dataType,
            shape
          });
          this.tensorTrackersById.set(tensorId, new TensorIdTracker(this, wrapper));
          this.externalTensors.add(wrapper);
          return tensorId;
        }
        /**
         * Get or create an MLTensor with the given data type and shape.
         */
        async getCachedTensor(sessionId, dataType, shape, usage, writable, readable, fallbackDataType) {
          const context = this.getMLContext(sessionId);
          for (const [index, tensor2] of this.freeTensors.entries()) {
            if (tensor2.canReuseTensor(context, dataType, shape)) {
              LOG_DEBUG(
                "verbose",
                () => `[WebNN] Reusing tensor {dataType: ${dataType}, ${fallbackDataType ? `fallbackDataType: ${fallbackDataType},` : ""} shape: ${shape}`
              );
              const wrapper = this.freeTensors.splice(index, 1)[0];
              wrapper.sessionId = sessionId;
              return wrapper;
            }
          }
          LOG_DEBUG(
            "verbose",
            () => `[WebNN] MLContext.createTensor {dataType: ${dataType}, ${fallbackDataType ? `fallbackDataType: ${fallbackDataType},` : ""} shape: ${shape}}`
          );
          const tensor = await context.createTensor({
            dataType: fallbackDataType ?? dataType,
            // If fallback data type is provided, use it.
            shape,
            dimensions: shape,
            usage,
            writable,
            readable
          });
          return new TensorWrapper({ sessionId, context, tensor, dataType, shape, fallbackDataType });
        }
        /**
         * Release tensor for reuse unless external.
         */
        releaseTensor(tensorWrapper) {
          if (this.externalTensors.has(tensorWrapper)) {
            this.externalTensors.delete(tensorWrapper);
          }
          this.freeTensors.push(tensorWrapper);
        }
      };
      createTensorManager = (...args) => new TensorManagerImpl(...args);
    }
  });

  // web/lib/wasm/jsep/backend-webnn.ts
  var backend_webnn_exports = {};
  __export(backend_webnn_exports, {
    WebNNBackend: () => WebNNBackend
  });
  var onnxDataTypeToWebnnDataType, compareMLContextOptions, WebNNBackend;
  var init_backend_webnn = __esm({
    "web/lib/wasm/jsep/backend-webnn.ts"() {
      "use strict";
      init_wasm_common();
      init_wasm_factory();
      init_tensor_view();
      init_tensor_manager();
      init_log();
      onnxDataTypeToWebnnDataType = /* @__PURE__ */ new Map([
        [1 /* float */, "float32"],
        [10 /* float16 */, "float16"],
        [6 /* int32 */, "int32"],
        [12 /* uint32 */, "uint32"],
        [7 /* int64 */, "int64"],
        [13 /* uint64 */, "uint64"],
        [22 /* int4 */, "int4"],
        [21 /* uint4 */, "uint4"],
        [3 /* int8 */, "int8"],
        [2 /* uint8 */, "uint8"],
        [9 /* bool */, "uint8"]
      ]);
      compareMLContextOptions = (a, b) => {
        if (a === b) {
          return true;
        }
        if (a === void 0 || b === void 0) {
          return false;
        }
        const aKeys = Object.keys(a).sort();
        const bKeys = Object.keys(b).sort();
        return aKeys.length === bKeys.length && aKeys.every((key, index) => key === bKeys[index] && a[key] === b[key]);
      };
      WebNNBackend = class {
        constructor(env3) {
          /**
           * Tensor managers for each session.
           */
          this.tensorManager = createTensorManager(this);
          /**
           * Maps from session id to MLContexts.
           */
          this.mlContextBySessionId = /* @__PURE__ */ new Map();
          /**
           * Maps from MLContext to session ids.
           */
          this.sessionIdsByMLContext = /* @__PURE__ */ new Map();
          /**
           * Cache of MLContexts.
           */
          this.mlContextCache = [];
          /**
           * Maps from session id to list of graph inputs.
           */
          this.sessionGraphInputs = /* @__PURE__ */ new Map();
          /**
           * Maps from session id to list of graph outputs.
           */
          this.sessionGraphOutputs = /* @__PURE__ */ new Map();
          /**
           * Temporary graph inputs for the current session.
           * These inputs will be registered when the session is created.
           */
          this.temporaryGraphInputs = [];
          /**
           * Temporary graph outputs for the current session.
           * These outputs will be registered when the session is created.
           */
          this.temporaryGraphOutputs = [];
          /**
           * Temporary tensors for the current session.
           */
          this.temporarySessionTensorIds = /* @__PURE__ */ new Map();
          /**
           * Maps from session id to MLOpSupportLimits.
           */
          this.mlOpSupportLimitsBySessionId = /* @__PURE__ */ new Map();
          configureLogger(env3.logLevel, !!env3.debug);
        }
        get currentSessionId() {
          if (this.activeSessionId === void 0) {
            throw new Error("No active session");
          }
          return this.activeSessionId;
        }
        onRunStart(sessionId) {
          LOG_DEBUG("verbose", () => `[WebNN] onRunStart {sessionId: ${sessionId}}`);
          this.activeSessionId = sessionId;
        }
        onRunEnd(sessionId) {
          LOG_DEBUG("verbose", () => `[WebNN] onRunEnd {sessionId: ${sessionId}}`);
          const tensorIds = this.temporarySessionTensorIds.get(sessionId);
          if (!tensorIds) {
            return;
          }
          for (const tensorId of tensorIds) {
            LOG_DEBUG("verbose", () => `[WebNN] releasing temporary tensor {tensorId: ${tensorId}}`);
            this.tensorManager.releaseTensorId(tensorId);
          }
          this.temporarySessionTensorIds.delete(sessionId);
          this.activeSessionId = void 0;
        }
        async createMLContext(optionsOrDevice) {
          if (optionsOrDevice instanceof GPUDevice) {
            const mlContextIndex2 = this.mlContextCache.findIndex((entry) => entry.gpuDevice === optionsOrDevice);
            if (mlContextIndex2 !== -1) {
              return this.mlContextCache[mlContextIndex2].mlContext;
            } else {
              const mlContext = await navigator.ml.createContext(optionsOrDevice);
              this.mlContextCache.push({ gpuDevice: optionsOrDevice, mlContext });
              return mlContext;
            }
          } else if (optionsOrDevice === void 0) {
            const mlContextIndex2 = this.mlContextCache.findIndex(
              (entry) => entry.options === void 0 && entry.gpuDevice === void 0
            );
            if (mlContextIndex2 !== -1) {
              return this.mlContextCache[mlContextIndex2].mlContext;
            } else {
              const mlContext = await navigator.ml.createContext();
              this.mlContextCache.push({ mlContext });
              return mlContext;
            }
          }
          const mlContextIndex = this.mlContextCache.findIndex(
            (entry) => compareMLContextOptions(entry.options, optionsOrDevice)
          );
          if (mlContextIndex !== -1) {
            return this.mlContextCache[mlContextIndex].mlContext;
          } else {
            const mlContext = await navigator.ml.createContext(optionsOrDevice);
            this.mlContextCache.push({ options: optionsOrDevice, mlContext });
            return mlContext;
          }
        }
        registerMLContext(sessionId, mlContext) {
          this.mlContextBySessionId.set(sessionId, mlContext);
          let sessionIds = this.sessionIdsByMLContext.get(mlContext);
          if (!sessionIds) {
            sessionIds = /* @__PURE__ */ new Set();
            this.sessionIdsByMLContext.set(mlContext, sessionIds);
          }
          sessionIds.add(sessionId);
          if (!this.mlOpSupportLimitsBySessionId.has(sessionId)) {
            this.mlOpSupportLimitsBySessionId.set(sessionId, mlContext.opSupportLimits());
          }
          if (this.temporaryGraphInputs.length > 0) {
            this.sessionGraphInputs.set(sessionId, this.temporaryGraphInputs);
            this.temporaryGraphInputs = [];
          }
          if (this.temporaryGraphOutputs.length > 0) {
            this.sessionGraphOutputs.set(sessionId, this.temporaryGraphOutputs);
            this.temporaryGraphOutputs = [];
          }
        }
        onReleaseSession(sessionId) {
          this.sessionGraphInputs.delete(sessionId);
          this.sessionGraphOutputs.delete(sessionId);
          const mlContext = this.mlContextBySessionId.get(sessionId);
          if (!mlContext) {
            return;
          }
          this.tensorManager.releaseTensorsForSession(sessionId);
          this.mlContextBySessionId.delete(sessionId);
          this.mlOpSupportLimitsBySessionId.delete(sessionId);
          const sessionIds = this.sessionIdsByMLContext.get(mlContext);
          sessionIds.delete(sessionId);
          if (sessionIds.size === 0) {
            this.sessionIdsByMLContext.delete(mlContext);
            const mlContextIndex = this.mlContextCache.findIndex((entry) => entry.mlContext === mlContext);
            if (mlContextIndex !== -1) {
              this.mlContextCache.splice(mlContextIndex, 1);
            }
          }
        }
        getMLContext(sessionId) {
          return this.mlContextBySessionId.get(sessionId);
        }
        getMLOpSupportLimits(sessionId) {
          return this.mlOpSupportLimitsBySessionId.get(sessionId);
        }
        reserveTensorId() {
          return this.tensorManager.reserveTensorId();
        }
        releaseTensorId(tensorId) {
          LOG_DEBUG("verbose", () => `[WebNN] releaseTensorId {tensorId: ${tensorId}}`);
          this.tensorManager.releaseTensorId(tensorId);
        }
        async ensureTensor(sessionId, tensorId, onnxDataType, dimensions, copyOld) {
          const webnnDataType = onnxDataTypeToWebnnDataType.get(onnxDataType);
          if (!webnnDataType) {
            throw new Error(`Unsupported ONNX data type: ${onnxDataType}`);
          }
          return this.tensorManager.ensureTensor(
            sessionId ?? this.currentSessionId,
            tensorId,
            webnnDataType,
            dimensions,
            copyOld
          );
        }
        async createTemporaryTensor(sessionId, onnxDataType, shape) {
          LOG_DEBUG("verbose", () => `[WebNN] createTemporaryTensor {onnxDataType: ${onnxDataType}, shape: ${shape}}`);
          const dataType = onnxDataTypeToWebnnDataType.get(onnxDataType);
          if (!dataType) {
            throw new Error(`Unsupported ONNX data type: ${onnxDataType}`);
          }
          const tensorId = this.tensorManager.reserveTensorId();
          await this.tensorManager.ensureTensor(sessionId, tensorId, dataType, shape, false);
          const tensorIds = this.temporarySessionTensorIds.get(sessionId);
          if (!tensorIds) {
            this.temporarySessionTensorIds.set(sessionId, [tensorId]);
          } else {
            tensorIds.push(tensorId);
          }
          return tensorId;
        }
        uploadTensor(tensorId, data) {
          const wasm2 = getInstance();
          if (!wasm2.shouldTransferToMLTensor) {
            throw new Error("Trying to upload to a MLTensor while shouldTransferToMLTensor is false");
          }
          LOG_DEBUG("verbose", () => `[WebNN] uploadTensor {tensorId: ${tensorId}, data: ${data.byteLength}}`);
          this.tensorManager.upload(tensorId, data);
        }
        async downloadTensor(tensorId, dstBuffer) {
          return this.tensorManager.download(tensorId, dstBuffer);
        }
        createMLTensorDownloader(tensorId, type) {
          return async () => {
            const data = await this.tensorManager.download(tensorId);
            return createView(data, type);
          };
        }
        registerMLTensor(sessionId, tensor, onnxDataType, dimensions) {
          const webnnDataType = onnxDataTypeToWebnnDataType.get(onnxDataType);
          if (!webnnDataType) {
            throw new Error(`Unsupported ONNX data type: ${onnxDataType}`);
          }
          const id = this.tensorManager.registerTensor(sessionId, tensor, webnnDataType, dimensions);
          LOG_DEBUG(
            "verbose",
            () => `[WebNN] registerMLTensor {tensor: ${tensor}, dataType: ${webnnDataType}, dimensions: ${dimensions}} -> {tensorId: ${id}}`
          );
          return id;
        }
        // Register a WebNN Constant operand from external data.
        registerMLConstant(externalFilePath, dataOffset, dataLength, builder, desc, mountedFiles, shouldConvertInt64ToInt32 = false) {
          if (!mountedFiles) {
            throw new Error("External mounted files are not available.");
          }
          let filePath = externalFilePath;
          if (externalFilePath.startsWith("./")) {
            filePath = externalFilePath.substring(2);
          }
          const fileData = mountedFiles.get(filePath);
          if (!fileData) {
            throw new Error(`File with name ${filePath} not found in preloaded files.`);
          }
          if (dataOffset + dataLength > fileData.byteLength) {
            throw new Error("Out of bounds: data offset and length exceed the external file data size.");
          }
          const buffer = fileData.slice(dataOffset, dataOffset + dataLength).buffer;
          let bufferView;
          switch (desc.dataType) {
            case "float32":
              bufferView = new Float32Array(buffer);
              break;
            case "float16":
              bufferView = typeof Float16Array !== "undefined" && Float16Array.from ? new Float16Array(buffer) : new Uint16Array(buffer);
              break;
            case "int32":
              bufferView = new Int32Array(buffer);
              break;
            case "uint32":
              bufferView = new Uint32Array(buffer);
              break;
            case "int64":
              if (shouldConvertInt64ToInt32) {
                const int32Buffer = convertDataToInt32(new Uint8Array(buffer), "int64");
                bufferView = new Int32Array(int32Buffer.buffer);
                desc.dataType = "int32";
              } else {
                bufferView = new BigInt64Array(buffer);
              }
              break;
            case "uint64":
              bufferView = new BigUint64Array(buffer);
              break;
            case "int8":
              bufferView = new Int8Array(buffer);
              break;
            case "int4":
            case "uint4":
            case "uint8":
              bufferView = new Uint8Array(buffer);
              break;
            default:
              throw new Error(`Unsupported data type: ${desc.dataType} in creating WebNN Constant from external data.`);
          }
          LOG_DEBUG(
            "verbose",
            () => `[WebNN] registerMLConstant {dataType: ${desc.dataType}, shape: ${desc.shape}}} ${shouldConvertInt64ToInt32 ? "(Note: it was int64 data type and registered to int32 as workaround)" : ""}`
          );
          return builder.constant(desc, bufferView);
        }
        registerGraphInput(inputName) {
          this.temporaryGraphInputs.push(inputName);
        }
        registerGraphOutput(outputName) {
          this.temporaryGraphOutputs.push(outputName);
        }
        isGraphInput(sessionId, inputName) {
          const inputNames = this.sessionGraphInputs.get(sessionId);
          if (!inputNames) {
            return false;
          }
          return inputNames.includes(inputName);
        }
        isGraphOutput(sessionId, outputName) {
          const outputNames = this.sessionGraphOutputs.get(sessionId);
          if (!outputNames) {
            return false;
          }
          return outputNames.includes(outputName);
        }
        isGraphInputOutputTypeSupported(sessionId, type, isInput = true) {
          const dataType = onnxDataTypeToWebnnDataType.get(tensorDataTypeStringToEnum(type));
          const opLimits = this.mlOpSupportLimitsBySessionId.get(sessionId);
          if (typeof dataType === "undefined") {
            return false;
          }
          if (isInput) {
            return !!opLimits?.input.dataTypes.includes(dataType);
          } else {
            return !!opLimits?.output.dataTypes.includes(dataType);
          }
        }
        flush() {
        }
      };
    }
  });

  // web/lib/wasm/wasm-core-impl.ts
  var initOrt, initRuntime, initEp, activeSessions, getSessionInputOutputCount, getSessionInputOutputMetadata, copyFromExternalBuffer, createSession, releaseSession, prepareInputOutputTensor, run, endProfiling, extractTransferableBuffers;
  var init_wasm_core_impl = __esm({
    "web/lib/wasm/wasm-core-impl.ts"() {
      "use strict";
      init_esm();
      init_run_options();
      init_session_options();
      init_wasm_common();
      init_wasm_factory();
      init_wasm_utils();
      init_wasm_utils_load_file();
      initOrt = (numThreads, loggingLevel) => {
        const errorCode = getInstance()._OrtInit(numThreads, loggingLevel);
        if (errorCode !== 0) {
          checkLastError("Can't initialize onnxruntime.");
        }
      };
      initRuntime = async (env3) => {
        initOrt(env3.wasm.numThreads, logLevelStringToEnum(env3.logLevel));
      };
      initEp = async (env3, epName) => {
        getInstance().asyncInit?.();
        let webgpuAdapter = env3.webgpu.adapter;
        if (epName === "webgpu") {
          if (typeof navigator === "undefined" || !navigator.gpu) {
            throw new Error("WebGPU is not supported in current environment");
          }
          if (!webgpuAdapter) {
            const powerPreference = env3.webgpu.powerPreference;
            if (powerPreference !== void 0 && powerPreference !== "low-power" && powerPreference !== "high-performance") {
              throw new Error(`Invalid powerPreference setting: "${powerPreference}"`);
            }
            const forceFallbackAdapter = env3.webgpu.forceFallbackAdapter;
            if (forceFallbackAdapter !== void 0 && typeof forceFallbackAdapter !== "boolean") {
              throw new Error(`Invalid forceFallbackAdapter setting: "${forceFallbackAdapter}"`);
            }
            webgpuAdapter = await navigator.gpu.requestAdapter({ powerPreference, forceFallbackAdapter });
            if (!webgpuAdapter) {
              throw new Error(
                'Failed to get GPU adapter. You may need to enable flag "--enable-unsafe-webgpu" if you are using Chrome.'
              );
            }
          } else {
            if (typeof webgpuAdapter.limits !== "object" || typeof webgpuAdapter.features !== "object" || typeof webgpuAdapter.requestDevice !== "function") {
              throw new Error("Invalid GPU adapter set in `env.webgpu.adapter`. It must be a GPUAdapter object.");
            }
          }
        }
        if (epName === "webnn") {
          if (typeof navigator === "undefined" || !navigator.ml) {
            throw new Error("WebNN is not supported in current environment");
          }
        }
        if (false) {
          const initJsep = null.init;
          if (epName === "webgpu") {
            await initJsep("webgpu", getInstance(), env3, webgpuAdapter);
          }
          if (epName === "webnn") {
            await initJsep("webnn", getInstance(), env3);
          }
        } else {
          if (epName === "webgpu") {
            getInstance().webgpuInit((device) => {
              env3.webgpu.device = device;
            });
          }
          if (epName === "webnn") {
            const backend = new (init_backend_webnn(), __toCommonJS(backend_webnn_exports)).WebNNBackend(env3);
            getInstance().webnnInit([
              backend,
              // webnnReserveTensorId
              () => backend.reserveTensorId(),
              // webnnReleaseTensorId,
              (tensorId) => backend.releaseTensorId(tensorId),
              // webnnEnsureTensor
              async (sessionId, tensorId, onnxDataType, shape, copyOld) => backend.ensureTensor(sessionId, tensorId, onnxDataType, shape, copyOld),
              // webnnUploadTensor
              (tensorId, data) => {
                backend.uploadTensor(tensorId, data);
              },
              // webnnDownloadTensor
              async (tensorId, dstBuffer) => backend.downloadTensor(tensorId, dstBuffer),
              // webnnRegisterMLContext
              (sessionId, mlContext) => backend.registerMLContext(sessionId, mlContext),
              // webnnEnableTraceEvent
              !!env3.trace
            ]);
          }
        }
      };
      activeSessions = /* @__PURE__ */ new Map();
      getSessionInputOutputCount = (sessionHandle) => {
        const wasm2 = getInstance();
        const stack = wasm2.stackSave();
        try {
          const ptrSize = wasm2.PTR_SIZE;
          const dataOffset = wasm2.stackAlloc(2 * ptrSize);
          const errorCode = wasm2._OrtGetInputOutputCount(sessionHandle, dataOffset, dataOffset + ptrSize);
          if (errorCode !== 0) {
            checkLastError("Can't get session input/output count.");
          }
          const type = ptrSize === 4 ? "i32" : "i64";
          return [Number(wasm2.getValue(dataOffset, type)), Number(wasm2.getValue(dataOffset + ptrSize, type))];
        } finally {
          wasm2.stackRestore(stack);
        }
      };
      getSessionInputOutputMetadata = (sessionHandle, index) => {
        const wasm2 = getInstance();
        const stack = wasm2.stackSave();
        let metadataOffset = 0;
        try {
          const ptrSize = wasm2.PTR_SIZE;
          const dataOffset = wasm2.stackAlloc(2 * ptrSize);
          const errorCode = wasm2._OrtGetInputOutputMetadata(sessionHandle, index, dataOffset, dataOffset + ptrSize);
          if (errorCode !== 0) {
            checkLastError("Can't get session input/output metadata.");
          }
          const nameOffset = Number(wasm2.getValue(dataOffset, "*"));
          metadataOffset = Number(wasm2.getValue(dataOffset + ptrSize, "*"));
          const elementType = wasm2.HEAP32[metadataOffset / 4];
          if (elementType === 0) {
            return [nameOffset, 0];
          }
          const dimsCount = wasm2.HEAPU32[metadataOffset / 4 + 1];
          const dims = [];
          for (let i = 0; i < dimsCount; i++) {
            const symbolicDimNameOffset = Number(wasm2.getValue(metadataOffset + 8 + i * ptrSize, "*"));
            dims.push(
              symbolicDimNameOffset !== 0 ? wasm2.UTF8ToString(symbolicDimNameOffset) : Number(wasm2.getValue(metadataOffset + 8 + (i + dimsCount) * ptrSize, "*"))
            );
          }
          return [nameOffset, elementType, dims];
        } finally {
          wasm2.stackRestore(stack);
          if (metadataOffset !== 0) {
            wasm2._OrtFree(metadataOffset);
          }
        }
      };
      copyFromExternalBuffer = (model) => {
        const wasm2 = getInstance();
        const modelDataOffset = wasm2._malloc(model.byteLength);
        if (modelDataOffset === 0) {
          throw new Error(`Can't create a session. failed to allocate a buffer of size ${model.byteLength}.`);
        }
        wasm2.HEAPU8.set(model, modelDataOffset);
        return [modelDataOffset, model.byteLength];
      };
      createSession = async (modelData, options) => {
        let modelDataOffset, modelDataLength;
        const wasm2 = getInstance();
        if (Array.isArray(modelData)) {
          [modelDataOffset, modelDataLength] = modelData;
        } else if (modelData.buffer === wasm2.HEAPU8.buffer) {
          [modelDataOffset, modelDataLength] = [modelData.byteOffset, modelData.byteLength];
        } else {
          [modelDataOffset, modelDataLength] = copyFromExternalBuffer(modelData);
        }
        let sessionHandle = 0;
        let sessionOptionsHandle = 0;
        let ioBindingHandle = 0;
        let allocs = [];
        const inputNamesUTF8Encoded = [];
        const outputNamesUTF8Encoded = [];
        try {
          [sessionOptionsHandle, allocs] = await setSessionOptions(options);
          if (options?.externalData && wasm2.mountExternalData) {
            const loadingPromises = [];
            for (const file of options.externalData) {
              const path = typeof file === "string" ? file : file.path;
              loadingPromises.push(
                loadFile(typeof file === "string" ? file : file.data).then((data) => {
                  wasm2.mountExternalData(path, data);
                })
              );
            }
            await Promise.all(loadingPromises);
          }
          for (const provider of options?.executionProviders ?? []) {
            const providerName = typeof provider === "string" ? provider : provider.name;
            if (providerName === "webnn") {
              wasm2.shouldTransferToMLTensor = false;
              if (typeof provider !== "string") {
                const webnnOptions = provider;
                const context = webnnOptions?.context;
                const gpuDevice = webnnOptions?.gpuDevice;
                const deviceType = webnnOptions?.deviceType;
                const powerPreference = webnnOptions?.powerPreference;
                if (context) {
                  wasm2.currentContext = context;
                } else if (gpuDevice) {
                  wasm2.currentContext = await wasm2.webnnCreateMLContext(gpuDevice);
                } else {
                  wasm2.currentContext = await wasm2.webnnCreateMLContext({ deviceType, powerPreference });
                }
              } else {
                wasm2.currentContext = await wasm2.webnnCreateMLContext();
              }
              break;
            }
          }
          sessionHandle = await wasm2._OrtCreateSession(modelDataOffset, modelDataLength, sessionOptionsHandle);
          wasm2.webgpuOnCreateSession?.(sessionHandle);
          if (sessionHandle === 0) {
            checkLastError("Can't create a session.");
          }
          wasm2.jsepOnCreateSession?.();
          if (wasm2.currentContext) {
            wasm2.webnnRegisterMLContext(sessionHandle, wasm2.currentContext);
            wasm2.currentContext = void 0;
            wasm2.shouldTransferToMLTensor = true;
          }
          const [inputCount, outputCount] = getSessionInputOutputCount(sessionHandle);
          const enableGraphCapture = !!options?.enableGraphCapture;
          const inputNames = [];
          const outputNames = [];
          const inputMetadata = [];
          const outputMetadata = [];
          const outputPreferredLocations = [];
          for (let i = 0; i < inputCount; i++) {
            const [nameOffset, elementType, shape] = getSessionInputOutputMetadata(sessionHandle, i);
            if (nameOffset === 0) {
              checkLastError("Can't get an input name.");
            }
            inputNamesUTF8Encoded.push(nameOffset);
            const name = wasm2.UTF8ToString(nameOffset);
            inputNames.push(name);
            inputMetadata.push(
              elementType === 0 ? { name, isTensor: false } : { name, isTensor: true, type: tensorDataTypeEnumToString(elementType), shape }
            );
          }
          for (let i = 0; i < outputCount; i++) {
            const [nameOffset, elementType, shape] = getSessionInputOutputMetadata(sessionHandle, i + inputCount);
            if (nameOffset === 0) {
              checkLastError("Can't get an output name.");
            }
            outputNamesUTF8Encoded.push(nameOffset);
            const nameString = wasm2.UTF8ToString(nameOffset);
            outputNames.push(nameString);
            outputMetadata.push(
              elementType === 0 ? { name: nameString, isTensor: false } : { name: nameString, isTensor: true, type: tensorDataTypeEnumToString(elementType), shape }
            );
            if (true) {
              if (enableGraphCapture && options?.preferredOutputLocation === void 0) {
                outputPreferredLocations.push("gpu-buffer");
                continue;
              }
              const location2 = typeof options?.preferredOutputLocation === "string" ? options.preferredOutputLocation : options?.preferredOutputLocation?.[nameString] ?? "cpu";
              const isGraphOutput = wasm2.webnnIsGraphOutput;
              if (location2 === "cpu" && isGraphOutput && isGraphOutput(sessionHandle, nameString)) {
                outputPreferredLocations.push("ml-tensor-cpu-output");
                continue;
              }
              if (location2 !== "cpu" && location2 !== "cpu-pinned" && location2 !== "gpu-buffer" && location2 !== "ml-tensor") {
                throw new Error(`Not supported preferred output location: ${location2}.`);
              }
              if (enableGraphCapture && location2 !== "gpu-buffer") {
                throw new Error(
                  `Not supported preferred output location: ${location2}. Only 'gpu-buffer' location is supported when enableGraphCapture is true.`
                );
              }
              outputPreferredLocations.push(location2);
            }
          }
          let bindingState = null;
          if (outputPreferredLocations.some((l) => l === "gpu-buffer" || l === "ml-tensor" || l === "ml-tensor-cpu-output")) {
            ioBindingHandle = wasm2._OrtCreateBinding(sessionHandle);
            if (ioBindingHandle === 0) {
              checkLastError("Can't create IO binding.");
            }
            bindingState = {
              handle: ioBindingHandle,
              outputPreferredLocations,
              outputPreferredLocationsEncoded: outputPreferredLocations.map((l) => l === "ml-tensor-cpu-output" ? "ml-tensor" : l).map((l) => dataLocationStringToEnum(l))
            };
          }
          activeSessions.set(sessionHandle, [
            sessionHandle,
            inputNamesUTF8Encoded,
            outputNamesUTF8Encoded,
            bindingState,
            enableGraphCapture,
            false
          ]);
          return [sessionHandle, inputNames, outputNames, inputMetadata, outputMetadata];
        } catch (e) {
          inputNamesUTF8Encoded.forEach((buf) => wasm2._OrtFree(buf));
          outputNamesUTF8Encoded.forEach((buf) => wasm2._OrtFree(buf));
          if (ioBindingHandle !== 0) {
            if (wasm2._OrtReleaseBinding(ioBindingHandle) !== 0) {
              checkLastError("Can't release IO binding.");
            }
          }
          if (sessionHandle !== 0) {
            if (wasm2._OrtReleaseSession(sessionHandle) !== 0) {
              checkLastError("Can't release session.");
            }
          }
          throw e;
        } finally {
          wasm2._free(modelDataOffset);
          if (sessionOptionsHandle !== 0) {
            if (wasm2._OrtReleaseSessionOptions(sessionOptionsHandle) !== 0) {
              checkLastError("Can't release session options.");
            }
          }
          allocs.forEach((alloc) => wasm2._free(alloc));
          wasm2.unmountExternalData?.();
        }
      };
      releaseSession = (sessionId) => {
        const wasm2 = getInstance();
        const session = activeSessions.get(sessionId);
        if (!session) {
          throw new Error(`cannot release session. invalid session id: ${sessionId}`);
        }
        const [sessionHandle, inputNamesUTF8Encoded, outputNamesUTF8Encoded, ioBindingState, enableGraphCapture] = session;
        if (ioBindingState) {
          if (enableGraphCapture) {
            if (wasm2._OrtClearBoundOutputs(ioBindingState.handle) !== 0) {
              checkLastError("Can't clear bound outputs.");
            }
          }
          if (wasm2._OrtReleaseBinding(ioBindingState.handle) !== 0) {
            checkLastError("Can't release IO binding.");
          }
        }
        wasm2.jsepOnReleaseSession?.(sessionId);
        wasm2.webnnOnReleaseSession?.(sessionId);
        wasm2.webgpuOnReleaseSession?.(sessionId);
        inputNamesUTF8Encoded.forEach((buf) => wasm2._OrtFree(buf));
        outputNamesUTF8Encoded.forEach((buf) => wasm2._OrtFree(buf));
        if (wasm2._OrtReleaseSession(sessionHandle) !== 0) {
          checkLastError("Can't release session.");
        }
        activeSessions.delete(sessionId);
      };
      prepareInputOutputTensor = async (tensor, tensorHandles, allocs, sessionId, tensorNameUTF8Encoded, index, enableGraphCapture = false) => {
        if (!tensor) {
          tensorHandles.push(0);
          return;
        }
        const wasm2 = getInstance();
        const ptrSize = wasm2.PTR_SIZE;
        const dataType = tensor[0];
        const dims = tensor[1];
        const location2 = tensor[3];
        let actualLocation = location2;
        let rawData;
        let dataByteLength;
        if (dataType === "string" && (location2 === "gpu-buffer" || location2 === "ml-tensor")) {
          throw new Error("String tensor is not supported on GPU.");
        }
        if (enableGraphCapture && location2 !== "gpu-buffer") {
          throw new Error(
            `External buffer must be provided for input/output index ${index} when enableGraphCapture is true.`
          );
        }
        if (location2 === "gpu-buffer") {
          const gpuBuffer = tensor[2].gpuBuffer;
          dataByteLength = calculateTensorSizeInBytes(tensorDataTypeStringToEnum(dataType), dims);
          if (true) {
            const registerBuffer = wasm2.webgpuRegisterBuffer;
            if (!registerBuffer) {
              throw new Error('Tensor location "gpu-buffer" is not supported without using WebGPU.');
            }
            rawData = registerBuffer(gpuBuffer, sessionId);
          } else {
            const registerBuffer = wasm2.jsepRegisterBuffer;
            if (!registerBuffer) {
              throw new Error('Tensor location "gpu-buffer" is not supported without using WebGPU.');
            }
            rawData = registerBuffer(sessionId, index, gpuBuffer, dataByteLength);
          }
        } else if (location2 === "ml-tensor") {
          const mlTensor = tensor[2].mlTensor;
          dataByteLength = calculateTensorSizeInBytes(tensorDataTypeStringToEnum(dataType), dims);
          const registerMLTensor = wasm2.webnnRegisterMLTensor;
          if (!registerMLTensor) {
            throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');
          }
          rawData = registerMLTensor(sessionId, mlTensor, tensorDataTypeStringToEnum(dataType), dims);
        } else {
          const data = tensor[2];
          if (Array.isArray(data)) {
            dataByteLength = ptrSize * data.length;
            rawData = wasm2._malloc(dataByteLength);
            allocs.push(rawData);
            for (let i = 0; i < data.length; i++) {
              if (typeof data[i] !== "string") {
                throw new TypeError(`tensor data at index ${i} is not a string`);
              }
              wasm2.setValue(rawData + i * ptrSize, allocWasmString(data[i], allocs), "*");
            }
          } else {
            const isGraphInput = wasm2.webnnIsGraphInput;
            const isGraphOutput = wasm2.webnnIsGraphOutput;
            if (dataType !== "string" && isGraphInput && isGraphOutput) {
              const tensorName = wasm2.UTF8ToString(tensorNameUTF8Encoded);
              if (isGraphInput(sessionId, tensorName) || isGraphOutput(sessionId, tensorName)) {
                const dataTypeEnum = tensorDataTypeStringToEnum(dataType);
                dataByteLength = calculateTensorSizeInBytes(dataTypeEnum, dims);
                actualLocation = "ml-tensor";
                const createTemporaryTensor = wasm2.webnnCreateTemporaryTensor;
                const uploadTensor = wasm2.webnnUploadTensor;
                if (!createTemporaryTensor || !uploadTensor) {
                  throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');
                }
                const tensorId = await createTemporaryTensor(sessionId, dataTypeEnum, dims);
                uploadTensor(tensorId, new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
                rawData = tensorId;
              } else {
                dataByteLength = data.byteLength;
                rawData = wasm2._malloc(dataByteLength);
                allocs.push(rawData);
                wasm2.HEAPU8.set(new Uint8Array(data.buffer, data.byteOffset, dataByteLength), rawData);
              }
            } else {
              dataByteLength = data.byteLength;
              rawData = wasm2._malloc(dataByteLength);
              allocs.push(rawData);
              wasm2.HEAPU8.set(new Uint8Array(data.buffer, data.byteOffset, dataByteLength), rawData);
            }
          }
        }
        const stack = wasm2.stackSave();
        const dimsOffset = wasm2.stackAlloc(4 * dims.length);
        try {
          dims.forEach((d, index2) => wasm2.setValue(dimsOffset + index2 * ptrSize, d, ptrSize === 4 ? "i32" : "i64"));
          const tensor2 = wasm2._OrtCreateTensor(
            tensorDataTypeStringToEnum(dataType),
            rawData,
            dataByteLength,
            dimsOffset,
            dims.length,
            dataLocationStringToEnum(actualLocation)
          );
          if (tensor2 === 0) {
            checkLastError(`Can't create tensor for input/output. session=${sessionId}, index=${index}.`);
          }
          tensorHandles.push(tensor2);
        } finally {
          wasm2.stackRestore(stack);
        }
      };
      run = async (sessionId, inputIndices, inputTensors, outputIndices, outputTensors, options) => {
        const wasm2 = getInstance();
        const ptrSize = wasm2.PTR_SIZE;
        const session = activeSessions.get(sessionId);
        if (!session) {
          throw new Error(`cannot run inference. invalid session id: ${sessionId}`);
        }
        const sessionHandle = session[0];
        const inputNamesUTF8Encoded = session[1];
        const outputNamesUTF8Encoded = session[2];
        const ioBindingState = session[3];
        const enableGraphCapture = session[4];
        const inputOutputBound = session[5];
        const inputCount = inputIndices.length;
        const outputCount = outputIndices.length;
        let runOptionsHandle = 0;
        let runOptionsAllocs = [];
        const inputTensorHandles = [];
        const outputTensorHandles = [];
        const inputOutputAllocs = [];
        const preAllocatedOutputs = [];
        const beforeRunStack = wasm2.stackSave();
        const inputValuesOffset = wasm2.stackAlloc(inputCount * ptrSize);
        const inputNamesOffset = wasm2.stackAlloc(inputCount * ptrSize);
        const outputValuesOffset = wasm2.stackAlloc(outputCount * ptrSize);
        const outputNamesOffset = wasm2.stackAlloc(outputCount * ptrSize);
        try {
          [runOptionsHandle, runOptionsAllocs] = setRunOptions(options);
          TRACE_EVENT_BEGIN("wasm prepareInputOutputTensor");
          for (let i = 0; i < inputCount; i++) {
            await prepareInputOutputTensor(
              inputTensors[i],
              inputTensorHandles,
              inputOutputAllocs,
              sessionId,
              inputNamesUTF8Encoded[inputIndices[i]],
              inputIndices[i],
              enableGraphCapture
            );
          }
          for (let i = 0; i < outputCount; i++) {
            await prepareInputOutputTensor(
              outputTensors[i],
              outputTensorHandles,
              inputOutputAllocs,
              sessionId,
              outputNamesUTF8Encoded[outputIndices[i]],
              inputCount + outputIndices[i],
              enableGraphCapture
            );
          }
          TRACE_EVENT_END("wasm prepareInputOutputTensor");
          for (let i = 0; i < inputCount; i++) {
            wasm2.setValue(inputValuesOffset + i * ptrSize, inputTensorHandles[i], "*");
            wasm2.setValue(inputNamesOffset + i * ptrSize, inputNamesUTF8Encoded[inputIndices[i]], "*");
          }
          for (let i = 0; i < outputCount; i++) {
            wasm2.setValue(outputValuesOffset + i * ptrSize, outputTensorHandles[i], "*");
            wasm2.setValue(outputNamesOffset + i * ptrSize, outputNamesUTF8Encoded[outputIndices[i]], "*");
          }
          if (ioBindingState && !inputOutputBound) {
            const { handle, outputPreferredLocations, outputPreferredLocationsEncoded } = ioBindingState;
            if (inputNamesUTF8Encoded.length !== inputCount) {
              throw new Error(
                `input count from feeds (${inputCount}) is expected to be always equal to model's input count (${inputNamesUTF8Encoded.length}).`
              );
            }
            TRACE_EVENT_BEGIN("wasm bindInputsOutputs");
            for (let i = 0; i < inputCount; i++) {
              const index = inputIndices[i];
              const errorCode2 = await wasm2._OrtBindInput(handle, inputNamesUTF8Encoded[index], inputTensorHandles[i]);
              if (errorCode2 !== 0) {
                checkLastError(`Can't bind input[${i}] for session=${sessionId}.`);
              }
            }
            for (let i = 0; i < outputCount; i++) {
              const index = outputIndices[i];
              const location2 = outputTensors[i]?.[3];
              if (location2) {
                preAllocatedOutputs.push(outputTensorHandles[i]);
                const errorCode2 = wasm2._OrtBindOutput(handle, outputNamesUTF8Encoded[index], outputTensorHandles[i], 0);
                if (errorCode2 !== 0) {
                  checkLastError(`Can't bind pre-allocated output[${i}] for session=${sessionId}.`);
                }
              } else {
                const errorCode2 = wasm2._OrtBindOutput(
                  handle,
                  outputNamesUTF8Encoded[index],
                  0,
                  outputPreferredLocationsEncoded[index]
                );
                if (errorCode2 !== 0) {
                  checkLastError(`Can't bind output[${i}] to ${outputPreferredLocations[i]} for session=${sessionId}.`);
                }
              }
            }
            TRACE_EVENT_END("wasm bindInputsOutputs");
            activeSessions.set(sessionId, [
              sessionHandle,
              inputNamesUTF8Encoded,
              outputNamesUTF8Encoded,
              ioBindingState,
              enableGraphCapture,
              true
            ]);
          }
          wasm2.jsepOnRunStart?.(sessionHandle);
          wasm2.webnnOnRunStart?.(sessionHandle);
          let errorCode;
          if (ioBindingState) {
            errorCode = await wasm2._OrtRunWithBinding(
              sessionHandle,
              ioBindingState.handle,
              outputCount,
              outputValuesOffset,
              runOptionsHandle
            );
          } else {
            errorCode = await wasm2._OrtRun(
              sessionHandle,
              inputNamesOffset,
              inputValuesOffset,
              inputCount,
              outputNamesOffset,
              outputCount,
              outputValuesOffset,
              runOptionsHandle
            );
          }
          if (errorCode !== 0) {
            checkLastError("failed to call OrtRun().");
          }
          const output = [];
          const outputPromises = [];
          TRACE_EVENT_BEGIN("wasm ProcessOutputTensor");
          for (let i = 0; i < outputCount; i++) {
            const tensor = Number(wasm2.getValue(outputValuesOffset + i * ptrSize, "*"));
            if (tensor === outputTensorHandles[i] || preAllocatedOutputs.includes(outputTensorHandles[i])) {
              output.push(outputTensors[i]);
              if (tensor !== outputTensorHandles[i]) {
                if (wasm2._OrtReleaseTensor(tensor) !== 0) {
                  checkLastError("Can't release tensor.");
                }
              }
              continue;
            }
            const beforeGetTensorDataStack = wasm2.stackSave();
            const tensorDataOffset = wasm2.stackAlloc(4 * ptrSize);
            let keepOutputTensor = false;
            let type, dataOffset = 0;
            try {
              const errorCode2 = wasm2._OrtGetTensorData(
                tensor,
                tensorDataOffset,
                tensorDataOffset + ptrSize,
                tensorDataOffset + 2 * ptrSize,
                tensorDataOffset + 3 * ptrSize
              );
              if (errorCode2 !== 0) {
                checkLastError(`Can't access output tensor data on index ${i}.`);
              }
              const valueType = ptrSize === 4 ? "i32" : "i64";
              const dataType = Number(wasm2.getValue(tensorDataOffset, valueType));
              dataOffset = wasm2.getValue(tensorDataOffset + ptrSize, "*");
              const dimsOffset = wasm2.getValue(tensorDataOffset + ptrSize * 2, "*");
              const dimsLength = Number(wasm2.getValue(tensorDataOffset + ptrSize * 3, valueType));
              const dims = [];
              for (let i2 = 0; i2 < dimsLength; i2++) {
                dims.push(Number(wasm2.getValue(dimsOffset + i2 * ptrSize, valueType)));
              }
              if (wasm2._OrtFree(dimsOffset) !== 0) {
                checkLastError("Can't free memory for tensor dims.");
              }
              const size = dims.reduce((a, b) => a * b, 1);
              type = tensorDataTypeEnumToString(dataType);
              const preferredLocation = ioBindingState?.outputPreferredLocations[outputIndices[i]];
              if (type === "string") {
                if (preferredLocation === "gpu-buffer" || preferredLocation === "ml-tensor") {
                  throw new Error("String tensor is not supported on GPU.");
                }
                const stringData = [];
                for (let i2 = 0; i2 < size; i2++) {
                  const offset = wasm2.getValue(dataOffset + i2 * ptrSize, "*");
                  const nextOffset = wasm2.getValue(dataOffset + (i2 + 1) * ptrSize, "*");
                  const maxBytesToRead = i2 === size - 1 ? void 0 : nextOffset - offset;
                  stringData.push(wasm2.UTF8ToString(offset, maxBytesToRead));
                }
                output.push([type, dims, stringData, "cpu"]);
              } else {
                if (preferredLocation === "gpu-buffer" && size > 0) {
                  const getBuffer = true ? wasm2.webgpuGetBuffer : wasm2.jsepGetBuffer;
                  if (!getBuffer) {
                    throw new Error('preferredLocation "gpu-buffer" is not supported without using WebGPU.');
                  }
                  const gpuBuffer = getBuffer(dataOffset);
                  const bufferSize = calculateTensorSizeInBytes(dataType, size);
                  if (bufferSize === void 0 || !isGpuBufferSupportedType(type)) {
                    throw new Error(`Unsupported data type: ${type}`);
                  }
                  keepOutputTensor = true;
                  if (true) {
                    wasm2.webgpuRegisterBuffer(gpuBuffer, sessionId, dataOffset);
                    const downloadDataFunction = wasm2.webgpuCreateDownloader(gpuBuffer, bufferSize, sessionId);
                    output.push([
                      type,
                      dims,
                      {
                        gpuBuffer,
                        download: async () => {
                          const arrayBuffer = await downloadDataFunction();
                          const data = new (tensorTypeToTypedArrayConstructor(type))(arrayBuffer);
                          return data;
                        },
                        dispose: () => {
                          if (wasm2._OrtReleaseTensor(tensor) !== 0) {
                            checkLastError("Can't release tensor.");
                          }
                        }
                      },
                      "gpu-buffer"
                    ]);
                  } else {
                    output.push([
                      type,
                      dims,
                      {
                        gpuBuffer,
                        download: wasm2.jsepCreateDownloader(gpuBuffer, bufferSize, type),
                        dispose: () => {
                          if (wasm2._OrtReleaseTensor(tensor) !== 0) {
                            checkLastError("Can't release tensor.");
                          }
                        }
                      },
                      "gpu-buffer"
                    ]);
                  }
                } else if (preferredLocation === "ml-tensor" && size > 0) {
                  const ensureTensor = wasm2.webnnEnsureTensor;
                  const isGraphInputOutputTypeSupported = wasm2.webnnIsGraphInputOutputTypeSupported;
                  if (!ensureTensor || !isGraphInputOutputTypeSupported) {
                    throw new Error('preferredLocation "ml-tensor" is not supported without using WebNN.');
                  }
                  const tensorSize = calculateTensorSizeInBytes(dataType, size);
                  if (tensorSize === void 0 || !isMLTensorSupportedType(type)) {
                    throw new Error(`Unsupported data type: ${type}`);
                  }
                  if (!isGraphInputOutputTypeSupported(sessionId, type, false)) {
                    throw new Error(
                      `preferredLocation "ml-tensor" for ${type} output is not supported by current WebNN Context.`
                    );
                  }
                  const mlTensor = await ensureTensor(sessionId, dataOffset, dataType, dims, false);
                  keepOutputTensor = true;
                  output.push([
                    type,
                    dims,
                    {
                      mlTensor,
                      download: wasm2.webnnCreateMLTensorDownloader(dataOffset, type),
                      dispose: () => {
                        wasm2.webnnReleaseTensorId(dataOffset);
                        wasm2._OrtReleaseTensor(tensor);
                      }
                    },
                    "ml-tensor"
                  ]);
                } else if (preferredLocation === "ml-tensor-cpu-output" && size > 0) {
                  const data = wasm2.webnnCreateMLTensorDownloader(dataOffset, type)();
                  const index = output.length;
                  keepOutputTensor = true;
                  outputPromises.push(
                    (async () => {
                      const result = [index, await data];
                      wasm2.webnnReleaseTensorId(dataOffset);
                      wasm2._OrtReleaseTensor(tensor);
                      return result;
                    })()
                  );
                  output.push([type, dims, [], "cpu"]);
                } else {
                  const typedArrayConstructor = tensorTypeToTypedArrayConstructor(type);
                  const data = new typedArrayConstructor(size);
                  new Uint8Array(data.buffer, data.byteOffset, data.byteLength).set(
                    wasm2.HEAPU8.subarray(dataOffset, dataOffset + data.byteLength)
                  );
                  output.push([type, dims, data, "cpu"]);
                }
              }
            } finally {
              wasm2.stackRestore(beforeGetTensorDataStack);
              if (type === "string" && dataOffset) {
                wasm2._free(dataOffset);
              }
              if (!keepOutputTensor) {
                wasm2._OrtReleaseTensor(tensor);
              }
            }
          }
          if (ioBindingState && !enableGraphCapture) {
            if (wasm2._OrtClearBoundOutputs(ioBindingState.handle) !== 0) {
              checkLastError("Can't clear bound outputs.");
            }
            activeSessions.set(sessionId, [
              sessionHandle,
              inputNamesUTF8Encoded,
              outputNamesUTF8Encoded,
              ioBindingState,
              enableGraphCapture,
              false
            ]);
          }
          for (const [index, data] of await Promise.all(outputPromises)) {
            output[index][2] = data;
          }
          TRACE_EVENT_END("wasm ProcessOutputTensor");
          return output;
        } finally {
          wasm2.webnnOnRunEnd?.(sessionHandle);
          wasm2.stackRestore(beforeRunStack);
          if (true) {
            inputTensors.forEach((t) => {
              if (t && t[3] === "gpu-buffer") {
                wasm2.webgpuUnregisterBuffer(t[2].gpuBuffer);
              }
            });
            outputTensors.forEach((t) => {
              if (t && t[3] === "gpu-buffer") {
                wasm2.webgpuUnregisterBuffer(t[2].gpuBuffer);
              }
            });
          }
          inputTensorHandles.forEach((v) => wasm2._OrtReleaseTensor(v));
          outputTensorHandles.forEach((v) => wasm2._OrtReleaseTensor(v));
          inputOutputAllocs.forEach((p) => wasm2._free(p));
          if (runOptionsHandle !== 0) {
            wasm2._OrtReleaseRunOptions(runOptionsHandle);
          }
          runOptionsAllocs.forEach((p) => wasm2._free(p));
        }
      };
      endProfiling = (sessionId) => {
        const wasm2 = getInstance();
        const session = activeSessions.get(sessionId);
        if (!session) {
          throw new Error("invalid session id");
        }
        const sessionHandle = session[0];
        const profileFileName = wasm2._OrtEndProfiling(sessionHandle);
        if (profileFileName === 0) {
          checkLastError("Can't get an profile file name.");
        }
        wasm2._OrtFree(profileFileName);
      };
      extractTransferableBuffers = (tensors) => {
        const buffers = [];
        for (const tensor of tensors) {
          const data = tensor[2];
          if (!Array.isArray(data) && "buffer" in data) {
            buffers.push(data.buffer);
          }
        }
        return buffers;
      };
    }
  });

  // web/lib/wasm/proxy-wrapper.ts
  var isProxy, proxyWorker, initializing2, initialized2, aborted2, temporaryObjectUrl, initWasmCallbacks, queuedCallbacks, enqueueCallbacks, ensureWorker, onProxyWorkerMessage, initializeWebAssemblyAndOrtRuntime, initializeOrtEp, copyFromExternalBuffer2, createSession2, releaseSession2, run2, endProfiling2;
  var init_proxy_wrapper = __esm({
    "web/lib/wasm/proxy-wrapper.ts"() {
      "use strict";
      init_esm();
      init_wasm_core_impl();
      init_wasm_factory();
      init_wasm_utils_import();
      isProxy = () => !!env2.wasm.proxy && typeof document !== "undefined";
      initializing2 = false;
      initialized2 = false;
      aborted2 = false;
      queuedCallbacks = /* @__PURE__ */ new Map();
      enqueueCallbacks = (type, callbacks) => {
        const queue = queuedCallbacks.get(type);
        if (queue) {
          queue.push(callbacks);
        } else {
          queuedCallbacks.set(type, [callbacks]);
        }
      };
      ensureWorker = () => {
        if (initializing2 || !initialized2 || aborted2 || !proxyWorker) {
          throw new Error("worker not ready");
        }
      };
      onProxyWorkerMessage = (ev) => {
        switch (ev.data.type) {
          case "init-wasm":
            initializing2 = false;
            if (ev.data.err) {
              aborted2 = true;
              initWasmCallbacks[1](ev.data.err);
            } else {
              initialized2 = true;
              initWasmCallbacks[0]();
            }
            if (temporaryObjectUrl) {
              URL.revokeObjectURL(temporaryObjectUrl);
              temporaryObjectUrl = void 0;
            }
            break;
          case "init-ep":
          case "copy-from":
          case "create":
          case "release":
          case "run":
          case "end-profiling": {
            const callbacks = queuedCallbacks.get(ev.data.type);
            if (ev.data.err) {
              callbacks.shift()[1](ev.data.err);
            } else {
              callbacks.shift()[0](ev.data.out);
            }
            break;
          }
          default:
        }
      };
      initializeWebAssemblyAndOrtRuntime = async () => {
        if (initialized2) {
          return;
        }
        if (initializing2) {
          throw new Error("multiple calls to 'initWasm()' detected.");
        }
        if (aborted2) {
          throw new Error("previous call to 'initWasm()' failed.");
        }
        initializing2 = true;
        if (isProxy()) {
          return new Promise((resolve, reject) => {
            proxyWorker?.terminate();
            void importProxyWorker().then(([objectUrl, worker]) => {
              try {
                proxyWorker = worker;
                proxyWorker.onerror = (ev) => reject(ev);
                proxyWorker.onmessage = onProxyWorkerMessage;
                initWasmCallbacks = [resolve, reject];
                const message = { type: "init-wasm", in: env2 };
                if (!message.in.wasm.wasmPaths && objectUrl) {
                  const inferredWasmPathPrefix = inferWasmPathPrefixFromScriptSrc();
                  if (inferredWasmPathPrefix) {
                    message.in.wasm.wasmPaths = inferredWasmPathPrefix;
                  }
                }
                if (false) {
                  message.in.wasm.wasmPaths = {
                    wasm: false ? new URL("ort-wasm-simd-threaded.jsep.wasm", void 0).href : true ? new URL("ort-wasm-simd-threaded.jspi.wasm", void 0).href : true ? new URL("ort-wasm-simd-threaded.asyncify.wasm", void 0).href : new URL("ort-wasm-simd-threaded.wasm", void 0).href
                  };
                }
                proxyWorker.postMessage(message);
                temporaryObjectUrl = objectUrl;
              } catch (e) {
                reject(e);
              }
            }, reject);
          });
        } else {
          try {
            await initializeWebAssembly(env2.wasm);
            await initRuntime(env2);
            initialized2 = true;
          } catch (e) {
            aborted2 = true;
            throw e;
          } finally {
            initializing2 = false;
          }
        }
      };
      initializeOrtEp = async (epName) => {
        if (isProxy()) {
          ensureWorker();
          return new Promise((resolve, reject) => {
            enqueueCallbacks("init-ep", [resolve, reject]);
            const message = { type: "init-ep", in: { epName, env: env2 } };
            proxyWorker.postMessage(message);
          });
        } else {
          await initEp(env2, epName);
        }
      };
      copyFromExternalBuffer2 = async (buffer) => {
        if (isProxy()) {
          ensureWorker();
          return new Promise((resolve, reject) => {
            enqueueCallbacks("copy-from", [resolve, reject]);
            const message = { type: "copy-from", in: { buffer } };
            proxyWorker.postMessage(message, [buffer.buffer]);
          });
        } else {
          return copyFromExternalBuffer(buffer);
        }
      };
      createSession2 = async (model, options) => {
        if (isProxy()) {
          if (options?.preferredOutputLocation) {
            throw new Error('session option "preferredOutputLocation" is not supported for proxy.');
          }
          ensureWorker();
          return new Promise((resolve, reject) => {
            enqueueCallbacks("create", [resolve, reject]);
            const message = { type: "create", in: { model, options: { ...options } } };
            const transferable = [];
            if (model instanceof Uint8Array) {
              transferable.push(model.buffer);
            }
            proxyWorker.postMessage(message, transferable);
          });
        } else {
          return createSession(model, options);
        }
      };
      releaseSession2 = async (sessionId) => {
        if (isProxy()) {
          ensureWorker();
          return new Promise((resolve, reject) => {
            enqueueCallbacks("release", [resolve, reject]);
            const message = { type: "release", in: sessionId };
            proxyWorker.postMessage(message);
          });
        } else {
          releaseSession(sessionId);
        }
      };
      run2 = async (sessionId, inputIndices, inputs, outputIndices, outputs, options) => {
        if (isProxy()) {
          if (inputs.some((t) => t[3] !== "cpu")) {
            throw new Error("input tensor on GPU is not supported for proxy.");
          }
          if (outputs.some((t) => t)) {
            throw new Error("pre-allocated output tensor is not supported for proxy.");
          }
          ensureWorker();
          return new Promise((resolve, reject) => {
            enqueueCallbacks("run", [resolve, reject]);
            const serializableInputs = inputs;
            const message = {
              type: "run",
              in: { sessionId, inputIndices, inputs: serializableInputs, outputIndices, options }
            };
            proxyWorker.postMessage(message, extractTransferableBuffers(serializableInputs));
          });
        } else {
          return run(sessionId, inputIndices, inputs, outputIndices, outputs, options);
        }
      };
      endProfiling2 = async (sessionId) => {
        if (isProxy()) {
          ensureWorker();
          return new Promise((resolve, reject) => {
            enqueueCallbacks("end-profiling", [resolve, reject]);
            const message = { type: "end-profiling", in: sessionId };
            proxyWorker.postMessage(message);
          });
        } else {
          endProfiling(sessionId);
        }
      };
    }
  });

  // web/lib/wasm/session-handler-inference.ts
  var encodeTensorMetadata, decodeTensorMetadata, OnnxruntimeWebAssemblySessionHandler;
  var init_session_handler_inference = __esm({
    "web/lib/wasm/session-handler-inference.ts"() {
      "use strict";
      init_esm();
      init_proxy_wrapper();
      init_wasm_common();
      init_wasm_utils_env();
      init_wasm_utils_load_file();
      encodeTensorMetadata = (tensor, getName) => {
        switch (tensor.location) {
          case "cpu":
            return [tensor.type, tensor.dims, tensor.data, "cpu"];
          case "gpu-buffer":
            return [tensor.type, tensor.dims, { gpuBuffer: tensor.gpuBuffer }, "gpu-buffer"];
          case "ml-tensor":
            return [tensor.type, tensor.dims, { mlTensor: tensor.mlTensor }, "ml-tensor"];
          default:
            throw new Error(`invalid data location: ${tensor.location} for ${getName()}`);
        }
      };
      decodeTensorMetadata = (tensor) => {
        switch (tensor[3]) {
          case "cpu":
            return new Tensor2(tensor[0], tensor[2], tensor[1]);
          case "gpu-buffer": {
            const dataType = tensor[0];
            if (!isGpuBufferSupportedType(dataType)) {
              throw new Error(`not supported data type: ${dataType} for deserializing GPU tensor`);
            }
            const { gpuBuffer, download, dispose } = tensor[2];
            return Tensor2.fromGpuBuffer(gpuBuffer, { dataType, dims: tensor[1], download, dispose });
          }
          case "ml-tensor": {
            const dataType = tensor[0];
            if (!isMLTensorSupportedType(dataType)) {
              throw new Error(`not supported data type: ${dataType} for deserializing MLTensor tensor`);
            }
            const { mlTensor, download, dispose } = tensor[2];
            return Tensor2.fromMLTensor(mlTensor, { dataType, dims: tensor[1], download, dispose });
          }
          default:
            throw new Error(`invalid data location: ${tensor[3]}`);
        }
      };
      OnnxruntimeWebAssemblySessionHandler = class {
        async fetchModelAndCopyToWasmMemory(path) {
          return copyFromExternalBuffer2(await loadFile(path));
        }
        async loadModel(pathOrBuffer, options) {
          TRACE_FUNC_BEGIN();
          let model;
          if (typeof pathOrBuffer === "string") {
            if (isNode) {
              model = await loadFile(pathOrBuffer);
            } else {
              model = await this.fetchModelAndCopyToWasmMemory(pathOrBuffer);
            }
          } else {
            model = pathOrBuffer;
          }
          [this.sessionId, this.inputNames, this.outputNames, this.inputMetadata, this.outputMetadata] = await createSession2(
            model,
            options
          );
          TRACE_FUNC_END();
        }
        async dispose() {
          return releaseSession2(this.sessionId);
        }
        async run(feeds, fetches, options) {
          TRACE_FUNC_BEGIN();
          const inputArray = [];
          const inputIndices = [];
          Object.entries(feeds).forEach((kvp) => {
            const name = kvp[0];
            const tensor = kvp[1];
            const index = this.inputNames.indexOf(name);
            if (index === -1) {
              throw new Error(`invalid input '${name}'`);
            }
            inputArray.push(tensor);
            inputIndices.push(index);
          });
          const outputArray = [];
          const outputIndices = [];
          Object.entries(fetches).forEach((kvp) => {
            const name = kvp[0];
            const tensor = kvp[1];
            const index = this.outputNames.indexOf(name);
            if (index === -1) {
              throw new Error(`invalid output '${name}'`);
            }
            outputArray.push(tensor);
            outputIndices.push(index);
          });
          const inputs = inputArray.map(
            (t, i) => encodeTensorMetadata(t, () => `input "${this.inputNames[inputIndices[i]]}"`)
          );
          const outputs = outputArray.map(
            (t, i) => t ? encodeTensorMetadata(t, () => `output "${this.outputNames[outputIndices[i]]}"`) : null
          );
          const results = await run2(this.sessionId, inputIndices, inputs, outputIndices, outputs, options);
          const resultMap = {};
          for (let i = 0; i < results.length; i++) {
            resultMap[this.outputNames[outputIndices[i]]] = outputArray[i] ?? decodeTensorMetadata(results[i]);
          }
          TRACE_FUNC_END();
          return resultMap;
        }
        startProfiling() {
        }
        endProfiling() {
          void endProfiling2(this.sessionId);
        }
      };
    }
  });

  // web/lib/backend-wasm.ts
  var backend_wasm_exports = {};
  __export(backend_wasm_exports, {
    OnnxruntimeWebAssemblyBackend: () => OnnxruntimeWebAssemblyBackend,
    initializeFlags: () => initializeFlags,
    wasmBackend: () => wasmBackend
  });
  var initializeFlags, OnnxruntimeWebAssemblyBackend, wasmBackend;
  var init_backend_wasm = __esm({
    "web/lib/backend-wasm.ts"() {
      "use strict";
      init_esm();
      init_proxy_wrapper();
      init_session_handler_inference();
      initializeFlags = () => {
        if (typeof env2.wasm.initTimeout !== "number" || env2.wasm.initTimeout < 0) {
          env2.wasm.initTimeout = 0;
        }
        const simd = env2.wasm.simd;
        if (typeof simd !== "boolean" && simd !== void 0 && simd !== "fixed" && simd !== "relaxed") {
          console.warn(
            `Property "env.wasm.simd" is set to unknown value "${simd}". Reset it to \`false\` and ignore SIMD feature checking.`
          );
          env2.wasm.simd = false;
        }
        if (typeof env2.wasm.proxy !== "boolean") {
          env2.wasm.proxy = false;
        }
        if (typeof env2.wasm.trace !== "boolean") {
          env2.wasm.trace = false;
        }
        if (typeof env2.wasm.numThreads !== "number" || !Number.isInteger(env2.wasm.numThreads) || env2.wasm.numThreads <= 0) {
          if (typeof self !== "undefined" && !self.crossOriginIsolated) {
            env2.wasm.numThreads = 1;
          } else {
            const numCpuLogicalCores = typeof navigator === "undefined" ? __require("node:os").cpus().length : navigator.hardwareConcurrency;
            env2.wasm.numThreads = Math.min(4, Math.ceil((numCpuLogicalCores || 1) / 2));
          }
        }
      };
      OnnxruntimeWebAssemblyBackend = class {
        /**
         * This function initializes the WebAssembly backend.
         *
         * This function will be called only once for each backend name. It will be called the first time when
         * `ort.InferenceSession.create()` is called with a registered backend name.
         *
         * @param backendName - the registered backend name.
         */
        async init(backendName) {
          initializeFlags();
          await initializeWebAssemblyAndOrtRuntime();
          await initializeOrtEp(backendName);
        }
        async createInferenceSessionHandler(pathOrBuffer, options) {
          const handler = new OnnxruntimeWebAssemblySessionHandler();
          await handler.loadModel(pathOrBuffer, options);
          return handler;
        }
      };
      wasmBackend = new OnnxruntimeWebAssemblyBackend();
    }
  });

  // web/lib/index.ts
  var index_exports = {};
  __export(index_exports, {
    InferenceSession: () => InferenceSession2,
    TRACE: () => TRACE,
    TRACE_EVENT_BEGIN: () => TRACE_EVENT_BEGIN,
    TRACE_EVENT_END: () => TRACE_EVENT_END,
    TRACE_FUNC_BEGIN: () => TRACE_FUNC_BEGIN,
    TRACE_FUNC_END: () => TRACE_FUNC_END,
    Tensor: () => Tensor2,
    default: () => index_default,
    env: () => env2,
    registerBackend: () => registerBackend
  });
  init_esm();
  init_esm();
  init_esm();

  // web/lib/version.ts
  var version2 = "1.26.0";

  // web/lib/index.ts
  var index_default = esm_exports;
  if (false) {
    const onnxjsBackend = null.onnxjsBackend;
    registerBackend("webgl", onnxjsBackend, -10);
  }
  if (false) {
    throw new Error(
      "The current build is specified to enable both JSEP and WebGPU EP. This is not a valid configuration. JSEP and WebGPU EPs cannot be enabled at the same time."
    );
  }
  if (false) {
    throw new Error(
      "The current build is specified to enable WebNN EP without JSEP or WebGPU EP. This is not a valid configuration. WebNN EP requires either JSEP or WebGPU EP to be enabled."
    );
  }
  if (true) {
    const wasmBackend2 = (init_backend_wasm(), __toCommonJS(backend_wasm_exports)).wasmBackend;
    if (true) {
      registerBackend("webgpu", wasmBackend2, 5);
    }
    if (true) {
      registerBackend("webnn", wasmBackend2, 5);
    }
    registerBackend("cpu", wasmBackend2, 10);
    registerBackend("wasm", wasmBackend2, 10);
  }
  Object.defineProperty(env2.versions, "web", { value: version2, enumerable: true });
  return __toCommonJS(index_exports);
})();
typeof exports=="object"&&typeof module=="object"&&(module.exports=ort);
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vY29tbW9uL2xpYi9iYWNrZW5kLWltcGwudHMiLCAiLi4vLi4vY29tbW9uL2xpYi9iYWNrZW5kLnRzIiwgIi4uLy4uL2NvbW1vbi9saWIvdmVyc2lvbi50cyIsICIuLi8uLi9jb21tb24vbGliL2Vudi1pbXBsLnRzIiwgIi4uLy4uL2NvbW1vbi9saWIvZW52LnRzIiwgIi4uLy4uL2NvbW1vbi9saWIvdGVuc29yLWNvbnZlcnNpb24taW1wbC50cyIsICIuLi8uLi9jb21tb24vbGliL3RlbnNvci1mYWN0b3J5LWltcGwudHMiLCAiLi4vLi4vY29tbW9uL2xpYi90ZW5zb3ItaW1wbC10eXBlLW1hcHBpbmcudHMiLCAiLi4vLi4vY29tbW9uL2xpYi90ZW5zb3ItdXRpbHMtaW1wbC50cyIsICIuLi8uLi9jb21tb24vbGliL3RlbnNvci1pbXBsLnRzIiwgIi4uLy4uL2NvbW1vbi9saWIvdGVuc29yLnRzIiwgIi4uLy4uL2NvbW1vbi9saWIvdHJhY2UudHMiLCAiLi4vLi4vY29tbW9uL2xpYi9pbmZlcmVuY2Utc2Vzc2lvbi1pbXBsLnRzIiwgIi4uLy4uL2NvbW1vbi9saWIvaW5mZXJlbmNlLXNlc3Npb24udHMiLCAiLi4vLi4vY29tbW9uL2xpYi90ZW5zb3ItY29udmVyc2lvbi50cyIsICIuLi8uLi9jb21tb24vbGliL3RlbnNvci1mYWN0b3J5LnRzIiwgIi4uLy4uL2NvbW1vbi9saWIvb25ueC1tb2RlbC50cyIsICIuLi8uLi9jb21tb24vbGliL29ubngtdmFsdWUudHMiLCAiLi4vLi4vY29tbW9uL2xpYi9pbmRleC50cyIsICIuLi9saWIvd2FzbS93YXNtLXV0aWxzLWVudi50cyIsICIuLi9saWIvd2FzbS9wcm94eS13b3JrZXIvbWFpbi50cyIsICIuLi9saWIvd2FzbS93YXNtLXV0aWxzLWltcG9ydC50cyIsICIuLi9saWIvd2FzbS93YXNtLWZhY3RvcnkudHMiLCAiLi4vbGliL3dhc20vd2FzbS11dGlscy50cyIsICIuLi9saWIvd2FzbS9ydW4tb3B0aW9ucy50cyIsICIuLi9saWIvd2FzbS9zZXNzaW9uLW9wdGlvbnMudHMiLCAiLi4vbGliL3dhc20vd2FzbS1jb21tb24udHMiLCAiLi4vbGliL3dhc20vd2FzbS11dGlscy1sb2FkLWZpbGUudHMiLCAiLi4vbGliL3dhc20vanNlcC90ZW5zb3Itdmlldy50cyIsICIuLi9saWIvd2FzbS9qc2VwL2xvZy50cyIsICIuLi9saWIvd2FzbS9qc2VwL3dlYm5uL3RlbnNvci1tYW5hZ2VyLnRzIiwgIi4uL2xpYi93YXNtL2pzZXAvYmFja2VuZC13ZWJubi50cyIsICIuLi9saWIvd2FzbS93YXNtLWNvcmUtaW1wbC50cyIsICIuLi9saWIvd2FzbS9wcm94eS13cmFwcGVyLnRzIiwgIi4uL2xpYi93YXNtL3Nlc3Npb24taGFuZGxlci1pbmZlcmVuY2UudHMiLCAiLi4vbGliL2JhY2tlbmQtd2FzbS50cyIsICIuLi9saWIvaW5kZXgudHMiLCAiLi4vbGliL3ZlcnNpb24udHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8vIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuXG5pbXBvcnQgeyBCYWNrZW5kIH0gZnJvbSAnLi9iYWNrZW5kLmpzJztcbmltcG9ydCB7IEluZmVyZW5jZVNlc3Npb24gfSBmcm9tICcuL2luZmVyZW5jZS1zZXNzaW9uLmpzJztcblxuaW50ZXJmYWNlIEJhY2tlbmRJbmZvIHtcbiAgYmFja2VuZDogQmFja2VuZDtcbiAgcHJpb3JpdHk6IG51bWJlcjtcblxuICBpbml0UHJvbWlzZT86IFByb21pc2U8dm9pZD47XG4gIGluaXRpYWxpemVkPzogYm9vbGVhbjtcbiAgYWJvcnRlZD86IGJvb2xlYW47XG4gIGVycm9yPzogc3RyaW5nO1xufVxuXG5jb25zdCBiYWNrZW5kczogTWFwPHN0cmluZywgQmFja2VuZEluZm8+ID0gbmV3IE1hcCgpO1xuY29uc3QgYmFja2VuZHNTb3J0ZWRCeVByaW9yaXR5OiBzdHJpbmdbXSA9IFtdO1xuXG4vKipcbiAqIFJlZ2lzdGVyIGEgYmFja2VuZC5cbiAqXG4gKiBAcGFyYW0gbmFtZSAtIHRoZSBuYW1lIGFzIGEga2V5IHRvIGxvb2t1cCBhcyBhbiBleGVjdXRpb24gcHJvdmlkZXIuXG4gKiBAcGFyYW0gYmFja2VuZCAtIHRoZSBiYWNrZW5kIG9iamVjdC5cbiAqIEBwYXJhbSBwcmlvcml0eSAtIGFuIGludGVnZXIgaW5kaWNhdGluZyB0aGUgcHJpb3JpdHkgb2YgdGhlIGJhY2tlbmQuIEhpZ2hlciBudW1iZXIgbWVhbnMgaGlnaGVyIHByaW9yaXR5LiBpZiBwcmlvcml0eVxuICogPCAwLCBpdCB3aWxsIGJlIGNvbnNpZGVyZWQgYXMgYSAnYmV0YScgdmVyc2lvbiBhbmQgd2lsbCBub3QgYmUgdXNlZCBhcyBhIGZhbGxiYWNrIGJhY2tlbmQgYnkgZGVmYXVsdC5cbiAqXG4gKiBAaWdub3JlXG4gKi9cbmV4cG9ydCBjb25zdCByZWdpc3RlckJhY2tlbmQgPSAobmFtZTogc3RyaW5nLCBiYWNrZW5kOiBCYWNrZW5kLCBwcmlvcml0eTogbnVtYmVyKTogdm9pZCA9PiB7XG4gIGlmIChiYWNrZW5kICYmIHR5cGVvZiBiYWNrZW5kLmluaXQgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIGJhY2tlbmQuY3JlYXRlSW5mZXJlbmNlU2Vzc2lvbkhhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjb25zdCBjdXJyZW50QmFja2VuZCA9IGJhY2tlbmRzLmdldChuYW1lKTtcbiAgICBpZiAoY3VycmVudEJhY2tlbmQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgYmFja2VuZHMuc2V0KG5hbWUsIHsgYmFja2VuZCwgcHJpb3JpdHkgfSk7XG4gICAgfSBlbHNlIGlmIChjdXJyZW50QmFja2VuZC5wcmlvcml0eSA+IHByaW9yaXR5KSB7XG4gICAgICAvLyBzYW1lIG5hbWUgaXMgYWxyZWFkeSByZWdpc3RlcmVkIHdpdGggYSBoaWdoZXIgcHJpb3JpdHkuIHNraXAgcmVnaXN0ZXJhdGlvbi5cbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKGN1cnJlbnRCYWNrZW5kLnByaW9yaXR5ID09PSBwcmlvcml0eSkge1xuICAgICAgaWYgKGN1cnJlbnRCYWNrZW5kLmJhY2tlbmQgIT09IGJhY2tlbmQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBjYW5ub3QgcmVnaXN0ZXIgYmFja2VuZCBcIiR7bmFtZX1cIiB1c2luZyBwcmlvcml0eSAke3ByaW9yaXR5fWApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwcmlvcml0eSA+PSAwKSB7XG4gICAgICBjb25zdCBpID0gYmFja2VuZHNTb3J0ZWRCeVByaW9yaXR5LmluZGV4T2YobmFtZSk7XG4gICAgICBpZiAoaSAhPT0gLTEpIHtcbiAgICAgICAgYmFja2VuZHNTb3J0ZWRCeVByaW9yaXR5LnNwbGljZShpLCAxKTtcbiAgICAgIH1cblxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBiYWNrZW5kc1NvcnRlZEJ5UHJpb3JpdHkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGJhY2tlbmRzLmdldChiYWNrZW5kc1NvcnRlZEJ5UHJpb3JpdHlbaV0pIS5wcmlvcml0eSA8PSBwcmlvcml0eSkge1xuICAgICAgICAgIGJhY2tlbmRzU29ydGVkQnlQcmlvcml0eS5zcGxpY2UoaSwgMCwgbmFtZSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBiYWNrZW5kc1NvcnRlZEJ5UHJpb3JpdHkucHVzaChuYW1lKTtcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcignbm90IGEgdmFsaWQgYmFja2VuZCcpO1xufTtcblxuLyoqXG4gKiBUcnkgdG8gcmVzb2x2ZSBhbmQgaW5pdGlhbGl6ZSBhIGJhY2tlbmQuXG4gKlxuICogQHBhcmFtIGJhY2tlbmROYW1lIC0gdGhlIG5hbWUgb2YgdGhlIGJhY2tlbmQuXG4gKiBAcmV0dXJucyB0aGUgYmFja2VuZCBpbnN0YW5jZSBpZiByZXNvbHZlZCBhbmQgaW5pdGlhbGl6ZWQgc3VjY2Vzc2Z1bGx5LCBvciBhbiBlcnJvciBtZXNzYWdlIGlmIGZhaWxlZC5cbiAqL1xuY29uc3QgdHJ5UmVzb2x2ZUFuZEluaXRpYWxpemVCYWNrZW5kID0gYXN5bmMgKGJhY2tlbmROYW1lOiBzdHJpbmcpOiBQcm9taXNlPEJhY2tlbmQgfCBzdHJpbmc+ID0+IHtcbiAgY29uc3QgYmFja2VuZEluZm8gPSBiYWNrZW5kcy5nZXQoYmFja2VuZE5hbWUpO1xuICBpZiAoIWJhY2tlbmRJbmZvKSB7XG4gICAgcmV0dXJuICdiYWNrZW5kIG5vdCBmb3VuZC4nO1xuICB9XG5cbiAgaWYgKGJhY2tlbmRJbmZvLmluaXRpYWxpemVkKSB7XG4gICAgcmV0dXJuIGJhY2tlbmRJbmZvLmJhY2tlbmQ7XG4gIH0gZWxzZSBpZiAoYmFja2VuZEluZm8uYWJvcnRlZCkge1xuICAgIHJldHVybiBiYWNrZW5kSW5mby5lcnJvciE7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgaXNJbml0aWFsaXppbmcgPSAhIWJhY2tlbmRJbmZvLmluaXRQcm9taXNlO1xuICAgIHRyeSB7XG4gICAgICBpZiAoIWlzSW5pdGlhbGl6aW5nKSB7XG4gICAgICAgIGJhY2tlbmRJbmZvLmluaXRQcm9taXNlID0gYmFja2VuZEluZm8uYmFja2VuZC5pbml0KGJhY2tlbmROYW1lKTtcbiAgICAgIH1cbiAgICAgIGF3YWl0IGJhY2tlbmRJbmZvLmluaXRQcm9taXNlO1xuICAgICAgYmFja2VuZEluZm8uaW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgcmV0dXJuIGJhY2tlbmRJbmZvLmJhY2tlbmQ7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKCFpc0luaXRpYWxpemluZykge1xuICAgICAgICBiYWNrZW5kSW5mby5lcnJvciA9IGAke2V9YDtcbiAgICAgICAgYmFja2VuZEluZm8uYWJvcnRlZCA9IHRydWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gYmFja2VuZEluZm8uZXJyb3IhO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBkZWxldGUgYmFja2VuZEluZm8uaW5pdFByb21pc2U7XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIFJlc29sdmUgZXhlY3V0aW9uIHByb3ZpZGVycyBmcm9tIHRoZSBzcGVjaWZpYyBzZXNzaW9uIG9wdGlvbnMuXG4gKlxuICogQHBhcmFtIG9wdGlvbnMgLSB0aGUgc2Vzc2lvbiBvcHRpb25zIG9iamVjdC5cbiAqIEByZXR1cm5zIGEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvIGEgdHVwbGUgb2YgYW4gaW5pdGlhbGl6ZWQgYmFja2VuZCBpbnN0YW5jZSBhbmQgYSBzZXNzaW9uIG9wdGlvbnMgb2JqZWN0IHdpdGhcbiAqIGZpbHRlcmVkIEVQIGxpc3QuXG4gKlxuICogQGlnbm9yZVxuICovXG5leHBvcnQgY29uc3QgcmVzb2x2ZUJhY2tlbmRBbmRFeGVjdXRpb25Qcm92aWRlcnMgPSBhc3luYyAoXG4gIG9wdGlvbnM6IEluZmVyZW5jZVNlc3Npb24uU2Vzc2lvbk9wdGlvbnMsXG4pOiBQcm9taXNlPFtiYWNrZW5kOiBCYWNrZW5kLCBvcHRpb25zOiBJbmZlcmVuY2VTZXNzaW9uLlNlc3Npb25PcHRpb25zXT4gPT4ge1xuICAvLyBleHRyYWN0IGJhY2tlbmQgaGludHMgZnJvbSBzZXNzaW9uIG9wdGlvbnNcbiAgY29uc3QgZXBzID0gb3B0aW9ucy5leGVjdXRpb25Qcm92aWRlcnMgfHwgW107XG4gIGNvbnN0IGJhY2tlbmRIaW50cyA9IGVwcy5tYXAoKGkpID0+ICh0eXBlb2YgaSA9PT0gJ3N0cmluZycgPyBpIDogaS5uYW1lKSk7XG4gIGNvbnN0IGJhY2tlbmROYW1lcyA9IGJhY2tlbmRIaW50cy5sZW5ndGggPT09IDAgPyBiYWNrZW5kc1NvcnRlZEJ5UHJpb3JpdHkgOiBiYWNrZW5kSGludHM7XG5cbiAgLy8gdHJ5IHRvIHJlc29sdmUgYW5kIGluaXRpYWxpemUgYWxsIHJlcXVlc3RlZCBiYWNrZW5kc1xuICBsZXQgYmFja2VuZDogQmFja2VuZCB8IHVuZGVmaW5lZDtcbiAgY29uc3QgZXJyb3JzID0gW107XG4gIGNvbnN0IGF2YWlsYWJsZUJhY2tlbmROYW1lcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBmb3IgKGNvbnN0IGJhY2tlbmROYW1lIG9mIGJhY2tlbmROYW1lcykge1xuICAgIGNvbnN0IHJlc29sdmVSZXN1bHQgPSBhd2FpdCB0cnlSZXNvbHZlQW5kSW5pdGlhbGl6ZUJhY2tlbmQoYmFja2VuZE5hbWUpO1xuICAgIGlmICh0eXBlb2YgcmVzb2x2ZVJlc3VsdCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGVycm9ycy5wdXNoKHsgbmFtZTogYmFja2VuZE5hbWUsIGVycjogcmVzb2x2ZVJlc3VsdCB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCFiYWNrZW5kKSB7XG4gICAgICAgIGJhY2tlbmQgPSByZXNvbHZlUmVzdWx0O1xuICAgICAgfVxuICAgICAgaWYgKGJhY2tlbmQgPT09IHJlc29sdmVSZXN1bHQpIHtcbiAgICAgICAgYXZhaWxhYmxlQmFja2VuZE5hbWVzLmFkZChiYWNrZW5kTmFtZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gaWYgbm8gYmFja2VuZCBpcyBhdmFpbGFibGUsIHRocm93IGVycm9yLlxuICBpZiAoIWJhY2tlbmQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYG5vIGF2YWlsYWJsZSBiYWNrZW5kIGZvdW5kLiBFUlI6ICR7ZXJyb3JzLm1hcCgoZSkgPT4gYFske2UubmFtZX1dICR7ZS5lcnJ9YCkuam9pbignLCAnKX1gKTtcbiAgfVxuXG4gIC8vIGZvciBlYWNoIGV4cGxpY2l0bHkgcmVxdWVzdGVkIGJhY2tlbmQsIGlmIGl0J3Mgbm90IGF2YWlsYWJsZSwgb3V0cHV0IHdhcm5pbmcgbWVzc2FnZS5cbiAgZm9yIChjb25zdCB7IG5hbWUsIGVyciB9IG9mIGVycm9ycykge1xuICAgIGlmIChiYWNrZW5kSGludHMuaW5jbHVkZXMobmFtZSkpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgIGByZW1vdmluZyByZXF1ZXN0ZWQgZXhlY3V0aW9uIHByb3ZpZGVyIFwiJHtuYW1lfVwiIGZyb20gc2Vzc2lvbiBvcHRpb25zIGJlY2F1c2UgaXQgaXMgbm90IGF2YWlsYWJsZTogJHtlcnJ9YCxcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgZmlsdGVyZWRFcHMgPSBlcHMuZmlsdGVyKChpKSA9PiBhdmFpbGFibGVCYWNrZW5kTmFtZXMuaGFzKHR5cGVvZiBpID09PSAnc3RyaW5nJyA/IGkgOiBpLm5hbWUpKTtcblxuICByZXR1cm4gW1xuICAgIGJhY2tlbmQsXG4gICAgbmV3IFByb3h5KG9wdGlvbnMsIHtcbiAgICAgIGdldDogKHRhcmdldCwgcHJvcCkgPT4ge1xuICAgICAgICBpZiAocHJvcCA9PT0gJ2V4ZWN1dGlvblByb3ZpZGVycycpIHtcbiAgICAgICAgICByZXR1cm4gZmlsdGVyZWRFcHM7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFJlZmxlY3QuZ2V0KHRhcmdldCwgcHJvcCk7XG4gICAgICB9LFxuICAgIH0pLFxuICBdO1xufTtcbiIsICIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cblxuaW1wb3J0IHsgSW5mZXJlbmNlU2Vzc2lvbiB9IGZyb20gJy4vaW5mZXJlbmNlLXNlc3Npb24uanMnO1xuaW1wb3J0IHsgT25ueFZhbHVlIH0gZnJvbSAnLi9vbm54LXZhbHVlLmpzJztcblxuLyoqXG4gKiBAaWdub3JlXG4gKi9cbmV4cG9ydCBkZWNsYXJlIG5hbWVzcGFjZSBTZXNzaW9uSGFuZGxlciB7XG4gIHR5cGUgRmVlZHNUeXBlID0geyBbbmFtZTogc3RyaW5nXTogT25ueFZhbHVlIH07XG4gIHR5cGUgRmV0Y2hlc1R5cGUgPSB7IFtuYW1lOiBzdHJpbmddOiBPbm54VmFsdWUgfCBudWxsIH07XG4gIHR5cGUgUmV0dXJuVHlwZSA9IHsgW25hbWU6IHN0cmluZ106IE9ubnhWYWx1ZSB9O1xufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgc2hhcmVkIFNlc3Npb25IYW5kbGVyIGZ1bmN0aW9uYWxpdHlcbiAqXG4gKiBAaWdub3JlXG4gKi9cbmludGVyZmFjZSBTZXNzaW9uSGFuZGxlciB7XG4gIGRpc3Bvc2UoKTogUHJvbWlzZTx2b2lkPjtcblxuICByZWFkb25seSBpbnB1dE5hbWVzOiByZWFkb25seSBzdHJpbmdbXTtcbiAgcmVhZG9ubHkgb3V0cHV0TmFtZXM6IHJlYWRvbmx5IHN0cmluZ1tdO1xuXG4gIHJlYWRvbmx5IGlucHV0TWV0YWRhdGE6IHJlYWRvbmx5IEluZmVyZW5jZVNlc3Npb24uVmFsdWVNZXRhZGF0YVtdO1xuICByZWFkb25seSBvdXRwdXRNZXRhZGF0YTogcmVhZG9ubHkgSW5mZXJlbmNlU2Vzc2lvbi5WYWx1ZU1ldGFkYXRhW107XG59XG5cbi8qKlxuICogUmVwcmVzZW50IGEgaGFuZGxlciBpbnN0YW5jZSBvZiBhbiBpbmZlcmVuY2Ugc2Vzc2lvbi5cbiAqXG4gKiBAaWdub3JlXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSW5mZXJlbmNlU2Vzc2lvbkhhbmRsZXIgZXh0ZW5kcyBTZXNzaW9uSGFuZGxlciB7XG4gIHN0YXJ0UHJvZmlsaW5nKCk6IHZvaWQ7XG4gIGVuZFByb2ZpbGluZygpOiB2b2lkO1xuXG4gIHJ1bihcbiAgICBmZWVkczogU2Vzc2lvbkhhbmRsZXIuRmVlZHNUeXBlLFxuICAgIGZldGNoZXM6IFNlc3Npb25IYW5kbGVyLkZldGNoZXNUeXBlLFxuICAgIG9wdGlvbnM6IEluZmVyZW5jZVNlc3Npb24uUnVuT3B0aW9ucyxcbiAgKTogUHJvbWlzZTxTZXNzaW9uSGFuZGxlci5SZXR1cm5UeXBlPjtcbn1cblxuLyoqXG4gKiBSZXByZXNlbnQgYSBiYWNrZW5kIHRoYXQgcHJvdmlkZXMgaW1wbGVtZW50YXRpb24gb2YgbW9kZWwgaW5mZXJlbmNpbmcuXG4gKlxuICogQGlnbm9yZVxuICovXG5leHBvcnQgaW50ZXJmYWNlIEJhY2tlbmQge1xuICAvKipcbiAgICogSW5pdGlhbGl6ZSB0aGUgYmFja2VuZCBhc3luY2hyb25vdXNseS4gU2hvdWxkIHRocm93IHdoZW4gZmFpbGVkLlxuICAgKi9cbiAgaW5pdChiYWNrZW5kTmFtZTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPjtcblxuICBjcmVhdGVJbmZlcmVuY2VTZXNzaW9uSGFuZGxlcihcbiAgICB1cmlPckJ1ZmZlcjogc3RyaW5nIHwgVWludDhBcnJheSxcbiAgICBvcHRpb25zPzogSW5mZXJlbmNlU2Vzc2lvbi5TZXNzaW9uT3B0aW9ucyxcbiAgKTogUHJvbWlzZTxJbmZlcmVuY2VTZXNzaW9uSGFuZGxlcj47XG59XG5cbmV4cG9ydCB7IHJlZ2lzdGVyQmFja2VuZCB9IGZyb20gJy4vYmFja2VuZC1pbXBsLmpzJztcbiIsICIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cblxuLy8gVGhpcyBmaWxlIGlzIGdlbmVyYXRlZCBieSAvanMvc2NyaXB0cy91cGRhdGUtdmVyc2lvbi50c1xuLy8gRG8gbm90IG1vZGlmeSBmaWxlIGNvbnRlbnQgbWFudWFsbHkuXG5cbmV4cG9ydCBjb25zdCB2ZXJzaW9uID0gJzEuMjYuMCc7XG4iLCAiLy8gQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG5cbmltcG9ydCB7IEVudiB9IGZyb20gJy4vZW52LmpzJztcbmltcG9ydCB7IHZlcnNpb24gfSBmcm9tICcuL3ZlcnNpb24uanMnO1xuXG50eXBlIExvZ0xldmVsVHlwZSA9IEVudlsnbG9nTGV2ZWwnXTtcblxubGV0IGxvZ0xldmVsVmFsdWU6IFJlcXVpcmVkPExvZ0xldmVsVHlwZT4gPSAnd2FybmluZyc7XG5cbmV4cG9ydCBjb25zdCBlbnY6IEVudiA9IHtcbiAgd2FzbToge30gYXMgRW52LldlYkFzc2VtYmx5RmxhZ3MsXG4gIHdlYmdsOiB7fSBhcyBFbnYuV2ViR0xGbGFncyxcbiAgd2ViZ3B1OiB7fSBhcyBFbnYuV2ViR3B1RmxhZ3MsXG4gIHZlcnNpb25zOiB7IGNvbW1vbjogdmVyc2lvbiB9LFxuXG4gIHNldCBsb2dMZXZlbCh2YWx1ZTogTG9nTGV2ZWxUeXBlKSB7XG4gICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycgfHwgWyd2ZXJib3NlJywgJ2luZm8nLCAnd2FybmluZycsICdlcnJvcicsICdmYXRhbCddLmluZGV4T2YodmFsdWUpID09PSAtMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnN1cHBvcnRlZCBsb2dnaW5nIGxldmVsOiAke3ZhbHVlfWApO1xuICAgIH1cbiAgICBsb2dMZXZlbFZhbHVlID0gdmFsdWU7XG4gIH0sXG4gIGdldCBsb2dMZXZlbCgpOiBSZXF1aXJlZDxMb2dMZXZlbFR5cGU+IHtcbiAgICByZXR1cm4gbG9nTGV2ZWxWYWx1ZTtcbiAgfSxcbn07XG5cbi8vIHNldCBwcm9wZXJ0eSAnbG9nTGV2ZWwnIHNvIHRoYXQgdGhleSBjYW4gYmUgY29ycmVjdGx5IHRyYW5zZmVycmVkIHRvIHdvcmtlciBieSBgcG9zdE1lc3NhZ2UoKWAuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZW52LCAnbG9nTGV2ZWwnLCB7IGVudW1lcmFibGU6IHRydWUgfSk7XG4iLCAiLy8gQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG5cbmltcG9ydCB7IGVudiBhcyBlbnZJbXBsIH0gZnJvbSAnLi9lbnYtaW1wbC5qcyc7XG5pbXBvcnQgeyBUcnlHZXRHbG9iYWxUeXBlIH0gZnJvbSAnLi90eXBlLWhlbHBlci5qcyc7XG5cbmV4cG9ydCBkZWNsYXJlIG5hbWVzcGFjZSBFbnYge1xuICBleHBvcnQgdHlwZSBXYXNtUGF0aFByZWZpeCA9IHN0cmluZztcbiAgZXhwb3J0IGludGVyZmFjZSBXYXNtRmlsZVBhdGhzIHtcbiAgICAvKipcbiAgICAgKiBTcGVjaWZ5IHRoZSBvdmVycmlkZSBwYXRoIGZvciB0aGUgbWFpbiAud2FzbSBmaWxlLlxuICAgICAqXG4gICAgICogVGhpcyBwYXRoIHNob3VsZCBiZSBhbiBhYnNvbHV0ZSBwYXRoLlxuICAgICAqXG4gICAgICogSWYgbm90IG1vZGlmaWVkLCB0aGUgZmlsZW5hbWUgb2YgdGhlIC53YXNtIGZpbGUgaXM6XG4gICAgICogLSBgb3J0LXdhc20tc2ltZC10aHJlYWRlZC53YXNtYCBmb3IgZGVmYXVsdCBidWlsZFxuICAgICAqIC0gYG9ydC13YXNtLXNpbWQtdGhyZWFkZWQuanNlcC53YXNtYCBmb3IgSlNFUCBidWlsZCAod2l0aCBXZWJHUFUgYW5kIFdlYk5OKVxuICAgICAqIC0gYG9ydC13YXNtLXNpbWQtdGhyZWFkZWQuYXN5bmNpZnkud2FzbWAgZm9yIFdlYkdQVSBidWlsZCB3aXRoIEFzeW5jaWZ5ICh3aXRoIFdlYk5OKVxuICAgICAqIC0gYG9ydC13YXNtLXNpbWQtdGhyZWFkZWQuanNwaS53YXNtYCBmb3IgV2ViR1BVIGJ1aWxkIHdpdGggSlNQSSBzdXBwb3J0ICh3aXRoIFdlYk5OKVxuICAgICAqL1xuICAgIHdhc20/OiBVUkwgfCBzdHJpbmc7XG4gICAgLyoqXG4gICAgICogU3BlY2lmeSB0aGUgb3ZlcnJpZGUgcGF0aCBmb3IgdGhlIG1haW4gLm1qcyBmaWxlLlxuICAgICAqXG4gICAgICogVGhpcyBwYXRoIHNob3VsZCBiZSBhbiBhYnNvbHV0ZSBwYXRoLlxuICAgICAqXG4gICAgICogSWYgbm90IG1vZGlmaWVkLCB0aGUgZmlsZW5hbWUgb2YgdGhlIC5tanMgZmlsZSBpczpcbiAgICAgKiAtIGBvcnQtd2FzbS1zaW1kLXRocmVhZGVkLm1qc2AgZm9yIGRlZmF1bHQgYnVpbGRcbiAgICAgKiAtIGBvcnQtd2FzbS1zaW1kLXRocmVhZGVkLmpzZXAubWpzYCBmb3IgSlNFUCBidWlsZCAod2l0aCBXZWJHUFUgYW5kIFdlYk5OKVxuICAgICAqIC0gYG9ydC13YXNtLXNpbWQtdGhyZWFkZWQuYXN5bmNpZnkubWpzYCBmb3IgV2ViR1BVIGJ1aWxkIHdpdGggQXN5bmNpZnkgKHdpdGggV2ViTk4pXG4gICAgICogLSBgb3J0LXdhc20tc2ltZC10aHJlYWRlZC5qc3BpLm1qc2AgZm9yIFdlYkdQVSBidWlsZCB3aXRoIEpTUEkgc3VwcG9ydCAod2l0aCBXZWJOTilcbiAgICAgKi9cbiAgICBtanM/OiBVUkwgfCBzdHJpbmc7XG4gIH1cbiAgZXhwb3J0IHR5cGUgV2FzbVByZWZpeE9yRmlsZVBhdGhzID0gV2FzbVBhdGhQcmVmaXggfCBXYXNtRmlsZVBhdGhzO1xuICBleHBvcnQgaW50ZXJmYWNlIFdlYkFzc2VtYmx5RmxhZ3Mge1xuICAgIC8qKlxuICAgICAqIHNldCBvciBnZXQgbnVtYmVyIG9mIHRocmVhZChzKS4gSWYgb21pdHRlZCBvciBzZXQgdG8gMCwgbnVtYmVyIG9mIHRocmVhZChzKSB3aWxsIGJlIGRldGVybWluZWQgYnkgc3lzdGVtLiBJZiBzZXRcbiAgICAgKiB0byAxLCBubyB3b3JrZXIgdGhyZWFkIHdpbGwgYmUgc3Bhd25lZC5cbiAgICAgKlxuICAgICAqIFRoaXMgc2V0dGluZyBpcyBhdmFpbGFibGUgb25seSB3aGVuIFdlYkFzc2VtYmx5IG11bHRpdGhyZWFkIGZlYXR1cmUgaXMgYXZhaWxhYmxlIGluIGN1cnJlbnQgY29udGV4dC5cbiAgICAgKlxuICAgICAqIEBkZWZhdWx0VmFsdWUgYDBgXG4gICAgICovXG4gICAgbnVtVGhyZWFkcz86IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIHNldCBhIHZhbHVlIGluZGljYXRpbmcgd2hldGhlciB0byBlbmFibGUgU0lNRC5cbiAgICAgKlxuICAgICAqIE9OTlggUnVudGltZSB3aWxsIHBlcmZvcm0gZmVhdHVyZSBkZXRlY3Rpb24gYmFzZWQgb24gdGhlIHZhbHVlIG9mIHRoaXMgcHJvcGVydHkuIFNwZWNpZmljYWxseSwgd2hlbiB0aGUgdmFsdWUgaXNcbiAgICAgKiBzZXQgdG86XG4gICAgICogLSBgdW5kZWZpbmVkYCwgYHRydWVgIG9yIGBcImZpeGVkXCJgOiB3aWxsIGNoZWNrIGF2YWlsYWJpbGl0eSBvZiBGaXhlZC13aWR0aCBTSU1ELlxuICAgICAqIC0gYFwicmVsYXhlZFwiYDogd2lsbCBjaGVjayBhdmFpbGFiaWxpdHkgb2YgUmVsYXhlZCBTSU1ELlxuICAgICAqIC0gYGZhbHNlYDogd2lsbCBub3QgcGVyZm9ybSBTSU1EIGZlYXR1cmUgY2hlY2tpbmcuXG4gICAgICpcbiAgICAgKiBTZXR0aW5nIHRoaXMgcHJvcGVydHkgZG9lcyBub3QgbWFrZSBPTk5YIFJ1bnRpbWUgdG8gc3dpdGNoIHRvIHRoZSBjb3JyZXNwb25kaW5nIHJ1bnRpbWUgYXV0b21hdGljYWxseS4gVXNlciBuZWVkXG4gICAgICogdG8gc2V0IGB3YXNtUGF0aHNgIG9yIGB3YXNtQmluYXJ5YCBwcm9wZXJ0eSB0byBsb2FkIHRoZSBjb3JyZXNwb25kaW5nIHJ1bnRpbWUuXG4gICAgICpcbiAgICAgKiBUaGlzIHNldHRpbmcgaXMgYXZhaWxhYmxlIG9ubHkgd2hlbiBXZWJBc3NlbWJseSBTSU1EIGZlYXR1cmUgaXMgYXZhaWxhYmxlIGluIGN1cnJlbnQgY29udGV4dC5cbiAgICAgKlxuICAgICAqIEBkZWZhdWx0VmFsdWUgYHRydWVgXG4gICAgICovXG4gICAgc2ltZD86IGJvb2xlYW4gfCAnZml4ZWQnIHwgJ3JlbGF4ZWQnO1xuXG4gICAgLyoqXG4gICAgICogc2V0IG9yIGdldCBhIGJvb2xlYW4gdmFsdWUgaW5kaWNhdGluZyB3aGV0aGVyIHRvIGVuYWJsZSB0cmFjZS5cbiAgICAgKlxuICAgICAqIEBkZWZhdWx0VmFsdWUgYGZhbHNlYFxuICAgICAqXG4gICAgICogQGRlcHJlY2F0ZWQgVXNlIGBlbnYudHJhY2VgIGluc3RlYWQuIElmIGBlbnYudHJhY2VgIGlzIHNldCwgdGhpcyBwcm9wZXJ0eSB3aWxsIGJlIGlnbm9yZWQuXG4gICAgICovXG4gICAgdHJhY2U/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogU2V0IG9yIGdldCBhIG51bWJlciBzcGVjaWZ5aW5nIHRoZSB0aW1lb3V0IGZvciBpbml0aWFsaXphdGlvbiBvZiBXZWJBc3NlbWJseSBiYWNrZW5kLCBpbiBtaWxsaXNlY29uZHMuIEEgemVyb1xuICAgICAqIHZhbHVlIGluZGljYXRlcyBubyB0aW1lb3V0IGlzIHNldC5cbiAgICAgKlxuICAgICAqIEBkZWZhdWx0VmFsdWUgYDBgXG4gICAgICovXG4gICAgaW5pdFRpbWVvdXQ/OiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBTZXQgYSBjdXN0b20gVVJMIHByZWZpeCB0byB0aGUgLndhc20vLm1qcyBmaWxlcywgb3IgYW4gb2JqZWN0IG9mIG92ZXJyaWRlcyBmb3IgYm90aCAud2FzbS8ubWpzIGZpbGUuIFRoZSBvdmVycmlkZVxuICAgICAqIHBhdGggc2hvdWxkIGJlIGFuIGFic29sdXRlIHBhdGguXG4gICAgICovXG4gICAgd2FzbVBhdGhzPzogV2FzbVByZWZpeE9yRmlsZVBhdGhzO1xuXG4gICAgLyoqXG4gICAgICogU2V0IGEgY3VzdG9tIGJ1ZmZlciB3aGljaCBjb250YWlucyB0aGUgV2ViQXNzZW1ibHkgYmluYXJ5LiBJZiB0aGlzIHByb3BlcnR5IGlzIHNldCwgdGhlIGB3YXNtUGF0aHNgIHByb3BlcnR5IHdpbGxcbiAgICAgKiBiZSBpZ25vcmVkLlxuICAgICAqL1xuICAgIHdhc21CaW5hcnk/OiBBcnJheUJ1ZmZlckxpa2UgfCBVaW50OEFycmF5O1xuXG4gICAgLyoqXG4gICAgICogU2V0IG9yIGdldCBhIGJvb2xlYW4gdmFsdWUgaW5kaWNhdGluZyB3aGV0aGVyIHRvIHByb3h5IHRoZSBleGVjdXRpb24gb2YgbWFpbiB0aHJlYWQgdG8gYSB3b3JrZXIgdGhyZWFkLlxuICAgICAqXG4gICAgICogQGRlZmF1bHRWYWx1ZSBgZmFsc2VgXG4gICAgICovXG4gICAgcHJveHk/OiBib29sZWFuO1xuICB9XG5cbiAgZXhwb3J0IGludGVyZmFjZSBXZWJHTEZsYWdzIHtcbiAgICAvKipcbiAgICAgKiBTZXQgb3IgZ2V0IHRoZSBXZWJHTCBDb250ZXh0IElEICh3ZWJnbCBvciB3ZWJnbDIpLlxuICAgICAqXG4gICAgICogQGRlZmF1bHRWYWx1ZSBgJ3dlYmdsMidgXG4gICAgICovXG4gICAgY29udGV4dElkPzogJ3dlYmdsJyB8ICd3ZWJnbDInO1xuICAgIC8qKlxuICAgICAqIEdldCB0aGUgV2ViR0wgcmVuZGVyaW5nIGNvbnRleHQuXG4gICAgICovXG4gICAgcmVhZG9ubHkgY29udGV4dDogV2ViR0xSZW5kZXJpbmdDb250ZXh0O1xuICAgIC8qKlxuICAgICAqIFNldCBvciBnZXQgdGhlIG1heGltdW0gYmF0Y2ggc2l6ZSBmb3IgbWF0bXVsLiAwIG1lYW5zIHRvIGRpc2FibGUgYmF0Y2hpbmcuXG4gICAgICpcbiAgICAgKiBAZGVwcmVjYXRlZFxuICAgICAqL1xuICAgIG1hdG11bE1heEJhdGNoU2l6ZT86IG51bWJlcjtcbiAgICAvKipcbiAgICAgKiBTZXQgb3IgZ2V0IHRoZSB0ZXh0dXJlIGNhY2hlIG1vZGUuXG4gICAgICpcbiAgICAgKiBAZGVmYXVsdFZhbHVlIGAnZnVsbCdgXG4gICAgICovXG4gICAgdGV4dHVyZUNhY2hlTW9kZT86ICdpbml0aWFsaXplck9ubHknIHwgJ2Z1bGwnO1xuICAgIC8qKlxuICAgICAqIFNldCBvciBnZXQgdGhlIHBhY2tlZCB0ZXh0dXJlIG1vZGVcbiAgICAgKlxuICAgICAqIEBkZWZhdWx0VmFsdWUgYGZhbHNlYFxuICAgICAqL1xuICAgIHBhY2s/OiBib29sZWFuO1xuICAgIC8qKlxuICAgICAqIFNldCBvciBnZXQgd2hldGhlciBlbmFibGUgYXN5bmMgZG93bmxvYWQuXG4gICAgICpcbiAgICAgKiBAZGVmYXVsdFZhbHVlIGBmYWxzZWBcbiAgICAgKi9cbiAgICBhc3luYz86IGJvb2xlYW47XG4gIH1cblxuICBleHBvcnQgaW50ZXJmYWNlIFdlYkdwdVByb2ZpbGluZ0RhdGFWMVRlbnNvck1ldGFkYXRhIHtcbiAgICBkaW1zOiByZWFkb25seSBudW1iZXJbXTtcbiAgICBkYXRhVHlwZTogc3RyaW5nO1xuICB9XG4gIGV4cG9ydCBpbnRlcmZhY2UgV2ViR3B1UHJvZmlsaW5nRGF0YVYxIHtcbiAgICB2ZXJzaW9uOiAxO1xuICAgIGlucHV0c01ldGFkYXRhOiByZWFkb25seSBXZWJHcHVQcm9maWxpbmdEYXRhVjFUZW5zb3JNZXRhZGF0YVtdO1xuICAgIG91dHB1dHNNZXRhZGF0YTogcmVhZG9ubHkgV2ViR3B1UHJvZmlsaW5nRGF0YVYxVGVuc29yTWV0YWRhdGFbXTtcbiAgICBrZXJuZWxJZDogbnVtYmVyO1xuICAgIGtlcm5lbFR5cGU6IHN0cmluZztcbiAgICBrZXJuZWxOYW1lOiBzdHJpbmc7XG4gICAgcHJvZ3JhbU5hbWU6IHN0cmluZztcbiAgICBzdGFydFRpbWU6IG51bWJlcjtcbiAgICBlbmRUaW1lOiBudW1iZXI7XG4gIH1cblxuICBleHBvcnQgdHlwZSBXZWJHcHVQcm9maWxpbmdEYXRhID0gV2ViR3B1UHJvZmlsaW5nRGF0YVYxO1xuXG4gIGV4cG9ydCBpbnRlcmZhY2UgV2ViR3B1RmxhZ3Mge1xuICAgIC8qKlxuICAgICAqIFNldCBvciBnZXQgdGhlIHByb2ZpbGluZyBtb2RlLlxuICAgICAqXG4gICAgICogQGRlcHJlY2F0ZWQgVXNlIGBlbnYud2ViZ3B1LnByb2ZpbGluZy5tb2RlYCBpbnN0ZWFkLiBJZiBgZW52LndlYmdwdS5wcm9maWxpbmcubW9kZWAgaXMgc2V0LCB0aGlzIHByb3BlcnR5IHdpbGwgYmVcbiAgICAgKiBpZ25vcmVkLlxuICAgICAqL1xuICAgIHByb2ZpbGluZ01vZGU/OiAnb2ZmJyB8ICdkZWZhdWx0JztcbiAgICAvKipcbiAgICAgKiBTZXQgb3IgZ2V0IHRoZSBwcm9maWxpbmcgY29uZmlndXJhdGlvbi5cbiAgICAgKi9cbiAgICBwcm9maWxpbmc6IHtcbiAgICAgIC8qKlxuICAgICAgICogU2V0IG9yIGdldCB0aGUgcHJvZmlsaW5nIG1vZGUuXG4gICAgICAgKlxuICAgICAgICogQGRlZmF1bHRWYWx1ZSBgJ29mZidgXG4gICAgICAgKi9cbiAgICAgIG1vZGU/OiAnb2ZmJyB8ICdkZWZhdWx0JztcblxuICAgICAgLyoqXG4gICAgICAgKiBTZXQgb3IgZ2V0IGEgY2FsbGJhY2sgZnVuY3Rpb24gd2hlbiBhIHByb2ZpbGluZyBkYXRhIGlzIHJlY2VpdmVkLiBJZiBub3Qgc2V0LCB0aGUgcHJvZmlsaW5nIGRhdGEgd2lsbCBiZVxuICAgICAgICogcHJpbnRlZCB0byBjb25zb2xlLlxuICAgICAgICovXG4gICAgICBvbmRhdGE/OiAoZGF0YTogV2ViR3B1UHJvZmlsaW5nRGF0YSkgPT4gdm9pZDtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFNldCBvciBnZXQgdGhlIHBvd2VyIHByZWZlcmVuY2UuXG4gICAgICpcbiAgICAgKiBTZXR0aW5nIHRoaXMgcHJvcGVydHkgb25seSBoYXMgZWZmZWN0IGJlZm9yZSB0aGUgZmlyc3QgV2ViR1BVIGluZmVyZW5jZSBzZXNzaW9uIGlzIGNyZWF0ZWQuIFRoZSB2YWx1ZSB3aWxsIGJlXG4gICAgICogdXNlZCBhcyBvcHRpb25zIGZvciBgbmF2aWdhdG9yLmdwdS5yZXF1ZXN0QWRhcHRlcigpYC5cbiAgICAgKlxuICAgICAqIFNlZSB7QGxpbmsgaHR0cHM6Ly9ncHV3ZWIuZ2l0aHViLmlvL2dwdXdlYi8jZGljdGRlZi1ncHVyZXF1ZXN0YWRhcHRlcm9wdGlvbnN9IGZvciBtb3JlIGRldGFpbHMuXG4gICAgICpcbiAgICAgKiBAZGVmYXVsdFZhbHVlIGB1bmRlZmluZWRgXG4gICAgICpcbiAgICAgKiBAZGVwcmVjYXRlZCBDcmVhdGUgeW91ciBvd24gR1BVQWRhcHRlciwgdXNlIGl0IHRvIGNyZWF0ZSBhIEdQVURldmljZSBpbnN0YW5jZSBhbmQgc2V0IHtAbGluayBkZXZpY2V9IHByb3BlcnR5IGlmXG4gICAgICogeW91IHdhbnQgdG8gdXNlIGEgc3BlY2lmaWMgcG93ZXIgcHJlZmVyZW5jZS5cbiAgICAgKi9cbiAgICBwb3dlclByZWZlcmVuY2U/OiAnbG93LXBvd2VyJyB8ICdoaWdoLXBlcmZvcm1hbmNlJztcbiAgICAvKipcbiAgICAgKiBTZXQgb3IgZ2V0IHRoZSBmb3JjZSBmYWxsYmFjayBhZGFwdGVyIGZsYWcuXG4gICAgICpcbiAgICAgKiBTZXR0aW5nIHRoaXMgcHJvcGVydHkgb25seSBoYXMgZWZmZWN0IGJlZm9yZSB0aGUgZmlyc3QgV2ViR1BVIGluZmVyZW5jZSBzZXNzaW9uIGlzIGNyZWF0ZWQuIFRoZSB2YWx1ZSB3aWxsIGJlXG4gICAgICogdXNlZCBhcyBvcHRpb25zIGZvciBgbmF2aWdhdG9yLmdwdS5yZXF1ZXN0QWRhcHRlcigpYC5cbiAgICAgKlxuICAgICAqIFNlZSB7QGxpbmsgaHR0cHM6Ly9ncHV3ZWIuZ2l0aHViLmlvL2dwdXdlYi8jZGljdGRlZi1ncHVyZXF1ZXN0YWRhcHRlcm9wdGlvbnN9IGZvciBtb3JlIGRldGFpbHMuXG4gICAgICpcbiAgICAgKiBAZGVmYXVsdFZhbHVlIGB1bmRlZmluZWRgXG4gICAgICpcbiAgICAgKiBAZGVwcmVjYXRlZCBDcmVhdGUgeW91ciBvd24gR1BVQWRhcHRlciwgdXNlIGl0IHRvIGNyZWF0ZSBhIEdQVURldmljZSBpbnN0YW5jZSBhbmQgc2V0IHtAbGluayBkZXZpY2V9IHByb3BlcnR5IGlmXG4gICAgICogeW91IHdhbnQgdG8gdXNlIGEgc3BlY2lmaWMgZmFsbGJhY2sgb3B0aW9uLlxuICAgICAqL1xuICAgIGZvcmNlRmFsbGJhY2tBZGFwdGVyPzogYm9vbGVhbjtcbiAgICAvKipcbiAgICAgKiBTZXQgb3IgZ2V0IHRoZSBhZGFwdGVyIGZvciBXZWJHUFUuXG4gICAgICpcbiAgICAgKiBTZXR0aW5nIHRoaXMgcHJvcGVydHkgb25seSBoYXMgZWZmZWN0IGJlZm9yZSB0aGUgZmlyc3QgV2ViR1BVIGluZmVyZW5jZSBzZXNzaW9uIGlzIGNyZWF0ZWQuIFRoZSB2YWx1ZSB3aWxsIGJlXG4gICAgICogdXNlZCBhcyB0aGUgR1BVIGFkYXB0ZXIgZm9yIHRoZSB1bmRlcmx5aW5nIFdlYkdQVSBiYWNrZW5kIHRvIGNyZWF0ZSBHUFUgZGV2aWNlLlxuICAgICAqXG4gICAgICogSWYgdGhpcyBwcm9wZXJ0eSBpcyBub3Qgc2V0LCBpdCB3aWxsIGJlIGF2YWlsYWJsZSB0byBnZXQgYWZ0ZXIgdGhlIGZpcnN0IFdlYkdQVSBpbmZlcmVuY2Ugc2Vzc2lvbiBpcyBjcmVhdGVkLiBUaGVcbiAgICAgKiB2YWx1ZSB3aWxsIGJlIHRoZSBHUFUgYWRhcHRlciB0aGF0IGNyZWF0ZWQgYnkgdGhlIHVuZGVybHlpbmcgV2ViR1BVIGJhY2tlbmQuXG4gICAgICpcbiAgICAgKiBXaGVuIHVzZSB3aXRoIFR5cGVTY3JpcHQsIHRoZSB0eXBlIG9mIHRoaXMgcHJvcGVydHkgaXMgYEdQVUFkYXB0ZXJgIGRlZmluZWQgaW4gXCJAd2ViZ3B1L3R5cGVzXCIuXG4gICAgICpcbiAgICAgKiBAZGVwcmVjYXRlZCBJdCBpcyBubyBsb25nZXIgcmVjb21tZW5kZWQgdG8gdXNlIHRoaXMgcHJvcGVydHkuIFRoZSBsYXRlc3QgV2ViR1BVIHNwZWMgYWRkcyBgR1BVRGV2aWNlLmFkYXB0ZXJJbmZvYFxuICAgICAqIChodHRwczovL3d3dy53My5vcmcvVFIvd2ViZ3B1LyNkb20tZ3B1ZGV2aWNlLWFkYXB0ZXJpbmZvKSwgd2hpY2ggYWxsb3dzIHRvIGdldCB0aGUgYWRhcHRlciBpbmZvcm1hdGlvbiBmcm9tIHRoZVxuICAgICAqIGRldmljZS4gV2hlbiBpdCdzIGF2YWlsYWJsZSwgdGhlcmUgaXMgbm8gbmVlZCB0byBzZXQvZ2V0IHRoZSB7QGxpbmsgYWRhcHRlcn0gcHJvcGVydHkuXG4gICAgICovXG4gICAgYWRhcHRlcjogVHJ5R2V0R2xvYmFsVHlwZTwnR1BVQWRhcHRlcic+O1xuICAgIC8qKlxuICAgICAqIFNldCBvciBnZXQgdGhlIEdQVSBkZXZpY2UgZm9yIFdlYkdQVS5cbiAgICAgKlxuICAgICAqIFRoZXJlIGFyZSAzIHZhbGlkIHNjZW5hcmlvcyBvZiBhY2Nlc3NpbmcgdGhpcyBwcm9wZXJ0eTpcbiAgICAgKiAtIFNldCBhIHZhbHVlIGJlZm9yZSB0aGUgZmlyc3QgV2ViR1BVIGluZmVyZW5jZSBzZXNzaW9uIGlzIGNyZWF0ZWQuIFRoZSB2YWx1ZSB3aWxsIGJlIHVzZWQgYnkgdGhlIFdlYkdQVSBiYWNrZW5kXG4gICAgICogdG8gcGVyZm9ybSBjYWxjdWxhdGlvbnMuIElmIHRoZSB2YWx1ZSBpcyBub3QgYSBgR1BVRGV2aWNlYCBvYmplY3QsIGFuIGVycm9yIHdpbGwgYmUgdGhyb3duLlxuICAgICAqIC0gR2V0IHRoZSB2YWx1ZSBiZWZvcmUgdGhlIGZpcnN0IFdlYkdQVSBpbmZlcmVuY2Ugc2Vzc2lvbiBpcyBjcmVhdGVkLiBUaGlzIHdpbGwgdHJ5IHRvIGNyZWF0ZSBhIG5ldyBHUFVEZXZpY2VcbiAgICAgKiBpbnN0YW5jZS4gUmV0dXJucyBhIGBQcm9taXNlYCB0aGF0IHJlc29sdmVzIHRvIGEgYEdQVURldmljZWAgb2JqZWN0LlxuICAgICAqIC0gR2V0IHRoZSB2YWx1ZSBhZnRlciB0aGUgZmlyc3QgV2ViR1BVIGluZmVyZW5jZSBzZXNzaW9uIGlzIGNyZWF0ZWQuIFJldHVybnMgYSByZXNvbHZlZCBgUHJvbWlzZWAgdG8gdGhlXG4gICAgICogYEdQVURldmljZWAgb2JqZWN0IHVzZWQgYnkgdGhlIFdlYkdQVSBiYWNrZW5kLlxuICAgICAqL1xuICAgIGdldCBkZXZpY2UoKTogUHJvbWlzZTxUcnlHZXRHbG9iYWxUeXBlPCdHUFVEZXZpY2UnPj47XG4gICAgc2V0IGRldmljZSh2YWx1ZTogVHJ5R2V0R2xvYmFsVHlwZTwnR1BVRGV2aWNlJz4pO1xuICAgIC8qKlxuICAgICAqIFNldCBvciBnZXQgd2hldGhlciB2YWxpZGF0ZSBpbnB1dCBjb250ZW50LlxuICAgICAqXG4gICAgICogQGRlZmF1bHRWYWx1ZSBgZmFsc2VgXG4gICAgICovXG4gICAgdmFsaWRhdGVJbnB1dENvbnRlbnQ/OiBib29sZWFuO1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRW52IHtcbiAgLyoqXG4gICAqIHNldCB0aGUgc2V2ZXJpdHkgbGV2ZWwgZm9yIGxvZ2dpbmcuXG4gICAqXG4gICAqIEBkZWZhdWx0VmFsdWUgYCd3YXJuaW5nJ2BcbiAgICovXG4gIGxvZ0xldmVsPzogJ3ZlcmJvc2UnIHwgJ2luZm8nIHwgJ3dhcm5pbmcnIHwgJ2Vycm9yJyB8ICdmYXRhbCc7XG5cbiAgLyoqXG4gICAqIEluZGljYXRlIHdoZXRoZXIgcnVuIGluIGRlYnVnIG1vZGUuXG4gICAqXG4gICAqIEBkZWZhdWx0VmFsdWUgYGZhbHNlYFxuICAgKi9cbiAgZGVidWc/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBzZXQgb3IgZ2V0IGEgYm9vbGVhbiB2YWx1ZSBpbmRpY2F0aW5nIHdoZXRoZXIgdG8gZW5hYmxlIHRyYWNlLlxuICAgKlxuICAgKiBAZGVmYXVsdFZhbHVlIGBmYWxzZWBcbiAgICovXG4gIHRyYWNlPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogR2V0IHZlcnNpb24gb2YgdGhlIGN1cnJlbnQgcGFja2FnZS5cbiAgICovXG4gIHJlYWRvbmx5IHZlcnNpb25zOiB7XG4gICAgcmVhZG9ubHkgY29tbW9uOiBzdHJpbmc7XG4gICAgcmVhZG9ubHkgd2ViPzogc3RyaW5nO1xuICAgIHJlYWRvbmx5IG5vZGU/OiBzdHJpbmc7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uYW1pbmctY29udmVudGlvblxuICAgIHJlYWRvbmx5ICdyZWFjdC1uYXRpdmUnPzogc3RyaW5nO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZXByZXNlbnQgYSBzZXQgb2YgZmxhZ3MgZm9yIFdlYkFzc2VtYmx5XG4gICAqL1xuICByZWFkb25seSB3YXNtOiBFbnYuV2ViQXNzZW1ibHlGbGFncztcblxuICAvKipcbiAgICogUmVwcmVzZW50IGEgc2V0IG9mIGZsYWdzIGZvciBXZWJHTFxuICAgKi9cbiAgcmVhZG9ubHkgd2ViZ2w6IEVudi5XZWJHTEZsYWdzO1xuXG4gIC8qKlxuICAgKiBSZXByZXNlbnQgYSBzZXQgb2YgZmxhZ3MgZm9yIFdlYkdQVVxuICAgKi9cbiAgcmVhZG9ubHkgd2ViZ3B1OiBFbnYuV2ViR3B1RmxhZ3M7XG5cbiAgW25hbWU6IHN0cmluZ106IHVua25vd247XG59XG5cbi8qKlxuICogUmVwcmVzZW50IGEgc2V0IG9mIGZsYWdzIGFzIGEgZ2xvYmFsIHNpbmdsZXRvbi5cbiAqL1xuZXhwb3J0IGNvbnN0IGVudjogRW52ID0gZW52SW1wbDtcbiIsICIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cblxuaW1wb3J0IHsgVGVuc29yVG9EYXRhVXJsT3B0aW9ucywgVGVuc29yVG9JbWFnZURhdGFPcHRpb25zIH0gZnJvbSAnLi90ZW5zb3ItY29udmVyc2lvbi5qcyc7XG5pbXBvcnQgeyBUZW5zb3IgfSBmcm9tICcuL3RlbnNvci5qcyc7XG5cbi8qKlxuICogaW1wbGVtZW50YXRpb24gb2YgVGVuc29yLnRvRGF0YVVSTCgpXG4gKi9cbmV4cG9ydCBjb25zdCB0ZW5zb3JUb0RhdGFVUkwgPSAodGVuc29yOiBUZW5zb3IsIG9wdGlvbnM/OiBUZW5zb3JUb0RhdGFVcmxPcHRpb25zKTogc3RyaW5nID0+IHtcbiAgY29uc3QgY2FudmFzID0gdHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJyA/IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpIDogbmV3IE9mZnNjcmVlbkNhbnZhcygxLCAxKTtcbiAgY2FudmFzLndpZHRoID0gdGVuc29yLmRpbXNbM107XG4gIGNhbnZhcy5oZWlnaHQgPSB0ZW5zb3IuZGltc1syXTtcbiAgY29uc3QgcGl4ZWxzMkRDb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJykgYXNcbiAgICB8IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRFxuICAgIHwgT2Zmc2NyZWVuQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEXG4gICAgfCBudWxsO1xuXG4gIGlmIChwaXhlbHMyRENvbnRleHQgIT0gbnVsbCkge1xuICAgIC8vIERlZmF1bHQgdmFsdWVzIGZvciBoZWlnaHQgYW5kIHdpZHRoICYgZm9ybWF0XG4gICAgbGV0IHdpZHRoOiBudW1iZXI7XG4gICAgbGV0IGhlaWdodDogbnVtYmVyO1xuICAgIGlmIChvcHRpb25zPy50ZW5zb3JMYXlvdXQgIT09IHVuZGVmaW5lZCAmJiBvcHRpb25zLnRlbnNvckxheW91dCA9PT0gJ05IV0MnKSB7XG4gICAgICB3aWR0aCA9IHRlbnNvci5kaW1zWzJdO1xuICAgICAgaGVpZ2h0ID0gdGVuc29yLmRpbXNbM107XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIERlZmF1bHQgbGF5b3V0IGlzIE5DV0hcbiAgICAgIHdpZHRoID0gdGVuc29yLmRpbXNbM107XG4gICAgICBoZWlnaHQgPSB0ZW5zb3IuZGltc1syXTtcbiAgICB9XG5cbiAgICBjb25zdCBpbnB1dGZvcm1hdCA9IG9wdGlvbnM/LmZvcm1hdCAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5mb3JtYXQgOiAnUkdCJztcblxuICAgIGNvbnN0IG5vcm0gPSBvcHRpb25zPy5ub3JtO1xuICAgIGxldCBub3JtTWVhbjogW251bWJlciwgbnVtYmVyLCBudW1iZXIsIG51bWJlcl07XG4gICAgbGV0IG5vcm1CaWFzOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyXTtcbiAgICBpZiAobm9ybSA9PT0gdW5kZWZpbmVkIHx8IG5vcm0ubWVhbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBub3JtTWVhbiA9IFsyNTUsIDI1NSwgMjU1LCAyNTVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodHlwZW9mIG5vcm0ubWVhbiA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgbm9ybU1lYW4gPSBbbm9ybS5tZWFuLCBub3JtLm1lYW4sIG5vcm0ubWVhbiwgbm9ybS5tZWFuXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5vcm1NZWFuID0gW25vcm0ubWVhblswXSwgbm9ybS5tZWFuWzFdLCBub3JtLm1lYW5bMl0sIDBdO1xuICAgICAgICBpZiAobm9ybS5tZWFuWzNdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBub3JtTWVhblszXSA9IG5vcm0ubWVhblszXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAobm9ybSA9PT0gdW5kZWZpbmVkIHx8IG5vcm0uYmlhcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBub3JtQmlhcyA9IFswLCAwLCAwLCAwXTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHR5cGVvZiBub3JtLmJpYXMgPT09ICdudW1iZXInKSB7XG4gICAgICAgIG5vcm1CaWFzID0gW25vcm0uYmlhcywgbm9ybS5iaWFzLCBub3JtLmJpYXMsIG5vcm0uYmlhc107XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBub3JtQmlhcyA9IFtub3JtLmJpYXNbMF0sIG5vcm0uYmlhc1sxXSwgbm9ybS5iaWFzWzJdLCAwXTtcbiAgICAgICAgaWYgKG5vcm0uYmlhc1szXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgbm9ybUJpYXNbM10gPSBub3JtLmJpYXNbM107XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBzdHJpZGUgPSBoZWlnaHQgKiB3aWR0aDtcbiAgICAvLyBEZWZhdWx0IHBvaW50ZXIgYXNzaWdubWVudHNcbiAgICBsZXQgclRlbnNvclBvaW50ZXIgPSAwLFxuICAgICAgZ1RlbnNvclBvaW50ZXIgPSBzdHJpZGUsXG4gICAgICBiVGVuc29yUG9pbnRlciA9IHN0cmlkZSAqIDIsXG4gICAgICBhVGVuc29yUG9pbnRlciA9IC0xO1xuXG4gICAgLy8gVXBkYXRpbmcgdGhlIHBvaW50ZXIgYXNzaWdubWVudHMgYmFzZWQgb24gdGhlIGlucHV0IGltYWdlIGZvcm1hdFxuICAgIGlmIChpbnB1dGZvcm1hdCA9PT0gJ1JHQkEnKSB7XG4gICAgICByVGVuc29yUG9pbnRlciA9IDA7XG4gICAgICBnVGVuc29yUG9pbnRlciA9IHN0cmlkZTtcbiAgICAgIGJUZW5zb3JQb2ludGVyID0gc3RyaWRlICogMjtcbiAgICAgIGFUZW5zb3JQb2ludGVyID0gc3RyaWRlICogMztcbiAgICB9IGVsc2UgaWYgKGlucHV0Zm9ybWF0ID09PSAnUkdCJykge1xuICAgICAgclRlbnNvclBvaW50ZXIgPSAwO1xuICAgICAgZ1RlbnNvclBvaW50ZXIgPSBzdHJpZGU7XG4gICAgICBiVGVuc29yUG9pbnRlciA9IHN0cmlkZSAqIDI7XG4gICAgfSBlbHNlIGlmIChpbnB1dGZvcm1hdCA9PT0gJ1JCRycpIHtcbiAgICAgIHJUZW5zb3JQb2ludGVyID0gMDtcbiAgICAgIGJUZW5zb3JQb2ludGVyID0gc3RyaWRlO1xuICAgICAgZ1RlbnNvclBvaW50ZXIgPSBzdHJpZGUgKiAyO1xuICAgIH1cblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaGVpZ2h0OyBpKyspIHtcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgd2lkdGg7IGorKykge1xuICAgICAgICBjb25zdCBSID0gKCh0ZW5zb3IuZGF0YVtyVGVuc29yUG9pbnRlcisrXSBhcyBudW1iZXIpIC0gbm9ybUJpYXNbMF0pICogbm9ybU1lYW5bMF07IC8vIFIgdmFsdWVcbiAgICAgICAgY29uc3QgRyA9ICgodGVuc29yLmRhdGFbZ1RlbnNvclBvaW50ZXIrK10gYXMgbnVtYmVyKSAtIG5vcm1CaWFzWzFdKSAqIG5vcm1NZWFuWzFdOyAvLyBHIHZhbHVlXG4gICAgICAgIGNvbnN0IEIgPSAoKHRlbnNvci5kYXRhW2JUZW5zb3JQb2ludGVyKytdIGFzIG51bWJlcikgLSBub3JtQmlhc1syXSkgKiBub3JtTWVhblsyXTsgLy8gQiB2YWx1ZVxuICAgICAgICBjb25zdCBBID0gYVRlbnNvclBvaW50ZXIgPT09IC0xID8gMjU1IDogKCh0ZW5zb3IuZGF0YVthVGVuc29yUG9pbnRlcisrXSBhcyBudW1iZXIpIC0gbm9ybUJpYXNbM10pICogbm9ybU1lYW5bM107IC8vIEEgdmFsdWVcblxuICAgICAgICBwaXhlbHMyRENvbnRleHQuZmlsbFN0eWxlID0gJ3JnYmEoJyArIFIgKyAnLCcgKyBHICsgJywnICsgQiArICcsJyArIEEgKyAnKSc7XG4gICAgICAgIHBpeGVsczJEQ29udGV4dC5maWxsUmVjdChqLCBpLCAxLCAxKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCd0b0RhdGFVUkwnIGluIGNhbnZhcykge1xuICAgICAgcmV0dXJuIGNhbnZhcy50b0RhdGFVUkwoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCd0b0RhdGFVUkwgaXMgbm90IHN1cHBvcnRlZCcpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbiBub3QgYWNjZXNzIGltYWdlIGRhdGEnKTtcbiAgfVxufTtcblxuLyoqXG4gKiBpbXBsZW1lbnRhdGlvbiBvZiBUZW5zb3IudG9JbWFnZURhdGEoKVxuICovXG5leHBvcnQgY29uc3QgdGVuc29yVG9JbWFnZURhdGEgPSAodGVuc29yOiBUZW5zb3IsIG9wdGlvbnM/OiBUZW5zb3JUb0ltYWdlRGF0YU9wdGlvbnMpOiBJbWFnZURhdGEgPT4ge1xuICBjb25zdCBwaXhlbHMyRENvbnRleHQgPVxuICAgIHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCdcbiAgICAgID8gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJykuZ2V0Q29udGV4dCgnMmQnKVxuICAgICAgOiAobmV3IE9mZnNjcmVlbkNhbnZhcygxLCAxKS5nZXRDb250ZXh0KCcyZCcpIGFzIE9mZnNjcmVlbkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCk7XG4gIGxldCBpbWFnZTogSW1hZ2VEYXRhO1xuICBpZiAocGl4ZWxzMkRDb250ZXh0ICE9IG51bGwpIHtcbiAgICAvLyBEZWZhdWx0IHZhbHVlcyBmb3IgaGVpZ2h0IGFuZCB3aWR0aCAmIGZvcm1hdFxuICAgIGxldCB3aWR0aDogbnVtYmVyO1xuICAgIGxldCBoZWlnaHQ6IG51bWJlcjtcbiAgICBsZXQgY2hhbm5lbHM6IG51bWJlcjtcbiAgICBpZiAob3B0aW9ucz8udGVuc29yTGF5b3V0ICE9PSB1bmRlZmluZWQgJiYgb3B0aW9ucy50ZW5zb3JMYXlvdXQgPT09ICdOSFdDJykge1xuICAgICAgd2lkdGggPSB0ZW5zb3IuZGltc1syXTtcbiAgICAgIGhlaWdodCA9IHRlbnNvci5kaW1zWzFdO1xuICAgICAgY2hhbm5lbHMgPSB0ZW5zb3IuZGltc1szXTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRGVmYXVsdCBsYXlvdXQgaXMgTkNXSFxuICAgICAgd2lkdGggPSB0ZW5zb3IuZGltc1szXTtcbiAgICAgIGhlaWdodCA9IHRlbnNvci5kaW1zWzJdO1xuICAgICAgY2hhbm5lbHMgPSB0ZW5zb3IuZGltc1sxXTtcbiAgICB9XG4gICAgY29uc3QgaW5wdXRmb3JtYXQgPSBvcHRpb25zICE9PSB1bmRlZmluZWQgPyAob3B0aW9ucy5mb3JtYXQgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMuZm9ybWF0IDogJ1JHQicpIDogJ1JHQic7XG5cbiAgICBjb25zdCBub3JtID0gb3B0aW9ucz8ubm9ybTtcbiAgICBsZXQgbm9ybU1lYW46IFtudW1iZXIsIG51bWJlciwgbnVtYmVyLCBudW1iZXJdO1xuICAgIGxldCBub3JtQmlhczogW251bWJlciwgbnVtYmVyLCBudW1iZXIsIG51bWJlcl07XG4gICAgaWYgKG5vcm0gPT09IHVuZGVmaW5lZCB8fCBub3JtLm1lYW4gPT09IHVuZGVmaW5lZCkge1xuICAgICAgbm9ybU1lYW4gPSBbMjU1LCAyNTUsIDI1NSwgMjU1XTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHR5cGVvZiBub3JtLm1lYW4gPT09ICdudW1iZXInKSB7XG4gICAgICAgIG5vcm1NZWFuID0gW25vcm0ubWVhbiwgbm9ybS5tZWFuLCBub3JtLm1lYW4sIG5vcm0ubWVhbl07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBub3JtTWVhbiA9IFtub3JtLm1lYW5bMF0sIG5vcm0ubWVhblsxXSwgbm9ybS5tZWFuWzJdLCAyNTVdO1xuICAgICAgICBpZiAobm9ybS5tZWFuWzNdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBub3JtTWVhblszXSA9IG5vcm0ubWVhblszXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAobm9ybSA9PT0gdW5kZWZpbmVkIHx8IG5vcm0uYmlhcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBub3JtQmlhcyA9IFswLCAwLCAwLCAwXTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHR5cGVvZiBub3JtLmJpYXMgPT09ICdudW1iZXInKSB7XG4gICAgICAgIG5vcm1CaWFzID0gW25vcm0uYmlhcywgbm9ybS5iaWFzLCBub3JtLmJpYXMsIG5vcm0uYmlhc107XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBub3JtQmlhcyA9IFtub3JtLmJpYXNbMF0sIG5vcm0uYmlhc1sxXSwgbm9ybS5iaWFzWzJdLCAwXTtcbiAgICAgICAgaWYgKG5vcm0uYmlhc1szXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgbm9ybUJpYXNbM10gPSBub3JtLmJpYXNbM107XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBzdHJpZGUgPSBoZWlnaHQgKiB3aWR0aDtcbiAgICBpZiAob3B0aW9ucyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAoXG4gICAgICAgIChvcHRpb25zLmZvcm1hdCAhPT0gdW5kZWZpbmVkICYmIGNoYW5uZWxzID09PSA0ICYmIG9wdGlvbnMuZm9ybWF0ICE9PSAnUkdCQScpIHx8XG4gICAgICAgIChjaGFubmVscyA9PT0gMyAmJiBvcHRpb25zLmZvcm1hdCAhPT0gJ1JHQicgJiYgb3B0aW9ucy5mb3JtYXQgIT09ICdCR1InKVxuICAgICAgKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRlbnNvciBmb3JtYXQgZG9lc24ndCBtYXRjaCBpbnB1dCB0ZW5zb3IgZGltc1wiKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBEZWZhdWx0IHBvaW50ZXIgYXNzaWdubWVudHNcbiAgICBjb25zdCBzdGVwID0gNDtcbiAgICBsZXQgckltYWdlUG9pbnRlciA9IDAsXG4gICAgICBnSW1hZ2VQb2ludGVyID0gMSxcbiAgICAgIGJJbWFnZVBvaW50ZXIgPSAyLFxuICAgICAgYUltYWdlUG9pbnRlciA9IDM7XG4gICAgbGV0IHJUZW5zb3JQb2ludGVyID0gMCxcbiAgICAgIGdUZW5zb3JQb2ludGVyID0gc3RyaWRlLFxuICAgICAgYlRlbnNvclBvaW50ZXIgPSBzdHJpZGUgKiAyLFxuICAgICAgYVRlbnNvclBvaW50ZXIgPSAtMTtcblxuICAgIC8vIFVwZGF0aW5nIHRoZSBwb2ludGVyIGFzc2lnbm1lbnRzIGJhc2VkIG9uIHRoZSBpbnB1dCBpbWFnZSBmb3JtYXRcbiAgICBpZiAoaW5wdXRmb3JtYXQgPT09ICdSR0JBJykge1xuICAgICAgclRlbnNvclBvaW50ZXIgPSAwO1xuICAgICAgZ1RlbnNvclBvaW50ZXIgPSBzdHJpZGU7XG4gICAgICBiVGVuc29yUG9pbnRlciA9IHN0cmlkZSAqIDI7XG4gICAgICBhVGVuc29yUG9pbnRlciA9IHN0cmlkZSAqIDM7XG4gICAgfSBlbHNlIGlmIChpbnB1dGZvcm1hdCA9PT0gJ1JHQicpIHtcbiAgICAgIHJUZW5zb3JQb2ludGVyID0gMDtcbiAgICAgIGdUZW5zb3JQb2ludGVyID0gc3RyaWRlO1xuICAgICAgYlRlbnNvclBvaW50ZXIgPSBzdHJpZGUgKiAyO1xuICAgIH0gZWxzZSBpZiAoaW5wdXRmb3JtYXQgPT09ICdSQkcnKSB7XG4gICAgICByVGVuc29yUG9pbnRlciA9IDA7XG4gICAgICBiVGVuc29yUG9pbnRlciA9IHN0cmlkZTtcbiAgICAgIGdUZW5zb3JQb2ludGVyID0gc3RyaWRlICogMjtcbiAgICB9XG5cbiAgICBpbWFnZSA9IHBpeGVsczJEQ29udGV4dC5jcmVhdGVJbWFnZURhdGEod2lkdGgsIGhlaWdodCk7XG5cbiAgICBmb3IgKFxuICAgICAgbGV0IGkgPSAwO1xuICAgICAgaSA8IGhlaWdodCAqIHdpZHRoO1xuICAgICAgckltYWdlUG9pbnRlciArPSBzdGVwLCBnSW1hZ2VQb2ludGVyICs9IHN0ZXAsIGJJbWFnZVBvaW50ZXIgKz0gc3RlcCwgYUltYWdlUG9pbnRlciArPSBzdGVwLCBpKytcbiAgICApIHtcbiAgICAgIGltYWdlLmRhdGFbckltYWdlUG9pbnRlcl0gPSAoKHRlbnNvci5kYXRhW3JUZW5zb3JQb2ludGVyKytdIGFzIG51bWJlcikgLSBub3JtQmlhc1swXSkgKiBub3JtTWVhblswXTsgLy8gUiB2YWx1ZVxuICAgICAgaW1hZ2UuZGF0YVtnSW1hZ2VQb2ludGVyXSA9ICgodGVuc29yLmRhdGFbZ1RlbnNvclBvaW50ZXIrK10gYXMgbnVtYmVyKSAtIG5vcm1CaWFzWzFdKSAqIG5vcm1NZWFuWzFdOyAvLyBHIHZhbHVlXG4gICAgICBpbWFnZS5kYXRhW2JJbWFnZVBvaW50ZXJdID0gKCh0ZW5zb3IuZGF0YVtiVGVuc29yUG9pbnRlcisrXSBhcyBudW1iZXIpIC0gbm9ybUJpYXNbMl0pICogbm9ybU1lYW5bMl07IC8vIEIgdmFsdWVcbiAgICAgIGltYWdlLmRhdGFbYUltYWdlUG9pbnRlcl0gPVxuICAgICAgICBhVGVuc29yUG9pbnRlciA9PT0gLTEgPyAyNTUgOiAoKHRlbnNvci5kYXRhW2FUZW5zb3JQb2ludGVyKytdIGFzIG51bWJlcikgLSBub3JtQmlhc1szXSkgKiBub3JtTWVhblszXTsgLy8gQSB2YWx1ZVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbiBub3QgYWNjZXNzIGltYWdlIGRhdGEnKTtcbiAgfVxuICByZXR1cm4gaW1hZ2U7XG59O1xuIiwgIi8vIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuXG5pbXBvcnQge1xuICBPcHRpb25zRGltZW5zaW9ucyxcbiAgT3B0aW9uc0Zvcm1hdCxcbiAgT3B0aW9uc05vcm1hbGl6YXRpb25QYXJhbWV0ZXJzLFxuICBPcHRpb25zVGVuc29yRm9ybWF0LFxuICBPcHRpb25zVGVuc29yTGF5b3V0LFxuICBUZW5zb3JGcm9tR3B1QnVmZmVyT3B0aW9ucyxcbiAgVGVuc29yRnJvbUltYWdlQml0bWFwT3B0aW9ucyxcbiAgVGVuc29yRnJvbUltYWdlRGF0YU9wdGlvbnMsXG4gIFRlbnNvckZyb21JbWFnZUVsZW1lbnRPcHRpb25zLFxuICBUZW5zb3JGcm9tTUxUZW5zb3JPcHRpb25zLFxuICBUZW5zb3JGcm9tVGV4dHVyZU9wdGlvbnMsXG4gIFRlbnNvckZyb21VcmxPcHRpb25zLFxufSBmcm9tICcuL3RlbnNvci1mYWN0b3J5LmpzJztcbmltcG9ydCB7IFRlbnNvciB9IGZyb20gJy4vdGVuc29yLWltcGwuanMnO1xuaW1wb3J0IHsgVGVuc29yIGFzIFRlbnNvckludGVyZmFjZSB9IGZyb20gJy4vdGVuc29yLmpzJztcblxuaW50ZXJmYWNlIEJ1ZmZlclRvVGVuc29yT3B0aW9uc1xuICBleHRlbmRzIE9wdGlvbnNEaW1lbnNpb25zLFxuICAgIE9wdGlvbnNUZW5zb3JMYXlvdXQsXG4gICAgT3B0aW9uc05vcm1hbGl6YXRpb25QYXJhbWV0ZXJzLFxuICAgIE9wdGlvbnNGb3JtYXQsXG4gICAgT3B0aW9uc1RlbnNvckZvcm1hdCB7fVxuXG4vKipcbiAqIENyZWF0ZSBhIG5ldyB0ZW5zb3Igb2JqZWN0IGZyb20gaW1hZ2Ugb2JqZWN0XG4gKlxuICogQHBhcmFtIGJ1ZmZlciAtIEV4dHJhY3RlZCBpbWFnZSBidWZmZXIgZGF0YSAtIGFzc3VtaW5nIFJHQkEgZm9ybWF0XG4gKiBAcGFyYW0gaW1hZ2VGb3JtYXQgLSBpbnB1dCBpbWFnZSBjb25maWd1cmF0aW9uIC0gcmVxdWlyZWQgY29uZmlndXJhdGlvbnMgaGVpZ2h0LCB3aWR0aCwgZm9ybWF0XG4gKiBAcGFyYW0gdGVuc29yRm9ybWF0IC0gb3V0cHV0IHRlbnNvciBjb25maWd1cmF0aW9uIC0gRGVmYXVsdCBpcyBSR0IgZm9ybWF0XG4gKi9cbmV4cG9ydCBjb25zdCBidWZmZXJUb1RlbnNvciA9IChidWZmZXI6IFVpbnQ4Q2xhbXBlZEFycmF5IHwgdW5kZWZpbmVkLCBvcHRpb25zOiBCdWZmZXJUb1RlbnNvck9wdGlvbnMpOiBUZW5zb3IgPT4ge1xuICBpZiAoYnVmZmVyID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ltYWdlIGJ1ZmZlciBtdXN0IGJlIGRlZmluZWQnKTtcbiAgfVxuICBpZiAob3B0aW9ucy5oZWlnaHQgPT09IHVuZGVmaW5lZCB8fCBvcHRpb25zLndpZHRoID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ltYWdlIGhlaWdodCBhbmQgd2lkdGggbXVzdCBiZSBkZWZpbmVkJyk7XG4gIH1cbiAgaWYgKG9wdGlvbnMudGVuc29yTGF5b3V0ID09PSAnTkhXQycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05IV0MgVGVuc29yIGxheW91dCBpcyBub3Qgc3VwcG9ydGVkIHlldCcpO1xuICB9XG5cbiAgY29uc3QgeyBoZWlnaHQsIHdpZHRoIH0gPSBvcHRpb25zO1xuXG4gIGNvbnN0IG5vcm0gPSBvcHRpb25zLm5vcm0gPz8geyBtZWFuOiAyNTUsIGJpYXM6IDAgfTtcbiAgbGV0IG5vcm1NZWFuOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyXTtcbiAgbGV0IG5vcm1CaWFzOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyXTtcblxuICBpZiAodHlwZW9mIG5vcm0ubWVhbiA9PT0gJ251bWJlcicpIHtcbiAgICBub3JtTWVhbiA9IFtub3JtLm1lYW4sIG5vcm0ubWVhbiwgbm9ybS5tZWFuLCBub3JtLm1lYW5dO1xuICB9IGVsc2Uge1xuICAgIG5vcm1NZWFuID0gW25vcm0ubWVhbiFbMF0sIG5vcm0ubWVhbiFbMV0sIG5vcm0ubWVhbiFbMl0sIG5vcm0ubWVhbiFbM10gPz8gMjU1XTtcbiAgfVxuXG4gIGlmICh0eXBlb2Ygbm9ybS5iaWFzID09PSAnbnVtYmVyJykge1xuICAgIG5vcm1CaWFzID0gW25vcm0uYmlhcywgbm9ybS5iaWFzLCBub3JtLmJpYXMsIG5vcm0uYmlhc107XG4gIH0gZWxzZSB7XG4gICAgbm9ybUJpYXMgPSBbbm9ybS5iaWFzIVswXSwgbm9ybS5iaWFzIVsxXSwgbm9ybS5iaWFzIVsyXSwgbm9ybS5iaWFzIVszXSA/PyAwXTtcbiAgfVxuXG4gIGNvbnN0IGlucHV0Zm9ybWF0ID0gb3B0aW9ucy5mb3JtYXQgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMuZm9ybWF0IDogJ1JHQkEnO1xuICAvLyBkZWZhdWx0IHZhbHVlIGlzIFJHQkEgc2luY2UgaW1hZ2VkYXRhIGFuZCBIVE1MSW1hZ2VFbGVtZW50IHVzZXMgaXRcblxuICBjb25zdCBvdXRwdXRmb3JtYXQgPVxuICAgIG9wdGlvbnMudGVuc29yRm9ybWF0ICE9PSB1bmRlZmluZWQgPyAob3B0aW9ucy50ZW5zb3JGb3JtYXQgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMudGVuc29yRm9ybWF0IDogJ1JHQicpIDogJ1JHQic7XG4gIGNvbnN0IHN0cmlkZSA9IGhlaWdodCAqIHdpZHRoO1xuICBjb25zdCBmbG9hdDMyRGF0YSA9IG91dHB1dGZvcm1hdCA9PT0gJ1JHQkEnID8gbmV3IEZsb2F0MzJBcnJheShzdHJpZGUgKiA0KSA6IG5ldyBGbG9hdDMyQXJyYXkoc3RyaWRlICogMyk7XG5cbiAgLy8gRGVmYXVsdCBwb2ludGVyIGFzc2lnbm1lbnRzXG4gIGxldCBzdGVwID0gNCxcbiAgICBySW1hZ2VQb2ludGVyID0gMCxcbiAgICBnSW1hZ2VQb2ludGVyID0gMSxcbiAgICBiSW1hZ2VQb2ludGVyID0gMixcbiAgICBhSW1hZ2VQb2ludGVyID0gMztcbiAgbGV0IHJUZW5zb3JQb2ludGVyID0gMCxcbiAgICBnVGVuc29yUG9pbnRlciA9IHN0cmlkZSxcbiAgICBiVGVuc29yUG9pbnRlciA9IHN0cmlkZSAqIDIsXG4gICAgYVRlbnNvclBvaW50ZXIgPSAtMTtcblxuICAvLyBVcGRhdGluZyB0aGUgcG9pbnRlciBhc3NpZ25tZW50cyBiYXNlZCBvbiB0aGUgaW5wdXQgaW1hZ2UgZm9ybWF0XG4gIGlmIChpbnB1dGZvcm1hdCA9PT0gJ1JHQicpIHtcbiAgICBzdGVwID0gMztcbiAgICBySW1hZ2VQb2ludGVyID0gMDtcbiAgICBnSW1hZ2VQb2ludGVyID0gMTtcbiAgICBiSW1hZ2VQb2ludGVyID0gMjtcbiAgICBhSW1hZ2VQb2ludGVyID0gLTE7XG4gIH1cblxuICAvLyBVcGRhdGluZyB0aGUgcG9pbnRlciBhc3NpZ25tZW50cyBiYXNlZCBvbiB0aGUgb3V0cHV0IHRlbnNvciBmb3JtYXRcbiAgaWYgKG91dHB1dGZvcm1hdCA9PT0gJ1JHQkEnKSB7XG4gICAgYVRlbnNvclBvaW50ZXIgPSBzdHJpZGUgKiAzO1xuICB9IGVsc2UgaWYgKG91dHB1dGZvcm1hdCA9PT0gJ1JCRycpIHtcbiAgICByVGVuc29yUG9pbnRlciA9IDA7XG4gICAgYlRlbnNvclBvaW50ZXIgPSBzdHJpZGU7XG4gICAgZ1RlbnNvclBvaW50ZXIgPSBzdHJpZGUgKiAyO1xuICB9IGVsc2UgaWYgKG91dHB1dGZvcm1hdCA9PT0gJ0JHUicpIHtcbiAgICBiVGVuc29yUG9pbnRlciA9IDA7XG4gICAgZ1RlbnNvclBvaW50ZXIgPSBzdHJpZGU7XG4gICAgclRlbnNvclBvaW50ZXIgPSBzdHJpZGUgKiAyO1xuICB9XG5cbiAgZm9yIChcbiAgICBsZXQgaSA9IDA7XG4gICAgaSA8IHN0cmlkZTtcbiAgICBpKyssIHJJbWFnZVBvaW50ZXIgKz0gc3RlcCwgYkltYWdlUG9pbnRlciArPSBzdGVwLCBnSW1hZ2VQb2ludGVyICs9IHN0ZXAsIGFJbWFnZVBvaW50ZXIgKz0gc3RlcFxuICApIHtcbiAgICBmbG9hdDMyRGF0YVtyVGVuc29yUG9pbnRlcisrXSA9IChidWZmZXJbckltYWdlUG9pbnRlcl0gKyBub3JtQmlhc1swXSkgLyBub3JtTWVhblswXTtcbiAgICBmbG9hdDMyRGF0YVtnVGVuc29yUG9pbnRlcisrXSA9IChidWZmZXJbZ0ltYWdlUG9pbnRlcl0gKyBub3JtQmlhc1sxXSkgLyBub3JtTWVhblsxXTtcbiAgICBmbG9hdDMyRGF0YVtiVGVuc29yUG9pbnRlcisrXSA9IChidWZmZXJbYkltYWdlUG9pbnRlcl0gKyBub3JtQmlhc1syXSkgLyBub3JtTWVhblsyXTtcbiAgICBpZiAoYVRlbnNvclBvaW50ZXIgIT09IC0xICYmIGFJbWFnZVBvaW50ZXIgIT09IC0xKSB7XG4gICAgICBmbG9hdDMyRGF0YVthVGVuc29yUG9pbnRlcisrXSA9IChidWZmZXJbYUltYWdlUG9pbnRlcl0gKyBub3JtQmlhc1szXSkgLyBub3JtTWVhblszXTtcbiAgICB9XG4gIH1cblxuICAvLyBGbG9hdDMyQXJyYXkgLT4gb3J0LlRlbnNvclxuICBjb25zdCBvdXRwdXRUZW5zb3IgPVxuICAgIG91dHB1dGZvcm1hdCA9PT0gJ1JHQkEnXG4gICAgICA/IG5ldyBUZW5zb3IoJ2Zsb2F0MzInLCBmbG9hdDMyRGF0YSwgWzEsIDQsIGhlaWdodCwgd2lkdGhdKVxuICAgICAgOiBuZXcgVGVuc29yKCdmbG9hdDMyJywgZmxvYXQzMkRhdGEsIFsxLCAzLCBoZWlnaHQsIHdpZHRoXSk7XG4gIHJldHVybiBvdXRwdXRUZW5zb3I7XG59O1xuXG4vKipcbiAqIGltcGxlbWVudGF0aW9uIG9mIFRlbnNvci5mcm9tSW1hZ2UoKS5cbiAqL1xuZXhwb3J0IGNvbnN0IHRlbnNvckZyb21JbWFnZSA9IGFzeW5jIChcbiAgaW1hZ2U6IEltYWdlRGF0YSB8IEhUTUxJbWFnZUVsZW1lbnQgfCBJbWFnZUJpdG1hcCB8IHN0cmluZyxcbiAgb3B0aW9ucz86XG4gICAgfCBUZW5zb3JGcm9tSW1hZ2VEYXRhT3B0aW9uc1xuICAgIHwgVGVuc29yRnJvbUltYWdlRWxlbWVudE9wdGlvbnNcbiAgICB8IFRlbnNvckZyb21JbWFnZUJpdG1hcE9wdGlvbnNcbiAgICB8IFRlbnNvckZyb21VcmxPcHRpb25zLFxuKTogUHJvbWlzZTxUZW5zb3I+ID0+IHtcbiAgLy8gY2hlY2tpbmcgdGhlIHR5cGUgb2YgaW1hZ2Ugb2JqZWN0XG4gIGNvbnN0IGlzSFRNTEltYWdlRWxlID0gdHlwZW9mIEhUTUxJbWFnZUVsZW1lbnQgIT09ICd1bmRlZmluZWQnICYmIGltYWdlIGluc3RhbmNlb2YgSFRNTEltYWdlRWxlbWVudDtcbiAgY29uc3QgaXNJbWFnZURhdGFFbGUgPSB0eXBlb2YgSW1hZ2VEYXRhICE9PSAndW5kZWZpbmVkJyAmJiBpbWFnZSBpbnN0YW5jZW9mIEltYWdlRGF0YTtcbiAgY29uc3QgaXNJbWFnZUJpdG1hcCA9IHR5cGVvZiBJbWFnZUJpdG1hcCAhPT0gJ3VuZGVmaW5lZCcgJiYgaW1hZ2UgaW5zdGFuY2VvZiBJbWFnZUJpdG1hcDtcbiAgY29uc3QgaXNTdHJpbmcgPSB0eXBlb2YgaW1hZ2UgPT09ICdzdHJpbmcnO1xuXG4gIGxldCBkYXRhOiBVaW50OENsYW1wZWRBcnJheSB8IHVuZGVmaW5lZDtcbiAgbGV0IGJ1ZmZlclRvVGVuc29yT3B0aW9uczogQnVmZmVyVG9UZW5zb3JPcHRpb25zID0gb3B0aW9ucyA/PyB7fTtcblxuICBjb25zdCBjcmVhdGVDYW52YXMgPSAoKSA9PiB7XG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBPZmZzY3JlZW5DYW52YXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm4gbmV3IE9mZnNjcmVlbkNhbnZhcygxLCAxKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW52YXMgaXMgbm90IHN1cHBvcnRlZCcpO1xuICAgIH1cbiAgfTtcbiAgY29uc3QgY3JlYXRlQ2FudmFzQ29udGV4dCA9IChjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50IHwgT2Zmc2NyZWVuQ2FudmFzKSA9PiB7XG4gICAgaWYgKHR5cGVvZiBIVE1MQ2FudmFzRWxlbWVudCAhPT0gJ3VuZGVmaW5lZCcgJiYgY2FudmFzIGluc3RhbmNlb2YgSFRNTENhbnZhc0VsZW1lbnQpIHtcbiAgICAgIHJldHVybiBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICB9IGVsc2UgaWYgKGNhbnZhcyBpbnN0YW5jZW9mIE9mZnNjcmVlbkNhbnZhcykge1xuICAgICAgcmV0dXJuIGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpIGFzIE9mZnNjcmVlbkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9O1xuICAvLyBmaWxsaW5nIGFuZCBjaGVja2luZyBpbWFnZSBjb25maWd1cmF0aW9uIG9wdGlvbnNcbiAgaWYgKGlzSFRNTEltYWdlRWxlKSB7XG4gICAgLy8gSFRNTEltYWdlRWxlbWVudCAtIGltYWdlIG9iamVjdCAtIGZvcm1hdCBpcyBSR0JBIGJ5IGRlZmF1bHRcbiAgICBjb25zdCBjYW52YXMgPSBjcmVhdGVDYW52YXMoKTtcbiAgICBjYW52YXMud2lkdGggPSBpbWFnZS53aWR0aDtcbiAgICBjYW52YXMuaGVpZ2h0ID0gaW1hZ2UuaGVpZ2h0O1xuICAgIGNvbnN0IHBpeGVsczJEQ29udGV4dCA9IGNyZWF0ZUNhbnZhc0NvbnRleHQoY2FudmFzKTtcblxuICAgIGlmIChwaXhlbHMyRENvbnRleHQgIT0gbnVsbCkge1xuICAgICAgbGV0IGhlaWdodCA9IGltYWdlLmhlaWdodDtcbiAgICAgIGxldCB3aWR0aCA9IGltYWdlLndpZHRoO1xuICAgICAgaWYgKG9wdGlvbnMgIT09IHVuZGVmaW5lZCAmJiBvcHRpb25zLnJlc2l6ZWRIZWlnaHQgIT09IHVuZGVmaW5lZCAmJiBvcHRpb25zLnJlc2l6ZWRXaWR0aCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGhlaWdodCA9IG9wdGlvbnMucmVzaXplZEhlaWdodDtcbiAgICAgICAgd2lkdGggPSBvcHRpb25zLnJlc2l6ZWRXaWR0aDtcbiAgICAgIH1cblxuICAgICAgaWYgKG9wdGlvbnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBidWZmZXJUb1RlbnNvck9wdGlvbnMgPSBvcHRpb25zO1xuICAgICAgICBpZiAob3B0aW9ucy50ZW5zb3JGb3JtYXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW1hZ2UgaW5wdXQgY29uZmlnIGZvcm1hdCBtdXN0IGJlIFJHQkEgZm9yIEhUTUxJbWFnZUVsZW1lbnQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBidWZmZXJUb1RlbnNvck9wdGlvbnMudGVuc29yRm9ybWF0ID0gJ1JHQkEnO1xuICAgICAgICB9XG4gICAgICAgIGJ1ZmZlclRvVGVuc29yT3B0aW9ucy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIGJ1ZmZlclRvVGVuc29yT3B0aW9ucy53aWR0aCA9IHdpZHRoO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnVmZmVyVG9UZW5zb3JPcHRpb25zLnRlbnNvckZvcm1hdCA9ICdSR0JBJztcbiAgICAgICAgYnVmZmVyVG9UZW5zb3JPcHRpb25zLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgYnVmZmVyVG9UZW5zb3JPcHRpb25zLndpZHRoID0gd2lkdGg7XG4gICAgICB9XG5cbiAgICAgIHBpeGVsczJEQ29udGV4dC5kcmF3SW1hZ2UoaW1hZ2UsIDAsIDApO1xuICAgICAgZGF0YSA9IHBpeGVsczJEQ29udGV4dC5nZXRJbWFnZURhdGEoMCwgMCwgd2lkdGgsIGhlaWdodCkuZGF0YTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW4gbm90IGFjY2VzcyBpbWFnZSBkYXRhJyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzSW1hZ2VEYXRhRWxlKSB7XG4gICAgbGV0IGhlaWdodDogbnVtYmVyO1xuICAgIGxldCB3aWR0aDogbnVtYmVyO1xuXG4gICAgaWYgKG9wdGlvbnMgIT09IHVuZGVmaW5lZCAmJiBvcHRpb25zLnJlc2l6ZWRXaWR0aCAhPT0gdW5kZWZpbmVkICYmIG9wdGlvbnMucmVzaXplZEhlaWdodCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBoZWlnaHQgPSBvcHRpb25zLnJlc2l6ZWRIZWlnaHQ7XG4gICAgICB3aWR0aCA9IG9wdGlvbnMucmVzaXplZFdpZHRoO1xuICAgIH0gZWxzZSB7XG4gICAgICBoZWlnaHQgPSBpbWFnZS5oZWlnaHQ7XG4gICAgICB3aWR0aCA9IGltYWdlLndpZHRoO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGJ1ZmZlclRvVGVuc29yT3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgfVxuICAgIGJ1ZmZlclRvVGVuc29yT3B0aW9ucy5mb3JtYXQgPSAnUkdCQSc7XG4gICAgYnVmZmVyVG9UZW5zb3JPcHRpb25zLmhlaWdodCA9IGhlaWdodDtcbiAgICBidWZmZXJUb1RlbnNvck9wdGlvbnMud2lkdGggPSB3aWR0aDtcblxuICAgIGlmIChvcHRpb25zICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IHRlbXBDYW52YXMgPSBjcmVhdGVDYW52YXMoKTtcblxuICAgICAgdGVtcENhbnZhcy53aWR0aCA9IHdpZHRoO1xuICAgICAgdGVtcENhbnZhcy5oZWlnaHQgPSBoZWlnaHQ7XG5cbiAgICAgIGNvbnN0IHBpeGVsczJEQ29udGV4dCA9IGNyZWF0ZUNhbnZhc0NvbnRleHQodGVtcENhbnZhcyk7XG5cbiAgICAgIGlmIChwaXhlbHMyRENvbnRleHQgIT0gbnVsbCkge1xuICAgICAgICBwaXhlbHMyRENvbnRleHQucHV0SW1hZ2VEYXRhKGltYWdlLCAwLCAwKTtcbiAgICAgICAgZGF0YSA9IHBpeGVsczJEQ29udGV4dC5nZXRJbWFnZURhdGEoMCwgMCwgd2lkdGgsIGhlaWdodCkuZGF0YTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ2FuIG5vdCBhY2Nlc3MgaW1hZ2UgZGF0YScpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBkYXRhID0gaW1hZ2UuZGF0YTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNJbWFnZUJpdG1hcCkge1xuICAgIC8vIEltYWdlQml0bWFwIC0gaW1hZ2Ugb2JqZWN0IC0gZm9ybWF0IG11c3QgYmUgcHJvdmlkZWQgYnkgdXNlclxuICAgIGlmIChvcHRpb25zID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignUGxlYXNlIHByb3ZpZGUgaW1hZ2UgY29uZmlnIHdpdGggZm9ybWF0IGZvciBJbWFnZWJpdG1hcCcpO1xuICAgIH1cblxuICAgIGNvbnN0IGNhbnZhcyA9IGNyZWF0ZUNhbnZhcygpO1xuICAgIGNhbnZhcy53aWR0aCA9IGltYWdlLndpZHRoO1xuICAgIGNhbnZhcy5oZWlnaHQgPSBpbWFnZS5oZWlnaHQ7XG4gICAgY29uc3QgcGl4ZWxzMkRDb250ZXh0ID0gY3JlYXRlQ2FudmFzQ29udGV4dChjYW52YXMpO1xuXG4gICAgaWYgKHBpeGVsczJEQ29udGV4dCAhPSBudWxsKSB7XG4gICAgICBjb25zdCBoZWlnaHQgPSBpbWFnZS5oZWlnaHQ7XG4gICAgICBjb25zdCB3aWR0aCA9IGltYWdlLndpZHRoO1xuICAgICAgcGl4ZWxzMkRDb250ZXh0LmRyYXdJbWFnZShpbWFnZSwgMCwgMCwgd2lkdGgsIGhlaWdodCk7XG4gICAgICBkYXRhID0gcGl4ZWxzMkRDb250ZXh0LmdldEltYWdlRGF0YSgwLCAwLCB3aWR0aCwgaGVpZ2h0KS5kYXRhO1xuICAgICAgYnVmZmVyVG9UZW5zb3JPcHRpb25zLmhlaWdodCA9IGhlaWdodDtcbiAgICAgIGJ1ZmZlclRvVGVuc29yT3B0aW9ucy53aWR0aCA9IHdpZHRoO1xuICAgICAgcmV0dXJuIGJ1ZmZlclRvVGVuc29yKGRhdGEsIGJ1ZmZlclRvVGVuc29yT3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2FuIG5vdCBhY2Nlc3MgaW1hZ2UgZGF0YScpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc1N0cmluZykge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCBjYW52YXMgPSBjcmVhdGVDYW52YXMoKTtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSBjcmVhdGVDYW52YXNDb250ZXh0KGNhbnZhcyk7XG4gICAgICBpZiAoIWltYWdlIHx8ICFjb250ZXh0KSB7XG4gICAgICAgIHJldHVybiByZWplY3QoKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG5ld0ltYWdlID0gbmV3IEltYWdlKCk7XG4gICAgICBuZXdJbWFnZS5jcm9zc09yaWdpbiA9ICdBbm9ueW1vdXMnO1xuICAgICAgbmV3SW1hZ2Uuc3JjID0gaW1hZ2U7XG4gICAgICBuZXdJbWFnZS5vbmxvYWQgPSAoKSA9PiB7XG4gICAgICAgIGNhbnZhcy53aWR0aCA9IG5ld0ltYWdlLndpZHRoO1xuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gbmV3SW1hZ2UuaGVpZ2h0O1xuICAgICAgICBjb250ZXh0LmRyYXdJbWFnZShuZXdJbWFnZSwgMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcbiAgICAgICAgY29uc3QgaW1nID0gY29udGV4dC5nZXRJbWFnZURhdGEoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcblxuICAgICAgICBidWZmZXJUb1RlbnNvck9wdGlvbnMuaGVpZ2h0ID0gY2FudmFzLmhlaWdodDtcbiAgICAgICAgYnVmZmVyVG9UZW5zb3JPcHRpb25zLndpZHRoID0gY2FudmFzLndpZHRoO1xuICAgICAgICByZXNvbHZlKGJ1ZmZlclRvVGVuc29yKGltZy5kYXRhLCBidWZmZXJUb1RlbnNvck9wdGlvbnMpKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnB1dCBkYXRhIHByb3ZpZGVkIGlzIG5vdCBzdXBwb3J0ZWQgLSBhYm9ydGVkIHRlbnNvciBjcmVhdGlvbicpO1xuICB9XG5cbiAgaWYgKGRhdGEgIT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBidWZmZXJUb1RlbnNvcihkYXRhLCBidWZmZXJUb1RlbnNvck9wdGlvbnMpO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcignSW5wdXQgZGF0YSBwcm92aWRlZCBpcyBub3Qgc3VwcG9ydGVkIC0gYWJvcnRlZCB0ZW5zb3IgY3JlYXRpb24nKTtcbiAgfVxufTtcblxuLyoqXG4gKiBpbXBsZW1lbnRhdGlvbiBvZiBUZW5zb3IuZnJvbVRleHR1cmUoKS5cbiAqL1xuZXhwb3J0IGNvbnN0IHRlbnNvckZyb21UZXh0dXJlID0gPFQgZXh0ZW5kcyBUZW5zb3JJbnRlcmZhY2UuVGV4dHVyZURhdGFUeXBlcz4oXG4gIHRleHR1cmU6IFRlbnNvckludGVyZmFjZS5UZXh0dXJlVHlwZSxcbiAgb3B0aW9uczogVGVuc29yRnJvbVRleHR1cmVPcHRpb25zPFQ+LFxuKTogVGVuc29yID0+IHtcbiAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0LCBkb3dubG9hZCwgZGlzcG9zZSB9ID0gb3B0aW9ucztcbiAgLy8gQWx3YXlzIGFzc3VtZSBSR0JBRjMyLiBUT0RPOiBzdXBwb3J0IGRpZmZlcmVudCB0ZXh0dXJlIGZvcm1hdFxuICBjb25zdCBkaW1zID0gWzEsIGhlaWdodCwgd2lkdGgsIDRdO1xuICByZXR1cm4gbmV3IFRlbnNvcih7IGxvY2F0aW9uOiAndGV4dHVyZScsIHR5cGU6ICdmbG9hdDMyJywgdGV4dHVyZSwgZGltcywgZG93bmxvYWQsIGRpc3Bvc2UgfSk7XG59O1xuXG4vKipcbiAqIGltcGxlbWVudGF0aW9uIG9mIFRlbnNvci5mcm9tR3B1QnVmZmVyKCkuXG4gKi9cbmV4cG9ydCBjb25zdCB0ZW5zb3JGcm9tR3B1QnVmZmVyID0gPFQgZXh0ZW5kcyBUZW5zb3JJbnRlcmZhY2UuR3B1QnVmZmVyRGF0YVR5cGVzPihcbiAgZ3B1QnVmZmVyOiBUZW5zb3JJbnRlcmZhY2UuR3B1QnVmZmVyVHlwZSxcbiAgb3B0aW9uczogVGVuc29yRnJvbUdwdUJ1ZmZlck9wdGlvbnM8VD4sXG4pOiBUZW5zb3IgPT4ge1xuICBjb25zdCB7IGRhdGFUeXBlLCBkaW1zLCBkb3dubG9hZCwgZGlzcG9zZSB9ID0gb3B0aW9ucztcbiAgcmV0dXJuIG5ldyBUZW5zb3IoeyBsb2NhdGlvbjogJ2dwdS1idWZmZXInLCB0eXBlOiBkYXRhVHlwZSA/PyAnZmxvYXQzMicsIGdwdUJ1ZmZlciwgZGltcywgZG93bmxvYWQsIGRpc3Bvc2UgfSk7XG59O1xuXG4vKipcbiAqIGltcGxlbWVudGF0aW9uIG9mIFRlbnNvci5mcm9tTUxUZW5zb3IoKS5cbiAqL1xuZXhwb3J0IGNvbnN0IHRlbnNvckZyb21NTFRlbnNvciA9IDxUIGV4dGVuZHMgVGVuc29ySW50ZXJmYWNlLk1MVGVuc29yRGF0YVR5cGVzPihcbiAgbWxUZW5zb3I6IFRlbnNvckludGVyZmFjZS5NTFRlbnNvclR5cGUsXG4gIG9wdGlvbnM6IFRlbnNvckZyb21NTFRlbnNvck9wdGlvbnM8VD4sXG4pOiBUZW5zb3IgPT4ge1xuICBjb25zdCB7IGRhdGFUeXBlLCBkaW1zLCBkb3dubG9hZCwgZGlzcG9zZSB9ID0gb3B0aW9ucztcbiAgcmV0dXJuIG5ldyBUZW5zb3IoeyBsb2NhdGlvbjogJ21sLXRlbnNvcicsIHR5cGU6IGRhdGFUeXBlID8/ICdmbG9hdDMyJywgbWxUZW5zb3IsIGRpbXMsIGRvd25sb2FkLCBkaXNwb3NlIH0pO1xufTtcblxuLyoqXG4gKiBpbXBsZW1lbnRhdGlvbiBvZiBUZW5zb3IuZnJvbVBpbm5lZEJ1ZmZlcigpLlxuICovXG5leHBvcnQgY29uc3QgdGVuc29yRnJvbVBpbm5lZEJ1ZmZlciA9IDxUIGV4dGVuZHMgVGVuc29ySW50ZXJmYWNlLkNwdVBpbm5lZERhdGFUeXBlcz4oXG4gIHR5cGU6IFQsXG4gIGJ1ZmZlcjogVGVuc29ySW50ZXJmYWNlLkRhdGFUeXBlTWFwW1RdLFxuICBkaW1zPzogcmVhZG9ubHkgbnVtYmVyW10sXG4pOiBUZW5zb3IgPT4gbmV3IFRlbnNvcih7IGxvY2F0aW9uOiAnY3B1LXBpbm5lZCcsIHR5cGUsIGRhdGE6IGJ1ZmZlciwgZGltczogZGltcyA/PyBbYnVmZmVyLmxlbmd0aF0gfSk7XG4iLCAiLy8gQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG5cbmltcG9ydCB7IFRlbnNvciB9IGZyb20gJy4vdGVuc29yLmpzJztcblxuZXhwb3J0IHR5cGUgU3VwcG9ydGVkVHlwZWRBcnJheUNvbnN0cnVjdG9ycyA9XG4gIHwgRmxvYXQzMkFycmF5Q29uc3RydWN0b3JcbiAgfCBVaW50OEFycmF5Q29uc3RydWN0b3JcbiAgfCBJbnQ4QXJyYXlDb25zdHJ1Y3RvclxuICB8IFVpbnQxNkFycmF5Q29uc3RydWN0b3JcbiAgfCBJbnQxNkFycmF5Q29uc3RydWN0b3JcbiAgfCBJbnQzMkFycmF5Q29uc3RydWN0b3JcbiAgfCBCaWdJbnQ2NEFycmF5Q29uc3RydWN0b3JcbiAgfCBVaW50OEFycmF5Q29uc3RydWN0b3JcbiAgfCBGbG9hdDY0QXJyYXlDb25zdHJ1Y3RvclxuICB8IFVpbnQzMkFycmF5Q29uc3RydWN0b3JcbiAgfCBCaWdVaW50NjRBcnJheUNvbnN0cnVjdG9yO1xuZXhwb3J0IHR5cGUgU3VwcG9ydGVkVHlwZWRBcnJheSA9IEluc3RhbmNlVHlwZTxTdXBwb3J0ZWRUeXBlZEFycmF5Q29uc3RydWN0b3JzPjtcblxuLy8gYSBydW50aW1lIG1hcCB0aGF0IG1hcHMgdHlwZSBzdHJpbmcgdG8gVHlwZWRBcnJheSBjb25zdHJ1Y3Rvci4gU2hvdWxkIG1hdGNoIFRlbnNvci5EYXRhVHlwZU1hcC5cbmV4cG9ydCBjb25zdCBOVU1FUklDX1RFTlNPUl9UWVBFX1RPX1RZUEVEQVJSQVlfTUFQID0gbmV3IE1hcDxzdHJpbmcsIFN1cHBvcnRlZFR5cGVkQXJyYXlDb25zdHJ1Y3RvcnM+KFtcbiAgWydmbG9hdDMyJywgRmxvYXQzMkFycmF5XSxcbiAgWyd1aW50OCcsIFVpbnQ4QXJyYXldLFxuICBbJ2ludDgnLCBJbnQ4QXJyYXldLFxuICBbJ3VpbnQxNicsIFVpbnQxNkFycmF5XSxcbiAgWydpbnQxNicsIEludDE2QXJyYXldLFxuICBbJ2ludDMyJywgSW50MzJBcnJheV0sXG4gIFsnYm9vbCcsIFVpbnQ4QXJyYXldLFxuICBbJ2Zsb2F0NjQnLCBGbG9hdDY0QXJyYXldLFxuICBbJ3VpbnQzMicsIFVpbnQzMkFycmF5XSxcbiAgWydpbnQ0JywgVWludDhBcnJheV0sXG4gIFsndWludDQnLCBVaW50OEFycmF5XSxcbl0pO1xuXG4vLyBhIHJ1bnRpbWUgbWFwIHRoYXQgbWFwcyB0eXBlIHN0cmluZyB0byBUeXBlZEFycmF5IGNvbnN0cnVjdG9yLiBTaG91bGQgbWF0Y2ggVGVuc29yLkRhdGFUeXBlTWFwLlxuZXhwb3J0IGNvbnN0IE5VTUVSSUNfVEVOU09SX1RZUEVEQVJSQVlfVE9fVFlQRV9NQVAgPSBuZXcgTWFwPFN1cHBvcnRlZFR5cGVkQXJyYXlDb25zdHJ1Y3RvcnMsIFRlbnNvci5UeXBlPihbXG4gIFtGbG9hdDMyQXJyYXksICdmbG9hdDMyJ10sXG4gIFtVaW50OEFycmF5LCAndWludDgnXSxcbiAgW0ludDhBcnJheSwgJ2ludDgnXSxcbiAgW1VpbnQxNkFycmF5LCAndWludDE2J10sXG4gIFtJbnQxNkFycmF5LCAnaW50MTYnXSxcbiAgW0ludDMyQXJyYXksICdpbnQzMiddLFxuICBbRmxvYXQ2NEFycmF5LCAnZmxvYXQ2NCddLFxuICBbVWludDMyQXJyYXksICd1aW50MzInXSxcbl0pO1xuXG4vLyB0aGUgZm9sbG93aW5nIGNvZGUgYWxsb3dzIGRlbGF5aW5nIGV4ZWN1dGlvbiBvZiBCaWdJbnQvRmxvYXQxNkFycmF5IGNoZWNraW5nLiBUaGlzIGFsbG93cyBsYXp5IGluaXRpYWxpemF0aW9uIGZvclxuLy8gTlVNRVJJQ19URU5TT1JfVFlQRV9UT19UWVBFREFSUkFZX01BUCBhbmQgTlVNRVJJQ19URU5TT1JfVFlQRURBUlJBWV9UT19UWVBFX01BUCwgd2hpY2ggYWxsb3dzIEJpZ0ludC9GbG9hdDE2QXJyYXlcbi8vIHBvbHlmaWxsIGlmIGF2YWlsYWJsZS5cbmxldCBpc1R5cGVkQXJyYXlDaGVja2VkID0gZmFsc2U7XG5leHBvcnQgY29uc3QgY2hlY2tUeXBlZEFycmF5ID0gKCkgPT4ge1xuICBpZiAoIWlzVHlwZWRBcnJheUNoZWNrZWQpIHtcbiAgICBpc1R5cGVkQXJyYXlDaGVja2VkID0gdHJ1ZTtcbiAgICBjb25zdCBpc0JpZ0ludDY0QXJyYXlBdmFpbGFibGUgPSB0eXBlb2YgQmlnSW50NjRBcnJheSAhPT0gJ3VuZGVmaW5lZCcgJiYgQmlnSW50NjRBcnJheS5mcm9tO1xuICAgIGNvbnN0IGlzQmlnVWludDY0QXJyYXlBdmFpbGFibGUgPSB0eXBlb2YgQmlnVWludDY0QXJyYXkgIT09ICd1bmRlZmluZWQnICYmIEJpZ1VpbnQ2NEFycmF5LmZyb207XG5cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25hbWluZy1jb252ZW50aW9uLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgY29uc3QgRmxvYXQxNkFycmF5ID0gKGdsb2JhbFRoaXMgYXMgYW55KS5GbG9hdDE2QXJyYXk7XG4gICAgY29uc3QgaXNGbG9hdDE2QXJyYXlBdmFpbGFibGUgPSB0eXBlb2YgRmxvYXQxNkFycmF5ICE9PSAndW5kZWZpbmVkJyAmJiBGbG9hdDE2QXJyYXkuZnJvbTtcblxuICAgIGlmIChpc0JpZ0ludDY0QXJyYXlBdmFpbGFibGUpIHtcbiAgICAgIE5VTUVSSUNfVEVOU09SX1RZUEVfVE9fVFlQRURBUlJBWV9NQVAuc2V0KCdpbnQ2NCcsIEJpZ0ludDY0QXJyYXkpO1xuICAgICAgTlVNRVJJQ19URU5TT1JfVFlQRURBUlJBWV9UT19UWVBFX01BUC5zZXQoQmlnSW50NjRBcnJheSwgJ2ludDY0Jyk7XG4gICAgfVxuICAgIGlmIChpc0JpZ1VpbnQ2NEFycmF5QXZhaWxhYmxlKSB7XG4gICAgICBOVU1FUklDX1RFTlNPUl9UWVBFX1RPX1RZUEVEQVJSQVlfTUFQLnNldCgndWludDY0JywgQmlnVWludDY0QXJyYXkpO1xuICAgICAgTlVNRVJJQ19URU5TT1JfVFlQRURBUlJBWV9UT19UWVBFX01BUC5zZXQoQmlnVWludDY0QXJyYXksICd1aW50NjQnKTtcbiAgICB9XG4gICAgaWYgKGlzRmxvYXQxNkFycmF5QXZhaWxhYmxlKSB7XG4gICAgICBOVU1FUklDX1RFTlNPUl9UWVBFX1RPX1RZUEVEQVJSQVlfTUFQLnNldCgnZmxvYXQxNicsIEZsb2F0MTZBcnJheSk7XG4gICAgICBOVU1FUklDX1RFTlNPUl9UWVBFREFSUkFZX1RPX1RZUEVfTUFQLnNldChGbG9hdDE2QXJyYXksICdmbG9hdDE2Jyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGlmIEZsb2F0MTZBcnJheSBpcyBub3QgYXZhaWxhYmxlLCB1c2UgJ1VpbnQxNkFycmF5JyB0byBzdG9yZSB0aGUgZGF0YS5cbiAgICAgIE5VTUVSSUNfVEVOU09SX1RZUEVfVE9fVFlQRURBUlJBWV9NQVAuc2V0KCdmbG9hdDE2JywgVWludDE2QXJyYXkpO1xuICAgIH1cbiAgfVxufTtcbiIsICIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cblxuaW1wb3J0IHtcbiAgQ3B1UGlubmVkQ29uc3RydWN0b3JQYXJhbWV0ZXJzLFxuICBHcHVCdWZmZXJDb25zdHJ1Y3RvclBhcmFtZXRlcnMsXG4gIE1MVGVuc29yQ29uc3RydWN0b3JQYXJhbWV0ZXJzLFxuICBUZXh0dXJlQ29uc3RydWN0b3JQYXJhbWV0ZXJzLFxufSBmcm9tICcuL3RlbnNvci1mYWN0b3J5LmpzJztcbmltcG9ydCB7IFRlbnNvciB9IGZyb20gJy4vdGVuc29yLWltcGwuanMnO1xuXG4vKipcbiAqIGNhbGN1bGF0ZSBzaXplIGZyb20gZGltcy5cbiAqXG4gKiBAcGFyYW0gZGltcyB0aGUgZGltcyBhcnJheS4gTWF5IGJlIGFuIGlsbGVnYWwgaW5wdXQuXG4gKi9cbmV4cG9ydCBjb25zdCBjYWxjdWxhdGVTaXplID0gKGRpbXM6IHJlYWRvbmx5IHVua25vd25bXSk6IG51bWJlciA9PiB7XG4gIGxldCBzaXplID0gMTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBkaW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgZGltID0gZGltc1tpXTtcbiAgICBpZiAodHlwZW9mIGRpbSAhPT0gJ251bWJlcicgfHwgIU51bWJlci5pc1NhZmVJbnRlZ2VyKGRpbSkpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYGRpbXNbJHtpfV0gbXVzdCBiZSBhbiBpbnRlZ2VyLCBnb3Q6ICR7ZGltfWApO1xuICAgIH1cbiAgICBpZiAoZGltIDwgMCkge1xuICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoYGRpbXNbJHtpfV0gbXVzdCBiZSBhIG5vbi1uZWdhdGl2ZSBpbnRlZ2VyLCBnb3Q6ICR7ZGltfWApO1xuICAgIH1cbiAgICBzaXplICo9IGRpbTtcbiAgfVxuICByZXR1cm4gc2l6ZTtcbn07XG5cbi8qKlxuICogaW1wbGVtZW50YXRpb24gb2YgVGVuc29yLnJlc2hhcGUoKVxuICovXG5leHBvcnQgY29uc3QgdGVuc29yUmVzaGFwZSA9ICh0ZW5zb3I6IFRlbnNvciwgZGltczogcmVhZG9ubHkgbnVtYmVyW10pOiBUZW5zb3IgPT4ge1xuICBzd2l0Y2ggKHRlbnNvci5sb2NhdGlvbikge1xuICAgIGNhc2UgJ2NwdSc6XG4gICAgICByZXR1cm4gbmV3IFRlbnNvcih0ZW5zb3IudHlwZSwgdGVuc29yLmRhdGEsIGRpbXMpO1xuICAgIGNhc2UgJ2NwdS1waW5uZWQnOlxuICAgICAgcmV0dXJuIG5ldyBUZW5zb3Ioe1xuICAgICAgICBsb2NhdGlvbjogJ2NwdS1waW5uZWQnLFxuICAgICAgICBkYXRhOiB0ZW5zb3IuZGF0YSBhcyBDcHVQaW5uZWRDb25zdHJ1Y3RvclBhcmFtZXRlcnNbJ2RhdGEnXSxcbiAgICAgICAgdHlwZTogdGVuc29yLnR5cGUgYXMgQ3B1UGlubmVkQ29uc3RydWN0b3JQYXJhbWV0ZXJzWyd0eXBlJ10sXG4gICAgICAgIGRpbXMsXG4gICAgICB9KTtcbiAgICBjYXNlICd0ZXh0dXJlJzpcbiAgICAgIHJldHVybiBuZXcgVGVuc29yKHtcbiAgICAgICAgbG9jYXRpb246ICd0ZXh0dXJlJyxcbiAgICAgICAgdGV4dHVyZTogdGVuc29yLnRleHR1cmUsXG4gICAgICAgIHR5cGU6IHRlbnNvci50eXBlIGFzIFRleHR1cmVDb25zdHJ1Y3RvclBhcmFtZXRlcnNbJ3R5cGUnXSxcbiAgICAgICAgZGltcyxcbiAgICAgIH0pO1xuICAgIGNhc2UgJ2dwdS1idWZmZXInOlxuICAgICAgcmV0dXJuIG5ldyBUZW5zb3Ioe1xuICAgICAgICBsb2NhdGlvbjogJ2dwdS1idWZmZXInLFxuICAgICAgICBncHVCdWZmZXI6IHRlbnNvci5ncHVCdWZmZXIsXG4gICAgICAgIHR5cGU6IHRlbnNvci50eXBlIGFzIEdwdUJ1ZmZlckNvbnN0cnVjdG9yUGFyYW1ldGVyc1sndHlwZSddLFxuICAgICAgICBkaW1zLFxuICAgICAgfSk7XG4gICAgY2FzZSAnbWwtdGVuc29yJzpcbiAgICAgIHJldHVybiBuZXcgVGVuc29yKHtcbiAgICAgICAgbG9jYXRpb246ICdtbC10ZW5zb3InLFxuICAgICAgICBtbFRlbnNvcjogdGVuc29yLm1sVGVuc29yLFxuICAgICAgICB0eXBlOiB0ZW5zb3IudHlwZSBhcyBNTFRlbnNvckNvbnN0cnVjdG9yUGFyYW1ldGVyc1sndHlwZSddLFxuICAgICAgICBkaW1zLFxuICAgICAgfSk7XG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcihgdGVuc29yUmVzaGFwZTogdGVuc29yIGxvY2F0aW9uICR7dGVuc29yLmxvY2F0aW9ufSBpcyBub3Qgc3VwcG9ydGVkYCk7XG4gIH1cbn07XG4iLCAiLy8gQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG5cbmltcG9ydCB7IHRlbnNvclRvRGF0YVVSTCwgdGVuc29yVG9JbWFnZURhdGEgfSBmcm9tICcuL3RlbnNvci1jb252ZXJzaW9uLWltcGwuanMnO1xuaW1wb3J0IHsgVGVuc29yVG9EYXRhVXJsT3B0aW9ucywgVGVuc29yVG9JbWFnZURhdGFPcHRpb25zIH0gZnJvbSAnLi90ZW5zb3ItY29udmVyc2lvbi5qcyc7XG5pbXBvcnQge1xuICB0ZW5zb3JGcm9tR3B1QnVmZmVyLFxuICB0ZW5zb3JGcm9tSW1hZ2UsXG4gIHRlbnNvckZyb21NTFRlbnNvcixcbiAgdGVuc29yRnJvbVBpbm5lZEJ1ZmZlcixcbiAgdGVuc29yRnJvbVRleHR1cmUsXG59IGZyb20gJy4vdGVuc29yLWZhY3RvcnktaW1wbC5qcyc7XG5pbXBvcnQge1xuICBDcHVQaW5uZWRDb25zdHJ1Y3RvclBhcmFtZXRlcnMsXG4gIEdwdUJ1ZmZlckNvbnN0cnVjdG9yUGFyYW1ldGVycyxcbiAgTUxUZW5zb3JDb25zdHJ1Y3RvclBhcmFtZXRlcnMsXG4gIFRlbnNvckZyb21HcHVCdWZmZXJPcHRpb25zLFxuICBUZW5zb3JGcm9tSW1hZ2VCaXRtYXBPcHRpb25zLFxuICBUZW5zb3JGcm9tSW1hZ2VEYXRhT3B0aW9ucyxcbiAgVGVuc29yRnJvbUltYWdlRWxlbWVudE9wdGlvbnMsXG4gIFRlbnNvckZyb21NTFRlbnNvck9wdGlvbnMsXG4gIFRlbnNvckZyb21UZXh0dXJlT3B0aW9ucyxcbiAgVGVuc29yRnJvbVVybE9wdGlvbnMsXG4gIFRleHR1cmVDb25zdHJ1Y3RvclBhcmFtZXRlcnMsXG59IGZyb20gJy4vdGVuc29yLWZhY3RvcnkuanMnO1xuaW1wb3J0IHtcbiAgY2hlY2tUeXBlZEFycmF5LFxuICBOVU1FUklDX1RFTlNPUl9UWVBFX1RPX1RZUEVEQVJSQVlfTUFQLFxuICBOVU1FUklDX1RFTlNPUl9UWVBFREFSUkFZX1RPX1RZUEVfTUFQLFxuICBTdXBwb3J0ZWRUeXBlZEFycmF5LFxuICBTdXBwb3J0ZWRUeXBlZEFycmF5Q29uc3RydWN0b3JzLFxufSBmcm9tICcuL3RlbnNvci1pbXBsLXR5cGUtbWFwcGluZy5qcyc7XG5pbXBvcnQgeyBjYWxjdWxhdGVTaXplLCB0ZW5zb3JSZXNoYXBlIH0gZnJvbSAnLi90ZW5zb3ItdXRpbHMtaW1wbC5qcyc7XG5pbXBvcnQgeyBUZW5zb3IgYXMgVGVuc29ySW50ZXJmYWNlIH0gZnJvbSAnLi90ZW5zb3IuanMnO1xuXG4vLyB0eXBlIGFsaWFzZXMgZm9yIHRob3NlIGV4cG9ydGVkIGZyb20gVGVuc29yIGludGVyZmFjZVxuXG50eXBlIFRlbnNvclR5cGUgPSBUZW5zb3JJbnRlcmZhY2UuVHlwZTtcbnR5cGUgVGVuc29yRGF0YVR5cGUgPSBUZW5zb3JJbnRlcmZhY2UuRGF0YVR5cGU7XG50eXBlIFRlbnNvckRhdGFMb2NhdGlvbiA9IFRlbnNvckludGVyZmFjZS5EYXRhTG9jYXRpb247XG50eXBlIFRlbnNvclRleHR1cmVUeXBlID0gVGVuc29ySW50ZXJmYWNlLlRleHR1cmVUeXBlO1xudHlwZSBUZW5zb3JHcHVCdWZmZXJUeXBlID0gVGVuc29ySW50ZXJmYWNlLkdwdUJ1ZmZlclR5cGU7XG50eXBlIFRlbnNvck1MVGVuc29yVHlwZSA9IFRlbnNvckludGVyZmFjZS5NTFRlbnNvclR5cGU7XG5cbi8qKlxuICogdGhlIGltcGxlbWVudGF0aW9uIG9mIFRlbnNvciBpbnRlcmZhY2UuXG4gKlxuICogQGlnbm9yZVxuICovXG5leHBvcnQgY2xhc3MgVGVuc29yIGltcGxlbWVudHMgVGVuc29ySW50ZXJmYWNlIHtcbiAgLy8gI3JlZ2lvbiBjb25zdHJ1Y3RvcnNcblxuICAvKipcbiAgICogQ29uc3RydWN0IGEgbmV3IENQVSB0ZW5zb3Igb2JqZWN0IGZyb20gdGhlIGdpdmVuIHR5cGUsIGRhdGEgYW5kIGRpbXMuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICB0eXBlOiBUZW5zb3JUeXBlLFxuICAgIGRhdGE6IFRlbnNvckRhdGFUeXBlIHwgVWludDhDbGFtcGVkQXJyYXkgfCByZWFkb25seSBzdHJpbmdbXSB8IHJlYWRvbmx5IG51bWJlcltdIHwgcmVhZG9ubHkgYm9vbGVhbltdLFxuICAgIGRpbXM/OiByZWFkb25seSBudW1iZXJbXSxcbiAgKTtcbiAgLyoqXG4gICAqIENvbnN0cnVjdCBhIG5ldyBDUFUgdGVuc29yIG9iamVjdCBmcm9tIHRoZSBnaXZlbiBkYXRhIGFuZCBkaW1zLiBUeXBlIGlzIGluZmVycmVkIGZyb20gZGF0YS5cbiAgICovXG4gIGNvbnN0cnVjdG9yKFxuICAgIGRhdGE6IFRlbnNvckRhdGFUeXBlIHwgVWludDhDbGFtcGVkQXJyYXkgfCByZWFkb25seSBzdHJpbmdbXSB8IHJlYWRvbmx5IGJvb2xlYW5bXSxcbiAgICBkaW1zPzogcmVhZG9ubHkgbnVtYmVyW10sXG4gICk7XG4gIC8qKlxuICAgKiBDb25zdHJ1Y3QgYSBuZXcgdGVuc29yIG9iamVjdCBmcm9tIHRoZSBwaW5uZWQgQ1BVIGRhdGEgd2l0aCB0aGUgZ2l2ZW4gdHlwZSBhbmQgZGltcy5cbiAgICpcbiAgICogVGVuc29yJ3MgbG9jYXRpb24gd2lsbCBiZSBzZXQgdG8gJ2NwdS1waW5uZWQnLlxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1zIC0gU3BlY2lmeSB0aGUgcGFyYW1ldGVycyB0byBjb25zdHJ1Y3QgdGhlIHRlbnNvci5cbiAgICovXG4gIGNvbnN0cnVjdG9yKHBhcmFtczogQ3B1UGlubmVkQ29uc3RydWN0b3JQYXJhbWV0ZXJzKTtcbiAgLyoqXG4gICAqIENvbnN0cnVjdCBhIG5ldyB0ZW5zb3Igb2JqZWN0IGZyb20gdGhlIFdlYkdMIHRleHR1cmUgd2l0aCB0aGUgZ2l2ZW4gdHlwZSBhbmQgZGltcy5cbiAgICpcbiAgICogVGVuc29yJ3MgbG9jYXRpb24gd2lsbCBiZSBzZXQgdG8gJ3RleHR1cmUnLlxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1zIC0gU3BlY2lmeSB0aGUgcGFyYW1ldGVycyB0byBjb25zdHJ1Y3QgdGhlIHRlbnNvci5cbiAgICovXG4gIGNvbnN0cnVjdG9yKHBhcmFtczogVGV4dHVyZUNvbnN0cnVjdG9yUGFyYW1ldGVycyk7XG4gIC8qKlxuICAgKiBDb25zdHJ1Y3QgYSBuZXcgdGVuc29yIG9iamVjdCBmcm9tIHRoZSBXZWJHUFUgYnVmZmVyIHdpdGggdGhlIGdpdmVuIHR5cGUgYW5kIGRpbXMuXG4gICAqXG4gICAqIFRlbnNvcidzIGxvY2F0aW9uIHdpbGwgYmUgc2V0IHRvICdncHUtYnVmZmVyJy5cbiAgICpcbiAgICogQHBhcmFtIHBhcmFtcyAtIFNwZWNpZnkgdGhlIHBhcmFtZXRlcnMgdG8gY29uc3RydWN0IHRoZSB0ZW5zb3IuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihwYXJhbXM6IEdwdUJ1ZmZlckNvbnN0cnVjdG9yUGFyYW1ldGVycyk7XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdCBhIG5ldyB0ZW5zb3Igb2JqZWN0IGZyb20gdGhlIFdlYk5OIE1MVGVuc29yIHdpdGggdGhlIGdpdmVuIHR5cGUgYW5kIGRpbXMuXG4gICAqXG4gICAqIFRlbnNvcidzIGxvY2F0aW9uIHdpbGwgYmUgc2V0IHRvICdtbC10ZW5zb3InLlxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1zIC0gU3BlY2lmeSB0aGUgcGFyYW1ldGVycyB0byBjb25zdHJ1Y3QgdGhlIHRlbnNvci5cbiAgICovXG4gIGNvbnN0cnVjdG9yKHBhcmFtczogTUxUZW5zb3JDb25zdHJ1Y3RvclBhcmFtZXRlcnMpO1xuXG4gIC8qKlxuICAgKiBpbXBsZW1lbnRhdGlvbi5cbiAgICovXG4gIGNvbnN0cnVjdG9yKFxuICAgIGFyZzA6XG4gICAgICB8IFRlbnNvclR5cGVcbiAgICAgIHwgVGVuc29yRGF0YVR5cGVcbiAgICAgIHwgVWludDhDbGFtcGVkQXJyYXlcbiAgICAgIHwgcmVhZG9ubHkgc3RyaW5nW11cbiAgICAgIHwgcmVhZG9ubHkgYm9vbGVhbltdXG4gICAgICB8IENwdVBpbm5lZENvbnN0cnVjdG9yUGFyYW1ldGVyc1xuICAgICAgfCBUZXh0dXJlQ29uc3RydWN0b3JQYXJhbWV0ZXJzXG4gICAgICB8IEdwdUJ1ZmZlckNvbnN0cnVjdG9yUGFyYW1ldGVyc1xuICAgICAgfCBNTFRlbnNvckNvbnN0cnVjdG9yUGFyYW1ldGVycyxcbiAgICBhcmcxPzogVGVuc29yRGF0YVR5cGUgfCBVaW50OENsYW1wZWRBcnJheSB8IHJlYWRvbmx5IG51bWJlcltdIHwgcmVhZG9ubHkgc3RyaW5nW10gfCByZWFkb25seSBib29sZWFuW10sXG4gICAgYXJnMj86IHJlYWRvbmx5IG51bWJlcltdLFxuICApIHtcbiAgICAvLyBwZXJmb3JtIG9uZS10aW1lIGNoZWNrIGZvciBCaWdJbnQvRmxvYXQxNkFycmF5IHN1cHBvcnRcbiAgICBjaGVja1R5cGVkQXJyYXkoKTtcblxuICAgIGxldCB0eXBlOiBUZW5zb3JUeXBlO1xuICAgIGxldCBkaW1zOiByZWFkb25seSBudW1iZXJbXTtcblxuICAgIGlmICh0eXBlb2YgYXJnMCA9PT0gJ29iamVjdCcgJiYgJ2xvY2F0aW9uJyBpbiBhcmcwKSB7XG4gICAgICAvL1xuICAgICAgLy8gY29uc3RydWN0aW5nIHRlbnNvciBmcm9tIHNwZWNpZmljIGxvY2F0aW9uXG4gICAgICAvL1xuICAgICAgdGhpcy5kYXRhTG9jYXRpb24gPSBhcmcwLmxvY2F0aW9uO1xuICAgICAgdHlwZSA9IGFyZzAudHlwZTtcbiAgICAgIGRpbXMgPSBhcmcwLmRpbXM7XG4gICAgICBzd2l0Y2ggKGFyZzAubG9jYXRpb24pIHtcbiAgICAgICAgY2FzZSAnY3B1LXBpbm5lZCc6IHtcbiAgICAgICAgICBjb25zdCBleHBlY3RlZFR5cGVkQXJyYXlDb25zdHJ1Y3RvciA9IE5VTUVSSUNfVEVOU09SX1RZUEVfVE9fVFlQRURBUlJBWV9NQVAuZ2V0KHR5cGUpO1xuICAgICAgICAgIGlmICghZXhwZWN0ZWRUeXBlZEFycmF5Q29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYHVuc3VwcG9ydGVkIHR5cGUgXCIke3R5cGV9XCIgdG8gY3JlYXRlIHRlbnNvciBmcm9tIHBpbm5lZCBidWZmZXJgKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCEoYXJnMC5kYXRhIGluc3RhbmNlb2YgZXhwZWN0ZWRUeXBlZEFycmF5Q29uc3RydWN0b3IpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBidWZmZXIgc2hvdWxkIGJlIG9mIHR5cGUgJHtleHBlY3RlZFR5cGVkQXJyYXlDb25zdHJ1Y3Rvci5uYW1lfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLmNwdURhdGEgPSBhcmcwLmRhdGE7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSAndGV4dHVyZSc6IHtcbiAgICAgICAgICBpZiAodHlwZSAhPT0gJ2Zsb2F0MzInKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGB1bnN1cHBvcnRlZCB0eXBlIFwiJHt0eXBlfVwiIHRvIGNyZWF0ZSB0ZW5zb3IgZnJvbSB0ZXh0dXJlYCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuZ3B1VGV4dHVyZURhdGEgPSBhcmcwLnRleHR1cmU7XG4gICAgICAgICAgdGhpcy5kb3dubG9hZGVyID0gYXJnMC5kb3dubG9hZDtcbiAgICAgICAgICB0aGlzLmRpc3Bvc2VyID0gYXJnMC5kaXNwb3NlO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgJ2dwdS1idWZmZXInOiB7XG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgdHlwZSAhPT0gJ2Zsb2F0MzInICYmXG4gICAgICAgICAgICB0eXBlICE9PSAnZmxvYXQxNicgJiZcbiAgICAgICAgICAgIHR5cGUgIT09ICdpbnQzMicgJiZcbiAgICAgICAgICAgIHR5cGUgIT09ICdpbnQ2NCcgJiZcbiAgICAgICAgICAgIHR5cGUgIT09ICd1aW50MzInICYmXG4gICAgICAgICAgICB0eXBlICE9PSAndWludDgnICYmXG4gICAgICAgICAgICB0eXBlICE9PSAnYm9vbCcgJiZcbiAgICAgICAgICAgIHR5cGUgIT09ICd1aW50NCcgJiZcbiAgICAgICAgICAgIHR5cGUgIT09ICdpbnQ0J1xuICAgICAgICAgICkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgdW5zdXBwb3J0ZWQgdHlwZSBcIiR7dHlwZX1cIiB0byBjcmVhdGUgdGVuc29yIGZyb20gZ3B1IGJ1ZmZlcmApO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLmdwdUJ1ZmZlckRhdGEgPSBhcmcwLmdwdUJ1ZmZlcjtcbiAgICAgICAgICB0aGlzLmRvd25sb2FkZXIgPSBhcmcwLmRvd25sb2FkO1xuICAgICAgICAgIHRoaXMuZGlzcG9zZXIgPSBhcmcwLmRpc3Bvc2U7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSAnbWwtdGVuc29yJzoge1xuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIHR5cGUgIT09ICdmbG9hdDMyJyAmJlxuICAgICAgICAgICAgdHlwZSAhPT0gJ2Zsb2F0MTYnICYmXG4gICAgICAgICAgICB0eXBlICE9PSAnaW50MzInICYmXG4gICAgICAgICAgICB0eXBlICE9PSAnaW50NjQnICYmXG4gICAgICAgICAgICB0eXBlICE9PSAndWludDMyJyAmJlxuICAgICAgICAgICAgdHlwZSAhPT0gJ3VpbnQ2NCcgJiZcbiAgICAgICAgICAgIHR5cGUgIT09ICdpbnQ4JyAmJlxuICAgICAgICAgICAgdHlwZSAhPT0gJ3VpbnQ4JyAmJlxuICAgICAgICAgICAgdHlwZSAhPT0gJ2Jvb2wnICYmXG4gICAgICAgICAgICB0eXBlICE9PSAndWludDQnICYmXG4gICAgICAgICAgICB0eXBlICE9PSAnaW50NCdcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYHVuc3VwcG9ydGVkIHR5cGUgXCIke3R5cGV9XCIgdG8gY3JlYXRlIHRlbnNvciBmcm9tIE1MVGVuc29yYCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMubWxUZW5zb3JEYXRhID0gYXJnMC5tbFRlbnNvcjtcbiAgICAgICAgICB0aGlzLmRvd25sb2FkZXIgPSBhcmcwLmRvd25sb2FkO1xuICAgICAgICAgIHRoaXMuZGlzcG9zZXIgPSBhcmcwLmRpc3Bvc2U7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFRlbnNvciBjb25zdHJ1Y3RvcjogdW5zdXBwb3J0ZWQgbG9jYXRpb24gJyR7dGhpcy5kYXRhTG9jYXRpb259J2ApO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvL1xuICAgICAgLy8gY29uc3RydWN0aW5nIHRlbnNvciBvZiBsb2NhdGlvbiAnY3B1J1xuICAgICAgLy9cbiAgICAgIGxldCBkYXRhOiBUZW5zb3JEYXRhVHlwZTtcbiAgICAgIGxldCBtYXliZURpbXM6IHR5cGVvZiBhcmcxIHwgdHlwZW9mIGFyZzI7XG4gICAgICAvLyBjaGVjayB3aGV0aGVyIGFyZzAgaXMgdHlwZSBvciBkYXRhXG4gICAgICBpZiAodHlwZW9mIGFyZzAgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIC8vXG4gICAgICAgIC8vIE92ZXJyaWRlOiBjb25zdHJ1Y3Rvcih0eXBlLCBkYXRhLCAuLi4pXG4gICAgICAgIC8vXG4gICAgICAgIHR5cGUgPSBhcmcwO1xuICAgICAgICBtYXliZURpbXMgPSBhcmcyO1xuICAgICAgICBpZiAoYXJnMCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAvLyBzdHJpbmcgdGVuc29yXG4gICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGFyZzEpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQSBzdHJpbmcgdGVuc29yJ3MgZGF0YSBtdXN0IGJlIGEgc3RyaW5nIGFycmF5LlwiKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gd2UgZG9uJ3QgY2hlY2sgd2hldGhlciBldmVyeSBlbGVtZW50IGluIHRoZSBhcnJheSBpcyBzdHJpbmc7IHRoaXMgaXMgdG9vIHNsb3cuIHdlIGFzc3VtZSBpdCdzIGNvcnJlY3QgYW5kXG4gICAgICAgICAgLy8gZXJyb3Igd2lsbCBiZSBwb3B1bGF0ZWQgYXQgaW5mZXJlbmNlXG4gICAgICAgICAgZGF0YSA9IGFyZzE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gbnVtZXJpYyB0ZW5zb3JcbiAgICAgICAgICBjb25zdCB0eXBlZEFycmF5Q29uc3RydWN0b3IgPSBOVU1FUklDX1RFTlNPUl9UWVBFX1RPX1RZUEVEQVJSQVlfTUFQLmdldChhcmcwKTtcbiAgICAgICAgICBpZiAodHlwZWRBcnJheUNvbnN0cnVjdG9yID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFVuc3VwcG9ydGVkIHRlbnNvciB0eXBlOiAke2FyZzB9LmApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShhcmcxKSkge1xuICAgICAgICAgICAgaWYgKChhcmcwID09PSAnZmxvYXQxNicgJiYgdHlwZWRBcnJheUNvbnN0cnVjdG9yID09PSBVaW50MTZBcnJheSkgfHwgYXJnMCA9PT0gJ3VpbnQ0JyB8fCBhcmcwID09PSAnaW50NCcpIHtcbiAgICAgICAgICAgICAgLy8gLSAnZmxvYXQxNic6XG4gICAgICAgICAgICAgIC8vICAgV2hlbiBubyBGbG9hdDE2QXJyYXkgcG9seWZpbGwgaXMgdXNlZCwgd2UgY2Fubm90IGNyZWF0ZSAnZmxvYXQxNicgdGVuc29yIGZyb20gbnVtYmVyIGFycmF5LlxuICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAvLyAgIFRocm93IGVycm9yIGhlcmUgYmVjYXVzZSB3aGVuIHVzZXIgdHJ5IHRvIHVzZSBudW1iZXIgYXJyYXkgYXMgZGF0YSxcbiAgICAgICAgICAgICAgLy8gICBlLmcuIG5ldyBUZW5zb3IoJ2Zsb2F0MTYnLCBbMSwgMiwgMywgNF0sIGRpbXMpKSwgaXQgd2lsbCBhY3R1YWxseSBjYWxsXG4gICAgICAgICAgICAgIC8vICAgVWludDE2QXJyYXkuZnJvbShhcmcxKSB3aGljaCBnZW5lcmF0ZXMgd3JvbmcgZGF0YS5cbiAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgLy8gLSAndWludDQnIGFuZCAnaW50NCc6XG4gICAgICAgICAgICAgIC8vICAgVWludDhBcnJheS5mcm9tKGFyZzEpIHdpbGwgZ2VuZXJhdGUgd3JvbmcgZGF0YSBmb3IgJ3VpbnQ0JyBhbmQgJ2ludDQnIHRlbnNvci5cbiAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICAgICAgICBgQ3JlYXRpbmcgYSAke2FyZzB9IHRlbnNvciBmcm9tIG51bWJlciBhcnJheSBpcyBub3Qgc3VwcG9ydGVkLiBQbGVhc2UgdXNlICR7dHlwZWRBcnJheUNvbnN0cnVjdG9yLm5hbWV9IGFzIGRhdGEuYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYXJnMCA9PT0gJ3VpbnQ2NCcgfHwgYXJnMCA9PT0gJ2ludDY0Jykge1xuICAgICAgICAgICAgICAvLyB1c2UgJ2FzIGFueScgaGVyZSBiZWNhdXNlOlxuICAgICAgICAgICAgICAvLyAxLiBUeXBlU2NyaXB0J3MgY2hlY2sgb24gdHlwZSBvZiAnQXJyYXkuaXNBcnJheSgpJyBkb2VzIG5vdCB3b3JrIHdpdGggcmVhZG9ubHkgYXJyYXlzLlxuICAgICAgICAgICAgICAvLyBzZWUgaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy8xNzAwMlxuICAgICAgICAgICAgICAvLyAyLiBUeXBlU2NyaXB0J3MgY2hlY2sgb24gdW5pb24gdHlwZSBvZiAnKEJpZ0ludDY0QXJyYXlDb25zdHJ1Y3RvcnxCaWdVaW50NjRBcnJheUNvbnN0cnVjdG9yKS5mcm9tKCknXG4gICAgICAgICAgICAgIC8vIGRvZXMgbm90IGFjY2VwdCBwYXJhbWV0ZXIgbWFwRm4uXG4gICAgICAgICAgICAgIC8vIDMuIHBhcmFtZXRlcnMgb2YgJ1N1cHBvcnRlZFR5cGVkQXJyYXlDb25zdHJ1Y3RvcnMuZnJvbSgpJyBkb2VzIG5vdCBtYXRjaCB0aGUgcmVxdWlyZW1lbnQgb2YgdGhlIHVuaW9uXG4gICAgICAgICAgICAgIC8vIHR5cGUuXG5cbiAgICAgICAgICAgICAgLy8gYXNzdW1lICdhcmcxJyBpcyBvZiB0eXBlIFwicmVhZG9ubHkgbnVtYmVyW118cmVhZG9ubHkgYmlnaW50W11cIiBoZXJlLlxuXG4gICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgICAgICAgICAgIGRhdGEgPSAodHlwZWRBcnJheUNvbnN0cnVjdG9yIGFzIGFueSkuZnJvbShhcmcxLCBCaWdJbnQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gYXNzdW1lICdhcmcxJyBpcyBvZiB0eXBlIFwicmVhZG9ubHkgbnVtYmVyW11cIiBoZXJlLlxuICAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgICAgICAgICBkYXRhID0gKHR5cGVkQXJyYXlDb25zdHJ1Y3RvciBhcyBhbnkpLmZyb20oYXJnMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmIChhcmcxIGluc3RhbmNlb2YgdHlwZWRBcnJheUNvbnN0cnVjdG9yKSB7XG4gICAgICAgICAgICBkYXRhID0gYXJnMTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGFyZzEgaW5zdGFuY2VvZiBVaW50OENsYW1wZWRBcnJheSkge1xuICAgICAgICAgICAgaWYgKGFyZzAgPT09ICd1aW50OCcpIHtcbiAgICAgICAgICAgICAgZGF0YSA9IFVpbnQ4QXJyYXkuZnJvbShhcmcxKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYEEgVWludDhDbGFtcGVkQXJyYXkgdGVuc29yJ3MgZGF0YSBtdXN0IGJlIHR5cGUgb2YgdWludDhgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgaWYgKGFyZzAgPT09ICdmbG9hdDE2JyAmJiBhcmcxIGluc3RhbmNlb2YgVWludDE2QXJyYXkgJiYgdHlwZWRBcnJheUNvbnN0cnVjdG9yICE9PSBVaW50MTZBcnJheSkge1xuICAgICAgICAgICAgLy8gd2hlbiBGbG9hdDE2QXJyYXkgaXMgYXZhaWxhYmxlIGFuZCBkYXRhIGlzIG9mIHR5cGUgVWludDE2QXJyYXkuXG4gICAgICAgICAgICAvLyBXZSBhbGxvdyBVaW50MTZBcnJheSB0byBiZSBwYXNzZWQgaW4gYXMgZGF0YSBmb3IgJ2Zsb2F0MTYnIHRlbnNvciB1bnRpbCBGbG9hdDE2QXJyYXkgaXMgZ2VuZXJhbGx5XG4gICAgICAgICAgICAvLyBzdXBwb3J0ZWQgaW4gSmF2YVNjcmlwdCBlbnZpcm9ubWVudC5cblxuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAgICAgICAgIGRhdGEgPSBuZXcgKGdsb2JhbFRoaXMgYXMgYW55KS5GbG9hdDE2QXJyYXkoYXJnMS5idWZmZXIsIGFyZzEuYnl0ZU9mZnNldCwgYXJnMS5sZW5ndGgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBBICR7dHlwZX0gdGVuc29yJ3MgZGF0YSBtdXN0IGJlIHR5cGUgb2YgJHt0eXBlZEFycmF5Q29uc3RydWN0b3J9YCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvL1xuICAgICAgICAvLyBPdmVycmlkZTogY29uc3RydWN0b3IoZGF0YSwgLi4uKVxuICAgICAgICAvL1xuICAgICAgICBtYXliZURpbXMgPSBhcmcxO1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShhcmcwKSkge1xuICAgICAgICAgIC8vIG9ubHkgYm9vbGVhbltdIGFuZCBzdHJpbmdbXSBpcyBzdXBwb3J0ZWRcbiAgICAgICAgICBpZiAoYXJnMC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RlbnNvciB0eXBlIGNhbm5vdCBiZSBpbmZlcnJlZCBmcm9tIGFuIGVtcHR5IGFycmF5LicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBmaXJzdEVsZW1lbnRUeXBlID0gdHlwZW9mIGFyZzBbMF07XG4gICAgICAgICAgaWYgKGZpcnN0RWxlbWVudFR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB0eXBlID0gJ3N0cmluZyc7XG4gICAgICAgICAgICBkYXRhID0gYXJnMDtcbiAgICAgICAgICB9IGVsc2UgaWYgKGZpcnN0RWxlbWVudFR5cGUgPT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgdHlwZSA9ICdib29sJztcbiAgICAgICAgICAgIC8vICdhcmcwJyBpcyBvZiB0eXBlICdib29sZWFuW10nLiBVaW50OEFycmF5LmZyb20oYm9vbGVhbltdKSBhY3R1YWxseSB3b3JrcywgYnV0IHR5cGVzY3JpcHQgdGhpbmtzIHRoaXMgaXNcbiAgICAgICAgICAgIC8vIHdyb25nIHR5cGUuIFdlIHVzZSAnYXMgYW55JyB0byBtYWtlIGl0IGhhcHB5LlxuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAgICAgICAgIGRhdGEgPSBVaW50OEFycmF5LmZyb20oYXJnMCBhcyBhbnlbXSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYEludmFsaWQgZWxlbWVudCB0eXBlIG9mIGRhdGEgYXJyYXk6ICR7Zmlyc3RFbGVtZW50VHlwZX0uYCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGFyZzAgaW5zdGFuY2VvZiBVaW50OENsYW1wZWRBcnJheSkge1xuICAgICAgICAgIHR5cGUgPSAndWludDgnO1xuICAgICAgICAgIGRhdGEgPSBVaW50OEFycmF5LmZyb20oYXJnMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gZ2V0IHRlbnNvciB0eXBlIGZyb20gVHlwZWRBcnJheVxuICAgICAgICAgIGNvbnN0IG1hcHBlZFR5cGUgPSBOVU1FUklDX1RFTlNPUl9UWVBFREFSUkFZX1RPX1RZUEVfTUFQLmdldChcbiAgICAgICAgICAgIGFyZzAuY29uc3RydWN0b3IgYXMgU3VwcG9ydGVkVHlwZWRBcnJheUNvbnN0cnVjdG9ycyxcbiAgICAgICAgICApO1xuICAgICAgICAgIGlmIChtYXBwZWRUeXBlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFVuc3VwcG9ydGVkIHR5cGUgZm9yIHRlbnNvciBkYXRhOiAke2FyZzAuY29uc3RydWN0b3J9LmApO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0eXBlID0gbWFwcGVkVHlwZTtcbiAgICAgICAgICBkYXRhID0gYXJnMCBhcyBTdXBwb3J0ZWRUeXBlZEFycmF5O1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIHR5cGUgYW5kIGRhdGEgaXMgcHJvY2Vzc2VkLCBub3cgcHJvY2Vzc2luZyBkaW1zXG4gICAgICBpZiAobWF5YmVEaW1zID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gYXNzdW1lIDEtRCB0ZW5zb3IgaWYgZGltcyBvbWl0dGVkXG4gICAgICAgIG1heWJlRGltcyA9IFtkYXRhLmxlbmd0aF07XG4gICAgICB9IGVsc2UgaWYgKCFBcnJheS5pc0FycmF5KG1heWJlRGltcykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkEgdGVuc29yJ3MgZGltcyBtdXN0IGJlIGEgbnVtYmVyIGFycmF5XCIpO1xuICAgICAgfVxuICAgICAgZGltcyA9IG1heWJlRGltcyBhcyByZWFkb25seSBudW1iZXJbXTtcblxuICAgICAgdGhpcy5jcHVEYXRhID0gZGF0YTtcbiAgICAgIHRoaXMuZGF0YUxvY2F0aW9uID0gJ2NwdSc7XG4gICAgfVxuXG4gICAgLy8gcGVyZm9ybSBjaGVjayBvbiBkaW1zXG4gICAgY29uc3Qgc2l6ZSA9IGNhbGN1bGF0ZVNpemUoZGltcyk7XG4gICAgLy8gaWYgZGF0YSBpcyBvbiBDUFUsIGNoZWNrIHdoZXRoZXIgZGF0YSBsZW5ndGggbWF0Y2hlcyB0ZW5zb3Igc2l6ZVxuICAgIGlmICh0aGlzLmNwdURhdGEgJiYgc2l6ZSAhPT0gdGhpcy5jcHVEYXRhLmxlbmd0aCkge1xuICAgICAgaWYgKCh0eXBlID09PSAndWludDQnIHx8IHR5cGUgPT09ICdpbnQ0JykgJiYgTWF0aC5jZWlsKHNpemUgLyAyKSA9PT0gdGhpcy5jcHVEYXRhLmxlbmd0aCkge1xuICAgICAgICAvLyBmb3IgKHUpaW50NCwgdGhlIGRhdGEgbGVuZ3RoIGlzIGhhbGYgb2YgdGhlIHRlbnNvciBzaXplLiBTbyB3ZSBjaGVjayB0aGlzIHNwZWNpYWwgY2FzZSB3aGVuIHNpemUgaXMgb2RkLlxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUZW5zb3IncyBzaXplKCR7c2l6ZX0pIGRvZXMgbm90IG1hdGNoIGRhdGEgbGVuZ3RoKCR7dGhpcy5jcHVEYXRhLmxlbmd0aH0pLmApO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMudHlwZSA9IHR5cGU7XG4gICAgdGhpcy5kaW1zID0gZGltcztcbiAgICB0aGlzLnNpemUgPSBzaXplO1xuICB9XG4gIC8vICNlbmRyZWdpb25cblxuICAvLyAjcmVnaW9uIGZhY3RvcnlcbiAgc3RhdGljIGFzeW5jIGZyb21JbWFnZShcbiAgICBpbWFnZTogSW1hZ2VEYXRhIHwgSFRNTEltYWdlRWxlbWVudCB8IEltYWdlQml0bWFwIHwgc3RyaW5nLFxuICAgIG9wdGlvbnM/OlxuICAgICAgfCBUZW5zb3JGcm9tSW1hZ2VEYXRhT3B0aW9uc1xuICAgICAgfCBUZW5zb3JGcm9tSW1hZ2VFbGVtZW50T3B0aW9uc1xuICAgICAgfCBUZW5zb3JGcm9tSW1hZ2VCaXRtYXBPcHRpb25zXG4gICAgICB8IFRlbnNvckZyb21VcmxPcHRpb25zLFxuICApOiBQcm9taXNlPFRlbnNvckludGVyZmFjZT4ge1xuICAgIHJldHVybiB0ZW5zb3JGcm9tSW1hZ2UoaW1hZ2UsIG9wdGlvbnMpO1xuICB9XG5cbiAgc3RhdGljIGZyb21UZXh0dXJlPFQgZXh0ZW5kcyBUZW5zb3JJbnRlcmZhY2UuVGV4dHVyZURhdGFUeXBlcz4oXG4gICAgdGV4dHVyZTogVGVuc29yVGV4dHVyZVR5cGUsXG4gICAgb3B0aW9uczogVGVuc29yRnJvbVRleHR1cmVPcHRpb25zPFQ+LFxuICApOiBUZW5zb3JJbnRlcmZhY2Uge1xuICAgIHJldHVybiB0ZW5zb3JGcm9tVGV4dHVyZSh0ZXh0dXJlLCBvcHRpb25zKTtcbiAgfVxuXG4gIHN0YXRpYyBmcm9tR3B1QnVmZmVyPFQgZXh0ZW5kcyBUZW5zb3JJbnRlcmZhY2UuR3B1QnVmZmVyRGF0YVR5cGVzPihcbiAgICBncHVCdWZmZXI6IFRlbnNvckdwdUJ1ZmZlclR5cGUsXG4gICAgb3B0aW9uczogVGVuc29yRnJvbUdwdUJ1ZmZlck9wdGlvbnM8VD4sXG4gICk6IFRlbnNvckludGVyZmFjZSB7XG4gICAgcmV0dXJuIHRlbnNvckZyb21HcHVCdWZmZXIoZ3B1QnVmZmVyLCBvcHRpb25zKTtcbiAgfVxuXG4gIHN0YXRpYyBmcm9tTUxUZW5zb3I8VCBleHRlbmRzIFRlbnNvckludGVyZmFjZS5NTFRlbnNvckRhdGFUeXBlcz4oXG4gICAgbWxUZW5zb3I6IFRlbnNvck1MVGVuc29yVHlwZSxcbiAgICBvcHRpb25zOiBUZW5zb3JGcm9tTUxUZW5zb3JPcHRpb25zPFQ+LFxuICApOiBUZW5zb3JJbnRlcmZhY2Uge1xuICAgIHJldHVybiB0ZW5zb3JGcm9tTUxUZW5zb3IobWxUZW5zb3IsIG9wdGlvbnMpO1xuICB9XG5cbiAgc3RhdGljIGZyb21QaW5uZWRCdWZmZXI8VCBleHRlbmRzIFRlbnNvckludGVyZmFjZS5DcHVQaW5uZWREYXRhVHlwZXM+KFxuICAgIHR5cGU6IFQsXG4gICAgYnVmZmVyOiBUZW5zb3JJbnRlcmZhY2UuRGF0YVR5cGVNYXBbVF0sXG4gICAgZGltcz86IHJlYWRvbmx5IG51bWJlcltdLFxuICApOiBUZW5zb3Ige1xuICAgIHJldHVybiB0ZW5zb3JGcm9tUGlubmVkQnVmZmVyKHR5cGUsIGJ1ZmZlciwgZGltcyk7XG4gIH1cblxuICAvLyAjZW5kcmVnaW9uXG5cbiAgLy8gI3JlZ2lvbiBjb252ZXJzaW9uc1xuICB0b0RhdGFVUkwob3B0aW9ucz86IFRlbnNvclRvRGF0YVVybE9wdGlvbnMpOiBzdHJpbmcge1xuICAgIHJldHVybiB0ZW5zb3JUb0RhdGFVUkwodGhpcywgb3B0aW9ucyk7XG4gIH1cblxuICB0b0ltYWdlRGF0YShvcHRpb25zPzogVGVuc29yVG9JbWFnZURhdGFPcHRpb25zKTogSW1hZ2VEYXRhIHtcbiAgICByZXR1cm4gdGVuc29yVG9JbWFnZURhdGEodGhpcywgb3B0aW9ucyk7XG4gIH1cbiAgLy8gI2VuZHJlZ2lvblxuXG4gIC8vICNyZWdpb24gcHVibGljIGZpZWxkc1xuICByZWFkb25seSBkaW1zOiByZWFkb25seSBudW1iZXJbXTtcbiAgcmVhZG9ubHkgdHlwZTogVGVuc29yVHlwZTtcbiAgcmVhZG9ubHkgc2l6ZTogbnVtYmVyO1xuICAvLyAjZW5kcmVnaW9uXG5cbiAgLy8gI3JlZ2lvbiBwcml2YXRlIGZpZWxkc1xuXG4gIC8qKlxuICAgKiBzdG9yZXMgdGhlIGxvY2F0aW9uIG9mIHRoZSBkYXRhLlxuICAgKi9cbiAgcHJpdmF0ZSBkYXRhTG9jYXRpb246IFRlbnNvckRhdGFMb2NhdGlvbjtcblxuICAvKipcbiAgICogc3RvcmVzIHRoZSBkYXRhIG9uIENQVSwgaWYgbG9jYXRpb24gaXMgJ2NwdScgb3IgJ2NwdS1waW5uZWQnLiBvdGhlcndpc2UgZW1wdHkuXG4gICAqL1xuICBwcml2YXRlIGNwdURhdGE/OiBUZW5zb3JEYXRhVHlwZTtcblxuICAvKipcbiAgICogc3RvcmVzIHRoZSB1bmRlcmx5aW5nIHRleHR1cmUgd2hlbiBsb2NhdGlvbiBpcyAndGV4dHVyZScuIG90aGVyd2lzZSBlbXB0eS5cbiAgICovXG4gIHByaXZhdGUgZ3B1VGV4dHVyZURhdGE/OiBUZW5zb3JUZXh0dXJlVHlwZTtcblxuICAvKipcbiAgICogc3RvcmVzIHRoZSB1bmRlcmx5aW5nIEdQVSBidWZmZXIgd2hlbiBsb2NhdGlvbiBpcyAnZ3B1LWJ1ZmZlcicuIG90aGVyd2lzZSBlbXB0eS5cbiAgICovXG4gIHByaXZhdGUgZ3B1QnVmZmVyRGF0YT86IFRlbnNvckdwdUJ1ZmZlclR5cGU7XG5cbiAgLyoqXG4gICAqIHN0b3JlcyB0aGUgdW5kZXJseWluZyBXZWJOTiBNTFRlbnNvciB3aGVuIGxvY2F0aW9uIGlzICdtbC10ZW5zb3InLiBvdGhlcndpc2UgZW1wdHkuXG4gICAqL1xuICBwcml2YXRlIG1sVGVuc29yRGF0YT86IFRlbnNvck1MVGVuc29yVHlwZTtcblxuICAvKipcbiAgICogc3RvcmVzIGFuIG9wdGlvbmFsIGRvd25sb2FkZXIgZnVuY3Rpb24gdG8gZG93bmxvYWQgZGF0YSBmcm9tIEdQVSB0byBDUFUuXG4gICAqL1xuICBwcml2YXRlIGRvd25sb2FkZXI/KCk6IFByb21pc2U8VGVuc29yRGF0YVR5cGU+O1xuXG4gIC8qKlxuICAgKiBhIGZsYWcgaW5kaWNhdGluZyB3aGV0aGVyIHRoZSBkYXRhIGlzIGJlaW5nIGRvd25sb2FkZWQgZnJvbSBHUFUgdG8gQ1BVLlxuICAgKi9cbiAgcHJpdmF0ZSBpc0Rvd25sb2FkaW5nPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogc3RvcmVzIGFuIG9wdGlvbmFsIGRpc3Bvc2VyIGZ1bmN0aW9uIHRvIGRpc3Bvc2UgdGhlIHVuZGVybHlpbmcgZGF0YS5cbiAgICovXG4gIHByaXZhdGUgZGlzcG9zZXI/KCk6IHZvaWQ7XG4gIC8vICNlbmRyZWdpb25cblxuICAvLyAjcmVnaW9uIHByb3BlcnRpZXNcbiAgZ2V0IGRhdGEoKTogVGVuc29yRGF0YVR5cGUge1xuICAgIHRoaXMuZW5zdXJlVmFsaWQoKTtcbiAgICBpZiAoIXRoaXMuY3B1RGF0YSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnVGhlIGRhdGEgaXMgbm90IG9uIENQVS4gVXNlIGBnZXREYXRhKClgIHRvIGRvd25sb2FkIEdQVSBkYXRhIHRvIENQVSwgJyArXG4gICAgICAgICAgJ29yIHVzZSBgdGV4dHVyZWAgb3IgYGdwdUJ1ZmZlcmAgcHJvcGVydHkgdG8gYWNjZXNzIHRoZSBHUFUgZGF0YSBkaXJlY3RseS4nLFxuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuY3B1RGF0YTtcbiAgfVxuXG4gIGdldCBsb2NhdGlvbigpOiBUZW5zb3JEYXRhTG9jYXRpb24ge1xuICAgIHJldHVybiB0aGlzLmRhdGFMb2NhdGlvbjtcbiAgfVxuXG4gIGdldCB0ZXh0dXJlKCk6IFRlbnNvclRleHR1cmVUeXBlIHtcbiAgICB0aGlzLmVuc3VyZVZhbGlkKCk7XG4gICAgaWYgKCF0aGlzLmdwdVRleHR1cmVEYXRhKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBkYXRhIGlzIG5vdCBzdG9yZWQgYXMgYSBXZWJHTCB0ZXh0dXJlLicpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5ncHVUZXh0dXJlRGF0YTtcbiAgfVxuXG4gIGdldCBncHVCdWZmZXIoKTogVGVuc29yR3B1QnVmZmVyVHlwZSB7XG4gICAgdGhpcy5lbnN1cmVWYWxpZCgpO1xuICAgIGlmICghdGhpcy5ncHVCdWZmZXJEYXRhKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBkYXRhIGlzIG5vdCBzdG9yZWQgYXMgYSBXZWJHUFUgYnVmZmVyLicpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5ncHVCdWZmZXJEYXRhO1xuICB9XG5cbiAgZ2V0IG1sVGVuc29yKCk6IFRlbnNvck1MVGVuc29yVHlwZSB7XG4gICAgdGhpcy5lbnN1cmVWYWxpZCgpO1xuICAgIGlmICghdGhpcy5tbFRlbnNvckRhdGEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVGhlIGRhdGEgaXMgbm90IHN0b3JlZCBhcyBhIFdlYk5OIE1MVGVuc29yLicpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5tbFRlbnNvckRhdGE7XG4gIH1cbiAgLy8gI2VuZHJlZ2lvblxuXG4gIC8vICNyZWdpb24gbWV0aG9kc1xuXG4gIGFzeW5jIGdldERhdGEocmVsZWFzZURhdGE/OiBib29sZWFuKTogUHJvbWlzZTxUZW5zb3JEYXRhVHlwZT4ge1xuICAgIHRoaXMuZW5zdXJlVmFsaWQoKTtcbiAgICBzd2l0Y2ggKHRoaXMuZGF0YUxvY2F0aW9uKSB7XG4gICAgICBjYXNlICdjcHUnOlxuICAgICAgY2FzZSAnY3B1LXBpbm5lZCc6XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGE7XG4gICAgICBjYXNlICd0ZXh0dXJlJzpcbiAgICAgIGNhc2UgJ2dwdS1idWZmZXInOlxuICAgICAgY2FzZSAnbWwtdGVuc29yJzoge1xuICAgICAgICBpZiAoIXRoaXMuZG93bmxvYWRlcikge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVGhlIGN1cnJlbnQgdGVuc29yIGlzIG5vdCBjcmVhdGVkIHdpdGggYSBzcGVjaWZpZWQgZGF0YSBkb3dubG9hZGVyLicpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmlzRG93bmxvYWRpbmcpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBjdXJyZW50IHRlbnNvciBpcyBiZWluZyBkb3dubG9hZGVkLicpO1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdGhpcy5pc0Rvd25sb2FkaW5nID0gdHJ1ZTtcbiAgICAgICAgICBjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5kb3dubG9hZGVyKCk7XG4gICAgICAgICAgdGhpcy5kb3dubG9hZGVyID0gdW5kZWZpbmVkO1xuICAgICAgICAgIHRoaXMuZGF0YUxvY2F0aW9uID0gJ2NwdSc7XG4gICAgICAgICAgdGhpcy5jcHVEYXRhID0gZGF0YTtcblxuICAgICAgICAgIGlmIChyZWxlYXNlRGF0YSAmJiB0aGlzLmRpc3Bvc2VyKSB7XG4gICAgICAgICAgICB0aGlzLmRpc3Bvc2VyKCk7XG4gICAgICAgICAgICB0aGlzLmRpc3Bvc2VyID0gdW5kZWZpbmVkO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgIHRoaXMuaXNEb3dubG9hZGluZyA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGNhbm5vdCBnZXQgZGF0YSBmcm9tIGxvY2F0aW9uOiAke3RoaXMuZGF0YUxvY2F0aW9ufWApO1xuICAgIH1cbiAgfVxuXG4gIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaXNEb3dubG9hZGluZykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgY3VycmVudCB0ZW5zb3IgaXMgYmVpbmcgZG93bmxvYWRlZC4nKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5kaXNwb3Nlcikge1xuICAgICAgdGhpcy5kaXNwb3NlcigpO1xuICAgICAgdGhpcy5kaXNwb3NlciA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdGhpcy5jcHVEYXRhID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuZ3B1VGV4dHVyZURhdGEgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5ncHVCdWZmZXJEYXRhID0gdW5kZWZpbmVkO1xuICAgIHRoaXMubWxUZW5zb3JEYXRhID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuZG93bmxvYWRlciA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLmlzRG93bmxvYWRpbmcgPSB1bmRlZmluZWQ7XG5cbiAgICB0aGlzLmRhdGFMb2NhdGlvbiA9ICdub25lJztcbiAgfVxuXG4gIC8vICNlbmRyZWdpb25cblxuICAvLyAjcmVnaW9uIHRlbnNvciB1dGlsaXRpZXNcbiAgcHJpdmF0ZSBlbnN1cmVWYWxpZCgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5kYXRhTG9jYXRpb24gPT09ICdub25lJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgdGVuc29yIGlzIGRpc3Bvc2VkLicpO1xuICAgIH1cbiAgfVxuXG4gIHJlc2hhcGUoZGltczogcmVhZG9ubHkgbnVtYmVyW10pOiBUZW5zb3JJbnRlcmZhY2Uge1xuICAgIHRoaXMuZW5zdXJlVmFsaWQoKTtcbiAgICBpZiAodGhpcy5kb3dubG9hZGVyIHx8IHRoaXMuZGlzcG9zZXIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IHJlc2hhcGUgYSB0ZW5zb3IgdGhhdCBvd25zIEdQVSByZXNvdXJjZS4nKTtcbiAgICB9XG4gICAgcmV0dXJuIHRlbnNvclJlc2hhcGUodGhpcywgZGltcyk7XG4gIH1cbiAgLy8gI2VuZHJlZ2lvblxufVxuIiwgIi8vIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuXG5pbXBvcnQgeyBUZW5zb3JGYWN0b3J5IH0gZnJvbSAnLi90ZW5zb3ItZmFjdG9yeS5qcyc7XG5pbXBvcnQgeyBUZW5zb3IgYXMgVGVuc29ySW1wbCB9IGZyb20gJy4vdGVuc29yLWltcGwuanMnO1xuaW1wb3J0IHsgVHlwZWRUZW5zb3JVdGlscyB9IGZyb20gJy4vdGVuc29yLXV0aWxzLmpzJztcbmltcG9ydCB7IFRyeUdldEdsb2JhbFR5cGUgfSBmcm9tICcuL3R5cGUtaGVscGVyLmpzJztcblxuLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXJlZGVjbGFyZSAqL1xuXG4vKipcbiAqIHJlcHJlc2VudCBhIGJhc2ljIHRlbnNvciB3aXRoIHNwZWNpZmllZCBkaW1lbnNpb25zIGFuZCBkYXRhIHR5cGUuXG4gKi9cbmludGVyZmFjZSBUeXBlZFRlbnNvckJhc2U8VCBleHRlbmRzIFRlbnNvci5UeXBlPiB7XG4gIC8qKlxuICAgKiBHZXQgdGhlIGRpbWVuc2lvbnMgb2YgdGhlIHRlbnNvci5cbiAgICovXG4gIHJlYWRvbmx5IGRpbXM6IHJlYWRvbmx5IG51bWJlcltdO1xuICAvKipcbiAgICogR2V0IHRoZSBkYXRhIHR5cGUgb2YgdGhlIHRlbnNvci5cbiAgICovXG4gIHJlYWRvbmx5IHR5cGU6IFQ7XG4gIC8qKlxuICAgKiBHZXQgdGhlIGJ1ZmZlciBkYXRhIG9mIHRoZSB0ZW5zb3IuXG4gICAqXG4gICAqIElmIHRoZSBkYXRhIGlzIG5vdCBvbiBDUFUgKGVnLiBpdCdzIGluIHRoZSBmb3JtIG9mIFdlYkdMIHRleHR1cmUgb3IgV2ViR1BVIGJ1ZmZlciksIHRocm93IGVycm9yLlxuICAgKi9cbiAgcmVhZG9ubHkgZGF0YTogVGVuc29yLkRhdGFUeXBlTWFwW1RdO1xuICAvKipcbiAgICogR2V0IHRoZSBsb2NhdGlvbiBvZiB0aGUgZGF0YS5cbiAgICovXG4gIHJlYWRvbmx5IGxvY2F0aW9uOiBUZW5zb3IuRGF0YUxvY2F0aW9uO1xuICAvKipcbiAgICogR2V0IHRoZSBXZWJHTCB0ZXh0dXJlIHRoYXQgaG9sZHMgdGhlIHRlbnNvciBkYXRhLlxuICAgKlxuICAgKiBJZiB0aGUgZGF0YSBpcyBub3Qgb24gR1BVIGFzIFdlYkdMIHRleHR1cmUsIHRocm93IGVycm9yLlxuICAgKi9cbiAgcmVhZG9ubHkgdGV4dHVyZTogVGVuc29yLlRleHR1cmVUeXBlO1xuICAvKipcbiAgICogR2V0IHRoZSBXZWJHUFUgYnVmZmVyIHRoYXQgaG9sZHMgdGhlIHRlbnNvciBkYXRhLlxuICAgKlxuICAgKiBJZiB0aGUgZGF0YSBpcyBub3Qgb24gR1BVIGFzIFdlYkdQVSBidWZmZXIsIHRocm93IGVycm9yLlxuICAgKi9cbiAgcmVhZG9ubHkgZ3B1QnVmZmVyOiBUZW5zb3IuR3B1QnVmZmVyVHlwZTtcblxuICAvKipcbiAgICogR2V0IHRoZSBXZWJOTiBNTFRlbnNvciB0aGF0IGhvbGRzIHRoZSB0ZW5zb3IgZGF0YS5cbiAgICpcbiAgICogSWYgdGhlIGRhdGEgaXMgbm90IGluIGEgV2ViTk4gTUxUZW5zb3IsIHRocm93IGVycm9yLlxuICAgKi9cbiAgcmVhZG9ubHkgbWxUZW5zb3I6IFRlbnNvci5NTFRlbnNvclR5cGU7XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgYnVmZmVyIGRhdGEgb2YgdGhlIHRlbnNvci5cbiAgICpcbiAgICogSWYgdGhlIGRhdGEgaXMgb24gQ1BVLCByZXR1cm5zIHRoZSBkYXRhIGltbWVkaWF0ZWx5LlxuICAgKiBJZiB0aGUgZGF0YSBpcyBvbiBHUFUsIGRvd25sb2FkcyB0aGUgZGF0YSBhbmQgcmV0dXJucyB0aGUgcHJvbWlzZS5cbiAgICpcbiAgICogQHBhcmFtIHJlbGVhc2VEYXRhIC0gd2hldGhlciByZWxlYXNlIHRoZSBkYXRhIG9uIEdQVS4gSWdub3JlIGlmIGRhdGEgaXMgYWxyZWFkeSBvbiBDUFUuXG4gICAqL1xuICBnZXREYXRhKHJlbGVhc2VEYXRhPzogYm9vbGVhbik6IFByb21pc2U8VGVuc29yLkRhdGFUeXBlTWFwW1RdPjtcblxuICAvKipcbiAgICogRGlzcG9zZSB0aGUgdGVuc29yIGRhdGEuXG4gICAqXG4gICAqIElmIHRoZSBkYXRhIGlzIG9uIENQVSwgcmVtb3ZlIGl0cyBpbnRlcm5hbCByZWZlcmVuY2UgdG8gdGhlIHVuZGVybHlpbmcgZGF0YS5cbiAgICogSWYgdGhlIGRhdGEgaXMgb24gR1BVLCByZWxlYXNlIHRoZSBkYXRhIG9uIEdQVS5cbiAgICpcbiAgICogQWZ0ZXIgY2FsbGluZyB0aGlzIGZ1bmN0aW9uLCB0aGUgdGVuc29yIGlzIGNvbnNpZGVyZWQgbm8gbG9uZ2VyIHZhbGlkLiBJdHMgbG9jYXRpb24gd2lsbCBiZSBzZXQgdG8gJ25vbmUnLlxuICAgKi9cbiAgZGlzcG9zZSgpOiB2b2lkO1xufVxuXG5leHBvcnQgZGVjbGFyZSBuYW1lc3BhY2UgVGVuc29yIHtcbiAgaW50ZXJmYWNlIERhdGFUeXBlTWFwIHtcbiAgICBmbG9hdDMyOiBGbG9hdDMyQXJyYXk7XG4gICAgdWludDg6IFVpbnQ4QXJyYXk7XG4gICAgaW50ODogSW50OEFycmF5O1xuICAgIHVpbnQxNjogVWludDE2QXJyYXk7XG4gICAgaW50MTY6IEludDE2QXJyYXk7XG4gICAgaW50MzI6IEludDMyQXJyYXk7XG4gICAgaW50NjQ6IEJpZ0ludDY0QXJyYXk7XG4gICAgc3RyaW5nOiBzdHJpbmdbXTtcbiAgICBib29sOiBVaW50OEFycmF5O1xuICAgIGZsb2F0MTY6IFVpbnQxNkFycmF5OyAvLyBLZWVwIHVzaW5nIFVpbnQxNkFycmF5IHVudGlsIHdlIGhhdmUgYSBjb25jcmV0ZSBzb2x1dGlvbiBmb3IgZmxvYXQgMTYuXG4gICAgZmxvYXQ2NDogRmxvYXQ2NEFycmF5O1xuICAgIHVpbnQzMjogVWludDMyQXJyYXk7XG4gICAgdWludDY0OiBCaWdVaW50NjRBcnJheTtcbiAgICAvLyBjb21wbGV4NjQ6IG5ldmVyO1xuICAgIC8vIGNvbXBsZXgxMjg6IG5ldmVyO1xuICAgIC8vIGJmbG9hdDE2OiBuZXZlcjtcbiAgICB1aW50NDogVWludDhBcnJheTtcbiAgICBpbnQ0OiBJbnQ4QXJyYXk7XG4gIH1cblxuICBpbnRlcmZhY2UgRWxlbWVudFR5cGVNYXAge1xuICAgIGZsb2F0MzI6IG51bWJlcjtcbiAgICB1aW50ODogbnVtYmVyO1xuICAgIGludDg6IG51bWJlcjtcbiAgICB1aW50MTY6IG51bWJlcjtcbiAgICBpbnQxNjogbnVtYmVyO1xuICAgIGludDMyOiBudW1iZXI7XG4gICAgaW50NjQ6IGJpZ2ludDtcbiAgICBzdHJpbmc6IHN0cmluZztcbiAgICBib29sOiBib29sZWFuO1xuICAgIGZsb2F0MTY6IG51bWJlcjsgLy8gS2VlcCB1c2luZyBVaW50MTZBcnJheSB1bnRpbCB3ZSBoYXZlIGEgY29uY3JldGUgc29sdXRpb24gZm9yIGZsb2F0IDE2LlxuICAgIGZsb2F0NjQ6IG51bWJlcjtcbiAgICB1aW50MzI6IG51bWJlcjtcbiAgICB1aW50NjQ6IGJpZ2ludDtcbiAgICAvLyBjb21wbGV4NjQ6IG5ldmVyO1xuICAgIC8vIGNvbXBsZXgxMjg6IG5ldmVyO1xuICAgIC8vIGJmbG9hdDE2OiBuZXZlcjtcbiAgICB1aW50NDogbnVtYmVyO1xuICAgIGludDQ6IG51bWJlcjtcbiAgfVxuXG4gIHR5cGUgRGF0YVR5cGUgPSBEYXRhVHlwZU1hcFtUeXBlXTtcbiAgdHlwZSBFbGVtZW50VHlwZSA9IEVsZW1lbnRUeXBlTWFwW1R5cGVdO1xuXG4gIC8qKlxuICAgKiBzdXBwb3J0ZWQgZGF0YSB0eXBlcyBmb3IgY29uc3RydWN0aW5nIGEgdGVuc29yIGZyb20gYSBwaW5uZWQgQ1BVIGJ1ZmZlclxuICAgKi9cbiAgZXhwb3J0IHR5cGUgQ3B1UGlubmVkRGF0YVR5cGVzID0gRXhjbHVkZTxUZW5zb3IuVHlwZSwgJ3N0cmluZyc+O1xuXG4gIC8qKlxuICAgKiB0eXBlIGFsaWFzIGZvciBXZWJHTCB0ZXh0dXJlXG4gICAqL1xuICBleHBvcnQgdHlwZSBUZXh0dXJlVHlwZSA9IFdlYkdMVGV4dHVyZTtcblxuICAvKipcbiAgICogc3VwcG9ydGVkIGRhdGEgdHlwZXMgZm9yIGNvbnN0cnVjdGluZyBhIHRlbnNvciBmcm9tIGEgV2ViR0wgdGV4dHVyZVxuICAgKi9cbiAgZXhwb3J0IHR5cGUgVGV4dHVyZURhdGFUeXBlcyA9ICdmbG9hdDMyJztcblxuICB0eXBlIEdwdUJ1ZmZlclR5cGVGYWxsYmFjayA9IHsgc2l6ZTogbnVtYmVyOyBtYXBTdGF0ZTogJ3VubWFwcGVkJyB8ICdwZW5kaW5nJyB8ICdtYXBwZWQnIH07XG4gIC8qKlxuICAgKiB0eXBlIGFsaWFzIGZvciBXZWJHUFUgYnVmZmVyXG4gICAqL1xuICBleHBvcnQgdHlwZSBHcHVCdWZmZXJUeXBlID0gVHJ5R2V0R2xvYmFsVHlwZTwnR1BVQnVmZmVyJywgR3B1QnVmZmVyVHlwZUZhbGxiYWNrPjtcblxuICB0eXBlIE1MVGVuc29yVHlwZUZhbGxiYWNrID0geyBkZXN0cm95KCk6IHZvaWQgfTtcbiAgLyoqXG4gICAqIHR5cGUgYWxpYXMgZm9yIFdlYk5OIE1MVGVuc29yXG4gICAqXG4gICAqIFRoZSBzcGVjaWZpY2F0aW9uIGZvciBXZWJOTidzIE1MVGVuc29yIGlzIGN1cnJlbnRseSBpbiBmbHV4LlxuICAgKi9cbiAgZXhwb3J0IHR5cGUgTUxUZW5zb3JUeXBlID0gVHJ5R2V0R2xvYmFsVHlwZTwnTUxUZW5zb3InLCBNTFRlbnNvclR5cGVGYWxsYmFjaz47XG5cbiAgLyoqXG4gICAqIHN1cHBvcnRlZCBkYXRhIHR5cGVzIGZvciBjb25zdHJ1Y3RpbmcgYSB0ZW5zb3IgZnJvbSBhIFdlYkdQVSBidWZmZXJcbiAgICovXG4gIGV4cG9ydCB0eXBlIEdwdUJ1ZmZlckRhdGFUeXBlcyA9ICdmbG9hdDMyJyB8ICdmbG9hdDE2JyB8ICdpbnQzMicgfCAnaW50NjQnIHwgJ3VpbnQzMicgfCAndWludDgnIHwgJ2Jvb2wnO1xuXG4gIC8qKlxuICAgKiBzdXBwb3J0ZWQgZGF0YSB0eXBlcyBmb3IgY29uc3RydWN0aW5nIGEgdGVuc29yIGZyb20gYSBXZWJOTiBNTFRlbnNvclxuICAgKi9cbiAgZXhwb3J0IHR5cGUgTUxUZW5zb3JEYXRhVHlwZXMgPVxuICAgIHwgJ2Zsb2F0MzInXG4gICAgfCAnZmxvYXQxNidcbiAgICB8ICdpbnQ4J1xuICAgIHwgJ3VpbnQ4J1xuICAgIHwgJ2ludDMyJ1xuICAgIHwgJ3VpbnQzMidcbiAgICB8ICdpbnQ2NCdcbiAgICB8ICd1aW50NjQnXG4gICAgfCAnYm9vbCdcbiAgICB8ICd1aW50NCdcbiAgICB8ICdpbnQ0JztcblxuICAvKipcbiAgICogcmVwcmVzZW50IHdoZXJlIHRoZSB0ZW5zb3IgZGF0YSBpcyBzdG9yZWRcbiAgICovXG4gIGV4cG9ydCB0eXBlIERhdGFMb2NhdGlvbiA9ICdub25lJyB8ICdjcHUnIHwgJ2NwdS1waW5uZWQnIHwgJ3RleHR1cmUnIHwgJ2dwdS1idWZmZXInIHwgJ21sLXRlbnNvcic7XG5cbiAgLyoqXG4gICAqIHJlcHJlc2VudCB0aGUgZGF0YSB0eXBlIG9mIGEgdGVuc29yXG4gICAqL1xuICBleHBvcnQgdHlwZSBUeXBlID0ga2V5b2YgRGF0YVR5cGVNYXA7XG59XG5cbi8qKlxuICogUmVwcmVzZW50IG11bHRpLWRpbWVuc2lvbmFsIGFycmF5cyB0byBmZWVkIHRvIG9yIGZldGNoIGZyb20gbW9kZWwgaW5mZXJlbmNpbmcuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHlwZWRUZW5zb3I8VCBleHRlbmRzIFRlbnNvci5UeXBlPiBleHRlbmRzIFR5cGVkVGVuc29yQmFzZTxUPiwgVHlwZWRUZW5zb3JVdGlsczxUPiB7fVxuLyoqXG4gKiBSZXByZXNlbnQgbXVsdGktZGltZW5zaW9uYWwgYXJyYXlzIHRvIGZlZWQgdG8gb3IgZmV0Y2ggZnJvbSBtb2RlbCBpbmZlcmVuY2luZy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW5zb3IgZXh0ZW5kcyBUeXBlZFRlbnNvckJhc2U8VGVuc29yLlR5cGU+LCBUeXBlZFRlbnNvclV0aWxzPFRlbnNvci5UeXBlPiB7fVxuXG4vKipcbiAqIHR5cGUgVGVuc29yQ29uc3RydWN0b3IgZGVmaW5lcyB0aGUgY29uc3RydWN0b3JzIG9mICdUZW5zb3InIHRvIGNyZWF0ZSBDUFUgdGVuc29yIGluc3RhbmNlcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW5zb3JDb25zdHJ1Y3RvciBleHRlbmRzIFRlbnNvckZhY3Rvcnkge1xuICAvLyAjcmVnaW9uIENQVSB0ZW5zb3IgLSBzcGVjaWZ5IGVsZW1lbnQgdHlwZVxuICAvKipcbiAgICogQ29uc3RydWN0IGEgbmV3IHN0cmluZyB0ZW5zb3Igb2JqZWN0IGZyb20gdGhlIGdpdmVuIHR5cGUsIGRhdGEgYW5kIGRpbXMuXG4gICAqXG4gICAqIEBwYXJhbSB0eXBlIC0gU3BlY2lmeSB0aGUgZWxlbWVudCB0eXBlLlxuICAgKiBAcGFyYW0gZGF0YSAtIFNwZWNpZnkgdGhlIENQVSB0ZW5zb3IgZGF0YS5cbiAgICogQHBhcmFtIGRpbXMgLSBTcGVjaWZ5IHRoZSBkaW1lbnNpb24gb2YgdGhlIHRlbnNvci4gSWYgb21pdHRlZCwgYSAxLUQgdGVuc29yIGlzIGFzc3VtZWQuXG4gICAqL1xuICBuZXcgKFxuICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgIGRhdGE6IFRlbnNvci5EYXRhVHlwZU1hcFsnc3RyaW5nJ10gfCByZWFkb25seSBzdHJpbmdbXSxcbiAgICBkaW1zPzogcmVhZG9ubHkgbnVtYmVyW10sXG4gICk6IFR5cGVkVGVuc29yPCdzdHJpbmcnPjtcblxuICAvKipcbiAgICogQ29uc3RydWN0IGEgbmV3IGJvb2wgdGVuc29yIG9iamVjdCBmcm9tIHRoZSBnaXZlbiB0eXBlLCBkYXRhIGFuZCBkaW1zLlxuICAgKlxuICAgKiBAcGFyYW0gdHlwZSAtIFNwZWNpZnkgdGhlIGVsZW1lbnQgdHlwZS5cbiAgICogQHBhcmFtIGRhdGEgLSBTcGVjaWZ5IHRoZSBDUFUgdGVuc29yIGRhdGEuXG4gICAqIEBwYXJhbSBkaW1zIC0gU3BlY2lmeSB0aGUgZGltZW5zaW9uIG9mIHRoZSB0ZW5zb3IuIElmIG9taXR0ZWQsIGEgMS1EIHRlbnNvciBpcyBhc3N1bWVkLlxuICAgKi9cbiAgbmV3IChcbiAgICB0eXBlOiAnYm9vbCcsXG4gICAgZGF0YTogVGVuc29yLkRhdGFUeXBlTWFwWydib29sJ10gfCByZWFkb25seSBib29sZWFuW10sXG4gICAgZGltcz86IHJlYWRvbmx5IG51bWJlcltdLFxuICApOiBUeXBlZFRlbnNvcjwnYm9vbCc+O1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3QgYSBuZXcgdWludDggdGVuc29yIG9iamVjdCBmcm9tIGEgVWludDhDbGFtcGVkQXJyYXksIGRhdGEgYW5kIGRpbXMuXG4gICAqXG4gICAqIEBwYXJhbSB0eXBlIC0gU3BlY2lmeSB0aGUgZWxlbWVudCB0eXBlLlxuICAgKiBAcGFyYW0gZGF0YSAtIFNwZWNpZnkgdGhlIENQVSB0ZW5zb3IgZGF0YS5cbiAgICogQHBhcmFtIGRpbXMgLSBTcGVjaWZ5IHRoZSBkaW1lbnNpb24gb2YgdGhlIHRlbnNvci4gSWYgb21pdHRlZCwgYSAxLUQgdGVuc29yIGlzIGFzc3VtZWQuXG4gICAqL1xuICBuZXcgKHR5cGU6ICd1aW50OCcsIGRhdGE6IFVpbnQ4Q2xhbXBlZEFycmF5LCBkaW1zPzogcmVhZG9ubHkgbnVtYmVyW10pOiBUeXBlZFRlbnNvcjwndWludDgnPjtcblxuICAvKipcbiAgICogQ29uc3RydWN0IGEgbmV3IDY0LWJpdCBpbnRlZ2VyIHR5cGVkIHRlbnNvciBvYmplY3QgZnJvbSB0aGUgZ2l2ZW4gdHlwZSwgZGF0YSBhbmQgZGltcy5cbiAgICpcbiAgICogQHBhcmFtIHR5cGUgLSBTcGVjaWZ5IHRoZSBlbGVtZW50IHR5cGUuXG4gICAqIEBwYXJhbSBkYXRhIC0gU3BlY2lmeSB0aGUgQ1BVIHRlbnNvciBkYXRhLlxuICAgKiBAcGFyYW0gZGltcyAtIFNwZWNpZnkgdGhlIGRpbWVuc2lvbiBvZiB0aGUgdGVuc29yLiBJZiBvbWl0dGVkLCBhIDEtRCB0ZW5zb3IgaXMgYXNzdW1lZC5cbiAgICovXG4gIG5ldyA8VCBleHRlbmRzICd1aW50NjQnIHwgJ2ludDY0Jz4oXG4gICAgdHlwZTogVCxcbiAgICBkYXRhOiBUZW5zb3IuRGF0YVR5cGVNYXBbVF0gfCByZWFkb25seSBiaWdpbnRbXSB8IHJlYWRvbmx5IG51bWJlcltdLFxuICAgIGRpbXM/OiByZWFkb25seSBudW1iZXJbXSxcbiAgKTogVHlwZWRUZW5zb3I8VD47XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdCBhIG5ldyBudW1lcmljIHRlbnNvciBvYmplY3QgZnJvbSB0aGUgZ2l2ZW4gdHlwZSwgZGF0YSBhbmQgZGltcy5cbiAgICpcbiAgICogQHBhcmFtIHR5cGUgLSBTcGVjaWZ5IHRoZSBlbGVtZW50IHR5cGUuXG4gICAqIEBwYXJhbSBkYXRhIC0gU3BlY2lmeSB0aGUgQ1BVIHRlbnNvciBkYXRhLlxuICAgKiBAcGFyYW0gZGltcyAtIFNwZWNpZnkgdGhlIGRpbWVuc2lvbiBvZiB0aGUgdGVuc29yLiBJZiBvbWl0dGVkLCBhIDEtRCB0ZW5zb3IgaXMgYXNzdW1lZC5cbiAgICovXG4gIG5ldyA8VCBleHRlbmRzIEV4Y2x1ZGU8VGVuc29yLlR5cGUsICdzdHJpbmcnIHwgJ2Jvb2wnIHwgJ3VpbnQ2NCcgfCAnaW50NjQnPj4oXG4gICAgdHlwZTogVCxcbiAgICBkYXRhOiBUZW5zb3IuRGF0YVR5cGVNYXBbVF0gfCByZWFkb25seSBudW1iZXJbXSxcbiAgICBkaW1zPzogcmVhZG9ubHkgbnVtYmVyW10sXG4gICk6IFR5cGVkVGVuc29yPFQ+O1xuICAvLyAjZW5kcmVnaW9uXG5cbiAgLy8gI3JlZ2lvbiBDUFUgdGVuc29yIC0gaW5mZXIgZWxlbWVudCB0eXBlc1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3QgYSBuZXcgZmxvYXQzMiB0ZW5zb3Igb2JqZWN0IGZyb20gdGhlIGdpdmVuIGRhdGEgYW5kIGRpbXMuXG4gICAqXG4gICAqIEBwYXJhbSBkYXRhIC0gU3BlY2lmeSB0aGUgQ1BVIHRlbnNvciBkYXRhLlxuICAgKiBAcGFyYW0gZGltcyAtIFNwZWNpZnkgdGhlIGRpbWVuc2lvbiBvZiB0aGUgdGVuc29yLiBJZiBvbWl0dGVkLCBhIDEtRCB0ZW5zb3IgaXMgYXNzdW1lZC5cbiAgICovXG4gIG5ldyAoZGF0YTogRmxvYXQzMkFycmF5LCBkaW1zPzogcmVhZG9ubHkgbnVtYmVyW10pOiBUeXBlZFRlbnNvcjwnZmxvYXQzMic+O1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3QgYSBuZXcgaW50OCB0ZW5zb3Igb2JqZWN0IGZyb20gdGhlIGdpdmVuIGRhdGEgYW5kIGRpbXMuXG4gICAqXG4gICAqIEBwYXJhbSBkYXRhIC0gU3BlY2lmeSB0aGUgQ1BVIHRlbnNvciBkYXRhLlxuICAgKiBAcGFyYW0gZGltcyAtIFNwZWNpZnkgdGhlIGRpbWVuc2lvbiBvZiB0aGUgdGVuc29yLiBJZiBvbWl0dGVkLCBhIDEtRCB0ZW5zb3IgaXMgYXNzdW1lZC5cbiAgICovXG4gIG5ldyAoZGF0YTogSW50OEFycmF5LCBkaW1zPzogcmVhZG9ubHkgbnVtYmVyW10pOiBUeXBlZFRlbnNvcjwnaW50OCc+O1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3QgYSBuZXcgdWludDggdGVuc29yIG9iamVjdCBmcm9tIHRoZSBnaXZlbiBkYXRhIGFuZCBkaW1zLlxuICAgKlxuICAgKiBAcGFyYW0gZGF0YSAtIFNwZWNpZnkgdGhlIENQVSB0ZW5zb3IgZGF0YS5cbiAgICogQHBhcmFtIGRpbXMgLSBTcGVjaWZ5IHRoZSBkaW1lbnNpb24gb2YgdGhlIHRlbnNvci4gSWYgb21pdHRlZCwgYSAxLUQgdGVuc29yIGlzIGFzc3VtZWQuXG4gICAqL1xuICBuZXcgKGRhdGE6IFVpbnQ4QXJyYXksIGRpbXM/OiByZWFkb25seSBudW1iZXJbXSk6IFR5cGVkVGVuc29yPCd1aW50OCc+O1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3QgYSBuZXcgdWludDggdGVuc29yIG9iamVjdCBmcm9tIHRoZSBnaXZlbiBkYXRhIGFuZCBkaW1zLlxuICAgKlxuICAgKiBAcGFyYW0gZGF0YSAtIFNwZWNpZnkgdGhlIENQVSB0ZW5zb3IgZGF0YS5cbiAgICogQHBhcmFtIGRpbXMgLSBTcGVjaWZ5IHRoZSBkaW1lbnNpb24gb2YgdGhlIHRlbnNvci4gSWYgb21pdHRlZCwgYSAxLUQgdGVuc29yIGlzIGFzc3VtZWQuXG4gICAqL1xuICBuZXcgKGRhdGE6IFVpbnQ4Q2xhbXBlZEFycmF5LCBkaW1zPzogcmVhZG9ubHkgbnVtYmVyW10pOiBUeXBlZFRlbnNvcjwndWludDgnPjtcblxuICAvKipcbiAgICogQ29uc3RydWN0IGEgbmV3IHVpbnQxNiB0ZW5zb3Igb2JqZWN0IGZyb20gdGhlIGdpdmVuIGRhdGEgYW5kIGRpbXMuXG4gICAqXG4gICAqIEBwYXJhbSBkYXRhIC0gU3BlY2lmeSB0aGUgQ1BVIHRlbnNvciBkYXRhLlxuICAgKiBAcGFyYW0gZGltcyAtIFNwZWNpZnkgdGhlIGRpbWVuc2lvbiBvZiB0aGUgdGVuc29yLiBJZiBvbWl0dGVkLCBhIDEtRCB0ZW5zb3IgaXMgYXNzdW1lZC5cbiAgICovXG4gIG5ldyAoZGF0YTogVWludDE2QXJyYXksIGRpbXM/OiByZWFkb25seSBudW1iZXJbXSk6IFR5cGVkVGVuc29yPCd1aW50MTYnPjtcblxuICAvKipcbiAgICogQ29uc3RydWN0IGEgbmV3IGludDE2IHRlbnNvciBvYmplY3QgZnJvbSB0aGUgZ2l2ZW4gZGF0YSBhbmQgZGltcy5cbiAgICpcbiAgICogQHBhcmFtIGRhdGEgLSBTcGVjaWZ5IHRoZSBDUFUgdGVuc29yIGRhdGEuXG4gICAqIEBwYXJhbSBkaW1zIC0gU3BlY2lmeSB0aGUgZGltZW5zaW9uIG9mIHRoZSB0ZW5zb3IuIElmIG9taXR0ZWQsIGEgMS1EIHRlbnNvciBpcyBhc3N1bWVkLlxuICAgKi9cbiAgbmV3IChkYXRhOiBJbnQxNkFycmF5LCBkaW1zPzogcmVhZG9ubHkgbnVtYmVyW10pOiBUeXBlZFRlbnNvcjwnaW50MTYnPjtcblxuICAvKipcbiAgICogQ29uc3RydWN0IGEgbmV3IGludDMyIHRlbnNvciBvYmplY3QgZnJvbSB0aGUgZ2l2ZW4gZGF0YSBhbmQgZGltcy5cbiAgICpcbiAgICogQHBhcmFtIGRhdGEgLSBTcGVjaWZ5IHRoZSBDUFUgdGVuc29yIGRhdGEuXG4gICAqIEBwYXJhbSBkaW1zIC0gU3BlY2lmeSB0aGUgZGltZW5zaW9uIG9mIHRoZSB0ZW5zb3IuIElmIG9taXR0ZWQsIGEgMS1EIHRlbnNvciBpcyBhc3N1bWVkLlxuICAgKi9cbiAgbmV3IChkYXRhOiBJbnQzMkFycmF5LCBkaW1zPzogcmVhZG9ubHkgbnVtYmVyW10pOiBUeXBlZFRlbnNvcjwnaW50MzInPjtcblxuICAvKipcbiAgICogQ29uc3RydWN0IGEgbmV3IGludDY0IHRlbnNvciBvYmplY3QgZnJvbSB0aGUgZ2l2ZW4gZGF0YSBhbmQgZGltcy5cbiAgICpcbiAgICogQHBhcmFtIGRhdGEgLSBTcGVjaWZ5IHRoZSBDUFUgdGVuc29yIGRhdGEuXG4gICAqIEBwYXJhbSBkaW1zIC0gU3BlY2lmeSB0aGUgZGltZW5zaW9uIG9mIHRoZSB0ZW5zb3IuIElmIG9taXR0ZWQsIGEgMS1EIHRlbnNvciBpcyBhc3N1bWVkLlxuICAgKi9cbiAgbmV3IChkYXRhOiBCaWdJbnQ2NEFycmF5LCBkaW1zPzogcmVhZG9ubHkgbnVtYmVyW10pOiBUeXBlZFRlbnNvcjwnaW50NjQnPjtcblxuICAvKipcbiAgICogQ29uc3RydWN0IGEgbmV3IHN0cmluZyB0ZW5zb3Igb2JqZWN0IGZyb20gdGhlIGdpdmVuIGRhdGEgYW5kIGRpbXMuXG4gICAqXG4gICAqIEBwYXJhbSBkYXRhIC0gU3BlY2lmeSB0aGUgQ1BVIHRlbnNvciBkYXRhLlxuICAgKiBAcGFyYW0gZGltcyAtIFNwZWNpZnkgdGhlIGRpbWVuc2lvbiBvZiB0aGUgdGVuc29yLiBJZiBvbWl0dGVkLCBhIDEtRCB0ZW5zb3IgaXMgYXNzdW1lZC5cbiAgICovXG4gIG5ldyAoZGF0YTogcmVhZG9ubHkgc3RyaW5nW10sIGRpbXM/OiByZWFkb25seSBudW1iZXJbXSk6IFR5cGVkVGVuc29yPCdzdHJpbmcnPjtcblxuICAvKipcbiAgICogQ29uc3RydWN0IGEgbmV3IGJvb2wgdGVuc29yIG9iamVjdCBmcm9tIHRoZSBnaXZlbiBkYXRhIGFuZCBkaW1zLlxuICAgKlxuICAgKiBAcGFyYW0gZGF0YSAtIFNwZWNpZnkgdGhlIENQVSB0ZW5zb3IgZGF0YS5cbiAgICogQHBhcmFtIGRpbXMgLSBTcGVjaWZ5IHRoZSBkaW1lbnNpb24gb2YgdGhlIHRlbnNvci4gSWYgb21pdHRlZCwgYSAxLUQgdGVuc29yIGlzIGFzc3VtZWQuXG4gICAqL1xuICBuZXcgKGRhdGE6IHJlYWRvbmx5IGJvb2xlYW5bXSwgZGltcz86IHJlYWRvbmx5IG51bWJlcltdKTogVHlwZWRUZW5zb3I8J2Jvb2wnPjtcblxuICAvKipcbiAgICogQ29uc3RydWN0IGEgbmV3IGZsb2F0NjQgdGVuc29yIG9iamVjdCBmcm9tIHRoZSBnaXZlbiBkYXRhIGFuZCBkaW1zLlxuICAgKlxuICAgKiBAcGFyYW0gZGF0YSAtIFNwZWNpZnkgdGhlIENQVSB0ZW5zb3IgZGF0YS5cbiAgICogQHBhcmFtIGRpbXMgLSBTcGVjaWZ5IHRoZSBkaW1lbnNpb24gb2YgdGhlIHRlbnNvci4gSWYgb21pdHRlZCwgYSAxLUQgdGVuc29yIGlzIGFzc3VtZWQuXG4gICAqL1xuICBuZXcgKGRhdGE6IEZsb2F0NjRBcnJheSwgZGltcz86IHJlYWRvbmx5IG51bWJlcltdKTogVHlwZWRUZW5zb3I8J2Zsb2F0NjQnPjtcblxuICAvKipcbiAgICogQ29uc3RydWN0IGEgbmV3IHVpbnQzMiB0ZW5zb3Igb2JqZWN0IGZyb20gdGhlIGdpdmVuIGRhdGEgYW5kIGRpbXMuXG4gICAqXG4gICAqIEBwYXJhbSBkYXRhIC0gU3BlY2lmeSB0aGUgQ1BVIHRlbnNvciBkYXRhLlxuICAgKiBAcGFyYW0gZGltcyAtIFNwZWNpZnkgdGhlIGRpbWVuc2lvbiBvZiB0aGUgdGVuc29yLiBJZiBvbWl0dGVkLCBhIDEtRCB0ZW5zb3IgaXMgYXNzdW1lZC5cbiAgICovXG4gIG5ldyAoZGF0YTogVWludDMyQXJyYXksIGRpbXM/OiByZWFkb25seSBudW1iZXJbXSk6IFR5cGVkVGVuc29yPCd1aW50MzInPjtcblxuICAvKipcbiAgICogQ29uc3RydWN0IGEgbmV3IHVpbnQ2NCB0ZW5zb3Igb2JqZWN0IGZyb20gdGhlIGdpdmVuIGRhdGEgYW5kIGRpbXMuXG4gICAqXG4gICAqIEBwYXJhbSBkYXRhIC0gU3BlY2lmeSB0aGUgQ1BVIHRlbnNvciBkYXRhLlxuICAgKiBAcGFyYW0gZGltcyAtIFNwZWNpZnkgdGhlIGRpbWVuc2lvbiBvZiB0aGUgdGVuc29yLiBJZiBvbWl0dGVkLCBhIDEtRCB0ZW5zb3IgaXMgYXNzdW1lZC5cbiAgICovXG4gIG5ldyAoZGF0YTogQmlnVWludDY0QXJyYXksIGRpbXM/OiByZWFkb25seSBudW1iZXJbXSk6IFR5cGVkVGVuc29yPCd1aW50NjQnPjtcblxuICAvLyAjZW5kcmVnaW9uXG5cbiAgLy8gI3JlZ2lvbiBDUFUgdGVuc29yIC0gZmFsbCBiYWNrIHRvIG5vbi1nZW5lcmljIHRlbnNvciB0eXBlIGRlY2xhcmF0aW9uXG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdCBhIG5ldyB0ZW5zb3Igb2JqZWN0IGZyb20gdGhlIGdpdmVuIHR5cGUsIGRhdGEgYW5kIGRpbXMuXG4gICAqXG4gICAqIEBwYXJhbSB0eXBlIC0gU3BlY2lmeSB0aGUgZWxlbWVudCB0eXBlLlxuICAgKiBAcGFyYW0gZGF0YSAtIFNwZWNpZnkgdGhlIENQVSB0ZW5zb3IgZGF0YS5cbiAgICogQHBhcmFtIGRpbXMgLSBTcGVjaWZ5IHRoZSBkaW1lbnNpb24gb2YgdGhlIHRlbnNvci4gSWYgb21pdHRlZCwgYSAxLUQgdGVuc29yIGlzIGFzc3VtZWQuXG4gICAqL1xuICBuZXcgKFxuICAgIHR5cGU6IFRlbnNvci5UeXBlLFxuICAgIGRhdGE6IFRlbnNvci5EYXRhVHlwZSB8IHJlYWRvbmx5IG51bWJlcltdIHwgcmVhZG9ubHkgc3RyaW5nW10gfCByZWFkb25seSBiaWdpbnRbXSB8IHJlYWRvbmx5IGJvb2xlYW5bXSxcbiAgICBkaW1zPzogcmVhZG9ubHkgbnVtYmVyW10sXG4gICk6IFRlbnNvcjtcblxuICAvKipcbiAgICogQ29uc3RydWN0IGEgbmV3IHRlbnNvciBvYmplY3QgZnJvbSB0aGUgZ2l2ZW4gZGF0YSBhbmQgZGltcy5cbiAgICpcbiAgICogQHBhcmFtIGRhdGEgLSBTcGVjaWZ5IHRoZSBDUFUgdGVuc29yIGRhdGEuXG4gICAqIEBwYXJhbSBkaW1zIC0gU3BlY2lmeSB0aGUgZGltZW5zaW9uIG9mIHRoZSB0ZW5zb3IuIElmIG9taXR0ZWQsIGEgMS1EIHRlbnNvciBpcyBhc3N1bWVkLlxuICAgKi9cbiAgbmV3IChkYXRhOiBUZW5zb3IuRGF0YVR5cGUsIGRpbXM/OiByZWFkb25seSBudW1iZXJbXSk6IFRlbnNvcjtcbiAgLy8gI2VuZHJlZ2lvblxufVxuXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25hbWluZy1jb252ZW50aW9uXG5leHBvcnQgY29uc3QgVGVuc29yID0gVGVuc29ySW1wbCBhcyBUZW5zb3JDb25zdHJ1Y3RvcjtcbiIsICIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cblxuaW1wb3J0IHsgZW52IH0gZnJvbSAnLi9lbnYtaW1wbC5qcyc7XG5cbi8qKlxuICogQGlnbm9yZVxuICovXG5leHBvcnQgY29uc3QgVFJBQ0UgPSAoZGV2aWNlVHlwZTogc3RyaW5nLCBsYWJlbDogc3RyaW5nKSA9PiB7XG4gIGlmICh0eXBlb2YgZW52LnRyYWNlID09PSAndW5kZWZpbmVkJyA/ICFlbnYud2FzbS50cmFjZSA6ICFlbnYudHJhY2UpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgY29uc29sZS50aW1lU3RhbXAoYCR7ZGV2aWNlVHlwZX06Ok9SVDo6JHtsYWJlbH1gKTtcbn07XG5cbmNvbnN0IFRSQUNFX0ZVTkMgPSAobXNnOiBzdHJpbmcsIGV4dHJhTXNnPzogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IHN0YWNrID0gbmV3IEVycm9yKCkuc3RhY2s/LnNwbGl0KC9cXHJcXG58XFxyfFxcbi9nKSB8fCBbXTtcbiAgbGV0IGhhc1RyYWNlRnVuYyA9IGZhbHNlO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHN0YWNrLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGhhc1RyYWNlRnVuYyAmJiAhc3RhY2tbaV0uaW5jbHVkZXMoJ1RSQUNFX0ZVTkMnKSkge1xuICAgICAgbGV0IGxhYmVsID0gYEZVTkNfJHttc2d9Ojoke3N0YWNrW2ldLnRyaW0oKS5zcGxpdCgnICcpWzFdfWA7XG4gICAgICBpZiAoZXh0cmFNc2cpIHtcbiAgICAgICAgbGFiZWwgKz0gYDo6JHtleHRyYU1zZ31gO1xuICAgICAgfVxuICAgICAgVFJBQ0UoJ0NQVScsIGxhYmVsKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHN0YWNrW2ldLmluY2x1ZGVzKCdUUkFDRV9GVU5DJykpIHtcbiAgICAgIGhhc1RyYWNlRnVuYyA9IHRydWU7XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIEBpZ25vcmVcbiAqL1xuZXhwb3J0IGNvbnN0IFRSQUNFX0ZVTkNfQkVHSU4gPSAoZXh0cmFNc2c/OiBzdHJpbmcpID0+IHtcbiAgaWYgKHR5cGVvZiBlbnYudHJhY2UgPT09ICd1bmRlZmluZWQnID8gIWVudi53YXNtLnRyYWNlIDogIWVudi50cmFjZSkge1xuICAgIHJldHVybjtcbiAgfVxuICBUUkFDRV9GVU5DKCdCRUdJTicsIGV4dHJhTXNnKTtcbn07XG5cbi8qKlxuICogQGlnbm9yZVxuICovXG5leHBvcnQgY29uc3QgVFJBQ0VfRlVOQ19FTkQgPSAoZXh0cmFNc2c/OiBzdHJpbmcpID0+IHtcbiAgaWYgKHR5cGVvZiBlbnYudHJhY2UgPT09ICd1bmRlZmluZWQnID8gIWVudi53YXNtLnRyYWNlIDogIWVudi50cmFjZSkge1xuICAgIHJldHVybjtcbiAgfVxuICBUUkFDRV9GVU5DKCdFTkQnLCBleHRyYU1zZyk7XG59O1xuXG4vKipcbiAqIEBpZ25vcmVcbiAqL1xuZXhwb3J0IGNvbnN0IFRSQUNFX0VWRU5UX0JFR0lOID0gKGV4dHJhTXNnPzogc3RyaW5nKSA9PiB7XG4gIGlmICh0eXBlb2YgZW52LnRyYWNlID09PSAndW5kZWZpbmVkJyA/ICFlbnYud2FzbS50cmFjZSA6ICFlbnYudHJhY2UpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgY29uc29sZS50aW1lKGBPUlQ6OiR7ZXh0cmFNc2d9YCk7XG59O1xuXG4vKipcbiAqIEBpZ25vcmVcbiAqL1xuZXhwb3J0IGNvbnN0IFRSQUNFX0VWRU5UX0VORCA9IChleHRyYU1zZz86IHN0cmluZykgPT4ge1xuICBpZiAodHlwZW9mIGVudi50cmFjZSA9PT0gJ3VuZGVmaW5lZCcgPyAhZW52Lndhc20udHJhY2UgOiAhZW52LnRyYWNlKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gIGNvbnNvbGUudGltZUVuZChgT1JUOjoke2V4dHJhTXNnfWApO1xufTtcbiIsICIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cblxuaW1wb3J0IHsgcmVzb2x2ZUJhY2tlbmRBbmRFeGVjdXRpb25Qcm92aWRlcnMgfSBmcm9tICcuL2JhY2tlbmQtaW1wbC5qcyc7XG5pbXBvcnQgeyBJbmZlcmVuY2VTZXNzaW9uSGFuZGxlciB9IGZyb20gJy4vYmFja2VuZC5qcyc7XG5pbXBvcnQgeyBJbmZlcmVuY2VTZXNzaW9uIGFzIEluZmVyZW5jZVNlc3Npb25JbnRlcmZhY2UgfSBmcm9tICcuL2luZmVyZW5jZS1zZXNzaW9uLmpzJztcbmltcG9ydCB7IE9ubnhWYWx1ZSB9IGZyb20gJy4vb25ueC12YWx1ZS5qcyc7XG5pbXBvcnQgeyBUZW5zb3IgfSBmcm9tICcuL3RlbnNvci5qcyc7XG5pbXBvcnQgeyBUUkFDRV9GVU5DX0JFR0lOLCBUUkFDRV9GVU5DX0VORCwgVFJBQ0VfRVZFTlRfQkVHSU4sIFRSQUNFX0VWRU5UX0VORCB9IGZyb20gJy4vdHJhY2UuanMnO1xuXG50eXBlIFNlc3Npb25PcHRpb25zID0gSW5mZXJlbmNlU2Vzc2lvbkludGVyZmFjZS5TZXNzaW9uT3B0aW9ucztcbnR5cGUgUnVuT3B0aW9ucyA9IEluZmVyZW5jZVNlc3Npb25JbnRlcmZhY2UuUnVuT3B0aW9ucztcbnR5cGUgRmVlZHNUeXBlID0gSW5mZXJlbmNlU2Vzc2lvbkludGVyZmFjZS5GZWVkc1R5cGU7XG50eXBlIEZldGNoZXNUeXBlID0gSW5mZXJlbmNlU2Vzc2lvbkludGVyZmFjZS5GZXRjaGVzVHlwZTtcbnR5cGUgUmV0dXJuVHlwZSA9IEluZmVyZW5jZVNlc3Npb25JbnRlcmZhY2UuUmV0dXJuVHlwZTtcblxuZXhwb3J0IGNsYXNzIEluZmVyZW5jZVNlc3Npb24gaW1wbGVtZW50cyBJbmZlcmVuY2VTZXNzaW9uSW50ZXJmYWNlIHtcbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihoYW5kbGVyOiBJbmZlcmVuY2VTZXNzaW9uSGFuZGxlcikge1xuICAgIHRoaXMuaGFuZGxlciA9IGhhbmRsZXI7XG4gIH1cbiAgcnVuKGZlZWRzOiBGZWVkc1R5cGUsIG9wdGlvbnM/OiBSdW5PcHRpb25zKTogUHJvbWlzZTxSZXR1cm5UeXBlPjtcbiAgcnVuKGZlZWRzOiBGZWVkc1R5cGUsIGZldGNoZXM6IEZldGNoZXNUeXBlLCBvcHRpb25zPzogUnVuT3B0aW9ucyk6IFByb21pc2U8UmV0dXJuVHlwZT47XG4gIGFzeW5jIHJ1bihmZWVkczogRmVlZHNUeXBlLCBhcmcxPzogRmV0Y2hlc1R5cGUgfCBSdW5PcHRpb25zLCBhcmcyPzogUnVuT3B0aW9ucyk6IFByb21pc2U8UmV0dXJuVHlwZT4ge1xuICAgIFRSQUNFX0ZVTkNfQkVHSU4oKTtcbiAgICBUUkFDRV9FVkVOVF9CRUdJTignSW5mZXJlbmNlU2Vzc2lvbi5ydW4nKTtcbiAgICBjb25zdCBmZXRjaGVzOiB7IFtuYW1lOiBzdHJpbmddOiBPbm54VmFsdWUgfCBudWxsIH0gPSB7fTtcbiAgICBsZXQgb3B0aW9uczogUnVuT3B0aW9ucyA9IHt9O1xuICAgIC8vIGNoZWNrIGlucHV0c1xuICAgIGlmICh0eXBlb2YgZmVlZHMgIT09ICdvYmplY3QnIHx8IGZlZWRzID09PSBudWxsIHx8IGZlZWRzIGluc3RhbmNlb2YgVGVuc29yIHx8IEFycmF5LmlzQXJyYXkoZmVlZHMpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICBcIidmZWVkcycgbXVzdCBiZSBhbiBvYmplY3QgdGhhdCB1c2UgaW5wdXQgbmFtZXMgYXMga2V5cyBhbmQgT25ueFZhbHVlIGFzIGNvcnJlc3BvbmRpbmcgdmFsdWVzLlwiLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBsZXQgaXNGZXRjaGVzRW1wdHkgPSB0cnVlO1xuICAgIC8vIGRldGVybWluZSB3aGljaCBvdmVycmlkZSBpcyBiZWluZyB1c2VkXG4gICAgaWYgKHR5cGVvZiBhcmcxID09PSAnb2JqZWN0Jykge1xuICAgICAgaWYgKGFyZzEgPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5leHBlY3RlZCBhcmd1bWVudFsxXTogY2Fubm90IGJlIG51bGwuJyk7XG4gICAgICB9XG4gICAgICBpZiAoYXJnMSBpbnN0YW5jZW9mIFRlbnNvcikge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiJ2ZldGNoZXMnIGNhbm5vdCBiZSBhIFRlbnNvclwiKTtcbiAgICAgIH1cblxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoYXJnMSkpIHtcbiAgICAgICAgaWYgKGFyZzEubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIidmZXRjaGVzJyBjYW5ub3QgYmUgYW4gZW1wdHkgYXJyYXkuXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlzRmV0Y2hlc0VtcHR5ID0gZmFsc2U7XG4gICAgICAgIC8vIG91dHB1dCBuYW1lc1xuICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgYXJnMSkge1xuICAgICAgICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCInZmV0Y2hlcycgbXVzdCBiZSBhIHN0cmluZyBhcnJheSBvciBhbiBvYmplY3QuXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodGhpcy5vdXRwdXROYW1lcy5pbmRleE9mKG5hbWUpID09PSAtMSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoYCdmZXRjaGVzJyBjb250YWlucyBpbnZhbGlkIG91dHB1dCBuYW1lOiAke25hbWV9LmApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBmZXRjaGVzW25hbWVdID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgYXJnMiA9PT0gJ29iamVjdCcgJiYgYXJnMiAhPT0gbnVsbCkge1xuICAgICAgICAgIG9wdGlvbnMgPSBhcmcyO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBhcmcyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCInb3B0aW9ucycgbXVzdCBiZSBhbiBvYmplY3QuXCIpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBkZWNpZGUgd2hldGhlciBhcmcxIGlzIGZldGNoZXMgb3Igb3B0aW9uc1xuICAgICAgICAvLyBpZiBhbnkgb3V0cHV0IG5hbWUgaXMgcHJlc2VudCBhbmQgaXRzIHZhbHVlIGlzIHZhbGlkIE9ubnhWYWx1ZSwgd2UgY29uc2lkZXIgaXQgZmV0Y2hlc1xuICAgICAgICBsZXQgaXNGZXRjaGVzID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IGFyZzFLZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoYXJnMSk7XG4gICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiB0aGlzLm91dHB1dE5hbWVzKSB7XG4gICAgICAgICAgaWYgKGFyZzFLZXlzLmluZGV4T2YobmFtZSkgIT09IC0xKSB7XG4gICAgICAgICAgICBjb25zdCB2ID0gKGFyZzEgYXMgSW5mZXJlbmNlU2Vzc2lvbkludGVyZmFjZS5OdWxsYWJsZU9ubnhWYWx1ZU1hcFR5cGUpW25hbWVdO1xuICAgICAgICAgICAgaWYgKHYgPT09IG51bGwgfHwgdiBpbnN0YW5jZW9mIFRlbnNvcikge1xuICAgICAgICAgICAgICBpc0ZldGNoZXMgPSB0cnVlO1xuICAgICAgICAgICAgICBpc0ZldGNoZXNFbXB0eSA9IGZhbHNlO1xuICAgICAgICAgICAgICBmZXRjaGVzW25hbWVdID0gdjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaXNGZXRjaGVzKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBhcmcyID09PSAnb2JqZWN0JyAmJiBhcmcyICE9PSBudWxsKSB7XG4gICAgICAgICAgICBvcHRpb25zID0gYXJnMjtcbiAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBhcmcyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIidvcHRpb25zJyBtdXN0IGJlIGFuIG9iamVjdC5cIik7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG9wdGlvbnMgPSBhcmcxIGFzIFJ1bk9wdGlvbnM7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBhcmcxICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlVuZXhwZWN0ZWQgYXJndW1lbnRbMV06IG11c3QgYmUgJ2ZldGNoZXMnIG9yICdvcHRpb25zJy5cIik7XG4gICAgfVxuXG4gICAgLy8gY2hlY2sgaWYgYWxsIGlucHV0cyBhcmUgaW4gZmVlZFxuICAgIGZvciAoY29uc3QgbmFtZSBvZiB0aGlzLmlucHV0TmFtZXMpIHtcbiAgICAgIGlmICh0eXBlb2YgZmVlZHNbbmFtZV0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgaW5wdXQgJyR7bmFtZX0nIGlzIG1pc3NpbmcgaW4gJ2ZlZWRzJy5gKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBpZiBubyBmZXRjaGVzIGlzIHNwZWNpZmllZCwgd2UgdXNlIHRoZSBmdWxsIG91dHB1dCBuYW1lcyBsaXN0XG4gICAgaWYgKGlzRmV0Y2hlc0VtcHR5KSB7XG4gICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgdGhpcy5vdXRwdXROYW1lcykge1xuICAgICAgICBmZXRjaGVzW25hbWVdID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBmZWVkcywgZmV0Y2hlcyBhbmQgb3B0aW9ucyBhcmUgcHJlcGFyZWRcblxuICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCB0aGlzLmhhbmRsZXIucnVuKGZlZWRzLCBmZXRjaGVzLCBvcHRpb25zKTtcbiAgICBjb25zdCByZXR1cm5WYWx1ZTogeyBbbmFtZTogc3RyaW5nXTogT25ueFZhbHVlIH0gPSB7fTtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiByZXN1bHRzKSB7XG4gICAgICBpZiAoT2JqZWN0Lmhhc093blByb3BlcnR5LmNhbGwocmVzdWx0cywga2V5KSkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSByZXN1bHRzW2tleV07XG4gICAgICAgIGlmIChyZXN1bHQgaW5zdGFuY2VvZiBUZW5zb3IpIHtcbiAgICAgICAgICByZXR1cm5WYWx1ZVtrZXldID0gcmVzdWx0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVyblZhbHVlW2tleV0gPSBuZXcgVGVuc29yKHJlc3VsdC50eXBlLCByZXN1bHQuZGF0YSwgcmVzdWx0LmRpbXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIFRSQUNFX0VWRU5UX0VORCgnSW5mZXJlbmNlU2Vzc2lvbi5ydW4nKTtcbiAgICBUUkFDRV9GVU5DX0VORCgpO1xuICAgIHJldHVybiByZXR1cm5WYWx1ZTtcbiAgfVxuXG4gIGFzeW5jIHJlbGVhc2UoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIHRoaXMuaGFuZGxlci5kaXNwb3NlKCk7XG4gIH1cblxuICBzdGF0aWMgY3JlYXRlKHBhdGg6IHN0cmluZywgb3B0aW9ucz86IFNlc3Npb25PcHRpb25zKTogUHJvbWlzZTxJbmZlcmVuY2VTZXNzaW9uSW50ZXJmYWNlPjtcbiAgc3RhdGljIGNyZWF0ZShidWZmZXI6IEFycmF5QnVmZmVyTGlrZSwgb3B0aW9ucz86IFNlc3Npb25PcHRpb25zKTogUHJvbWlzZTxJbmZlcmVuY2VTZXNzaW9uSW50ZXJmYWNlPjtcbiAgc3RhdGljIGNyZWF0ZShcbiAgICBidWZmZXI6IEFycmF5QnVmZmVyTGlrZSxcbiAgICBieXRlT2Zmc2V0OiBudW1iZXIsXG4gICAgYnl0ZUxlbmd0aD86IG51bWJlcixcbiAgICBvcHRpb25zPzogU2Vzc2lvbk9wdGlvbnMsXG4gICk6IFByb21pc2U8SW5mZXJlbmNlU2Vzc2lvbkludGVyZmFjZT47XG4gIHN0YXRpYyBjcmVhdGUoYnVmZmVyOiBVaW50OEFycmF5LCBvcHRpb25zPzogU2Vzc2lvbk9wdGlvbnMpOiBQcm9taXNlPEluZmVyZW5jZVNlc3Npb25JbnRlcmZhY2U+O1xuICBzdGF0aWMgYXN5bmMgY3JlYXRlKFxuICAgIGFyZzA6IHN0cmluZyB8IEFycmF5QnVmZmVyTGlrZSB8IFVpbnQ4QXJyYXksXG4gICAgYXJnMT86IFNlc3Npb25PcHRpb25zIHwgbnVtYmVyLFxuICAgIGFyZzI/OiBudW1iZXIsXG4gICAgYXJnMz86IFNlc3Npb25PcHRpb25zLFxuICApOiBQcm9taXNlPEluZmVyZW5jZVNlc3Npb25JbnRlcmZhY2U+IHtcbiAgICBUUkFDRV9GVU5DX0JFR0lOKCk7XG4gICAgVFJBQ0VfRVZFTlRfQkVHSU4oJ0luZmVyZW5jZVNlc3Npb24uY3JlYXRlJyk7XG4gICAgLy8gZWl0aGVyIGxvYWQgZnJvbSBhIGZpbGUgb3IgYnVmZmVyXG4gICAgbGV0IGZpbGVQYXRoT3JVaW50OEFycmF5OiBzdHJpbmcgfCBVaW50OEFycmF5O1xuICAgIGxldCBvcHRpb25zOiBTZXNzaW9uT3B0aW9ucyA9IHt9O1xuXG4gICAgaWYgKHR5cGVvZiBhcmcwID09PSAnc3RyaW5nJykge1xuICAgICAgZmlsZVBhdGhPclVpbnQ4QXJyYXkgPSBhcmcwO1xuICAgICAgaWYgKHR5cGVvZiBhcmcxID09PSAnb2JqZWN0JyAmJiBhcmcxICE9PSBudWxsKSB7XG4gICAgICAgIG9wdGlvbnMgPSBhcmcxO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgYXJnMSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIidvcHRpb25zJyBtdXN0IGJlIGFuIG9iamVjdC5cIik7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChhcmcwIGluc3RhbmNlb2YgVWludDhBcnJheSkge1xuICAgICAgZmlsZVBhdGhPclVpbnQ4QXJyYXkgPSBhcmcwO1xuICAgICAgaWYgKHR5cGVvZiBhcmcxID09PSAnb2JqZWN0JyAmJiBhcmcxICE9PSBudWxsKSB7XG4gICAgICAgIG9wdGlvbnMgPSBhcmcxO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgYXJnMSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIidvcHRpb25zJyBtdXN0IGJlIGFuIG9iamVjdC5cIik7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChcbiAgICAgIGFyZzAgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlciB8fFxuICAgICAgKHR5cGVvZiBTaGFyZWRBcnJheUJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcgJiYgYXJnMCBpbnN0YW5jZW9mIFNoYXJlZEFycmF5QnVmZmVyKVxuICAgICkge1xuICAgICAgY29uc3QgYnVmZmVyID0gYXJnMDtcbiAgICAgIGxldCBieXRlT2Zmc2V0ID0gMDtcbiAgICAgIGxldCBieXRlTGVuZ3RoID0gYXJnMC5ieXRlTGVuZ3RoO1xuICAgICAgaWYgKHR5cGVvZiBhcmcxID09PSAnb2JqZWN0JyAmJiBhcmcxICE9PSBudWxsKSB7XG4gICAgICAgIG9wdGlvbnMgPSBhcmcxO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgYXJnMSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgYnl0ZU9mZnNldCA9IGFyZzE7XG4gICAgICAgIGlmICghTnVtYmVyLmlzU2FmZUludGVnZXIoYnl0ZU9mZnNldCkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihcIidieXRlT2Zmc2V0JyBtdXN0IGJlIGFuIGludGVnZXIuXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChieXRlT2Zmc2V0IDwgMCB8fCBieXRlT2Zmc2V0ID49IGJ1ZmZlci5ieXRlTGVuZ3RoKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoYCdieXRlT2Zmc2V0JyBpcyBvdXQgb2YgcmFuZ2UgWzAsICR7YnVmZmVyLmJ5dGVMZW5ndGh9KS5gKTtcbiAgICAgICAgfVxuICAgICAgICBieXRlTGVuZ3RoID0gYXJnMC5ieXRlTGVuZ3RoIC0gYnl0ZU9mZnNldDtcbiAgICAgICAgaWYgKHR5cGVvZiBhcmcyID09PSAnbnVtYmVyJykge1xuICAgICAgICAgIGJ5dGVMZW5ndGggPSBhcmcyO1xuICAgICAgICAgIGlmICghTnVtYmVyLmlzU2FmZUludGVnZXIoYnl0ZUxlbmd0aCkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKFwiJ2J5dGVMZW5ndGgnIG11c3QgYmUgYW4gaW50ZWdlci5cIik7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChieXRlTGVuZ3RoIDw9IDAgfHwgYnl0ZU9mZnNldCArIGJ5dGVMZW5ndGggPiBidWZmZXIuYnl0ZUxlbmd0aCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoYCdieXRlTGVuZ3RoJyBpcyBvdXQgb2YgcmFuZ2UgKDAsICR7YnVmZmVyLmJ5dGVMZW5ndGggLSBieXRlT2Zmc2V0fV0uYCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgYXJnMyA9PT0gJ29iamVjdCcgJiYgYXJnMyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgb3B0aW9ucyA9IGFyZzM7XG4gICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgYXJnMyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCInb3B0aW9ucycgbXVzdCBiZSBhbiBvYmplY3QuXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgYXJnMiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiJ2J5dGVMZW5ndGgnIG11c3QgYmUgYSBudW1iZXIuXCIpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBhcmcxICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiJ29wdGlvbnMnIG11c3QgYmUgYW4gb2JqZWN0LlwiKTtcbiAgICAgIH1cbiAgICAgIGZpbGVQYXRoT3JVaW50OEFycmF5ID0gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyLCBieXRlT2Zmc2V0LCBieXRlTGVuZ3RoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlVuZXhwZWN0ZWQgYXJndW1lbnRbMF06IG11c3QgYmUgJ3BhdGgnIG9yICdidWZmZXInLlwiKTtcbiAgICB9XG5cbiAgICAvLyByZXNvbHZlIGJhY2tlbmQsIHVwZGF0ZSBzZXNzaW9uIG9wdGlvbnMgd2l0aCB2YWxpZGF0ZWQgRVBzLCBhbmQgY3JlYXRlIHNlc3Npb24gaGFuZGxlclxuICAgIGNvbnN0IFtiYWNrZW5kLCBvcHRpb25zV2l0aFZhbGlkYXRlZEVQc10gPSBhd2FpdCByZXNvbHZlQmFja2VuZEFuZEV4ZWN1dGlvblByb3ZpZGVycyhvcHRpb25zKTtcbiAgICBjb25zdCBoYW5kbGVyID0gYXdhaXQgYmFja2VuZC5jcmVhdGVJbmZlcmVuY2VTZXNzaW9uSGFuZGxlcihmaWxlUGF0aE9yVWludDhBcnJheSwgb3B0aW9uc1dpdGhWYWxpZGF0ZWRFUHMpO1xuICAgIFRSQUNFX0VWRU5UX0VORCgnSW5mZXJlbmNlU2Vzc2lvbi5jcmVhdGUnKTtcbiAgICBUUkFDRV9GVU5DX0VORCgpO1xuICAgIHJldHVybiBuZXcgSW5mZXJlbmNlU2Vzc2lvbihoYW5kbGVyKTtcbiAgfVxuXG4gIHN0YXJ0UHJvZmlsaW5nKCk6IHZvaWQge1xuICAgIHRoaXMuaGFuZGxlci5zdGFydFByb2ZpbGluZygpO1xuICB9XG4gIGVuZFByb2ZpbGluZygpOiB2b2lkIHtcbiAgICB0aGlzLmhhbmRsZXIuZW5kUHJvZmlsaW5nKCk7XG4gIH1cblxuICBnZXQgaW5wdXROYW1lcygpOiByZWFkb25seSBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIHRoaXMuaGFuZGxlci5pbnB1dE5hbWVzO1xuICB9XG4gIGdldCBvdXRwdXROYW1lcygpOiByZWFkb25seSBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIHRoaXMuaGFuZGxlci5vdXRwdXROYW1lcztcbiAgfVxuXG4gIGdldCBpbnB1dE1ldGFkYXRhKCk6IHJlYWRvbmx5IEluZmVyZW5jZVNlc3Npb25JbnRlcmZhY2UuVmFsdWVNZXRhZGF0YVtdIHtcbiAgICByZXR1cm4gdGhpcy5oYW5kbGVyLmlucHV0TWV0YWRhdGE7XG4gIH1cblxuICBnZXQgb3V0cHV0TWV0YWRhdGEoKTogcmVhZG9ubHkgSW5mZXJlbmNlU2Vzc2lvbkludGVyZmFjZS5WYWx1ZU1ldGFkYXRhW10ge1xuICAgIHJldHVybiB0aGlzLmhhbmRsZXIub3V0cHV0TWV0YWRhdGE7XG4gIH1cblxuICBwcml2YXRlIGhhbmRsZXI6IEluZmVyZW5jZVNlc3Npb25IYW5kbGVyO1xufVxuIiwgIi8vIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuXG5pbXBvcnQgeyBJbmZlcmVuY2VTZXNzaW9uIGFzIEluZmVyZW5jZVNlc3Npb25JbXBsIH0gZnJvbSAnLi9pbmZlcmVuY2Utc2Vzc2lvbi1pbXBsLmpzJztcbmltcG9ydCB7IE9ubnhNb2RlbE9wdGlvbnMgfSBmcm9tICcuL29ubngtbW9kZWwuanMnO1xuaW1wb3J0IHsgT25ueFZhbHVlLCBPbm54VmFsdWVEYXRhTG9jYXRpb24gfSBmcm9tICcuL29ubngtdmFsdWUuanMnO1xuaW1wb3J0IHR5cGUgeyBUZW5zb3IgfSBmcm9tICcuL3RlbnNvci5qcyc7XG5pbXBvcnQgeyBUcnlHZXRHbG9iYWxUeXBlIH0gZnJvbSAnLi90eXBlLWhlbHBlci5qcyc7XG5cbi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1yZWRlY2xhcmUgKi9cblxuZXhwb3J0IGRlY2xhcmUgbmFtZXNwYWNlIEluZmVyZW5jZVNlc3Npb24ge1xuICAvLyAjcmVnaW9uIGlucHV0L291dHB1dCB0eXBlc1xuXG4gIHR5cGUgT25ueFZhbHVlTWFwVHlwZSA9IHsgcmVhZG9ubHkgW25hbWU6IHN0cmluZ106IE9ubnhWYWx1ZSB9O1xuICB0eXBlIE51bGxhYmxlT25ueFZhbHVlTWFwVHlwZSA9IHsgcmVhZG9ubHkgW25hbWU6IHN0cmluZ106IE9ubnhWYWx1ZSB8IG51bGwgfTtcblxuICAvKipcbiAgICogQSBmZWVkcyAobW9kZWwgaW5wdXRzKSBpcyBhbiBvYmplY3QgdGhhdCB1c2VzIGlucHV0IG5hbWVzIGFzIGtleXMgYW5kIE9ubnhWYWx1ZSBhcyBjb3JyZXNwb25kaW5nIHZhbHVlcy5cbiAgICovXG4gIHR5cGUgRmVlZHNUeXBlID0gT25ueFZhbHVlTWFwVHlwZTtcblxuICAvKipcbiAgICogQSBmZXRjaGVzIChtb2RlbCBvdXRwdXRzKSBjb3VsZCBiZSBvbmUgb2YgdGhlIGZvbGxvd2luZzpcbiAgICpcbiAgICogLSBPbWl0dGVkLiBVc2UgbW9kZWwncyBvdXRwdXQgbmFtZXMgZGVmaW5pdGlvbi5cbiAgICogLSBBbiBhcnJheSBvZiBzdHJpbmcgaW5kaWNhdGluZyB0aGUgb3V0cHV0IG5hbWVzLlxuICAgKiAtIEFuIG9iamVjdCB0aGF0IHVzZSBvdXRwdXQgbmFtZXMgYXMga2V5cyBhbmQgT25ueFZhbHVlIG9yIG51bGwgYXMgY29ycmVzcG9uZGluZyB2YWx1ZXMuXG4gICAqXG4gICAqIEByZW1hcmtcbiAgICogZGlmZmVyZW50IGZyb20gaW5wdXQgYXJndW1lbnQsIGluIG91dHB1dCwgT25ueFZhbHVlIGlzIG9wdGlvbmFsLiBJZiBhbiBPbm54VmFsdWUgaXMgcHJlc2VudCBpdCB3aWxsIGJlXG4gICAqIHVzZWQgYXMgYSBwcmUtYWxsb2NhdGVkIHZhbHVlIGJ5IHRoZSBpbmZlcmVuY2UgZW5naW5lOyBpZiBvbWl0dGVkLCBpbmZlcmVuY2UgZW5naW5lIHdpbGwgYWxsb2NhdGUgYnVmZmVyXG4gICAqIGludGVybmFsbHkuXG4gICAqL1xuICB0eXBlIEZldGNoZXNUeXBlID0gcmVhZG9ubHkgc3RyaW5nW10gfCBOdWxsYWJsZU9ubnhWYWx1ZU1hcFR5cGU7XG5cbiAgLyoqXG4gICAqIEEgaW5mZXJlbmNpbmcgcmV0dXJuIHR5cGUgaXMgYW4gb2JqZWN0IHRoYXQgdXNlcyBvdXRwdXQgbmFtZXMgYXMga2V5cyBhbmQgT25ueFZhbHVlIGFzIGNvcnJlc3BvbmRpbmcgdmFsdWVzLlxuICAgKi9cbiAgdHlwZSBSZXR1cm5UeXBlID0gT25ueFZhbHVlTWFwVHlwZTtcblxuICAvLyAjZW5kcmVnaW9uXG5cbiAgLy8gI3JlZ2lvbiBzZXNzaW9uIG9wdGlvbnNcblxuICAvKipcbiAgICogQSBzZXQgb2YgY29uZmlndXJhdGlvbnMgZm9yIHNlc3Npb24gYmVoYXZpb3IuXG4gICAqL1xuICBleHBvcnQgaW50ZXJmYWNlIFNlc3Npb25PcHRpb25zIGV4dGVuZHMgT25ueE1vZGVsT3B0aW9ucyB7XG4gICAgLyoqXG4gICAgICogQW4gYXJyYXkgb2YgZXhlY3V0aW9uIHByb3ZpZGVyIG9wdGlvbnMuXG4gICAgICpcbiAgICAgKiBBbiBleGVjdXRpb24gcHJvdmlkZXIgb3B0aW9uIGNhbiBiZSBhIHN0cmluZyBpbmRpY2F0aW5nIHRoZSBuYW1lIG9mIHRoZSBleGVjdXRpb24gcHJvdmlkZXIsXG4gICAgICogb3IgYW4gb2JqZWN0IG9mIGNvcnJlc3BvbmRpbmcgdHlwZS5cbiAgICAgKi9cbiAgICBleGVjdXRpb25Qcm92aWRlcnM/OiByZWFkb25seSBFeGVjdXRpb25Qcm92aWRlckNvbmZpZ1tdO1xuXG4gICAgLyoqXG4gICAgICogVGhlIGludHJhIE9QIHRocmVhZHMgbnVtYmVyLlxuICAgICAqXG4gICAgICogVGhpcyBzZXR0aW5nIGlzIGF2YWlsYWJsZSBvbmx5IGluIE9OTlhSdW50aW1lIChOb2RlLmpzIGJpbmRpbmcgYW5kIHJlYWN0LW5hdGl2ZSkuXG4gICAgICovXG4gICAgaW50cmFPcE51bVRocmVhZHM/OiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgaW50ZXIgT1AgdGhyZWFkcyBudW1iZXIuXG4gICAgICpcbiAgICAgKiBUaGlzIHNldHRpbmcgaXMgYXZhaWxhYmxlIG9ubHkgaW4gT05OWFJ1bnRpbWUgKE5vZGUuanMgYmluZGluZyBhbmQgcmVhY3QtbmF0aXZlKS5cbiAgICAgKi9cbiAgICBpbnRlck9wTnVtVGhyZWFkcz86IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIFRoZSBmcmVlIGRpbWVuc2lvbiBvdmVycmlkZS5cbiAgICAgKlxuICAgICAqIFRoaXMgc2V0dGluZyBpcyBhdmFpbGFibGUgb25seSBpbiBPTk5YUnVudGltZSAoTm9kZS5qcyBiaW5kaW5nIGFuZCByZWFjdC1uYXRpdmUpIG9yIFdlYkFzc2VtYmx5IGJhY2tlbmRcbiAgICAgKi9cbiAgICBmcmVlRGltZW5zaW9uT3ZlcnJpZGVzPzogeyByZWFkb25seSBbZGltZW5zaW9uTmFtZTogc3RyaW5nXTogbnVtYmVyIH07XG5cbiAgICAvKipcbiAgICAgKiBUaGUgb3B0aW1pemF0aW9uIGxldmVsLlxuICAgICAqXG4gICAgICogVGhpcyBzZXR0aW5nIGlzIGF2YWlsYWJsZSBvbmx5IGluIE9OTlhSdW50aW1lIChOb2RlLmpzIGJpbmRpbmcgYW5kIHJlYWN0LW5hdGl2ZSkgb3IgV2ViQXNzZW1ibHkgYmFja2VuZFxuICAgICAqL1xuICAgIGdyYXBoT3B0aW1pemF0aW9uTGV2ZWw/OiAnZGlzYWJsZWQnIHwgJ2Jhc2ljJyB8ICdleHRlbmRlZCcgfCAnbGF5b3V0JyB8ICdhbGwnO1xuXG4gICAgLyoqXG4gICAgICogV2hldGhlciBlbmFibGUgQ1BVIG1lbW9yeSBhcmVuYS5cbiAgICAgKlxuICAgICAqIFRoaXMgc2V0dGluZyBpcyBhdmFpbGFibGUgb25seSBpbiBPTk5YUnVudGltZSAoTm9kZS5qcyBiaW5kaW5nIGFuZCByZWFjdC1uYXRpdmUpIG9yIFdlYkFzc2VtYmx5IGJhY2tlbmRcbiAgICAgKi9cbiAgICBlbmFibGVDcHVNZW1BcmVuYT86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIGVuYWJsZSBtZW1vcnkgcGF0dGVybi5cbiAgICAgKlxuICAgICAqIFRoaXMgc2V0dGluZyBpcyBhdmFpbGFibGUgb25seSBpbiBPTk5YUnVudGltZSAoTm9kZS5qcyBiaW5kaW5nIGFuZCByZWFjdC1uYXRpdmUpIG9yIFdlYkFzc2VtYmx5IGJhY2tlbmRcbiAgICAgKi9cbiAgICBlbmFibGVNZW1QYXR0ZXJuPzogYm9vbGVhbjtcblxuICAgIC8qKlxuICAgICAqIEV4ZWN1dGlvbiBtb2RlLlxuICAgICAqXG4gICAgICogVGhpcyBzZXR0aW5nIGlzIGF2YWlsYWJsZSBvbmx5IGluIE9OTlhSdW50aW1lIChOb2RlLmpzIGJpbmRpbmcgYW5kIHJlYWN0LW5hdGl2ZSkgb3IgV2ViQXNzZW1ibHkgYmFja2VuZFxuICAgICAqL1xuICAgIGV4ZWN1dGlvbk1vZGU/OiAnc2VxdWVudGlhbCcgfCAncGFyYWxsZWwnO1xuXG4gICAgLyoqXG4gICAgICogT3B0aW1pemVkIG1vZGVsIGZpbGUgcGF0aC5cbiAgICAgKlxuICAgICAqIElmIHRoaXMgc2V0dGluZyBpcyBzcGVjaWZpZWQsIHRoZSBvcHRpbWl6ZWQgbW9kZWwgd2lsbCBiZSBkdW1wZWQuIEluIGJyb3dzZXIsIGEgYmxvYiB3aWxsIGJlIGNyZWF0ZWRcbiAgICAgKiB3aXRoIGEgcG9wLXVwIHdpbmRvdy5cbiAgICAgKi9cbiAgICBvcHRpbWl6ZWRNb2RlbEZpbGVQYXRoPzogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogV2hldGhlciBlbmFibGUgcHJvZmlsaW5nLlxuICAgICAqXG4gICAgICogVGhpcyBzZXR0aW5nIGlzIGEgcGxhY2Vob2xkZXIgZm9yIGEgZnV0dXJlIHVzZS5cbiAgICAgKi9cbiAgICBlbmFibGVQcm9maWxpbmc/OiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogRmlsZSBwcmVmaXggZm9yIHByb2ZpbGluZy5cbiAgICAgKlxuICAgICAqIFRoaXMgc2V0dGluZyBpcyBhIHBsYWNlaG9sZGVyIGZvciBhIGZ1dHVyZSB1c2UuXG4gICAgICovXG4gICAgcHJvZmlsZUZpbGVQcmVmaXg/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBMb2cgSUQuXG4gICAgICpcbiAgICAgKiBUaGlzIHNldHRpbmcgaXMgYXZhaWxhYmxlIG9ubHkgaW4gT05OWFJ1bnRpbWUgKE5vZGUuanMgYmluZGluZyBhbmQgcmVhY3QtbmF0aXZlKSBvciBXZWJBc3NlbWJseSBiYWNrZW5kXG4gICAgICovXG4gICAgbG9nSWQ/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBMb2cgc2V2ZXJpdHkgbGV2ZWwuIFNlZVxuICAgICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvb25ueHJ1bnRpbWUvYmxvYi9tYWluL2luY2x1ZGUvb25ueHJ1bnRpbWUvY29yZS9jb21tb24vbG9nZ2luZy9zZXZlcml0eS5oXG4gICAgICpcbiAgICAgKiBUaGlzIHNldHRpbmcgaXMgYXZhaWxhYmxlIG9ubHkgaW4gT05OWFJ1bnRpbWUgKE5vZGUuanMgYmluZGluZyBhbmQgcmVhY3QtbmF0aXZlKSBvciBXZWJBc3NlbWJseSBiYWNrZW5kXG4gICAgICovXG4gICAgbG9nU2V2ZXJpdHlMZXZlbD86IDAgfCAxIHwgMiB8IDMgfCA0O1xuXG4gICAgLyoqXG4gICAgICogTG9nIHZlcmJvc2l0eSBsZXZlbC5cbiAgICAgKlxuICAgICAqIFRoaXMgc2V0dGluZyBpcyBhdmFpbGFibGUgb25seSBpbiBXZWJBc3NlbWJseSBiYWNrZW5kLiBXaWxsIHN1cHBvcnQgTm9kZS5qcyBiaW5kaW5nIGFuZCByZWFjdC1uYXRpdmUgbGF0ZXJcbiAgICAgKi9cbiAgICBsb2dWZXJib3NpdHlMZXZlbD86IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIFNwZWNpZnkgc3RyaW5nIGFzIGEgcHJlZmVycmVkIGRhdGEgbG9jYXRpb24gZm9yIGFsbCBvdXRwdXRzLCBvciBhbiBvYmplY3QgdGhhdCB1c2Ugb3V0cHV0IG5hbWVzIGFzIGtleXMgYW5kIGFcbiAgICAgKiBwcmVmZXJyZWQgZGF0YSBsb2NhdGlvbiBhcyBjb3JyZXNwb25kaW5nIHZhbHVlcy5cbiAgICAgKlxuICAgICAqIFRoaXMgc2V0dGluZyBpcyBhdmFpbGFibGUgb25seSBpbiBPTk5YUnVudGltZSBXZWIgZm9yIFdlYkdMIGFuZCBXZWJHUFUgRVAuXG4gICAgICovXG4gICAgcHJlZmVycmVkT3V0cHV0TG9jYXRpb24/OiBPbm54VmFsdWVEYXRhTG9jYXRpb24gfCB7IHJlYWRvbmx5IFtvdXRwdXROYW1lOiBzdHJpbmddOiBPbm54VmFsdWVEYXRhTG9jYXRpb24gfTtcblxuICAgIC8qKlxuICAgICAqIFdoZXRoZXIgZW5hYmxlIGdyYXBoIGNhcHR1cmUuXG4gICAgICogVGhpcyBzZXR0aW5nIGlzIGF2YWlsYWJsZSBvbmx5IGluIE9OTlhSdW50aW1lIFdlYiBmb3IgV2ViR1BVIEVQLlxuICAgICAqL1xuICAgIGVuYWJsZUdyYXBoQ2FwdHVyZT86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBTdG9yZSBjb25maWd1cmF0aW9ucyBmb3IgYSBzZXNzaW9uLiBTZWVcbiAgICAgKiBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L29ubnhydW50aW1lL2Jsb2IvbWFpbi9pbmNsdWRlL29ubnhydW50aW1lL2NvcmUvc2Vzc2lvbi9cbiAgICAgKiBvbm54cnVudGltZV9zZXNzaW9uX29wdGlvbnNfY29uZmlnX2tleXMuaFxuICAgICAqXG4gICAgICogVGhpcyBzZXR0aW5nIGlzIGF2YWlsYWJsZSBvbmx5IGluIFdlYkFzc2VtYmx5IGJhY2tlbmQuIFdpbGwgc3VwcG9ydCBOb2RlLmpzIGJpbmRpbmcgYW5kIHJlYWN0LW5hdGl2ZSBsYXRlclxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGBqc1xuICAgICAqIGV4dHJhOiB7XG4gICAgICogICBzZXNzaW9uOiB7XG4gICAgICogICAgIHNldF9kZW5vcm1hbF9hc196ZXJvOiBcIjFcIixcbiAgICAgKiAgICAgZGlzYWJsZV9wcmVwYWNraW5nOiBcIjFcIlxuICAgICAqICAgfSxcbiAgICAgKiAgIG9wdGltaXphdGlvbjoge1xuICAgICAqICAgICBlbmFibGVfZ2VsdV9hcHByb3hpbWF0aW9uOiBcIjFcIlxuICAgICAqICAgfVxuICAgICAqIH1cbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBleHRyYT86IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICB9XG5cbiAgLy8gI3JlZ2lvbiBleGVjdXRpb24gcHJvdmlkZXJzXG5cbiAgLy8gQ3VycmVudGx5LCB3ZSBoYXZlIHRoZSBmb2xsb3dpbmcgYmFja2VuZHMgdG8gc3VwcG9ydCBleGVjdXRpb24gcHJvdmlkZXJzOlxuICAvLyBCYWNrZW5kIE5vZGUuanMgYmluZGluZzogc3VwcG9ydHMgJ2NwdScsICdkbWwnICh3aW4zMiksICdjb3JlbWwnIChtYWNPUykgYW5kICdjdWRhJyAobGludXgpLlxuICAvLyBCYWNrZW5kIFdlYkFzc2VtYmx5OiBzdXBwb3J0cyAnY3B1JywgJ3dhc20nLCAnd2ViZ3B1JyBhbmQgJ3dlYm5uJy5cbiAgLy8gQmFja2VuZCBPTk5YLmpzOiBzdXBwb3J0cyAnd2ViZ2wnLlxuICAvLyBCYWNrZW5kIFJlYWN0IE5hdGl2ZTogc3VwcG9ydHMgJ2NwdScsICd4bm5wYWNrJywgJ2NvcmVtbCcgKGlPUyksICdubmFwaScgKEFuZHJvaWQpLlxuICBpbnRlcmZhY2UgRXhlY3V0aW9uUHJvdmlkZXJPcHRpb25NYXAge1xuICAgIGNvcmVtbDogQ29yZU1MRXhlY3V0aW9uUHJvdmlkZXJPcHRpb247XG4gICAgY3B1OiBDcHVFeGVjdXRpb25Qcm92aWRlck9wdGlvbjtcbiAgICBjdWRhOiBDdWRhRXhlY3V0aW9uUHJvdmlkZXJPcHRpb247XG4gICAgZG1sOiBEbWxFeGVjdXRpb25Qcm92aWRlck9wdGlvbjtcbiAgICBubmFwaTogTm5hcGlFeGVjdXRpb25Qcm92aWRlck9wdGlvbjtcbiAgICB0ZW5zb3JydDogVGVuc29yUnRFeGVjdXRpb25Qcm92aWRlck9wdGlvbjtcbiAgICB3YXNtOiBXZWJBc3NlbWJseUV4ZWN1dGlvblByb3ZpZGVyT3B0aW9uO1xuICAgIHdlYmdsOiBXZWJHTEV4ZWN1dGlvblByb3ZpZGVyT3B0aW9uO1xuICAgIHdlYmdwdTogV2ViR3B1RXhlY3V0aW9uUHJvdmlkZXJPcHRpb247XG4gICAgd2Vibm46IFdlYk5ORXhlY3V0aW9uUHJvdmlkZXJPcHRpb247XG4gICAgcW5uOiBRbm5FeGVjdXRpb25Qcm92aWRlck9wdGlvbjtcbiAgICB4bm5wYWNrOiBYbm5wYWNrRXhlY3V0aW9uUHJvdmlkZXJPcHRpb247XG4gIH1cblxuICB0eXBlIEV4ZWN1dGlvblByb3ZpZGVyTmFtZSA9IGtleW9mIEV4ZWN1dGlvblByb3ZpZGVyT3B0aW9uTWFwO1xuICB0eXBlIEV4ZWN1dGlvblByb3ZpZGVyQ29uZmlnID1cbiAgICB8IEV4ZWN1dGlvblByb3ZpZGVyT3B0aW9uTWFwW0V4ZWN1dGlvblByb3ZpZGVyTmFtZV1cbiAgICB8IEV4ZWN1dGlvblByb3ZpZGVyT3B0aW9uXG4gICAgfCBFeGVjdXRpb25Qcm92aWRlck5hbWVcbiAgICB8IHN0cmluZztcblxuICBleHBvcnQgaW50ZXJmYWNlIEV4ZWN1dGlvblByb3ZpZGVyT3B0aW9uIHtcbiAgICByZWFkb25seSBuYW1lOiBzdHJpbmc7XG4gIH1cbiAgZXhwb3J0IGludGVyZmFjZSBDcHVFeGVjdXRpb25Qcm92aWRlck9wdGlvbiBleHRlbmRzIEV4ZWN1dGlvblByb3ZpZGVyT3B0aW9uIHtcbiAgICByZWFkb25seSBuYW1lOiAnY3B1JztcbiAgICB1c2VBcmVuYT86IGJvb2xlYW47XG4gIH1cbiAgZXhwb3J0IGludGVyZmFjZSBDdWRhRXhlY3V0aW9uUHJvdmlkZXJPcHRpb24gZXh0ZW5kcyBFeGVjdXRpb25Qcm92aWRlck9wdGlvbiB7XG4gICAgcmVhZG9ubHkgbmFtZTogJ2N1ZGEnO1xuICAgIGRldmljZUlkPzogbnVtYmVyO1xuICB9XG4gIGV4cG9ydCBpbnRlcmZhY2UgRG1sRXhlY3V0aW9uUHJvdmlkZXJPcHRpb24gZXh0ZW5kcyBFeGVjdXRpb25Qcm92aWRlck9wdGlvbiB7XG4gICAgcmVhZG9ubHkgbmFtZTogJ2RtbCc7XG4gICAgZGV2aWNlSWQ/OiBudW1iZXI7XG4gIH1cbiAgZXhwb3J0IGludGVyZmFjZSBUZW5zb3JSdEV4ZWN1dGlvblByb3ZpZGVyT3B0aW9uIGV4dGVuZHMgRXhlY3V0aW9uUHJvdmlkZXJPcHRpb24ge1xuICAgIHJlYWRvbmx5IG5hbWU6ICd0ZW5zb3JydCc7XG4gICAgZGV2aWNlSWQ/OiBudW1iZXI7XG4gIH1cbiAgZXhwb3J0IGludGVyZmFjZSBXZWJBc3NlbWJseUV4ZWN1dGlvblByb3ZpZGVyT3B0aW9uIGV4dGVuZHMgRXhlY3V0aW9uUHJvdmlkZXJPcHRpb24ge1xuICAgIHJlYWRvbmx5IG5hbWU6ICd3YXNtJztcbiAgfVxuICBleHBvcnQgaW50ZXJmYWNlIFdlYkdMRXhlY3V0aW9uUHJvdmlkZXJPcHRpb24gZXh0ZW5kcyBFeGVjdXRpb25Qcm92aWRlck9wdGlvbiB7XG4gICAgcmVhZG9ubHkgbmFtZTogJ3dlYmdsJztcbiAgICAvLyBUT0RPOiBhZGQgZmxhZ3NcbiAgfVxuICBleHBvcnQgaW50ZXJmYWNlIFhubnBhY2tFeGVjdXRpb25Qcm92aWRlck9wdGlvbiBleHRlbmRzIEV4ZWN1dGlvblByb3ZpZGVyT3B0aW9uIHtcbiAgICByZWFkb25seSBuYW1lOiAneG5ucGFjayc7XG4gIH1cbiAgZXhwb3J0IGludGVyZmFjZSBXZWJHcHVFeGVjdXRpb25Qcm92aWRlck9wdGlvbiBleHRlbmRzIEV4ZWN1dGlvblByb3ZpZGVyT3B0aW9uIHtcbiAgICByZWFkb25seSBuYW1lOiAnd2ViZ3B1JztcblxuICAgIC8qKlxuICAgICAqIFNwZWNpZnkgdGhlIHByZWZlcnJlZCBsYXlvdXQgd2hlbiBydW5uaW5nIGxheW91dCBzZW5zaXRpdmUgb3BlcmF0b3JzLlxuICAgICAqXG4gICAgICogQGRlZmF1bHQgJ05DSFcnXG4gICAgICovXG4gICAgcHJlZmVycmVkTGF5b3V0PzogJ05DSFcnIHwgJ05IV0MnO1xuXG4gICAgLyoqXG4gICAgICogU3BlY2lmeSBhIGxpc3Qgb2Ygbm9kZSBuYW1lcyB0aGF0IHNob3VsZCBiZSBleGVjdXRlZCBvbiBDUFUgZXZlbiB3aGVuIFdlYkdQVSBFUCBpcyB1c2VkLlxuICAgICAqL1xuICAgIGZvcmNlQ3B1Tm9kZU5hbWVzPzogcmVhZG9ubHkgc3RyaW5nW107XG5cbiAgICAvKipcbiAgICAgKiBTcGVjaWZ5IHRoZSB2YWxpZGF0aW9uIG1vZGUgZm9yIFdlYkdQVSBleGVjdXRpb24gcHJvdmlkZXIuXG4gICAgICogLSAnZGlzYWJsZWQnOiBEaXNhYmxlIGFsbCB2YWxpZGF0aW9uLlxuICAgICAqIFdoZW4gdXNlZCBpbiBOb2RlLmpzLCBkaXNhYmxlIHZhbGlkYXRpb24gbWF5IGNhdXNlIHByb2Nlc3MgY3Jhc2ggaWYgV2ViR1BVIGVycm9ycyBvY2N1ci4gQmUgY2F1dGlvdXMgd2hlbiB1c2luZ1xuICAgICAqIHRoaXMgbW9kZS5cbiAgICAgKiBXaGVuIHVzZWQgaW4gd2ViLCB0aGlzIG1vZGUgaXMgZXF1aXZhbGVudCB0byAnd2dwdU9ubHknLlxuICAgICAqIC0gJ3dncHVPbmx5JzogUGVyZm9ybSBXZWJHUFUgaW50ZXJuYWwgdmFsaWRhdGlvbiBvbmx5LlxuICAgICAqIC0gJ2Jhc2ljJzogUGVyZm9ybSBiYXNpYyB2YWxpZGF0aW9uIGluY2x1ZGluZyBXZWJHUFUgaW50ZXJuYWwgdmFsaWRhdGlvbi4gVGhpcyBpcyB0aGUgZGVmYXVsdCBtb2RlLlxuICAgICAqIC0gJ2Z1bGwnOiBQZXJmb3JtIGZ1bGwgdmFsaWRhdGlvbi4gVGhpcyBtb2RlIG1heSBoYXZlIHBlcmZvcm1hbmNlIGltcGFjdC4gVXNlIGl0IGZvciBkZWJ1Z2dpbmcgcHVycG9zZS5cbiAgICAgKlxuICAgICAqIEBkZWZhdWx0ICdiYXNpYydcbiAgICAgKi9cbiAgICB2YWxpZGF0aW9uTW9kZT86ICdkaXNhYmxlZCcgfCAnd2dwdU9ubHknIHwgJ2Jhc2ljJyB8ICdmdWxsJztcblxuICAgIC8qKlxuICAgICAqIFNwZWNpZnkgYW4gb3B0aW9uYWwgV2ViR1BVIGRldmljZSB0byBiZSB1c2VkIGJ5IHRoZSBXZWJHUFUgZXhlY3V0aW9uIHByb3ZpZGVyLlxuICAgICAqL1xuICAgIGRldmljZT86IFRyeUdldEdsb2JhbFR5cGU8J0dQVURldmljZSc+O1xuICB9XG5cbiAgLy8gI3JlZ2lvbiBXZWJOTiBvcHRpb25zXG5cbiAgaW50ZXJmYWNlIFdlYk5ORXhlY3V0aW9uUHJvdmlkZXJOYW1lIGV4dGVuZHMgRXhlY3V0aW9uUHJvdmlkZXJPcHRpb24ge1xuICAgIHJlYWRvbmx5IG5hbWU6ICd3ZWJubic7XG4gIH1cblxuICAvKipcbiAgICogUmVwcmVzZW50cyBhIHNldCBvZiBvcHRpb25zIGZvciBjcmVhdGluZyBhIFdlYk5OIE1MQ29udGV4dC5cbiAgICpcbiAgICogQHNlZSBodHRwczovL3d3dy53My5vcmcvVFIvd2Vibm4vI2RpY3RkZWYtbWxjb250ZXh0b3B0aW9uc1xuICAgKi9cbiAgZXhwb3J0IGludGVyZmFjZSBXZWJOTkNvbnRleHRPcHRpb25zIHtcbiAgICBkZXZpY2VUeXBlPzogJ2NwdScgfCAnZ3B1JyB8ICducHUnO1xuICAgIG51bVRocmVhZHM/OiBudW1iZXI7XG4gICAgcG93ZXJQcmVmZXJlbmNlPzogJ2RlZmF1bHQnIHwgJ2xvdy1wb3dlcicgfCAnaGlnaC1wZXJmb3JtYW5jZSc7XG4gIH1cblxuICAvKipcbiAgICogUmVwcmVzZW50cyBhIHNldCBvZiBvcHRpb25zIGZvciBXZWJOTiBleGVjdXRpb24gcHJvdmlkZXIgd2l0aG91dCBNTENvbnRleHQuXG4gICAqL1xuICBleHBvcnQgaW50ZXJmYWNlIFdlYk5OT3B0aW9uc1dpdGhvdXRNTENvbnRleHQgZXh0ZW5kcyBXZWJOTkV4ZWN1dGlvblByb3ZpZGVyTmFtZSwgV2ViTk5Db250ZXh0T3B0aW9ucyB7XG4gICAgY29udGV4dD86IG5ldmVyO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlcHJlc2VudHMgYSBzZXQgb2Ygb3B0aW9ucyBmb3IgV2ViTk4gZXhlY3V0aW9uIHByb3ZpZGVyIHdpdGggTUxDb250ZXh0LlxuICAgKlxuICAgKiBXaGVuIE1MQ29udGV4dCBpcyBwcm92aWRlZCwgdGhlIGRldmljZVR5cGUgaXMgYWxzbyByZXF1aXJlZCBzbyB0aGF0IHRoZSBXZWJOTiBFUCBjYW4gZGV0ZXJtaW5lIHRoZSBwcmVmZXJyZWRcbiAgICogY2hhbm5lbCBsYXlvdXQuXG4gICAqXG4gICAqIEBzZWUgaHR0cHM6Ly93d3cudzMub3JnL1RSL3dlYm5uLyNkb20tbWwtY3JlYXRlY29udGV4dFxuICAgKi9cbiAgZXhwb3J0IGludGVyZmFjZSBXZWJOTk9wdGlvbnNXaXRoTUxDb250ZXh0XG4gICAgZXh0ZW5kcyBXZWJOTkV4ZWN1dGlvblByb3ZpZGVyTmFtZSxcbiAgICAgIE9taXQ8V2ViTk5Db250ZXh0T3B0aW9ucywgJ2RldmljZVR5cGUnPixcbiAgICAgIFJlcXVpcmVkPFBpY2s8V2ViTk5Db250ZXh0T3B0aW9ucywgJ2RldmljZVR5cGUnPj4ge1xuICAgIGNvbnRleHQ6IFRyeUdldEdsb2JhbFR5cGU8J01MQ29udGV4dCc+O1xuICB9XG5cbiAgLyoqXG4gICAqIFJlcHJlc2VudHMgYSBzZXQgb2Ygb3B0aW9ucyBmb3IgV2ViTk4gZXhlY3V0aW9uIHByb3ZpZGVyIHdpdGggTUxDb250ZXh0IHdoaWNoIGlzIGNyZWF0ZWQgZnJvbSBHUFVEZXZpY2UuXG4gICAqXG4gICAqIEBzZWUgaHR0cHM6Ly93d3cudzMub3JnL1RSL3dlYm5uLyNkb20tbWwtY3JlYXRlY29udGV4dC1ncHVkZXZpY2VcbiAgICovXG4gIGV4cG9ydCBpbnRlcmZhY2UgV2ViTk5PcHRpb25zV2ViR3B1IGV4dGVuZHMgV2ViTk5FeGVjdXRpb25Qcm92aWRlck5hbWUge1xuICAgIGNvbnRleHQ6IFRyeUdldEdsb2JhbFR5cGU8J01MQ29udGV4dCc+O1xuICAgIGdwdURldmljZTogVHJ5R2V0R2xvYmFsVHlwZTwnR1BVRGV2aWNlJz47XG4gIH1cblxuICAvKipcbiAgICogT3B0aW9ucyBmb3IgV2ViTk4gZXhlY3V0aW9uIHByb3ZpZGVyLlxuICAgKi9cbiAgZXhwb3J0IHR5cGUgV2ViTk5FeGVjdXRpb25Qcm92aWRlck9wdGlvbiA9XG4gICAgfCBXZWJOTk9wdGlvbnNXaXRob3V0TUxDb250ZXh0XG4gICAgfCBXZWJOTk9wdGlvbnNXaXRoTUxDb250ZXh0XG4gICAgfCBXZWJOTk9wdGlvbnNXZWJHcHU7XG5cbiAgLy8gI2VuZHJlZ2lvblxuXG4gIGV4cG9ydCBpbnRlcmZhY2UgUW5uRXhlY3V0aW9uUHJvdmlkZXJPcHRpb24gZXh0ZW5kcyBFeGVjdXRpb25Qcm92aWRlck9wdGlvbiB7XG4gICAgcmVhZG9ubHkgbmFtZTogJ3Fubic7XG4gICAgLyoqXG4gICAgICogU3BlY2lmeSB0aGUgUU5OIGJhY2tlbmQgdHlwZS4gRS5nLiwgJ2NwdScgb3IgJ2h0cCcuXG4gICAgICogTXV0dWFsbHkgZXhjbHVzaXZlIHdpdGggYGJhY2tlbmRQYXRoYC5cbiAgICAgKlxuICAgICAqIEBkZWZhdWx0ICdodHAnXG4gICAgICovXG4gICAgYmFja2VuZFR5cGU/OiBzdHJpbmc7XG4gICAgLyoqXG4gICAgICogU3BlY2lmeSBhIHBhdGggdG8gdGhlIFFOTiBiYWNrZW5kIGxpYnJhcnkuXG4gICAgICogTXV0dWFsbHkgZXhjbHVzaXZlIHdpdGggYGJhY2tlbmRUeXBlYC5cbiAgICAgKi9cbiAgICBiYWNrZW5kUGF0aD86IHN0cmluZztcbiAgICAvKipcbiAgICAgKiBTcGVjaWZ5IHdoZXRoZXIgdG8gZW5hYmxlIEhUUCBGUDE2IHByZWNpc2lvbi5cbiAgICAgKlxuICAgICAqIEBkZWZhdWx0IHRydWVcbiAgICAgKi9cbiAgICBlbmFibGVGcDE2UHJlY2lzaW9uPzogYm9vbGVhbjtcbiAgfVxuICBleHBvcnQgaW50ZXJmYWNlIENvcmVNTEV4ZWN1dGlvblByb3ZpZGVyT3B0aW9uIGV4dGVuZHMgRXhlY3V0aW9uUHJvdmlkZXJPcHRpb24ge1xuICAgIHJlYWRvbmx5IG5hbWU6ICdjb3JlbWwnO1xuICAgIC8qKlxuICAgICAqIFRoZSBiaXQgZmxhZ3MgZm9yIENvcmVNTCBleGVjdXRpb24gcHJvdmlkZXIuXG4gICAgICpcbiAgICAgKiBgYGBcbiAgICAgKiBDT1JFTUxfRkxBR19VU0VfQ1BVX09OTFkgPSAweDAwMVxuICAgICAqIENPUkVNTF9GTEFHX0VOQUJMRV9PTl9TVUJHUkFQSCA9IDB4MDAyXG4gICAgICogQ09SRU1MX0ZMQUdfT05MWV9FTkFCTEVfREVWSUNFX1dJVEhfQU5FID0gMHgwMDRcbiAgICAgKiBDT1JFTUxfRkxBR19PTkxZX0FMTE9XX1NUQVRJQ19JTlBVVF9TSEFQRVMgPSAweDAwOFxuICAgICAqIENPUkVNTF9GTEFHX0NSRUFURV9NTFBST0dSQU0gPSAweDAxMFxuICAgICAqIENPUkVNTF9GTEFHX1VTRV9DUFVfQU5EX0dQVSA9IDB4MDIwXG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBTZWUgaW5jbHVkZS9vbm54cnVudGltZS9jb3JlL3Byb3ZpZGVycy9jb3JlbWwvY29yZW1sX3Byb3ZpZGVyX2ZhY3RvcnkuaCBmb3IgbW9yZSBkZXRhaWxzLlxuICAgICAqXG4gICAgICogVGhpcyBmbGFnIGlzIGF2YWlsYWJsZSBvbmx5IGluIE9OTlhSdW50aW1lIChOb2RlLmpzIGJpbmRpbmcpLlxuICAgICAqL1xuICAgIGNvcmVNbEZsYWdzPzogbnVtYmVyO1xuICAgIC8qKlxuICAgICAqIFNwZWNpZnkgd2hldGhlciB0byB1c2UgQ1BVIG9ubHkgaW4gQ29yZU1MIEVQLlxuICAgICAqXG4gICAgICogVGhpcyBzZXR0aW5nIGlzIGF2YWlsYWJsZSBvbmx5IGluIE9OTlhSdW50aW1lIChyZWFjdC1uYXRpdmUpLlxuICAgICAqL1xuICAgIHVzZUNQVU9ubHk/OiBib29sZWFuO1xuICAgIHVzZUNQVUFuZEdQVT86IGJvb2xlYW47XG4gICAgLyoqXG4gICAgICogU3BlY2lmeSB3aGV0aGVyIHRvIGVuYWJsZSBDb3JlTUwgRVAgb24gc3ViZ3JhcGguXG4gICAgICpcbiAgICAgKiBUaGlzIHNldHRpbmcgaXMgYXZhaWxhYmxlIG9ubHkgaW4gT05OWFJ1bnRpbWUgKHJlYWN0LW5hdGl2ZSkuXG4gICAgICovXG4gICAgZW5hYmxlT25TdWJncmFwaD86IGJvb2xlYW47XG4gICAgLyoqXG4gICAgICogU3BlY2lmeSB3aGV0aGVyIHRvIG9ubHkgZW5hYmxlIENvcmVNTCBFUCBmb3IgQXBwbGUgZGV2aWNlcyB3aXRoIEFORSAoQXBwbGUgTmV1cmFsIEVuZ2luZSkuXG4gICAgICpcbiAgICAgKiBUaGlzIHNldHRpbmcgaXMgYXZhaWxhYmxlIG9ubHkgaW4gT05OWFJ1bnRpbWUgKHJlYWN0LW5hdGl2ZSkuXG4gICAgICovXG4gICAgb25seUVuYWJsZURldmljZVdpdGhBTkU/OiBib29sZWFuO1xuICB9XG4gIGV4cG9ydCBpbnRlcmZhY2UgTm5hcGlFeGVjdXRpb25Qcm92aWRlck9wdGlvbiBleHRlbmRzIEV4ZWN1dGlvblByb3ZpZGVyT3B0aW9uIHtcbiAgICByZWFkb25seSBuYW1lOiAnbm5hcGknO1xuICAgIHVzZUZQMTY/OiBib29sZWFuO1xuICAgIHVzZU5DSFc/OiBib29sZWFuO1xuICAgIGNwdURpc2FibGVkPzogYm9vbGVhbjtcbiAgICBjcHVPbmx5PzogYm9vbGVhbjtcbiAgfVxuICAvLyAjZW5kcmVnaW9uXG5cbiAgLy8gI2VuZHJlZ2lvblxuXG4gIC8vICNyZWdpb24gcnVuIG9wdGlvbnNcblxuICAvKipcbiAgICogQSBzZXQgb2YgY29uZmlndXJhdGlvbnMgZm9yIGluZmVyZW5jZSBydW4gYmVoYXZpb3JcbiAgICovXG4gIGV4cG9ydCBpbnRlcmZhY2UgUnVuT3B0aW9ucyB7XG4gICAgLyoqXG4gICAgICogTG9nIHNldmVyaXR5IGxldmVsLiBTZWVcbiAgICAgKiBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L29ubnhydW50aW1lL2Jsb2IvbWFpbi9pbmNsdWRlL29ubnhydW50aW1lL2NvcmUvY29tbW9uL2xvZ2dpbmcvc2V2ZXJpdHkuaFxuICAgICAqXG4gICAgICogVGhpcyBzZXR0aW5nIGlzIGF2YWlsYWJsZSBvbmx5IGluIE9OTlhSdW50aW1lIChOb2RlLmpzIGJpbmRpbmcgYW5kIHJlYWN0LW5hdGl2ZSkgb3IgV2ViQXNzZW1ibHkgYmFja2VuZFxuICAgICAqL1xuICAgIGxvZ1NldmVyaXR5TGV2ZWw/OiAwIHwgMSB8IDIgfCAzIHwgNDtcblxuICAgIC8qKlxuICAgICAqIExvZyB2ZXJib3NpdHkgbGV2ZWwuXG4gICAgICpcbiAgICAgKiBUaGlzIHNldHRpbmcgaXMgYXZhaWxhYmxlIG9ubHkgaW4gV2ViQXNzZW1ibHkgYmFja2VuZC4gV2lsbCBzdXBwb3J0IE5vZGUuanMgYmluZGluZyBhbmQgcmVhY3QtbmF0aXZlIGxhdGVyXG4gICAgICovXG4gICAgbG9nVmVyYm9zaXR5TGV2ZWw/OiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBUZXJtaW5hdGUgYWxsIGluY29tcGxldGUgT3J0UnVuIGNhbGxzIGFzIHNvb24gYXMgcG9zc2libGUgaWYgdHJ1ZVxuICAgICAqXG4gICAgICogVGhpcyBzZXR0aW5nIGlzIGF2YWlsYWJsZSBvbmx5IGluIFdlYkFzc2VtYmx5IGJhY2tlbmQuIFdpbGwgc3VwcG9ydCBOb2RlLmpzIGJpbmRpbmcgYW5kIHJlYWN0LW5hdGl2ZSBsYXRlclxuICAgICAqL1xuICAgIHRlcm1pbmF0ZT86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBBIHRhZyBmb3IgdGhlIFJ1bigpIGNhbGxzIHVzaW5nIHRoaXNcbiAgICAgKlxuICAgICAqIFRoaXMgc2V0dGluZyBpcyBhdmFpbGFibGUgb25seSBpbiBPTk5YUnVudGltZSAoTm9kZS5qcyBiaW5kaW5nIGFuZCByZWFjdC1uYXRpdmUpIG9yIFdlYkFzc2VtYmx5IGJhY2tlbmRcbiAgICAgKi9cbiAgICB0YWc/OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBTZXQgYSBzaW5nbGUgcnVuIGNvbmZpZ3VyYXRpb24gZW50cnkuIFNlZVxuICAgICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvb25ueHJ1bnRpbWUvYmxvYi9tYWluL2luY2x1ZGUvb25ueHJ1bnRpbWUvY29yZS9zZXNzaW9uL1xuICAgICAqIG9ubnhydW50aW1lX3J1bl9vcHRpb25zX2NvbmZpZ19rZXlzLmhcbiAgICAgKlxuICAgICAqIFRoaXMgc2V0dGluZyBpcyBhdmFpbGFibGUgb25seSBpbiBXZWJBc3NlbWJseSBiYWNrZW5kLiBXaWxsIHN1cHBvcnQgTm9kZS5qcyBiaW5kaW5nIGFuZCByZWFjdC1uYXRpdmUgbGF0ZXJcbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICpcbiAgICAgKiBgYGBqc1xuICAgICAqIGV4dHJhOiB7XG4gICAgICogICBtZW1vcnk6IHtcbiAgICAgKiAgICAgZW5hYmxlX21lbW9yeV9hcmVuYV9zaHJpbmthZ2U6IFwiMVwiLFxuICAgICAqICAgfVxuICAgICAqIH1cbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBleHRyYT86IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICB9XG5cbiAgLy8gI2VuZHJlZ2lvblxuXG4gIC8vICNyZWdpb24gdmFsdWUgbWV0YWRhdGFcblxuICAvKipcbiAgICogVGhlIGNvbW1vbiBwYXJ0IG9mIHRoZSB2YWx1ZSBtZXRhZGF0YSB0eXBlIGZvciBib3RoIHRlbnNvciBhbmQgbm9uLXRlbnNvciB2YWx1ZXMuXG4gICAqL1xuICBleHBvcnQgaW50ZXJmYWNlIFZhbHVlTWV0YWRhdGFCYXNlIHtcbiAgICAvKipcbiAgICAgKiBUaGUgbmFtZSBvZiB0aGUgc3BlY2lmaWVkIGlucHV0IG9yIG91dHB1dC5cbiAgICAgKi9cbiAgICByZWFkb25seSBuYW1lOiBzdHJpbmc7XG4gIH1cblxuICAvKipcbiAgICogUmVwcmVzZW50cyB0aGUgbWV0YWRhdGEgb2YgYSBub24tdGVuc29yIHZhbHVlLlxuICAgKi9cbiAgZXhwb3J0IGludGVyZmFjZSBOb25UZW5zb3JWYWx1ZU1ldGFkYXRhIGV4dGVuZHMgVmFsdWVNZXRhZGF0YUJhc2Uge1xuICAgIC8qKlxuICAgICAqIEdldCBhIHZhbHVlIGluZGljYXRpbmcgd2hldGhlciB0aGUgdmFsdWUgaXMgYSB0ZW5zb3IuXG4gICAgICovXG4gICAgcmVhZG9ubHkgaXNUZW5zb3I6IGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlcHJlc2VudHMgdGhlIG1ldGFkYXRhIG9mIGEgdGVuc29yIHZhbHVlLlxuICAgKi9cbiAgZXhwb3J0IGludGVyZmFjZSBUZW5zb3JWYWx1ZU1ldGFkYXRhIGV4dGVuZHMgVmFsdWVNZXRhZGF0YUJhc2Uge1xuICAgIC8qKlxuICAgICAqIEdldCBhIHZhbHVlIGluZGljYXRpbmcgd2hldGhlciB0aGUgdmFsdWUgaXMgYSB0ZW5zb3IuXG4gICAgICovXG4gICAgcmVhZG9ubHkgaXNUZW5zb3I6IHRydWU7XG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBkYXRhIHR5cGUgb2YgdGhlIHRlbnNvci5cbiAgICAgKi9cbiAgICByZWFkb25seSB0eXBlOiBUZW5zb3IuVHlwZTtcbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIHNoYXBlIG9mIHRoZSB0ZW5zb3IuXG4gICAgICpcbiAgICAgKiBJZiB0aGUgc2hhcGUgaXMgbm90IGRlZmluZWQsIHRoZSB2YWx1ZSB3aWxsIGFuIGVtcHR5IGFycmF5LiBPdGhlcndpc2UsIGl0IHdpbGwgYmUgYW4gYXJyYXkgcmVwcmVzZW50aW5nIHRoZSBzaGFwZVxuICAgICAqIG9mIHRoZSB0ZW5zb3IuIEVhY2ggZWxlbWVudCBpbiB0aGUgYXJyYXkgY2FuIGJlIGEgbnVtYmVyIG9yIGEgc3RyaW5nLiBJZiB0aGUgZWxlbWVudCBpcyBhIG51bWJlciwgaXQgcmVwcmVzZW50c1xuICAgICAqIHRoZSBjb3JyZXNwb25kaW5nIGRpbWVuc2lvbiBzaXplLiBJZiB0aGUgZWxlbWVudCBpcyBhIHN0cmluZywgaXQgcmVwcmVzZW50cyBhIHN5bWJvbGljIGRpbWVuc2lvbi5cbiAgICAgKi9cbiAgICByZWFkb25seSBzaGFwZTogUmVhZG9ubHlBcnJheTxudW1iZXIgfCBzdHJpbmc+O1xuICB9XG5cbiAgLyoqXG4gICAqIFJlcHJlc2VudHMgdGhlIG1ldGFkYXRhIG9mIGEgdmFsdWUuXG4gICAqL1xuICBleHBvcnQgdHlwZSBWYWx1ZU1ldGFkYXRhID0gTm9uVGVuc29yVmFsdWVNZXRhZGF0YSB8IFRlbnNvclZhbHVlTWV0YWRhdGE7XG5cbiAgLy8gI2VuZHJlZ2lvblxufVxuXG4vKipcbiAqIFJlcHJlc2VudCBhIHJ1bnRpbWUgaW5zdGFuY2Ugb2YgYW4gT05OWCBtb2RlbC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJbmZlcmVuY2VTZXNzaW9uIHtcbiAgLy8gI3JlZ2lvbiBydW4oKVxuXG4gIC8qKlxuICAgKiBFeGVjdXRlIHRoZSBtb2RlbCBhc3luY2hyb25vdXNseSB3aXRoIHRoZSBnaXZlbiBmZWVkcyBhbmQgb3B0aW9ucy5cbiAgICpcbiAgICogQHBhcmFtIGZlZWRzIC0gUmVwcmVzZW50YXRpb24gb2YgdGhlIG1vZGVsIGlucHV0LiBTZWUgdHlwZSBkZXNjcmlwdGlvbiBvZiBgSW5mZXJlbmNlU2Vzc2lvbi5JbnB1dFR5cGVgIGZvciBkZXRhaWwuXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gT3B0aW9uYWwuIEEgc2V0IG9mIG9wdGlvbnMgdGhhdCBjb250cm9scyB0aGUgYmVoYXZpb3Igb2YgbW9kZWwgaW5mZXJlbmNlLlxuICAgKiBAcmV0dXJucyBBIHByb21pc2UgdGhhdCByZXNvbHZlcyB0byBhIG1hcCwgd2hpY2ggdXNlcyBvdXRwdXQgbmFtZXMgYXMga2V5cyBhbmQgT25ueFZhbHVlIGFzIGNvcnJlc3BvbmRpbmcgdmFsdWVzLlxuICAgKi9cbiAgcnVuKGZlZWRzOiBJbmZlcmVuY2VTZXNzaW9uLkZlZWRzVHlwZSwgb3B0aW9ucz86IEluZmVyZW5jZVNlc3Npb24uUnVuT3B0aW9ucyk6IFByb21pc2U8SW5mZXJlbmNlU2Vzc2lvbi5SZXR1cm5UeXBlPjtcblxuICAvKipcbiAgICogRXhlY3V0ZSB0aGUgbW9kZWwgYXN5bmNocm9ub3VzbHkgd2l0aCB0aGUgZ2l2ZW4gZmVlZHMsIGZldGNoZXMgYW5kIG9wdGlvbnMuXG4gICAqXG4gICAqIEBwYXJhbSBmZWVkcyAtIFJlcHJlc2VudGF0aW9uIG9mIHRoZSBtb2RlbCBpbnB1dC4gU2VlIHR5cGUgZGVzY3JpcHRpb24gb2YgYEluZmVyZW5jZVNlc3Npb24uSW5wdXRUeXBlYCBmb3IgZGV0YWlsLlxuICAgKiBAcGFyYW0gZmV0Y2hlcyAtIFJlcHJlc2VudGF0aW9uIG9mIHRoZSBtb2RlbCBvdXRwdXQuIFNlZSB0eXBlIGRlc2NyaXB0aW9uIG9mIGBJbmZlcmVuY2VTZXNzaW9uLk91dHB1dFR5cGVgIGZvclxuICAgKiBkZXRhaWwuXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gT3B0aW9uYWwuIEEgc2V0IG9mIG9wdGlvbnMgdGhhdCBjb250cm9scyB0aGUgYmVoYXZpb3Igb2YgbW9kZWwgaW5mZXJlbmNlLlxuICAgKiBAcmV0dXJucyBBIHByb21pc2UgdGhhdCByZXNvbHZlcyB0byBhIG1hcCwgd2hpY2ggdXNlcyBvdXRwdXQgbmFtZXMgYXMga2V5cyBhbmQgT25ueFZhbHVlIGFzIGNvcnJlc3BvbmRpbmcgdmFsdWVzLlxuICAgKi9cbiAgcnVuKFxuICAgIGZlZWRzOiBJbmZlcmVuY2VTZXNzaW9uLkZlZWRzVHlwZSxcbiAgICBmZXRjaGVzOiBJbmZlcmVuY2VTZXNzaW9uLkZldGNoZXNUeXBlLFxuICAgIG9wdGlvbnM/OiBJbmZlcmVuY2VTZXNzaW9uLlJ1bk9wdGlvbnMsXG4gICk6IFByb21pc2U8SW5mZXJlbmNlU2Vzc2lvbi5SZXR1cm5UeXBlPjtcblxuICAvLyAjZW5kcmVnaW9uXG5cbiAgLy8gI3JlZ2lvbiByZWxlYXNlKClcblxuICAvKipcbiAgICogUmVsZWFzZSB0aGUgaW5mZXJlbmNlIHNlc3Npb24gYW5kIHRoZSB1bmRlcmx5aW5nIHJlc291cmNlcy5cbiAgICovXG4gIHJlbGVhc2UoKTogUHJvbWlzZTx2b2lkPjtcblxuICAvLyAjZW5kcmVnaW9uXG5cbiAgLy8gI3JlZ2lvbiBwcm9maWxpbmdcblxuICAvKipcbiAgICogU3RhcnQgcHJvZmlsaW5nLlxuICAgKi9cbiAgc3RhcnRQcm9maWxpbmcoKTogdm9pZDtcblxuICAvKipcbiAgICogRW5kIHByb2ZpbGluZy5cbiAgICovXG4gIGVuZFByb2ZpbGluZygpOiB2b2lkO1xuXG4gIC8vICNlbmRyZWdpb25cblxuICAvLyAjcmVnaW9uIG1ldGFkYXRhXG5cbiAgLyoqXG4gICAqIEdldCBpbnB1dCBuYW1lcyBvZiB0aGUgbG9hZGVkIG1vZGVsLlxuICAgKi9cbiAgcmVhZG9ubHkgaW5wdXROYW1lczogcmVhZG9ubHkgc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIEdldCBvdXRwdXQgbmFtZXMgb2YgdGhlIGxvYWRlZCBtb2RlbC5cbiAgICovXG4gIHJlYWRvbmx5IG91dHB1dE5hbWVzOiByZWFkb25seSBzdHJpbmdbXTtcblxuICAvKipcbiAgICogR2V0IGlucHV0IG1ldGFkYXRhIG9mIHRoZSBsb2FkZWQgbW9kZWwuXG4gICAqL1xuICByZWFkb25seSBpbnB1dE1ldGFkYXRhOiByZWFkb25seSBJbmZlcmVuY2VTZXNzaW9uLlZhbHVlTWV0YWRhdGFbXTtcblxuICAvKipcbiAgICogR2V0IG91dHB1dCBtZXRhZGF0YSBvZiB0aGUgbG9hZGVkIG1vZGVsLlxuICAgKi9cbiAgcmVhZG9ubHkgb3V0cHV0TWV0YWRhdGE6IHJlYWRvbmx5IEluZmVyZW5jZVNlc3Npb24uVmFsdWVNZXRhZGF0YVtdO1xuXG4gIC8vICNlbmRyZWdpb25cbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbmZlcmVuY2VTZXNzaW9uRmFjdG9yeSB7XG4gIC8vICNyZWdpb24gY3JlYXRlKClcblxuICAvKipcbiAgICogQ3JlYXRlIGEgbmV3IGluZmVyZW5jZSBzZXNzaW9uIGFuZCBsb2FkIG1vZGVsIGFzeW5jaHJvbm91c2x5IGZyb20gYW4gT05OWCBtb2RlbCBmaWxlLlxuICAgKlxuICAgKiBAcGFyYW0gdXJpIC0gVGhlIFVSSSBvciBmaWxlIHBhdGggb2YgdGhlIG1vZGVsIHRvIGxvYWQuXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gc3BlY2lmeSBjb25maWd1cmF0aW9uIGZvciBjcmVhdGluZyBhIG5ldyBpbmZlcmVuY2Ugc2Vzc2lvbi5cbiAgICogQHJldHVybnMgQSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gYW4gSW5mZXJlbmNlU2Vzc2lvbiBvYmplY3QuXG4gICAqL1xuICBjcmVhdGUodXJpOiBzdHJpbmcsIG9wdGlvbnM/OiBJbmZlcmVuY2VTZXNzaW9uLlNlc3Npb25PcHRpb25zKTogUHJvbWlzZTxJbmZlcmVuY2VTZXNzaW9uPjtcblxuICAvKipcbiAgICogQ3JlYXRlIGEgbmV3IGluZmVyZW5jZSBzZXNzaW9uIGFuZCBsb2FkIG1vZGVsIGFzeW5jaHJvbm91c2x5IGZyb20gYW4gYXJyYXkgYnVmZXIuXG4gICAqXG4gICAqIEBwYXJhbSBidWZmZXIgLSBBbiBBcnJheUJ1ZmZlciByZXByZXNlbnRhdGlvbiBvZiBhbiBPTk5YIG1vZGVsLlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIHNwZWNpZnkgY29uZmlndXJhdGlvbiBmb3IgY3JlYXRpbmcgYSBuZXcgaW5mZXJlbmNlIHNlc3Npb24uXG4gICAqIEByZXR1cm5zIEEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvIGFuIEluZmVyZW5jZVNlc3Npb24gb2JqZWN0LlxuICAgKi9cbiAgY3JlYXRlKGJ1ZmZlcjogQXJyYXlCdWZmZXJMaWtlLCBvcHRpb25zPzogSW5mZXJlbmNlU2Vzc2lvbi5TZXNzaW9uT3B0aW9ucyk6IFByb21pc2U8SW5mZXJlbmNlU2Vzc2lvbj47XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBpbmZlcmVuY2Ugc2Vzc2lvbiBhbmQgbG9hZCBtb2RlbCBhc3luY2hyb25vdXNseSBmcm9tIHNlZ21lbnQgb2YgYW4gYXJyYXkgYnVmZXIuXG4gICAqXG4gICAqIEBwYXJhbSBidWZmZXIgLSBBbiBBcnJheUJ1ZmZlciByZXByZXNlbnRhdGlvbiBvZiBhbiBPTk5YIG1vZGVsLlxuICAgKiBAcGFyYW0gYnl0ZU9mZnNldCAtIFRoZSBiZWdpbm5pbmcgb2YgdGhlIHNwZWNpZmllZCBwb3J0aW9uIG9mIHRoZSBhcnJheSBidWZmZXIuXG4gICAqIEBwYXJhbSBieXRlTGVuZ3RoIC0gVGhlIGxlbmd0aCBpbiBieXRlcyBvZiB0aGUgYXJyYXkgYnVmZmVyLlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIHNwZWNpZnkgY29uZmlndXJhdGlvbiBmb3IgY3JlYXRpbmcgYSBuZXcgaW5mZXJlbmNlIHNlc3Npb24uXG4gICAqIEByZXR1cm5zIEEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvIGFuIEluZmVyZW5jZVNlc3Npb24gb2JqZWN0LlxuICAgKi9cbiAgY3JlYXRlKFxuICAgIGJ1ZmZlcjogQXJyYXlCdWZmZXJMaWtlLFxuICAgIGJ5dGVPZmZzZXQ6IG51bWJlcixcbiAgICBieXRlTGVuZ3RoPzogbnVtYmVyLFxuICAgIG9wdGlvbnM/OiBJbmZlcmVuY2VTZXNzaW9uLlNlc3Npb25PcHRpb25zLFxuICApOiBQcm9taXNlPEluZmVyZW5jZVNlc3Npb24+O1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuZXcgaW5mZXJlbmNlIHNlc3Npb24gYW5kIGxvYWQgbW9kZWwgYXN5bmNocm9ub3VzbHkgZnJvbSBhIFVpbnQ4QXJyYXkuXG4gICAqXG4gICAqIEBwYXJhbSBidWZmZXIgLSBBIFVpbnQ4QXJyYXkgcmVwcmVzZW50YXRpb24gb2YgYW4gT05OWCBtb2RlbC5cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBzcGVjaWZ5IGNvbmZpZ3VyYXRpb24gZm9yIGNyZWF0aW5nIGEgbmV3IGluZmVyZW5jZSBzZXNzaW9uLlxuICAgKiBAcmV0dXJucyBBIHByb21pc2UgdGhhdCByZXNvbHZlcyB0byBhbiBJbmZlcmVuY2VTZXNzaW9uIG9iamVjdC5cbiAgICovXG4gIGNyZWF0ZShidWZmZXI6IFVpbnQ4QXJyYXksIG9wdGlvbnM/OiBJbmZlcmVuY2VTZXNzaW9uLlNlc3Npb25PcHRpb25zKTogUHJvbWlzZTxJbmZlcmVuY2VTZXNzaW9uPjtcblxuICAvLyAjZW5kcmVnaW9uXG59XG5cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbmFtaW5nLWNvbnZlbnRpb25cbmV4cG9ydCBjb25zdCBJbmZlcmVuY2VTZXNzaW9uOiBJbmZlcmVuY2VTZXNzaW9uRmFjdG9yeSA9IEluZmVyZW5jZVNlc3Npb25JbXBsO1xuIiwgIi8vIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuXG5pbXBvcnQgeyBPcHRpb25zRm9ybWF0LCBPcHRpb25zTm9ybWFsaXphdGlvblBhcmFtZXRlcnMsIE9wdGlvbnNUZW5zb3JMYXlvdXQgfSBmcm9tICcuL3RlbnNvci1mYWN0b3J5LmpzJztcblxuZXhwb3J0IGludGVyZmFjZSBUZW5zb3JUb0RhdGFVcmxPcHRpb25zIGV4dGVuZHMgT3B0aW9uc1RlbnNvckxheW91dCwgT3B0aW9uc0Zvcm1hdCwgT3B0aW9uc05vcm1hbGl6YXRpb25QYXJhbWV0ZXJzIHt9XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGVuc29yVG9JbWFnZURhdGFPcHRpb25zIGV4dGVuZHMgT3B0aW9uc1RlbnNvckxheW91dCwgT3B0aW9uc0Zvcm1hdCwgT3B0aW9uc05vcm1hbGl6YXRpb25QYXJhbWV0ZXJzIHt9XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29udmVyc2lvblV0aWxzIHtcbiAgLyoqXG4gICAqIGNyZWF0ZXMgYSBEYXRhVVJMIGluc3RhbmNlIGZyb20gdGVuc29yXG4gICAqXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gQW4gb3B0aW9uYWwgb2JqZWN0IHJlcHJlc2VudGluZyBvcHRpb25zIGZvciBjcmVhdGluZyBhIERhdGFVUkwgaW5zdGFuY2UgZnJvbSB0aGUgdGVuc29yLlxuICAgKlxuICAgKiBUaGUgZm9sbG93aW5nIGRlZmF1bHQgc2V0dGluZ3Mgd2lsbCBiZSBhcHBsaWVkOlxuICAgKiAtIGBmb3JtYXRgOiBgJ1JHQidgXG4gICAqIC0gYHRlbnNvckxheW91dGA6IGAnTkNIVydgXG4gICAqIEByZXR1cm5zIGEgRGF0YVVSTCBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBpbWFnZSBjb252ZXJ0ZWQgZnJvbSB0ZW5zb3IgZGF0YVxuICAgKi9cbiAgdG9EYXRhVVJMKG9wdGlvbnM/OiBUZW5zb3JUb0RhdGFVcmxPcHRpb25zKTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBjcmVhdGVzIGFuIEltYWdlRGF0YSBpbnN0YW5jZSBmcm9tIHRlbnNvclxuICAgKlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIEFuIG9wdGlvbmFsIG9iamVjdCByZXByZXNlbnRpbmcgb3B0aW9ucyBmb3IgY3JlYXRpbmcgYW4gSW1hZ2VEYXRhIGluc3RhbmNlIGZyb20gdGhlIHRlbnNvci5cbiAgICpcbiAgICogVGhlIGZvbGxvd2luZyBkZWZhdWx0IHNldHRpbmdzIHdpbGwgYmUgYXBwbGllZDpcbiAgICogLSBgZm9ybWF0YDogYCdSR0InYFxuICAgKiAtIGB0ZW5zb3JMYXlvdXRgOiBgJ05DSFcnYFxuICAgKiBAcmV0dXJucyBhbiBJbWFnZURhdGEgaW5zdGFuY2UgcmVwcmVzZW50aW5nIHRoZSBpbWFnZSBjb252ZXJ0ZWQgZnJvbSB0ZW5zb3IgZGF0YVxuICAgKi9cbiAgdG9JbWFnZURhdGEob3B0aW9ucz86IFRlbnNvclRvSW1hZ2VEYXRhT3B0aW9ucyk6IEltYWdlRGF0YTtcbn1cbiIsICIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cblxuaW1wb3J0IHsgVGVuc29yLCBUeXBlZFRlbnNvciB9IGZyb20gJy4vdGVuc29yLmpzJztcblxuZXhwb3J0IHR5cGUgSW1hZ2VGb3JtYXQgPSAnUkdCJyB8ICdSR0JBJyB8ICdCR1InIHwgJ1JCRyc7XG5leHBvcnQgdHlwZSBJbWFnZVRlbnNvckxheW91dCA9ICdOSFdDJyB8ICdOQ0hXJztcblxuLy8gdGhlIGZvbGxvd2luZyByZWdpb24gY29udGFpbnMgdHlwZSBkZWZpbml0aW9ucyBmb3IgY29uc3RydWN0aW5nIHRlbnNvciBmcm9tIGEgc3BlY2lmaWMgbG9jYXRpb24uXG5cbi8vICNyZWdpb24gdHlwZXMgZm9yIGNvbnN0cnVjdGluZyBhIHRlbnNvciBmcm9tIGEgc3BlY2lmaWMgbG9jYXRpb25cblxuLyoqXG4gKiByZXByZXNlbnQgY29tbW9uIHByb3BlcnRpZXMgb2YgdGhlIHBhcmFtZXRlciBmb3IgY29uc3RydWN0aW5nIGEgdGVuc29yIGZyb20gYSBzcGVjaWZpYyBsb2NhdGlvbi5cbiAqL1xuaW50ZXJmYWNlIENvbW1vbkNvbnN0cnVjdG9yUGFyYW1ldGVyczxUPiBleHRlbmRzIFBpY2s8VGVuc29yLCAnZGltcyc+IHtcbiAgLyoqXG4gICAqIFNwZWNpZnkgdGhlIGRhdGEgdHlwZSBvZiB0aGUgdGVuc29yLlxuICAgKi9cbiAgcmVhZG9ubHkgdHlwZTogVDtcbn1cblxuLyoqXG4gKiByZXByZXNlbnQgdGhlIHBhcmFtZXRlciBmb3IgY29uc3RydWN0aW5nIGEgdGVuc29yIGZyb20gYSBHUFUgcmVzb3VyY2UuXG4gKi9cbmludGVyZmFjZSBHcHVSZXNvdXJjZUNvbnN0cnVjdG9yUGFyYW1ldGVyczxUIGV4dGVuZHMgVGVuc29yLlR5cGU+IHtcbiAgLyoqXG4gICAqIGFuIG9wdGlvbmFsIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGRvd25sb2FkIGRhdGEgZnJvbSBHUFUgdG8gQ1BVLlxuICAgKlxuICAgKiBJZiBub3QgcHJvdmlkZWQsIHRoZSB0ZW5zb3IgdHJlYXQgdGhlIEdQVSBkYXRhIGFzIGV4dGVybmFsIHJlc291cmNlLlxuICAgKi9cbiAgZG93bmxvYWQ/KCk6IFByb21pc2U8VGVuc29yLkRhdGFUeXBlTWFwW1RdPjtcblxuICAvKipcbiAgICogYW4gb3B0aW9uYWwgY2FsbGJhY2sgZnVuY3Rpb24gdGhhdCB3aWxsIGJlIGNhbGxlZCB3aGVuIHRoZSB0ZW5zb3IgaXMgZGlzcG9zZWQuXG4gICAqXG4gICAqIElmIG5vdCBwcm92aWRlZCwgdGhlIHRlbnNvciB0cmVhdCB0aGUgR1BVIGRhdGEgYXMgZXh0ZXJuYWwgcmVzb3VyY2UuXG4gICAqL1xuICBkaXNwb3NlPygpOiB2b2lkO1xufVxuXG4vKipcbiAqIHJlcHJlc2VudCB0aGUgcGFyYW1ldGVyIGZvciBjb25zdHJ1Y3RpbmcgYSB0ZW5zb3IgZnJvbSBhIHBpbm5lZCBDUFUgYnVmZmVyXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ3B1UGlubmVkQ29uc3RydWN0b3JQYXJhbWV0ZXJzPFQgZXh0ZW5kcyBUZW5zb3IuQ3B1UGlubmVkRGF0YVR5cGVzID0gVGVuc29yLkNwdVBpbm5lZERhdGFUeXBlcz5cbiAgZXh0ZW5kcyBDb21tb25Db25zdHJ1Y3RvclBhcmFtZXRlcnM8VD4ge1xuICAvKipcbiAgICogU3BlY2lmeSB0aGUgbG9jYXRpb24gb2YgdGhlIGRhdGEgdG8gYmUgJ2NwdS1waW5uZWQnLlxuICAgKi9cbiAgcmVhZG9ubHkgbG9jYXRpb246ICdjcHUtcGlubmVkJztcbiAgLyoqXG4gICAqIFNwZWNpZnkgdGhlIENQVSBwaW5uZWQgYnVmZmVyIHRoYXQgaG9sZHMgdGhlIHRlbnNvciBkYXRhLlxuICAgKi9cbiAgcmVhZG9ubHkgZGF0YTogVGVuc29yLkRhdGFUeXBlTWFwW1RdO1xufVxuXG4vKipcbiAqIHJlcHJlc2VudCB0aGUgcGFyYW1ldGVyIGZvciBjb25zdHJ1Y3RpbmcgYSB0ZW5zb3IgZnJvbSBhIFdlYkdMIHRleHR1cmVcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZXh0dXJlQ29uc3RydWN0b3JQYXJhbWV0ZXJzPFQgZXh0ZW5kcyBUZW5zb3IuVGV4dHVyZURhdGFUeXBlcyA9IFRlbnNvci5UZXh0dXJlRGF0YVR5cGVzPlxuICBleHRlbmRzIENvbW1vbkNvbnN0cnVjdG9yUGFyYW1ldGVyczxUPixcbiAgICBHcHVSZXNvdXJjZUNvbnN0cnVjdG9yUGFyYW1ldGVyczxUPiB7XG4gIC8qKlxuICAgKiBTcGVjaWZ5IHRoZSBsb2NhdGlvbiBvZiB0aGUgZGF0YSB0byBiZSAndGV4dHVyZScuXG4gICAqL1xuICByZWFkb25seSBsb2NhdGlvbjogJ3RleHR1cmUnO1xuICAvKipcbiAgICogU3BlY2lmeSB0aGUgV2ViR0wgdGV4dHVyZSB0aGF0IGhvbGRzIHRoZSB0ZW5zb3IgZGF0YS5cbiAgICovXG4gIHJlYWRvbmx5IHRleHR1cmU6IFRlbnNvci5UZXh0dXJlVHlwZTtcbn1cblxuLyoqXG4gKiByZXByZXNlbnQgdGhlIHBhcmFtZXRlciBmb3IgY29uc3RydWN0aW5nIGEgdGVuc29yIGZyb20gYSBXZWJHUFUgYnVmZmVyXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgR3B1QnVmZmVyQ29uc3RydWN0b3JQYXJhbWV0ZXJzPFQgZXh0ZW5kcyBUZW5zb3IuR3B1QnVmZmVyRGF0YVR5cGVzID0gVGVuc29yLkdwdUJ1ZmZlckRhdGFUeXBlcz5cbiAgZXh0ZW5kcyBDb21tb25Db25zdHJ1Y3RvclBhcmFtZXRlcnM8VD4sXG4gICAgR3B1UmVzb3VyY2VDb25zdHJ1Y3RvclBhcmFtZXRlcnM8VD4ge1xuICAvKipcbiAgICogU3BlY2lmeSB0aGUgbG9jYXRpb24gb2YgdGhlIGRhdGEgdG8gYmUgJ2dwdS1idWZmZXInLlxuICAgKi9cbiAgcmVhZG9ubHkgbG9jYXRpb246ICdncHUtYnVmZmVyJztcbiAgLyoqXG4gICAqIFNwZWNpZnkgdGhlIFdlYkdQVSBidWZmZXIgdGhhdCBob2xkcyB0aGUgdGVuc29yIGRhdGEuXG4gICAqL1xuICByZWFkb25seSBncHVCdWZmZXI6IFRlbnNvci5HcHVCdWZmZXJUeXBlO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE1MVGVuc29yQ29uc3RydWN0b3JQYXJhbWV0ZXJzPFQgZXh0ZW5kcyBUZW5zb3IuTUxUZW5zb3JEYXRhVHlwZXMgPSBUZW5zb3IuTUxUZW5zb3JEYXRhVHlwZXM+XG4gIGV4dGVuZHMgQ29tbW9uQ29uc3RydWN0b3JQYXJhbWV0ZXJzPFQ+LFxuICAgIEdwdVJlc291cmNlQ29uc3RydWN0b3JQYXJhbWV0ZXJzPFQ+IHtcbiAgLyoqXG4gICAqIFNwZWNpZnkgdGhlIGxvY2F0aW9uIG9mIHRoZSBkYXRhIHRvIGJlICdtbC10ZW5zb3InLlxuICAgKi9cbiAgcmVhZG9ubHkgbG9jYXRpb246ICdtbC10ZW5zb3InO1xuXG4gIC8qKlxuICAgKiBTcGVjaWZ5IHRoZSBXZWJOTiBNTFRlbnNvciB0aGF0IGhvbGRzIHRoZSB0ZW5zb3IgZGF0YS5cbiAgICovXG4gIHJlYWRvbmx5IG1sVGVuc29yOiBUZW5zb3IuTUxUZW5zb3JUeXBlO1xufVxuXG4vLyAjZW5kcmVnaW9uXG5cbi8vIHRoZSBmb2xsb3dpbmcgcmVnaW9uIGNvbnRhaW5zIHR5cGUgZGVmaW5pdGlvbnMgb2YgZWFjaCBpbmRpdmlkdWFsIG9wdGlvbnMuXG4vLyB0aGUgdGVuc29yIGZhY3RvcnkgZnVuY3Rpb25zIHVzZSBhIGNvbXBvc2l0aW9uIG9mIHRob3NlIG9wdGlvbnMgYXMgdGhlIHBhcmFtZXRlciB0eXBlLlxuXG4vLyAjcmVnaW9uIE9wdGlvbnMgZmllbGRzXG5cbmV4cG9ydCBpbnRlcmZhY2UgT3B0aW9uc0Zvcm1hdCB7XG4gIC8qKlxuICAgKiBEZXNjcmliZXMgdGhlIGltYWdlIGZvcm1hdCByZXByZXNlbnRlZCBpbiBSR0JBIGNvbG9yIHNwYWNlLlxuICAgKi9cbiAgZm9ybWF0PzogSW1hZ2VGb3JtYXQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgT3B0aW9uc1RlbnNvckZvcm1hdCB7XG4gIC8qKlxuICAgKiBEZXNjcmliZXMgdGhlIGltYWdlIGZvcm1hdCBvZiB0aGUgdGVuc29yLlxuICAgKlxuICAgKiBOT1RFOiB0aGlzIGlzIGRpZmZlcmVudCBmcm9tIG9wdGlvbiAnZm9ybWF0Jy4gV2hpbGUgb3B0aW9uICdmb3JtYXQnIHJlcHJlc2VudHMgdGhlIG9yaWdpbmFsIGltYWdlLCAndGVuc29yRm9ybWF0J1xuICAgKiByZXByZXNlbnRzIHRoZSB0YXJnZXQgZm9ybWF0IG9mIHRoZSB0ZW5zb3IuIEEgdHJhbnNwb3NlIHdpbGwgYmUgcGVyZm9ybWVkIGlmIHRoZXkgYXJlIGRpZmZlcmVudC5cbiAgICovXG4gIHRlbnNvckZvcm1hdD86IEltYWdlRm9ybWF0O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE9wdGlvbnNUZW5zb3JEYXRhVHlwZSB7XG4gIC8qKlxuICAgKiBEZXNjcmliZXMgdGhlIGRhdGEgdHlwZSBvZiB0aGUgdGVuc29yLlxuICAgKi9cbiAgZGF0YVR5cGU/OiAnZmxvYXQzMicgfCAndWludDgnO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE9wdGlvbnNUZW5zb3JMYXlvdXQge1xuICAvKipcbiAgICogRGVzY3JpYmVzIHRoZSB0ZW5zb3IgbGF5b3V0IHdoZW4gcmVwcmVzZW50aW5nIGRhdGEgb2Ygb25lIG9yIG1vcmUgaW1hZ2UocykuXG4gICAqL1xuICB0ZW5zb3JMYXlvdXQ/OiBJbWFnZVRlbnNvckxheW91dDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBPcHRpb25zRGltZW5zaW9ucyB7XG4gIC8qKlxuICAgKiBEZXNjcmliZXMgdGhlIGltYWdlIGhlaWdodCBpbiBwaXhlbFxuICAgKi9cbiAgaGVpZ2h0PzogbnVtYmVyO1xuICAvKipcbiAgICogRGVzY3JpYmVzIHRoZSBpbWFnZSB3aWR0aCBpbiBwaXhlbFxuICAgKi9cbiAgd2lkdGg/OiBudW1iZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgT3B0aW9uUmVzaXplZERpbWVuc2lvbnMge1xuICAvKipcbiAgICogRGVzY3JpYmVzIHRoZSByZXNpemVkIGhlaWdodC4gSWYgb21pdHRlZCwgb3JpZ2luYWwgaGVpZ2h0IHdpbGwgYmUgdXNlZC5cbiAgICovXG4gIHJlc2l6ZWRIZWlnaHQ/OiBudW1iZXI7XG4gIC8qKlxuICAgKiBEZXNjcmliZXMgcmVzaXplZCB3aWR0aCAtIGNhbiBiZSBhY2Nlc3NlZCB2aWEgdGVuc29yIGRpbWVuc2lvbnMgYXMgd2VsbFxuICAgKi9cbiAgcmVzaXplZFdpZHRoPzogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE9wdGlvbnNOb3JtYWxpemF0aW9uUGFyYW1ldGVycyB7XG4gIC8qKlxuICAgKiBEZXNjcmliZXMgbm9ybWFsaXphdGlvbiBwYXJhbWV0ZXJzIHdoZW4gcHJlcHJvY2Vzc2luZyB0aGUgaW1hZ2UgYXMgbW9kZWwgaW5wdXQuXG4gICAqXG4gICAqIERhdGEgZWxlbWVudCBhcmUgcmFuZ2VkIGZyb20gMCB0byAyNTUuXG4gICAqL1xuICBub3JtPzoge1xuICAgIC8qKlxuICAgICAqIFRoZSAnYmlhcycgdmFsdWUgZm9yIGltYWdlIG5vcm1hbGl6YXRpb24uXG4gICAgICogLSBJZiBvbWl0dGVkLCB1c2UgZGVmYXVsdCB2YWx1ZSAwLlxuICAgICAqIC0gSWYgaXQncyBhIHNpbmdsZSBudW1iZXIsIGFwcGx5IHRvIGVhY2ggY2hhbm5lbFxuICAgICAqIC0gSWYgaXQncyBhbiBhcnJheSBvZiAzIG9yIDQgbnVtYmVycywgYXBwbHkgZWxlbWVudC13aXNlLiBOdW1iZXIgb2YgZWxlbWVudHMgbmVlZCB0byBtYXRjaCB0aGUgbnVtYmVyIG9mIGNoYW5uZWxzXG4gICAgICogZm9yIHRoZSBjb3JyZXNwb25kaW5nIGltYWdlIGZvcm1hdFxuICAgICAqL1xuICAgIGJpYXM/OiBudW1iZXIgfCBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl0gfCBbbnVtYmVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyXTtcbiAgICAvKipcbiAgICAgKiBUaGUgJ21lYW4nIHZhbHVlIGZvciBpbWFnZSBub3JtYWxpemF0aW9uLlxuICAgICAqIC0gSWYgb21pdHRlZCwgdXNlIGRlZmF1bHQgdmFsdWUgMjU1LlxuICAgICAqIC0gSWYgaXQncyBhIHNpbmdsZSBudW1iZXIsIGFwcGx5IHRvIGVhY2ggY2hhbm5lbFxuICAgICAqIC0gSWYgaXQncyBhbiBhcnJheSBvZiAzIG9yIDQgbnVtYmVycywgYXBwbHkgZWxlbWVudC13aXNlLiBOdW1iZXIgb2YgZWxlbWVudHMgbmVlZCB0byBtYXRjaCB0aGUgbnVtYmVyIG9mIGNoYW5uZWxzXG4gICAgICogZm9yIHRoZSBjb3JyZXNwb25kaW5nIGltYWdlIGZvcm1hdFxuICAgICAqL1xuICAgIG1lYW4/OiBudW1iZXIgfCBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl0gfCBbbnVtYmVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyXTtcbiAgfTtcbn1cblxuLy8gI2VuZHJlZ2lvblxuXG4vLyAjcmVnaW9uIE9wdGlvbnMgY29tcG9zaXRpb25cblxuZXhwb3J0IGludGVyZmFjZSBUZW5zb3JGcm9tSW1hZ2VEYXRhT3B0aW9uc1xuICBleHRlbmRzIE9wdGlvblJlc2l6ZWREaW1lbnNpb25zLFxuICAgIE9wdGlvbnNUZW5zb3JGb3JtYXQsXG4gICAgT3B0aW9uc1RlbnNvckxheW91dCxcbiAgICBPcHRpb25zVGVuc29yRGF0YVR5cGUsXG4gICAgT3B0aW9uc05vcm1hbGl6YXRpb25QYXJhbWV0ZXJzIHt9XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGVuc29yRnJvbUltYWdlRWxlbWVudE9wdGlvbnNcbiAgZXh0ZW5kcyBPcHRpb25SZXNpemVkRGltZW5zaW9ucyxcbiAgICBPcHRpb25zVGVuc29yRm9ybWF0LFxuICAgIE9wdGlvbnNUZW5zb3JMYXlvdXQsXG4gICAgT3B0aW9uc1RlbnNvckRhdGFUeXBlLFxuICAgIE9wdGlvbnNOb3JtYWxpemF0aW9uUGFyYW1ldGVycyB7fVxuXG5leHBvcnQgaW50ZXJmYWNlIFRlbnNvckZyb21VcmxPcHRpb25zXG4gIGV4dGVuZHMgT3B0aW9uc0RpbWVuc2lvbnMsXG4gICAgT3B0aW9uUmVzaXplZERpbWVuc2lvbnMsXG4gICAgT3B0aW9uc1RlbnNvckZvcm1hdCxcbiAgICBPcHRpb25zVGVuc29yTGF5b3V0LFxuICAgIE9wdGlvbnNUZW5zb3JEYXRhVHlwZSxcbiAgICBPcHRpb25zTm9ybWFsaXphdGlvblBhcmFtZXRlcnMge31cblxuZXhwb3J0IGludGVyZmFjZSBUZW5zb3JGcm9tSW1hZ2VCaXRtYXBPcHRpb25zXG4gIGV4dGVuZHMgT3B0aW9uUmVzaXplZERpbWVuc2lvbnMsXG4gICAgT3B0aW9uc1RlbnNvckZvcm1hdCxcbiAgICBPcHRpb25zVGVuc29yTGF5b3V0LFxuICAgIE9wdGlvbnNUZW5zb3JEYXRhVHlwZSxcbiAgICBPcHRpb25zTm9ybWFsaXphdGlvblBhcmFtZXRlcnMge31cblxuZXhwb3J0IGludGVyZmFjZSBUZW5zb3JGcm9tVGV4dHVyZU9wdGlvbnM8VCBleHRlbmRzIFRlbnNvci5UZXh0dXJlRGF0YVR5cGVzPlxuICBleHRlbmRzIFJlcXVpcmVkPE9wdGlvbnNEaW1lbnNpb25zPixcbiAgICBPcHRpb25zRm9ybWF0LFxuICAgIEdwdVJlc291cmNlQ29uc3RydWN0b3JQYXJhbWV0ZXJzPFQ+IC8qIFRPRE86IGFkZCBtb3JlICovIHt9XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGVuc29yRnJvbUdwdUJ1ZmZlck9wdGlvbnM8VCBleHRlbmRzIFRlbnNvci5HcHVCdWZmZXJEYXRhVHlwZXM+XG4gIGV4dGVuZHMgUGljazxUZW5zb3IsICdkaW1zJz4sXG4gICAgR3B1UmVzb3VyY2VDb25zdHJ1Y3RvclBhcmFtZXRlcnM8VD4ge1xuICAvKipcbiAgICogRGVzY3JpYmVzIHRoZSBkYXRhIHR5cGUgb2YgdGhlIHRlbnNvci5cbiAgICovXG4gIGRhdGFUeXBlPzogVDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUZW5zb3JGcm9tTUxUZW5zb3JPcHRpb25zPFQgZXh0ZW5kcyBUZW5zb3IuTUxUZW5zb3JEYXRhVHlwZXM+XG4gIGV4dGVuZHMgUGljazxUZW5zb3IsICdkaW1zJz4sXG4gICAgR3B1UmVzb3VyY2VDb25zdHJ1Y3RvclBhcmFtZXRlcnM8VD4ge1xuICAvKipcbiAgICogRGVzY3JpYmVzIHRoZSBkYXRhIHR5cGUgb2YgdGhlIHRlbnNvci5cbiAgICovXG4gIGRhdGFUeXBlPzogVDtcbn1cblxuLy8gI2VuZHJlZ2lvblxuXG4vKipcbiAqIHR5cGUgVGVuc29yRmFjdG9yeSBkZWZpbmVzIHRoZSBmYWN0b3J5IGZ1bmN0aW9ucyBvZiAnVGVuc29yJyB0byBjcmVhdGUgdGVuc29yIGluc3RhbmNlcyBmcm9tIGV4aXN0aW5nIGRhdGEgb3JcbiAqIHJlc291cmNlcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW5zb3JGYWN0b3J5IHtcbiAgLyoqXG4gICAqIGNyZWF0ZSBhIHRlbnNvciBmcm9tIGFuIEltYWdlRGF0YSBvYmplY3RcbiAgICpcbiAgICogQHBhcmFtIGltYWdlRGF0YSAtIHRoZSBJbWFnZURhdGEgb2JqZWN0IHRvIGNyZWF0ZSB0ZW5zb3IgZnJvbVxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIEFuIG9wdGlvbmFsIG9iamVjdCByZXByZXNlbnRpbmcgb3B0aW9ucyBmb3IgY3JlYXRpbmcgdGVuc29yIGZyb20gSW1hZ2VEYXRhLlxuICAgKlxuICAgKiBUaGUgZm9sbG93aW5nIGRlZmF1bHQgc2V0dGluZ3Mgd2lsbCBiZSBhcHBsaWVkOlxuICAgKiAtIGB0ZW5zb3JGb3JtYXRgOiBgJ1JHQidgXG4gICAqIC0gYHRlbnNvckxheW91dGA6IGAnTkNIVydgXG4gICAqIC0gYGRhdGFUeXBlYDogYCdmbG9hdDMyJ2BcbiAgICogQHJldHVybnMgQSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gYSB0ZW5zb3Igb2JqZWN0XG4gICAqL1xuICBmcm9tSW1hZ2UoXG4gICAgaW1hZ2VEYXRhOiBJbWFnZURhdGEsXG4gICAgb3B0aW9ucz86IFRlbnNvckZyb21JbWFnZURhdGFPcHRpb25zLFxuICApOiBQcm9taXNlPFR5cGVkVGVuc29yPCdmbG9hdDMyJz4gfCBUeXBlZFRlbnNvcjwndWludDgnPj47XG5cbiAgLyoqXG4gICAqIGNyZWF0ZSBhIHRlbnNvciBmcm9tIGEgSFRNTEltYWdlRWxlbWVudCBvYmplY3RcbiAgICpcbiAgICogQHBhcmFtIGltYWdlRWxlbWVudCAtIHRoZSBIVE1MSW1hZ2VFbGVtZW50IG9iamVjdCB0byBjcmVhdGUgdGVuc29yIGZyb21cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBBbiBvcHRpb25hbCBvYmplY3QgcmVwcmVzZW50aW5nIG9wdGlvbnMgZm9yIGNyZWF0aW5nIHRlbnNvciBmcm9tIEhUTUxJbWFnZUVsZW1lbnQuXG4gICAqXG4gICAqIFRoZSBmb2xsb3dpbmcgZGVmYXVsdCBzZXR0aW5ncyB3aWxsIGJlIGFwcGxpZWQ6XG4gICAqIC0gYHRlbnNvckZvcm1hdGA6IGAnUkdCJ2BcbiAgICogLSBgdGVuc29yTGF5b3V0YDogYCdOQ0hXJ2BcbiAgICogLSBgZGF0YVR5cGVgOiBgJ2Zsb2F0MzInYFxuICAgKiBAcmV0dXJucyBBIHByb21pc2UgdGhhdCByZXNvbHZlcyB0byBhIHRlbnNvciBvYmplY3RcbiAgICovXG4gIGZyb21JbWFnZShcbiAgICBpbWFnZUVsZW1lbnQ6IEhUTUxJbWFnZUVsZW1lbnQsXG4gICAgb3B0aW9ucz86IFRlbnNvckZyb21JbWFnZUVsZW1lbnRPcHRpb25zLFxuICApOiBQcm9taXNlPFR5cGVkVGVuc29yPCdmbG9hdDMyJz4gfCBUeXBlZFRlbnNvcjwndWludDgnPj47XG5cbiAgLyoqXG4gICAqIGNyZWF0ZSBhIHRlbnNvciBmcm9tIFVSTFxuICAgKlxuICAgKiBAcGFyYW0gdXJsU291cmNlIC0gYSBzdHJpbmcgYXMgYSBVUkwgdG8gdGhlIGltYWdlIG9yIGEgZGF0YSBVUkwgY29udGFpbmluZyB0aGUgaW1hZ2UgZGF0YS5cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBBbiBvcHRpb25hbCBvYmplY3QgcmVwcmVzZW50aW5nIG9wdGlvbnMgZm9yIGNyZWF0aW5nIHRlbnNvciBmcm9tIFVSTC5cbiAgICpcbiAgICogVGhlIGZvbGxvd2luZyBkZWZhdWx0IHNldHRpbmdzIHdpbGwgYmUgYXBwbGllZDpcbiAgICogLSBgdGVuc29yRm9ybWF0YDogYCdSR0InYFxuICAgKiAtIGB0ZW5zb3JMYXlvdXRgOiBgJ05DSFcnYFxuICAgKiAtIGBkYXRhVHlwZWA6IGAnZmxvYXQzMidgXG4gICAqIEByZXR1cm5zIEEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvIGEgdGVuc29yIG9iamVjdFxuICAgKi9cbiAgZnJvbUltYWdlKHVybFNvdXJjZTogc3RyaW5nLCBvcHRpb25zPzogVGVuc29yRnJvbVVybE9wdGlvbnMpOiBQcm9taXNlPFR5cGVkVGVuc29yPCdmbG9hdDMyJz4gfCBUeXBlZFRlbnNvcjwndWludDgnPj47XG5cbiAgLyoqXG4gICAqIGNyZWF0ZSBhIHRlbnNvciBmcm9tIGFuIEltYWdlQml0bWFwIG9iamVjdFxuICAgKlxuICAgKiBAcGFyYW0gYml0bWFwIC0gdGhlIEltYWdlQml0bWFwIG9iamVjdCB0byBjcmVhdGUgdGVuc29yIGZyb21cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBBbiBvcHRpb25hbCBvYmplY3QgcmVwcmVzZW50aW5nIG9wdGlvbnMgZm9yIGNyZWF0aW5nIHRlbnNvciBmcm9tIFVSTC5cbiAgICpcbiAgICogVGhlIGZvbGxvd2luZyBkZWZhdWx0IHNldHRpbmdzIHdpbGwgYmUgYXBwbGllZDpcbiAgICogLSBgdGVuc29yRm9ybWF0YDogYCdSR0InYFxuICAgKiAtIGB0ZW5zb3JMYXlvdXRgOiBgJ05DSFcnYFxuICAgKiAtIGBkYXRhVHlwZWA6IGAnZmxvYXQzMidgXG4gICAqIEByZXR1cm5zIEEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvIGEgdGVuc29yIG9iamVjdFxuICAgKi9cbiAgZnJvbUltYWdlKFxuICAgIGJpdG1hcDogSW1hZ2VCaXRtYXAsXG4gICAgb3B0aW9uczogVGVuc29yRnJvbUltYWdlQml0bWFwT3B0aW9ucyxcbiAgKTogUHJvbWlzZTxUeXBlZFRlbnNvcjwnZmxvYXQzMic+IHwgVHlwZWRUZW5zb3I8J3VpbnQ4Jz4+O1xuXG4gIC8qKlxuICAgKiBjcmVhdGUgYSB0ZW5zb3IgZnJvbSBhIFdlYkdMIHRleHR1cmVcbiAgICpcbiAgICogQHBhcmFtIHRleHR1cmUgLSB0aGUgV2ViR0xUZXh0dXJlIG9iamVjdCB0byBjcmVhdGUgdGVuc29yIGZyb21cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBBbiBvcHRpb25hbCBvYmplY3QgcmVwcmVzZW50aW5nIG9wdGlvbnMgZm9yIGNyZWF0aW5nIHRlbnNvciBmcm9tIFdlYkdMIHRleHR1cmUuXG4gICAqXG4gICAqIFRoZSBvcHRpb25zIGluY2x1ZGUgZm9sbG93aW5nIHByb3BlcnRpZXM6XG4gICAqIC0gYHdpZHRoYDogdGhlIHdpZHRoIG9mIHRoZSB0ZXh0dXJlLiBSZXF1aXJlZC5cbiAgICogLSBgaGVpZ2h0YDogdGhlIGhlaWdodCBvZiB0aGUgdGV4dHVyZS4gUmVxdWlyZWQuXG4gICAqIC0gYGZvcm1hdGA6IHRoZSBmb3JtYXQgb2YgdGhlIHRleHR1cmUuIElmIG9taXR0ZWQsIGFzc3VtZSAnUkdCQScuXG4gICAqIC0gYGRvd25sb2FkYDogYW4gb3B0aW9uYWwgZnVuY3Rpb24gdG8gZG93bmxvYWQgdGhlIHRlbnNvciBkYXRhIGZyb20gR1BVIHRvIENQVS4gSWYgb21pdHRlZCwgdGhlIEdQVSBkYXRhXG4gICAqIHdpbGwgbm90IGJlIGFibGUgdG8gZG93bmxvYWQuIFVzdWFsbHksIHRoaXMgaXMgcHJvdmlkZWQgYnkgYSBHUFUgYmFja2VuZCBmb3IgdGhlIGluZmVyZW5jZSBvdXRwdXRzLiBVc2VycyBkb24ndFxuICAgKiBuZWVkIHRvIHByb3ZpZGUgdGhpcyBmdW5jdGlvbi5cbiAgICogLSBgZGlzcG9zZWA6IGFuIG9wdGlvbmFsIGZ1bmN0aW9uIHRvIGRpc3Bvc2UgdGhlIHRlbnNvciBkYXRhIG9uIEdQVS4gSWYgb21pdHRlZCwgdGhlIEdQVSBkYXRhIHdpbGwgbm90IGJlIGRpc3Bvc2VkLlxuICAgKiBVc3VhbGx5LCB0aGlzIGlzIHByb3ZpZGVkIGJ5IGEgR1BVIGJhY2tlbmQgZm9yIHRoZSBpbmZlcmVuY2Ugb3V0cHV0cy4gVXNlcnMgZG9uJ3QgbmVlZCB0byBwcm92aWRlIHRoaXMgZnVuY3Rpb24uXG4gICAqXG4gICAqIEByZXR1cm5zIGEgdGVuc29yIG9iamVjdFxuICAgKi9cbiAgZnJvbVRleHR1cmU8VCBleHRlbmRzIFRlbnNvci5UZXh0dXJlRGF0YVR5cGVzID0gJ2Zsb2F0MzInPihcbiAgICB0ZXh0dXJlOiBUZW5zb3IuVGV4dHVyZVR5cGUsXG4gICAgb3B0aW9uczogVGVuc29yRnJvbVRleHR1cmVPcHRpb25zPFQ+LFxuICApOiBUeXBlZFRlbnNvcjwnZmxvYXQzMic+O1xuXG4gIC8qKlxuICAgKiBjcmVhdGUgYSB0ZW5zb3IgZnJvbSBhIFdlYkdQVSBidWZmZXJcbiAgICpcbiAgICogQHBhcmFtIGJ1ZmZlciAtIHRoZSBHUFVCdWZmZXIgb2JqZWN0IHRvIGNyZWF0ZSB0ZW5zb3IgZnJvbVxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIEFuIG9wdGlvbmFsIG9iamVjdCByZXByZXNlbnRpbmcgb3B0aW9ucyBmb3IgY3JlYXRpbmcgdGVuc29yIGZyb20gV2ViR1BVIGJ1ZmZlci5cbiAgICpcbiAgICogVGhlIG9wdGlvbnMgaW5jbHVkZSBmb2xsb3dpbmcgcHJvcGVydGllczpcbiAgICogLSBgZGF0YVR5cGVgOiB0aGUgZGF0YSB0eXBlIG9mIHRoZSB0ZW5zb3IuIElmIG9taXR0ZWQsIGFzc3VtZSAnZmxvYXQzMicuXG4gICAqIC0gYGRpbXNgOiB0aGUgZGltZW5zaW9uIG9mIHRoZSB0ZW5zb3IuIFJlcXVpcmVkLlxuICAgKiAtIGBkb3dubG9hZGA6IGFuIG9wdGlvbmFsIGZ1bmN0aW9uIHRvIGRvd25sb2FkIHRoZSB0ZW5zb3IgZGF0YSBmcm9tIEdQVSB0byBDUFUuIElmIG9taXR0ZWQsIHRoZSBHUFUgZGF0YVxuICAgKiB3aWxsIG5vdCBiZSBhYmxlIHRvIGRvd25sb2FkLiBVc3VhbGx5LCB0aGlzIGlzIHByb3ZpZGVkIGJ5IGEgR1BVIGJhY2tlbmQgZm9yIHRoZSBpbmZlcmVuY2Ugb3V0cHV0cy4gVXNlcnMgZG9uJ3RcbiAgICogbmVlZCB0byBwcm92aWRlIHRoaXMgZnVuY3Rpb24uXG4gICAqIC0gYGRpc3Bvc2VgOiBhbiBvcHRpb25hbCBmdW5jdGlvbiB0byBkaXNwb3NlIHRoZSB0ZW5zb3IgZGF0YSBvbiBHUFUuIElmIG9taXR0ZWQsIHRoZSBHUFUgZGF0YSB3aWxsIG5vdCBiZSBkaXNwb3NlZC5cbiAgICogVXN1YWxseSwgdGhpcyBpcyBwcm92aWRlZCBieSBhIEdQVSBiYWNrZW5kIGZvciB0aGUgaW5mZXJlbmNlIG91dHB1dHMuIFVzZXJzIGRvbid0IG5lZWQgdG8gcHJvdmlkZSB0aGlzIGZ1bmN0aW9uLlxuICAgKlxuICAgKiBAcmV0dXJucyBhIHRlbnNvciBvYmplY3RcbiAgICovXG4gIGZyb21HcHVCdWZmZXI8VCBleHRlbmRzIFRlbnNvci5HcHVCdWZmZXJEYXRhVHlwZXM+KFxuICAgIGJ1ZmZlcjogVGVuc29yLkdwdUJ1ZmZlclR5cGUsXG4gICAgb3B0aW9uczogVGVuc29yRnJvbUdwdUJ1ZmZlck9wdGlvbnM8VD4sXG4gICk6IFR5cGVkVGVuc29yPFQ+O1xuXG4gIC8qKlxuICAgKiBjcmVhdGUgYSB0ZW5zb3IgZnJvbSBhIFdlYk5OIE1MVGVuc29yXG4gICAqXG4gICAqIEBwYXJhbSB0ZW5zb3IgLSB0aGUgTUxUZW5zb3Igb2JqZWN0IHRvIGNyZWF0ZSB0ZW5zb3IgZnJvbVxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIEFuIG9wdGlvbmFsIG9iamVjdCByZXByZXNlbnRpbmcgb3B0aW9ucyBmb3IgY3JlYXRpbmcgdGVuc29yIGZyb20gYSBXZWJOTiBNTFRlbnNvci5cbiAgICpcbiAgICogVGhlIG9wdGlvbnMgaW5jbHVkZSBmb2xsb3dpbmcgcHJvcGVydGllczpcbiAgICogLSBgZGF0YVR5cGVgOiB0aGUgZGF0YSB0eXBlIG9mIHRoZSB0ZW5zb3IuIElmIG9taXR0ZWQsIGFzc3VtZSAnZmxvYXQzMicuXG4gICAqIC0gYGRpbXNgOiB0aGUgZGltZW5zaW9uIG9mIHRoZSB0ZW5zb3IuIFJlcXVpcmVkLlxuICAgKiAtIGBkb3dubG9hZGA6IGFuIG9wdGlvbmFsIGZ1bmN0aW9uIHRvIGRvd25sb2FkIHRoZSB0ZW5zb3IgZGF0YSBmcm9tIHRoZSBNTFRlbnNvciB0byBDUFUuIElmIG9taXR0ZWQsIHRoZSBNTFRlbnNvclxuICAgKiBkYXRhIHdpbGwgbm90IGJlIGFibGUgdG8gZG93bmxvYWQuIFVzdWFsbHksIHRoaXMgaXMgcHJvdmlkZWQgYnkgdGhlIFdlYk5OIGJhY2tlbmQgZm9yIHRoZSBpbmZlcmVuY2Ugb3V0cHV0cy5cbiAgICogVXNlcnMgZG9uJ3QgbmVlZCB0byBwcm92aWRlIHRoaXMgZnVuY3Rpb24uXG4gICAqIC0gYGRpc3Bvc2VgOiBhbiBvcHRpb25hbCBmdW5jdGlvbiB0byBkaXNwb3NlIHRoZSB0ZW5zb3IgZGF0YSBvbiB0aGUgV2ViTk4gTUxUZW5zb3IuIElmIG9taXR0ZWQsIHRoZSBNTFRlbnNvciB3aWxsXG4gICAqIG5vdCBiZSBkaXNwb3NlZC4gVXN1YWxseSwgdGhpcyBpcyBwcm92aWRlZCBieSB0aGUgV2ViTk4gYmFja2VuZCBmb3IgdGhlIGluZmVyZW5jZSBvdXRwdXRzLiBVc2VycyBkb24ndCBuZWVkIHRvXG4gICAqIHByb3ZpZGUgdGhpcyBmdW5jdGlvbi5cbiAgICpcbiAgICogQHJldHVybnMgYSB0ZW5zb3Igb2JqZWN0XG4gICAqL1xuICBmcm9tTUxUZW5zb3I8VCBleHRlbmRzIFRlbnNvci5NTFRlbnNvckRhdGFUeXBlcz4oXG4gICAgdGVuc29yOiBUZW5zb3IuTUxUZW5zb3JUeXBlLFxuICAgIG9wdGlvbnM6IFRlbnNvckZyb21NTFRlbnNvck9wdGlvbnM8VD4sXG4gICk6IFR5cGVkVGVuc29yPFQ+O1xuXG4gIC8qKlxuICAgKiBjcmVhdGUgYSB0ZW5zb3IgZnJvbSBhIHByZS1hbGxvY2F0ZWQgYnVmZmVyLiBUaGUgYnVmZmVyIHdpbGwgYmUgdXNlZCBhcyBhIHBpbm5lZCBidWZmZXIuXG4gICAqXG4gICAqIEBwYXJhbSB0eXBlIC0gdGhlIHRlbnNvciBlbGVtZW50IHR5cGUuXG4gICAqIEBwYXJhbSBidWZmZXIgLSBhIFR5cGVkQXJyYXkgY29ycmVzcG9uZGluZyB0byB0aGUgdHlwZS5cbiAgICogQHBhcmFtIGRpbXMgLSBzcGVjaWZ5IHRoZSBkaW1lbnNpb24gb2YgdGhlIHRlbnNvci4gSWYgb21pdHRlZCwgYSAxLUQgdGVuc29yIGlzIGFzc3VtZWQuXG4gICAqXG4gICAqIEByZXR1cm5zIGEgdGVuc29yIG9iamVjdFxuICAgKi9cbiAgZnJvbVBpbm5lZEJ1ZmZlcjxUIGV4dGVuZHMgRXhjbHVkZTxUZW5zb3IuVHlwZSwgJ3N0cmluZyc+PihcbiAgICB0eXBlOiBULFxuICAgIGJ1ZmZlcjogVGVuc29yLkRhdGFUeXBlTWFwW1RdLFxuICAgIGRpbXM/OiByZWFkb25seSBudW1iZXJbXSxcbiAgKTogVHlwZWRUZW5zb3I8VD47XG59XG4iLCAiLy8gQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG5cbi8qKlxuICogQSBzdHJpbmcgdGhhdCByZXByZXNlbnRzIGEgZmlsZSdzIFVSTCBvciBwYXRoLlxuICpcbiAqIFBhdGggaXMgdmFpbGFibGUgb25seSBpbiBvbm54cnVudGltZS1ub2RlIG9yIG9ubnhydW50aW1lLXdlYiBydW5uaW5nIGluIE5vZGUuanMuXG4gKi9cbmV4cG9ydCB0eXBlIEZpbGVVcmxPclBhdGggPSBzdHJpbmc7XG5cbi8qKlxuICogQSBCbG9iIG9iamVjdCB0aGF0IHJlcHJlc2VudHMgYSBmaWxlLlxuICovXG5leHBvcnQgdHlwZSBGaWxlQmxvYiA9IEJsb2I7XG5cbi8qKlxuICogQSBVaW50OEFycmF5LCBBcnJheUJ1ZmZlciBvciBTaGFyZWRBcnJheUJ1ZmZlciBvYmplY3QgdGhhdCByZXByZXNlbnRzIGEgZmlsZSBjb250ZW50LlxuICpcbiAqIFdoZW4gaXQgaXMgYW4gQXJyYXlCdWZmZXIgb3IgU2hhcmVkQXJyYXlCdWZmZXIsIHRoZSB3aG9sZSBidWZmZXIgaXMgYXNzdW1lZCB0byBiZSB0aGUgZmlsZSBjb250ZW50LlxuICovXG5leHBvcnQgdHlwZSBGaWxlRGF0YSA9IFVpbnQ4QXJyYXkgfCBBcnJheUJ1ZmZlckxpa2U7XG5cbi8qKlxuICogUmVwcmVzZW50cyBhIGZpbGUgdGhhdCBjYW4gYmUgbG9hZGVkIGJ5IHRoZSBPTk5YIFJ1bnRpbWUgSmF2YVNjcmlwdCBBUEkuXG4gKi9cbmV4cG9ydCB0eXBlIEZpbGVUeXBlID0gRmlsZVVybE9yUGF0aCB8IEZpbGVCbG9iIHwgRmlsZURhdGE7XG5cbi8qKlxuICogUmVwcmVzZW50cyBhbiBleHRlcm5hbCBkYXRhIGZpbGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXh0ZXJuYWxEYXRhRmlsZURlc2NyaXB0aW9uIHtcbiAgLyoqXG4gICAqIFNwZWNpZnkgdGhlIGV4dGVybmFsIGRhdGEgZmlsZS5cbiAgICovXG4gIGRhdGE6IEZpbGVUeXBlO1xuICAvKipcbiAgICogU3BlY2lmeSB0aGUgZmlsZSBwYXRoLlxuICAgKi9cbiAgcGF0aDogc3RyaW5nO1xufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgYW4gZXh0ZXJuYWwgZGF0YSBmaWxlLlxuICpcbiAqIFdoZW4gdXNpbmcgYSBzdHJpbmcsIGl0IHNob3VsZCBiZSBhIGZpbGUgVVJMIG9yIHBhdGggdGhhdCBpbiB0aGUgc2FtZSBkaXJlY3RvcnkgYXMgdGhlIG1vZGVsIGZpbGUuXG4gKi9cbmV4cG9ydCB0eXBlIEV4dGVybmFsRGF0YUZpbGVUeXBlID0gRXh0ZXJuYWxEYXRhRmlsZURlc2NyaXB0aW9uIHwgRmlsZVVybE9yUGF0aDtcblxuLyoqXG4gKiBPcHRpb25zIGZvciBtb2RlbCBsb2FkaW5nLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE9ubnhNb2RlbE9wdGlvbnMge1xuICAvKipcbiAgICogU3BlY2lmeWluZyBhIGxpc3Qgb2YgZmlsZXMgdGhhdCByZXByZXNlbnRzIHRoZSBleHRlcm5hbCBkYXRhLlxuICAgKi9cbiAgZXh0ZXJuYWxEYXRhPzogcmVhZG9ubHkgRXh0ZXJuYWxEYXRhRmlsZVR5cGVbXTtcbn1cbiIsICIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cblxuaW1wb3J0IHsgVGVuc29yIH0gZnJvbSAnLi90ZW5zb3IuanMnO1xuXG5leHBvcnQgdHlwZSBOb25UZW5zb3JUeXBlID0gbmV2ZXI7XG5cbi8qKlxuICogVHlwZSBPbm54VmFsdWUgUmVwcmVzZW50cyBib3RoIHRlbnNvcnMgYW5kIG5vbi10ZW5zb3JzIHZhbHVlIGZvciBtb2RlbCdzIGlucHV0cy9vdXRwdXRzLlxuICpcbiAqIE5PVEU6IGN1cnJlbnRseSBub3Qgc3VwcG9ydCBub24tdGVuc29yXG4gKi9cbmV4cG9ydCB0eXBlIE9ubnhWYWx1ZSA9IFRlbnNvciB8IE5vblRlbnNvclR5cGU7XG5cbi8qKlxuICogVHlwZSBPbm54VmFsdWVEYXRhTG9jYXRpb24gcmVwcmVzZW50cyB0aGUgbG9jYXRpb24gb2YgdGhlIGRhdGEgb2YgYW4gT25ueFZhbHVlLlxuICovXG5leHBvcnQgdHlwZSBPbm54VmFsdWVEYXRhTG9jYXRpb24gPSBUZW5zb3IuRGF0YUxvY2F0aW9uO1xuIiwgIi8vIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuXG4vKipcbiAqICMgT05OWCBSdW50aW1lIEphdmFTY3JpcHQgQVBJXG4gKlxuICogT05OWCBSdW50aW1lIEphdmFTY3JpcHQgQVBJIGlzIGEgdW5pZmllZCBBUEkgZm9yIGFsbCBKYXZhU2NyaXB0IHVzYWdlcywgaW5jbHVkaW5nIHRoZSBmb2xsb3dpbmcgTlBNIHBhY2thZ2VzOlxuICpcbiAqIC0gW29ubnhydW50aW1lLW5vZGVdKGh0dHBzOi8vd3d3Lm5wbWpzLmNvbS9wYWNrYWdlL29ubnhydW50aW1lLW5vZGUpXG4gKiAtIFtvbm54cnVudGltZS13ZWJdKGh0dHBzOi8vd3d3Lm5wbWpzLmNvbS9wYWNrYWdlL29ubnhydW50aW1lLXdlYilcbiAqIC0gW29ubnhydW50aW1lLXJlYWN0LW5hdGl2ZV0oaHR0cHM6Ly93d3cubnBtanMuY29tL3BhY2thZ2Uvb25ueHJ1bnRpbWUtcmVhY3QtbmF0aXZlKVxuICpcbiAqIFNlZSBhbHNvOlxuICogLSBbR2V0IFN0YXJ0ZWRdKGh0dHBzOi8vb25ueHJ1bnRpbWUuYWkvZG9jcy9nZXQtc3RhcnRlZC93aXRoLWphdmFzY3JpcHQvKVxuICogLSBbSW5mZXJlbmNlIGV4YW1wbGVzXShodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L29ubnhydW50aW1lLWluZmVyZW5jZS1leGFtcGxlcy90cmVlL21haW4vanMpXG4gKlxuICogQHBhY2thZ2VEb2N1bWVudGF0aW9uXG4gKi9cblxuZXhwb3J0ICogZnJvbSAnLi9iYWNrZW5kLmpzJztcbmV4cG9ydCAqIGZyb20gJy4vZW52LmpzJztcbmV4cG9ydCAqIGZyb20gJy4vaW5mZXJlbmNlLXNlc3Npb24uanMnO1xuZXhwb3J0ICogZnJvbSAnLi90ZW5zb3IuanMnO1xuZXhwb3J0ICogZnJvbSAnLi90ZW5zb3ItY29udmVyc2lvbi5qcyc7XG5leHBvcnQgKiBmcm9tICcuL3RlbnNvci1mYWN0b3J5LmpzJztcbmV4cG9ydCAqIGZyb20gJy4vdHJhY2UuanMnO1xuZXhwb3J0ICogZnJvbSAnLi9vbm54LW1vZGVsLmpzJztcbmV4cG9ydCAqIGZyb20gJy4vb25ueC12YWx1ZS5qcyc7XG4iLCAiLy8gQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG5cbmV4cG9ydCBjb25zdCBpc05vZGUgPSAhISh0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcgJiYgcHJvY2Vzcy52ZXJzaW9ucyAmJiBwcm9jZXNzLnZlcnNpb25zLm5vZGUpO1xuIiwgIi8vIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuXG4vLy8gPHJlZmVyZW5jZSBsaWI9XCJ3ZWJ3b3JrZXJcIiAvPlxuXG4vL1xuLy8gKiB0eXBlIGhhY2sgZm9yIFwiSFRNTEltYWdlRWxlbWVudFwiXG4vL1xuLy8gaW4gdHlwZXNjcmlwdCwgdGhlIHR5cGUgb2YgXCJIVE1MSW1hZ2VFbGVtZW50XCIgaXMgZGVmaW5lZCBpbiBsaWIuZG9tLmQudHMsIHdoaWNoIGlzIGNvbmZsaWN0IHdpdGggbGliLndlYndvcmtlci5kLnRzLlxuLy8gd2hlbiB3ZSB1c2Ugd2Vid29ya2VyLCB0aGUgbGliLndlYndvcmtlci5kLnRzIHdpbGwgYmUgdXNlZCwgd2hpY2ggZG9lcyBub3QgaGF2ZSBIVE1MSW1hZ2VFbGVtZW50IGRlZmluZWQuXG4vL1xuLy8gd2Ugd2lsbCBnZXQgdGhlIGZvbGxvd2luZyBlcnJvcnMgY29tcGxhaW5pbmcgdGhhdCBIVE1MSW1hZ2VFbGVtZW50IGlzIG5vdCBkZWZpbmVkOlxuLy9cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vL1xuLy8gLi4vY29tbW9uL2Rpc3QvY2pzL3RlbnNvci1mYWN0b3J5LmQudHM6MTg3OjI5IC0gZXJyb3IgVFMyNTUyOiBDYW5ub3QgZmluZCBuYW1lICdIVE1MSW1hZ2VFbGVtZW50Jy4gRGlkIHlvdSBtZWFuXG4vLyAnSFRNTExJRWxlbWVudCc/XG4vL1xuLy8gMTg3ICAgICBmcm9tSW1hZ2UoaW1hZ2VFbGVtZW50OiBIVE1MSW1hZ2VFbGVtZW50LCBvcHRpb25zPzogVGVuc29yRnJvbUltYWdlRWxlbWVudE9wdGlvbnMpOlxuLy8gUHJvbWlzZTxUeXBlZFRlbnNvcjwnZmxvYXQzMic+IHwgVHlwZWRUZW5zb3I8J3VpbnQ4Jz4+O1xuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB+fn5+fn5+fn5+fn5+fn5+XG4vL1xuLy8gbm9kZV9tb2R1bGVzL0B3ZWJncHUvdHlwZXMvZGlzdC9pbmRleC5kLnRzOjgzOjcgLSBlcnJvciBUUzI1NTI6IENhbm5vdCBmaW5kIG5hbWUgJ0hUTUxJbWFnZUVsZW1lbnQnLiBEaWQgeW91IG1lYW5cbi8vICdIVE1MTElFbGVtZW50Jz9cbi8vXG4vLyA4MyAgICAgfCBIVE1MSW1hZ2VFbGVtZW50XG4vLyAgICAgICAgICB+fn5+fn5+fn5+fn5+fn5+XG4vL1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vXG4vLyBgSFRNTEltYWdlRWxlbWVudGAgaXMgb25seSB1c2VkIGluIHR5cGUgZGVjbGFyYXRpb24gYW5kIG5vdCBpbiByZWFsIGNvZGUuIFNvIHdlIGRlZmluZSBpdCBhcyBgdW5rbm93bmAgaGVyZSB0b1xuLy8gYnlwYXNzIHRoZSB0eXBlIGNoZWNrLlxuXG4vL1xuLy8gKiB0eXBlIGhhY2sgZm9yIFwiZG9jdW1lbnRcIlxuLy9cbi8vIGluIHR5cGVzY3JpcHQsIHRoZSB0eXBlIG9mIFwiZG9jdW1lbnRcIiBpcyBkZWZpbmVkIGluIGxpYi5kb20uZC50cywgc28gaXQncyBub3QgYXZhaWxhYmxlIGluIHdlYndvcmtlci5cbi8vXG4vLyB3ZSB3aWxsIGdldCB0aGUgZm9sbG93aW5nIGVycm9ycyBjb21wbGFpbmluZyB0aGF0IGRvY3VtZW50IGlzIG5vdCBkZWZpbmVkOlxuLy9cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vL1xuLy8gbGliL3dhc20vd2FzbS11dGlscy1pbXBvcnQudHM6NzozMyAtIGVycm9yIFRTMjU4NDogQ2Fubm90IGZpbmQgbmFtZSAnZG9jdW1lbnQnLiBEbyB5b3UgbmVlZCB0byBjaGFuZ2UgeW91ciB0YXJnZXRcbi8vIGxpYnJhcnk/IFRyeSBjaGFuZ2luZyB0aGUgJ2xpYicgY29tcGlsZXIgb3B0aW9uIHRvIGluY2x1ZGUgJ2RvbScuXG4vL1xuLy8gNyBleHBvcnQgY29uc3Qgc2NyaXB0U3JjID0gdHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJyA/IChkb2N1bWVudD8uY3VycmVudFNjcmlwdCBhcyBIVE1MU2NyaXB0RWxlbWVudCk/LnNyYyA6XG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfn5+fn5+fn5cbi8vXG4vLyBsaWIvd2FzbS93YXNtLXV0aWxzLWltcG9ydC50czo3OjYxIC0gZXJyb3IgVFMyNTg0OiBDYW5ub3QgZmluZCBuYW1lICdkb2N1bWVudCcuIERvIHlvdSBuZWVkIHRvIGNoYW5nZSB5b3VyIHRhcmdldFxuLy8gbGlicmFyeT8gVHJ5IGNoYW5naW5nIHRoZSAnbGliJyBjb21waWxlciBvcHRpb24gdG8gaW5jbHVkZSAnZG9tJy5cbi8vXG4vLyA3IGV4cG9ydCBjb25zdCBzY3JpcHRTcmMgPSB0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnID8gKGRvY3VtZW50Py5jdXJyZW50U2NyaXB0IGFzIEhUTUxTY3JpcHRFbGVtZW50KT8uc3JjIDpcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfn5+fn5+fn5cbi8vXG4vLyBsaWIvd2FzbS93YXNtLXV0aWxzLWltcG9ydC50czo3Ojg4IC0gZXJyb3IgVFMyNTUyOiBDYW5ub3QgZmluZCBuYW1lICdIVE1MU2NyaXB0RWxlbWVudCcuIERpZCB5b3UgbWVhblxuLy8gJ0hUTUxMSUVsZW1lbnQnP1xuLy9cbi8vIDcgZXhwb3J0IGNvbnN0IHNjcmlwdFNyYyA9IHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcgPyAoZG9jdW1lbnQ/LmN1cnJlbnRTY3JpcHQgYXMgSFRNTFNjcmlwdEVsZW1lbnQpPy5zcmMgOlxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB+fn5+fn5+fn5+fn5+fn5+flxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vXG4vLyBgZG9jdW1lbnRgIGlzIHVzZWQgdG8gZ2V0IHRoZSBjdXJyZW50IHNjcmlwdCBVUkwsIHdoaWNoIGlzIG5vdCBhdmFpbGFibGUgaW4gd2Vid29ya2VyLiBUaGlzIGZpbGUgaXMgc2VydmVkIGFzIGFcbi8vIFwiZHVhbFwiIGZpbGUgZm9yIGVudHJpZXMgb2YgYm90aCB3ZWJ3b3JrZXIgYW5kIHRoZSBlc20gbW9kdWxlLlxuLy9cbmRlY2xhcmUgZ2xvYmFsIHtcbiAgdHlwZSBIVE1MSW1hZ2VFbGVtZW50ID0gdW5rbm93bjtcbiAgdHlwZSBIVE1MU2NyaXB0RWxlbWVudCA9IHsgc3JjPzogc3RyaW5nIH07XG4gIGNvbnN0IGRvY3VtZW50OiB1bmRlZmluZWQgfCB7IGN1cnJlbnRTY3JpcHQ/OiBIVE1MU2NyaXB0RWxlbWVudCB9O1xufVxuXG4vKipcbiAqIEBzdW1tYXJ5XG4gKlxuICogVGhpcyBmaWxlIGlzIHNlcnZlZCBhcyBhIFwiZHVhbFwiIGZpbGUgZm9yIGJvdGggZW50cmllcyBvZiB0aGUgZm9sbG93aW5nOlxuICogLSBUaGUgcHJveHkgd29ya2VyIGl0c2VsZi5cbiAqICAgLSBXaGVuIHVzZWQgYXMgYSB3b3JrZXIsIGl0IGxpc3RlbnMgdG8gdGhlIG1lc3NhZ2VzIGZyb20gdGhlIG1haW4gdGhyZWFkIGFuZCBwZXJmb3JtcyB0aGUgY29ycmVzcG9uZGluZyBvcGVyYXRpb25zLlxuICogICAtIFNob3VsZCBiZSBpbXBvcnRlZCBkaXJlY3RseSB1c2luZyBgbmV3IFdvcmtlcigpYCBpbiB0aGUgbWFpbiB0aHJlYWQuXG4gKlxuICogLSBUaGUgRVNNIG1vZHVsZSB0aGF0IGNyZWF0ZXMgdGhlIHByb3h5IHdvcmtlciAoYXMgYSB3b3JrZXIgbGF1bmNoZXIpLlxuICogICAtIFdoZW4gdXNlZCBhcyBhIHdvcmtlciBsYXVuY2hlciwgaXQgY3JlYXRlcyB0aGUgcHJveHkgd29ya2VyIGFuZCByZXR1cm5zIGl0LlxuICogICAtIFNob3VsZCBiZSBpbXBvcnRlZCB1c2luZyBgaW1wb3J0KClgIGluIHRoZSBtYWluIHRocmVhZCwgd2l0aCB0aGUgcXVlcnkgcGFyYW1ldGVyIGBpbXBvcnQ9MWAuXG4gKlxuICogVGhpcyBmaWxlIHdpbGwgYmUgYWx3YXlzIGNvbXBpbGluZyBpbnRvIEVTTSBmb3JtYXQuXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBPcnRXYXNtTWVzc2FnZSwgU2VyaWFsaXphYmxlVGVuc29yTWV0YWRhdGEgfSBmcm9tICcuLi9wcm94eS1tZXNzYWdlcy5qcyc7XG5pbXBvcnQge1xuICBjcmVhdGVTZXNzaW9uLFxuICBjb3B5RnJvbUV4dGVybmFsQnVmZmVyLFxuICBlbmRQcm9maWxpbmcsXG4gIGV4dHJhY3RUcmFuc2ZlcmFibGVCdWZmZXJzLFxuICBpbml0RXAsXG4gIGluaXRSdW50aW1lLFxuICByZWxlYXNlU2Vzc2lvbixcbiAgcnVuLFxufSBmcm9tICcuLi93YXNtLWNvcmUtaW1wbC5qcyc7XG5pbXBvcnQgeyBpbml0aWFsaXplV2ViQXNzZW1ibHkgfSBmcm9tICcuLi93YXNtLWZhY3RvcnkuanMnO1xuaW1wb3J0IHsgc2NyaXB0U3JjIH0gZnJvbSAnLi4vd2FzbS11dGlscy1pbXBvcnQuanMnO1xuXG5jb25zdCBXT1JLRVJfTkFNRSA9ICdvcnQtd2FzbS1wcm94eS13b3JrZXInO1xuY29uc3QgaXNQcm94eVdvcmtlciA9IGdsb2JhbFRoaXMuc2VsZj8ubmFtZSA9PT0gV09SS0VSX05BTUU7XG5cbmlmIChpc1Byb3h5V29ya2VyKSB7XG4gIC8vIFdvcmtlciB0aHJlYWRcbiAgc2VsZi5vbm1lc3NhZ2UgPSAoZXY6IE1lc3NhZ2VFdmVudDxPcnRXYXNtTWVzc2FnZT4pOiB2b2lkID0+IHtcbiAgICBjb25zdCB7IHR5cGUsIGluOiBtZXNzYWdlIH0gPSBldi5kYXRhO1xuICAgIHRyeSB7XG4gICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgY2FzZSAnaW5pdC13YXNtJzpcbiAgICAgICAgICBpbml0aWFsaXplV2ViQXNzZW1ibHkobWVzc2FnZSEud2FzbSkudGhlbihcbiAgICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgICAgaW5pdFJ1bnRpbWUobWVzc2FnZSEpLnRoZW4oXG4gICAgICAgICAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgcG9zdE1lc3NhZ2UoeyB0eXBlIH0pO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgcG9zdE1lc3NhZ2UoeyB0eXBlLCBlcnIgfSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgIHBvc3RNZXNzYWdlKHsgdHlwZSwgZXJyIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICApO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdpbml0LWVwJzoge1xuICAgICAgICAgIGNvbnN0IHsgZXBOYW1lLCBlbnYgfSA9IG1lc3NhZ2UhO1xuICAgICAgICAgIGluaXRFcChlbnYsIGVwTmFtZSkudGhlbihcbiAgICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgICAgcG9zdE1lc3NhZ2UoeyB0eXBlIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgcG9zdE1lc3NhZ2UoeyB0eXBlLCBlcnIgfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSAnY29weS1mcm9tJzoge1xuICAgICAgICAgIGNvbnN0IHsgYnVmZmVyIH0gPSBtZXNzYWdlITtcbiAgICAgICAgICBjb25zdCBidWZmZXJEYXRhID0gY29weUZyb21FeHRlcm5hbEJ1ZmZlcihidWZmZXIpO1xuICAgICAgICAgIHBvc3RNZXNzYWdlKHsgdHlwZSwgb3V0OiBidWZmZXJEYXRhIH0gYXMgT3J0V2FzbU1lc3NhZ2UpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgJ2NyZWF0ZSc6IHtcbiAgICAgICAgICBjb25zdCB7IG1vZGVsLCBvcHRpb25zIH0gPSBtZXNzYWdlITtcbiAgICAgICAgICBjcmVhdGVTZXNzaW9uKG1vZGVsLCBvcHRpb25zKS50aGVuKFxuICAgICAgICAgICAgKHNlc3Npb25NZXRhZGF0YSkgPT4ge1xuICAgICAgICAgICAgICBwb3N0TWVzc2FnZSh7IHR5cGUsIG91dDogc2Vzc2lvbk1ldGFkYXRhIH0gYXMgT3J0V2FzbU1lc3NhZ2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgcG9zdE1lc3NhZ2UoeyB0eXBlLCBlcnIgfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSAncmVsZWFzZSc6XG4gICAgICAgICAgcmVsZWFzZVNlc3Npb24obWVzc2FnZSEpO1xuICAgICAgICAgIHBvc3RNZXNzYWdlKHsgdHlwZSB9KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAncnVuJzoge1xuICAgICAgICAgIGNvbnN0IHsgc2Vzc2lvbklkLCBpbnB1dEluZGljZXMsIGlucHV0cywgb3V0cHV0SW5kaWNlcywgb3B0aW9ucyB9ID0gbWVzc2FnZSE7XG4gICAgICAgICAgcnVuKHNlc3Npb25JZCwgaW5wdXRJbmRpY2VzLCBpbnB1dHMsIG91dHB1dEluZGljZXMsIG5ldyBBcnJheShvdXRwdXRJbmRpY2VzLmxlbmd0aCkuZmlsbChudWxsKSwgb3B0aW9ucykudGhlbihcbiAgICAgICAgICAgIChvdXRwdXRzKSA9PiB7XG4gICAgICAgICAgICAgIGlmIChvdXRwdXRzLnNvbWUoKG8pID0+IG9bM10gIT09ICdjcHUnKSkge1xuICAgICAgICAgICAgICAgIHBvc3RNZXNzYWdlKHsgdHlwZSwgZXJyOiAnUHJveHkgZG9lcyBub3Qgc3VwcG9ydCBub24tY3B1IHRlbnNvciBsb2NhdGlvbi4nIH0pO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBvc3RNZXNzYWdlKFxuICAgICAgICAgICAgICAgICAgeyB0eXBlLCBvdXQ6IG91dHB1dHMgfSBhcyBPcnRXYXNtTWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgIGV4dHJhY3RUcmFuc2ZlcmFibGVCdWZmZXJzKFsuLi5pbnB1dHMsIC4uLm91dHB1dHNdIGFzIFNlcmlhbGl6YWJsZVRlbnNvck1ldGFkYXRhW10pLFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgIHBvc3RNZXNzYWdlKHsgdHlwZSwgZXJyIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICApO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgJ2VuZC1wcm9maWxpbmcnOlxuICAgICAgICAgIGVuZFByb2ZpbGluZyhtZXNzYWdlISk7XG4gICAgICAgICAgcG9zdE1lc3NhZ2UoeyB0eXBlIH0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgcG9zdE1lc3NhZ2UoeyB0eXBlLCBlcnIgfSBhcyBPcnRXYXNtTWVzc2FnZSk7XG4gICAgfVxuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBpc1Byb3h5V29ya2VyXG4gID8gbnVsbFxuICA6ICh1cmxPdmVycmlkZT86IHN0cmluZykgPT5cbiAgICAgIG5ldyBXb3JrZXIodXJsT3ZlcnJpZGUgPz8gc2NyaXB0U3JjISwgeyB0eXBlOiBCVUlMRF9ERUZTLklTX0VTTSA/ICdtb2R1bGUnIDogJ2NsYXNzaWMnLCBuYW1lOiBXT1JLRVJfTkFNRSB9KTtcbiIsICIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cblxuaW1wb3J0IHR5cGUgeyBPcnRXYXNtTW9kdWxlIH0gZnJvbSAnLi93YXNtLXR5cGVzJztcbmltcG9ydCB7IGlzTm9kZSB9IGZyb20gJy4vd2FzbS11dGlscy1lbnYnO1xuXG4vKipcbiAqIFRoZSBvcmlnaW4gb2YgdGhlIGN1cnJlbnQgbG9jYXRpb24uXG4gKlxuICogSW4gTm9kZS5qcywgdGhpcyBpcyB1bmRlZmluZWQuXG4gKi9cbmNvbnN0IG9yaWdpbiA9IGlzTm9kZSB8fCB0eXBlb2YgbG9jYXRpb24gPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogbG9jYXRpb24ub3JpZ2luO1xuXG4vKipcbiAqIFNvbWUgYnVuZGxlcnMgKGVnLiBXZWJwYWNrKSB3aWxsIHJld3JpdGUgYGltcG9ydC5tZXRhLnVybGAgdG8gYSBmaWxlIFVSTCBhdCBjb21waWxlIHRpbWUuXG4gKlxuICogVGhpcyBmdW5jdGlvbiBjaGVja3MgaWYgYGltcG9ydC5tZXRhLnVybGAgc3RhcnRzIHdpdGggYGZpbGU6YCwgYnV0IHVzaW5nIHRoZSBgPmAgYW5kIGA8YCBvcGVyYXRvcnMgaW5zdGVhZCBvZlxuICogYHN0YXJ0c1dpdGhgIGZ1bmN0aW9uIHNvIHRoYXQgY29kZSBtaW5pbWl6ZXJzIGNhbiByZW1vdmUgdGhlIGRlYWQgY29kZSBjb3JyZWN0bHkuXG4gKlxuICogRm9yIGV4YW1wbGUsIGlmIHdlIHVzZSB0ZXJzZXIgdG8gbWluaWZ5IHRoZSBmb2xsb3dpbmcgY29kZTpcbiAqIGBgYGpzXG4gKiBpZiAoXCJmaWxlOi8vaGFyZC1jb2RlZC1maWxlbmFtZVwiLnN0YXJ0c1dpdGgoXCJmaWxlOlwiKSkge1xuICogICBjb25zb2xlLmxvZygxKVxuICogfSBlbHNlIHtcbiAqICAgY29uc29sZS5sb2coMilcbiAqIH1cbiAqXG4gKiBpZiAoXCJmaWxlOi8vaGFyZC1jb2RlZC1maWxlbmFtZVwiID4gXCJmaWxlOlwiICYmIFwiZmlsZTovL2hhcmQtY29kZWQtZmlsZW5hbWVcIiA8IFwiZmlsZTtcIikge1xuICogICBjb25zb2xlLmxvZygzKVxuICogfSBlbHNlIHtcbiAqICAgY29uc29sZS5sb2coNClcbiAqIH1cbiAqIGBgYFxuICpcbiAqIFRoZSBtaW5pZmllZCBjb2RlIHdpbGwgYmU6XG4gKiBgYGBqc1xuICogXCJmaWxlOi8vaGFyZC1jb2RlZC1maWxlbmFtZVwiLnN0YXJ0c1dpdGgoXCJmaWxlOlwiKT9jb25zb2xlLmxvZygxKTpjb25zb2xlLmxvZygyKSxjb25zb2xlLmxvZygzKTtcbiAqIGBgYFxuICpcbiAqICh1c2UgVGVyc2VyIDUuMzkuMCB3aXRoIGRlZmF1bHQgb3B0aW9ucywgaHR0cHM6Ly90cnkudGVyc2VyLm9yZy8pXG4gKlxuICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgaW1wb3J0Lm1ldGEudXJsIGlzIGhhcmRjb2RlZCBhcyBhIGZpbGUgVVJJLlxuICovXG5leHBvcnQgY29uc3QgaXNFc21JbXBvcnRNZXRhVXJsSGFyZGNvZGVkQXNGaWxlVXJpID1cbiAgQlVJTERfREVGUy5JU19FU00gJiYgQlVJTERfREVGUy5FU01fSU1QT1JUX01FVEFfVVJMISA+ICdmaWxlOicgJiYgQlVJTERfREVGUy5FU01fSU1QT1JUX01FVEFfVVJMISA8ICdmaWxlOyc7XG5cbmNvbnN0IGdldFNjcmlwdFNyYyA9ICgpOiBzdHJpbmcgfCB1bmRlZmluZWQgPT4ge1xuICAvLyBpZiBOb2RlanMsIHJldHVybiB1bmRlZmluZWRcbiAgaWYgKGlzTm9kZSkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgLy8gaWYgSXQncyBFU00sIHVzZSBpbXBvcnQubWV0YS51cmxcbiAgaWYgKEJVSUxEX0RFRlMuSVNfRVNNKSB7XG4gICAgLy8gRm9yIEVTTSwgaWYgdGhlIGltcG9ydC5tZXRhLnVybCBpcyBhIGZpbGUgVVJMLCB0aGlzIHVzdWFsbHkgbWVhbnMgdGhlIGJ1bmRsZXIgcmV3cml0ZXMgYGltcG9ydC5tZXRhLnVybGAgdG9cbiAgICAvLyB0aGUgZmlsZSBwYXRoIGF0IGNvbXBpbGUgdGltZS4gSW4gdGhpcyBjYXNlLCB0aGlzIGZpbGUgcGF0aCBjYW5ub3QgYmUgdXNlZCB0byBkZXRlcm1pbmUgdGhlIHJ1bnRpbWUgVVJMLlxuICAgIC8vXG4gICAgLy8gV2UgbmVlZCB0byB1c2UgdGhlIFVSTCBjb25zdHJ1Y3RvciBsaWtlIHRoaXM6XG4gICAgLy8gYGBganNcbiAgICAvLyBuZXcgVVJMKCdhY3R1YWwtYnVuZGxlLW5hbWUuanMnLCBpbXBvcnQubWV0YS51cmwpLmhyZWZcbiAgICAvLyBgYGBcbiAgICAvLyBTbyB0aGF0IGJ1bmRsZXIgY2FuIHByZXByb2Nlc3MgdGhlIFVSTCBjb3JyZWN0bHkuXG4gICAgaWYgKGlzRXNtSW1wb3J0TWV0YVVybEhhcmRjb2RlZEFzRmlsZVVyaSkge1xuICAgICAgLy8gaWYgdGhlIHJld3JpdHRlbiBVUkwgaXMgYSByZWxhdGl2ZSBwYXRoLCB3ZSBuZWVkIHRvIHVzZSB0aGUgb3JpZ2luIHRvIHJlc29sdmUgdGhlIFVSTC5cblxuICAgICAgLy8gVGhlIGZvbGxvd2luZyBpcyBhIHdvcmthcm91bmQgZm9yIFZpdGUuXG4gICAgICAvL1xuICAgICAgLy8gVml0ZSB1c2VzIGEgYnVuZGxlcihyb2xsdXAvcm9sbGRvd24pIHRoYXQgZG9lcyBub3QgcmV3cml0ZSBgaW1wb3J0Lm1ldGEudXJsYCB0byBhIGZpbGUgVVJMLiBTbyBpbiB0aGVvcnksIHRoaXNcbiAgICAgIC8vIGNvZGUgcGF0aCBzaG91bGQgbm90IGJlIGV4ZWN1dGVkIGluIFZpdGUuIEhvd2V2ZXIsIHRoZSBidW5kbGVyIGRvZXMgbm90IGtub3cgaXQgYW5kIGl0IHN0aWxsIHRyeSB0byBsb2FkIHRoZVxuICAgICAgLy8gZm9sbG93aW5nIHBhdHRlcm46XG4gICAgICAvLyAtIGByZXR1cm4gbmV3IFVSTCgnZmlsZW5hbWUnLCBpbXBvcnQubWV0YS51cmwpLmhyZWZgXG4gICAgICAvL1xuICAgICAgLy8gQnkgcmVwbGFjaW5nIHRoZSBwYXR0ZXJuIGFib3ZlIHdpdGggdGhlIGZvbGxvd2luZyBjb2RlLCB3ZSBjYW4gc2tpcCB0aGUgcmVzb3VyY2UgbG9hZGluZyBiZWhhdmlvcjpcbiAgICAgIC8vIC0gYGNvbnN0IFVSTDIgPSBVUkw7IHJldHVybiBuZXcgVVJMMignZmlsZW5hbWUnLCBpbXBvcnQubWV0YS51cmwpLmhyZWY7YFxuICAgICAgLy9cbiAgICAgIC8vIEFuZCBpdCBzdGlsbCB3b3JrcyBpbiBXZWJwYWNrLlxuICAgICAgY29uc3QgVVJMMiA9IFVSTDtcbiAgICAgIHJldHVybiBuZXcgVVJMKG5ldyBVUkwyKEJVSUxEX0RFRlMuQlVORExFX0ZJTEVOQU1FLCBCVUlMRF9ERUZTLkVTTV9JTVBPUlRfTUVUQV9VUkwpLmhyZWYsIG9yaWdpbikuaHJlZjtcbiAgICB9XG5cbiAgICByZXR1cm4gQlVJTERfREVGUy5FU01fSU1QT1JUX01FVEFfVVJMO1xuICB9XG5cbiAgcmV0dXJuIHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCdcbiAgICA/IChkb2N1bWVudC5jdXJyZW50U2NyaXB0IGFzIEhUTUxTY3JpcHRFbGVtZW50KT8uc3JjXG4gICAgOiAvLyB1c2UgYHNlbGYubG9jYXRpb24uaHJlZmAgaWYgYXZhaWxhYmxlXG4gICAgICB0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCdcbiAgICAgID8gc2VsZi5sb2NhdGlvbj8uaHJlZlxuICAgICAgOiB1bmRlZmluZWQ7XG59O1xuXG4vKipcbiAqIFRoZSBjbGFzc2ljIHNjcmlwdCBzb3VyY2UgVVJMLiBUaGlzIGlzIG5vdCBhbHdheXMgYXZhaWxhYmxlIGluIG5vbiBFU01vZHVsZSBlbnZpcm9ubWVudHMuXG4gKlxuICogSW4gTm9kZS5qcywgdGhpcyBpcyB1bmRlZmluZWQuXG4gKi9cbmV4cG9ydCBjb25zdCBzY3JpcHRTcmMgPSBnZXRTY3JpcHRTcmMoKTtcblxuLyoqXG4gKiBJbmZlciB0aGUgd2FzbSBwYXRoIHByZWZpeCBmcm9tIHRoZSBzY3JpcHQgc291cmNlIFVSTC5cbiAqXG4gKiBAcmV0dXJucyBUaGUgaW5mZXJyZWQgd2FzbSBwYXRoIHByZWZpeCwgb3IgdW5kZWZpbmVkIGlmIHRoZSBzY3JpcHQgc291cmNlIFVSTCBpcyBub3QgYXZhaWxhYmxlIG9yIGlzIGEgYmxvYiBVUkwuXG4gKi9cbmV4cG9ydCBjb25zdCBpbmZlcldhc21QYXRoUHJlZml4RnJvbVNjcmlwdFNyYyA9ICgpOiBzdHJpbmcgfCB1bmRlZmluZWQgPT4ge1xuICBpZiAoc2NyaXB0U3JjICYmICFzY3JpcHRTcmMuc3RhcnRzV2l0aCgnYmxvYjonKSkge1xuICAgIHJldHVybiBzY3JpcHRTcmMuc3Vic3RyaW5nKDAsIHNjcmlwdFNyYy5sYXN0SW5kZXhPZignLycpICsgMSk7XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn07XG5cbi8qKlxuICogQ2hlY2sgaWYgdGhlIGdpdmVuIGZpbGVuYW1lIHdpdGggcHJlZml4IGlzIGZyb20gdGhlIHNhbWUgb3JpZ2luLlxuICovXG5jb25zdCBpc1NhbWVPcmlnaW4gPSAoZmlsZW5hbWU6IHN0cmluZywgcHJlZml4T3ZlcnJpZGU/OiBzdHJpbmcpID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBiYXNlVXJsID0gcHJlZml4T3ZlcnJpZGUgPz8gc2NyaXB0U3JjO1xuICAgIGNvbnN0IHVybCA9IGJhc2VVcmwgPyBuZXcgVVJMKGZpbGVuYW1lLCBiYXNlVXJsKSA6IG5ldyBVUkwoZmlsZW5hbWUpO1xuICAgIHJldHVybiB1cmwub3JpZ2luID09PSBvcmlnaW47XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufTtcblxuLyoqXG4gKiBOb3JtYWxpemUgdGhlIGlucHV0cyB0byBhbiBhYnNvbHV0ZSBVUkwgd2l0aCB0aGUgZ2l2ZW4gcHJlZml4IG92ZXJyaWRlLiBJZiBmYWlsZWQsIHJldHVybiB1bmRlZmluZWQuXG4gKi9cbmNvbnN0IG5vcm1hbGl6ZVVybCA9IChmaWxlbmFtZTogc3RyaW5nLCBwcmVmaXhPdmVycmlkZT86IHN0cmluZykgPT4ge1xuICBjb25zdCBiYXNlVXJsID0gcHJlZml4T3ZlcnJpZGUgPz8gc2NyaXB0U3JjO1xuICB0cnkge1xuICAgIGNvbnN0IHVybCA9IGJhc2VVcmwgPyBuZXcgVVJMKGZpbGVuYW1lLCBiYXNlVXJsKSA6IG5ldyBVUkwoZmlsZW5hbWUpO1xuICAgIHJldHVybiB1cmwuaHJlZjtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufTtcblxuLyoqXG4gKiBDcmVhdGUgYSBmYWxsYmFjayBVUkwgaWYgYW4gYWJzb2x1dGUgVVJMIGNhbm5vdCBiZSBjcmVhdGVkIGJ5IHRoZSBub3JtYWxpemVVcmwgZnVuY3Rpb24uXG4gKi9cbmNvbnN0IGZhbGxiYWNrVXJsID0gKGZpbGVuYW1lOiBzdHJpbmcsIHByZWZpeE92ZXJyaWRlPzogc3RyaW5nKSA9PiBgJHtwcmVmaXhPdmVycmlkZSA/PyAnLi8nfSR7ZmlsZW5hbWV9YDtcblxuLyoqXG4gKiBUaGlzIGhlbHBlciBmdW5jdGlvbiBpcyB1c2VkIHRvIHByZWxvYWQgYSBtb2R1bGUgZnJvbSBhIFVSTC5cbiAqXG4gKiBJZiB0aGUgb3JpZ2luIG9mIHRoZSB3b3JrZXIgVVJMIGlzIGRpZmZlcmVudCBmcm9tIHRoZSBjdXJyZW50IG9yaWdpbiwgdGhlIHdvcmtlciBjYW5ub3QgYmUgbG9hZGVkIGRpcmVjdGx5LlxuICogU2VlIGRpc2N1c3Npb25zIGluIGh0dHBzOi8vZ2l0aHViLmNvbS93ZWJwYWNrLWNvbnRyaWIvd29ya2VyLWxvYWRlci9pc3N1ZXMvMTU0XG4gKlxuICogSW4gdGhpcyBjYXNlLCB3ZSB3aWxsIGZldGNoIHRoZSB3b3JrZXIgVVJMIGFuZCBjcmVhdGUgYSBuZXcgQmxvYiBVUkwgd2l0aCB0aGUgc2FtZSBvcmlnaW4gYXMgYSB3b3JrYXJvdW5kLlxuICpcbiAqIEBwYXJhbSBhYnNvbHV0ZVVybCAtIFRoZSBhYnNvbHV0ZSBVUkwgdG8gcHJlbG9hZC5cbiAqXG4gKiBAcmV0dXJucyAtIEEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvIGEgbmV3IEJsb2IgVVJMXG4gKi9cbmNvbnN0IHByZWxvYWQgPSBhc3luYyAoYWJzb2x1dGVVcmw6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiA9PiB7XG4gIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYWJzb2x1dGVVcmwsIHsgY3JlZGVudGlhbHM6ICdzYW1lLW9yaWdpbicgfSk7XG4gIGNvbnN0IGJsb2IgPSBhd2FpdCByZXNwb25zZS5ibG9iKCk7XG4gIHJldHVybiBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xufTtcblxuLyoqXG4gKiBUaGlzIGhlbHBlciBmdW5jdGlvbiBpcyB1c2VkIHRvIGR5bmFtaWNhbGx5IGltcG9ydCBhIG1vZHVsZSBmcm9tIGEgVVJMLlxuICpcbiAqIFRoZSBidWlsZCBzY3JpcHQgaGFzIHNwZWNpYWwgaGFuZGxpbmcgZm9yIHRoaXMgZnVuY3Rpb24gdG8gZW5zdXJlIHRoYXQgdGhlIFVSTCBpcyBub3QgYnVuZGxlZCBpbnRvIHRoZSBmaW5hbCBvdXRwdXQuXG4gKlxuICogQHBhcmFtIHVybCAtIFRoZSBVUkwgdG8gaW1wb3J0LlxuICpcbiAqIEByZXR1cm5zIC0gQSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gdGhlIGRlZmF1bHQgZXhwb3J0IG9mIHRoZSBtb2R1bGUuXG4gKi9cbmNvbnN0IGR5bmFtaWNJbXBvcnREZWZhdWx0ID0gYXN5bmMgPFQ+KHVybDogc3RyaW5nKTogUHJvbWlzZTxUPiA9PlxuICAoYXdhaXQgaW1wb3J0KC8qIHdlYnBhY2tJZ25vcmU6IHRydWUgKi8gLyogQHZpdGUtaWdub3JlICovIHVybCkpLmRlZmF1bHQ7XG5cbi8qKlxuICogVGhlIHByb3h5IHdvcmtlciBmYWN0b3J5IGltcG9ydGVkIGZyb20gdGhlIHByb3h5IHdvcmtlciBtb2R1bGUuXG4gKlxuICogVGhpcyBpcyBvbmx5IGF2YWlsYWJsZSB3aGVuIHRoZSBXZWJBc3NlbWJseSBwcm94eSBpcyBub3QgZGlzYWJsZWQuXG4gKi9cbmNvbnN0IGNyZWF0ZVByb3h5V29ya2VyOiAoKHVybE92ZXJyaWRlPzogc3RyaW5nKSA9PiBXb3JrZXIpIHwgdW5kZWZpbmVkID1cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1yZXF1aXJlLWltcG9ydHMsIEB0eXBlc2NyaXB0LWVzbGludC9uby12YXItcmVxdWlyZXNcbiAgQlVJTERfREVGUy5ESVNBQkxFX1dBU01fUFJPWFkgPyB1bmRlZmluZWQgOiByZXF1aXJlKCcuL3Byb3h5LXdvcmtlci9tYWluJykuZGVmYXVsdDtcblxuLyoqXG4gKiBJbXBvcnQgdGhlIHByb3h5IHdvcmtlci5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIHdpbGwgcGVyZm9ybSB0aGUgZm9sbG93aW5nIHN0ZXBzOlxuICogMS4gSWYgYSBwcmVsb2FkIGlzIG5lZWRlZCwgaXQgd2lsbCBwcmVsb2FkIHRoZSBtb2R1bGUgYW5kIHJldHVybiB0aGUgb2JqZWN0IFVSTC5cbiAqIDIuIFVzZSB0aGUgcHJveHkgd29ya2VyIGZhY3RvcnkgdG8gY3JlYXRlIHRoZSBwcm94eSB3b3JrZXIuXG4gKlxuICogQHJldHVybnMgLSBBIHByb21pc2UgdGhhdCByZXNvbHZlcyB0byBhIHR1cGxlIG9mIDIgZWxlbWVudHM6XG4gKiAgICAgICAgICAgIC0gVGhlIG9iamVjdCBVUkwgb2YgdGhlIHByZWxvYWRlZCBtb2R1bGUsIG9yIHVuZGVmaW5lZCBpZiBubyBwcmVsb2FkIGlzIG5lZWRlZC5cbiAqICAgICAgICAgICAgLSBUaGUgcHJveHkgd29ya2VyLlxuICovXG5leHBvcnQgY29uc3QgaW1wb3J0UHJveHlXb3JrZXIgPSBhc3luYyAoKTogUHJvbWlzZTxbdW5kZWZpbmVkIHwgc3RyaW5nLCBXb3JrZXJdPiA9PiB7XG4gIGlmICghc2NyaXB0U3JjKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gbG9hZCBwcm94eSB3b3JrZXI6IGNhbm5vdCBkZXRlcm1pbmUgdGhlIHNjcmlwdCBzb3VyY2UgVVJMLicpO1xuICB9XG5cbiAgLy8gSWYgdGhlIHNjcmlwdCBzb3VyY2UgaXMgZnJvbSB0aGUgc2FtZSBvcmlnaW4sIHdlIGNhbiB1c2UgdGhlIGVtYmVkZGVkIHByb3h5IG1vZHVsZSBkaXJlY3RseS5cbiAgaWYgKGlzU2FtZU9yaWdpbihzY3JpcHRTcmMpKSB7XG4gICAgcmV0dXJuIFt1bmRlZmluZWQsIGNyZWF0ZVByb3h5V29ya2VyISgpXTtcbiAgfVxuXG4gIC8vIE90aGVyd2lzZSwgbmVlZCB0byBwcmVsb2FkXG4gIGNvbnN0IHVybCA9IGF3YWl0IHByZWxvYWQoc2NyaXB0U3JjKTtcbiAgcmV0dXJuIFt1cmwsIGNyZWF0ZVByb3h5V29ya2VyISh1cmwpXTtcbn07XG5cbi8qKlxuICogVGhlIGVtYmVkZGVkIFdlYkFzc2VtYmx5IG1vZHVsZS5cbiAqXG4gKiBUaGlzIGlzIG9ubHkgYXZhaWxhYmxlIGluIEVTTSBhbmQgd2hlbiBlbWJlZGRpbmcgaXMgbm90IGRpc2FibGVkLlxuICovXG5jb25zdCBlbWJlZGRlZFdhc21Nb2R1bGU6IEVtc2NyaXB0ZW5Nb2R1bGVGYWN0b3J5PE9ydFdhc21Nb2R1bGU+IHwgdW5kZWZpbmVkID1cbiAgQlVJTERfREVGUy5JU19FU00gJiYgQlVJTERfREVGUy5FTkFCTEVfQlVORExFX1dBU01fSlNcbiAgICA/IC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tcmVxdWlyZS1pbXBvcnRzLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdmFyLXJlcXVpcmVzXG4gICAgICByZXF1aXJlKFxuICAgICAgICAhQlVJTERfREVGUy5ESVNBQkxFX0pTRVBcbiAgICAgICAgICA/ICcuLi8uLi9kaXN0L29ydC13YXNtLXNpbWQtdGhyZWFkZWQuanNlcC5tanMnXG4gICAgICAgICAgOiBCVUlMRF9ERUZTLkVOQUJMRV9KU1BJXG4gICAgICAgICAgICA/ICcuLi8uLi9kaXN0L29ydC13YXNtLXNpbWQtdGhyZWFkZWQuanNwaS5tanMnXG4gICAgICAgICAgICA6ICFCVUlMRF9ERUZTLkRJU0FCTEVfV0VCR1BVXG4gICAgICAgICAgICAgID8gJy4uLy4uL2Rpc3Qvb3J0LXdhc20tc2ltZC10aHJlYWRlZC5hc3luY2lmeS5tanMnXG4gICAgICAgICAgICAgIDogJy4uLy4uL2Rpc3Qvb3J0LXdhc20tc2ltZC10aHJlYWRlZC5tanMnLFxuICAgICAgKS5kZWZhdWx0XG4gICAgOiB1bmRlZmluZWQ7XG5cbi8qKlxuICogSW1wb3J0IHRoZSBXZWJBc3NlbWJseSBtb2R1bGUuXG4gKlxuICogVGhpcyBmdW5jdGlvbiB3aWxsIHBlcmZvcm0gdGhlIGZvbGxvd2luZyBzdGVwczpcbiAqIDEuIElmIHRoZSBlbWJlZGRlZCBtb2R1bGUgZXhpc3RzIGFuZCBubyBjdXN0b20gVVJMIGlzIHNwZWNpZmllZCwgdXNlIHRoZSBlbWJlZGRlZCBtb2R1bGUuXG4gKiAyLiBJZiBhIHByZWxvYWQgaXMgbmVlZGVkLCBpdCB3aWxsIHByZWxvYWQgdGhlIG1vZHVsZSBhbmQgcmV0dXJuIHRoZSBvYmplY3QgVVJMLlxuICogMy4gT3RoZXJ3aXNlLCBpdCB3aWxsIHBlcmZvcm0gYSBkeW5hbWljIGltcG9ydCBvZiB0aGUgbW9kdWxlLlxuICpcbiAqIEByZXR1cm5zIC0gQSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gYSB0dXBsZSBvZiAyIGVsZW1lbnRzOlxuICogICAgICAgICAgICAtIFRoZSBvYmplY3QgVVJMIG9mIHRoZSBwcmVsb2FkZWQgbW9kdWxlLCBvciB1bmRlZmluZWQgaWYgbm8gcHJlbG9hZCBpcyBuZWVkZWQuXG4gKiAgICAgICAgICAgIC0gVGhlIGRlZmF1bHQgZXhwb3J0IG9mIHRoZSBtb2R1bGUsIHdoaWNoIGlzIGEgZmFjdG9yeSBmdW5jdGlvbiB0byBjcmVhdGUgdGhlIFdlYkFzc2VtYmx5IG1vZHVsZS5cbiAqL1xuZXhwb3J0IGNvbnN0IGltcG9ydFdhc21Nb2R1bGUgPSBhc3luYyAoXG4gIHVybE92ZXJyaWRlOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gIHByZWZpeE92ZXJyaWRlOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gIGlzTXVsdGlUaHJlYWRlZDogYm9vbGVhbixcbiAgaXNXYXNtT3ZlcnJpZGRlbjogYm9vbGVhbixcbik6IFByb21pc2U8W3VuZGVmaW5lZCB8IHN0cmluZywgRW1zY3JpcHRlbk1vZHVsZUZhY3Rvcnk8T3J0V2FzbU1vZHVsZT5dPiA9PiB7XG4gIC8vXG4gIC8vIENoZWNrIGlmIHdlIHNob3VsZCB1c2UgdGhlIGVtYmVkZGVkIG1vZHVsZS5cbiAgLy9cblxuICAvLyBUbyB1c2UgdGhlIGVtYmVkZGVkIG1vZHVsZSwgaXQgc2hvdWxkIGJlIGF2YWlsYWJsZSwgYW5kIG5vIFVSTCBvdmVycmlkZSBvciBwcmVmaXggb3ZlcnJpZGUgc2hvdWxkIGJlIHNwZWNpZmllZC5cbiAgbGV0IHVzZUVtYmVkZGVkTW9kdWxlID0gZW1iZWRkZWRXYXNtTW9kdWxlICYmICEodXJsT3ZlcnJpZGUgfHwgcHJlZml4T3ZlcnJpZGUpO1xuICBpZiAodXNlRW1iZWRkZWRNb2R1bGUpIHtcbiAgICBpZiAoIXNjcmlwdFNyYykge1xuICAgICAgLy8gbm8gVVJMIGluZm8gYXZhaWxhYmxlLlxuICAgICAgLy9cbiAgICAgIC8vIE5vdGU6IHdoZW4gdGhlIGVtYmVkZGVkIG1vZHVsZSBpcyBhdmFpbGFibGUsIGl0IG1lYW5zIHRoZSBjdXJyZW50IHNjcmlwdCBpcyBFU00uIFVzdWFsbHksIGluIEVTTSwgdGhlXG4gICAgICAvLyBgaW1wb3J0Lm1ldGEudXJsYCBpcyBhdmFpbGFibGUuIEJ1dCBpbiBzb21lIGNhc2VzIChlZy4gQ2xvdWRmbGFyZSBXb3JrZXJzKSwgdGhlIHZhbHVlIG9mIGBpbXBvcnQubWV0YS51cmxgXG4gICAgICAvLyBjYW4gYmUgYG51bGxgIG9yIGB1bmRlZmluZWRgLiBJbiB0aGlzIGNhc2UsIHdlIGNhbiBvbmx5IGxvYWQgdGhlIGVtYmVkZGVkIG1vZHVsZSB3aGVuOlxuICAgICAgLy9cbiAgICAgIC8vIDEuIFRoZSBXZWJBc3NlbWJseSBtb2R1bGUgYmluYXJ5IGlzIG92ZXJyaWRkZW46XG4gICAgICAvLyAgICBgYGBqc1xuICAgICAgLy8gICAgZW52Lndhc20ud2FzbVBhdGhzID0gdW5kZWZpbmVkOyAgLy8gb3Igbm90IHNwZWNpZmllZFxuICAgICAgLy8gICAgZW52Lndhc20ud2FzbUJpbmFyeSA9IC8qIGEgVWludDhBcnJheSBjb250YWluaW5nIHRoZSBXZWJBc3NlbWJseSBiaW5hcnkgKi87XG4gICAgICAvLyAgICBgYGBcbiAgICAgIC8vXG4gICAgICAvLyAyLiBUaGUgXCIud2FzbVwiIG9ubHkgaXMgb3ZlcnJpZGRlbi5cbiAgICAgIC8vICAgIGBgYGpzXG4gICAgICAvLyAgICBlbnYud2FzbS53YXNtUGF0aHMgPSB7IHdhc206IC8qIFVSTCBvZiB0aGUgLndhc20gZmlsZSAqLyB9O1xuICAgICAgLy8gICAgYGBgXG4gICAgICAvL1xuICAgICAgaWYgKGlzV2FzbU92ZXJyaWRkZW4gJiYgIWlzTXVsdGlUaHJlYWRlZCkge1xuICAgICAgICB1c2VFbWJlZGRlZE1vZHVsZSA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2Nhbm5vdCBkZXRlcm1pbmUgdGhlIHNjcmlwdCBzb3VyY2UgVVJMLicpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBpZiB0aGUgc2NyaXB0IHNvdXJjZSBpcyBhdmFpbGFibGUsIHdlIGNhbiBjaGVjayBpZiBpdCBpcyBmcm9tIHRoZSBzYW1lIG9yaWdpbi5cbiAgICAgIC8vIEFsc28gdXNlIHRoZSBlbWJlZGRlZCBtb2R1bGUgd2hlbiB3YXNtQmluYXJ5IGlzIHByb3ZpZGVkIGFuZCBzaW5nbGUtdGhyZWFkZWQgKGVnLiBCbG9iIFVSTCB3b3JrZXJzXG4gICAgICAvLyB3aGVyZSBpc1NhbWVPcmlnaW4gZmFpbHMgYnV0IG5vIGZpbGUgcmVzb2x1dGlvbiBvciB3b3JrZXIgc3Bhd25pbmcgaXMgbmVlZGVkKS5cbiAgICAgIHVzZUVtYmVkZGVkTW9kdWxlID0gaXNTYW1lT3JpZ2luKHNjcmlwdFNyYykgfHwgKGlzV2FzbU92ZXJyaWRkZW4gJiYgIWlzTXVsdGlUaHJlYWRlZCk7XG4gICAgfVxuICB9XG4gIGlmICh1c2VFbWJlZGRlZE1vZHVsZSkge1xuICAgIHJldHVybiBbdW5kZWZpbmVkLCBlbWJlZGRlZFdhc21Nb2R1bGUhXTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCB3YXNtTW9kdWxlRmlsZW5hbWUgPSAhQlVJTERfREVGUy5ESVNBQkxFX0pTRVBcbiAgICAgID8gJ29ydC13YXNtLXNpbWQtdGhyZWFkZWQuanNlcC5tanMnXG4gICAgICA6IEJVSUxEX0RFRlMuRU5BQkxFX0pTUElcbiAgICAgICAgPyAnb3J0LXdhc20tc2ltZC10aHJlYWRlZC5qc3BpLm1qcydcbiAgICAgICAgOiAhQlVJTERfREVGUy5ESVNBQkxFX1dFQkdQVVxuICAgICAgICAgID8gJ29ydC13YXNtLXNpbWQtdGhyZWFkZWQuYXN5bmNpZnkubWpzJ1xuICAgICAgICAgIDogJ29ydC13YXNtLXNpbWQtdGhyZWFkZWQubWpzJztcbiAgICBjb25zdCB3YXNtTW9kdWxlVXJsID0gdXJsT3ZlcnJpZGUgPz8gbm9ybWFsaXplVXJsKHdhc21Nb2R1bGVGaWxlbmFtZSwgcHJlZml4T3ZlcnJpZGUpO1xuICAgIC8vIG5lZWQgdG8gcHJlbG9hZCBpZiBhbGwgb2YgdGhlIGZvbGxvd2luZyBjb25kaXRpb25zIGFyZSBtZXQ6XG4gICAgLy8gMS4gbm90IGluIE5vZGUuanMuXG4gICAgLy8gICAgLSBOb2RlLmpzIGRvZXMgbm90IGhhdmUgdGhlIHNhbWUgb3JpZ2luIHBvbGljeSBmb3IgY3JlYXRpbmcgd29ya2Vycy5cbiAgICAvLyAyLiBtdWx0aS10aHJlYWRlZCBpcyBlbmFibGVkLlxuICAgIC8vICAgIC0gSWYgbXVsdGktdGhyZWFkZWQgaXMgZGlzYWJsZWQsIG5vIHdvcmtlciB3aWxsIGJlIGNyZWF0ZWQuIFNvIHdlIGRvbid0IG5lZWQgdG8gcHJlbG9hZCB0aGUgbW9kdWxlLlxuICAgIC8vIDMuIHRoZSBhYnNvbHV0ZSBVUkwgaXMgYXZhaWxhYmxlLlxuICAgIC8vICAgIC0gSWYgdGhlIGFic29sdXRlIFVSTCBpcyBmYWlsZWQgdG8gYmUgY3JlYXRlZCwgdGhlIG9yaWdpbiBjYW5ub3QgYmUgZGV0ZXJtaW5lZC4gSW4gdGhpcyBjYXNlLCB3ZSB3aWxsIG5vdFxuICAgIC8vICAgIHByZWxvYWQgdGhlIG1vZHVsZS5cbiAgICAvLyA0LiB0aGUgd29ya2VyIFVSTCBpcyBub3QgZnJvbSB0aGUgc2FtZSBvcmlnaW4uXG4gICAgLy8gICAgLSBJZiB0aGUgd29ya2VyIFVSTCBpcyBmcm9tIHRoZSBzYW1lIG9yaWdpbiwgd2UgY2FuIGNyZWF0ZSB0aGUgd29ya2VyIGRpcmVjdGx5LlxuICAgIGNvbnN0IG5lZWRQcmVsb2FkID0gIWlzTm9kZSAmJiBpc011bHRpVGhyZWFkZWQgJiYgd2FzbU1vZHVsZVVybCAmJiAhaXNTYW1lT3JpZ2luKHdhc21Nb2R1bGVVcmwsIHByZWZpeE92ZXJyaWRlKTtcbiAgICBjb25zdCB1cmwgPSBuZWVkUHJlbG9hZFxuICAgICAgPyBhd2FpdCBwcmVsb2FkKHdhc21Nb2R1bGVVcmwpXG4gICAgICA6ICh3YXNtTW9kdWxlVXJsID8/IGZhbGxiYWNrVXJsKHdhc21Nb2R1bGVGaWxlbmFtZSwgcHJlZml4T3ZlcnJpZGUpKTtcbiAgICByZXR1cm4gW25lZWRQcmVsb2FkID8gdXJsIDogdW5kZWZpbmVkLCBhd2FpdCBkeW5hbWljSW1wb3J0RGVmYXVsdDxFbXNjcmlwdGVuTW9kdWxlRmFjdG9yeTxPcnRXYXNtTW9kdWxlPj4odXJsKV07XG4gIH1cbn07XG4iLCAiLy8gQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG5cbmltcG9ydCB7IEVudiB9IGZyb20gJ29ubnhydW50aW1lLWNvbW1vbic7XG5cbmltcG9ydCB0eXBlIHsgT3J0V2FzbU1vZHVsZSB9IGZyb20gJy4vd2FzbS10eXBlcyc7XG5pbXBvcnQgeyBpbXBvcnRXYXNtTW9kdWxlLCBpbmZlcldhc21QYXRoUHJlZml4RnJvbVNjcmlwdFNyYyB9IGZyb20gJy4vd2FzbS11dGlscy1pbXBvcnQnO1xuXG5sZXQgd2FzbTogT3J0V2FzbU1vZHVsZSB8IHVuZGVmaW5lZDtcbmxldCBpbml0aWFsaXplZCA9IGZhbHNlO1xubGV0IGluaXRpYWxpemluZyA9IGZhbHNlO1xubGV0IGFib3J0ZWQgPSBmYWxzZTtcblxuY29uc3QgaXNNdWx0aVRocmVhZFN1cHBvcnRlZCA9ICgpOiBib29sZWFuID0+IHtcbiAgLy8gSWYgJ1NoYXJlZEFycmF5QnVmZmVyJyBpcyBub3QgYXZhaWxhYmxlLCBXZWJBc3NlbWJseSB0aHJlYWRzIHdpbGwgbm90IHdvcmsuXG4gIGlmICh0eXBlb2YgU2hhcmVkQXJyYXlCdWZmZXIgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgdHJ5IHtcbiAgICAvLyBUZXN0IGZvciB0cmFuc2ZlcmFiaWxpdHkgb2YgU0FCcyAoZm9yIGJyb3dzZXJzLiBuZWVkZWQgZm9yIEZpcmVmb3gpXG4gICAgLy8gaHR0cHM6Ly9ncm91cHMuZ29vZ2xlLmNvbS9mb3J1bS8jIW1zZy9tb3ppbGxhLmRldi5wbGF0Zm9ybS9JSGtCWmxIRVRwQS9kd3NNTmNoV0VRQUpcbiAgICBpZiAodHlwZW9mIE1lc3NhZ2VDaGFubmVsICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgbmV3IE1lc3NhZ2VDaGFubmVsKCkucG9ydDEucG9zdE1lc3NhZ2UobmV3IFNoYXJlZEFycmF5QnVmZmVyKDEpKTtcbiAgICB9XG5cbiAgICAvLyBUZXN0IGZvciBXZWJBc3NlbWJseSB0aHJlYWRzIGNhcGFiaWxpdHkgKGZvciBib3RoIGJyb3dzZXJzIGFuZCBOb2RlLmpzKVxuICAgIC8vIFRoaXMgdHlwZWQgYXJyYXkgaXMgYSBXZWJBc3NlbWJseSBwcm9ncmFtIGNvbnRhaW5pbmcgdGhyZWFkZWQgaW5zdHJ1Y3Rpb25zLlxuICAgIHJldHVybiBXZWJBc3NlbWJseS52YWxpZGF0ZShcbiAgICAgIG5ldyBVaW50OEFycmF5KFtcbiAgICAgICAgMCwgOTcsIDExNSwgMTA5LCAxLCAwLCAwLCAwLCAxLCA0LCAxLCA5NiwgMCwgMCwgMywgMiwgMSwgMCwgNSwgNCwgMSwgMywgMSwgMSwgMTAsIDExLCAxLCA5LCAwLCA2NSwgMCwgMjU0LCAxNixcbiAgICAgICAgMiwgMCwgMjYsIDExLFxuICAgICAgXSksXG4gICAgKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG5jb25zdCBpc1NpbWRTdXBwb3J0ZWQgPSAoKTogYm9vbGVhbiA9PiB7XG4gIHRyeSB7XG4gICAgLy8gVGVzdCBmb3IgV2ViQXNzZW1ibHkgU0lNRCBjYXBhYmlsaXR5IChmb3IgYm90aCBicm93c2VycyBhbmQgTm9kZS5qcylcbiAgICAvLyBUaGlzIHR5cGVkIGFycmF5IGlzIGEgV2ViQXNzZW1ibHkgcHJvZ3JhbSBjb250YWluaW5nIFNJTUQgaW5zdHJ1Y3Rpb25zLlxuXG4gICAgLy8gVGhlIGJpbmFyeSBkYXRhIGlzIGdlbmVyYXRlZCBmcm9tIHRoZSBmb2xsb3dpbmcgY29kZSBieSB3YXQyd2FzbTpcbiAgICAvL1xuICAgIC8vIChtb2R1bGVcbiAgICAvLyAgICh0eXBlICR0MCAoZnVuYykpXG4gICAgLy8gICAoZnVuYyAkZjAgKHR5cGUgJHQwKVxuICAgIC8vICAgICAoZHJvcFxuICAgIC8vICAgICAgIChpMzJ4NC5kb3RfaTE2eDhfc1xuICAgIC8vICAgICAgICAgKGk4eDE2LnNwbGF0XG4gICAgLy8gICAgICAgICAgIChpMzIuY29uc3QgMCkpXG4gICAgLy8gICAgICAgICAodjEyOC5jb25zdCBpMzJ4NCAweDAwMDAwMDAwIDB4MDAwMDAwMDAgMHgwMDAwMDAwMCAweDAwMDAwMDAwKSkpKSlcblxuICAgIHJldHVybiBXZWJBc3NlbWJseS52YWxpZGF0ZShcbiAgICAgIG5ldyBVaW50OEFycmF5KFtcbiAgICAgICAgMCwgOTcsIDExNSwgMTA5LCAxLCAwLCAwLCAwLCAxLCA0LCAxLCA5NiwgMCwgMCwgMywgMiwgMSwgMCwgMTAsIDMwLCAxLCAyOCwgMCwgNjUsIDAsIDI1MywgMTUsIDI1MywgMTIsIDAsIDAsIDAsXG4gICAgICAgIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDI1MywgMTg2LCAxLCAyNiwgMTEsXG4gICAgICBdKSxcbiAgICApO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn07XG5cbmNvbnN0IGlzUmVsYXhlZFNpbWRTdXBwb3J0ZWQgPSAoKTogYm9vbGVhbiA9PiB7XG4gIHRyeSB7XG4gICAgLy8gVGVzdCBmb3IgV2ViQXNzZW1ibHkgUmVsYXhlZCBTSU1EIGNhcGFiaWxpdHkgKGZvciBib3RoIGJyb3dzZXJzIGFuZCBOb2RlLmpzKVxuICAgIC8vIFRoaXMgdHlwZWQgYXJyYXkgaXMgYSBXZWJBc3NlbWJseSBwcm9ncmFtIGNvbnRhaW5pbmcgUmVsYXhlZCBTSU1EIGluc3RydWN0aW9ucy5cblxuICAgIC8vIFRoZSBiaW5hcnkgZGF0YSBpcyBnZW5lcmF0ZWQgZnJvbSB0aGUgZm9sbG93aW5nIGNvZGUgYnkgd2F0Mndhc206XG4gICAgLy8gKG1vZHVsZVxuICAgIC8vICAgKGZ1bmMgKHJlc3VsdCB2MTI4KVxuICAgIC8vICAgICAgaTMyLmNvbnN0IDFcbiAgICAvLyAgICAgIGk4eDE2LnNwbGF0XG4gICAgLy8gICAgICBpMzIuY29uc3QgMlxuICAgIC8vICAgICAgaTh4MTYuc3BsYXRcbiAgICAvLyAgICAgIGkzMi5jb25zdCAzXG4gICAgLy8gICAgICBpOHgxNi5zcGxhdFxuICAgIC8vICAgICAgaTMyeDQucmVsYXhlZF9kb3RfaTh4MTZfaTd4MTZfYWRkX3NcbiAgICAvLyAgIClcbiAgICAvLyAgKVxuICAgIHJldHVybiBXZWJBc3NlbWJseS52YWxpZGF0ZShcbiAgICAgIG5ldyBVaW50OEFycmF5KFtcbiAgICAgICAgMCwgOTcsIDExNSwgMTA5LCAxLCAwLCAwLCAwLCAxLCA1LCAxLCA5NiwgMCwgMSwgMTIzLCAzLCAyLCAxLCAwLCAxMCwgMTksIDEsIDE3LCAwLCA2NSwgMSwgMjUzLCAxNSwgNjUsIDIsIDI1MyxcbiAgICAgICAgMTUsIDY1LCAzLCAyNTMsIDE1LCAyNTMsIDE0NywgMiwgMTEsXG4gICAgICBdKSxcbiAgICApO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn07XG5cbmV4cG9ydCBjb25zdCBpbml0aWFsaXplV2ViQXNzZW1ibHkgPSBhc3luYyAoZmxhZ3M6IEVudi5XZWJBc3NlbWJseUZsYWdzKTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gIGlmIChpbml0aWFsaXplZCkge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgfVxuICBpZiAoaW5pdGlhbGl6aW5nKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwibXVsdGlwbGUgY2FsbHMgdG8gJ2luaXRpYWxpemVXZWJBc3NlbWJseSgpJyBkZXRlY3RlZC5cIik7XG4gIH1cbiAgaWYgKGFib3J0ZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJwcmV2aW91cyBjYWxsIHRvICdpbml0aWFsaXplV2ViQXNzZW1ibHkoKScgZmFpbGVkLlwiKTtcbiAgfVxuXG4gIGluaXRpYWxpemluZyA9IHRydWU7XG5cbiAgLy8gd2FzbSBmbGFncyBhcmUgYWxyZWFkeSBpbml0aWFsaXplZFxuICBjb25zdCB0aW1lb3V0ID0gZmxhZ3MuaW5pdFRpbWVvdXQhO1xuICBsZXQgbnVtVGhyZWFkcyA9IGZsYWdzLm51bVRocmVhZHMhO1xuXG4gIC8vIGVuc3VyZSBTSU1EIGlzIHN1cHBvcnRlZFxuICBpZiAoZmxhZ3Muc2ltZCA9PT0gZmFsc2UpIHtcbiAgICAvLyBza2lwIFNJTUQgZmVhdHVyZSBjaGVja2luZyBhcyBpdCBpcyBkaXNhYmxlZCBleHBsaWNpdGx5IGJ5IHVzZXJcbiAgfSBlbHNlIGlmIChmbGFncy5zaW1kID09PSAncmVsYXhlZCcpIHtcbiAgICAvLyBjaGVjayBpZiByZWxheGVkIFNJTUQgaXMgc3VwcG9ydGVkXG4gICAgaWYgKCFpc1JlbGF4ZWRTaW1kU3VwcG9ydGVkKCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignUmVsYXhlZCBXZWJBc3NlbWJseSBTSU1EIGlzIG5vdCBzdXBwb3J0ZWQgaW4gdGhlIGN1cnJlbnQgZW52aXJvbm1lbnQuJyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKCFpc1NpbWRTdXBwb3J0ZWQoKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignV2ViQXNzZW1ibHkgU0lNRCBpcyBub3Qgc3VwcG9ydGVkIGluIHRoZSBjdXJyZW50IGVudmlyb25tZW50LicpO1xuICB9XG5cbiAgaWYgKEJVSUxEX0RFRlMuRU5BQkxFX0pTUEkpIHtcbiAgICBpZiAoISgnU3VzcGVuZGluZycgaW4gV2ViQXNzZW1ibHkpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1dlYkFzc2VtYmx5IEpTUEkgaXMgbm90IHN1cHBvcnRlZCBpbiB0aGUgY3VycmVudCBlbnZpcm9ubWVudC4nKTtcbiAgICB9XG4gIH1cblxuICAvLyBjaGVjayBpZiBtdWx0aS10aHJlYWRpbmcgaXMgc3VwcG9ydGVkXG4gIGNvbnN0IG11bHRpVGhyZWFkU3VwcG9ydGVkID0gaXNNdWx0aVRocmVhZFN1cHBvcnRlZCgpO1xuICBpZiAobnVtVGhyZWFkcyA+IDEgJiYgIW11bHRpVGhyZWFkU3VwcG9ydGVkKSB7XG4gICAgaWYgKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJyAmJiAhc2VsZi5jcm9zc09yaWdpbklzb2xhdGVkKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAnZW52Lndhc20ubnVtVGhyZWFkcyBpcyBzZXQgdG8gJyArXG4gICAgICAgICAgbnVtVGhyZWFkcyArXG4gICAgICAgICAgJywgYnV0IHRoaXMgd2lsbCBub3Qgd29yayB1bmxlc3MgeW91IGVuYWJsZSBjcm9zc09yaWdpbklzb2xhdGVkIG1vZGUuICcgK1xuICAgICAgICAgICdTZWUgaHR0cHM6Ly93ZWIuZGV2L2Nyb3NzLW9yaWdpbi1pc29sYXRpb24tZ3VpZGUvIGZvciBtb3JlIGluZm8uJyxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLndhcm4oXG4gICAgICAnV2ViQXNzZW1ibHkgbXVsdGktdGhyZWFkaW5nIGlzIG5vdCBzdXBwb3J0ZWQgaW4gdGhlIGN1cnJlbnQgZW52aXJvbm1lbnQuICcgKyAnRmFsbGluZyBiYWNrIHRvIHNpbmdsZS10aHJlYWRpbmcuJyxcbiAgICApO1xuXG4gICAgLy8gc2V0IGZsYWdzLm51bVRocmVhZHMgdG8gMSBzbyB0aGF0IE9ydEluaXQoKSB3aWxsIG5vdCBjcmVhdGUgYSBnbG9iYWwgdGhyZWFkIHBvb2wuXG4gICAgZmxhZ3MubnVtVGhyZWFkcyA9IG51bVRocmVhZHMgPSAxO1xuICB9XG5cbiAgY29uc3Qgd2FzbVBhdGhzID0gZmxhZ3Mud2FzbVBhdGhzO1xuICBjb25zdCB3YXNtUHJlZml4T3ZlcnJpZGUgPSB0eXBlb2Ygd2FzbVBhdGhzID09PSAnc3RyaW5nJyA/IHdhc21QYXRocyA6IHVuZGVmaW5lZDtcbiAgY29uc3QgbWpzUGF0aE92ZXJyaWRlRmxhZyA9ICh3YXNtUGF0aHMgYXMgRW52Lldhc21GaWxlUGF0aHMpPy5tanM7XG4gIGNvbnN0IG1qc1BhdGhPdmVycmlkZSA9IChtanNQYXRoT3ZlcnJpZGVGbGFnIGFzIFVSTCk/LmhyZWYgPz8gbWpzUGF0aE92ZXJyaWRlRmxhZztcbiAgY29uc3Qgd2FzbVBhdGhPdmVycmlkZUZsYWcgPSAod2FzbVBhdGhzIGFzIEVudi5XYXNtRmlsZVBhdGhzKT8ud2FzbTtcbiAgY29uc3Qgd2FzbVBhdGhPdmVycmlkZSA9ICh3YXNtUGF0aE92ZXJyaWRlRmxhZyBhcyBVUkwpPy5ocmVmID8/IHdhc21QYXRoT3ZlcnJpZGVGbGFnO1xuICBjb25zdCB3YXNtQmluYXJ5T3ZlcnJpZGUgPSBmbGFncy53YXNtQmluYXJ5O1xuXG4gIGNvbnN0IFtvYmplY3RVcmwsIG9ydFdhc21GYWN0b3J5XSA9IGF3YWl0IGltcG9ydFdhc21Nb2R1bGUoXG4gICAgbWpzUGF0aE92ZXJyaWRlLFxuICAgIHdhc21QcmVmaXhPdmVycmlkZSxcbiAgICBudW1UaHJlYWRzID4gMSxcbiAgICAhIXdhc21CaW5hcnlPdmVycmlkZSB8fCAhIXdhc21QYXRoT3ZlcnJpZGUsXG4gICk7XG5cbiAgbGV0IGlzVGltZW91dCA9IGZhbHNlO1xuXG4gIGNvbnN0IHRhc2tzOiBBcnJheTxQcm9taXNlPHZvaWQ+PiA9IFtdO1xuXG4gIC8vIHByb21pc2UgZm9yIHRpbWVvdXRcbiAgaWYgKHRpbWVvdXQgPiAwKSB7XG4gICAgdGFza3MucHVzaChcbiAgICAgIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIGlzVGltZW91dCA9IHRydWU7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9LCB0aW1lb3V0KTtcbiAgICAgIH0pLFxuICAgICk7XG4gIH1cblxuICAvLyBwcm9taXNlIGZvciBtb2R1bGUgaW5pdGlhbGl6YXRpb25cbiAgdGFza3MucHVzaChcbiAgICBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCBjb25maWc6IFBhcnRpYWw8T3J0V2FzbU1vZHVsZT4gPSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGUgbnVtYmVyIG9mIHRocmVhZHMuIFdlYkFzc2VtYmx5IHdpbGwgY3JlYXRlIChNb2R1bGUubnVtVGhyZWFkcyAtIDEpIHdvcmtlcnMuIElmIGl0IGlzIDEsIG5vIHdvcmtlciB3aWxsIGJlXG4gICAgICAgICAqIGNyZWF0ZWQuXG4gICAgICAgICAqL1xuICAgICAgICBudW1UaHJlYWRzLFxuICAgICAgfTtcblxuICAgICAgaWYgKHdhc21CaW5hcnlPdmVycmlkZSkge1xuICAgICAgICAvLyBTZXQgYSBjdXN0b20gYnVmZmVyIHdoaWNoIGNvbnRhaW5zIHRoZSBXZWJBc3NlbWJseSBiaW5hcnkuIFRoaXMgd2lsbCBza2lwIHRoZSB3YXNtIGZpbGUgZmV0Y2hpbmcuXG4gICAgICAgIGNvbmZpZy53YXNtQmluYXJ5ID0gd2FzbUJpbmFyeU92ZXJyaWRlO1xuXG4gICAgICAgIC8vIE9mZmVyIGFuIGltcGxlbWVudGF0aW9uIG9mIGxvY2F0ZUZpbGUoKSB0aGF0IHJldHVybnMgdGhlIGZpbGUgbmFtZSBkaXJlY3RseS4gVGhpcyBoZWxwcyB0byBhdm9pZCBhbiBlcnJvclxuICAgICAgICAvLyB0aHJvd24gbGF0ZXIgZnJvbSB0aGUgZm9sbG93aW5nIGNvZGUgd2hlbiBgaW1wb3J0Lm1ldGEudXJsYCBpcyBhIGJsb2IgVVJMOlxuICAgICAgICAvLyBgYGBcbiAgICAgICAgLy8gICByZXR1cm4gbmV3IFVSTChcIm9ydC13YXNtLXNpbWQtdGhyZWFkZWQuanNlcC53YXNtXCIsIGltcG9ydC5tZXRhLnVybCkuaHJlZjtcbiAgICAgICAgLy8gYGBgXG4gICAgICAgIGNvbmZpZy5sb2NhdGVGaWxlID0gKGZpbGVOYW1lKSA9PiBmaWxlTmFtZTtcbiAgICAgIH0gZWxzZSBpZiAod2FzbVBhdGhPdmVycmlkZSB8fCB3YXNtUHJlZml4T3ZlcnJpZGUpIHtcbiAgICAgICAgLy8gQSBjYWxsYmFjayBmdW5jdGlvbiB0byBsb2NhdGUgdGhlIFdlYkFzc2VtYmx5IGZpbGUuIFRoZSBmdW5jdGlvbiBzaG91bGQgcmV0dXJuIHRoZSBmdWxsIHBhdGggb2YgdGhlIGZpbGUuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFNpbmNlIEVtc2NyaXB0ZW4gMy4xLjU4LCB0aGlzIGZ1bmN0aW9uIGlzIG9ubHkgY2FsbGVkIGZvciB0aGUgLndhc20gZmlsZS5cbiAgICAgICAgY29uZmlnLmxvY2F0ZUZpbGUgPSAoZmlsZU5hbWUpID0+IHdhc21QYXRoT3ZlcnJpZGUgPz8gd2FzbVByZWZpeE92ZXJyaWRlICsgZmlsZU5hbWU7XG4gICAgICB9IGVsc2UgaWYgKG1qc1BhdGhPdmVycmlkZSAmJiBtanNQYXRoT3ZlcnJpZGUuaW5kZXhPZignYmxvYjonKSAhPT0gMCkge1xuICAgICAgICAvLyBpZiBtanMgcGF0aCBpcyBzcGVjaWZpZWQsIHVzZSBpdCBhcyB0aGUgYmFzZSBwYXRoIGZvciB0aGUgLndhc20gZmlsZS5cbiAgICAgICAgY29uZmlnLmxvY2F0ZUZpbGUgPSAoZmlsZU5hbWUpID0+IG5ldyBVUkwoZmlsZU5hbWUsIG1qc1BhdGhPdmVycmlkZSkuaHJlZjtcbiAgICAgIH0gZWxzZSBpZiAob2JqZWN0VXJsKSB7XG4gICAgICAgIGNvbnN0IGluZmVycmVkV2FzbVBhdGhQcmVmaXggPSBpbmZlcldhc21QYXRoUHJlZml4RnJvbVNjcmlwdFNyYygpO1xuICAgICAgICBpZiAoaW5mZXJyZWRXYXNtUGF0aFByZWZpeCkge1xuICAgICAgICAgIC8vIGlmIHRoZSB3YXNtIG1vZHVsZSBpcyBwcmVsb2FkZWQsIHVzZSB0aGUgaW5mZXJyZWQgd2FzbSBwYXRoIGFzIHRoZSBiYXNlIHBhdGggZm9yIHRoZSAud2FzbSBmaWxlLlxuICAgICAgICAgIGNvbmZpZy5sb2NhdGVGaWxlID0gKGZpbGVOYW1lKSA9PiBpbmZlcnJlZFdhc21QYXRoUHJlZml4ICsgZmlsZU5hbWU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgb3J0V2FzbUZhY3RvcnkoY29uZmlnKS50aGVuKFxuICAgICAgICAvLyB3YXNtIG1vZHVsZSBpbml0aWFsaXplZCBzdWNjZXNzZnVsbHlcbiAgICAgICAgKG1vZHVsZSkgPT4ge1xuICAgICAgICAgIGluaXRpYWxpemluZyA9IGZhbHNlO1xuICAgICAgICAgIGluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgICB3YXNtID0gbW9kdWxlO1xuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICBpZiAob2JqZWN0VXJsKSB7XG4gICAgICAgICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKG9iamVjdFVybCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAvLyB3YXNtIG1vZHVsZSBmYWlsZWQgdG8gaW5pdGlhbGl6ZVxuICAgICAgICAod2hhdCkgPT4ge1xuICAgICAgICAgIGluaXRpYWxpemluZyA9IGZhbHNlO1xuICAgICAgICAgIGFib3J0ZWQgPSB0cnVlO1xuICAgICAgICAgIHJlamVjdCh3aGF0KTtcbiAgICAgICAgfSxcbiAgICAgICk7XG4gICAgfSksXG4gICk7XG5cbiAgYXdhaXQgUHJvbWlzZS5yYWNlKHRhc2tzKTtcblxuICBpZiAoaXNUaW1lb3V0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBXZWJBc3NlbWJseSBiYWNrZW5kIGluaXRpYWxpemluZyBmYWlsZWQgZHVlIHRvIHRpbWVvdXQ6ICR7dGltZW91dH1tc2ApO1xuICB9XG59O1xuXG5leHBvcnQgY29uc3QgZ2V0SW5zdGFuY2UgPSAoKTogT3J0V2FzbU1vZHVsZSA9PiB7XG4gIGlmIChpbml0aWFsaXplZCAmJiB3YXNtKSB7XG4gICAgcmV0dXJuIHdhc207XG4gIH1cblxuICB0aHJvdyBuZXcgRXJyb3IoJ1dlYkFzc2VtYmx5IGlzIG5vdCBpbml0aWFsaXplZCB5ZXQuJyk7XG59O1xuXG5leHBvcnQgY29uc3QgZGlzcG9zZSA9ICgpOiB2b2lkID0+IHtcbiAgaWYgKGluaXRpYWxpemVkICYmICFpbml0aWFsaXppbmcgJiYgIWFib3J0ZWQpIHtcbiAgICAvLyBUT0RPOiBjdXJyZW50bHkgXCJQVGhyZWFkLnRlcm1pbmF0ZUFsbFRocmVhZHMoKVwiIGlzIG5vdCBleHBvc2VkIGluIHRoZSB3YXNtIG1vZHVsZS5cbiAgICAvLyAgICAgICBBbmQgdGhpcyBmdW5jdGlvbiBpcyBub3QgeWV0IGNhbGxlZCBieSBhbnkgY29kZS5cbiAgICAvLyAgICAgICBJZiBpdCBpcyBuZWVkZWQgaW4gdGhlIGZ1dHVyZSwgd2Ugc2hvdWxkIGV4cG9zZSBpdCBpbiB0aGUgd2FzbSBtb2R1bGUgYW5kIHVuY29tbWVudCB0aGUgZm9sbG93aW5nIGxpbmUuXG5cbiAgICAvLyB3YXNtPy5QVGhyZWFkPy50ZXJtaW5hdGVBbGxUaHJlYWRzKCk7XG4gICAgd2FzbSA9IHVuZGVmaW5lZDtcblxuICAgIGluaXRpYWxpemluZyA9IGZhbHNlO1xuICAgIGluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgYWJvcnRlZCA9IHRydWU7XG4gIH1cbn07XG4iLCAiLy8gQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG5cbmltcG9ydCB7IGdldEluc3RhbmNlIH0gZnJvbSAnLi93YXNtLWZhY3RvcnknO1xuXG5leHBvcnQgY29uc3QgYWxsb2NXYXNtU3RyaW5nID0gKGRhdGE6IHN0cmluZywgYWxsb2NzOiBudW1iZXJbXSk6IG51bWJlciA9PiB7XG4gIGNvbnN0IHdhc20gPSBnZXRJbnN0YW5jZSgpO1xuXG4gIGNvbnN0IGRhdGFMZW5ndGggPSB3YXNtLmxlbmd0aEJ5dGVzVVRGOChkYXRhKSArIDE7XG4gIGNvbnN0IGRhdGFPZmZzZXQgPSB3YXNtLl9tYWxsb2MoZGF0YUxlbmd0aCk7XG4gIHdhc20uc3RyaW5nVG9VVEY4KGRhdGEsIGRhdGFPZmZzZXQsIGRhdGFMZW5ndGgpO1xuICBhbGxvY3MucHVzaChkYXRhT2Zmc2V0KTtcblxuICByZXR1cm4gZGF0YU9mZnNldDtcbn07XG5cbmludGVyZmFjZSBFeHRyYU9wdGlvbnNIYW5kbGVyIHtcbiAgKG5hbWU6IHN0cmluZywgdmFsdWU6IHN0cmluZyk6IHZvaWQ7XG59XG5cbmV4cG9ydCBjb25zdCBpdGVyYXRlRXh0cmFPcHRpb25zID0gKFxuICBvcHRpb25zOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgcHJlZml4OiBzdHJpbmcsXG4gIHNlZW46IFdlYWtTZXQ8UmVjb3JkPHN0cmluZywgdW5rbm93bj4+LFxuICBoYW5kbGVyOiBFeHRyYU9wdGlvbnNIYW5kbGVyLFxuKTogdm9pZCA9PiB7XG4gIGlmICh0eXBlb2Ygb3B0aW9ucyA9PSAnb2JqZWN0JyAmJiBvcHRpb25zICE9PSBudWxsKSB7XG4gICAgaWYgKHNlZW4uaGFzKG9wdGlvbnMpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NpcmN1bGFyIHJlZmVyZW5jZSBpbiBvcHRpb25zJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNlZW4uYWRkKG9wdGlvbnMpO1xuICAgIH1cbiAgfVxuXG4gIE9iamVjdC5lbnRyaWVzKG9wdGlvbnMpLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xuICAgIGNvbnN0IG5hbWUgPSBwcmVmaXggPyBwcmVmaXggKyBrZXkgOiBrZXk7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGl0ZXJhdGVFeHRyYU9wdGlvbnModmFsdWUgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4sIG5hbWUgKyAnLicsIHNlZW4sIGhhbmRsZXIpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgICBoYW5kbGVyKG5hbWUsIHZhbHVlLnRvU3RyaW5nKCkpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnYm9vbGVhbicpIHtcbiAgICAgIGhhbmRsZXIobmFtZSwgdmFsdWUgPyAnMScgOiAnMCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbid0IGhhbmRsZSBleHRyYSBjb25maWcgdHlwZTogJHt0eXBlb2YgdmFsdWV9YCk7XG4gICAgfVxuICB9KTtcbn07XG5cbi8qKlxuICogY2hlY2sgd2ViIGFzc2VtYmx5IEFQSSdzIGxhc3QgZXJyb3IgYW5kIHRocm93IGVycm9yIGlmIGFueSBlcnJvciBvY2N1cnJlZC5cbiAqIEBwYXJhbSBtZXNzYWdlIGEgbWVzc2FnZSB1c2VkIHdoZW4gYW4gZXJyb3Igb2NjdXJyZWQuXG4gKi9cbmV4cG9ydCBjb25zdCBjaGVja0xhc3RFcnJvciA9IChtZXNzYWdlOiBzdHJpbmcpOiB2b2lkID0+IHtcbiAgY29uc3Qgd2FzbSA9IGdldEluc3RhbmNlKCk7XG5cbiAgY29uc3Qgc3RhY2sgPSB3YXNtLnN0YWNrU2F2ZSgpO1xuICB0cnkge1xuICAgIGNvbnN0IHB0clNpemUgPSB3YXNtLlBUUl9TSVpFO1xuICAgIGNvbnN0IHBhcmFtc09mZnNldCA9IHdhc20uc3RhY2tBbGxvYygyICogcHRyU2l6ZSk7XG4gICAgd2FzbS5fT3J0R2V0TGFzdEVycm9yKHBhcmFtc09mZnNldCwgcGFyYW1zT2Zmc2V0ICsgcHRyU2l6ZSk7XG4gICAgY29uc3QgZXJyb3JDb2RlID0gTnVtYmVyKHdhc20uZ2V0VmFsdWUocGFyYW1zT2Zmc2V0LCBwdHJTaXplID09PSA0ID8gJ2kzMicgOiAnaTY0JykpO1xuICAgIGNvbnN0IGVycm9yTWVzc2FnZVBvaW50ZXIgPSB3YXNtLmdldFZhbHVlKHBhcmFtc09mZnNldCArIHB0clNpemUsICcqJyk7XG4gICAgY29uc3QgZXJyb3JNZXNzYWdlID0gZXJyb3JNZXNzYWdlUG9pbnRlciA/IHdhc20uVVRGOFRvU3RyaW5nKGVycm9yTWVzc2FnZVBvaW50ZXIpIDogJyc7XG4gICAgdGhyb3cgbmV3IEVycm9yKGAke21lc3NhZ2V9IEVSUk9SX0NPREU6ICR7ZXJyb3JDb2RlfSwgRVJST1JfTUVTU0FHRTogJHtlcnJvck1lc3NhZ2V9YCk7XG4gIH0gZmluYWxseSB7XG4gICAgd2FzbS5zdGFja1Jlc3RvcmUoc3RhY2spO1xuICB9XG59O1xuIiwgIi8vIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuXG5pbXBvcnQgeyBJbmZlcmVuY2VTZXNzaW9uIH0gZnJvbSAnb25ueHJ1bnRpbWUtY29tbW9uJztcblxuaW1wb3J0IHsgZ2V0SW5zdGFuY2UgfSBmcm9tICcuL3dhc20tZmFjdG9yeSc7XG5pbXBvcnQgeyBhbGxvY1dhc21TdHJpbmcsIGNoZWNrTGFzdEVycm9yLCBpdGVyYXRlRXh0cmFPcHRpb25zIH0gZnJvbSAnLi93YXNtLXV0aWxzJztcblxuZXhwb3J0IGNvbnN0IHNldFJ1bk9wdGlvbnMgPSAob3B0aW9uczogSW5mZXJlbmNlU2Vzc2lvbi5SdW5PcHRpb25zKTogW251bWJlciwgbnVtYmVyW11dID0+IHtcbiAgY29uc3Qgd2FzbSA9IGdldEluc3RhbmNlKCk7XG4gIGxldCBydW5PcHRpb25zSGFuZGxlID0gMDtcbiAgY29uc3QgYWxsb2NzOiBudW1iZXJbXSA9IFtdO1xuXG4gIGNvbnN0IHJ1bk9wdGlvbnM6IEluZmVyZW5jZVNlc3Npb24uUnVuT3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgdHJ5IHtcbiAgICBpZiAob3B0aW9ucz8ubG9nU2V2ZXJpdHlMZXZlbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBydW5PcHRpb25zLmxvZ1NldmVyaXR5TGV2ZWwgPSAyOyAvLyBEZWZhdWx0IHRvIHdhcm5pbmdcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgdHlwZW9mIG9wdGlvbnMubG9nU2V2ZXJpdHlMZXZlbCAhPT0gJ251bWJlcicgfHxcbiAgICAgICFOdW1iZXIuaXNJbnRlZ2VyKG9wdGlvbnMubG9nU2V2ZXJpdHlMZXZlbCkgfHxcbiAgICAgIG9wdGlvbnMubG9nU2V2ZXJpdHlMZXZlbCA8IDAgfHxcbiAgICAgIG9wdGlvbnMubG9nU2V2ZXJpdHlMZXZlbCA+IDRcbiAgICApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgbG9nIHNldmVyaXR5IGxldmVsIGlzIG5vdCB2YWxpZDogJHtvcHRpb25zLmxvZ1NldmVyaXR5TGV2ZWx9YCk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnM/LmxvZ1ZlcmJvc2l0eUxldmVsID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJ1bk9wdGlvbnMubG9nVmVyYm9zaXR5TGV2ZWwgPSAwOyAvLyBEZWZhdWx0IHRvIDBcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBvcHRpb25zLmxvZ1ZlcmJvc2l0eUxldmVsICE9PSAnbnVtYmVyJyB8fCAhTnVtYmVyLmlzSW50ZWdlcihvcHRpb25zLmxvZ1ZlcmJvc2l0eUxldmVsKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBsb2cgdmVyYm9zaXR5IGxldmVsIGlzIG5vdCB2YWxpZDogJHtvcHRpb25zLmxvZ1ZlcmJvc2l0eUxldmVsfWApO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zPy50ZXJtaW5hdGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcnVuT3B0aW9ucy50ZXJtaW5hdGUgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBsZXQgdGFnRGF0YU9mZnNldCA9IDA7XG4gICAgaWYgKG9wdGlvbnM/LnRhZyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0YWdEYXRhT2Zmc2V0ID0gYWxsb2NXYXNtU3RyaW5nKG9wdGlvbnMudGFnLCBhbGxvY3MpO1xuICAgIH1cblxuICAgIHJ1bk9wdGlvbnNIYW5kbGUgPSB3YXNtLl9PcnRDcmVhdGVSdW5PcHRpb25zKFxuICAgICAgcnVuT3B0aW9ucy5sb2dTZXZlcml0eUxldmVsISxcbiAgICAgIHJ1bk9wdGlvbnMubG9nVmVyYm9zaXR5TGV2ZWwhLFxuICAgICAgISFydW5PcHRpb25zLnRlcm1pbmF0ZSEsXG4gICAgICB0YWdEYXRhT2Zmc2V0LFxuICAgICk7XG4gICAgaWYgKHJ1bk9wdGlvbnNIYW5kbGUgPT09IDApIHtcbiAgICAgIGNoZWNrTGFzdEVycm9yKFwiQ2FuJ3QgY3JlYXRlIHJ1biBvcHRpb25zLlwiKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucz8uZXh0cmEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgaXRlcmF0ZUV4dHJhT3B0aW9ucyhvcHRpb25zLmV4dHJhLCAnJywgbmV3IFdlYWtTZXQ8UmVjb3JkPHN0cmluZywgdW5rbm93bj4+KCksIChrZXksIHZhbHVlKSA9PiB7XG4gICAgICAgIGNvbnN0IGtleURhdGFPZmZzZXQgPSBhbGxvY1dhc21TdHJpbmcoa2V5LCBhbGxvY3MpO1xuICAgICAgICBjb25zdCB2YWx1ZURhdGFPZmZzZXQgPSBhbGxvY1dhc21TdHJpbmcodmFsdWUsIGFsbG9jcyk7XG5cbiAgICAgICAgaWYgKHdhc20uX09ydEFkZFJ1bkNvbmZpZ0VudHJ5KHJ1bk9wdGlvbnNIYW5kbGUsIGtleURhdGFPZmZzZXQsIHZhbHVlRGF0YU9mZnNldCkgIT09IDApIHtcbiAgICAgICAgICBjaGVja0xhc3RFcnJvcihgQ2FuJ3Qgc2V0IGEgcnVuIGNvbmZpZyBlbnRyeTogJHtrZXl9IC0gJHt2YWx1ZX0uYCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBbcnVuT3B0aW9uc0hhbmRsZSwgYWxsb2NzXTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGlmIChydW5PcHRpb25zSGFuZGxlICE9PSAwKSB7XG4gICAgICB3YXNtLl9PcnRSZWxlYXNlUnVuT3B0aW9ucyhydW5PcHRpb25zSGFuZGxlKTtcbiAgICB9XG4gICAgYWxsb2NzLmZvckVhY2goKGFsbG9jKSA9PiB3YXNtLl9mcmVlKGFsbG9jKSk7XG4gICAgdGhyb3cgZTtcbiAgfVxufTtcbiIsICIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cblxuaW1wb3J0IHR5cGUgeyBJbmZlcmVuY2VTZXNzaW9uIH0gZnJvbSAnb25ueHJ1bnRpbWUtY29tbW9uJztcblxuaW1wb3J0IHsgZ2V0SW5zdGFuY2UgfSBmcm9tICcuL3dhc20tZmFjdG9yeSc7XG5pbXBvcnQgeyBhbGxvY1dhc21TdHJpbmcsIGNoZWNrTGFzdEVycm9yLCBpdGVyYXRlRXh0cmFPcHRpb25zIH0gZnJvbSAnLi93YXNtLXV0aWxzJztcblxuY29uc3QgZ2V0R3JhcGhPcHRpbXphdGlvbkxldmVsID0gKGdyYXBoT3B0aW1pemF0aW9uTGV2ZWw6IHN0cmluZyB8IHVua25vd24pOiBudW1iZXIgPT4ge1xuICBzd2l0Y2ggKGdyYXBoT3B0aW1pemF0aW9uTGV2ZWwpIHtcbiAgICBjYXNlICdkaXNhYmxlZCc6XG4gICAgICByZXR1cm4gMDtcbiAgICBjYXNlICdiYXNpYyc6XG4gICAgICByZXR1cm4gMTtcbiAgICBjYXNlICdleHRlbmRlZCc6XG4gICAgICByZXR1cm4gMjtcbiAgICBjYXNlICdsYXlvdXQnOlxuICAgICAgcmV0dXJuIDM7XG4gICAgY2FzZSAnYWxsJzpcbiAgICAgIHJldHVybiA5OTtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGB1bnN1cHBvcnRlZCBncmFwaCBvcHRpbWl6YXRpb24gbGV2ZWw6ICR7Z3JhcGhPcHRpbWl6YXRpb25MZXZlbH1gKTtcbiAgfVxufTtcblxuY29uc3QgZ2V0RXhlY3V0aW9uTW9kZSA9IChleGVjdXRpb25Nb2RlOiAnc2VxdWVudGlhbCcgfCAncGFyYWxsZWwnKTogbnVtYmVyID0+IHtcbiAgc3dpdGNoIChleGVjdXRpb25Nb2RlKSB7XG4gICAgY2FzZSAnc2VxdWVudGlhbCc6XG4gICAgICByZXR1cm4gMDtcbiAgICBjYXNlICdwYXJhbGxlbCc6XG4gICAgICByZXR1cm4gMTtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGB1bnN1cHBvcnRlZCBleGVjdXRpb24gbW9kZTogJHtleGVjdXRpb25Nb2RlfWApO1xuICB9XG59O1xuXG5jb25zdCBhcHBlbmREZWZhdWx0T3B0aW9ucyA9IChvcHRpb25zOiBJbmZlcmVuY2VTZXNzaW9uLlNlc3Npb25PcHRpb25zKTogdm9pZCA9PiB7XG4gIGlmICghb3B0aW9ucy5leHRyYSkge1xuICAgIG9wdGlvbnMuZXh0cmEgPSB7fTtcbiAgfVxuICBpZiAoIW9wdGlvbnMuZXh0cmEuc2Vzc2lvbikge1xuICAgIG9wdGlvbnMuZXh0cmEuc2Vzc2lvbiA9IHt9O1xuICB9XG4gIGNvbnN0IHNlc3Npb24gPSBvcHRpb25zLmV4dHJhLnNlc3Npb24gYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgaWYgKCFzZXNzaW9uLnVzZV9vcnRfbW9kZWxfYnl0ZXNfZGlyZWN0bHkpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgY2FtZWxjYXNlXG4gICAgc2Vzc2lvbi51c2Vfb3J0X21vZGVsX2J5dGVzX2RpcmVjdGx5ID0gJzEnO1xuICB9XG5cbiAgLy8gaWYgdXNpbmcgSlNFUCB3aXRoIFdlYkdQVSwgYWx3YXlzIGRpc2FibGUgbWVtb3J5IHBhdHRlcm5cbiAgaWYgKFxuICAgIG9wdGlvbnMuZXhlY3V0aW9uUHJvdmlkZXJzICYmXG4gICAgb3B0aW9ucy5leGVjdXRpb25Qcm92aWRlcnMuc29tZSgoZXApID0+ICh0eXBlb2YgZXAgPT09ICdzdHJpbmcnID8gZXAgOiBlcC5uYW1lKSA9PT0gJ3dlYmdwdScpXG4gICkge1xuICAgIG9wdGlvbnMuZW5hYmxlTWVtUGF0dGVybiA9IGZhbHNlO1xuICB9XG59O1xuXG5jb25zdCBhcHBlbmRTZXNzaW9uQ29uZmlnID0gKHNlc3Npb25PcHRpb25zSGFuZGxlOiBudW1iZXIsIGtleTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nLCBhbGxvY3M6IG51bWJlcltdKTogdm9pZCA9PiB7XG4gIGNvbnN0IGtleURhdGFPZmZzZXQgPSBhbGxvY1dhc21TdHJpbmcoa2V5LCBhbGxvY3MpO1xuICBjb25zdCB2YWx1ZURhdGFPZmZzZXQgPSBhbGxvY1dhc21TdHJpbmcodmFsdWUsIGFsbG9jcyk7XG4gIGlmIChnZXRJbnN0YW5jZSgpLl9PcnRBZGRTZXNzaW9uQ29uZmlnRW50cnkoc2Vzc2lvbk9wdGlvbnNIYW5kbGUsIGtleURhdGFPZmZzZXQsIHZhbHVlRGF0YU9mZnNldCkgIT09IDApIHtcbiAgICBjaGVja0xhc3RFcnJvcihgQ2FuJ3Qgc2V0IGEgc2Vzc2lvbiBjb25maWcgZW50cnk6ICR7a2V5fSAtICR7dmFsdWV9LmApO1xuICB9XG59O1xuXG5jb25zdCBhcHBlbmRFcE9wdGlvbiA9IChlcE9wdGlvbnM6IEFycmF5PFtudW1iZXIsIG51bWJlcl0+LCBrZXk6IHN0cmluZywgdmFsdWU6IHN0cmluZywgYWxsb2NzOiBudW1iZXJbXSk6IHZvaWQgPT4ge1xuICBjb25zdCBrZXlEYXRhT2Zmc2V0ID0gYWxsb2NXYXNtU3RyaW5nKGtleSwgYWxsb2NzKTtcbiAgY29uc3QgdmFsdWVEYXRhT2Zmc2V0ID0gYWxsb2NXYXNtU3RyaW5nKHZhbHVlLCBhbGxvY3MpO1xuICBlcE9wdGlvbnMucHVzaChba2V5RGF0YU9mZnNldCwgdmFsdWVEYXRhT2Zmc2V0XSk7XG59O1xuXG5jb25zdCBzZXRFeGVjdXRpb25Qcm92aWRlcnMgPSBhc3luYyAoXG4gIHNlc3Npb25PcHRpb25zSGFuZGxlOiBudW1iZXIsXG4gIHNlc3Npb25PcHRpb25zOiBJbmZlcmVuY2VTZXNzaW9uLlNlc3Npb25PcHRpb25zLFxuICBhbGxvY3M6IG51bWJlcltdLFxuKTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gIGNvbnN0IGV4ZWN1dGlvblByb3ZpZGVycyA9IHNlc3Npb25PcHRpb25zLmV4ZWN1dGlvblByb3ZpZGVycyE7XG4gIGZvciAoY29uc3QgZXAgb2YgZXhlY3V0aW9uUHJvdmlkZXJzKSB7XG4gICAgbGV0IGVwTmFtZSA9IHR5cGVvZiBlcCA9PT0gJ3N0cmluZycgPyBlcCA6IGVwLm5hbWU7XG4gICAgY29uc3QgZXBPcHRpb25zOiBBcnJheTxbbnVtYmVyLCBudW1iZXJdPiA9IFtdO1xuXG4gICAgLy8gY2hlY2sgRVAgbmFtZVxuICAgIHN3aXRjaCAoZXBOYW1lKSB7XG4gICAgICBjYXNlICd3ZWJubic6XG4gICAgICAgIGVwTmFtZSA9ICdXRUJOTic7XG4gICAgICAgIC8vIERpc2FibGUgUURRIGZ1c2lvbiBzbyBEUS9RIG5vZGVzIGFyZSBwcmVzZXJ2ZWQgYXMgaW5kaXZpZHVhbCBvcHMgZm9yIFdlYk5OIEVQLlxuICAgICAgICBhcHBlbmRTZXNzaW9uQ29uZmlnKHNlc3Npb25PcHRpb25zSGFuZGxlLCAnc2Vzc2lvbi5kaXNhYmxlX3F1YW50X3FkcScsICcxJywgYWxsb2NzKTtcbiAgICAgICAgLy8gRm9yY2libHkgcHJldmVudCBjb25zdGFudCBmb2xkaW5nIGZyb20gcmVwbGFjaW5nIERRIG5vZGVzIHdpdGggY29uc3RhbnRzLlxuICAgICAgICBhcHBlbmRTZXNzaW9uQ29uZmlnKHNlc3Npb25PcHRpb25zSGFuZGxlLCAnc2Vzc2lvbi5kaXNhYmxlX3FkcV9jb25zdGFudF9mb2xkaW5nJywgJzEnLCBhbGxvY3MpO1xuICAgICAgICBpZiAodHlwZW9mIGVwICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIGNvbnN0IHdlYm5uT3B0aW9ucyA9IGVwIGFzIEluZmVyZW5jZVNlc3Npb24uV2ViTk5FeGVjdXRpb25Qcm92aWRlck9wdGlvbjtcbiAgICAgICAgICAvLyBjb25zdCBjb250ZXh0ID0gKHdlYm5uT3B0aW9ucyBhcyBJbmZlcmVuY2VTZXNzaW9uLldlYk5OT3B0aW9uc1dpdGhNTENvbnRleHQpPy5jb250ZXh0O1xuICAgICAgICAgIGNvbnN0IGRldmljZVR5cGUgPSAod2Vibm5PcHRpb25zIGFzIEluZmVyZW5jZVNlc3Npb24uV2ViTk5Db250ZXh0T3B0aW9ucyk/LmRldmljZVR5cGU7XG4gICAgICAgICAgaWYgKGRldmljZVR5cGUpIHtcbiAgICAgICAgICAgIGFwcGVuZFNlc3Npb25Db25maWcoc2Vzc2lvbk9wdGlvbnNIYW5kbGUsICdkZXZpY2VUeXBlJywgZGV2aWNlVHlwZSwgYWxsb2NzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICd3ZWJncHUnOlxuICAgICAgICBpZiAoIUJVSUxEX0RFRlMuRElTQUJMRV9XRUJHUFUpIHtcbiAgICAgICAgICBlcE5hbWUgPSAnV2ViR1BVJztcbiAgICAgICAgICBsZXQgY3VzdG9tRGV2aWNlOiBHUFVEZXZpY2UgfCB1bmRlZmluZWQ7XG5cbiAgICAgICAgICBpZiAodHlwZW9mIGVwICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgY29uc3Qgd2ViZ3B1T3B0aW9ucyA9IGVwIGFzIEluZmVyZW5jZVNlc3Npb24uV2ViR3B1RXhlY3V0aW9uUHJvdmlkZXJPcHRpb247XG5cbiAgICAgICAgICAgIC8vIHNldCBjdXN0b20gR1BVIGRldmljZVxuICAgICAgICAgICAgaWYgKHdlYmdwdU9wdGlvbnMuZGV2aWNlKSB7XG4gICAgICAgICAgICAgIGlmICh0eXBlb2YgR1BVRGV2aWNlICE9PSAndW5kZWZpbmVkJyAmJiB3ZWJncHVPcHRpb25zLmRldmljZSBpbnN0YW5jZW9mIEdQVURldmljZSkge1xuICAgICAgICAgICAgICAgIGN1c3RvbURldmljZSA9IHdlYmdwdU9wdGlvbnMuZGV2aWNlO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBHUFUgZGV2aWNlIHNldCBpbiBXZWJHUFUgRVAgb3B0aW9ucy4nKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBzZXQgZ3JhcGggY2FwdHVyZSBvcHRpb24gZnJvbSBzZXNzaW9uIG9wdGlvbnNcbiAgICAgICAgICAgIGNvbnN0IHsgZW5hYmxlR3JhcGhDYXB0dXJlIH0gPSBzZXNzaW9uT3B0aW9ucztcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZW5hYmxlR3JhcGhDYXB0dXJlID09PSAnYm9vbGVhbicgJiYgZW5hYmxlR3JhcGhDYXB0dXJlKSB7XG4gICAgICAgICAgICAgIGFwcGVuZEVwT3B0aW9uKGVwT3B0aW9ucywgJ2VuYWJsZUdyYXBoQ2FwdHVyZScsICcxJywgYWxsb2NzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gc2V0IGxheW91dCBvcHRpb25cbiAgICAgICAgICAgIGlmICh0eXBlb2Ygd2ViZ3B1T3B0aW9ucy5wcmVmZXJyZWRMYXlvdXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgIGFwcGVuZEVwT3B0aW9uKGVwT3B0aW9ucywgJ3ByZWZlcnJlZExheW91dCcsIHdlYmdwdU9wdGlvbnMucHJlZmVycmVkTGF5b3V0LCBhbGxvY3MpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBzZXQgZm9yY2UgQ1BVIGZhbGxiYWNrIG5vZGVzXG4gICAgICAgICAgICBpZiAod2ViZ3B1T3B0aW9ucy5mb3JjZUNwdU5vZGVOYW1lcykge1xuICAgICAgICAgICAgICBjb25zdCBuYW1lcyA9IEFycmF5LmlzQXJyYXkod2ViZ3B1T3B0aW9ucy5mb3JjZUNwdU5vZGVOYW1lcylcbiAgICAgICAgICAgICAgICA/IHdlYmdwdU9wdGlvbnMuZm9yY2VDcHVOb2RlTmFtZXNcbiAgICAgICAgICAgICAgICA6IFt3ZWJncHVPcHRpb25zLmZvcmNlQ3B1Tm9kZU5hbWVzXTtcblxuICAgICAgICAgICAgICBhcHBlbmRFcE9wdGlvbihlcE9wdGlvbnMsICdmb3JjZUNwdU5vZGVOYW1lcycsIG5hbWVzLmpvaW4oJ1xcbicpLCBhbGxvY3MpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBzZXQgdmFsaWRhdGlvbiBtb2RlXG4gICAgICAgICAgICBpZiAod2ViZ3B1T3B0aW9ucy52YWxpZGF0aW9uTW9kZSkge1xuICAgICAgICAgICAgICBhcHBlbmRFcE9wdGlvbihlcE9wdGlvbnMsICd2YWxpZGF0aW9uTW9kZScsIHdlYmdwdU9wdGlvbnMudmFsaWRhdGlvbk1vZGUsIGFsbG9jcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgaW5mbyA9IGdldEluc3RhbmNlKCkud2ViZ3B1UmVnaXN0ZXJEZXZpY2UhKGN1c3RvbURldmljZSk7XG4gICAgICAgICAgaWYgKGluZm8pIHtcbiAgICAgICAgICAgIGNvbnN0IFtkZXZpY2VJZCwgaW5zdGFuY2VIYW5kbGUsIGRldmljZUhhbmRsZV0gPSBpbmZvO1xuICAgICAgICAgICAgYXBwZW5kRXBPcHRpb24oZXBPcHRpb25zLCAnZGV2aWNlSWQnLCBkZXZpY2VJZC50b1N0cmluZygpLCBhbGxvY3MpO1xuICAgICAgICAgICAgYXBwZW5kRXBPcHRpb24oZXBPcHRpb25zLCAnd2ViZ3B1SW5zdGFuY2UnLCBpbnN0YW5jZUhhbmRsZS50b1N0cmluZygpLCBhbGxvY3MpO1xuICAgICAgICAgICAgYXBwZW5kRXBPcHRpb24oZXBPcHRpb25zLCAnd2ViZ3B1RGV2aWNlJywgZGV2aWNlSGFuZGxlLnRvU3RyaW5nKCksIGFsbG9jcyk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGVwTmFtZSA9ICdKUyc7XG4gICAgICAgICAgaWYgKHR5cGVvZiBlcCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGNvbnN0IHdlYmdwdU9wdGlvbnMgPSBlcCBhcyBJbmZlcmVuY2VTZXNzaW9uLldlYkdwdUV4ZWN1dGlvblByb3ZpZGVyT3B0aW9uO1xuICAgICAgICAgICAgaWYgKHdlYmdwdU9wdGlvbnM/LnByZWZlcnJlZExheW91dCkge1xuICAgICAgICAgICAgICBpZiAod2ViZ3B1T3B0aW9ucy5wcmVmZXJyZWRMYXlvdXQgIT09ICdOQ0hXJyAmJiB3ZWJncHVPcHRpb25zLnByZWZlcnJlZExheW91dCAhPT0gJ05IV0MnKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBwcmVmZXJyZWRMYXlvdXQgbXVzdCBiZSBlaXRoZXIgJ05DSFcnIG9yICdOSFdDJzogJHt3ZWJncHVPcHRpb25zLnByZWZlcnJlZExheW91dH1gKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBhcHBlbmRTZXNzaW9uQ29uZmlnKHNlc3Npb25PcHRpb25zSGFuZGxlLCAncHJlZmVycmVkTGF5b3V0Jywgd2ViZ3B1T3B0aW9ucy5wcmVmZXJyZWRMYXlvdXQsIGFsbG9jcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnd2FzbSc6XG4gICAgICBjYXNlICdjcHUnOlxuICAgICAgICBjb250aW51ZTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgbm90IHN1cHBvcnRlZCBleGVjdXRpb24gcHJvdmlkZXI6ICR7ZXBOYW1lfWApO1xuICAgIH1cblxuICAgIGNvbnN0IGVwTmFtZURhdGFPZmZzZXQgPSBhbGxvY1dhc21TdHJpbmcoZXBOYW1lLCBhbGxvY3MpO1xuICAgIGNvbnN0IGVwT3B0aW9uc0NvdW50ID0gZXBPcHRpb25zLmxlbmd0aDtcbiAgICBsZXQga2V5c09mZnNldCA9IDA7XG4gICAgbGV0IHZhbHVlc09mZnNldCA9IDA7XG4gICAgaWYgKGVwT3B0aW9uc0NvdW50ID4gMCkge1xuICAgICAga2V5c09mZnNldCA9IGdldEluc3RhbmNlKCkuX21hbGxvYyhlcE9wdGlvbnNDb3VudCAqIGdldEluc3RhbmNlKCkuUFRSX1NJWkUpO1xuICAgICAgYWxsb2NzLnB1c2goa2V5c09mZnNldCk7XG4gICAgICB2YWx1ZXNPZmZzZXQgPSBnZXRJbnN0YW5jZSgpLl9tYWxsb2MoZXBPcHRpb25zQ291bnQgKiBnZXRJbnN0YW5jZSgpLlBUUl9TSVpFKTtcbiAgICAgIGFsbG9jcy5wdXNoKHZhbHVlc09mZnNldCk7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGVwT3B0aW9uc0NvdW50OyBpKyspIHtcbiAgICAgICAgZ2V0SW5zdGFuY2UoKS5zZXRWYWx1ZShrZXlzT2Zmc2V0ICsgaSAqIGdldEluc3RhbmNlKCkuUFRSX1NJWkUsIGVwT3B0aW9uc1tpXVswXSwgJyonKTtcbiAgICAgICAgZ2V0SW5zdGFuY2UoKS5zZXRWYWx1ZSh2YWx1ZXNPZmZzZXQgKyBpICogZ2V0SW5zdGFuY2UoKS5QVFJfU0laRSwgZXBPcHRpb25zW2ldWzFdLCAnKicpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoXG4gICAgICAoYXdhaXQgZ2V0SW5zdGFuY2UoKS5fT3J0QXBwZW5kRXhlY3V0aW9uUHJvdmlkZXIoXG4gICAgICAgIHNlc3Npb25PcHRpb25zSGFuZGxlLFxuICAgICAgICBlcE5hbWVEYXRhT2Zmc2V0LFxuICAgICAgICBrZXlzT2Zmc2V0LFxuICAgICAgICB2YWx1ZXNPZmZzZXQsXG4gICAgICAgIGVwT3B0aW9uc0NvdW50LFxuICAgICAgKSkgIT09IDBcbiAgICApIHtcbiAgICAgIGNoZWNrTGFzdEVycm9yKGBDYW4ndCBhcHBlbmQgZXhlY3V0aW9uIHByb3ZpZGVyOiAke2VwTmFtZX0uYCk7XG4gICAgfVxuICB9XG59O1xuXG5leHBvcnQgY29uc3Qgc2V0U2Vzc2lvbk9wdGlvbnMgPSBhc3luYyAob3B0aW9ucz86IEluZmVyZW5jZVNlc3Npb24uU2Vzc2lvbk9wdGlvbnMpOiBQcm9taXNlPFtudW1iZXIsIG51bWJlcltdXT4gPT4ge1xuICBjb25zdCB3YXNtID0gZ2V0SW5zdGFuY2UoKTtcbiAgbGV0IHNlc3Npb25PcHRpb25zSGFuZGxlID0gMDtcbiAgY29uc3QgYWxsb2NzOiBudW1iZXJbXSA9IFtdO1xuXG4gIGNvbnN0IHNlc3Npb25PcHRpb25zOiBJbmZlcmVuY2VTZXNzaW9uLlNlc3Npb25PcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgYXBwZW5kRGVmYXVsdE9wdGlvbnMoc2Vzc2lvbk9wdGlvbnMpO1xuXG4gIHRyeSB7XG4gICAgY29uc3QgZ3JhcGhPcHRpbWl6YXRpb25MZXZlbCA9IGdldEdyYXBoT3B0aW16YXRpb25MZXZlbChzZXNzaW9uT3B0aW9ucy5ncmFwaE9wdGltaXphdGlvbkxldmVsID8/ICdhbGwnKTtcbiAgICBjb25zdCBleGVjdXRpb25Nb2RlID0gZ2V0RXhlY3V0aW9uTW9kZShzZXNzaW9uT3B0aW9ucy5leGVjdXRpb25Nb2RlID8/ICdzZXF1ZW50aWFsJyk7XG4gICAgY29uc3QgbG9nSWREYXRhT2Zmc2V0ID1cbiAgICAgIHR5cGVvZiBzZXNzaW9uT3B0aW9ucy5sb2dJZCA9PT0gJ3N0cmluZycgPyBhbGxvY1dhc21TdHJpbmcoc2Vzc2lvbk9wdGlvbnMubG9nSWQsIGFsbG9jcykgOiAwO1xuXG4gICAgY29uc3QgbG9nU2V2ZXJpdHlMZXZlbCA9IHNlc3Npb25PcHRpb25zLmxvZ1NldmVyaXR5TGV2ZWwgPz8gMjsgLy8gRGVmYXVsdCB0byAyIC0gd2FybmluZ1xuICAgIGlmICghTnVtYmVyLmlzSW50ZWdlcihsb2dTZXZlcml0eUxldmVsKSB8fCBsb2dTZXZlcml0eUxldmVsIDwgMCB8fCBsb2dTZXZlcml0eUxldmVsID4gNCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBsb2cgc2V2ZXJpdHkgbGV2ZWwgaXMgbm90IHZhbGlkOiAke2xvZ1NldmVyaXR5TGV2ZWx9YCk7XG4gICAgfVxuXG4gICAgY29uc3QgbG9nVmVyYm9zaXR5TGV2ZWwgPSBzZXNzaW9uT3B0aW9ucy5sb2dWZXJib3NpdHlMZXZlbCA/PyAwOyAvLyBEZWZhdWx0IHRvIDAgLSB2ZXJib3NlXG4gICAgaWYgKCFOdW1iZXIuaXNJbnRlZ2VyKGxvZ1ZlcmJvc2l0eUxldmVsKSB8fCBsb2dWZXJib3NpdHlMZXZlbCA8IDAgfHwgbG9nVmVyYm9zaXR5TGV2ZWwgPiA0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGxvZyB2ZXJib3NpdHkgbGV2ZWwgaXMgbm90IHZhbGlkOiAke2xvZ1ZlcmJvc2l0eUxldmVsfWApO1xuICAgIH1cblxuICAgIGNvbnN0IG9wdGltaXplZE1vZGVsRmlsZVBhdGhPZmZzZXQgPVxuICAgICAgdHlwZW9mIHNlc3Npb25PcHRpb25zLm9wdGltaXplZE1vZGVsRmlsZVBhdGggPT09ICdzdHJpbmcnXG4gICAgICAgID8gYWxsb2NXYXNtU3RyaW5nKHNlc3Npb25PcHRpb25zLm9wdGltaXplZE1vZGVsRmlsZVBhdGgsIGFsbG9jcylcbiAgICAgICAgOiAwO1xuXG4gICAgc2Vzc2lvbk9wdGlvbnNIYW5kbGUgPSB3YXNtLl9PcnRDcmVhdGVTZXNzaW9uT3B0aW9ucyhcbiAgICAgIGdyYXBoT3B0aW1pemF0aW9uTGV2ZWwsXG4gICAgICAhIXNlc3Npb25PcHRpb25zLmVuYWJsZUNwdU1lbUFyZW5hLFxuICAgICAgISFzZXNzaW9uT3B0aW9ucy5lbmFibGVNZW1QYXR0ZXJuLFxuICAgICAgZXhlY3V0aW9uTW9kZSxcbiAgICAgICEhc2Vzc2lvbk9wdGlvbnMuZW5hYmxlUHJvZmlsaW5nLFxuICAgICAgMCxcbiAgICAgIGxvZ0lkRGF0YU9mZnNldCxcbiAgICAgIGxvZ1NldmVyaXR5TGV2ZWwsXG4gICAgICBsb2dWZXJib3NpdHlMZXZlbCxcbiAgICAgIG9wdGltaXplZE1vZGVsRmlsZVBhdGhPZmZzZXQsXG4gICAgKTtcbiAgICBpZiAoc2Vzc2lvbk9wdGlvbnNIYW5kbGUgPT09IDApIHtcbiAgICAgIGNoZWNrTGFzdEVycm9yKFwiQ2FuJ3QgY3JlYXRlIHNlc3Npb24gb3B0aW9ucy5cIik7XG4gICAgfVxuXG4gICAgaWYgKHNlc3Npb25PcHRpb25zLmV4ZWN1dGlvblByb3ZpZGVycykge1xuICAgICAgYXdhaXQgc2V0RXhlY3V0aW9uUHJvdmlkZXJzKHNlc3Npb25PcHRpb25zSGFuZGxlLCBzZXNzaW9uT3B0aW9ucywgYWxsb2NzKTtcbiAgICB9XG5cbiAgICBpZiAoc2Vzc2lvbk9wdGlvbnMuZW5hYmxlR3JhcGhDYXB0dXJlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmICh0eXBlb2Ygc2Vzc2lvbk9wdGlvbnMuZW5hYmxlR3JhcGhDYXB0dXJlICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBlbmFibGVHcmFwaENhcHR1cmUgbXVzdCBiZSBhIGJvb2xlYW4gdmFsdWU6ICR7c2Vzc2lvbk9wdGlvbnMuZW5hYmxlR3JhcGhDYXB0dXJlfWApO1xuICAgICAgfVxuICAgICAgYXBwZW5kU2Vzc2lvbkNvbmZpZyhcbiAgICAgICAgc2Vzc2lvbk9wdGlvbnNIYW5kbGUsXG4gICAgICAgICdlbmFibGVHcmFwaENhcHR1cmUnLFxuICAgICAgICBzZXNzaW9uT3B0aW9ucy5lbmFibGVHcmFwaENhcHR1cmUudG9TdHJpbmcoKSxcbiAgICAgICAgYWxsb2NzLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAoc2Vzc2lvbk9wdGlvbnMuZnJlZURpbWVuc2lvbk92ZXJyaWRlcykge1xuICAgICAgZm9yIChjb25zdCBbbmFtZSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHNlc3Npb25PcHRpb25zLmZyZWVEaW1lbnNpb25PdmVycmlkZXMpKSB7XG4gICAgICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGZyZWUgZGltZW5zaW9uIG92ZXJyaWRlIG5hbWUgbXVzdCBiZSBhIHN0cmluZzogJHtuYW1lfWApO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdudW1iZXInIHx8ICFOdW1iZXIuaXNJbnRlZ2VyKHZhbHVlKSB8fCB2YWx1ZSA8IDApIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGZyZWUgZGltZW5zaW9uIG92ZXJyaWRlIHZhbHVlIG11c3QgYmUgYSBub24tbmVnYXRpdmUgaW50ZWdlcjogJHt2YWx1ZX1gKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBuYW1lT2Zmc2V0ID0gYWxsb2NXYXNtU3RyaW5nKG5hbWUsIGFsbG9jcyk7XG4gICAgICAgIGlmICh3YXNtLl9PcnRBZGRGcmVlRGltZW5zaW9uT3ZlcnJpZGUoc2Vzc2lvbk9wdGlvbnNIYW5kbGUsIG5hbWVPZmZzZXQsIHZhbHVlKSAhPT0gMCkge1xuICAgICAgICAgIGNoZWNrTGFzdEVycm9yKGBDYW4ndCBzZXQgYSBmcmVlIGRpbWVuc2lvbiBvdmVycmlkZTogJHtuYW1lfSAtICR7dmFsdWV9LmApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHNlc3Npb25PcHRpb25zLmV4dHJhICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGl0ZXJhdGVFeHRyYU9wdGlvbnMoc2Vzc2lvbk9wdGlvbnMuZXh0cmEsICcnLCBuZXcgV2Vha1NldDxSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj4oKSwgKGtleSwgdmFsdWUpID0+IHtcbiAgICAgICAgYXBwZW5kU2Vzc2lvbkNvbmZpZyhzZXNzaW9uT3B0aW9uc0hhbmRsZSwga2V5LCB2YWx1ZSwgYWxsb2NzKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBbc2Vzc2lvbk9wdGlvbnNIYW5kbGUsIGFsbG9jc107XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBpZiAoc2Vzc2lvbk9wdGlvbnNIYW5kbGUgIT09IDApIHtcbiAgICAgIGlmICh3YXNtLl9PcnRSZWxlYXNlU2Vzc2lvbk9wdGlvbnMoc2Vzc2lvbk9wdGlvbnNIYW5kbGUpICE9PSAwKSB7XG4gICAgICAgIGNoZWNrTGFzdEVycm9yKFwiQ2FuJ3QgcmVsZWFzZSBzZXNzaW9uIG9wdGlvbnMuXCIpO1xuICAgICAgfVxuICAgIH1cbiAgICBhbGxvY3MuZm9yRWFjaCgoYWxsb2MpID0+IHdhc20uX2ZyZWUoYWxsb2MpKTtcbiAgICB0aHJvdyBlO1xuICB9XG59O1xuIiwgIi8vIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuXG5pbXBvcnQgeyBUZW5zb3IgfSBmcm9tICdvbm54cnVudGltZS1jb21tb24nO1xuXG4vLyBhIGR1bW15IHR5cGUgZGVjbGFyYXRpb24gZm9yIEZsb2F0MTZBcnJheSBpbiBjYXNlIGFueSBwb2x5ZmlsbCBpcyBhdmFpbGFibGUuXG5kZWNsYXJlIGdsb2JhbCB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbmFtaW5nLWNvbnZlbnRpb24sIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgY29uc3QgRmxvYXQxNkFycmF5OiBhbnk7XG59XG5cbi8vIFRoaXMgZmlsZSBpbmNsdWRlcyBjb21tb24gZGVmaW5pdGlvbnMuIFRoZXkgZG8gTk9UIGhhdmUgZGVwZW5kZW5jeSBvbiB0aGUgV2ViQXNzZW1ibHkgaW5zdGFuY2UuXG5cbi8qKlxuICogQ29waWVkIGZyb20gT05OWCBkZWZpbml0aW9uLiBVc2UgdGhpcyB0byBkcm9wIGRlcGVuZGVuY3kgJ29ubnhfcHJvdG8nIHRvIGRlY3JlYXNlIGNvbXBpbGVkIC5qcyBmaWxlIHNpemUuXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIERhdGFUeXBlIHtcbiAgdW5kZWZpbmVkID0gMCxcbiAgZmxvYXQgPSAxLFxuICB1aW50OCA9IDIsXG4gIGludDggPSAzLFxuICB1aW50MTYgPSA0LFxuICBpbnQxNiA9IDUsXG4gIGludDMyID0gNixcbiAgaW50NjQgPSA3LFxuICBzdHJpbmcgPSA4LFxuICBib29sID0gOSxcbiAgZmxvYXQxNiA9IDEwLFxuICBkb3VibGUgPSAxMSxcbiAgdWludDMyID0gMTIsXG4gIHVpbnQ2NCA9IDEzLFxuICBjb21wbGV4NjQgPSAxNCxcbiAgY29tcGxleDEyOCA9IDE1LFxuICBiZmxvYXQxNiA9IDE2LFxuXG4gIC8vIDQtYml0IGRhdGEtdHlwZXNcbiAgdWludDQgPSAyMSxcbiAgaW50NCA9IDIyLFxufVxuXG4vKipcbiAqIE1hcCBzdHJpbmcgdGVuc29yIGRhdGEgdG8gZW51bSB2YWx1ZVxuICovXG5leHBvcnQgY29uc3QgdGVuc29yRGF0YVR5cGVTdHJpbmdUb0VudW0gPSAodHlwZTogc3RyaW5nKTogRGF0YVR5cGUgPT4ge1xuICBzd2l0Y2ggKHR5cGUpIHtcbiAgICBjYXNlICdpbnQ4JzpcbiAgICAgIHJldHVybiBEYXRhVHlwZS5pbnQ4O1xuICAgIGNhc2UgJ3VpbnQ4JzpcbiAgICAgIHJldHVybiBEYXRhVHlwZS51aW50ODtcbiAgICBjYXNlICdib29sJzpcbiAgICAgIHJldHVybiBEYXRhVHlwZS5ib29sO1xuICAgIGNhc2UgJ2ludDE2JzpcbiAgICAgIHJldHVybiBEYXRhVHlwZS5pbnQxNjtcbiAgICBjYXNlICd1aW50MTYnOlxuICAgICAgcmV0dXJuIERhdGFUeXBlLnVpbnQxNjtcbiAgICBjYXNlICdpbnQzMic6XG4gICAgICByZXR1cm4gRGF0YVR5cGUuaW50MzI7XG4gICAgY2FzZSAndWludDMyJzpcbiAgICAgIHJldHVybiBEYXRhVHlwZS51aW50MzI7XG4gICAgY2FzZSAnZmxvYXQxNic6XG4gICAgICByZXR1cm4gRGF0YVR5cGUuZmxvYXQxNjtcbiAgICBjYXNlICdmbG9hdDMyJzpcbiAgICAgIHJldHVybiBEYXRhVHlwZS5mbG9hdDtcbiAgICBjYXNlICdmbG9hdDY0JzpcbiAgICAgIHJldHVybiBEYXRhVHlwZS5kb3VibGU7XG4gICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgIHJldHVybiBEYXRhVHlwZS5zdHJpbmc7XG4gICAgY2FzZSAnaW50NjQnOlxuICAgICAgcmV0dXJuIERhdGFUeXBlLmludDY0O1xuICAgIGNhc2UgJ3VpbnQ2NCc6XG4gICAgICByZXR1cm4gRGF0YVR5cGUudWludDY0O1xuICAgIGNhc2UgJ2ludDQnOlxuICAgICAgcmV0dXJuIERhdGFUeXBlLmludDQ7XG4gICAgY2FzZSAndWludDQnOlxuICAgICAgcmV0dXJuIERhdGFUeXBlLnVpbnQ0O1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcihgdW5zdXBwb3J0ZWQgZGF0YSB0eXBlOiAke3R5cGV9YCk7XG4gIH1cbn07XG5cbi8qKlxuICogTWFwIGVudW0gdmFsdWUgdG8gc3RyaW5nIHRlbnNvciBkYXRhXG4gKi9cbmV4cG9ydCBjb25zdCB0ZW5zb3JEYXRhVHlwZUVudW1Ub1N0cmluZyA9ICh0eXBlUHJvdG86IERhdGFUeXBlKTogVGVuc29yLlR5cGUgPT4ge1xuICBzd2l0Y2ggKHR5cGVQcm90bykge1xuICAgIGNhc2UgRGF0YVR5cGUuaW50ODpcbiAgICAgIHJldHVybiAnaW50OCc7XG4gICAgY2FzZSBEYXRhVHlwZS51aW50ODpcbiAgICAgIHJldHVybiAndWludDgnO1xuICAgIGNhc2UgRGF0YVR5cGUuYm9vbDpcbiAgICAgIHJldHVybiAnYm9vbCc7XG4gICAgY2FzZSBEYXRhVHlwZS5pbnQxNjpcbiAgICAgIHJldHVybiAnaW50MTYnO1xuICAgIGNhc2UgRGF0YVR5cGUudWludDE2OlxuICAgICAgcmV0dXJuICd1aW50MTYnO1xuICAgIGNhc2UgRGF0YVR5cGUuaW50MzI6XG4gICAgICByZXR1cm4gJ2ludDMyJztcbiAgICBjYXNlIERhdGFUeXBlLnVpbnQzMjpcbiAgICAgIHJldHVybiAndWludDMyJztcbiAgICBjYXNlIERhdGFUeXBlLmZsb2F0MTY6XG4gICAgICByZXR1cm4gJ2Zsb2F0MTYnO1xuICAgIGNhc2UgRGF0YVR5cGUuZmxvYXQ6XG4gICAgICByZXR1cm4gJ2Zsb2F0MzInO1xuICAgIGNhc2UgRGF0YVR5cGUuZG91YmxlOlxuICAgICAgcmV0dXJuICdmbG9hdDY0JztcbiAgICBjYXNlIERhdGFUeXBlLnN0cmluZzpcbiAgICAgIHJldHVybiAnc3RyaW5nJztcbiAgICBjYXNlIERhdGFUeXBlLmludDY0OlxuICAgICAgcmV0dXJuICdpbnQ2NCc7XG4gICAgY2FzZSBEYXRhVHlwZS51aW50NjQ6XG4gICAgICByZXR1cm4gJ3VpbnQ2NCc7XG4gICAgY2FzZSBEYXRhVHlwZS5pbnQ0OlxuICAgICAgcmV0dXJuICdpbnQ0JztcbiAgICBjYXNlIERhdGFUeXBlLnVpbnQ0OlxuICAgICAgcmV0dXJuICd1aW50NCc7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGB1bnN1cHBvcnRlZCBkYXRhIHR5cGU6ICR7dHlwZVByb3RvfWApO1xuICB9XG59O1xuXG4vKipcbiAqIGdldCB0ZW5zb3Igc2l6ZSBpbiBieXRlcyBieSB0aGUgZ2l2ZW4gZGF0YSB0eXBlIGFuZCBkaW1lbnNpb25zXG4gKiBAcmV0dXJucyBzaXplIGluIGludGVnZXIgb3IgdW5kZWZpbmVkIGlmIHRoZSBkYXRhIHR5cGUgaXMgbm90IHN1cHBvcnRlZFxuICovXG5leHBvcnQgY29uc3QgY2FsY3VsYXRlVGVuc29yU2l6ZUluQnl0ZXMgPSAoXG4gIGRhdGVUeXBlOiBudW1iZXIsXG4gIGRpbXNPclNpemU6IHJlYWRvbmx5IG51bWJlcltdIHwgbnVtYmVyLFxuKTogbnVtYmVyIHwgdW5kZWZpbmVkID0+IHtcbiAgY29uc3QgZWxlbWVudFNpemUgPSBbXG4gICAgLTEsIC8vIHVuZGVmaW5lZCA9IDBcbiAgICA0LCAvLyBmbG9hdCA9IDFcbiAgICAxLCAvLyB1aW50OCA9IDJcbiAgICAxLCAvLyBpbnQ4ID0gM1xuICAgIDIsIC8vIHVpbnQxNiA9IDRcbiAgICAyLCAvLyBpbnQxNiA9IDVcbiAgICA0LCAvLyBpbnQzMiA9IDZcbiAgICA4LCAvLyBpbnQ2NCA9IDdcbiAgICAtMSwgLy8gc3RyaW5nID0gOFxuICAgIDEsIC8vIGJvb2wgPSA5XG4gICAgMiwgLy8gZmxvYXQxNiA9IDEwXG4gICAgOCwgLy8gZG91YmxlID0gMTFcbiAgICA0LCAvLyB1aW50MzIgPSAxMlxuICAgIDgsIC8vIHVpbnQ2NCA9IDEzXG4gICAgLTEsIC8vIGNvbXBsZXg2NCA9IDE0XG4gICAgLTEsIC8vIGNvbXBsZXgxMjggPSAxNVxuICAgIC0xLCAvLyBiZmxvYXQxNiA9IDE2XG4gICAgLTEsIC8vIEZMT0FUOEU0TTNGTiA9IDE3XG4gICAgLTEsIC8vIEZMT0FUOEU0TTNGTlVaID0gMThcbiAgICAtMSwgLy8gRkxPQVQ4RTVNMiA9IDE5XG4gICAgLTEsIC8vIEZMT0FUOEU1TTJGTlVaID0gMjBcbiAgICAwLjUsIC8vIHVpbnQ0ID0gMjFcbiAgICAwLjUsIC8vIGludDQgPSAyMlxuICBdW2RhdGVUeXBlXTtcblxuICBjb25zdCBzaXplID0gdHlwZW9mIGRpbXNPclNpemUgPT09ICdudW1iZXInID8gZGltc09yU2l6ZSA6IGRpbXNPclNpemUucmVkdWNlKChhLCBiKSA9PiBhICogYiwgMSk7XG4gIHJldHVybiBlbGVtZW50U2l6ZSA+IDAgPyBNYXRoLmNlaWwoc2l6ZSAqIGVsZW1lbnRTaXplKSA6IHVuZGVmaW5lZDtcbn07XG5cbi8qKlxuICogZ2V0IHR5cGVkIGFycmF5IGNvbnN0cnVjdG9yIGJ5IHRoZSBnaXZlbiB0ZW5zb3IgdHlwZVxuICovXG5leHBvcnQgY29uc3QgdGVuc29yVHlwZVRvVHlwZWRBcnJheUNvbnN0cnVjdG9yID0gKFxuICB0eXBlOiBUZW5zb3IuVHlwZSxcbik6XG4gIHwgRmxvYXQzMkFycmF5Q29uc3RydWN0b3JcbiAgfCBVaW50OEFycmF5Q29uc3RydWN0b3JcbiAgfCBJbnQ4QXJyYXlDb25zdHJ1Y3RvclxuICB8IFVpbnQxNkFycmF5Q29uc3RydWN0b3JcbiAgfCBJbnQxNkFycmF5Q29uc3RydWN0b3JcbiAgfCBJbnQzMkFycmF5Q29uc3RydWN0b3JcbiAgfCBCaWdJbnQ2NEFycmF5Q29uc3RydWN0b3JcbiAgfCBVaW50OEFycmF5Q29uc3RydWN0b3JcbiAgfCBGbG9hdDY0QXJyYXlDb25zdHJ1Y3RvclxuICB8IFVpbnQzMkFycmF5Q29uc3RydWN0b3JcbiAgfCBCaWdVaW50NjRBcnJheUNvbnN0cnVjdG9yID0+IHtcbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSAnZmxvYXQxNic6XG4gICAgICAvLyBhbGxvdyBGbG9hdDE2QXJyYXkgcG9seWZpbGwuXG4gICAgICByZXR1cm4gdHlwZW9mIEZsb2F0MTZBcnJheSAhPT0gJ3VuZGVmaW5lZCcgJiYgRmxvYXQxNkFycmF5LmZyb20gPyBGbG9hdDE2QXJyYXkgOiBVaW50MTZBcnJheTtcbiAgICBjYXNlICdmbG9hdDMyJzpcbiAgICAgIHJldHVybiBGbG9hdDMyQXJyYXk7XG4gICAgY2FzZSAndWludDgnOlxuICAgICAgcmV0dXJuIFVpbnQ4QXJyYXk7XG4gICAgY2FzZSAnaW50OCc6XG4gICAgICByZXR1cm4gSW50OEFycmF5O1xuICAgIGNhc2UgJ3VpbnQxNic6XG4gICAgICByZXR1cm4gVWludDE2QXJyYXk7XG4gICAgY2FzZSAnaW50MTYnOlxuICAgICAgcmV0dXJuIEludDE2QXJyYXk7XG4gICAgY2FzZSAnaW50MzInOlxuICAgICAgcmV0dXJuIEludDMyQXJyYXk7XG4gICAgY2FzZSAnYm9vbCc6XG4gICAgICByZXR1cm4gVWludDhBcnJheTtcbiAgICBjYXNlICdmbG9hdDY0JzpcbiAgICAgIHJldHVybiBGbG9hdDY0QXJyYXk7XG4gICAgY2FzZSAndWludDMyJzpcbiAgICAgIHJldHVybiBVaW50MzJBcnJheTtcbiAgICBjYXNlICdpbnQ2NCc6XG4gICAgICByZXR1cm4gQmlnSW50NjRBcnJheTtcbiAgICBjYXNlICd1aW50NjQnOlxuICAgICAgcmV0dXJuIEJpZ1VpbnQ2NEFycmF5O1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYHVuc3VwcG9ydGVkIHR5cGU6ICR7dHlwZX1gKTtcbiAgfVxufTtcblxuLyoqXG4gKiBNYXAgc3RyaW5nIGxvZyBsZXZlbCB0byBpbnRlZ2VyIHZhbHVlXG4gKi9cbmV4cG9ydCBjb25zdCBsb2dMZXZlbFN0cmluZ1RvRW51bSA9IChsb2dMZXZlbD86ICd2ZXJib3NlJyB8ICdpbmZvJyB8ICd3YXJuaW5nJyB8ICdlcnJvcicgfCAnZmF0YWwnKTogbnVtYmVyID0+IHtcbiAgc3dpdGNoIChsb2dMZXZlbCkge1xuICAgIGNhc2UgJ3ZlcmJvc2UnOlxuICAgICAgcmV0dXJuIDA7XG4gICAgY2FzZSAnaW5mbyc6XG4gICAgICByZXR1cm4gMTtcbiAgICBjYXNlICd3YXJuaW5nJzpcbiAgICAgIHJldHVybiAyO1xuICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgIHJldHVybiAzO1xuICAgIGNhc2UgJ2ZhdGFsJzpcbiAgICAgIHJldHVybiA0O1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYHVuc3VwcG9ydGVkIGxvZ2dpbmcgbGV2ZWw6ICR7bG9nTGV2ZWx9YCk7XG4gIH1cbn07XG5cbi8qKlxuICogQ2hlY2sgd2hldGhlciB0aGUgZ2l2ZW4gdGVuc29yIHR5cGUgaXMgc3VwcG9ydGVkIGJ5IEdQVSBidWZmZXJcbiAqL1xuZXhwb3J0IGNvbnN0IGlzR3B1QnVmZmVyU3VwcG9ydGVkVHlwZSA9ICh0eXBlOiBUZW5zb3IuVHlwZSk6IHR5cGUgaXMgVGVuc29yLkdwdUJ1ZmZlckRhdGFUeXBlcyA9PlxuICB0eXBlID09PSAnZmxvYXQzMicgfHxcbiAgdHlwZSA9PT0gJ2Zsb2F0MTYnIHx8XG4gIHR5cGUgPT09ICdpbnQzMicgfHxcbiAgdHlwZSA9PT0gJ2ludDY0JyB8fFxuICB0eXBlID09PSAndWludDMyJyB8fFxuICB0eXBlID09PSAndWludDgnIHx8XG4gIHR5cGUgPT09ICdib29sJyB8fFxuICB0eXBlID09PSAndWludDQnIHx8XG4gIHR5cGUgPT09ICdpbnQ0JztcblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIHRoZSBnaXZlbiB0ZW5zb3IgdHlwZSBpcyBzdXBwb3J0ZWQgYnkgV2ViTk4gTUxUZW5zb3JcbiAqL1xuZXhwb3J0IGNvbnN0IGlzTUxUZW5zb3JTdXBwb3J0ZWRUeXBlID0gKHR5cGU6IFRlbnNvci5UeXBlKTogdHlwZSBpcyBUZW5zb3IuTUxUZW5zb3JEYXRhVHlwZXMgPT5cbiAgdHlwZSA9PT0gJ2Zsb2F0MzInIHx8XG4gIHR5cGUgPT09ICdmbG9hdDE2JyB8fFxuICB0eXBlID09PSAnaW50MzInIHx8XG4gIHR5cGUgPT09ICdpbnQ2NCcgfHxcbiAgdHlwZSA9PT0gJ3VpbnQzMicgfHxcbiAgdHlwZSA9PT0gJ3VpbnQ2NCcgfHxcbiAgdHlwZSA9PT0gJ2ludDgnIHx8XG4gIHR5cGUgPT09ICd1aW50OCcgfHxcbiAgdHlwZSA9PT0gJ2Jvb2wnIHx8XG4gIHR5cGUgPT09ICd1aW50NCcgfHxcbiAgdHlwZSA9PT0gJ2ludDQnO1xuXG4vKipcbiAqIE1hcCBzdHJpbmcgZGF0YSBsb2NhdGlvbiB0byBpbnRlZ2VyIHZhbHVlXG4gKi9cbmV4cG9ydCBjb25zdCBkYXRhTG9jYXRpb25TdHJpbmdUb0VudW0gPSAobG9jYXRpb246IFRlbnNvci5EYXRhTG9jYXRpb24pOiBudW1iZXIgPT4ge1xuICBzd2l0Y2ggKGxvY2F0aW9uKSB7XG4gICAgY2FzZSAnbm9uZSc6XG4gICAgICByZXR1cm4gMDtcbiAgICBjYXNlICdjcHUnOlxuICAgICAgcmV0dXJuIDE7XG4gICAgY2FzZSAnY3B1LXBpbm5lZCc6XG4gICAgICByZXR1cm4gMjtcbiAgICBjYXNlICd0ZXh0dXJlJzpcbiAgICAgIHJldHVybiAzO1xuICAgIGNhc2UgJ2dwdS1idWZmZXInOlxuICAgICAgcmV0dXJuIDQ7XG4gICAgY2FzZSAnbWwtdGVuc29yJzpcbiAgICAgIHJldHVybiA1O1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYHVuc3VwcG9ydGVkIGRhdGEgbG9jYXRpb246ICR7bG9jYXRpb259YCk7XG4gIH1cbn07XG5cbi8qKlxuICogTWFwIGludGVnZXIgZGF0YSBsb2NhdGlvbiB0byBzdHJpbmcgdmFsdWVcbiAqL1xuZXhwb3J0IGNvbnN0IGRhdGFMb2NhdGlvbkVudW1Ub1N0cmluZyA9IChsb2NhdGlvbjogbnVtYmVyKTogVGVuc29yLkRhdGFMb2NhdGlvbiB8IHVuZGVmaW5lZCA9PlxuICAoWydub25lJywgJ2NwdScsICdjcHUtcGlubmVkJywgJ3RleHR1cmUnLCAnZ3B1LWJ1ZmZlcicsICdtbC10ZW5zb3InXSBhcyBjb25zdClbbG9jYXRpb25dO1xuIiwgIi8vIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuXG5pbXBvcnQgeyBpc05vZGUgfSBmcm9tICcuL3dhc20tdXRpbHMtZW52JztcblxuLyoqXG4gKiBMb2FkIGEgZmlsZSBpbnRvIGEgVWludDhBcnJheS5cbiAqXG4gKiBAcGFyYW0gZmlsZSAtIHRoZSBmaWxlIHRvIGxvYWQuIENhbiBiZSBhIFVSTC9wYXRoLCBhIEJsb2IsIGFuIEFycmF5QnVmZmVyLCBvciBhIFVpbnQ4QXJyYXkuXG4gKiBAcmV0dXJucyBhIFVpbnQ4QXJyYXkgY29udGFpbmluZyB0aGUgZmlsZSBkYXRhLlxuICovXG5leHBvcnQgY29uc3QgbG9hZEZpbGUgPSBhc3luYyAoZmlsZTogc3RyaW5nIHwgQmxvYiB8IEFycmF5QnVmZmVyTGlrZSB8IFVpbnQ4QXJyYXkpOiBQcm9taXNlPFVpbnQ4QXJyYXk+ID0+IHtcbiAgaWYgKHR5cGVvZiBmaWxlID09PSAnc3RyaW5nJykge1xuICAgIGlmIChpc05vZGUpIHtcbiAgICAgIC8vIGxvYWQgZmlsZSBpbnRvIEFycmF5QnVmZmVyIGluIE5vZGUuanNcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHsgcmVhZEZpbGUgfSA9IHJlcXVpcmUoJ25vZGU6ZnMvcHJvbWlzZXMnKTtcbiAgICAgICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KGF3YWl0IHJlYWRGaWxlKGZpbGUpKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgaWYgKGUuY29kZSA9PT0gJ0VSUl9GU19GSUxFX1RPT19MQVJHRScpIHtcbiAgICAgICAgICAvLyBmaWxlIGlzIHRvbyBsYXJnZSwgdXNlIGZzLmNyZWF0ZVJlYWRTdHJlYW0gaW5zdGVhZFxuICAgICAgICAgIGNvbnN0IHsgY3JlYXRlUmVhZFN0cmVhbSB9ID0gcmVxdWlyZSgnbm9kZTpmcycpO1xuICAgICAgICAgIGNvbnN0IHN0cmVhbSA9IGNyZWF0ZVJlYWRTdHJlYW0oZmlsZSk7XG4gICAgICAgICAgY29uc3QgY2h1bmtzOiBVaW50OEFycmF5W10gPSBbXTtcbiAgICAgICAgICBmb3IgYXdhaXQgKGNvbnN0IGNodW5rIG9mIHN0cmVhbSkge1xuICAgICAgICAgICAgY2h1bmtzLnB1c2goY2h1bmspO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoQnVmZmVyLmNvbmNhdChjaHVua3MpKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBsb2FkIGZpbGUgaW50byBBcnJheUJ1ZmZlciBpbiBicm93c2Vyc1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChmaWxlKTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBmYWlsZWQgdG8gbG9hZCBleHRlcm5hbCBkYXRhIGZpbGU6ICR7ZmlsZX1gKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGNvbnRlbnRMZW5ndGhIZWFkZXIgPSByZXNwb25zZS5oZWFkZXJzLmdldCgnQ29udGVudC1MZW5ndGgnKTtcbiAgICAgIGNvbnN0IGZpbGVTaXplID0gY29udGVudExlbmd0aEhlYWRlciA/IHBhcnNlSW50KGNvbnRlbnRMZW5ndGhIZWFkZXIsIDEwKSA6IDA7XG4gICAgICBpZiAoZmlsZVNpemUgPCAxMDczNzQxODI0IC8qIDFHQiAqLykge1xuICAgICAgICAvLyB3aGVuIENvbnRlbnQtTGVuZ3RoIGhlYWRlciBpcyBub3Qgc2V0LCB3ZSBjYW5ub3QgZGV0ZXJtaW5lIHRoZSBmaWxlIHNpemUuIFdlIGFzc3VtZSBpdCBpcyBzbWFsbCBlbm91Z2ggdG9cbiAgICAgICAgLy8gbG9hZCBpbnRvIG1lbW9yeS5cbiAgICAgICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KGF3YWl0IHJlc3BvbnNlLmFycmF5QnVmZmVyKCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZmlsZSBpcyB0b28gbGFyZ2UsIHVzZSBzdHJlYW0gaW5zdGVhZFxuICAgICAgICBpZiAoIXJlc3BvbnNlLmJvZHkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGZhaWxlZCB0byBsb2FkIGV4dGVybmFsIGRhdGEgZmlsZTogJHtmaWxlfSwgbm8gcmVzcG9uc2UgYm9keS5gKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZWFkZXIgPSByZXNwb25zZS5ib2R5LmdldFJlYWRlcigpO1xuXG4gICAgICAgIGxldCBidWZmZXI7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gdHJ5IHRvIGNyZWF0ZSBBcnJheUJ1ZmZlciBkaXJlY3RseVxuICAgICAgICAgIGJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcihmaWxlU2l6ZSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAoZSBpbnN0YW5jZW9mIFJhbmdlRXJyb3IpIHtcbiAgICAgICAgICAgIC8vIHVzZSBXZWJBc3NlbWJseSBNZW1vcnkgdG8gYWxsb2NhdGUgbGFyZ2VyIEFycmF5QnVmZmVyXG4gICAgICAgICAgICBjb25zdCBwYWdlcyA9IE1hdGguY2VpbChmaWxlU2l6ZSAvIDY1NTM2KTtcbiAgICAgICAgICAgIGJ1ZmZlciA9IG5ldyBXZWJBc3NlbWJseS5NZW1vcnkoeyBpbml0aWFsOiBwYWdlcywgbWF4aW11bTogcGFnZXMgfSkuYnVmZmVyO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBvZmZzZXQgPSAwO1xuICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgIGNvbnN0IHsgZG9uZSwgdmFsdWUgfSA9IGF3YWl0IHJlYWRlci5yZWFkKCk7XG4gICAgICAgICAgaWYgKGRvbmUpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBjaHVua1NpemUgPSB2YWx1ZS5ieXRlTGVuZ3RoO1xuICAgICAgICAgIGNvbnN0IGNodW5rID0gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyLCBvZmZzZXQsIGNodW5rU2l6ZSk7XG4gICAgICAgICAgY2h1bmsuc2V0KHZhbHVlKTtcbiAgICAgICAgICBvZmZzZXQgKz0gY2h1bmtTaXplO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgVWludDhBcnJheShidWZmZXIsIDAsIGZpbGVTaXplKTtcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSBpZiAoZmlsZSBpbnN0YW5jZW9mIEJsb2IpIHtcbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoYXdhaXQgZmlsZS5hcnJheUJ1ZmZlcigpKTtcbiAgfSBlbHNlIGlmIChmaWxlIGluc3RhbmNlb2YgVWludDhBcnJheSkge1xuICAgIHJldHVybiBmaWxlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgVWludDhBcnJheShmaWxlKTtcbiAgfVxufTtcbiIsICIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cblxuaW1wb3J0IHsgVGVuc29yIH0gZnJvbSAnb25ueHJ1bnRpbWUtY29tbW9uJztcblxuaW1wb3J0IHsgdGVuc29yVHlwZVRvVHlwZWRBcnJheUNvbnN0cnVjdG9yIH0gZnJvbSAnLi4vd2FzbS1jb21tb24nO1xuXG5leHBvcnQgY29uc3QgY3JlYXRlVmlldyA9IChcbiAgZGF0YUJ1ZmZlcjogQXJyYXlCdWZmZXIsXG4gIHR5cGU6IFRlbnNvci5UeXBlLFxuKTpcbiAgfCBJbnQzMkFycmF5XG4gIHwgVWludDMyQXJyYXlcbiAgfCBCaWdJbnQ2NEFycmF5XG4gIHwgQmlnVWludDY0QXJyYXlcbiAgfCBVaW50OEFycmF5XG4gIHwgRmxvYXQzMkFycmF5XG4gIHwgRmxvYXQ2NEFycmF5XG4gIHwgSW50OEFycmF5XG4gIHwgSW50MTZBcnJheVxuICB8IFVpbnQxNkFycmF5ID0+IG5ldyAodGVuc29yVHlwZVRvVHlwZWRBcnJheUNvbnN0cnVjdG9yKHR5cGUpKShkYXRhQnVmZmVyKTtcblxuLyoqXG4gKiBhIFRlbnNvclZpZXcgZG9lcyBub3Qgb3duIHRoZSBkYXRhLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbnNvclZpZXcge1xuICByZWFkb25seSBkYXRhOiBudW1iZXI7XG4gIHJlYWRvbmx5IGRhdGFUeXBlOiBudW1iZXI7XG4gIHJlYWRvbmx5IGRpbXM6IHJlYWRvbmx5IG51bWJlcltdO1xuXG4gIC8qKlxuICAgKiBnZXQgYSBGbG9hdDE2QXJyYXkgZGF0YSB2aWV3IG9mIHRoZSB0ZW5zb3IgZGF0YS4gdGVuc29yIGRhdGEgbXVzdCBiZSBvbiBDUFUuXG4gICAqL1xuICBnZXRVaW50MTZBcnJheSgpOiBVaW50MTZBcnJheTtcblxuICAvKipcbiAgICogZ2V0IGEgRmxvYXQzMkFycmF5IGRhdGEgdmlldyBvZiB0aGUgdGVuc29yIGRhdGEuIHRlbnNvciBkYXRhIG11c3QgYmUgb24gQ1BVLlxuICAgKi9cbiAgZ2V0RmxvYXQzMkFycmF5KCk6IEZsb2F0MzJBcnJheTtcblxuICAvKipcbiAgICogZ2V0IGEgQmlnSW50NjRBcnJheSBkYXRhIHZpZXcgb2YgdGhlIHRlbnNvciBkYXRhLiB0ZW5zb3IgZGF0YSBtdXN0IGJlIG9uIENQVS5cbiAgICovXG4gIGdldEJpZ0ludDY0QXJyYXkoKTogQmlnSW50NjRBcnJheTtcblxuICAvKipcbiAgICogZ2V0IGEgSW50MzJBcnJheSBkYXRhIHZpZXcgb2YgdGhlIHRlbnNvciBkYXRhLiB0ZW5zb3IgZGF0YSBtdXN0IGJlIG9uIENQVS5cbiAgICovXG4gIGdldEludDMyQXJyYXkoKTogSW50MzJBcnJheTtcblxuICAvKipcbiAgICogZ2V0IGEgVWludDE2QXJyYXkgZGF0YSB2aWV3IG9mIHRoZSB0ZW5zb3IgZGF0YS4gdGVuc29yIGRhdGEgbXVzdCBiZSBvbiBDUFUuXG4gICAqL1xuICBnZXRVaW50MTZBcnJheSgpOiBVaW50MTZBcnJheTtcblxuICAvKipcbiAgICogY3JlYXRlIGEgbmV3IHRlbnNvciB2aWV3IHdpdGggdGhlIHNhbWUgZGF0YSBidXQgZGlmZmVyZW50IGRpbWVuc2lvbnMuXG4gICAqL1xuICByZXNoYXBlKG5ld0RpbXM6IHJlYWRvbmx5IG51bWJlcltdKTogVGVuc29yVmlldztcbn1cbiIsICIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cblxuaW1wb3J0IHsgRW52IH0gZnJvbSAnb25ueHJ1bnRpbWUtY29tbW9uJztcblxuaW1wb3J0IHsgbG9nTGV2ZWxTdHJpbmdUb0VudW0gfSBmcm9tICcuLi93YXNtLWNvbW1vbic7XG5cbnR5cGUgTG9nTGV2ZWwgPSBOb25OdWxsYWJsZTxFbnZbJ2xvZ0xldmVsJ10+O1xudHlwZSBNZXNzYWdlU3RyaW5nID0gc3RyaW5nO1xudHlwZSBNZXNzYWdlRnVuY3Rpb24gPSAoKSA9PiBzdHJpbmc7XG50eXBlIE1lc3NhZ2UgPSBNZXNzYWdlU3RyaW5nIHwgTWVzc2FnZUZ1bmN0aW9uO1xuXG5jb25zdCBsb2dMZXZlbFByZWZpeCA9IFsnVicsICdJJywgJ1cnLCAnRScsICdGJ107XG5cbmNvbnN0IGRvTG9nID0gKGxldmVsOiBudW1iZXIsIG1lc3NhZ2U6IHN0cmluZyk6IHZvaWQgPT4ge1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICBjb25zb2xlLmxvZyhgWyR7bG9nTGV2ZWxQcmVmaXhbbGV2ZWxdfSwke25ldyBEYXRlKCkudG9JU09TdHJpbmcoKX1dJHttZXNzYWdlfWApO1xufTtcblxubGV0IGNvbmZpZ0xvZ0xldmVsOiBMb2dMZXZlbCB8IHVuZGVmaW5lZDtcbmxldCBkZWJ1ZzogYm9vbGVhbiB8IHVuZGVmaW5lZDtcblxuZXhwb3J0IGNvbnN0IGNvbmZpZ3VyZUxvZ2dlciA9ICgkY29uZmlnTG9nTGV2ZWw6IExvZ0xldmVsLCAkZGVidWc6IGJvb2xlYW4pOiB2b2lkID0+IHtcbiAgY29uZmlnTG9nTGV2ZWwgPSAkY29uZmlnTG9nTGV2ZWw7XG4gIGRlYnVnID0gJGRlYnVnO1xufTtcblxuLyoqXG4gKiBBIHNpbXBsZSBsb2dnaW5nIHV0aWxpdHkgdG8gbG9nIG1lc3NhZ2VzIHRvIHRoZSBjb25zb2xlLlxuICovXG5leHBvcnQgY29uc3QgTE9HID0gKGxvZ0xldmVsOiBMb2dMZXZlbCwgbXNnOiBNZXNzYWdlKTogdm9pZCA9PiB7XG4gIGNvbnN0IG1lc3NhZ2VMZXZlbCA9IGxvZ0xldmVsU3RyaW5nVG9FbnVtKGxvZ0xldmVsKTtcbiAgY29uc3QgY29uZmlnTGV2ZWwgPSBsb2dMZXZlbFN0cmluZ1RvRW51bShjb25maWdMb2dMZXZlbCk7XG4gIGlmIChtZXNzYWdlTGV2ZWwgPj0gY29uZmlnTGV2ZWwpIHtcbiAgICBkb0xvZyhtZXNzYWdlTGV2ZWwsIHR5cGVvZiBtc2cgPT09ICdmdW5jdGlvbicgPyBtc2coKSA6IG1zZyk7XG4gIH1cbn07XG5cbi8qKlxuICogQSBzaW1wbGUgbG9nZ2luZyB1dGlsaXR5IHRvIGxvZyBtZXNzYWdlcyB0byB0aGUgY29uc29sZS4gT25seSBsb2dzIHdoZW4gZGVidWcgaXMgZW5hYmxlZC5cbiAqL1xuZXhwb3J0IGNvbnN0IExPR19ERUJVRzogdHlwZW9mIExPRyA9ICguLi5hcmdzOiBQYXJhbWV0ZXJzPHR5cGVvZiBMT0c+KSA9PiB7XG4gIGlmIChkZWJ1Zykge1xuICAgIExPRyguLi5hcmdzKTtcbiAgfVxufTtcbiIsICIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cblxuaW1wb3J0IHsgV2ViTk5CYWNrZW5kIH0gZnJvbSAnLi4vYmFja2VuZC13ZWJubic7XG5pbXBvcnQgeyB0ZW5zb3JUeXBlVG9UeXBlZEFycmF5Q29uc3RydWN0b3IgfSBmcm9tICcuLi8uLi93YXNtLWNvbW1vbic7XG5pbXBvcnQgeyBMT0dfREVCVUcgfSBmcm9tICcuLi9sb2cnO1xuXG4vLyBXZWJOTiBBUEkgY3VycmVudGx5IGRvZXMgbm90IGhhdmUgYSBUeXBlU2NyaXB0IGRlZmluaXRpb24gZmlsZS4gVGhpcyBmaWxlIGlzIGEgd29ya2Fyb3VuZCB3aXRoIHR5cGVzIGdlbmVyYXRlZCBmcm9tXG4vLyBXZWJOTiBBUEkgc3BlY2lmaWNhdGlvbi5cbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS93ZWJtYWNoaW5lbGVhcm5pbmcvd2Vibm4vaXNzdWVzLzY3N1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndlYm5uLmQudHNcIiAvPlxuXG4vKipcbiAqIE1hcCBmcm9tIE1MT3BlcmFuZERhdGFUeXBlIHRvIHNpemUgaW4gYml0cy4gVXNpbmcgYml0cyBpbnN0ZWFkIG9mIGJ5dGVzIHRvIGF2b2lkIHBvc3NpYmxlIHByZWNpc2lvbiBsb3NzIG9uIGludDQgYW5kIHVpbnQ0LlxuICovXG5jb25zdCB3ZWJubkRhdGFUeXBlVG9TaXplID0gbmV3IE1hcDxNTE9wZXJhbmREYXRhVHlwZSwgbnVtYmVyPihbXG4gIFsnZmxvYXQzMicsIDMyXSxcbiAgWydmbG9hdDE2JywgMTZdLFxuICBbJ2ludDMyJywgMzJdLFxuICBbJ3VpbnQzMicsIDMyXSxcbiAgWydpbnQ2NCcsIDY0XSxcbiAgWyd1aW50NjQnLCA2NF0sXG4gIFsnaW50OCcsIDhdLFxuICBbJ3VpbnQ4JywgOF0sXG4gIFsnaW50NCcsIDRdLFxuICBbJ3VpbnQ0JywgNF0sXG5dKTtcblxuLy8gQ29udmVydCBpbnRlZ2VyIGRhdGEgdG8gYW4gSW50MzJBcnJheSBidWZmZXIuXG4vLyBTdXBwb3J0cyBjb252ZXJzaW9uIGZyb20gaW50NjQsIHVpbnQ2NCwgdWludDMyLCBpbnQ4IGFuZCB1aW50OCB0byBpbnQzMi5cbmV4cG9ydCBjb25zdCBjb252ZXJ0RGF0YVRvSW50MzIgPSAoZGF0YTogVWludDhBcnJheSwgZGF0YVR5cGU6IE1MT3BlcmFuZERhdGFUeXBlKTogVWludDhBcnJheSA9PiB7XG4gIGlmIChkYXRhVHlwZSA9PT0gJ2ludDMyJykge1xuICAgIHJldHVybiBkYXRhO1xuICB9XG5cbiAgY29uc3QgZGF0YVR5cGVTaXplID0gd2Vibm5EYXRhVHlwZVRvU2l6ZS5nZXQoZGF0YVR5cGUpO1xuICBpZiAoIWRhdGFUeXBlU2l6ZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgV2ViTk4gYmFja2VuZCBkb2VzIG5vdCBzdXBwb3J0IGRhdGEgdHlwZTogJHtkYXRhVHlwZX1gKTtcbiAgfVxuICBjb25zdCBieXRlc1BlckVsZW1lbnQgPSBkYXRhVHlwZVNpemUgLyA4O1xuICAvLyBNYWtlIHN1cmUgdGhlIGRhdGEgbGVuZ3RoIGlzIGEgbXVsdGlwbGUgb2YgdGhlIGRhdGEgdHlwZSBzaXplLlxuICBpZiAoZGF0YS5ieXRlTGVuZ3RoICUgYnl0ZXNQZXJFbGVtZW50ICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIFVpbnQ4QXJyYXkgbGVuZ3RoIC0gbXVzdCBiZSBhIG11bHRpcGxlIG9mICR7Ynl0ZXNQZXJFbGVtZW50fS5gKTtcbiAgfVxuXG4gIC8vIENvbnZlcnQgVWludDhBcnJheSB0byBvcmlnaW5hbCB0eXBlZCBhcnJheS5cbiAgY29uc3QgbnVtRWxlbWVudHMgPSBkYXRhLmJ5dGVMZW5ndGggLyBieXRlc1BlckVsZW1lbnQ7XG4gIGNvbnN0IG9yaWdpbmFsQXJyYXkgPSBuZXcgKHRlbnNvclR5cGVUb1R5cGVkQXJyYXlDb25zdHJ1Y3RvcihkYXRhVHlwZSkpKGRhdGEuYnVmZmVyLCBkYXRhLmJ5dGVPZmZzZXQsIG51bUVsZW1lbnRzKTtcblxuICBzd2l0Y2ggKGRhdGFUeXBlKSB7XG4gICAgY2FzZSAnaW50NjQnOlxuICAgIGNhc2UgJ3VpbnQ2NCc6IHtcbiAgICAgIC8vIENvbnZlcnQgb3JpZ2luYWwgdHlwZWQgYXJyYXkgdG8gSW50MzJBcnJheS5cbiAgICAgIGNvbnN0IGludDMyQXJyYXkgPSBuZXcgSW50MzJBcnJheShudW1FbGVtZW50cyk7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG51bUVsZW1lbnRzOyBpKyspIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBvcmlnaW5hbEFycmF5W2ldO1xuXG4gICAgICAgIC8vIENoZWNrIGZvciBvdmVyZmxvdy5cbiAgICAgICAgaWYgKHZhbHVlID4gMjE0NzQ4MzY0N24gfHwgdmFsdWUgPCAtMjE0NzQ4MzY0OG4pIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbiBub3QgY29udmVydCBpbnQ2NCBkYXRhIHRvIGludDMyIC0gdmFsdWUgb3V0IG9mIHJhbmdlLmApO1xuICAgICAgICB9XG5cbiAgICAgICAgaW50MzJBcnJheVtpXSA9IE51bWJlcih2YWx1ZSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBuZXcgVWludDhBcnJheShpbnQzMkFycmF5LmJ1ZmZlcik7XG4gICAgfVxuICAgIGNhc2UgJ2ludDgnOlxuICAgIGNhc2UgJ3VpbnQ4JzpcbiAgICBjYXNlICd1aW50MzInOiB7XG4gICAgICAvLyBDaGVjayBmb3Igb3ZlcmZsb3cuXG4gICAgICBpZiAoZGF0YVR5cGUgPT09ICd1aW50MzInKSB7XG4gICAgICAgIGlmIChvcmlnaW5hbEFycmF5LnNvbWUoKHZhbHVlKSA9PiB2YWx1ZSA+IDIxNDc0ODM2NDcpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW4gbm90IGNvbnZlcnQgdWludDMyIGRhdGEgdG8gaW50MzIgLSB2YWx1ZSBvdXQgb2YgcmFuZ2UuYCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIENvbnZlcnQgb3JpZ2luYWwgdHlwZWQgYXJyYXkgdG8gSW50MzJBcnJheS5cbiAgICAgIGNvbnN0IGludDMyQXJyYXkgPSBJbnQzMkFycmF5LmZyb20ob3JpZ2luYWxBcnJheSwgTnVtYmVyKTtcbiAgICAgIHJldHVybiBuZXcgVWludDhBcnJheShpbnQzMkFycmF5LmJ1ZmZlcik7XG4gICAgfVxuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIGRhdGEgY29udmVyc2lvbiBmcm9tICR7ZGF0YVR5cGV9IHRvICdpbnQzMidgKTtcbiAgfVxufTtcblxuLy8gQ29udmVydCBJbnQzMkFycmF5IGRhdGEgdG8gb3JpZ2luYWwgaW50ZWdlciBkYXRhIGJ1ZmZlci5cbi8vIFN1cHBvcnRzIGNvbnZlcnNpb24gZnJvbSBpbnQzMiB0byBpbnQ2NCwgdWludDY0LCB1aW50MzIsIGludDggYW5kIHVpbnQ4LlxuZXhwb3J0IGNvbnN0IGNvbnZlcnRJbnQzMlRvRGF0YSA9IChkYXRhOiBVaW50OEFycmF5LCBkYXRhVHlwZTogTUxPcGVyYW5kRGF0YVR5cGUpOiBVaW50OEFycmF5ID0+IHtcbiAgaWYgKGRhdGFUeXBlID09PSAnaW50MzInKSB7XG4gICAgcmV0dXJuIGRhdGE7XG4gIH1cblxuICAvLyBNYWtlIHN1cmUgdGhlIGRhdGEgbGVuZ3RoIGlzIGEgbXVsdGlwbGUgb2YgNCBieXRlcyAoSW50MzJBcnJheSkuXG4gIGlmIChkYXRhLmJ5dGVMZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFVpbnQ4QXJyYXkgbGVuZ3RoIC0gbXVzdCBiZSBhIG11bHRpcGxlIG9mIDQgKGludDMyKS4nKTtcbiAgfVxuXG4gIC8vIENvbnZlcnQgVWludDhBcnJheSB0byBJbnQzMkFycmF5LlxuICBjb25zdCBudW1FbGVtZW50cyA9IGRhdGEuYnl0ZUxlbmd0aCAvIDQ7XG4gIGNvbnN0IGludDMyQXJyYXkgPSBuZXcgSW50MzJBcnJheShkYXRhLmJ1ZmZlciwgZGF0YS5ieXRlT2Zmc2V0LCBudW1FbGVtZW50cyk7XG5cbiAgc3dpdGNoIChkYXRhVHlwZSkge1xuICAgIGNhc2UgJ2ludDY0Jzoge1xuICAgICAgY29uc3QgYmlnSW50NjRBcnJheSA9IEJpZ0ludDY0QXJyYXkuZnJvbShpbnQzMkFycmF5LCBCaWdJbnQpO1xuICAgICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KGJpZ0ludDY0QXJyYXkuYnVmZmVyKTtcbiAgICB9XG4gICAgY2FzZSAndWludDY0Jzoge1xuICAgICAgaWYgKGludDMyQXJyYXkuc29tZSgodmFsdWUpID0+IHZhbHVlIDwgMCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW4gbm90IGNvbnZlcnQgaW50MzIgZGF0YSB0byB1aW42NCAtIG5lZ2F0aXZlIHZhbHVlIGZvdW5kLicpO1xuICAgICAgfVxuICAgICAgY29uc3QgYmlnVWludDY0QXJyYXkgPSBCaWdVaW50NjRBcnJheS5mcm9tKGludDMyQXJyYXksIEJpZ0ludCk7XG4gICAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoYmlnVWludDY0QXJyYXkuYnVmZmVyKTtcbiAgICB9XG4gICAgY2FzZSAnaW50OCc6IHtcbiAgICAgIGlmIChpbnQzMkFycmF5LnNvbWUoKHZhbHVlKSA9PiB2YWx1ZSA8IC0xMjggfHwgdmFsdWUgPiAxMjcpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ2FuIG5vdCBjb252ZXJ0IGludDMyIGRhdGEgdG8gaW50OCAtIHZhbHVlIG91dCBvZiByYW5nZS4nKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGludDhBcnJheSA9IEludDhBcnJheS5mcm9tKGludDMyQXJyYXksIE51bWJlcik7XG4gICAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoaW50OEFycmF5LmJ1ZmZlcik7XG4gICAgfVxuICAgIGNhc2UgJ3VpbnQ4Jzoge1xuICAgICAgaWYgKGludDMyQXJyYXkuc29tZSgodmFsdWUpID0+IHZhbHVlIDwgMCB8fCB2YWx1ZSA+IDI1NSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW4gbm90IGNvbnZlcnQgaW50MzIgZGF0YSB0byB1aW50OCAtIHZhbHVlIG91dCBvZiByYW5nZS4nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBVaW50OEFycmF5LmZyb20oaW50MzJBcnJheSwgTnVtYmVyKTtcbiAgICB9XG4gICAgY2FzZSAndWludDMyJzoge1xuICAgICAgaWYgKGludDMyQXJyYXkuc29tZSgodmFsdWUpID0+IHZhbHVlIDwgMCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW4gbm90IGNvbnZlcnQgaW50MzIgZGF0YSB0byB1aW50MzIgLSBuZWdhdGl2ZSB2YWx1ZSBmb3VuZC4nKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHVpbnQzMkFycmF5ID0gVWludDMyQXJyYXkuZnJvbShpbnQzMkFycmF5LCBOdW1iZXIpO1xuICAgICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KHVpbnQzMkFycmF5LmJ1ZmZlcik7XG4gICAgfVxuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIGRhdGEgY29udmVyc2lvbiBmcm9tICdpbnQzMicgdG8gJHtkYXRhVHlwZX1gKTtcbiAgfVxufTtcblxuZXhwb3J0IHR5cGUgVGVuc29ySWQgPSBudW1iZXI7XG5cbi8qKlxuICogTWFuYWdlcyBUZW5zb3JJZCB0byBNTFRlbnNvciBtYXBwaW5nLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbnNvck1hbmFnZXIge1xuICAvKipcbiAgICogUmVzZXJ2ZSBhIG5ldyBUZW5zb3JJZC5cbiAgICovXG4gIHJlc2VydmVUZW5zb3JJZCgpOiBUZW5zb3JJZDtcbiAgLyoqXG4gICAqIFJlbGVhc2UgYSBUZW5zb3JJZC5cbiAgICovXG4gIHJlbGVhc2VUZW5zb3JJZCh0ZW5zb3JJZDogVGVuc29ySWQpOiB2b2lkO1xuICAvKipcbiAgICogRW5zdXJlIGEgTUxUZW5zb3IgaXMgY3JlYXRlZCBmb3IgdGhlIFRlbnNvcklkLlxuICAgKi9cbiAgZW5zdXJlVGVuc29yKFxuICAgIHNlc3Npb25JZDogbnVtYmVyLFxuICAgIHRlbnNvcklkOiBUZW5zb3JJZCxcbiAgICBkYXRhVHlwZTogTUxPcGVyYW5kRGF0YVR5cGUsXG4gICAgc2hhcGU6IHJlYWRvbmx5IG51bWJlcltdLFxuICAgIGNvcHlPbGQ6IGJvb2xlYW4sXG4gICk6IFByb21pc2U8TUxUZW5zb3I+O1xuICAvKipcbiAgICogVXBsb2FkIGRhdGEgdG8gYSBNTFRlbnNvci5cbiAgICovXG4gIHVwbG9hZCh0ZW5zb3JJZDogVGVuc29ySWQsIGRhdGE6IFVpbnQ4QXJyYXkpOiB2b2lkO1xuICAvKipcbiAgICogRG93bmxvYWQgZGF0YSBmcm9tIGEgTUxUZW5zb3IuXG4gICAqL1xuICBkb3dubG9hZCh0ZW5zb3JJZDogVGVuc29ySWQpOiBQcm9taXNlPEFycmF5QnVmZmVyPjtcbiAgZG93bmxvYWQodGVuc29ySWQ6IFRlbnNvcklkLCBkc3RUZW5zb3I6IEFycmF5QnVmZmVyVmlldyB8IEFycmF5QnVmZmVyKTogUHJvbWlzZTx1bmRlZmluZWQ+O1xuICAvKipcbiAgICogUmVsZWFzZSBhbGwgdGVuc29ycyBmb3IgYSBnaXZlbiBzZXNzaW9uLlxuICAgKi9cbiAgcmVsZWFzZVRlbnNvcnNGb3JTZXNzaW9uKHNlc3Npb246IG51bWJlcik6IHZvaWQ7XG4gIC8qKlxuICAgKiBSZWdpc3RlciBhbiBleHRlcm5hbGx5IGNyZWF0ZWQgTUxUZW5zb3Igd2l0aCBhIGdpdmVuIHNlc3Npb24gaWQgYW5kIHJldHVybiBhIFRlbnNvcklkLlxuICAgKi9cbiAgcmVnaXN0ZXJUZW5zb3Ioc2Vzc2lvbklkOiBudW1iZXIsIG1sVGVuc29yOiBNTFRlbnNvciwgZGF0YVR5cGU6IE1MT3BlcmFuZERhdGFUeXBlLCBzaGFwZTogbnVtYmVyW10pOiBUZW5zb3JJZDtcbn1cblxubGV0IHRlbnNvckd1aWQgPSAxO1xuY29uc3QgY3JlYXRlTmV3VGVuc29ySWQgPSAoKTogVGVuc29ySWQgPT4gdGVuc29yR3VpZCsrO1xuXG4vKipcbiAqIE1hcCBmcm9tIGRhdGEgdHlwZSB0byBmYWxsYmFjayBkYXRhIHR5cGUuXG4gKiBXaGVuIHRoZSBjb250ZXh0IGRvZXMgbm90IHN1cHBvcnQgdGhlIG9yaWdpbmFsIGRhdGEgdHlwZSwgdXNlIGZhbGxiYWNrIGRhdGEgdHlwZSBhcyB3b3JrYXJvdW5kLlxuICogTm90ZTogQ3VycmVudGx5LCB3ZSBvbmx5IHN1cHBvcnQgZmFsbGJhY2sgdG8gaW50MzIgZm9yIGNlcnRhaW4gaW50ZWdlciBkYXRhIHR5cGVzLlxuICovXG5jb25zdCB3ZWJubkRhdGFUeXBlVG9GYWxsYmFjayA9IG5ldyBNYXA8TUxPcGVyYW5kRGF0YVR5cGUsIE1MT3BlcmFuZERhdGFUeXBlPihbXG4gIFsnaW50OCcsICdpbnQzMiddLFxuICBbJ3VpbnQ4JywgJ2ludDMyJ10sXG4gIFsndWludDMyJywgJ2ludDMyJ10sXG4gIFsnaW50NjQnLCAnaW50MzInXSxcbl0pO1xuXG4vKipcbiAqIENhbGN1bGF0ZSB0aGUgYnl0ZSBsZW5ndGggb2YgYSB0ZW5zb3Igd2l0aCB0aGUgZ2l2ZW4gZGF0YSB0eXBlIGFuZCBzaGFwZS5cbiAqL1xuY29uc3QgY2FsY3VsYXRlQnl0ZUxlbmd0aCA9IChkYXRhVHlwZTogTUxPcGVyYW5kRGF0YVR5cGUsIHNoYXBlOiByZWFkb25seSBudW1iZXJbXSk6IG51bWJlciA9PiB7XG4gIGNvbnN0IGRhdGFUeXBlU2l6ZSA9IHdlYm5uRGF0YVR5cGVUb1NpemUuZ2V0KGRhdGFUeXBlKTtcbiAgaWYgKCFkYXRhVHlwZVNpemUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFdlYk5OIGJhY2tlbmQgZG9lcyBub3Qgc3VwcG9ydCBkYXRhIHR5cGU6ICR7ZGF0YVR5cGV9YCk7XG4gIH1cbiAgcmV0dXJuIHNoYXBlLmxlbmd0aCA+IDAgPyBNYXRoLmNlaWwoKHNoYXBlLnJlZHVjZSgoYSwgYikgPT4gYSAqIGIpICogZGF0YVR5cGVTaXplKSAvIDgpIDogMDtcbn07XG5cbi8qKlxuICogVGVuc29yV3JhcHBlciB3cmFwcyBhbiBNTFRlbnNvciBhbmQgcHJvdmlkZXMgYSB3YXkgdG8gdHJhY2sgdGhlIGxhc3Qgc2Vzc2lvbiB0aGF0IHVzZWQgaXQuXG4gKi9cbmNsYXNzIFRlbnNvcldyYXBwZXIge1xuICAvLyBUaGUgaWQgb2YgdGhlIGxhc3Qgc2Vzc2lvbiB0aGF0IHVzZWQgdGhpcyB0ZW5zb3IuXG4gIHB1YmxpYyBzZXNzaW9uSWQ6IG51bWJlcjtcbiAgLy8gVGhpcyBmbGFnIGlzIHVzZWQgdG8gaW5kaWNhdGUgd2hldGhlciB0aGUgZGF0YSBoYXMgYmVlbiBjb252ZXJ0ZWQgdG8gZmFsbGJhY2sgZGF0YSB0eXBlLlxuICBwdWJsaWMgaXNEYXRhQ29udmVydGVkID0gZmFsc2U7XG5cbiAgcHJpdmF0ZSBtbENvbnRleHQ6IE1MQ29udGV4dDtcbiAgcHJpdmF0ZSBtbFRlbnNvcjogTUxUZW5zb3I7XG4gIHByaXZhdGUgZGF0YVR5cGU6IE1MT3BlcmFuZERhdGFUeXBlO1xuICAvLyBGYWxsYmFjayBkYXRhIHR5cGUgdG8gdXNlIHdoZW4gdGhlIGNvbnRleHQgZG9lcyBub3Qgc3VwcG9ydCB0aGUgb3JpZ2luYWwgZGF0YSB0eXBlLlxuICBwcml2YXRlIGZhbGxiYWNrRGF0YVR5cGU6IE1MT3BlcmFuZERhdGFUeXBlIHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIHRlbnNvclNoYXBlOiByZWFkb25seSBudW1iZXJbXTtcblxuICBjb25zdHJ1Y3RvcihkZXNjcmlwdG9yOiB7XG4gICAgc2Vzc2lvbklkOiBudW1iZXI7XG4gICAgY29udGV4dDogTUxDb250ZXh0O1xuICAgIHRlbnNvcjogTUxUZW5zb3I7XG4gICAgZGF0YVR5cGU6IE1MT3BlcmFuZERhdGFUeXBlO1xuICAgIHNoYXBlOiByZWFkb25seSBudW1iZXJbXTtcbiAgICBmYWxsYmFja0RhdGFUeXBlPzogTUxPcGVyYW5kRGF0YVR5cGU7XG4gIH0pIHtcbiAgICBjb25zdCB7IHNlc3Npb25JZCwgY29udGV4dCwgdGVuc29yLCBkYXRhVHlwZSwgc2hhcGUsIGZhbGxiYWNrRGF0YVR5cGUgfSA9IGRlc2NyaXB0b3I7XG4gICAgdGhpcy5zZXNzaW9uSWQgPSBzZXNzaW9uSWQ7XG4gICAgdGhpcy5tbENvbnRleHQgPSBjb250ZXh0O1xuICAgIHRoaXMubWxUZW5zb3IgPSB0ZW5zb3I7XG4gICAgdGhpcy5kYXRhVHlwZSA9IGRhdGFUeXBlO1xuICAgIHRoaXMudGVuc29yU2hhcGUgPSBzaGFwZTtcbiAgICB0aGlzLmZhbGxiYWNrRGF0YVR5cGUgPSBmYWxsYmFja0RhdGFUeXBlO1xuICB9XG5cbiAgcHVibGljIGdldCB0ZW5zb3IoKTogTUxUZW5zb3Ige1xuICAgIHJldHVybiB0aGlzLm1sVGVuc29yO1xuICB9XG5cbiAgcHVibGljIGdldCB0eXBlKCk6IE1MT3BlcmFuZERhdGFUeXBlIHtcbiAgICByZXR1cm4gdGhpcy5kYXRhVHlwZTtcbiAgfVxuXG4gIHB1YmxpYyBnZXQgZmFsbGJhY2tUeXBlKCk6IE1MT3BlcmFuZERhdGFUeXBlIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5mYWxsYmFja0RhdGFUeXBlO1xuICB9XG5cbiAgcHVibGljIGdldCBzaGFwZSgpOiByZWFkb25seSBudW1iZXJbXSB7XG4gICAgcmV0dXJuIHRoaXMudGVuc29yU2hhcGU7XG4gIH1cblxuICBwdWJsaWMgZ2V0IGJ5dGVMZW5ndGgoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gY2FsY3VsYXRlQnl0ZUxlbmd0aCh0aGlzLmRhdGFUeXBlLCB0aGlzLnRlbnNvclNoYXBlKTtcbiAgfVxuXG4gIHB1YmxpYyBkZXN0cm95KCk6IHZvaWQge1xuICAgIExPR19ERUJVRygndmVyYm9zZScsICgpID0+ICdbV2ViTk5dIFRlbnNvcldyYXBwZXIuZGVzdHJveScpO1xuICAgIHRoaXMubWxUZW5zb3IuZGVzdHJveSgpO1xuICB9XG5cbiAgcHVibGljIHdyaXRlKGRhdGE6IFVpbnQ4QXJyYXkpOiB2b2lkIHtcbiAgICB0aGlzLm1sQ29udGV4dC53cml0ZVRlbnNvcih0aGlzLm1sVGVuc29yLCBkYXRhKTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyByZWFkKCk6IFByb21pc2U8QXJyYXlCdWZmZXI+O1xuICBwdWJsaWMgYXN5bmMgcmVhZChkc3RCdWZmZXI/OiBBcnJheUJ1ZmZlclZpZXcgfCBBcnJheUJ1ZmZlcik6IFByb21pc2U8QXJyYXlCdWZmZXIgfCB1bmRlZmluZWQ+O1xuICBwdWJsaWMgYXN5bmMgcmVhZChkc3RCdWZmZXI/OiBBcnJheUJ1ZmZlclZpZXcgfCBBcnJheUJ1ZmZlcik6IFByb21pc2U8QXJyYXlCdWZmZXIgfCB1bmRlZmluZWQ+IHtcbiAgICBpZiAodGhpcy5mYWxsYmFja0RhdGFUeXBlKSB7XG4gICAgICAvLyBUaGlzIHRlbnNvciBoYXMgYmVlbiBmYWxsYmFjayB0byBpbnQzMiBhcyB3b3JrYXJvdW5kLCB3ZSBuZWVkIHRvIHJlYWQgaXQgYXMgaXRzIG9yaWdpbmFsIGludGVnZXIgZGF0YSB0eXBlLlxuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHRoaXMubWxDb250ZXh0LnJlYWRUZW5zb3IodGhpcy5tbFRlbnNvcik7XG4gICAgICBjb25zdCBvcmlnaW5hbERhdGEgPSBjb252ZXJ0SW50MzJUb0RhdGEobmV3IFVpbnQ4QXJyYXkoZGF0YSksIHRoaXMuZGF0YVR5cGUpO1xuXG4gICAgICBpZiAoZHN0QnVmZmVyKSB7XG4gICAgICAgIGNvbnN0IHRhcmdldEJ1ZmZlciA9XG4gICAgICAgICAgZHN0QnVmZmVyIGluc3RhbmNlb2YgQXJyYXlCdWZmZXJcbiAgICAgICAgICAgID8gbmV3IFVpbnQ4QXJyYXkoZHN0QnVmZmVyKVxuICAgICAgICAgICAgOiBuZXcgVWludDhBcnJheShkc3RCdWZmZXIuYnVmZmVyLCBkc3RCdWZmZXIuYnl0ZU9mZnNldCwgZHN0QnVmZmVyLmJ5dGVMZW5ndGgpO1xuICAgICAgICB0YXJnZXRCdWZmZXIuc2V0KG9yaWdpbmFsRGF0YSk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb3JpZ2luYWxEYXRhLmJ1ZmZlcjtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGRzdEJ1ZmZlciA/IHRoaXMubWxDb250ZXh0LnJlYWRUZW5zb3IodGhpcy5tbFRlbnNvciwgZHN0QnVmZmVyKSA6IHRoaXMubWxDb250ZXh0LnJlYWRUZW5zb3IodGhpcy5tbFRlbnNvcik7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGNhblJldXNlVGVuc29yKGNvbnRleHQ6IE1MQ29udGV4dCwgZGF0YVR5cGU6IE1MT3BlcmFuZERhdGFUeXBlLCBzaGFwZTogcmVhZG9ubHkgbnVtYmVyW10pOiBib29sZWFuIHtcbiAgICByZXR1cm4gKFxuICAgICAgdGhpcy5tbENvbnRleHQgPT09IGNvbnRleHQgJiZcbiAgICAgIHRoaXMuZGF0YVR5cGUgPT09IGRhdGFUeXBlICYmXG4gICAgICB0aGlzLnRlbnNvclNoYXBlLmxlbmd0aCA9PT0gc2hhcGUubGVuZ3RoICYmXG4gICAgICB0aGlzLnRlbnNvclNoYXBlLmV2ZXJ5KCh2LCBpKSA9PiB2ID09PSBzaGFwZVtpXSlcbiAgICApO1xuICB9XG5cbiAgcHVibGljIHNldElzRGF0YUNvbnZlcnRlZChpc0NvbnZlcnRlZDogYm9vbGVhbik6IHZvaWQge1xuICAgIHRoaXMuaXNEYXRhQ29udmVydGVkID0gaXNDb252ZXJ0ZWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBUZW5zb3JUcmFja2VyIHRyYWNrcyB0aGUgTUxUZW5zb3IgYW5kIHBlbmRpbmcgdXBsb2FkIGRhdGEuXG4gKlxuICogV2UgbmVlZCB0byB0cmFjayB0aGUgTUxUZW5zb3IgYW5kIHBlbmRpbmcgdXBsb2FkIGRhdGEgYmVjYXVzZSB3ZSBkZWxheSB0aGUgY3JlYXRpb24gb2YgTUxUZW5zb3IgdW50aWxcbiAqIHdlIGtub3cgdGhlIGRhdGEgdHlwZSBhbmQgc2hhcGUuIFRoaXMgaXMgYmVjYXVzZSBXZWJOTiBvbmx5IHN1cHBvcnQgY3JlYXRpbmcgTUxUZW5zb3JzIHdpdGggZGF0YVR5cGVzIGFuZCBzaGFwZS5cbiAqL1xuY2xhc3MgVGVuc29ySWRUcmFja2VyIHtcbiAgcHJpdmF0ZSBhY3RpdmVVcGxvYWQ/OiBVaW50OEFycmF5O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgdGVuc29yTWFuYWdlcjogVGVuc29yTWFuYWdlckltcGwsXG4gICAgcHJpdmF0ZSB3cmFwcGVyPzogVGVuc29yV3JhcHBlcixcbiAgKSB7fVxuXG4gIHB1YmxpYyBnZXQgdGVuc29yV3JhcHBlcigpOiBUZW5zb3JXcmFwcGVyIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy53cmFwcGVyO1xuICB9XG5cbiAgcHVibGljIHJlbGVhc2VUZW5zb3IoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMudGVuc29yV3JhcHBlcikge1xuICAgICAgdGhpcy50ZW5zb3JNYW5hZ2VyLnJlbGVhc2VUZW5zb3IodGhpcy50ZW5zb3JXcmFwcGVyKTtcbiAgICAgIHRoaXMud3JhcHBlciA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgZW5zdXJlVGVuc29yKFxuICAgIHNlc3Npb25JZDogbnVtYmVyLFxuICAgIGRhdGFUeXBlOiBNTE9wZXJhbmREYXRhVHlwZSxcbiAgICBzaGFwZTogcmVhZG9ubHkgbnVtYmVyW10sXG4gICAgY29weU9sZDogYm9vbGVhbixcbiAgKTogUHJvbWlzZTxNTFRlbnNvcj4ge1xuICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzLnRlbnNvck1hbmFnZXIuZ2V0TUxDb250ZXh0KHNlc3Npb25JZCk7XG4gICAgY29uc3Qgb3BMaW1pdHMgPSB0aGlzLnRlbnNvck1hbmFnZXIuZ2V0TUxPcFN1cHBvcnRMaW1pdHMoc2Vzc2lvbklkKTtcbiAgICBsZXQgZmFsbGJhY2tEYXRhVHlwZTogTUxPcGVyYW5kRGF0YVR5cGUgfCB1bmRlZmluZWQ7XG4gICAgLy8gQ2hlY2sgaWYgdGhlIGNvbnRleHQgc3VwcG9ydHMgdGhlIGRhdGEgdHlwZS4gSWYgbm90LCB0cnkgdG8gdXNlIHRoZSBmYWxsYmFjayBkYXRhIHR5cGUuXG4gICAgaWYgKCFvcExpbWl0cz8uaW5wdXQuZGF0YVR5cGVzLmluY2x1ZGVzKGRhdGFUeXBlKSkge1xuICAgICAgZmFsbGJhY2tEYXRhVHlwZSA9IHdlYm5uRGF0YVR5cGVUb0ZhbGxiYWNrLmdldChkYXRhVHlwZSk7XG4gICAgICBpZiAoIWZhbGxiYWNrRGF0YVR5cGUgfHwgb3BMaW1pdHM/LmlucHV0LmRhdGFUeXBlcy5pbmNsdWRlcyhmYWxsYmFja0RhdGFUeXBlKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFdlYk5OIGJhY2tlbmQgZG9lcyBub3Qgc3VwcG9ydCBkYXRhIHR5cGU6ICR7ZGF0YVR5cGV9YCk7XG4gICAgICB9XG4gICAgICBMT0dfREVCVUcoXG4gICAgICAgICd2ZXJib3NlJyxcbiAgICAgICAgKCkgPT4gYFtXZWJOTl0gVGVuc29ySWRUcmFja2VyLmVuc3VyZVRlbnNvcjogZmFsbGJhY2sgZGF0YVR5cGUgZnJvbSAke2RhdGFUeXBlfSB0byAke2ZhbGxiYWNrRGF0YVR5cGV9YCxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMud3JhcHBlcikge1xuICAgICAgaWYgKHRoaXMud3JhcHBlci5jYW5SZXVzZVRlbnNvcihjb250ZXh0LCBkYXRhVHlwZSwgc2hhcGUpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLndyYXBwZXIudGVuc29yO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGNvcHlPbGQpIHtcbiAgICAgICAgICBpZiAodGhpcy53cmFwcGVyLmJ5dGVMZW5ndGggIT09IGNhbGN1bGF0ZUJ5dGVMZW5ndGgoZGF0YVR5cGUsIHNoYXBlKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gY29weSBkYXRhIHRvIHRlbnNvciB3aXRoIGRpZmZlcmVudCBzaXplLicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLmFjdGl2ZVVwbG9hZCA9IG5ldyBVaW50OEFycmF5KGF3YWl0IHRoaXMud3JhcHBlci5yZWFkKCkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudGVuc29yTWFuYWdlci5yZWxlYXNlVGVuc29yKHRoaXMud3JhcHBlcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWJpdHdpc2VcbiAgICBjb25zdCB1c2FnZSA9IHR5cGVvZiBNTFRlbnNvclVzYWdlID09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogTUxUZW5zb3JVc2FnZS5SRUFEIHwgTUxUZW5zb3JVc2FnZS5XUklURTtcbiAgICB0aGlzLndyYXBwZXIgPSBhd2FpdCB0aGlzLnRlbnNvck1hbmFnZXIuZ2V0Q2FjaGVkVGVuc29yKFxuICAgICAgc2Vzc2lvbklkLFxuICAgICAgZGF0YVR5cGUsXG4gICAgICBzaGFwZSxcbiAgICAgIHVzYWdlLFxuICAgICAgdHJ1ZSxcbiAgICAgIHRydWUsXG4gICAgICBmYWxsYmFja0RhdGFUeXBlLFxuICAgICk7XG5cbiAgICBpZiAoY29weU9sZCAmJiB0aGlzLmFjdGl2ZVVwbG9hZCkge1xuICAgICAgLy8gV2UgZG9uJ3QgbmVlZCB0byBjb252ZXJ0IHRoZSBvcmlnaW5hbCBpbnRlZ2VyIGRhdGEgdG8gaW50MzIsXG4gICAgICAvLyBiZWNhdXNlIGl0IGhhcyBiZWVuIGNvbnZlcnRlZCB3aGVuIGl0IHdhcyB1cGxvYWRlZC5cbiAgICAgIHRoaXMud3JhcHBlci53cml0ZSh0aGlzLmFjdGl2ZVVwbG9hZCk7XG4gICAgICB0aGlzLmFjdGl2ZVVwbG9hZCA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy53cmFwcGVyLnRlbnNvcjtcbiAgfVxuXG4gIHB1YmxpYyB1cGxvYWQoZGF0YTogVWludDhBcnJheSk6IHZvaWQge1xuICAgIGxldCBuZXdEYXRhID0gZGF0YTtcbiAgICBpZiAodGhpcy53cmFwcGVyKSB7XG4gICAgICBpZiAodGhpcy53cmFwcGVyLmZhbGxiYWNrVHlwZSkge1xuICAgICAgICBpZiAodGhpcy53cmFwcGVyLmZhbGxiYWNrVHlwZSA9PT0gJ2ludDMyJykge1xuICAgICAgICAgIC8vIENvbnZlcnQgb3JpZ2luYWwgaW50ZWdlciBkYXRhIHRvIGludDMyLlxuICAgICAgICAgIG5ld0RhdGEgPSBjb252ZXJ0RGF0YVRvSW50MzIoZGF0YSwgdGhpcy53cmFwcGVyLnR5cGUpO1xuICAgICAgICAgIHRoaXMud3JhcHBlci5zZXRJc0RhdGFDb252ZXJ0ZWQodHJ1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnN1cHBvcnRlZCBmYWxsYmFjayBkYXRhIHR5cGU6ICR7dGhpcy53cmFwcGVyLmZhbGxiYWNrVHlwZX1gKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBDaGVjayBpZiB0aGUgZGF0YSBzaXplIG1hdGNoZXMgdGhlIHRlbnNvciBzaXplLlxuICAgICAgaWYgKGRhdGEuYnl0ZUxlbmd0aCA9PT0gdGhpcy53cmFwcGVyLmJ5dGVMZW5ndGgpIHtcbiAgICAgICAgLy8gV3JpdGUgdGhlIG5ld0RhdGEgdG8gdGhlIHRlbnNvci5cbiAgICAgICAgdGhpcy53cmFwcGVyLndyaXRlKG5ld0RhdGEpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBMT0dfREVCVUcoJ3ZlcmJvc2UnLCAoKSA9PiAnRGF0YSBzaXplIGRvZXMgbm90IG1hdGNoIHRlbnNvciBzaXplLiBSZWxlYXNpbmcgdGVuc29yLicpO1xuICAgICAgICB0aGlzLnJlbGVhc2VUZW5zb3IoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5hY3RpdmVVcGxvYWQpIHtcbiAgICAgIHRoaXMuYWN0aXZlVXBsb2FkLnNldChuZXdEYXRhKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5hY3RpdmVVcGxvYWQgPSBuZXcgVWludDhBcnJheShuZXdEYXRhKTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgZG93bmxvYWQoZHN0QnVmZmVyPzogQXJyYXlCdWZmZXJWaWV3IHwgQXJyYXlCdWZmZXIpOiBQcm9taXNlPEFycmF5QnVmZmVyIHwgdW5kZWZpbmVkPiB7XG4gICAgaWYgKHRoaXMuYWN0aXZlVXBsb2FkKSB7XG4gICAgICAvLyBJZiB0aGlzLmFjdGl2ZVVwbG9hZCBoYXMgYmVlbiBjb252ZXJ0ZWQgdG8gaW50MzIsIHdlIG5lZWQgdG8gY29udmVydCBpdCBiYWNrIHRvIG9yaWdpbmFsIGludGVnZXIgZGF0YSB0eXBlLlxuICAgICAgY29uc3QgZHN0RGF0YSA9IHRoaXMud3JhcHBlcj8uaXNEYXRhQ29udmVydGVkXG4gICAgICAgID8gY29udmVydEludDMyVG9EYXRhKHRoaXMuYWN0aXZlVXBsb2FkLCB0aGlzLndyYXBwZXI/LnR5cGUpXG4gICAgICAgIDogdGhpcy5hY3RpdmVVcGxvYWQ7XG5cbiAgICAgIGlmIChkc3RCdWZmZXIpIHtcbiAgICAgICAgaWYgKGRzdEJ1ZmZlciBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICAgICAgbmV3IFVpbnQ4QXJyYXkoZHN0QnVmZmVyKS5zZXQoZHN0RGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbmV3IFVpbnQ4QXJyYXkoZHN0QnVmZmVyLmJ1ZmZlciwgZHN0QnVmZmVyLmJ5dGVPZmZzZXQsIGRzdEJ1ZmZlci5ieXRlTGVuZ3RoKS5zZXQoZHN0RGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGRzdERhdGEuYnVmZmVyO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIXRoaXMud3JhcHBlcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUZW5zb3IgaGFzIG5vdCBiZWVuIGNyZWF0ZWQuJyk7XG4gICAgfVxuXG4gICAgaWYgKCFkc3RCdWZmZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLndyYXBwZXIucmVhZCgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy53cmFwcGVyLnJlYWQoZHN0QnVmZmVyKTtcbiAgfVxufVxuXG5jbGFzcyBUZW5zb3JNYW5hZ2VySW1wbCBpbXBsZW1lbnRzIFRlbnNvck1hbmFnZXIge1xuICBwcml2YXRlIHRlbnNvclRyYWNrZXJzQnlJZDogTWFwPFRlbnNvcklkLCBUZW5zb3JJZFRyYWNrZXI+ID0gbmV3IE1hcCgpO1xuICBwcml2YXRlIGZyZWVUZW5zb3JzOiBUZW5zb3JXcmFwcGVyW10gPSBbXTtcbiAgcHJpdmF0ZSBleHRlcm5hbFRlbnNvcnM6IFNldDxUZW5zb3JXcmFwcGVyPiA9IG5ldyBTZXQoKTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGJhY2tlbmQ6IFdlYk5OQmFja2VuZCkge31cblxuICBwdWJsaWMgZ2V0TUxDb250ZXh0KHNlc3Npb25JZDogbnVtYmVyKTogTUxDb250ZXh0IHtcbiAgICBjb25zdCBjb250ZXh0ID0gdGhpcy5iYWNrZW5kLmdldE1MQ29udGV4dChzZXNzaW9uSWQpO1xuICAgIGlmICghY29udGV4dCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdNTENvbnRleHQgbm90IGZvdW5kIGZvciBzZXNzaW9uLicpO1xuICAgIH1cbiAgICByZXR1cm4gY29udGV4dDtcbiAgfVxuXG4gIHB1YmxpYyBnZXRNTE9wU3VwcG9ydExpbWl0cyhzZXNzaW9uSWQ6IG51bWJlcik6IE1MT3BTdXBwb3J0TGltaXRzIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5iYWNrZW5kLmdldE1MT3BTdXBwb3J0TGltaXRzKHNlc3Npb25JZCk7XG4gIH1cblxuICBwdWJsaWMgcmVzZXJ2ZVRlbnNvcklkKCk6IFRlbnNvcklkIHtcbiAgICBjb25zdCB0ZW5zb3JJZCA9IGNyZWF0ZU5ld1RlbnNvcklkKCk7XG4gICAgdGhpcy50ZW5zb3JUcmFja2Vyc0J5SWQuc2V0KHRlbnNvcklkLCBuZXcgVGVuc29ySWRUcmFja2VyKHRoaXMpKTtcbiAgICByZXR1cm4gdGVuc29ySWQ7XG4gIH1cblxuICBwdWJsaWMgcmVsZWFzZVRlbnNvcklkKHRlbnNvcklkOiBUZW5zb3JJZCk6IHZvaWQge1xuICAgIGNvbnN0IHRlbnNvclRyYWNrZXIgPSB0aGlzLnRlbnNvclRyYWNrZXJzQnlJZC5nZXQodGVuc29ySWQpO1xuICAgIGlmICghdGVuc29yVHJhY2tlcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnRlbnNvclRyYWNrZXJzQnlJZC5kZWxldGUodGVuc29ySWQpO1xuICAgIGlmICh0ZW5zb3JUcmFja2VyLnRlbnNvcldyYXBwZXIpIHtcbiAgICAgIHRoaXMucmVsZWFzZVRlbnNvcih0ZW5zb3JUcmFja2VyLnRlbnNvcldyYXBwZXIpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBlbnN1cmVUZW5zb3IoXG4gICAgc2Vzc2lvbklkOiBudW1iZXIsXG4gICAgdGVuc29ySWQ6IFRlbnNvcklkLFxuICAgIGRhdGFUeXBlOiBNTE9wZXJhbmREYXRhVHlwZSxcbiAgICBzaGFwZTogbnVtYmVyW10sXG4gICAgY29weU9sZDogYm9vbGVhbixcbiAgKTogUHJvbWlzZTxNTFRlbnNvcj4ge1xuICAgIExPR19ERUJVRyhcbiAgICAgICd2ZXJib3NlJyxcbiAgICAgICgpID0+XG4gICAgICAgIGBbV2ViTk5dIFRlbnNvck1hbmFnZXIuZW5zdXJlVGVuc29yIHt0ZW5zb3JJZDogJHt0ZW5zb3JJZH0sIGRhdGFUeXBlOiAke1xuICAgICAgICAgIGRhdGFUeXBlXG4gICAgICAgIH0sIHNoYXBlOiAke3NoYXBlfSwgY29weU9sZDogJHtjb3B5T2xkfX1gLFxuICAgICk7XG4gICAgY29uc3QgdGVuc29yID0gdGhpcy50ZW5zb3JUcmFja2Vyc0J5SWQuZ2V0KHRlbnNvcklkKTtcbiAgICBpZiAoIXRlbnNvcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUZW5zb3Igbm90IGZvdW5kLicpO1xuICAgIH1cbiAgICByZXR1cm4gdGVuc29yLmVuc3VyZVRlbnNvcihzZXNzaW9uSWQsIGRhdGFUeXBlLCBzaGFwZSwgY29weU9sZCk7XG4gIH1cblxuICBwdWJsaWMgdXBsb2FkKHRlbnNvcklkOiBUZW5zb3JJZCwgZGF0YTogVWludDhBcnJheSk6IHZvaWQge1xuICAgIGNvbnN0IHRlbnNvciA9IHRoaXMudGVuc29yVHJhY2tlcnNCeUlkLmdldCh0ZW5zb3JJZCk7XG4gICAgaWYgKCF0ZW5zb3IpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVGVuc29yIG5vdCBmb3VuZC4nKTtcbiAgICB9XG4gICAgdGVuc29yLnVwbG9hZChkYXRhKTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBkb3dubG9hZCh0ZW5zb3JJZDogVGVuc29ySWQpOiBQcm9taXNlPEFycmF5QnVmZmVyPjtcbiAgcHVibGljIGFzeW5jIGRvd25sb2FkKHRlbnNvcklkOiBUZW5zb3JJZCwgZHN0QnVmZmVyOiBBcnJheUJ1ZmZlclZpZXcgfCBBcnJheUJ1ZmZlcik6IFByb21pc2U8dW5kZWZpbmVkPjtcbiAgYXN5bmMgZG93bmxvYWQodGVuc29ySWQ6IFRlbnNvcklkLCBkc3RCdWZmZXI/OiBBcnJheUJ1ZmZlclZpZXcgfCBBcnJheUJ1ZmZlcik6IFByb21pc2U8QXJyYXlCdWZmZXIgfCB1bmRlZmluZWQ+IHtcbiAgICBMT0dfREVCVUcoXG4gICAgICAndmVyYm9zZScsXG4gICAgICAoKSA9PiBgW1dlYk5OXSBUZW5zb3JNYW5hZ2VyLmRvd25sb2FkIHt0ZW5zb3JJZDogJHt0ZW5zb3JJZH0sIGRzdEJ1ZmZlcjogJHtkc3RCdWZmZXI/LmJ5dGVMZW5ndGh9fWAsXG4gICAgKTtcbiAgICBjb25zdCB0ZW5zb3JUcmFja2VyID0gdGhpcy50ZW5zb3JUcmFja2Vyc0J5SWQuZ2V0KHRlbnNvcklkKTtcbiAgICBpZiAoIXRlbnNvclRyYWNrZXIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVGVuc29yIG5vdCBmb3VuZC4nKTtcbiAgICB9XG4gICAgcmV0dXJuIHRlbnNvclRyYWNrZXIuZG93bmxvYWQoZHN0QnVmZmVyKTtcbiAgfVxuXG4gIHB1YmxpYyByZWxlYXNlVGVuc29yc0ZvclNlc3Npb24oc2Vzc2lvbklkOiBudW1iZXIpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IHRlbnNvciBvZiB0aGlzLmZyZWVUZW5zb3JzKSB7XG4gICAgICBpZiAodGVuc29yLnNlc3Npb25JZCA9PT0gc2Vzc2lvbklkKSB7XG4gICAgICAgIHRlbnNvci5kZXN0cm95KCk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuZnJlZVRlbnNvcnMgPSB0aGlzLmZyZWVUZW5zb3JzLmZpbHRlcigodGVuc29yKSA9PiB0ZW5zb3Iuc2Vzc2lvbklkICE9PSBzZXNzaW9uSWQpO1xuICB9XG5cbiAgcHVibGljIHJlZ2lzdGVyVGVuc29yKFxuICAgIHNlc3Npb25JZDogbnVtYmVyLFxuICAgIG1sVGVuc29yOiBNTFRlbnNvcixcbiAgICBkYXRhVHlwZTogTUxPcGVyYW5kRGF0YVR5cGUsXG4gICAgc2hhcGU6IHJlYWRvbmx5IG51bWJlcltdLFxuICApOiBUZW5zb3JJZCB7XG4gICAgY29uc3QgY29udGV4dCA9IHRoaXMuZ2V0TUxDb250ZXh0KHNlc3Npb25JZCk7XG4gICAgY29uc3QgdGVuc29ySWQgPSBjcmVhdGVOZXdUZW5zb3JJZCgpO1xuICAgIC8vIERlZmF1bHRpbmcgdG8gUkVBRCB8IFdSSVRFIGlmIHVzYWdlIGlzIG5vdCBwcm92aWRlZC5cbiAgICBjb25zdCB3cmFwcGVyID0gbmV3IFRlbnNvcldyYXBwZXIoe1xuICAgICAgc2Vzc2lvbklkLFxuICAgICAgY29udGV4dCxcbiAgICAgIHRlbnNvcjogbWxUZW5zb3IsXG4gICAgICBkYXRhVHlwZSxcbiAgICAgIHNoYXBlLFxuICAgIH0pO1xuICAgIHRoaXMudGVuc29yVHJhY2tlcnNCeUlkLnNldCh0ZW5zb3JJZCwgbmV3IFRlbnNvcklkVHJhY2tlcih0aGlzLCB3cmFwcGVyKSk7XG4gICAgdGhpcy5leHRlcm5hbFRlbnNvcnMuYWRkKHdyYXBwZXIpO1xuICAgIHJldHVybiB0ZW5zb3JJZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgb3IgY3JlYXRlIGFuIE1MVGVuc29yIHdpdGggdGhlIGdpdmVuIGRhdGEgdHlwZSBhbmQgc2hhcGUuXG4gICAqL1xuICBwdWJsaWMgYXN5bmMgZ2V0Q2FjaGVkVGVuc29yKFxuICAgIHNlc3Npb25JZDogbnVtYmVyLFxuICAgIGRhdGFUeXBlOiBNTE9wZXJhbmREYXRhVHlwZSxcbiAgICBzaGFwZTogcmVhZG9ubHkgbnVtYmVyW10sXG4gICAgdXNhZ2U6IE1MVGVuc29yVXNhZ2VGbGFncyB8IHVuZGVmaW5lZCxcbiAgICB3cml0YWJsZTogYm9vbGVhbixcbiAgICByZWFkYWJsZTogYm9vbGVhbixcbiAgICBmYWxsYmFja0RhdGFUeXBlPzogTUxPcGVyYW5kRGF0YVR5cGUsXG4gICk6IFByb21pc2U8VGVuc29yV3JhcHBlcj4ge1xuICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzLmdldE1MQ29udGV4dChzZXNzaW9uSWQpO1xuICAgIGZvciAoY29uc3QgW2luZGV4LCB0ZW5zb3JdIG9mIHRoaXMuZnJlZVRlbnNvcnMuZW50cmllcygpKSB7XG4gICAgICBpZiAodGVuc29yLmNhblJldXNlVGVuc29yKGNvbnRleHQsIGRhdGFUeXBlLCBzaGFwZSkpIHtcbiAgICAgICAgTE9HX0RFQlVHKFxuICAgICAgICAgICd2ZXJib3NlJyxcbiAgICAgICAgICAoKSA9PlxuICAgICAgICAgICAgYFtXZWJOTl0gUmV1c2luZyB0ZW5zb3Ige2RhdGFUeXBlOiAke2RhdGFUeXBlfSwgJHtcbiAgICAgICAgICAgICAgZmFsbGJhY2tEYXRhVHlwZSA/IGBmYWxsYmFja0RhdGFUeXBlOiAke2ZhbGxiYWNrRGF0YVR5cGV9LGAgOiAnJ1xuICAgICAgICAgICAgfSBzaGFwZTogJHtzaGFwZX1gLFxuICAgICAgICApO1xuICAgICAgICBjb25zdCB3cmFwcGVyID0gdGhpcy5mcmVlVGVuc29ycy5zcGxpY2UoaW5kZXgsIDEpWzBdO1xuICAgICAgICB3cmFwcGVyLnNlc3Npb25JZCA9IHNlc3Npb25JZDtcbiAgICAgICAgcmV0dXJuIHdyYXBwZXI7XG4gICAgICB9XG4gICAgfVxuICAgIExPR19ERUJVRyhcbiAgICAgICd2ZXJib3NlJyxcbiAgICAgICgpID0+XG4gICAgICAgIGBbV2ViTk5dIE1MQ29udGV4dC5jcmVhdGVUZW5zb3Ige2RhdGFUeXBlOiAke2RhdGFUeXBlfSwgJHtcbiAgICAgICAgICBmYWxsYmFja0RhdGFUeXBlID8gYGZhbGxiYWNrRGF0YVR5cGU6ICR7ZmFsbGJhY2tEYXRhVHlwZX0sYCA6ICcnXG4gICAgICAgIH0gc2hhcGU6ICR7c2hhcGV9fWAsXG4gICAgKTtcbiAgICBjb25zdCB0ZW5zb3IgPSBhd2FpdCBjb250ZXh0LmNyZWF0ZVRlbnNvcih7XG4gICAgICBkYXRhVHlwZTogZmFsbGJhY2tEYXRhVHlwZSA/PyBkYXRhVHlwZSwgLy8gSWYgZmFsbGJhY2sgZGF0YSB0eXBlIGlzIHByb3ZpZGVkLCB1c2UgaXQuXG4gICAgICBzaGFwZSxcbiAgICAgIGRpbWVuc2lvbnM6IHNoYXBlLFxuICAgICAgdXNhZ2UsXG4gICAgICB3cml0YWJsZSxcbiAgICAgIHJlYWRhYmxlLFxuICAgIH0pO1xuICAgIHJldHVybiBuZXcgVGVuc29yV3JhcHBlcih7IHNlc3Npb25JZCwgY29udGV4dCwgdGVuc29yLCBkYXRhVHlwZSwgc2hhcGUsIGZhbGxiYWNrRGF0YVR5cGUgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmVsZWFzZSB0ZW5zb3IgZm9yIHJldXNlIHVubGVzcyBleHRlcm5hbC5cbiAgICovXG4gIHB1YmxpYyByZWxlYXNlVGVuc29yKHRlbnNvcldyYXBwZXI6IFRlbnNvcldyYXBwZXIpIHtcbiAgICBpZiAodGhpcy5leHRlcm5hbFRlbnNvcnMuaGFzKHRlbnNvcldyYXBwZXIpKSB7XG4gICAgICB0aGlzLmV4dGVybmFsVGVuc29ycy5kZWxldGUodGVuc29yV3JhcHBlcik7XG4gICAgfVxuICAgIHRoaXMuZnJlZVRlbnNvcnMucHVzaCh0ZW5zb3JXcmFwcGVyKTtcbiAgfVxufVxuXG5leHBvcnQgY29uc3QgY3JlYXRlVGVuc29yTWFuYWdlciA9ICguLi5hcmdzOiBDb25zdHJ1Y3RvclBhcmFtZXRlcnM8dHlwZW9mIFRlbnNvck1hbmFnZXJJbXBsPik6IFRlbnNvck1hbmFnZXIgPT5cbiAgbmV3IFRlbnNvck1hbmFnZXJJbXBsKC4uLmFyZ3MpO1xuIiwgIi8vIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuXG4vLyBXZWJOTiBBUEkgY3VycmVudGx5IGRvZXMgbm90IGhhdmUgYSBUeXBlU2NyaXB0IGRlZmluaXRpb24gZmlsZS4gVGhpcyBmaWxlIGlzIGEgd29ya2Fyb3VuZCB3aXRoIHR5cGVzIGdlbmVyYXRlZCBmcm9tXG4vLyBXZWJOTiBBUEkgc3BlY2lmaWNhdGlvbi5cbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS93ZWJtYWNoaW5lbGVhcm5pbmcvd2Vibm4vaXNzdWVzLzY3N1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIndlYm5uL3dlYm5uLmQudHNcIiAvPlxuXG5pbXBvcnQgeyBFbnYsIFRlbnNvciB9IGZyb20gJ29ubnhydW50aW1lLWNvbW1vbic7XG5cbmltcG9ydCB7IERhdGFUeXBlLCB0ZW5zb3JEYXRhVHlwZVN0cmluZ1RvRW51bSB9IGZyb20gJy4uL3dhc20tY29tbW9uJztcbmltcG9ydCB7IGdldEluc3RhbmNlIH0gZnJvbSAnLi4vd2FzbS1mYWN0b3J5JztcblxuaW1wb3J0IHsgY3JlYXRlVmlldyB9IGZyb20gJy4vdGVuc29yLXZpZXcnO1xuaW1wb3J0IHsgVGVuc29ySWQsIGNyZWF0ZVRlbnNvck1hbmFnZXIsIGNvbnZlcnREYXRhVG9JbnQzMiB9IGZyb20gJy4vd2Vibm4vdGVuc29yLW1hbmFnZXInO1xuaW1wb3J0IHsgY29uZmlndXJlTG9nZ2VyLCBMT0dfREVCVUcgfSBmcm9tICcuL2xvZyc7XG5cbi8qXG4gKiBUZW5zb3JQcm90bzo6ZGF0YV90eXBlIHRvIFdlYk5OIE9wZXJhbmRUeXBlIG1hcHBpbmcuXG4gKi9cbmNvbnN0IG9ubnhEYXRhVHlwZVRvV2Vibm5EYXRhVHlwZSA9IG5ldyBNYXA8RGF0YVR5cGUsIE1MT3BlcmFuZERhdGFUeXBlPihbXG4gIFtEYXRhVHlwZS5mbG9hdCwgJ2Zsb2F0MzInXSxcbiAgW0RhdGFUeXBlLmZsb2F0MTYsICdmbG9hdDE2J10sXG4gIFtEYXRhVHlwZS5pbnQzMiwgJ2ludDMyJ10sXG4gIFtEYXRhVHlwZS51aW50MzIsICd1aW50MzInXSxcbiAgW0RhdGFUeXBlLmludDY0LCAnaW50NjQnXSxcbiAgW0RhdGFUeXBlLnVpbnQ2NCwgJ3VpbnQ2NCddLFxuICBbRGF0YVR5cGUuaW50NCwgJ2ludDQnXSxcbiAgW0RhdGFUeXBlLnVpbnQ0LCAndWludDQnXSxcbiAgW0RhdGFUeXBlLmludDgsICdpbnQ4J10sXG4gIFtEYXRhVHlwZS51aW50OCwgJ3VpbnQ4J10sXG4gIFtEYXRhVHlwZS5ib29sLCAndWludDgnXSxcbl0pO1xuXG50eXBlIE1MQ29udGV4dEVudHJ5ID0ge1xuICBncHVEZXZpY2U/OiBHUFVEZXZpY2U7XG4gIG9wdGlvbnM/OiBNTENvbnRleHRPcHRpb25zO1xuICBtbENvbnRleHQ6IE1MQ29udGV4dDtcbn07XG5cbmNvbnN0IGNvbXBhcmVNTENvbnRleHRPcHRpb25zID0gKGE/OiBNTENvbnRleHRPcHRpb25zLCBiPzogTUxDb250ZXh0T3B0aW9ucyk6IGJvb2xlYW4gPT4ge1xuICBpZiAoYSA9PT0gYikge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIGlmIChhID09PSB1bmRlZmluZWQgfHwgYiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGNvbnN0IGFLZXlzID0gT2JqZWN0LmtleXMoYSkuc29ydCgpIGFzIEFycmF5PGtleW9mIHR5cGVvZiBhPjtcbiAgY29uc3QgYktleXMgPSBPYmplY3Qua2V5cyhiKS5zb3J0KCkgYXMgQXJyYXk8a2V5b2YgdHlwZW9mIGI+O1xuICByZXR1cm4gYUtleXMubGVuZ3RoID09PSBiS2V5cy5sZW5ndGggJiYgYUtleXMuZXZlcnkoKGtleSwgaW5kZXgpID0+IGtleSA9PT0gYktleXNbaW5kZXhdICYmIGFba2V5XSA9PT0gYltrZXldKTtcbn07XG5cbi8qKlxuICogV2ViTk4gYmFja2VuZCBpbXBsZW1lbnRhdGlvbi4gVGhpcyBjbGFzcyBpcyB1c2VkIHRvIGtlZXAgdHJhY2sgb2YgdGhlIE1MVGVuc29ycyBjcmVhdGVkIGJ5IHRoZSBiYWNrZW5kIGFuZCBrZWVwIHRyYWNrXG4gKiBvZiB0aGUgY3VycmVudCBNTENvbnRleHQgYmVpbmcgdXNlZCBieSB0aGUgc2Vzc2lvbnMuXG4gKi9cbmV4cG9ydCBjbGFzcyBXZWJOTkJhY2tlbmQge1xuICAvKipcbiAgICogVGVuc29yIG1hbmFnZXJzIGZvciBlYWNoIHNlc3Npb24uXG4gICAqL1xuICBwcml2YXRlIHRlbnNvck1hbmFnZXIgPSBjcmVhdGVUZW5zb3JNYW5hZ2VyKHRoaXMpO1xuICAvKipcbiAgICogTWFwcyBmcm9tIHNlc3Npb24gaWQgdG8gTUxDb250ZXh0cy5cbiAgICovXG4gIHByaXZhdGUgbWxDb250ZXh0QnlTZXNzaW9uSWQgPSBuZXcgTWFwPG51bWJlciwgTUxDb250ZXh0PigpO1xuICAvKipcbiAgICogTWFwcyBmcm9tIE1MQ29udGV4dCB0byBzZXNzaW9uIGlkcy5cbiAgICovXG4gIHByaXZhdGUgc2Vzc2lvbklkc0J5TUxDb250ZXh0ID0gbmV3IE1hcDxNTENvbnRleHQsIFNldDxudW1iZXI+PigpO1xuICAvKipcbiAgICogQ2FjaGUgb2YgTUxDb250ZXh0cy5cbiAgICovXG4gIHByaXZhdGUgbWxDb250ZXh0Q2FjaGU6IE1MQ29udGV4dEVudHJ5W10gPSBbXTtcbiAgLyoqXG4gICAqIEN1cnJlbnQgc2Vzc2lvbiBpZC5cbiAgICovXG4gIHByaXZhdGUgYWN0aXZlU2Vzc2lvbklkPzogbnVtYmVyO1xuICAvKipcbiAgICogTWFwcyBmcm9tIHNlc3Npb24gaWQgdG8gbGlzdCBvZiBncmFwaCBpbnB1dHMuXG4gICAqL1xuICBwcml2YXRlIHNlc3Npb25HcmFwaElucHV0czogTWFwPG51bWJlciwgc3RyaW5nW10+ID0gbmV3IE1hcCgpO1xuICAvKipcbiAgICogTWFwcyBmcm9tIHNlc3Npb24gaWQgdG8gbGlzdCBvZiBncmFwaCBvdXRwdXRzLlxuICAgKi9cbiAgcHJpdmF0ZSBzZXNzaW9uR3JhcGhPdXRwdXRzOiBNYXA8bnVtYmVyLCBzdHJpbmdbXT4gPSBuZXcgTWFwKCk7XG4gIC8qKlxuICAgKiBUZW1wb3JhcnkgZ3JhcGggaW5wdXRzIGZvciB0aGUgY3VycmVudCBzZXNzaW9uLlxuICAgKiBUaGVzZSBpbnB1dHMgd2lsbCBiZSByZWdpc3RlcmVkIHdoZW4gdGhlIHNlc3Npb24gaXMgY3JlYXRlZC5cbiAgICovXG4gIHByaXZhdGUgdGVtcG9yYXJ5R3JhcGhJbnB1dHM6IHN0cmluZ1tdID0gW107XG4gIC8qKlxuICAgKiBUZW1wb3JhcnkgZ3JhcGggb3V0cHV0cyBmb3IgdGhlIGN1cnJlbnQgc2Vzc2lvbi5cbiAgICogVGhlc2Ugb3V0cHV0cyB3aWxsIGJlIHJlZ2lzdGVyZWQgd2hlbiB0aGUgc2Vzc2lvbiBpcyBjcmVhdGVkLlxuICAgKi9cbiAgcHJpdmF0ZSB0ZW1wb3JhcnlHcmFwaE91dHB1dHM6IHN0cmluZ1tdID0gW107XG4gIC8qKlxuICAgKiBUZW1wb3JhcnkgdGVuc29ycyBmb3IgdGhlIGN1cnJlbnQgc2Vzc2lvbi5cbiAgICovXG4gIHByaXZhdGUgdGVtcG9yYXJ5U2Vzc2lvblRlbnNvcklkczogTWFwPG51bWJlciwgVGVuc29ySWRbXT4gPSBuZXcgTWFwKCk7XG4gIC8qKlxuICAgKiBNYXBzIGZyb20gc2Vzc2lvbiBpZCB0byBNTE9wU3VwcG9ydExpbWl0cy5cbiAgICovXG4gIHByaXZhdGUgbWxPcFN1cHBvcnRMaW1pdHNCeVNlc3Npb25JZCA9IG5ldyBNYXA8bnVtYmVyLCBNTE9wU3VwcG9ydExpbWl0cz4oKTtcblxuICBjb25zdHJ1Y3RvcihlbnY6IEVudikge1xuICAgIGNvbmZpZ3VyZUxvZ2dlcihlbnYubG9nTGV2ZWwhLCAhIWVudi5kZWJ1Zyk7XG4gIH1cblxuICBwdWJsaWMgZ2V0IGN1cnJlbnRTZXNzaW9uSWQoKTogbnVtYmVyIHtcbiAgICBpZiAodGhpcy5hY3RpdmVTZXNzaW9uSWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBhY3RpdmUgc2Vzc2lvbicpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5hY3RpdmVTZXNzaW9uSWQ7XG4gIH1cblxuICBwdWJsaWMgb25SdW5TdGFydChzZXNzaW9uSWQ6IG51bWJlcik6IHZvaWQge1xuICAgIExPR19ERUJVRygndmVyYm9zZScsICgpID0+IGBbV2ViTk5dIG9uUnVuU3RhcnQge3Nlc3Npb25JZDogJHtzZXNzaW9uSWR9fWApO1xuICAgIHRoaXMuYWN0aXZlU2Vzc2lvbklkID0gc2Vzc2lvbklkO1xuICB9XG5cbiAgcHVibGljIG9uUnVuRW5kKHNlc3Npb25JZDogbnVtYmVyKTogdm9pZCB7XG4gICAgTE9HX0RFQlVHKCd2ZXJib3NlJywgKCkgPT4gYFtXZWJOTl0gb25SdW5FbmQge3Nlc3Npb25JZDogJHtzZXNzaW9uSWR9fWApO1xuICAgIGNvbnN0IHRlbnNvcklkcyA9IHRoaXMudGVtcG9yYXJ5U2Vzc2lvblRlbnNvcklkcy5nZXQoc2Vzc2lvbklkKTtcbiAgICBpZiAoIXRlbnNvcklkcykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHRlbnNvcklkIG9mIHRlbnNvcklkcykge1xuICAgICAgTE9HX0RFQlVHKCd2ZXJib3NlJywgKCkgPT4gYFtXZWJOTl0gcmVsZWFzaW5nIHRlbXBvcmFyeSB0ZW5zb3Ige3RlbnNvcklkOiAke3RlbnNvcklkfX1gKTtcbiAgICAgIHRoaXMudGVuc29yTWFuYWdlci5yZWxlYXNlVGVuc29ySWQodGVuc29ySWQpO1xuICAgIH1cbiAgICB0aGlzLnRlbXBvcmFyeVNlc3Npb25UZW5zb3JJZHMuZGVsZXRlKHNlc3Npb25JZCk7XG4gICAgdGhpcy5hY3RpdmVTZXNzaW9uSWQgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgY3JlYXRlTUxDb250ZXh0KG9wdGlvbnNPckRldmljZT86IE1MQ29udGV4dE9wdGlvbnMgfCBHUFVEZXZpY2UpOiBQcm9taXNlPE1MQ29udGV4dD4ge1xuICAgIGlmIChvcHRpb25zT3JEZXZpY2UgaW5zdGFuY2VvZiBHUFVEZXZpY2UpIHtcbiAgICAgIGNvbnN0IG1sQ29udGV4dEluZGV4ID0gdGhpcy5tbENvbnRleHRDYWNoZS5maW5kSW5kZXgoKGVudHJ5KSA9PiBlbnRyeS5ncHVEZXZpY2UgPT09IG9wdGlvbnNPckRldmljZSk7XG4gICAgICBpZiAobWxDb250ZXh0SW5kZXggIT09IC0xKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1sQ29udGV4dENhY2hlW21sQ29udGV4dEluZGV4XS5tbENvbnRleHQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBtbENvbnRleHQgPSBhd2FpdCBuYXZpZ2F0b3IubWwuY3JlYXRlQ29udGV4dChvcHRpb25zT3JEZXZpY2UpO1xuICAgICAgICB0aGlzLm1sQ29udGV4dENhY2hlLnB1c2goeyBncHVEZXZpY2U6IG9wdGlvbnNPckRldmljZSwgbWxDb250ZXh0IH0pO1xuICAgICAgICByZXR1cm4gbWxDb250ZXh0O1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAob3B0aW9uc09yRGV2aWNlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IG1sQ29udGV4dEluZGV4ID0gdGhpcy5tbENvbnRleHRDYWNoZS5maW5kSW5kZXgoXG4gICAgICAgIChlbnRyeSkgPT4gZW50cnkub3B0aW9ucyA9PT0gdW5kZWZpbmVkICYmIGVudHJ5LmdwdURldmljZSA9PT0gdW5kZWZpbmVkLFxuICAgICAgKTtcbiAgICAgIGlmIChtbENvbnRleHRJbmRleCAhPT0gLTEpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWxDb250ZXh0Q2FjaGVbbWxDb250ZXh0SW5kZXhdLm1sQ29udGV4dDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IG1sQ29udGV4dCA9IGF3YWl0IG5hdmlnYXRvci5tbC5jcmVhdGVDb250ZXh0KCk7XG4gICAgICAgIHRoaXMubWxDb250ZXh0Q2FjaGUucHVzaCh7IG1sQ29udGV4dCB9KTtcbiAgICAgICAgcmV0dXJuIG1sQ29udGV4dDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBtbENvbnRleHRJbmRleCA9IHRoaXMubWxDb250ZXh0Q2FjaGUuZmluZEluZGV4KChlbnRyeSkgPT5cbiAgICAgIGNvbXBhcmVNTENvbnRleHRPcHRpb25zKGVudHJ5Lm9wdGlvbnMsIG9wdGlvbnNPckRldmljZSksXG4gICAgKTtcbiAgICBpZiAobWxDb250ZXh0SW5kZXggIT09IC0xKSB7XG4gICAgICByZXR1cm4gdGhpcy5tbENvbnRleHRDYWNoZVttbENvbnRleHRJbmRleF0ubWxDb250ZXh0O1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBtbENvbnRleHQgPSBhd2FpdCBuYXZpZ2F0b3IubWwuY3JlYXRlQ29udGV4dChvcHRpb25zT3JEZXZpY2UpO1xuICAgICAgdGhpcy5tbENvbnRleHRDYWNoZS5wdXNoKHsgb3B0aW9uczogb3B0aW9uc09yRGV2aWNlLCBtbENvbnRleHQgfSk7XG4gICAgICByZXR1cm4gbWxDb250ZXh0O1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyByZWdpc3Rlck1MQ29udGV4dChzZXNzaW9uSWQ6IG51bWJlciwgbWxDb250ZXh0OiBNTENvbnRleHQpOiB2b2lkIHtcbiAgICB0aGlzLm1sQ29udGV4dEJ5U2Vzc2lvbklkLnNldChzZXNzaW9uSWQsIG1sQ29udGV4dCk7XG4gICAgbGV0IHNlc3Npb25JZHMgPSB0aGlzLnNlc3Npb25JZHNCeU1MQ29udGV4dC5nZXQobWxDb250ZXh0KTtcbiAgICBpZiAoIXNlc3Npb25JZHMpIHtcbiAgICAgIHNlc3Npb25JZHMgPSBuZXcgU2V0KCk7XG4gICAgICB0aGlzLnNlc3Npb25JZHNCeU1MQ29udGV4dC5zZXQobWxDb250ZXh0LCBzZXNzaW9uSWRzKTtcbiAgICB9XG4gICAgc2Vzc2lvbklkcy5hZGQoc2Vzc2lvbklkKTtcblxuICAgIGlmICghdGhpcy5tbE9wU3VwcG9ydExpbWl0c0J5U2Vzc2lvbklkLmhhcyhzZXNzaW9uSWQpKSB7XG4gICAgICB0aGlzLm1sT3BTdXBwb3J0TGltaXRzQnlTZXNzaW9uSWQuc2V0KHNlc3Npb25JZCwgbWxDb250ZXh0Lm9wU3VwcG9ydExpbWl0cygpKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy50ZW1wb3JhcnlHcmFwaElucHV0cy5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLnNlc3Npb25HcmFwaElucHV0cy5zZXQoc2Vzc2lvbklkLCB0aGlzLnRlbXBvcmFyeUdyYXBoSW5wdXRzKTtcbiAgICAgIHRoaXMudGVtcG9yYXJ5R3JhcGhJbnB1dHMgPSBbXTtcbiAgICB9XG4gICAgaWYgKHRoaXMudGVtcG9yYXJ5R3JhcGhPdXRwdXRzLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMuc2Vzc2lvbkdyYXBoT3V0cHV0cy5zZXQoc2Vzc2lvbklkLCB0aGlzLnRlbXBvcmFyeUdyYXBoT3V0cHV0cyk7XG4gICAgICB0aGlzLnRlbXBvcmFyeUdyYXBoT3V0cHV0cyA9IFtdO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBvblJlbGVhc2VTZXNzaW9uKHNlc3Npb25JZDogbnVtYmVyKTogdm9pZCB7XG4gICAgdGhpcy5zZXNzaW9uR3JhcGhJbnB1dHMuZGVsZXRlKHNlc3Npb25JZCk7XG4gICAgdGhpcy5zZXNzaW9uR3JhcGhPdXRwdXRzLmRlbGV0ZShzZXNzaW9uSWQpO1xuICAgIGNvbnN0IG1sQ29udGV4dCA9IHRoaXMubWxDb250ZXh0QnlTZXNzaW9uSWQuZ2V0KHNlc3Npb25JZCkhO1xuICAgIGlmICghbWxDb250ZXh0KSB7XG4gICAgICAvLyBDdXJyZW50IHNlc3Npb24gaXMgbm90IGEgV2ViTk4gc2Vzc2lvbi5cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy50ZW5zb3JNYW5hZ2VyLnJlbGVhc2VUZW5zb3JzRm9yU2Vzc2lvbihzZXNzaW9uSWQpO1xuICAgIHRoaXMubWxDb250ZXh0QnlTZXNzaW9uSWQuZGVsZXRlKHNlc3Npb25JZCk7XG4gICAgdGhpcy5tbE9wU3VwcG9ydExpbWl0c0J5U2Vzc2lvbklkLmRlbGV0ZShzZXNzaW9uSWQpO1xuICAgIGNvbnN0IHNlc3Npb25JZHMgPSB0aGlzLnNlc3Npb25JZHNCeU1MQ29udGV4dC5nZXQobWxDb250ZXh0KSE7XG4gICAgc2Vzc2lvbklkcy5kZWxldGUoc2Vzc2lvbklkKTtcbiAgICBpZiAoc2Vzc2lvbklkcy5zaXplID09PSAwKSB7XG4gICAgICB0aGlzLnNlc3Npb25JZHNCeU1MQ29udGV4dC5kZWxldGUobWxDb250ZXh0KTtcbiAgICAgIGNvbnN0IG1sQ29udGV4dEluZGV4ID0gdGhpcy5tbENvbnRleHRDYWNoZS5maW5kSW5kZXgoKGVudHJ5KSA9PiBlbnRyeS5tbENvbnRleHQgPT09IG1sQ29udGV4dCk7XG4gICAgICBpZiAobWxDb250ZXh0SW5kZXggIT09IC0xKSB7XG4gICAgICAgIHRoaXMubWxDb250ZXh0Q2FjaGUuc3BsaWNlKG1sQ29udGV4dEluZGV4LCAxKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwdWJsaWMgZ2V0TUxDb250ZXh0KHNlc3Npb25JZDogbnVtYmVyKTogTUxDb250ZXh0IHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5tbENvbnRleHRCeVNlc3Npb25JZC5nZXQoc2Vzc2lvbklkKTtcbiAgfVxuXG4gIHB1YmxpYyBnZXRNTE9wU3VwcG9ydExpbWl0cyhzZXNzaW9uSWQ6IG51bWJlcik6IE1MT3BTdXBwb3J0TGltaXRzIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5tbE9wU3VwcG9ydExpbWl0c0J5U2Vzc2lvbklkLmdldChzZXNzaW9uSWQpO1xuICB9XG5cbiAgcHVibGljIHJlc2VydmVUZW5zb3JJZCgpOiBUZW5zb3JJZCB7XG4gICAgcmV0dXJuIHRoaXMudGVuc29yTWFuYWdlci5yZXNlcnZlVGVuc29ySWQoKTtcbiAgfVxuXG4gIHB1YmxpYyByZWxlYXNlVGVuc29ySWQodGVuc29ySWQ6IFRlbnNvcklkKTogdm9pZCB7XG4gICAgTE9HX0RFQlVHKCd2ZXJib3NlJywgKCkgPT4gYFtXZWJOTl0gcmVsZWFzZVRlbnNvcklkIHt0ZW5zb3JJZDogJHt0ZW5zb3JJZH19YCk7XG4gICAgdGhpcy50ZW5zb3JNYW5hZ2VyLnJlbGVhc2VUZW5zb3JJZCh0ZW5zb3JJZCk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgZW5zdXJlVGVuc29yKFxuICAgIHNlc3Npb25JZDogbnVtYmVyIHwgdW5kZWZpbmVkLFxuICAgIHRlbnNvcklkOiBUZW5zb3JJZCxcbiAgICBvbm54RGF0YVR5cGU6IERhdGFUeXBlLFxuICAgIGRpbWVuc2lvbnM6IG51bWJlcltdLFxuICAgIGNvcHlPbGQ6IGJvb2xlYW4sXG4gICk6IFByb21pc2U8TUxUZW5zb3I+IHtcbiAgICBjb25zdCB3ZWJubkRhdGFUeXBlID0gb25ueERhdGFUeXBlVG9XZWJubkRhdGFUeXBlLmdldChvbm54RGF0YVR5cGUpO1xuICAgIGlmICghd2Vibm5EYXRhVHlwZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnN1cHBvcnRlZCBPTk5YIGRhdGEgdHlwZTogJHtvbm54RGF0YVR5cGV9YCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnRlbnNvck1hbmFnZXIuZW5zdXJlVGVuc29yKFxuICAgICAgc2Vzc2lvbklkID8/IHRoaXMuY3VycmVudFNlc3Npb25JZCxcbiAgICAgIHRlbnNvcklkLFxuICAgICAgd2Vibm5EYXRhVHlwZSxcbiAgICAgIGRpbWVuc2lvbnMsXG4gICAgICBjb3B5T2xkLFxuICAgICk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgY3JlYXRlVGVtcG9yYXJ5VGVuc29yKFxuICAgIHNlc3Npb25JZDogbnVtYmVyLFxuICAgIG9ubnhEYXRhVHlwZTogRGF0YVR5cGUsXG4gICAgc2hhcGU6IHJlYWRvbmx5IG51bWJlcltdLFxuICApOiBQcm9taXNlPFRlbnNvcklkPiB7XG4gICAgTE9HX0RFQlVHKCd2ZXJib3NlJywgKCkgPT4gYFtXZWJOTl0gY3JlYXRlVGVtcG9yYXJ5VGVuc29yIHtvbm54RGF0YVR5cGU6ICR7b25ueERhdGFUeXBlfSwgc2hhcGU6ICR7c2hhcGV9fWApO1xuICAgIGNvbnN0IGRhdGFUeXBlID0gb25ueERhdGFUeXBlVG9XZWJubkRhdGFUeXBlLmdldChvbm54RGF0YVR5cGUpO1xuICAgIGlmICghZGF0YVR5cGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgT05OWCBkYXRhIHR5cGU6ICR7b25ueERhdGFUeXBlfWApO1xuICAgIH1cbiAgICBjb25zdCB0ZW5zb3JJZCA9IHRoaXMudGVuc29yTWFuYWdlci5yZXNlcnZlVGVuc29ySWQoKTtcbiAgICBhd2FpdCB0aGlzLnRlbnNvck1hbmFnZXIuZW5zdXJlVGVuc29yKHNlc3Npb25JZCwgdGVuc29ySWQsIGRhdGFUeXBlLCBzaGFwZSwgZmFsc2UpO1xuICAgIGNvbnN0IHRlbnNvcklkcyA9IHRoaXMudGVtcG9yYXJ5U2Vzc2lvblRlbnNvcklkcy5nZXQoc2Vzc2lvbklkKTtcbiAgICBpZiAoIXRlbnNvcklkcykge1xuICAgICAgdGhpcy50ZW1wb3JhcnlTZXNzaW9uVGVuc29ySWRzLnNldChzZXNzaW9uSWQsIFt0ZW5zb3JJZF0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0ZW5zb3JJZHMucHVzaCh0ZW5zb3JJZCk7XG4gICAgfVxuICAgIHJldHVybiB0ZW5zb3JJZDtcbiAgfVxuXG4gIHB1YmxpYyB1cGxvYWRUZW5zb3IodGVuc29ySWQ6IFRlbnNvcklkLCBkYXRhOiBVaW50OEFycmF5KTogdm9pZCB7XG4gICAgY29uc3Qgd2FzbSA9IGdldEluc3RhbmNlKCk7XG4gICAgaWYgKCF3YXNtLnNob3VsZFRyYW5zZmVyVG9NTFRlbnNvcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUcnlpbmcgdG8gdXBsb2FkIHRvIGEgTUxUZW5zb3Igd2hpbGUgc2hvdWxkVHJhbnNmZXJUb01MVGVuc29yIGlzIGZhbHNlJyk7XG4gICAgfVxuICAgIExPR19ERUJVRygndmVyYm9zZScsICgpID0+IGBbV2ViTk5dIHVwbG9hZFRlbnNvciB7dGVuc29ySWQ6ICR7dGVuc29ySWR9LCBkYXRhOiAke2RhdGEuYnl0ZUxlbmd0aH19YCk7XG4gICAgdGhpcy50ZW5zb3JNYW5hZ2VyLnVwbG9hZCh0ZW5zb3JJZCwgZGF0YSk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgZG93bmxvYWRUZW5zb3IodGVuc29ySWQ6IFRlbnNvcklkLCBkc3RCdWZmZXI6IEFycmF5QnVmZmVyVmlldyB8IEFycmF5QnVmZmVyKTogUHJvbWlzZTx1bmRlZmluZWQ+IHtcbiAgICByZXR1cm4gdGhpcy50ZW5zb3JNYW5hZ2VyLmRvd25sb2FkKHRlbnNvcklkLCBkc3RCdWZmZXIpO1xuICB9XG5cbiAgcHVibGljIGNyZWF0ZU1MVGVuc29yRG93bmxvYWRlcih0ZW5zb3JJZDogVGVuc29ySWQsIHR5cGU6IFRlbnNvci5NTFRlbnNvckRhdGFUeXBlcyk6ICgpID0+IFByb21pc2U8VGVuc29yLkRhdGFUeXBlPiB7XG4gICAgcmV0dXJuIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCB0aGlzLnRlbnNvck1hbmFnZXIuZG93bmxvYWQodGVuc29ySWQpO1xuICAgICAgcmV0dXJuIGNyZWF0ZVZpZXcoZGF0YSwgdHlwZSk7XG4gICAgfTtcbiAgfVxuXG4gIHB1YmxpYyByZWdpc3Rlck1MVGVuc29yKHNlc3Npb25JZDogbnVtYmVyLCB0ZW5zb3I6IE1MVGVuc29yLCBvbm54RGF0YVR5cGU6IERhdGFUeXBlLCBkaW1lbnNpb25zOiBudW1iZXJbXSk6IFRlbnNvcklkIHtcbiAgICBjb25zdCB3ZWJubkRhdGFUeXBlID0gb25ueERhdGFUeXBlVG9XZWJubkRhdGFUeXBlLmdldChvbm54RGF0YVR5cGUpO1xuICAgIGlmICghd2Vibm5EYXRhVHlwZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnN1cHBvcnRlZCBPTk5YIGRhdGEgdHlwZTogJHtvbm54RGF0YVR5cGV9YCk7XG4gICAgfVxuXG4gICAgY29uc3QgaWQgPSB0aGlzLnRlbnNvck1hbmFnZXIucmVnaXN0ZXJUZW5zb3Ioc2Vzc2lvbklkLCB0ZW5zb3IsIHdlYm5uRGF0YVR5cGUsIGRpbWVuc2lvbnMpO1xuICAgIExPR19ERUJVRyhcbiAgICAgICd2ZXJib3NlJyxcbiAgICAgICgpID0+XG4gICAgICAgIGBbV2ViTk5dIHJlZ2lzdGVyTUxUZW5zb3Ige3RlbnNvcjogJHt0ZW5zb3J9LCBkYXRhVHlwZTogJHt3ZWJubkRhdGFUeXBlfSwgZGltZW5zaW9uczogJHtcbiAgICAgICAgICBkaW1lbnNpb25zXG4gICAgICAgIH19IC0+IHt0ZW5zb3JJZDogJHtpZH19YCxcbiAgICApO1xuICAgIHJldHVybiBpZDtcbiAgfVxuXG4gIC8vIFJlZ2lzdGVyIGEgV2ViTk4gQ29uc3RhbnQgb3BlcmFuZCBmcm9tIGV4dGVybmFsIGRhdGEuXG4gIHB1YmxpYyByZWdpc3Rlck1MQ29uc3RhbnQoXG4gICAgZXh0ZXJuYWxGaWxlUGF0aDogc3RyaW5nLFxuICAgIGRhdGFPZmZzZXQ6IG51bWJlcixcbiAgICBkYXRhTGVuZ3RoOiBudW1iZXIsXG4gICAgYnVpbGRlcjogTUxHcmFwaEJ1aWxkZXIsXG4gICAgZGVzYzogTUxPcGVyYW5kRGVzY3JpcHRvcixcbiAgICBtb3VudGVkRmlsZXM6IE1hcDxzdHJpbmcsIFVpbnQ4QXJyYXk+IHwgdW5kZWZpbmVkLFxuICAgIHNob3VsZENvbnZlcnRJbnQ2NFRvSW50MzIgPSBmYWxzZSxcbiAgKTogTUxPcGVyYW5kIHtcbiAgICAvLyBJZiBhdmFpbGFibGUsIFwiTW9kdWxlLk1vdW50ZWRGaWxlc1wiIGlzIGEgTWFwIGZvciBhbGwgcHJlbG9hZGVkIGZpbGVzLlxuICAgIGlmICghbW91bnRlZEZpbGVzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0V4dGVybmFsIG1vdW50ZWQgZmlsZXMgYXJlIG5vdCBhdmFpbGFibGUuJyk7XG4gICAgfVxuXG4gICAgbGV0IGZpbGVQYXRoID0gZXh0ZXJuYWxGaWxlUGF0aDtcbiAgICBpZiAoZXh0ZXJuYWxGaWxlUGF0aC5zdGFydHNXaXRoKCcuLycpKSB7XG4gICAgICBmaWxlUGF0aCA9IGV4dGVybmFsRmlsZVBhdGguc3Vic3RyaW5nKDIpO1xuICAgIH1cbiAgICBjb25zdCBmaWxlRGF0YSA9IG1vdW50ZWRGaWxlcy5nZXQoZmlsZVBhdGgpO1xuICAgIGlmICghZmlsZURhdGEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRmlsZSB3aXRoIG5hbWUgJHtmaWxlUGF0aH0gbm90IGZvdW5kIGluIHByZWxvYWRlZCBmaWxlcy5gKTtcbiAgICB9XG5cbiAgICBpZiAoZGF0YU9mZnNldCArIGRhdGFMZW5ndGggPiBmaWxlRGF0YS5ieXRlTGVuZ3RoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ091dCBvZiBib3VuZHM6IGRhdGEgb2Zmc2V0IGFuZCBsZW5ndGggZXhjZWVkIHRoZSBleHRlcm5hbCBmaWxlIGRhdGEgc2l6ZS4nKTtcbiAgICB9XG5cbiAgICBjb25zdCBidWZmZXIgPSBmaWxlRGF0YS5zbGljZShkYXRhT2Zmc2V0LCBkYXRhT2Zmc2V0ICsgZGF0YUxlbmd0aCkuYnVmZmVyO1xuICAgIGxldCBidWZmZXJWaWV3OiBBcnJheUJ1ZmZlclZpZXc7XG4gICAgc3dpdGNoIChkZXNjLmRhdGFUeXBlKSB7XG4gICAgICBjYXNlICdmbG9hdDMyJzpcbiAgICAgICAgYnVmZmVyVmlldyA9IG5ldyBGbG9hdDMyQXJyYXkoYnVmZmVyKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdmbG9hdDE2JzpcbiAgICAgICAgYnVmZmVyVmlldyA9XG4gICAgICAgICAgdHlwZW9mIEZsb2F0MTZBcnJheSAhPT0gJ3VuZGVmaW5lZCcgJiYgRmxvYXQxNkFycmF5LmZyb20gPyBuZXcgRmxvYXQxNkFycmF5KGJ1ZmZlcikgOiBuZXcgVWludDE2QXJyYXkoYnVmZmVyKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdpbnQzMic6XG4gICAgICAgIGJ1ZmZlclZpZXcgPSBuZXcgSW50MzJBcnJheShidWZmZXIpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3VpbnQzMic6XG4gICAgICAgIGJ1ZmZlclZpZXcgPSBuZXcgVWludDMyQXJyYXkoYnVmZmVyKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdpbnQ2NCc6XG4gICAgICAgIGlmIChzaG91bGRDb252ZXJ0SW50NjRUb0ludDMyKSB7XG4gICAgICAgICAgLy8gSW50NjQgaXMgbm90IHN1cHBvcnRlZCBieSBjdXJyZW50IGNvbnRleHQsIHVzZSBpbnQzMiBpbnN0ZWFkLlxuICAgICAgICAgIGNvbnN0IGludDMyQnVmZmVyID0gY29udmVydERhdGFUb0ludDMyKG5ldyBVaW50OEFycmF5KGJ1ZmZlciksICdpbnQ2NCcpO1xuICAgICAgICAgIGJ1ZmZlclZpZXcgPSBuZXcgSW50MzJBcnJheShpbnQzMkJ1ZmZlci5idWZmZXIpO1xuICAgICAgICAgIGRlc2MuZGF0YVR5cGUgPSAnaW50MzInO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGJ1ZmZlclZpZXcgPSBuZXcgQmlnSW50NjRBcnJheShidWZmZXIpO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAndWludDY0JzpcbiAgICAgICAgYnVmZmVyVmlldyA9IG5ldyBCaWdVaW50NjRBcnJheShidWZmZXIpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2ludDgnOlxuICAgICAgICBidWZmZXJWaWV3ID0gbmV3IEludDhBcnJheShidWZmZXIpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2ludDQnOlxuICAgICAgY2FzZSAndWludDQnOlxuICAgICAgY2FzZSAndWludDgnOlxuICAgICAgICBidWZmZXJWaWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIGRhdGEgdHlwZTogJHtkZXNjLmRhdGFUeXBlfSBpbiBjcmVhdGluZyBXZWJOTiBDb25zdGFudCBmcm9tIGV4dGVybmFsIGRhdGEuYCk7XG4gICAgfVxuXG4gICAgTE9HX0RFQlVHKFxuICAgICAgJ3ZlcmJvc2UnLFxuICAgICAgKCkgPT5cbiAgICAgICAgYFtXZWJOTl0gcmVnaXN0ZXJNTENvbnN0YW50IHtkYXRhVHlwZTogJHtkZXNjLmRhdGFUeXBlfSwgc2hhcGU6ICR7ZGVzYy5zaGFwZX19fSAke1xuICAgICAgICAgIHNob3VsZENvbnZlcnRJbnQ2NFRvSW50MzIgPyAnKE5vdGU6IGl0IHdhcyBpbnQ2NCBkYXRhIHR5cGUgYW5kIHJlZ2lzdGVyZWQgdG8gaW50MzIgYXMgd29ya2Fyb3VuZCknIDogJydcbiAgICAgICAgfWAsXG4gICAgKTtcblxuICAgIHJldHVybiBidWlsZGVyLmNvbnN0YW50KGRlc2MsIGJ1ZmZlclZpZXcpO1xuICB9XG5cbiAgcHVibGljIHJlZ2lzdGVyR3JhcGhJbnB1dChpbnB1dE5hbWU6IHN0cmluZyk6IHZvaWQge1xuICAgIHRoaXMudGVtcG9yYXJ5R3JhcGhJbnB1dHMucHVzaChpbnB1dE5hbWUpO1xuICB9XG5cbiAgcHVibGljIHJlZ2lzdGVyR3JhcGhPdXRwdXQob3V0cHV0TmFtZTogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy50ZW1wb3JhcnlHcmFwaE91dHB1dHMucHVzaChvdXRwdXROYW1lKTtcbiAgfVxuXG4gIHB1YmxpYyBpc0dyYXBoSW5wdXQoc2Vzc2lvbklkOiBudW1iZXIsIGlucHV0TmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3QgaW5wdXROYW1lcyA9IHRoaXMuc2Vzc2lvbkdyYXBoSW5wdXRzLmdldChzZXNzaW9uSWQpO1xuICAgIGlmICghaW5wdXROYW1lcykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gaW5wdXROYW1lcy5pbmNsdWRlcyhpbnB1dE5hbWUpO1xuICB9XG5cbiAgcHVibGljIGlzR3JhcGhPdXRwdXQoc2Vzc2lvbklkOiBudW1iZXIsIG91dHB1dE5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IG91dHB1dE5hbWVzID0gdGhpcy5zZXNzaW9uR3JhcGhPdXRwdXRzLmdldChzZXNzaW9uSWQpO1xuICAgIGlmICghb3V0cHV0TmFtZXMpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIG91dHB1dE5hbWVzLmluY2x1ZGVzKG91dHB1dE5hbWUpO1xuICB9XG5cbiAgcHVibGljIGlzR3JhcGhJbnB1dE91dHB1dFR5cGVTdXBwb3J0ZWQoc2Vzc2lvbklkOiBudW1iZXIsIHR5cGU6IFRlbnNvci5UeXBlLCBpc0lucHV0ID0gdHJ1ZSk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGRhdGFUeXBlID0gb25ueERhdGFUeXBlVG9XZWJubkRhdGFUeXBlLmdldCh0ZW5zb3JEYXRhVHlwZVN0cmluZ1RvRW51bSh0eXBlKSk7XG4gICAgY29uc3Qgb3BMaW1pdHMgPSB0aGlzLm1sT3BTdXBwb3J0TGltaXRzQnlTZXNzaW9uSWQuZ2V0KHNlc3Npb25JZCk7XG5cbiAgICBpZiAodHlwZW9mIGRhdGFUeXBlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmIChpc0lucHV0KSB7XG4gICAgICByZXR1cm4gISFvcExpbWl0cz8uaW5wdXQuZGF0YVR5cGVzLmluY2x1ZGVzKGRhdGFUeXBlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICEhb3BMaW1pdHM/Lm91dHB1dC5kYXRhVHlwZXMuaW5jbHVkZXMoZGF0YVR5cGUpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBmbHVzaCgpOiB2b2lkIHtcbiAgICAvLyBVbmxpa2UgdGhlIFdlYkdQVSBiYWNrZW5kLCB0aGUgV2ViTk4gYmFja2VuZCBkb2VzIG5vdCBuZWVkIHRvIGZsdXNoIGFueSBwZW5kaW5nIG9wZXJhdGlvbnMuXG4gIH1cbn1cbiIsICIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cblxuLy8gV2ViTk4gQVBJIGN1cnJlbnRseSBkb2VzIG5vdCBoYXZlIGEgVHlwZVNjcmlwdCBkZWZpbml0aW9uIGZpbGUuIFRoaXMgZmlsZSBpcyBhIHdvcmthcm91bmQgd2l0aCB0eXBlcyBnZW5lcmF0ZWQgZnJvbVxuLy8gV2ViTk4gQVBJIHNwZWNpZmljYXRpb24uXG4vLyBodHRwczovL2dpdGh1Yi5jb20vd2VibWFjaGluZWxlYXJuaW5nL3dlYm5uL2lzc3Vlcy82Nzdcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJqc2VwL3dlYm5uL3dlYm5uLmQudHNcIiAvPlxuXG5pbXBvcnQgeyBFbnYsIEluZmVyZW5jZVNlc3Npb24sIFRlbnNvciwgVFJBQ0VfRVZFTlRfQkVHSU4sIFRSQUNFX0VWRU5UX0VORCB9IGZyb20gJ29ubnhydW50aW1lLWNvbW1vbic7XG5cbmltcG9ydCB7XG4gIFNlcmlhbGl6YWJsZUludGVybmFsQnVmZmVyLFxuICBTZXJpYWxpemFibGVTZXNzaW9uTWV0YWRhdGEsXG4gIFNlcmlhbGl6YWJsZVRlbnNvck1ldGFkYXRhLFxuICBUZW5zb3JNZXRhZGF0YSxcbn0gZnJvbSAnLi9wcm94eS1tZXNzYWdlcyc7XG5pbXBvcnQgeyBzZXRSdW5PcHRpb25zIH0gZnJvbSAnLi9ydW4tb3B0aW9ucyc7XG5pbXBvcnQgeyBzZXRTZXNzaW9uT3B0aW9ucyB9IGZyb20gJy4vc2Vzc2lvbi1vcHRpb25zJztcbmltcG9ydCB7XG4gIGNhbGN1bGF0ZVRlbnNvclNpemVJbkJ5dGVzLFxuICBkYXRhTG9jYXRpb25TdHJpbmdUb0VudW0sXG4gIGlzR3B1QnVmZmVyU3VwcG9ydGVkVHlwZSxcbiAgaXNNTFRlbnNvclN1cHBvcnRlZFR5cGUsXG4gIGxvZ0xldmVsU3RyaW5nVG9FbnVtLFxuICB0ZW5zb3JEYXRhVHlwZUVudW1Ub1N0cmluZyxcbiAgdGVuc29yRGF0YVR5cGVTdHJpbmdUb0VudW0sXG4gIHRlbnNvclR5cGVUb1R5cGVkQXJyYXlDb25zdHJ1Y3Rvcixcbn0gZnJvbSAnLi93YXNtLWNvbW1vbic7XG5pbXBvcnQgeyBnZXRJbnN0YW5jZSB9IGZyb20gJy4vd2FzbS1mYWN0b3J5JztcbmltcG9ydCB7IGFsbG9jV2FzbVN0cmluZywgY2hlY2tMYXN0RXJyb3IgfSBmcm9tICcuL3dhc20tdXRpbHMnO1xuaW1wb3J0IHsgbG9hZEZpbGUgfSBmcm9tICcuL3dhc20tdXRpbHMtbG9hZC1maWxlJztcblxuLy8gI3JlZ2lvbiBJbml0aWFsaXphdGlvbnNcblxuLyoqXG4gKiBUaGVyZSBhcmUgNCBkaWZmZXJlbnQgXCJpbml0aWFsaXphdGlvblwiIHN0ZXBzIGZvciBPUlQuIFRoZXkgaGFwcGVuIGluIGRpZmZlcmVudCBwbGFjZXMgYW5kIGRpZmZlcmVudCB0aW1lLlxuICpcbiAqIDEuIEphdmFTY3JpcHQgaW5pdGlhbGl6YXRpb24gZm9yIG9ubnhydW50aW1lLWNvbW1vbiBhbmQgb25ueHJ1bnRpbWUtd2ViLlxuICogICAgVGhpcyBpcyB0aGUgZmlyc3QgaW5pdGlhbGl6YXRpb24gc3RlcC4gSW4gdGhpcyBzdGVwLCBvbm54cnVudGltZS13ZWIgY2FsbHMgb25ueHJ1bnRpbWUtY29tbW9uJ3MgcmVnaXN0ZXJCYWNrZW5kKClcbiAqIGZ1bmN0aW9uIG11bHRpcGxlIHRpbWVzIHRvIHJlZ2lzdGVyIGFsbCB0aGUgYXZhaWxhYmxlIGJhY2tlbmRzLiBUaGUgYmFja2VuZCByZWdpc3RyYXRpb24gaXMgdmVyeSBmYXN0LiBJdCBvbmx5XG4gKiByZWdpc3RlcnMgdGhlIGJhY2tlbmQgbmFtZSB3aXRoIHRoZSB1bmluaXRpYWxpemVkIGJhY2tlbmQgb2JqZWN0LiBObyBoZWF2eSBpbml0aWFsaXphdGlvbiBpcyBkb25lIGluIHRoaXMgc3RlcC5cbiAqICAgIFJlZmVyIHRvIHdlYi9saWIvaW5kZXgudHMgZm9yIHRoZSBiYWNrZW5kIHJlZ2lzdHJhdGlvbi5cbiAqXG4gKiAyLiBXZWJBc3NlbWJseSBhcnRpZmFjdCBpbml0aWFsaXphdGlvbi5cbiAqICAgIFRoaXMgaGFwcGVucyB3aGVuIGFueSByZWdpc3RlcmVkIHdhc20gYmFja2VuZCBpcyB1c2VkIGZvciB0aGUgZmlyc3QgdGltZSAoaWUuIGBvcnQuSW5mZXJlbmNlU2Vzc2lvbi5jcmVhdGUoKWAgaXNcbiAqIGNhbGxlZCkuIEluIHRoaXMgc3RlcCwgb25ueHJ1bnRpbWUtd2ViIGRvZXMgdGhlIGZvbGxvd2luZ3M6XG4gKiAgICAgLSBjcmVhdGUgYSBwcm94eSB3b3JrZXIgYW5kIG1ha2Ugc3VyZSB0aGUgcHJveHkgd29ya2VyIGlzIHJlYWR5IHRvIHJlY2VpdmUgbWVzc2FnZXMsIGlmIHByb3h5IGlzIGVuYWJsZWQuXG4gKiAgICAgLSBwZXJmb3JtIGZlYXR1cmUgZGV0ZWN0aW9uLCBsb2NhdGUgY29ycmVjdCBXZWJBc3NlbWJseSBhcnRpZmFjdCBwYXRoIGFuZCBjYWxsIHRoZSBFbXNjcmlwdGVuIGdlbmVyYXRlZFxuICogSmF2YVNjcmlwdCBjb2RlIHRvIGluaXRpYWxpemUgdGhlIFdlYkFzc2VtYmx5IHJ1bnRpbWUuXG4gKiAgICAgICAgIC0gaWYgcHJveHkgaXMgZW5hYmxlZCwgdGhpcyBzdGVwIGhhcHBlbnMgaW4gdGhlIHByb3h5IHdvcmtlciB1c2luZyBtZXNzYWdlICdpbml0LXdhc20nLlxuICogICAgICAgICAtIGRvd25sb2FkaW5nIHRoZSAnb3J0LXdhc217Li4ufS53YXNtJyBmaWxlIGlzIGRvbmUgaW4gdGhpcyBzdGVwLlxuICogICAgICAgICAtIGlmIG11bHRpLXRocmVhZCBpcyBlbmFibGVkLCBvbmUgb3IgbW9yZSB3ZWJ3b3JrZXIgd2lsbCBiZSBjcmVhdGVkIHRvIGluaXRpYWxpemUgdGhlIFBUaHJlYWQgdGhyZWFkcG9vbC5cbiAqXG4gKiAzLiBPUlQgZW52aXJvbm1lbnQgaW5pdGlhbGl6YXRpb24uXG4gKiAgICBUaGlzIGhhcHBlbnMgYWZ0ZXIgc3RlcCAyLiBJbiB0aGlzIHN0ZXAsIG9ubnhydW50aW1lLXdlYiBwZXJmb3JtcyBPTk5YIFJ1bnRpbWUgZW52aXJvbm1lbnQgaW5pdGlhbGl6YXRpb24uXG4gKiBGdW5jdGlvbiBgX09ydEluaXQoKWAgaXMgY2FsbGVkIGluIHRoaXMgc3RlcC5cbiAqICAgICAtIGlmIHByb3h5IGlzIGVuYWJsZWQsIHRoaXMgc3RlcCBoYXBwZW5zIGluIHRoZSBwcm94eSB3b3JrZXIgdXNpbmcgbWVzc2FnZSAnaW5pdC1vcnQnLlxuICogICAgIC0gbG9nZ2luZyBsZXZlbCAob3J0LmVudi5sb2dMZXZlbCkgYW5kIHRocmVhZCBudW1iZXIgKG9ydC5lbnYud2FzbS5udW1UaHJlYWRzKSBhcmUgc2V0IGluIHRoaXMgc3RlcC5cbiAqXG4gKiA0LiBTZXNzaW9uIGluaXRpYWxpemF0aW9uLlxuICogICAgVGhpcyBoYXBwZW5zIHdoZW4gYG9ydC5JbmZlcmVuY2VTZXNzaW9uLmNyZWF0ZSgpYCBpcyBjYWxsZWQuIFVubGlrZSB0aGUgZmlyc3QgMyBzdGVwcyAodGhleSBvbmx5IGNhbGxlZCBvbmNlKSxcbiAqIHRoaXMgc3RlcCB3aWxsIGJlIGRvbmUgZm9yIGVhY2ggc2Vzc2lvbi4gSW4gdGhpcyBzdGVwLCBvbm54cnVudGltZS13ZWIgZG9lcyB0aGUgZm9sbG93aW5nczpcbiAqICAgIElmIHRoZSBwYXJhbWV0ZXIgaXMgYSBVUkw6XG4gKiAgICAtIGRvd25sb2FkIHRoZSBtb2RlbCBkYXRhIGZyb20gdGhlIFVSTC5cbiAqICAgIC0gY29weSB0aGUgbW9kZWwgZGF0YSB0byB0aGUgV0FTTSBoZWFwLiAocHJveHk6ICdjb3B5LWZyb20nKVxuICogICAgLSBkZXJlZmVyZW5jZSB0aGUgbW9kZWwgYnVmZmVyLiBUaGlzIHN0ZXAgYWxsb3dzIHRoZSBvcmlnaW5hbCBBcnJheUJ1ZmZlciB0byBiZSBnYXJiYWdlIGNvbGxlY3RlZC5cbiAqICAgIC0gY2FsbCBgX09ydENyZWF0ZVNlc3Npb24oKWAgdG8gY3JlYXRlIHRoZSBzZXNzaW9uLiAocHJveHk6ICdjcmVhdGUnKVxuICpcbiAqICAgIElmIHRoZSBwYXJhbWV0ZXIgaXMgYSBVaW50OEFycmF5IG9iamVjdDpcbiAqICAgIC0gY29weSB0aGUgbW9kZWwgZGF0YSB0byB0aGUgV0FTTSBoZWFwLiAocHJveHk6ICdjb3B5LWZyb20nKVxuICogICAgLSBjYWxsIGBfT3J0Q3JlYXRlU2Vzc2lvbigpYCB0byBjcmVhdGUgdGhlIHNlc3Npb24uIChwcm94eTogJ2NyZWF0ZScpXG4gKlxuICpcbiAqL1xuXG4vKipcbiAqIGluaXRpYWxpemUgT1JUIGVudmlyb25tZW50LlxuICpcbiAqIEBwYXJhbSBudW1UaHJlYWRzIFNldEdsb2JhbEludHJhT3BOdW1UaHJlYWRzKG51bVRocmVhZHMpXG4gKiBAcGFyYW0gbG9nZ2luZ0xldmVsIENyZWF0ZUVudihzdGF0aWNfY2FzdDxPcnRMb2dnaW5nTGV2ZWw+KGxvZ2dpbmdfbGV2ZWwpKVxuICovXG5jb25zdCBpbml0T3J0ID0gKG51bVRocmVhZHM6IG51bWJlciwgbG9nZ2luZ0xldmVsOiBudW1iZXIpOiB2b2lkID0+IHtcbiAgY29uc3QgZXJyb3JDb2RlID0gZ2V0SW5zdGFuY2UoKS5fT3J0SW5pdChudW1UaHJlYWRzLCBsb2dnaW5nTGV2ZWwpO1xuICBpZiAoZXJyb3JDb2RlICE9PSAwKSB7XG4gICAgY2hlY2tMYXN0RXJyb3IoXCJDYW4ndCBpbml0aWFsaXplIG9ubnhydW50aW1lLlwiKTtcbiAgfVxufTtcblxuLyoqXG4gKiBpbml0aWFsaXplIHJ1bnRpbWUgZW52aXJvbm1lbnQuXG4gKiBAcGFyYW0gZW52IHBhc3NlZCBpbiB0aGUgZW52aXJvbm1lbnQgY29uZmlnIG9iamVjdC5cbiAqL1xuZXhwb3J0IGNvbnN0IGluaXRSdW50aW1lID0gYXN5bmMgKGVudjogRW52KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gIC8vIGluaXQgT1JUXG4gIGluaXRPcnQoZW52Lndhc20ubnVtVGhyZWFkcyEsIGxvZ0xldmVsU3RyaW5nVG9FbnVtKGVudi5sb2dMZXZlbCkpO1xufTtcblxuLyoqXG4gKiBwZXJmb3JtIEVQIHNwZWNpZmljIGluaXRpYWxpemF0aW9uLlxuICpcbiAqIEBwYXJhbSBlbnZcbiAqIEBwYXJhbSBlcE5hbWVcbiAqL1xuZXhwb3J0IGNvbnN0IGluaXRFcCA9IGFzeW5jIChlbnY6IEVudiwgZXBOYW1lOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgLy8gaW5pdGlhbGl6ZSBBU1lOQ0lGWSBzdXBwb3J0XG4gIGdldEluc3RhbmNlKCkuYXN5bmNJbml0Py4oKTtcblxuICAvLyBwZXJmb3JtIFdlYkdQVSBhdmFpbGFiaWxpdHkgY2hlY2sgKCBlaXRoZXIgSlNFUCBvciBXZWJHUFUgRVAgKVxuICBsZXQgd2ViZ3B1QWRhcHRlciA9IGVudi53ZWJncHUuYWRhcHRlciBhcyBHUFVBZGFwdGVyIHwgbnVsbDtcbiAgaWYgKGVwTmFtZSA9PT0gJ3dlYmdwdScpIHtcbiAgICBpZiAodHlwZW9mIG5hdmlnYXRvciA9PT0gJ3VuZGVmaW5lZCcgfHwgIW5hdmlnYXRvci5ncHUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignV2ViR1BVIGlzIG5vdCBzdXBwb3J0ZWQgaW4gY3VycmVudCBlbnZpcm9ubWVudCcpO1xuICAgIH1cbiAgICBpZiAoIXdlYmdwdUFkYXB0ZXIpIHtcbiAgICAgIC8vIGlmIGFkYXB0ZXIgaXMgbm90IHNldCwgcmVxdWVzdCBhIG5ldyBhZGFwdGVyLlxuICAgICAgY29uc3QgcG93ZXJQcmVmZXJlbmNlID0gZW52LndlYmdwdS5wb3dlclByZWZlcmVuY2U7XG4gICAgICBpZiAocG93ZXJQcmVmZXJlbmNlICE9PSB1bmRlZmluZWQgJiYgcG93ZXJQcmVmZXJlbmNlICE9PSAnbG93LXBvd2VyJyAmJiBwb3dlclByZWZlcmVuY2UgIT09ICdoaWdoLXBlcmZvcm1hbmNlJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgcG93ZXJQcmVmZXJlbmNlIHNldHRpbmc6IFwiJHtwb3dlclByZWZlcmVuY2V9XCJgKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGZvcmNlRmFsbGJhY2tBZGFwdGVyID0gZW52LndlYmdwdS5mb3JjZUZhbGxiYWNrQWRhcHRlcjtcbiAgICAgIGlmIChmb3JjZUZhbGxiYWNrQWRhcHRlciAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBmb3JjZUZhbGxiYWNrQWRhcHRlciAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBmb3JjZUZhbGxiYWNrQWRhcHRlciBzZXR0aW5nOiBcIiR7Zm9yY2VGYWxsYmFja0FkYXB0ZXJ9XCJgKTtcbiAgICAgIH1cbiAgICAgIHdlYmdwdUFkYXB0ZXIgPSBhd2FpdCBuYXZpZ2F0b3IuZ3B1LnJlcXVlc3RBZGFwdGVyKHsgcG93ZXJQcmVmZXJlbmNlLCBmb3JjZUZhbGxiYWNrQWRhcHRlciB9KTtcbiAgICAgIGlmICghd2ViZ3B1QWRhcHRlcikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ0ZhaWxlZCB0byBnZXQgR1BVIGFkYXB0ZXIuICcgK1xuICAgICAgICAgICAgJ1lvdSBtYXkgbmVlZCB0byBlbmFibGUgZmxhZyBcIi0tZW5hYmxlLXVuc2FmZS13ZWJncHVcIiBpZiB5b3UgYXJlIHVzaW5nIENocm9tZS4nLFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBpZiBhZGFwdGVyIGlzIHNldCwgdmFsaWRhdGUgaXQuXG4gICAgICBpZiAoXG4gICAgICAgIHR5cGVvZiB3ZWJncHVBZGFwdGVyLmxpbWl0cyAhPT0gJ29iamVjdCcgfHxcbiAgICAgICAgdHlwZW9mIHdlYmdwdUFkYXB0ZXIuZmVhdHVyZXMgIT09ICdvYmplY3QnIHx8XG4gICAgICAgIHR5cGVvZiB3ZWJncHVBZGFwdGVyLnJlcXVlc3REZXZpY2UgIT09ICdmdW5jdGlvbidcbiAgICAgICkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgR1BVIGFkYXB0ZXIgc2V0IGluIGBlbnYud2ViZ3B1LmFkYXB0ZXJgLiBJdCBtdXN0IGJlIGEgR1BVQWRhcHRlciBvYmplY3QuJyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gcGVyZm9ybSBXZWJOTiBhdmFpbGFiaWxpdHkgY2hlY2sgKCBlaXRoZXIgSlNFUCBvciBXZWJOTiBFUCApXG4gIGlmIChlcE5hbWUgPT09ICd3ZWJubicpIHtcbiAgICBpZiAodHlwZW9mIG5hdmlnYXRvciA9PT0gJ3VuZGVmaW5lZCcgfHwgIShuYXZpZ2F0b3IgYXMgdW5rbm93biBhcyB7IG1sOiB1bmtub3duIH0pLm1sKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1dlYk5OIGlzIG5vdCBzdXBwb3J0ZWQgaW4gY3VycmVudCBlbnZpcm9ubWVudCcpO1xuICAgIH1cbiAgfVxuXG4gIGlmICghQlVJTERfREVGUy5ESVNBQkxFX0pTRVApIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXJlcXVpcmUtaW1wb3J0cywgQHR5cGVzY3JpcHQtZXNsaW50L25vLXZhci1yZXF1aXJlc1xuICAgIGNvbnN0IGluaXRKc2VwID0gcmVxdWlyZSgnLi9qc2VwL2luaXQnKS5pbml0O1xuXG4gICAgaWYgKGVwTmFtZSA9PT0gJ3dlYmdwdScpIHtcbiAgICAgIGF3YWl0IGluaXRKc2VwKCd3ZWJncHUnLCBnZXRJbnN0YW5jZSgpLCBlbnYsIHdlYmdwdUFkYXB0ZXIpO1xuICAgIH1cbiAgICBpZiAoZXBOYW1lID09PSAnd2Vibm4nKSB7XG4gICAgICBhd2FpdCBpbml0SnNlcCgnd2Vibm4nLCBnZXRJbnN0YW5jZSgpLCBlbnYpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoIUJVSUxEX0RFRlMuRElTQUJMRV9XRUJHUFUgJiYgZXBOYW1lID09PSAnd2ViZ3B1Jykge1xuICAgICAgZ2V0SW5zdGFuY2UoKS53ZWJncHVJbml0ISgoZGV2aWNlKSA9PiB7XG4gICAgICAgIGVudi53ZWJncHUuZGV2aWNlID0gZGV2aWNlO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGlmICghQlVJTERfREVGUy5ESVNBQkxFX1dFQk5OICYmIGVwTmFtZSA9PT0gJ3dlYm5uJykge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1yZXF1aXJlLWltcG9ydHMsIEB0eXBlc2NyaXB0LWVzbGludC9uby12YXItcmVxdWlyZXNcbiAgICAgIGNvbnN0IGJhY2tlbmQgPSBuZXcgKHJlcXVpcmUoJy4vanNlcC9iYWNrZW5kLXdlYm5uJykuV2ViTk5CYWNrZW5kKShlbnYpO1xuICAgICAgZ2V0SW5zdGFuY2UoKS53ZWJubkluaXQhKFtcbiAgICAgICAgYmFja2VuZCxcbiAgICAgICAgLy8gd2Vibm5SZXNlcnZlVGVuc29ySWRcbiAgICAgICAgKCkgPT4gYmFja2VuZC5yZXNlcnZlVGVuc29ySWQoKSxcbiAgICAgICAgLy8gd2Vibm5SZWxlYXNlVGVuc29ySWQsXG4gICAgICAgICh0ZW5zb3JJZDogbnVtYmVyKSA9PiBiYWNrZW5kLnJlbGVhc2VUZW5zb3JJZCh0ZW5zb3JJZCksXG4gICAgICAgIC8vIHdlYm5uRW5zdXJlVGVuc29yXG4gICAgICAgIGFzeW5jIChzZXNzaW9uSWQ6IG51bWJlciB8IHVuZGVmaW5lZCwgdGVuc29ySWQ6IG51bWJlciwgb25ueERhdGFUeXBlOiBudW1iZXIsIHNoYXBlOiBudW1iZXJbXSwgY29weU9sZCkgPT5cbiAgICAgICAgICBiYWNrZW5kLmVuc3VyZVRlbnNvcihzZXNzaW9uSWQsIHRlbnNvcklkLCBvbm54RGF0YVR5cGUsIHNoYXBlLCBjb3B5T2xkKSxcbiAgICAgICAgLy8gd2Vibm5VcGxvYWRUZW5zb3JcbiAgICAgICAgKHRlbnNvcklkOiBudW1iZXIsIGRhdGE6IFVpbnQ4QXJyYXkpID0+IHtcbiAgICAgICAgICBiYWNrZW5kLnVwbG9hZFRlbnNvcih0ZW5zb3JJZCwgZGF0YSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8vIHdlYm5uRG93bmxvYWRUZW5zb3JcbiAgICAgICAgYXN5bmMgKHRlbnNvcklkOiBudW1iZXIsIGRzdEJ1ZmZlcjogQXJyYXlCdWZmZXJWaWV3IHwgQXJyYXlCdWZmZXIpID0+XG4gICAgICAgICAgYmFja2VuZC5kb3dubG9hZFRlbnNvcih0ZW5zb3JJZCwgZHN0QnVmZmVyKSxcbiAgICAgICAgLy8gd2Vibm5SZWdpc3Rlck1MQ29udGV4dFxuICAgICAgICAoc2Vzc2lvbklkOiBudW1iZXIsIG1sQ29udGV4dDogTUxDb250ZXh0KSA9PiBiYWNrZW5kLnJlZ2lzdGVyTUxDb250ZXh0KHNlc3Npb25JZCwgbWxDb250ZXh0KSxcbiAgICAgICAgLy8gd2Vibm5FbmFibGVUcmFjZUV2ZW50XG4gICAgICAgICEhZW52LnRyYWNlLFxuICAgICAgXSk7XG4gICAgfVxuICB9XG59O1xuXG4vLyAjZW5kcmVnaW9uIEluaXRpYWxpemF0aW9uc1xuXG4vKipcbiAqIHZhbGlkIGRhdGEgbG9jYXRpb25zIGZvciBpbnB1dC9vdXRwdXQgdGVuc29ycy5cbiAqL1xudHlwZSBTdXBwb3J0ZWRUZW5zb3JEYXRhTG9jYXRpb25Gb3JJbnB1dE91dHB1dCA9XG4gIHwgJ2NwdSdcbiAgfCAnY3B1LXBpbm5lZCdcbiAgfCAnZ3B1LWJ1ZmZlcidcbiAgfCAnbWwtdGVuc29yJ1xuICAvLyBVc2UgJ21sLXRlbnNvcicgZHVyaW5nIGluZmVyZW5jZSwgYnV0IG91dHB1dCBhIHRlbnNvciBsb2NhdGVkIG9uIHRoZSBDUFUuXG4gIHwgJ21sLXRlbnNvci1jcHUtb3V0cHV0JztcblxudHlwZSBJT0JpbmRpbmdTdGF0ZSA9IHtcbiAgLyoqXG4gICAqIHRoZSBoYW5kbGUgb2YgSU8gYmluZGluZy5cbiAgICovXG4gIHJlYWRvbmx5IGhhbmRsZTogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiB0aGUgcHJlZmVycmVkIGxvY2F0aW9uIGZvciBlYWNoIG91dHB1dCB0ZW5zb3IuXG4gICAqXG4gICAqIHZhbHVlIGlzIG9uZSBvZiAnY3B1JywgJ2NwdS1waW5uZWQnLCAnZ3B1LWJ1ZmZlcicsICdtbC10ZW5zb3InLlxuICAgKi9cbiAgcmVhZG9ubHkgb3V0cHV0UHJlZmVycmVkTG9jYXRpb25zOiByZWFkb25seSBTdXBwb3J0ZWRUZW5zb3JEYXRhTG9jYXRpb25Gb3JJbnB1dE91dHB1dFtdO1xuXG4gIC8qKlxuICAgKiBlbnVtIHZhbHVlIG9mIHRoZSBwcmVmZXJyZWQgbG9jYXRpb24gZm9yIGVhY2ggb3V0cHV0IHRlbnNvci5cbiAgICovXG4gIHJlYWRvbmx5IG91dHB1dFByZWZlcnJlZExvY2F0aW9uc0VuY29kZWQ6IHJlYWRvbmx5IG51bWJlcltdO1xufTtcblxuLyoqXG4gKiAgdHVwbGUgZWxlbWVudHMgYXJlOiBJbmZlcmVuY2VTZXNzaW9uIElEOyBpbnB1dE5hbWVzVVRGOEVuY29kZWQ7IG91dHB1dE5hbWVzVVRGOEVuY29kZWQ7IGJpbmRpbmdTdGF0ZVxuICovXG50eXBlIFNlc3Npb25NZXRhZGF0YSA9IFtcbiAgaW5mZXJlbmNlU2Vzc2lvbklkOiBudW1iZXIsXG4gIGlucHV0TmFtZXNVVEY4RW5jb2RlZDogbnVtYmVyW10sXG4gIG91dHB1dE5hbWVzVVRGOEVuY29kZWQ6IG51bWJlcltdLFxuICBiaW5kaW5nU3RhdGU6IElPQmluZGluZ1N0YXRlIHwgbnVsbCxcbiAgZW5hYmxlR3JhcGhDYXB0dXJlOiBib29sZWFuLFxuICBpbnB1dE91dHB1dEJvdW5kOiBib29sZWFuLFxuXTtcblxuY29uc3QgYWN0aXZlU2Vzc2lvbnMgPSBuZXcgTWFwPG51bWJlciwgU2Vzc2lvbk1ldGFkYXRhPigpO1xuXG4vKipcbiAqIGdldCB0aGUgaW5wdXQvb3V0cHV0IGNvdW50IG9mIHRoZSBzZXNzaW9uLlxuICogQHBhcmFtIHNlc3Npb25IYW5kbGUgdGhlIGhhbmRsZSByZXByZXNlbnRpbmcgdGhlIHNlc3Npb24uIHNob3VsZCBiZSBub24temVyby5cbiAqIEByZXR1cm5zIGEgdHVwbGUgaW5jbHVkaW5nIDIgbnVtYmVycywgcmVwcmVzZW50aW5nIHRoZSBpbnB1dCBjb3VudCBhbmQgb3V0cHV0IGNvdW50LlxuICovXG5jb25zdCBnZXRTZXNzaW9uSW5wdXRPdXRwdXRDb3VudCA9IChzZXNzaW9uSGFuZGxlOiBudW1iZXIpOiBbbnVtYmVyLCBudW1iZXJdID0+IHtcbiAgY29uc3Qgd2FzbSA9IGdldEluc3RhbmNlKCk7XG4gIGNvbnN0IHN0YWNrID0gd2FzbS5zdGFja1NhdmUoKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBwdHJTaXplID0gd2FzbS5QVFJfU0laRTtcbiAgICBjb25zdCBkYXRhT2Zmc2V0ID0gd2FzbS5zdGFja0FsbG9jKDIgKiBwdHJTaXplKTtcbiAgICBjb25zdCBlcnJvckNvZGUgPSB3YXNtLl9PcnRHZXRJbnB1dE91dHB1dENvdW50KHNlc3Npb25IYW5kbGUsIGRhdGFPZmZzZXQsIGRhdGFPZmZzZXQgKyBwdHJTaXplKTtcbiAgICBpZiAoZXJyb3JDb2RlICE9PSAwKSB7XG4gICAgICBjaGVja0xhc3RFcnJvcihcIkNhbid0IGdldCBzZXNzaW9uIGlucHV0L291dHB1dCBjb3VudC5cIik7XG4gICAgfVxuICAgIGNvbnN0IHR5cGUgPSBwdHJTaXplID09PSA0ID8gJ2kzMicgOiAnaTY0JztcbiAgICByZXR1cm4gW051bWJlcih3YXNtLmdldFZhbHVlKGRhdGFPZmZzZXQsIHR5cGUpKSwgTnVtYmVyKHdhc20uZ2V0VmFsdWUoZGF0YU9mZnNldCArIHB0clNpemUsIHR5cGUpKV07XG4gIH0gZmluYWxseSB7XG4gICAgd2FzbS5zdGFja1Jlc3RvcmUoc3RhY2spO1xuICB9XG59O1xuXG5jb25zdCBnZXRTZXNzaW9uSW5wdXRPdXRwdXRNZXRhZGF0YSA9IChcbiAgc2Vzc2lvbkhhbmRsZTogbnVtYmVyLFxuICBpbmRleDogbnVtYmVyLFxuKTogW25hbWVPZmZzZXQ6IG51bWJlciwgZWxlbWVudFR5cGU6IG51bWJlciwgZGltcz86IEFycmF5PG51bWJlciB8IHN0cmluZz5dID0+IHtcbiAgY29uc3Qgd2FzbSA9IGdldEluc3RhbmNlKCk7XG4gIGNvbnN0IHN0YWNrID0gd2FzbS5zdGFja1NhdmUoKTtcbiAgbGV0IG1ldGFkYXRhT2Zmc2V0ID0gMDtcbiAgdHJ5IHtcbiAgICBjb25zdCBwdHJTaXplID0gd2FzbS5QVFJfU0laRTtcbiAgICBjb25zdCBkYXRhT2Zmc2V0ID0gd2FzbS5zdGFja0FsbG9jKDIgKiBwdHJTaXplKTtcbiAgICBjb25zdCBlcnJvckNvZGUgPSB3YXNtLl9PcnRHZXRJbnB1dE91dHB1dE1ldGFkYXRhKHNlc3Npb25IYW5kbGUsIGluZGV4LCBkYXRhT2Zmc2V0LCBkYXRhT2Zmc2V0ICsgcHRyU2l6ZSk7XG4gICAgaWYgKGVycm9yQ29kZSAhPT0gMCkge1xuICAgICAgY2hlY2tMYXN0RXJyb3IoXCJDYW4ndCBnZXQgc2Vzc2lvbiBpbnB1dC9vdXRwdXQgbWV0YWRhdGEuXCIpO1xuICAgIH1cbiAgICBjb25zdCBuYW1lT2Zmc2V0ID0gTnVtYmVyKHdhc20uZ2V0VmFsdWUoZGF0YU9mZnNldCwgJyonKSk7XG4gICAgbWV0YWRhdGFPZmZzZXQgPSBOdW1iZXIod2FzbS5nZXRWYWx1ZShkYXRhT2Zmc2V0ICsgcHRyU2l6ZSwgJyonKSk7XG4gICAgLy8gZ2V0IGVsZW1lbnQgdHlwZVxuICAgIGNvbnN0IGVsZW1lbnRUeXBlID0gd2FzbS5IRUFQMzJbbWV0YWRhdGFPZmZzZXQgLyA0XTtcbiAgICBpZiAoZWxlbWVudFR5cGUgPT09IDApIHtcbiAgICAgIHJldHVybiBbbmFtZU9mZnNldCwgMF07IC8vIG5vbi10ZW5zb3JcbiAgICB9XG5cbiAgICAvLyBnZXQgZGltcyBjb3VudFxuICAgIGNvbnN0IGRpbXNDb3VudCA9IHdhc20uSEVBUFUzMlttZXRhZGF0YU9mZnNldCAvIDQgKyAxXTtcbiAgICAvLyBnZXQgZGltc1xuICAgIGNvbnN0IGRpbXM6IEFycmF5PG51bWJlciB8IHN0cmluZz4gPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRpbXNDb3VudDsgaSsrKSB7XG4gICAgICBjb25zdCBzeW1ib2xpY0RpbU5hbWVPZmZzZXQgPSBOdW1iZXIod2FzbS5nZXRWYWx1ZShtZXRhZGF0YU9mZnNldCArIDggKyBpICogcHRyU2l6ZSwgJyonKSk7XG4gICAgICBkaW1zLnB1c2goXG4gICAgICAgIHN5bWJvbGljRGltTmFtZU9mZnNldCAhPT0gMFxuICAgICAgICAgID8gd2FzbS5VVEY4VG9TdHJpbmcoc3ltYm9saWNEaW1OYW1lT2Zmc2V0KVxuICAgICAgICAgIDogTnVtYmVyKHdhc20uZ2V0VmFsdWUobWV0YWRhdGFPZmZzZXQgKyA4ICsgKGkgKyBkaW1zQ291bnQpICogcHRyU2l6ZSwgJyonKSksXG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gW25hbWVPZmZzZXQsIGVsZW1lbnRUeXBlLCBkaW1zXTtcbiAgfSBmaW5hbGx5IHtcbiAgICB3YXNtLnN0YWNrUmVzdG9yZShzdGFjayk7XG4gICAgaWYgKG1ldGFkYXRhT2Zmc2V0ICE9PSAwKSB7XG4gICAgICB3YXNtLl9PcnRGcmVlKG1ldGFkYXRhT2Zmc2V0KTtcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogYWxsb2NhdGUgdGhlIG1lbW9yeSBhbmQgbWVtY3B5IHRoZSBleHRlcm5hbCBidWZmZXIuXG4gKlxuICogQHBhcmFtIG1vZGVsIC0gdGhlIGV4dGVybmFsIGJ1ZmZlciBjb250YWluaW5nIHRoZSBtb2RlbCBkYXRhLiBNdXN0IG5vdCBiZSB0aGUgc2FtZSBidWZmZXIgYXMgdGhlIFdBU00gaGVhcC5cbiAqIEByZXR1cm5zIGEgMi1lbGVtZW50cyB0dXBsZSAtIHRoZSBwb2ludGVyIGFuZCBzaXplIG9mIHRoZSBhbGxvY2F0ZWQgYnVmZmVyXG4gKi9cbmV4cG9ydCBjb25zdCBjb3B5RnJvbUV4dGVybmFsQnVmZmVyID0gKG1vZGVsOiBVaW50OEFycmF5KTogW251bWJlciwgbnVtYmVyXSA9PiB7XG4gIGNvbnN0IHdhc20gPSBnZXRJbnN0YW5jZSgpO1xuICBjb25zdCBtb2RlbERhdGFPZmZzZXQgPSB3YXNtLl9tYWxsb2MobW9kZWwuYnl0ZUxlbmd0aCk7XG4gIGlmIChtb2RlbERhdGFPZmZzZXQgPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENhbid0IGNyZWF0ZSBhIHNlc3Npb24uIGZhaWxlZCB0byBhbGxvY2F0ZSBhIGJ1ZmZlciBvZiBzaXplICR7bW9kZWwuYnl0ZUxlbmd0aH0uYCk7XG4gIH1cbiAgd2FzbS5IRUFQVTguc2V0KG1vZGVsLCBtb2RlbERhdGFPZmZzZXQpO1xuICByZXR1cm4gW21vZGVsRGF0YU9mZnNldCwgbW9kZWwuYnl0ZUxlbmd0aF07XG59O1xuXG4vKipcbiAqIGNyZWF0ZSBhbiBpbmZlcmVuY2Ugc2Vzc2lvbiBmcm9tIGEgbW9kZWwgZGF0YSBidWZmZXIuXG4gKlxuICogQHBhcmFtIG1vZGVsRGF0YSAtIGVpdGhlciBhIFVpbnQ4QXJyYXkgb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgbW9kZWwgZGF0YSwgb3IgYSAyLWVsZW1lbnRzIHR1cGxlIGNvbnRhaW5pbmcgdGhlXG4gKiAgICAgcG9pbnRlciBhbmQgc2l6ZSBvZiB0aGUgbW9kZWwgZGF0YSBidWZmZXIuXG4gKiBAcGFyYW0gb3B0aW9ucyBhbiBvcHRpb25hbCBzZXNzaW9uIG9wdGlvbnMgb2JqZWN0LlxuICogQHJldHVybnMgYSAzLWVsZW1lbnRzIHR1cGxlIGNvbnRhaW5pbmcgW3Nlc3Npb24gaGFuZGxlLCBpbnB1dCBuYW1lcywgb3V0cHV0IG5hbWVzXVxuICovXG5leHBvcnQgY29uc3QgY3JlYXRlU2Vzc2lvbiA9IGFzeW5jIChcbiAgbW9kZWxEYXRhOiBVaW50OEFycmF5IHwgU2VyaWFsaXphYmxlSW50ZXJuYWxCdWZmZXIsXG4gIG9wdGlvbnM/OiBJbmZlcmVuY2VTZXNzaW9uLlNlc3Npb25PcHRpb25zLFxuKTogUHJvbWlzZTxTZXJpYWxpemFibGVTZXNzaW9uTWV0YWRhdGE+ID0+IHtcbiAgbGV0IG1vZGVsRGF0YU9mZnNldDogbnVtYmVyLCBtb2RlbERhdGFMZW5ndGg6IG51bWJlcjtcbiAgY29uc3Qgd2FzbSA9IGdldEluc3RhbmNlKCk7XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkobW9kZWxEYXRhKSkge1xuICAgIC8vIGlmIG1vZGVsIGRhdGEgaXMgYW4gYXJyYXksIGl0IG11c3QgYmUgYSAyLWVsZW1lbnRzIHR1cGxlIGNvbnRhaW5pbmcgdGhlIHBvaW50ZXIgYW5kIHNpemUgb2YgdGhlIG1vZGVsIGRhdGFcbiAgICBbbW9kZWxEYXRhT2Zmc2V0LCBtb2RlbERhdGFMZW5ndGhdID0gbW9kZWxEYXRhO1xuICB9IGVsc2UgaWYgKG1vZGVsRGF0YS5idWZmZXIgPT09IHdhc20uSEVBUFU4LmJ1ZmZlcikge1xuICAgIC8vIGlmIG1vZGVsIGRhdGEgdXNlcyB0aGUgc2FtZSBidWZmZXIgYXMgdGhlIFdBU00gaGVhcCwgd2UgZG9uJ3QgbmVlZCB0byBjb3B5IGl0LlxuICAgIFttb2RlbERhdGFPZmZzZXQsIG1vZGVsRGF0YUxlbmd0aF0gPSBbbW9kZWxEYXRhLmJ5dGVPZmZzZXQsIG1vZGVsRGF0YS5ieXRlTGVuZ3RoXTtcbiAgfSBlbHNlIHtcbiAgICAvLyBvdGhlcndpc2UsIGNvcHkgdGhlIG1vZGVsIGRhdGEgdG8gdGhlIFdBU00gaGVhcC5cbiAgICBbbW9kZWxEYXRhT2Zmc2V0LCBtb2RlbERhdGFMZW5ndGhdID0gY29weUZyb21FeHRlcm5hbEJ1ZmZlcihtb2RlbERhdGEpO1xuICB9XG5cbiAgbGV0IHNlc3Npb25IYW5kbGUgPSAwO1xuICBsZXQgc2Vzc2lvbk9wdGlvbnNIYW5kbGUgPSAwO1xuICBsZXQgaW9CaW5kaW5nSGFuZGxlID0gMDtcbiAgbGV0IGFsbG9jczogbnVtYmVyW10gPSBbXTtcbiAgY29uc3QgaW5wdXROYW1lc1VURjhFbmNvZGVkID0gW107XG4gIGNvbnN0IG91dHB1dE5hbWVzVVRGOEVuY29kZWQgPSBbXTtcblxuICB0cnkge1xuICAgIFtzZXNzaW9uT3B0aW9uc0hhbmRsZSwgYWxsb2NzXSA9IGF3YWl0IHNldFNlc3Npb25PcHRpb25zKG9wdGlvbnMpO1xuXG4gICAgaWYgKG9wdGlvbnM/LmV4dGVybmFsRGF0YSAmJiB3YXNtLm1vdW50RXh0ZXJuYWxEYXRhKSB7XG4gICAgICBjb25zdCBsb2FkaW5nUHJvbWlzZXMgPSBbXTtcbiAgICAgIGZvciAoY29uc3QgZmlsZSBvZiBvcHRpb25zLmV4dGVybmFsRGF0YSkge1xuICAgICAgICBjb25zdCBwYXRoID0gdHlwZW9mIGZpbGUgPT09ICdzdHJpbmcnID8gZmlsZSA6IGZpbGUucGF0aDtcbiAgICAgICAgbG9hZGluZ1Byb21pc2VzLnB1c2goXG4gICAgICAgICAgbG9hZEZpbGUodHlwZW9mIGZpbGUgPT09ICdzdHJpbmcnID8gZmlsZSA6IGZpbGUuZGF0YSkudGhlbigoZGF0YSkgPT4ge1xuICAgICAgICAgICAgd2FzbS5tb3VudEV4dGVybmFsRGF0YShwYXRoLCBkYXRhKTtcbiAgICAgICAgICB9KSxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgLy8gd2FpdCBmb3IgYWxsIGV4dGVybmFsIGRhdGEgZmlsZXMgdG8gYmUgbG9hZGVkXG4gICAgICBhd2FpdCBQcm9taXNlLmFsbChsb2FkaW5nUHJvbWlzZXMpO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgcHJvdmlkZXIgb2Ygb3B0aW9ucz8uZXhlY3V0aW9uUHJvdmlkZXJzID8/IFtdKSB7XG4gICAgICBjb25zdCBwcm92aWRlck5hbWUgPSB0eXBlb2YgcHJvdmlkZXIgPT09ICdzdHJpbmcnID8gcHJvdmlkZXIgOiBwcm92aWRlci5uYW1lO1xuICAgICAgaWYgKHByb3ZpZGVyTmFtZSA9PT0gJ3dlYm5uJykge1xuICAgICAgICB3YXNtLnNob3VsZFRyYW5zZmVyVG9NTFRlbnNvciA9IGZhbHNlO1xuICAgICAgICBpZiAodHlwZW9mIHByb3ZpZGVyICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIGNvbnN0IHdlYm5uT3B0aW9ucyA9IHByb3ZpZGVyIGFzIEluZmVyZW5jZVNlc3Npb24uV2ViTk5FeGVjdXRpb25Qcm92aWRlck9wdGlvbjtcbiAgICAgICAgICBjb25zdCBjb250ZXh0ID0gKHdlYm5uT3B0aW9ucyBhcyBJbmZlcmVuY2VTZXNzaW9uLldlYk5OT3B0aW9uc1dpdGhNTENvbnRleHQpPy5jb250ZXh0O1xuICAgICAgICAgIGNvbnN0IGdwdURldmljZSA9ICh3ZWJubk9wdGlvbnMgYXMgSW5mZXJlbmNlU2Vzc2lvbi5XZWJOTk9wdGlvbnNXZWJHcHUpPy5ncHVEZXZpY2U7XG4gICAgICAgICAgY29uc3QgZGV2aWNlVHlwZSA9ICh3ZWJubk9wdGlvbnMgYXMgSW5mZXJlbmNlU2Vzc2lvbi5XZWJOTkNvbnRleHRPcHRpb25zKT8uZGV2aWNlVHlwZTtcbiAgICAgICAgICBjb25zdCBwb3dlclByZWZlcmVuY2UgPSAod2Vibm5PcHRpb25zIGFzIEluZmVyZW5jZVNlc3Npb24uV2ViTk5Db250ZXh0T3B0aW9ucyk/LnBvd2VyUHJlZmVyZW5jZTtcbiAgICAgICAgICBpZiAoY29udGV4dCkge1xuICAgICAgICAgICAgd2FzbS5jdXJyZW50Q29udGV4dCA9IGNvbnRleHQgYXMgTUxDb250ZXh0O1xuICAgICAgICAgIH0gZWxzZSBpZiAoZ3B1RGV2aWNlKSB7XG4gICAgICAgICAgICB3YXNtLmN1cnJlbnRDb250ZXh0ID0gYXdhaXQgd2FzbS53ZWJubkNyZWF0ZU1MQ29udGV4dCEoZ3B1RGV2aWNlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd2FzbS5jdXJyZW50Q29udGV4dCA9IGF3YWl0IHdhc20ud2Vibm5DcmVhdGVNTENvbnRleHQhKHsgZGV2aWNlVHlwZSwgcG93ZXJQcmVmZXJlbmNlIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB3YXNtLmN1cnJlbnRDb250ZXh0ID0gYXdhaXQgd2FzbS53ZWJubkNyZWF0ZU1MQ29udGV4dCEoKTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBzZXNzaW9uSGFuZGxlID0gYXdhaXQgd2FzbS5fT3J0Q3JlYXRlU2Vzc2lvbihtb2RlbERhdGFPZmZzZXQsIG1vZGVsRGF0YUxlbmd0aCwgc2Vzc2lvbk9wdGlvbnNIYW5kbGUpO1xuICAgIHdhc20ud2ViZ3B1T25DcmVhdGVTZXNzaW9uPy4oc2Vzc2lvbkhhbmRsZSk7XG4gICAgaWYgKHNlc3Npb25IYW5kbGUgPT09IDApIHtcbiAgICAgIGNoZWNrTGFzdEVycm9yKFwiQ2FuJ3QgY3JlYXRlIGEgc2Vzc2lvbi5cIik7XG4gICAgfVxuXG4gICAgd2FzbS5qc2VwT25DcmVhdGVTZXNzaW9uPy4oKTtcblxuICAgIC8vIGNsZWFyIGN1cnJlbnQgTUxDb250ZXh0IGFmdGVyIHNlc3Npb24gY3JlYXRpb25cbiAgICBpZiAod2FzbS5jdXJyZW50Q29udGV4dCkge1xuICAgICAgd2FzbS53ZWJublJlZ2lzdGVyTUxDb250ZXh0IShzZXNzaW9uSGFuZGxlLCB3YXNtLmN1cnJlbnRDb250ZXh0KTtcbiAgICAgIHdhc20uY3VycmVudENvbnRleHQgPSB1bmRlZmluZWQ7XG4gICAgICB3YXNtLnNob3VsZFRyYW5zZmVyVG9NTFRlbnNvciA9IHRydWU7XG4gICAgfVxuXG4gICAgY29uc3QgW2lucHV0Q291bnQsIG91dHB1dENvdW50XSA9IGdldFNlc3Npb25JbnB1dE91dHB1dENvdW50KHNlc3Npb25IYW5kbGUpO1xuXG4gICAgY29uc3QgZW5hYmxlR3JhcGhDYXB0dXJlID0gISFvcHRpb25zPy5lbmFibGVHcmFwaENhcHR1cmU7XG5cbiAgICBjb25zdCBpbnB1dE5hbWVzID0gW107XG4gICAgY29uc3Qgb3V0cHV0TmFtZXMgPSBbXTtcbiAgICBjb25zdCBpbnB1dE1ldGFkYXRhOiBJbmZlcmVuY2VTZXNzaW9uLlZhbHVlTWV0YWRhdGFbXSA9IFtdO1xuICAgIGNvbnN0IG91dHB1dE1ldGFkYXRhOiBJbmZlcmVuY2VTZXNzaW9uLlZhbHVlTWV0YWRhdGFbXSA9IFtdO1xuICAgIGNvbnN0IG91dHB1dFByZWZlcnJlZExvY2F0aW9uczogU3VwcG9ydGVkVGVuc29yRGF0YUxvY2F0aW9uRm9ySW5wdXRPdXRwdXRbXSA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXRDb3VudDsgaSsrKSB7XG4gICAgICBjb25zdCBbbmFtZU9mZnNldCwgZWxlbWVudFR5cGUsIHNoYXBlXSA9IGdldFNlc3Npb25JbnB1dE91dHB1dE1ldGFkYXRhKHNlc3Npb25IYW5kbGUsIGkpO1xuICAgICAgaWYgKG5hbWVPZmZzZXQgPT09IDApIHtcbiAgICAgICAgY2hlY2tMYXN0RXJyb3IoXCJDYW4ndCBnZXQgYW4gaW5wdXQgbmFtZS5cIik7XG4gICAgICB9XG4gICAgICBpbnB1dE5hbWVzVVRGOEVuY29kZWQucHVzaChuYW1lT2Zmc2V0KTtcbiAgICAgIGNvbnN0IG5hbWUgPSB3YXNtLlVURjhUb1N0cmluZyhuYW1lT2Zmc2V0KTtcbiAgICAgIGlucHV0TmFtZXMucHVzaChuYW1lKTtcbiAgICAgIGlucHV0TWV0YWRhdGEucHVzaChcbiAgICAgICAgZWxlbWVudFR5cGUgPT09IDBcbiAgICAgICAgICA/IHsgbmFtZSwgaXNUZW5zb3I6IGZhbHNlIH1cbiAgICAgICAgICA6IHsgbmFtZSwgaXNUZW5zb3I6IHRydWUsIHR5cGU6IHRlbnNvckRhdGFUeXBlRW51bVRvU3RyaW5nKGVsZW1lbnRUeXBlKSwgc2hhcGU6IHNoYXBlISB9LFxuICAgICAgKTtcbiAgICB9XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvdXRwdXRDb3VudDsgaSsrKSB7XG4gICAgICBjb25zdCBbbmFtZU9mZnNldCwgZWxlbWVudFR5cGUsIHNoYXBlXSA9IGdldFNlc3Npb25JbnB1dE91dHB1dE1ldGFkYXRhKHNlc3Npb25IYW5kbGUsIGkgKyBpbnB1dENvdW50KTtcbiAgICAgIGlmIChuYW1lT2Zmc2V0ID09PSAwKSB7XG4gICAgICAgIGNoZWNrTGFzdEVycm9yKFwiQ2FuJ3QgZ2V0IGFuIG91dHB1dCBuYW1lLlwiKTtcbiAgICAgIH1cbiAgICAgIG91dHB1dE5hbWVzVVRGOEVuY29kZWQucHVzaChuYW1lT2Zmc2V0KTtcbiAgICAgIGNvbnN0IG5hbWVTdHJpbmcgPSB3YXNtLlVURjhUb1N0cmluZyhuYW1lT2Zmc2V0KTtcbiAgICAgIG91dHB1dE5hbWVzLnB1c2gobmFtZVN0cmluZyk7XG4gICAgICBvdXRwdXRNZXRhZGF0YS5wdXNoKFxuICAgICAgICBlbGVtZW50VHlwZSA9PT0gMFxuICAgICAgICAgID8geyBuYW1lOiBuYW1lU3RyaW5nLCBpc1RlbnNvcjogZmFsc2UgfVxuICAgICAgICAgIDogeyBuYW1lOiBuYW1lU3RyaW5nLCBpc1RlbnNvcjogdHJ1ZSwgdHlwZTogdGVuc29yRGF0YVR5cGVFbnVtVG9TdHJpbmcoZWxlbWVudFR5cGUpLCBzaGFwZTogc2hhcGUhIH0sXG4gICAgICApO1xuXG4gICAgICBpZiAoIUJVSUxEX0RFRlMuRElTQUJMRV9KU0VQIHx8ICFCVUlMRF9ERUZTLkRJU0FCTEVfV0VCR1BVKSB7XG4gICAgICAgIGlmIChlbmFibGVHcmFwaENhcHR1cmUgJiYgb3B0aW9ucz8ucHJlZmVycmVkT3V0cHV0TG9jYXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIG91dHB1dFByZWZlcnJlZExvY2F0aW9ucy5wdXNoKCdncHUtYnVmZmVyJyk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbG9jYXRpb24gPVxuICAgICAgICAgIHR5cGVvZiBvcHRpb25zPy5wcmVmZXJyZWRPdXRwdXRMb2NhdGlvbiA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgID8gb3B0aW9ucy5wcmVmZXJyZWRPdXRwdXRMb2NhdGlvblxuICAgICAgICAgICAgOiAob3B0aW9ucz8ucHJlZmVycmVkT3V0cHV0TG9jYXRpb24/LltuYW1lU3RyaW5nXSA/PyAnY3B1Jyk7XG4gICAgICAgIGNvbnN0IGlzR3JhcGhPdXRwdXQgPSB3YXNtLndlYm5uSXNHcmFwaE91dHB1dDtcbiAgICAgICAgaWYgKGxvY2F0aW9uID09PSAnY3B1JyAmJiBpc0dyYXBoT3V0cHV0ICYmIGlzR3JhcGhPdXRwdXQoc2Vzc2lvbkhhbmRsZSwgbmFtZVN0cmluZykpIHtcbiAgICAgICAgICBvdXRwdXRQcmVmZXJyZWRMb2NhdGlvbnMucHVzaCgnbWwtdGVuc29yLWNwdS1vdXRwdXQnKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobG9jYXRpb24gIT09ICdjcHUnICYmIGxvY2F0aW9uICE9PSAnY3B1LXBpbm5lZCcgJiYgbG9jYXRpb24gIT09ICdncHUtYnVmZmVyJyAmJiBsb2NhdGlvbiAhPT0gJ21sLXRlbnNvcicpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vdCBzdXBwb3J0ZWQgcHJlZmVycmVkIG91dHB1dCBsb2NhdGlvbjogJHtsb2NhdGlvbn0uYCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVuYWJsZUdyYXBoQ2FwdHVyZSAmJiBsb2NhdGlvbiAhPT0gJ2dwdS1idWZmZXInKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgYE5vdCBzdXBwb3J0ZWQgcHJlZmVycmVkIG91dHB1dCBsb2NhdGlvbjogJHtsb2NhdGlvbn0uIE9ubHkgJ2dwdS1idWZmZXInIGxvY2F0aW9uIGlzIHN1cHBvcnRlZCB3aGVuIGVuYWJsZUdyYXBoQ2FwdHVyZSBpcyB0cnVlLmAsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBvdXRwdXRQcmVmZXJyZWRMb2NhdGlvbnMucHVzaChsb2NhdGlvbik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gdXNlIElPIGJpbmRpbmcgb25seSB3aGVuIGF0IGxlYXN0IG9uZSBvdXRwdXQgaXMgcHJlZmVycmVkIHRvIGJlIG9uIEdQVS5cbiAgICBsZXQgYmluZGluZ1N0YXRlOiBJT0JpbmRpbmdTdGF0ZSB8IG51bGwgPSBudWxsO1xuICAgIGlmIChcbiAgICAgICghQlVJTERfREVGUy5ESVNBQkxFX0pTRVAgfHwgIUJVSUxEX0RFRlMuRElTQUJMRV9XRUJHUFUpICYmXG4gICAgICBvdXRwdXRQcmVmZXJyZWRMb2NhdGlvbnMuc29tZSgobCkgPT4gbCA9PT0gJ2dwdS1idWZmZXInIHx8IGwgPT09ICdtbC10ZW5zb3InIHx8IGwgPT09ICdtbC10ZW5zb3ItY3B1LW91dHB1dCcpXG4gICAgKSB7XG4gICAgICBpb0JpbmRpbmdIYW5kbGUgPSB3YXNtLl9PcnRDcmVhdGVCaW5kaW5nKHNlc3Npb25IYW5kbGUpO1xuICAgICAgaWYgKGlvQmluZGluZ0hhbmRsZSA9PT0gMCkge1xuICAgICAgICBjaGVja0xhc3RFcnJvcihcIkNhbid0IGNyZWF0ZSBJTyBiaW5kaW5nLlwiKTtcbiAgICAgIH1cblxuICAgICAgYmluZGluZ1N0YXRlID0ge1xuICAgICAgICBoYW5kbGU6IGlvQmluZGluZ0hhbmRsZSxcbiAgICAgICAgb3V0cHV0UHJlZmVycmVkTG9jYXRpb25zLFxuICAgICAgICBvdXRwdXRQcmVmZXJyZWRMb2NhdGlvbnNFbmNvZGVkOiBvdXRwdXRQcmVmZXJyZWRMb2NhdGlvbnNcbiAgICAgICAgICAvLyAnbWwtdGVuc29yLWNwdS1vdXRwdXQnIGlzIHRyZWF0ZWQgYXMgJ21sLXRlbnNvcicgZm9yIHRoZSBwdXJwb3NlIG9mIElPIGJpbmRpbmcuXG4gICAgICAgICAgLm1hcCgobCkgPT4gKGwgPT09ICdtbC10ZW5zb3ItY3B1LW91dHB1dCcgPyAnbWwtdGVuc29yJyA6IGwpKVxuICAgICAgICAgIC5tYXAoKGwpID0+IGRhdGFMb2NhdGlvblN0cmluZ1RvRW51bShsKSksXG4gICAgICB9O1xuICAgIH1cblxuICAgIGFjdGl2ZVNlc3Npb25zLnNldChzZXNzaW9uSGFuZGxlLCBbXG4gICAgICBzZXNzaW9uSGFuZGxlLFxuICAgICAgaW5wdXROYW1lc1VURjhFbmNvZGVkLFxuICAgICAgb3V0cHV0TmFtZXNVVEY4RW5jb2RlZCxcbiAgICAgIGJpbmRpbmdTdGF0ZSxcbiAgICAgIGVuYWJsZUdyYXBoQ2FwdHVyZSxcbiAgICAgIGZhbHNlLFxuICAgIF0pO1xuICAgIHJldHVybiBbc2Vzc2lvbkhhbmRsZSwgaW5wdXROYW1lcywgb3V0cHV0TmFtZXMsIGlucHV0TWV0YWRhdGEsIG91dHB1dE1ldGFkYXRhXTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGlucHV0TmFtZXNVVEY4RW5jb2RlZC5mb3JFYWNoKChidWYpID0+IHdhc20uX09ydEZyZWUoYnVmKSk7XG4gICAgb3V0cHV0TmFtZXNVVEY4RW5jb2RlZC5mb3JFYWNoKChidWYpID0+IHdhc20uX09ydEZyZWUoYnVmKSk7XG5cbiAgICBpZiAoaW9CaW5kaW5nSGFuZGxlICE9PSAwKSB7XG4gICAgICBpZiAod2FzbS5fT3J0UmVsZWFzZUJpbmRpbmcoaW9CaW5kaW5nSGFuZGxlKSAhPT0gMCkge1xuICAgICAgICBjaGVja0xhc3RFcnJvcihcIkNhbid0IHJlbGVhc2UgSU8gYmluZGluZy5cIik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHNlc3Npb25IYW5kbGUgIT09IDApIHtcbiAgICAgIGlmICh3YXNtLl9PcnRSZWxlYXNlU2Vzc2lvbihzZXNzaW9uSGFuZGxlKSAhPT0gMCkge1xuICAgICAgICBjaGVja0xhc3RFcnJvcihcIkNhbid0IHJlbGVhc2Ugc2Vzc2lvbi5cIik7XG4gICAgICB9XG4gICAgfVxuICAgIHRocm93IGU7XG4gIH0gZmluYWxseSB7XG4gICAgd2FzbS5fZnJlZShtb2RlbERhdGFPZmZzZXQpO1xuICAgIGlmIChzZXNzaW9uT3B0aW9uc0hhbmRsZSAhPT0gMCkge1xuICAgICAgaWYgKHdhc20uX09ydFJlbGVhc2VTZXNzaW9uT3B0aW9ucyhzZXNzaW9uT3B0aW9uc0hhbmRsZSkgIT09IDApIHtcbiAgICAgICAgY2hlY2tMYXN0RXJyb3IoXCJDYW4ndCByZWxlYXNlIHNlc3Npb24gb3B0aW9ucy5cIik7XG4gICAgICB9XG4gICAgfVxuICAgIGFsbG9jcy5mb3JFYWNoKChhbGxvYykgPT4gd2FzbS5fZnJlZShhbGxvYykpO1xuXG4gICAgLy8gdW5tb3VudCBleHRlcm5hbCBkYXRhIGlmIG5lY2Vzc2FyeVxuICAgIHdhc20udW5tb3VudEV4dGVybmFsRGF0YT8uKCk7XG4gIH1cbn07XG5cbmV4cG9ydCBjb25zdCByZWxlYXNlU2Vzc2lvbiA9IChzZXNzaW9uSWQ6IG51bWJlcik6IHZvaWQgPT4ge1xuICBjb25zdCB3YXNtID0gZ2V0SW5zdGFuY2UoKTtcbiAgY29uc3Qgc2Vzc2lvbiA9IGFjdGl2ZVNlc3Npb25zLmdldChzZXNzaW9uSWQpO1xuICBpZiAoIXNlc3Npb24pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGNhbm5vdCByZWxlYXNlIHNlc3Npb24uIGludmFsaWQgc2Vzc2lvbiBpZDogJHtzZXNzaW9uSWR9YCk7XG4gIH1cbiAgY29uc3QgW3Nlc3Npb25IYW5kbGUsIGlucHV0TmFtZXNVVEY4RW5jb2RlZCwgb3V0cHV0TmFtZXNVVEY4RW5jb2RlZCwgaW9CaW5kaW5nU3RhdGUsIGVuYWJsZUdyYXBoQ2FwdHVyZV0gPSBzZXNzaW9uO1xuXG4gIGlmIChpb0JpbmRpbmdTdGF0ZSkge1xuICAgIGlmIChlbmFibGVHcmFwaENhcHR1cmUpIHtcbiAgICAgIGlmICh3YXNtLl9PcnRDbGVhckJvdW5kT3V0cHV0cyhpb0JpbmRpbmdTdGF0ZS5oYW5kbGUpICE9PSAwKSB7XG4gICAgICAgIGNoZWNrTGFzdEVycm9yKFwiQ2FuJ3QgY2xlYXIgYm91bmQgb3V0cHV0cy5cIik7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh3YXNtLl9PcnRSZWxlYXNlQmluZGluZyhpb0JpbmRpbmdTdGF0ZS5oYW5kbGUpICE9PSAwKSB7XG4gICAgICBjaGVja0xhc3RFcnJvcihcIkNhbid0IHJlbGVhc2UgSU8gYmluZGluZy5cIik7XG4gICAgfVxuICB9XG5cbiAgd2FzbS5qc2VwT25SZWxlYXNlU2Vzc2lvbj8uKHNlc3Npb25JZCk7XG4gIHdhc20ud2Vibm5PblJlbGVhc2VTZXNzaW9uPy4oc2Vzc2lvbklkKTtcbiAgd2FzbS53ZWJncHVPblJlbGVhc2VTZXNzaW9uPy4oc2Vzc2lvbklkKTtcblxuICBpbnB1dE5hbWVzVVRGOEVuY29kZWQuZm9yRWFjaCgoYnVmKSA9PiB3YXNtLl9PcnRGcmVlKGJ1ZikpO1xuICBvdXRwdXROYW1lc1VURjhFbmNvZGVkLmZvckVhY2goKGJ1ZikgPT4gd2FzbS5fT3J0RnJlZShidWYpKTtcbiAgaWYgKHdhc20uX09ydFJlbGVhc2VTZXNzaW9uKHNlc3Npb25IYW5kbGUpICE9PSAwKSB7XG4gICAgY2hlY2tMYXN0RXJyb3IoXCJDYW4ndCByZWxlYXNlIHNlc3Npb24uXCIpO1xuICB9XG4gIGFjdGl2ZVNlc3Npb25zLmRlbGV0ZShzZXNzaW9uSWQpO1xufTtcblxuZXhwb3J0IGNvbnN0IHByZXBhcmVJbnB1dE91dHB1dFRlbnNvciA9IGFzeW5jIChcbiAgdGVuc29yOiBUZW5zb3JNZXRhZGF0YSB8IG51bGwsXG4gIHRlbnNvckhhbmRsZXM6IG51bWJlcltdLFxuICBhbGxvY3M6IG51bWJlcltdLFxuICBzZXNzaW9uSWQ6IG51bWJlcixcbiAgdGVuc29yTmFtZVVURjhFbmNvZGVkOiBudW1iZXIsXG4gIGluZGV4OiBudW1iZXIsXG4gIGVuYWJsZUdyYXBoQ2FwdHVyZSA9IGZhbHNlLFxuKTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gIGlmICghdGVuc29yKSB7XG4gICAgdGVuc29ySGFuZGxlcy5wdXNoKDApO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IHdhc20gPSBnZXRJbnN0YW5jZSgpO1xuICBjb25zdCBwdHJTaXplID0gd2FzbS5QVFJfU0laRTtcblxuICBjb25zdCBkYXRhVHlwZSA9IHRlbnNvclswXTtcbiAgY29uc3QgZGltcyA9IHRlbnNvclsxXTtcbiAgY29uc3QgbG9jYXRpb24gPSB0ZW5zb3JbM107XG4gIGxldCBhY3R1YWxMb2NhdGlvbiA9IGxvY2F0aW9uO1xuXG4gIGxldCByYXdEYXRhOiBudW1iZXI7XG4gIGxldCBkYXRhQnl0ZUxlbmd0aDogbnVtYmVyO1xuXG4gIGlmIChkYXRhVHlwZSA9PT0gJ3N0cmluZycgJiYgKGxvY2F0aW9uID09PSAnZ3B1LWJ1ZmZlcicgfHwgbG9jYXRpb24gPT09ICdtbC10ZW5zb3InKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignU3RyaW5nIHRlbnNvciBpcyBub3Qgc3VwcG9ydGVkIG9uIEdQVS4nKTtcbiAgfVxuXG4gIGlmIChlbmFibGVHcmFwaENhcHR1cmUgJiYgbG9jYXRpb24gIT09ICdncHUtYnVmZmVyJykge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBFeHRlcm5hbCBidWZmZXIgbXVzdCBiZSBwcm92aWRlZCBmb3IgaW5wdXQvb3V0cHV0IGluZGV4ICR7aW5kZXh9IHdoZW4gZW5hYmxlR3JhcGhDYXB0dXJlIGlzIHRydWUuYCxcbiAgICApO1xuICB9XG5cbiAgaWYgKGxvY2F0aW9uID09PSAnZ3B1LWJ1ZmZlcicpIHtcbiAgICBjb25zdCBncHVCdWZmZXIgPSB0ZW5zb3JbMl0uZ3B1QnVmZmVyO1xuICAgIGRhdGFCeXRlTGVuZ3RoID0gY2FsY3VsYXRlVGVuc29yU2l6ZUluQnl0ZXModGVuc29yRGF0YVR5cGVTdHJpbmdUb0VudW0oZGF0YVR5cGUpLCBkaW1zKSE7XG5cbiAgICBpZiAoIUJVSUxEX0RFRlMuRElTQUJMRV9XRUJHUFUpIHtcbiAgICAgIGNvbnN0IHJlZ2lzdGVyQnVmZmVyID0gd2FzbS53ZWJncHVSZWdpc3RlckJ1ZmZlcjtcbiAgICAgIGlmICghcmVnaXN0ZXJCdWZmZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUZW5zb3IgbG9jYXRpb24gXCJncHUtYnVmZmVyXCIgaXMgbm90IHN1cHBvcnRlZCB3aXRob3V0IHVzaW5nIFdlYkdQVS4nKTtcbiAgICAgIH1cblxuICAgICAgcmF3RGF0YSA9IHJlZ2lzdGVyQnVmZmVyKGdwdUJ1ZmZlciwgc2Vzc2lvbklkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgcmVnaXN0ZXJCdWZmZXIgPSB3YXNtLmpzZXBSZWdpc3RlckJ1ZmZlcjtcbiAgICAgIGlmICghcmVnaXN0ZXJCdWZmZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUZW5zb3IgbG9jYXRpb24gXCJncHUtYnVmZmVyXCIgaXMgbm90IHN1cHBvcnRlZCB3aXRob3V0IHVzaW5nIFdlYkdQVS4nKTtcbiAgICAgIH1cbiAgICAgIHJhd0RhdGEgPSByZWdpc3RlckJ1ZmZlcihzZXNzaW9uSWQsIGluZGV4LCBncHVCdWZmZXIsIGRhdGFCeXRlTGVuZ3RoKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAobG9jYXRpb24gPT09ICdtbC10ZW5zb3InKSB7XG4gICAgY29uc3QgbWxUZW5zb3IgPSB0ZW5zb3JbMl0ubWxUZW5zb3IgYXMgTUxUZW5zb3I7XG4gICAgZGF0YUJ5dGVMZW5ndGggPSBjYWxjdWxhdGVUZW5zb3JTaXplSW5CeXRlcyh0ZW5zb3JEYXRhVHlwZVN0cmluZ1RvRW51bShkYXRhVHlwZSksIGRpbXMpITtcblxuICAgIGNvbnN0IHJlZ2lzdGVyTUxUZW5zb3IgPSB3YXNtLndlYm5uUmVnaXN0ZXJNTFRlbnNvcjtcbiAgICBpZiAoIXJlZ2lzdGVyTUxUZW5zb3IpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVGVuc29yIGxvY2F0aW9uIFwibWwtdGVuc29yXCIgaXMgbm90IHN1cHBvcnRlZCB3aXRob3V0IHVzaW5nIFdlYk5OLicpO1xuICAgIH1cbiAgICByYXdEYXRhID0gcmVnaXN0ZXJNTFRlbnNvcihzZXNzaW9uSWQsIG1sVGVuc29yLCB0ZW5zb3JEYXRhVHlwZVN0cmluZ1RvRW51bShkYXRhVHlwZSksIGRpbXMpO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGRhdGEgPSB0ZW5zb3JbMl07XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgLy8gc3RyaW5nIHRlbnNvclxuICAgICAgZGF0YUJ5dGVMZW5ndGggPSBwdHJTaXplICogZGF0YS5sZW5ndGg7XG4gICAgICByYXdEYXRhID0gd2FzbS5fbWFsbG9jKGRhdGFCeXRlTGVuZ3RoKTtcbiAgICAgIGFsbG9jcy5wdXNoKHJhd0RhdGEpO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICh0eXBlb2YgZGF0YVtpXSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGB0ZW5zb3IgZGF0YSBhdCBpbmRleCAke2l9IGlzIG5vdCBhIHN0cmluZ2ApO1xuICAgICAgICB9XG4gICAgICAgIHdhc20uc2V0VmFsdWUocmF3RGF0YSArIGkgKiBwdHJTaXplLCBhbGxvY1dhc21TdHJpbmcoZGF0YVtpXSwgYWxsb2NzKSwgJyonKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgaXNHcmFwaElucHV0ID0gd2FzbS53ZWJubklzR3JhcGhJbnB1dDtcbiAgICAgIGNvbnN0IGlzR3JhcGhPdXRwdXQgPSB3YXNtLndlYm5uSXNHcmFwaE91dHB1dDtcbiAgICAgIGlmIChkYXRhVHlwZSAhPT0gJ3N0cmluZycgJiYgaXNHcmFwaElucHV0ICYmIGlzR3JhcGhPdXRwdXQpIHtcbiAgICAgICAgY29uc3QgdGVuc29yTmFtZSA9IHdhc20uVVRGOFRvU3RyaW5nKHRlbnNvck5hbWVVVEY4RW5jb2RlZCk7XG4gICAgICAgIC8vIFByb21vdGUgdGhlIHRlbnNvciB0byAnbWwtdGVuc29yJyBpZiBpdCBpcyBhIGdyYXBoIGlucHV0LlxuICAgICAgICBpZiAoaXNHcmFwaElucHV0KHNlc3Npb25JZCwgdGVuc29yTmFtZSkgfHwgaXNHcmFwaE91dHB1dChzZXNzaW9uSWQsIHRlbnNvck5hbWUpKSB7XG4gICAgICAgICAgY29uc3QgZGF0YVR5cGVFbnVtID0gdGVuc29yRGF0YVR5cGVTdHJpbmdUb0VudW0oZGF0YVR5cGUpO1xuICAgICAgICAgIGRhdGFCeXRlTGVuZ3RoID0gY2FsY3VsYXRlVGVuc29yU2l6ZUluQnl0ZXMoZGF0YVR5cGVFbnVtLCBkaW1zKSE7XG4gICAgICAgICAgYWN0dWFsTG9jYXRpb24gPSAnbWwtdGVuc29yJztcbiAgICAgICAgICBjb25zdCBjcmVhdGVUZW1wb3JhcnlUZW5zb3IgPSB3YXNtLndlYm5uQ3JlYXRlVGVtcG9yYXJ5VGVuc29yO1xuICAgICAgICAgIGNvbnN0IHVwbG9hZFRlbnNvciA9IHdhc20ud2Vibm5VcGxvYWRUZW5zb3I7XG4gICAgICAgICAgaWYgKCFjcmVhdGVUZW1wb3JhcnlUZW5zb3IgfHwgIXVwbG9hZFRlbnNvcikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUZW5zb3IgbG9jYXRpb24gXCJtbC10ZW5zb3JcIiBpcyBub3Qgc3VwcG9ydGVkIHdpdGhvdXQgdXNpbmcgV2ViTk4uJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IHRlbnNvcklkID0gYXdhaXQgY3JlYXRlVGVtcG9yYXJ5VGVuc29yKHNlc3Npb25JZCwgZGF0YVR5cGVFbnVtLCBkaW1zIGFzIG51bWJlcltdKTtcbiAgICAgICAgICB1cGxvYWRUZW5zb3IodGVuc29ySWQsIG5ldyBVaW50OEFycmF5KGRhdGEuYnVmZmVyLCBkYXRhLmJ5dGVPZmZzZXQsIGRhdGEuYnl0ZUxlbmd0aCkpO1xuICAgICAgICAgIHJhd0RhdGEgPSB0ZW5zb3JJZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkYXRhQnl0ZUxlbmd0aCA9IGRhdGEuYnl0ZUxlbmd0aDtcbiAgICAgICAgICByYXdEYXRhID0gd2FzbS5fbWFsbG9jKGRhdGFCeXRlTGVuZ3RoKTtcbiAgICAgICAgICBhbGxvY3MucHVzaChyYXdEYXRhKTtcbiAgICAgICAgICB3YXNtLkhFQVBVOC5zZXQobmV3IFVpbnQ4QXJyYXkoZGF0YS5idWZmZXIsIGRhdGEuYnl0ZU9mZnNldCwgZGF0YUJ5dGVMZW5ndGgpLCByYXdEYXRhKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGF0YUJ5dGVMZW5ndGggPSBkYXRhLmJ5dGVMZW5ndGg7XG4gICAgICAgIHJhd0RhdGEgPSB3YXNtLl9tYWxsb2MoZGF0YUJ5dGVMZW5ndGgpO1xuICAgICAgICBhbGxvY3MucHVzaChyYXdEYXRhKTtcbiAgICAgICAgd2FzbS5IRUFQVTguc2V0KG5ldyBVaW50OEFycmF5KGRhdGEuYnVmZmVyLCBkYXRhLmJ5dGVPZmZzZXQsIGRhdGFCeXRlTGVuZ3RoKSwgcmF3RGF0YSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY29uc3Qgc3RhY2sgPSB3YXNtLnN0YWNrU2F2ZSgpO1xuICBjb25zdCBkaW1zT2Zmc2V0ID0gd2FzbS5zdGFja0FsbG9jKDQgKiBkaW1zLmxlbmd0aCk7XG4gIHRyeSB7XG4gICAgZGltcy5mb3JFYWNoKChkLCBpbmRleCkgPT4gd2FzbS5zZXRWYWx1ZShkaW1zT2Zmc2V0ICsgaW5kZXggKiBwdHJTaXplLCBkLCBwdHJTaXplID09PSA0ID8gJ2kzMicgOiAnaTY0JykpO1xuICAgIGNvbnN0IHRlbnNvciA9IHdhc20uX09ydENyZWF0ZVRlbnNvcihcbiAgICAgIHRlbnNvckRhdGFUeXBlU3RyaW5nVG9FbnVtKGRhdGFUeXBlKSxcbiAgICAgIHJhd0RhdGEsXG4gICAgICBkYXRhQnl0ZUxlbmd0aCxcbiAgICAgIGRpbXNPZmZzZXQsXG4gICAgICBkaW1zLmxlbmd0aCxcbiAgICAgIGRhdGFMb2NhdGlvblN0cmluZ1RvRW51bShhY3R1YWxMb2NhdGlvbiksXG4gICAgKTtcbiAgICBpZiAodGVuc29yID09PSAwKSB7XG4gICAgICBjaGVja0xhc3RFcnJvcihgQ2FuJ3QgY3JlYXRlIHRlbnNvciBmb3IgaW5wdXQvb3V0cHV0LiBzZXNzaW9uPSR7c2Vzc2lvbklkfSwgaW5kZXg9JHtpbmRleH0uYCk7XG4gICAgfVxuICAgIHRlbnNvckhhbmRsZXMucHVzaCh0ZW5zb3IpO1xuICB9IGZpbmFsbHkge1xuICAgIHdhc20uc3RhY2tSZXN0b3JlKHN0YWNrKTtcbiAgfVxufTtcblxuLyoqXG4gKiBwZXJmb3JtIGluZmVyZW5jZSBydW5cbiAqL1xuZXhwb3J0IGNvbnN0IHJ1biA9IGFzeW5jIChcbiAgc2Vzc2lvbklkOiBudW1iZXIsXG4gIGlucHV0SW5kaWNlczogbnVtYmVyW10sXG4gIGlucHV0VGVuc29yczogVGVuc29yTWV0YWRhdGFbXSxcbiAgb3V0cHV0SW5kaWNlczogbnVtYmVyW10sXG4gIG91dHB1dFRlbnNvcnM6IEFycmF5PFRlbnNvck1ldGFkYXRhIHwgbnVsbD4sXG4gIG9wdGlvbnM6IEluZmVyZW5jZVNlc3Npb24uUnVuT3B0aW9ucyxcbik6IFByb21pc2U8VGVuc29yTWV0YWRhdGFbXT4gPT4ge1xuICBjb25zdCB3YXNtID0gZ2V0SW5zdGFuY2UoKTtcbiAgY29uc3QgcHRyU2l6ZSA9IHdhc20uUFRSX1NJWkU7XG4gIGNvbnN0IHNlc3Npb24gPSBhY3RpdmVTZXNzaW9ucy5nZXQoc2Vzc2lvbklkKTtcbiAgaWYgKCFzZXNzaW9uKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBjYW5ub3QgcnVuIGluZmVyZW5jZS4gaW52YWxpZCBzZXNzaW9uIGlkOiAke3Nlc3Npb25JZH1gKTtcbiAgfVxuICBjb25zdCBzZXNzaW9uSGFuZGxlID0gc2Vzc2lvblswXTtcbiAgY29uc3QgaW5wdXROYW1lc1VURjhFbmNvZGVkID0gc2Vzc2lvblsxXTtcbiAgY29uc3Qgb3V0cHV0TmFtZXNVVEY4RW5jb2RlZCA9IHNlc3Npb25bMl07XG4gIGNvbnN0IGlvQmluZGluZ1N0YXRlID0gc2Vzc2lvblszXTtcbiAgY29uc3QgZW5hYmxlR3JhcGhDYXB0dXJlID0gc2Vzc2lvbls0XTtcbiAgY29uc3QgaW5wdXRPdXRwdXRCb3VuZCA9IHNlc3Npb25bNV07XG5cbiAgY29uc3QgaW5wdXRDb3VudCA9IGlucHV0SW5kaWNlcy5sZW5ndGg7XG4gIGNvbnN0IG91dHB1dENvdW50ID0gb3V0cHV0SW5kaWNlcy5sZW5ndGg7XG5cbiAgbGV0IHJ1bk9wdGlvbnNIYW5kbGUgPSAwO1xuICBsZXQgcnVuT3B0aW9uc0FsbG9jczogbnVtYmVyW10gPSBbXTtcblxuICBjb25zdCBpbnB1dFRlbnNvckhhbmRsZXM6IG51bWJlcltdID0gW107XG4gIGNvbnN0IG91dHB1dFRlbnNvckhhbmRsZXM6IG51bWJlcltdID0gW107XG4gIGNvbnN0IGlucHV0T3V0cHV0QWxsb2NzOiBudW1iZXJbXSA9IFtdO1xuICBjb25zdCBwcmVBbGxvY2F0ZWRPdXRwdXRzOiBudW1iZXJbXSA9IFtdO1xuXG4gIGNvbnN0IGJlZm9yZVJ1blN0YWNrID0gd2FzbS5zdGFja1NhdmUoKTtcbiAgY29uc3QgaW5wdXRWYWx1ZXNPZmZzZXQgPSB3YXNtLnN0YWNrQWxsb2MoaW5wdXRDb3VudCAqIHB0clNpemUpO1xuICBjb25zdCBpbnB1dE5hbWVzT2Zmc2V0ID0gd2FzbS5zdGFja0FsbG9jKGlucHV0Q291bnQgKiBwdHJTaXplKTtcbiAgY29uc3Qgb3V0cHV0VmFsdWVzT2Zmc2V0ID0gd2FzbS5zdGFja0FsbG9jKG91dHB1dENvdW50ICogcHRyU2l6ZSk7XG4gIGNvbnN0IG91dHB1dE5hbWVzT2Zmc2V0ID0gd2FzbS5zdGFja0FsbG9jKG91dHB1dENvdW50ICogcHRyU2l6ZSk7XG5cbiAgdHJ5IHtcbiAgICBbcnVuT3B0aW9uc0hhbmRsZSwgcnVuT3B0aW9uc0FsbG9jc10gPSBzZXRSdW5PcHRpb25zKG9wdGlvbnMpO1xuXG4gICAgVFJBQ0VfRVZFTlRfQkVHSU4oJ3dhc20gcHJlcGFyZUlucHV0T3V0cHV0VGVuc29yJyk7XG4gICAgLy8gY3JlYXRlIGlucHV0IHRlbnNvcnNcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGlucHV0Q291bnQ7IGkrKykge1xuICAgICAgYXdhaXQgcHJlcGFyZUlucHV0T3V0cHV0VGVuc29yKFxuICAgICAgICBpbnB1dFRlbnNvcnNbaV0sXG4gICAgICAgIGlucHV0VGVuc29ySGFuZGxlcyxcbiAgICAgICAgaW5wdXRPdXRwdXRBbGxvY3MsXG4gICAgICAgIHNlc3Npb25JZCxcbiAgICAgICAgaW5wdXROYW1lc1VURjhFbmNvZGVkW2lucHV0SW5kaWNlc1tpXV0sXG4gICAgICAgIGlucHV0SW5kaWNlc1tpXSxcbiAgICAgICAgZW5hYmxlR3JhcGhDYXB0dXJlLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICAvLyBjcmVhdGUgb3V0cHV0IHRlbnNvcnNcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG91dHB1dENvdW50OyBpKyspIHtcbiAgICAgIGF3YWl0IHByZXBhcmVJbnB1dE91dHB1dFRlbnNvcihcbiAgICAgICAgb3V0cHV0VGVuc29yc1tpXSxcbiAgICAgICAgb3V0cHV0VGVuc29ySGFuZGxlcyxcbiAgICAgICAgaW5wdXRPdXRwdXRBbGxvY3MsXG4gICAgICAgIHNlc3Npb25JZCxcbiAgICAgICAgb3V0cHV0TmFtZXNVVEY4RW5jb2RlZFtvdXRwdXRJbmRpY2VzW2ldXSxcbiAgICAgICAgaW5wdXRDb3VudCArIG91dHB1dEluZGljZXNbaV0sXG4gICAgICAgIGVuYWJsZUdyYXBoQ2FwdHVyZSxcbiAgICAgICk7XG4gICAgfVxuICAgIFRSQUNFX0VWRU5UX0VORCgnd2FzbSBwcmVwYXJlSW5wdXRPdXRwdXRUZW5zb3InKTtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXRDb3VudDsgaSsrKSB7XG4gICAgICB3YXNtLnNldFZhbHVlKGlucHV0VmFsdWVzT2Zmc2V0ICsgaSAqIHB0clNpemUsIGlucHV0VGVuc29ySGFuZGxlc1tpXSwgJyonKTtcbiAgICAgIHdhc20uc2V0VmFsdWUoaW5wdXROYW1lc09mZnNldCArIGkgKiBwdHJTaXplLCBpbnB1dE5hbWVzVVRGOEVuY29kZWRbaW5wdXRJbmRpY2VzW2ldXSwgJyonKTtcbiAgICB9XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvdXRwdXRDb3VudDsgaSsrKSB7XG4gICAgICB3YXNtLnNldFZhbHVlKG91dHB1dFZhbHVlc09mZnNldCArIGkgKiBwdHJTaXplLCBvdXRwdXRUZW5zb3JIYW5kbGVzW2ldLCAnKicpO1xuICAgICAgd2FzbS5zZXRWYWx1ZShvdXRwdXROYW1lc09mZnNldCArIGkgKiBwdHJTaXplLCBvdXRwdXROYW1lc1VURjhFbmNvZGVkW291dHB1dEluZGljZXNbaV1dLCAnKicpO1xuICAgIH1cblxuICAgIGlmICgoIUJVSUxEX0RFRlMuRElTQUJMRV9KU0VQIHx8ICFCVUlMRF9ERUZTLkRJU0FCTEVfV0VCR1BVKSAmJiBpb0JpbmRpbmdTdGF0ZSAmJiAhaW5wdXRPdXRwdXRCb3VuZCkge1xuICAgICAgY29uc3QgeyBoYW5kbGUsIG91dHB1dFByZWZlcnJlZExvY2F0aW9ucywgb3V0cHV0UHJlZmVycmVkTG9jYXRpb25zRW5jb2RlZCB9ID0gaW9CaW5kaW5nU3RhdGU7XG5cbiAgICAgIGlmIChpbnB1dE5hbWVzVVRGOEVuY29kZWQubGVuZ3RoICE9PSBpbnB1dENvdW50KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgaW5wdXQgY291bnQgZnJvbSBmZWVkcyAoJHtpbnB1dENvdW50fSkgaXMgZXhwZWN0ZWQgdG8gYmUgYWx3YXlzIGVxdWFsIHRvIG1vZGVsJ3MgaW5wdXQgY291bnQgKCR7aW5wdXROYW1lc1VURjhFbmNvZGVkLmxlbmd0aH0pLmAsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIFRSQUNFX0VWRU5UX0JFR0lOKCd3YXNtIGJpbmRJbnB1dHNPdXRwdXRzJyk7XG4gICAgICAvLyBwcm9jZXNzIGlucHV0c1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbnB1dENvdW50OyBpKyspIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSBpbnB1dEluZGljZXNbaV07XG4gICAgICAgIGNvbnN0IGVycm9yQ29kZSA9IGF3YWl0IHdhc20uX09ydEJpbmRJbnB1dChoYW5kbGUsIGlucHV0TmFtZXNVVEY4RW5jb2RlZFtpbmRleF0sIGlucHV0VGVuc29ySGFuZGxlc1tpXSk7XG4gICAgICAgIGlmIChlcnJvckNvZGUgIT09IDApIHtcbiAgICAgICAgICBjaGVja0xhc3RFcnJvcihgQ2FuJ3QgYmluZCBpbnB1dFske2l9XSBmb3Igc2Vzc2lvbj0ke3Nlc3Npb25JZH0uYCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gcHJvY2VzcyBwcmUtYWxsb2NhdGVkIG91dHB1dHNcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb3V0cHV0Q291bnQ7IGkrKykge1xuICAgICAgICBjb25zdCBpbmRleCA9IG91dHB1dEluZGljZXNbaV07XG4gICAgICAgIGNvbnN0IGxvY2F0aW9uID0gb3V0cHV0VGVuc29yc1tpXT8uWzNdOyAvLyB1bmRlZmluZWQgbWVhbnMgb3V0cHV0IGlzIG5vdCBwcmUtYWxsb2NhdGVkLlxuXG4gICAgICAgIGlmIChsb2NhdGlvbikge1xuICAgICAgICAgIC8vIG91dHB1dCBpcyBwcmUtYWxsb2NhdGVkLCBzdG9yZSBhbmQgYmluZCB0aGUgdGVuc29yLlxuICAgICAgICAgIHByZUFsbG9jYXRlZE91dHB1dHMucHVzaChvdXRwdXRUZW5zb3JIYW5kbGVzW2ldKTtcbiAgICAgICAgICBjb25zdCBlcnJvckNvZGUgPSB3YXNtLl9PcnRCaW5kT3V0cHV0KGhhbmRsZSwgb3V0cHV0TmFtZXNVVEY4RW5jb2RlZFtpbmRleF0sIG91dHB1dFRlbnNvckhhbmRsZXNbaV0sIDApO1xuICAgICAgICAgIGlmIChlcnJvckNvZGUgIT09IDApIHtcbiAgICAgICAgICAgIGNoZWNrTGFzdEVycm9yKGBDYW4ndCBiaW5kIHByZS1hbGxvY2F0ZWQgb3V0cHV0WyR7aX1dIGZvciBzZXNzaW9uPSR7c2Vzc2lvbklkfS5gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gb3V0cHV0IGlzIG5vdCBwcmUtYWxsb2NhdGVkLiByZXNldCBwcmVmZXJyZWQgbG9jYXRpb24uXG4gICAgICAgICAgY29uc3QgZXJyb3JDb2RlID0gd2FzbS5fT3J0QmluZE91dHB1dChcbiAgICAgICAgICAgIGhhbmRsZSxcbiAgICAgICAgICAgIG91dHB1dE5hbWVzVVRGOEVuY29kZWRbaW5kZXhdLFxuICAgICAgICAgICAgMCxcbiAgICAgICAgICAgIG91dHB1dFByZWZlcnJlZExvY2F0aW9uc0VuY29kZWRbaW5kZXhdLFxuICAgICAgICAgICk7XG4gICAgICAgICAgaWYgKGVycm9yQ29kZSAhPT0gMCkge1xuICAgICAgICAgICAgY2hlY2tMYXN0RXJyb3IoYENhbid0IGJpbmQgb3V0cHV0WyR7aX1dIHRvICR7b3V0cHV0UHJlZmVycmVkTG9jYXRpb25zW2ldfSBmb3Igc2Vzc2lvbj0ke3Nlc3Npb25JZH0uYCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBUUkFDRV9FVkVOVF9FTkQoJ3dhc20gYmluZElucHV0c091dHB1dHMnKTtcbiAgICAgIGFjdGl2ZVNlc3Npb25zLnNldChzZXNzaW9uSWQsIFtcbiAgICAgICAgc2Vzc2lvbkhhbmRsZSxcbiAgICAgICAgaW5wdXROYW1lc1VURjhFbmNvZGVkLFxuICAgICAgICBvdXRwdXROYW1lc1VURjhFbmNvZGVkLFxuICAgICAgICBpb0JpbmRpbmdTdGF0ZSxcbiAgICAgICAgZW5hYmxlR3JhcGhDYXB0dXJlLFxuICAgICAgICB0cnVlLFxuICAgICAgXSk7XG4gICAgfVxuXG4gICAgd2FzbS5qc2VwT25SdW5TdGFydD8uKHNlc3Npb25IYW5kbGUpO1xuICAgIHdhc20ud2Vibm5PblJ1blN0YXJ0Py4oc2Vzc2lvbkhhbmRsZSk7XG5cbiAgICBsZXQgZXJyb3JDb2RlOiBudW1iZXI7XG4gICAgaWYgKCghQlVJTERfREVGUy5ESVNBQkxFX0pTRVAgfHwgIUJVSUxEX0RFRlMuRElTQUJMRV9XRUJHUFUpICYmIGlvQmluZGluZ1N0YXRlKSB7XG4gICAgICBlcnJvckNvZGUgPSBhd2FpdCB3YXNtLl9PcnRSdW5XaXRoQmluZGluZyhcbiAgICAgICAgc2Vzc2lvbkhhbmRsZSxcbiAgICAgICAgaW9CaW5kaW5nU3RhdGUuaGFuZGxlLFxuICAgICAgICBvdXRwdXRDb3VudCxcbiAgICAgICAgb3V0cHV0VmFsdWVzT2Zmc2V0LFxuICAgICAgICBydW5PcHRpb25zSGFuZGxlLFxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZXJyb3JDb2RlID0gYXdhaXQgd2FzbS5fT3J0UnVuKFxuICAgICAgICBzZXNzaW9uSGFuZGxlLFxuICAgICAgICBpbnB1dE5hbWVzT2Zmc2V0LFxuICAgICAgICBpbnB1dFZhbHVlc09mZnNldCxcbiAgICAgICAgaW5wdXRDb3VudCxcbiAgICAgICAgb3V0cHV0TmFtZXNPZmZzZXQsXG4gICAgICAgIG91dHB1dENvdW50LFxuICAgICAgICBvdXRwdXRWYWx1ZXNPZmZzZXQsXG4gICAgICAgIHJ1bk9wdGlvbnNIYW5kbGUsXG4gICAgICApO1xuICAgIH1cblxuICAgIGlmIChlcnJvckNvZGUgIT09IDApIHtcbiAgICAgIGNoZWNrTGFzdEVycm9yKCdmYWlsZWQgdG8gY2FsbCBPcnRSdW4oKS4nKTtcbiAgICB9XG5cbiAgICBjb25zdCBvdXRwdXQ6IFRlbnNvck1ldGFkYXRhW10gPSBbXTtcbiAgICBjb25zdCBvdXRwdXRQcm9taXNlczogQXJyYXk8UHJvbWlzZTxbbnVtYmVyLCBUZW5zb3IuRGF0YVR5cGVdPj4gPSBbXTtcblxuICAgIFRSQUNFX0VWRU5UX0JFR0lOKCd3YXNtIFByb2Nlc3NPdXRwdXRUZW5zb3InKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG91dHB1dENvdW50OyBpKyspIHtcbiAgICAgIGNvbnN0IHRlbnNvciA9IE51bWJlcih3YXNtLmdldFZhbHVlKG91dHB1dFZhbHVlc09mZnNldCArIGkgKiBwdHJTaXplLCAnKicpKTtcbiAgICAgIC8vIFRPRE86IHJldmlzaXQgdGhpcyBwYXJ0IHRvIGVuc3VyZSBpdCB3b3JrcyBmb3IgV2ViR1BVIHdoZW4gYm90aCBwcmUtYWxsb2NhdGVkIG91dHB1dHMgYW5kXG4gICAgICAvLyBwcmVmZXJyZWQgbG9jYXRpb24gYXJlIHNwZWNpZmllZC5cbiAgICAgIC8vIENlcnRhaW4gcHJlLWFsbG9jYXRlZCB0ZW5zb3JzIG1heSBhbHJlYWR5IGJlIGJvdW5kIGluIHRoZSBJTyBiaW5kaW5nLiBlLmcuIHRoZSBXZWJOTiBiYWNrZW5kXG4gICAgICAvLyBhbHdheXMgYmluZHMgaXRzIHRlbnNvciB0byAnbWwtdGVuc29yJy4gSW4gc3VjaCBjYXNlcywgdGhlIHRlbnNvciBJRCBtaWdodCBjaGFuZ2UgYWZ0ZXIgYmluZGluZyxcbiAgICAgIC8vIGJ1dCBjb3B5aW5nIGRhdGEgZm9yIHRoZXNlIHRlbnNvcnMgc2hvdWxkIHN0aWxsIGJlIGF2b2lkZWQuXG4gICAgICBpZiAodGVuc29yID09PSBvdXRwdXRUZW5zb3JIYW5kbGVzW2ldIHx8IHByZUFsbG9jYXRlZE91dHB1dHMuaW5jbHVkZXMob3V0cHV0VGVuc29ySGFuZGxlc1tpXSkpIHtcbiAgICAgICAgLy8gb3V0cHV0IHRlbnNvciBpcyBwcmUtYWxsb2NhdGVkLiBubyBuZWVkIHRvIGNvcHkgZGF0YS5cbiAgICAgICAgb3V0cHV0LnB1c2gob3V0cHV0VGVuc29yc1tpXSEpO1xuICAgICAgICBpZiAodGVuc29yICE9PSBvdXRwdXRUZW5zb3JIYW5kbGVzW2ldKSB7XG4gICAgICAgICAgLy8gcmVsZWFzZSByZWR1bmRhbnQgdGVuc29yIGVhcmxpZXIuXG4gICAgICAgICAgaWYgKHdhc20uX09ydFJlbGVhc2VUZW5zb3IodGVuc29yKSAhPT0gMCkge1xuICAgICAgICAgICAgY2hlY2tMYXN0RXJyb3IoXCJDYW4ndCByZWxlYXNlIHRlbnNvci5cIik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBiZWZvcmVHZXRUZW5zb3JEYXRhU3RhY2sgPSB3YXNtLnN0YWNrU2F2ZSgpO1xuICAgICAgLy8gc3RhY2sgYWxsb2NhdGUgNCBwb2ludGVyIHZhbHVlXG4gICAgICBjb25zdCB0ZW5zb3JEYXRhT2Zmc2V0ID0gd2FzbS5zdGFja0FsbG9jKDQgKiBwdHJTaXplKTtcblxuICAgICAgbGV0IGtlZXBPdXRwdXRUZW5zb3IgPSBmYWxzZTtcbiAgICAgIGxldCB0eXBlOiBUZW5zb3IuVHlwZSB8IHVuZGVmaW5lZCxcbiAgICAgICAgZGF0YU9mZnNldCA9IDA7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBlcnJvckNvZGUgPSB3YXNtLl9PcnRHZXRUZW5zb3JEYXRhKFxuICAgICAgICAgIHRlbnNvcixcbiAgICAgICAgICB0ZW5zb3JEYXRhT2Zmc2V0LFxuICAgICAgICAgIHRlbnNvckRhdGFPZmZzZXQgKyBwdHJTaXplLFxuICAgICAgICAgIHRlbnNvckRhdGFPZmZzZXQgKyAyICogcHRyU2l6ZSxcblxuICAgICAgICAgIHRlbnNvckRhdGFPZmZzZXQgKyAzICogcHRyU2l6ZSxcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKGVycm9yQ29kZSAhPT0gMCkge1xuICAgICAgICAgIGNoZWNrTGFzdEVycm9yKGBDYW4ndCBhY2Nlc3Mgb3V0cHV0IHRlbnNvciBkYXRhIG9uIGluZGV4ICR7aX0uYCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdmFsdWVUeXBlID0gcHRyU2l6ZSA9PT0gNCA/ICdpMzInIDogJ2k2NCc7XG4gICAgICAgIGNvbnN0IGRhdGFUeXBlID0gTnVtYmVyKHdhc20uZ2V0VmFsdWUodGVuc29yRGF0YU9mZnNldCwgdmFsdWVUeXBlKSk7XG4gICAgICAgIGRhdGFPZmZzZXQgPSB3YXNtLmdldFZhbHVlKHRlbnNvckRhdGFPZmZzZXQgKyBwdHJTaXplLCAnKicpO1xuICAgICAgICBjb25zdCBkaW1zT2Zmc2V0ID0gd2FzbS5nZXRWYWx1ZSh0ZW5zb3JEYXRhT2Zmc2V0ICsgcHRyU2l6ZSAqIDIsICcqJyk7XG4gICAgICAgIGNvbnN0IGRpbXNMZW5ndGggPSBOdW1iZXIod2FzbS5nZXRWYWx1ZSh0ZW5zb3JEYXRhT2Zmc2V0ICsgcHRyU2l6ZSAqIDMsIHZhbHVlVHlwZSkpO1xuICAgICAgICBjb25zdCBkaW1zID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZGltc0xlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgZGltcy5wdXNoKE51bWJlcih3YXNtLmdldFZhbHVlKGRpbXNPZmZzZXQgKyBpICogcHRyU2l6ZSwgdmFsdWVUeXBlKSkpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh3YXNtLl9PcnRGcmVlKGRpbXNPZmZzZXQpICE9PSAwKSB7XG4gICAgICAgICAgY2hlY2tMYXN0RXJyb3IoXCJDYW4ndCBmcmVlIG1lbW9yeSBmb3IgdGVuc29yIGRpbXMuXCIpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHNpemUgPSBkaW1zLnJlZHVjZSgoYSwgYikgPT4gYSAqIGIsIDEpO1xuICAgICAgICB0eXBlID0gdGVuc29yRGF0YVR5cGVFbnVtVG9TdHJpbmcoZGF0YVR5cGUpO1xuXG4gICAgICAgIGNvbnN0IHByZWZlcnJlZExvY2F0aW9uID0gaW9CaW5kaW5nU3RhdGU/Lm91dHB1dFByZWZlcnJlZExvY2F0aW9uc1tvdXRwdXRJbmRpY2VzW2ldXTtcblxuICAgICAgICBpZiAodHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBpZiAocHJlZmVycmVkTG9jYXRpb24gPT09ICdncHUtYnVmZmVyJyB8fCBwcmVmZXJyZWRMb2NhdGlvbiA9PT0gJ21sLXRlbnNvcicpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignU3RyaW5nIHRlbnNvciBpcyBub3Qgc3VwcG9ydGVkIG9uIEdQVS4nKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3Qgc3RyaW5nRGF0YTogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNpemU7IGkrKykge1xuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0gd2FzbS5nZXRWYWx1ZShkYXRhT2Zmc2V0ICsgaSAqIHB0clNpemUsICcqJyk7XG4gICAgICAgICAgICBjb25zdCBuZXh0T2Zmc2V0ID0gd2FzbS5nZXRWYWx1ZShkYXRhT2Zmc2V0ICsgKGkgKyAxKSAqIHB0clNpemUsICcqJyk7XG4gICAgICAgICAgICBjb25zdCBtYXhCeXRlc1RvUmVhZCA9IGkgPT09IHNpemUgLSAxID8gdW5kZWZpbmVkIDogbmV4dE9mZnNldCAtIG9mZnNldDtcbiAgICAgICAgICAgIHN0cmluZ0RhdGEucHVzaCh3YXNtLlVURjhUb1N0cmluZyhvZmZzZXQsIG1heEJ5dGVzVG9SZWFkKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIG91dHB1dC5wdXNoKFt0eXBlLCBkaW1zLCBzdHJpbmdEYXRhLCAnY3B1J10pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIElmIGEgY2VydGFpbiBvdXRwdXQncyBwcmVmZXJyZWQgbG9jYXRpb24gaXMgR1BVIGJ1dCB0aGUgdGVuc29yIGlzIGVtcHR5LCB3ZSBzdGlsbCBuZWVkIHRvIGNyZWF0ZSBhIENQVVxuICAgICAgICAgIC8vIHRlbnNvciBmb3IgaXQuIFRoZXJlIGlzIG5vIG1hcHBpbmcgR1BVIGJ1ZmZlciBmb3IgYW4gZW1wdHkgdGVuc29yLlxuICAgICAgICAgIGlmIChwcmVmZXJyZWRMb2NhdGlvbiA9PT0gJ2dwdS1idWZmZXInICYmIHNpemUgPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBnZXRCdWZmZXIgPSAhQlVJTERfREVGUy5ESVNBQkxFX1dFQkdQVSA/IHdhc20ud2ViZ3B1R2V0QnVmZmVyIDogd2FzbS5qc2VwR2V0QnVmZmVyO1xuICAgICAgICAgICAgaWYgKCFnZXRCdWZmZXIpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdwcmVmZXJyZWRMb2NhdGlvbiBcImdwdS1idWZmZXJcIiBpcyBub3Qgc3VwcG9ydGVkIHdpdGhvdXQgdXNpbmcgV2ViR1BVLicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZ3B1QnVmZmVyID0gZ2V0QnVmZmVyKGRhdGFPZmZzZXQpO1xuICAgICAgICAgICAgY29uc3QgYnVmZmVyU2l6ZSA9IGNhbGN1bGF0ZVRlbnNvclNpemVJbkJ5dGVzKGRhdGFUeXBlLCBzaXplKTtcbiAgICAgICAgICAgIGlmIChidWZmZXJTaXplID09PSB1bmRlZmluZWQgfHwgIWlzR3B1QnVmZmVyU3VwcG9ydGVkVHlwZSh0eXBlKSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIGRhdGEgdHlwZTogJHt0eXBlfWApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBkbyBub3QgcmVsZWFzZSB0aGUgdGVuc29yIHJpZ2h0IG5vdy4gaXQgd2lsbCBiZSByZWxlYXNlZCB3aGVuIHVzZXIgY2FsbHMgdGVuc29yLmRpc3Bvc2UoKS5cbiAgICAgICAgICAgIGtlZXBPdXRwdXRUZW5zb3IgPSB0cnVlO1xuXG4gICAgICAgICAgICBpZiAoIUJVSUxEX0RFRlMuRElTQUJMRV9XRUJHUFUpIHtcbiAgICAgICAgICAgICAgd2FzbS53ZWJncHVSZWdpc3RlckJ1ZmZlciEoZ3B1QnVmZmVyLCBzZXNzaW9uSWQsIGRhdGFPZmZzZXQpO1xuICAgICAgICAgICAgICBjb25zdCBkb3dubG9hZERhdGFGdW5jdGlvbiA9IHdhc20ud2ViZ3B1Q3JlYXRlRG93bmxvYWRlciEoZ3B1QnVmZmVyLCBidWZmZXJTaXplLCBzZXNzaW9uSWQpO1xuICAgICAgICAgICAgICBvdXRwdXQucHVzaChbXG4gICAgICAgICAgICAgICAgdHlwZSxcbiAgICAgICAgICAgICAgICBkaW1zLFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGdwdUJ1ZmZlcixcbiAgICAgICAgICAgICAgICAgIGRvd25sb2FkOiBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFycmF5QnVmZmVyID0gYXdhaXQgZG93bmxvYWREYXRhRnVuY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IG5ldyAodGVuc29yVHlwZVRvVHlwZWRBcnJheUNvbnN0cnVjdG9yKHR5cGUhKSkoYXJyYXlCdWZmZXIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0YSBhcyBUZW5zb3IuRGF0YVR5cGVNYXBbVGVuc29yLkdwdUJ1ZmZlckRhdGFUeXBlc107XG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgZGlzcG9zZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAod2FzbS5fT3J0UmVsZWFzZVRlbnNvcih0ZW5zb3IpICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgY2hlY2tMYXN0RXJyb3IoXCJDYW4ndCByZWxlYXNlIHRlbnNvci5cIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAnZ3B1LWJ1ZmZlcicsXG4gICAgICAgICAgICAgIF0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgb3V0cHV0LnB1c2goW1xuICAgICAgICAgICAgICAgIHR5cGUsXG4gICAgICAgICAgICAgICAgZGltcyxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBncHVCdWZmZXIsXG4gICAgICAgICAgICAgICAgICBkb3dubG9hZDogd2FzbS5qc2VwQ3JlYXRlRG93bmxvYWRlciEoZ3B1QnVmZmVyLCBidWZmZXJTaXplLCB0eXBlKSxcbiAgICAgICAgICAgICAgICAgIGRpc3Bvc2U6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHdhc20uX09ydFJlbGVhc2VUZW5zb3IodGVuc29yKSAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgIGNoZWNrTGFzdEVycm9yKFwiQ2FuJ3QgcmVsZWFzZSB0ZW5zb3IuXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgJ2dwdS1idWZmZXInLFxuICAgICAgICAgICAgICBdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgaWYgKHByZWZlcnJlZExvY2F0aW9uID09PSAnbWwtdGVuc29yJyAmJiBzaXplID4gMCkge1xuICAgICAgICAgICAgY29uc3QgZW5zdXJlVGVuc29yID0gd2FzbS53ZWJubkVuc3VyZVRlbnNvcjtcbiAgICAgICAgICAgIGNvbnN0IGlzR3JhcGhJbnB1dE91dHB1dFR5cGVTdXBwb3J0ZWQgPSB3YXNtLndlYm5uSXNHcmFwaElucHV0T3V0cHV0VHlwZVN1cHBvcnRlZDtcbiAgICAgICAgICAgIGlmICghZW5zdXJlVGVuc29yIHx8ICFpc0dyYXBoSW5wdXRPdXRwdXRUeXBlU3VwcG9ydGVkKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncHJlZmVycmVkTG9jYXRpb24gXCJtbC10ZW5zb3JcIiBpcyBub3Qgc3VwcG9ydGVkIHdpdGhvdXQgdXNpbmcgV2ViTk4uJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCB0ZW5zb3JTaXplID0gY2FsY3VsYXRlVGVuc29yU2l6ZUluQnl0ZXMoZGF0YVR5cGUsIHNpemUpO1xuICAgICAgICAgICAgaWYgKHRlbnNvclNpemUgPT09IHVuZGVmaW5lZCB8fCAhaXNNTFRlbnNvclN1cHBvcnRlZFR5cGUodHlwZSkpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnN1cHBvcnRlZCBkYXRhIHR5cGU6ICR7dHlwZX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghaXNHcmFwaElucHV0T3V0cHV0VHlwZVN1cHBvcnRlZChzZXNzaW9uSWQsIHR5cGUsIGZhbHNlKSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgYHByZWZlcnJlZExvY2F0aW9uIFwibWwtdGVuc29yXCIgZm9yICR7dHlwZX0gb3V0cHV0IGlzIG5vdCBzdXBwb3J0ZWQgYnkgY3VycmVudCBXZWJOTiBDb250ZXh0LmAsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIElmIHRoZSBncmFwaCBoYXMgYmVlbiBwYXJ0aXRpb25lZCwgdGhlIG91dHB1dCB0ZW5zb3IgbWF5IGhhdmUgbm90IGJlZW4gY3JlYXRlZC4gRm9yIHRoaXMgcmVhc29uLCB3ZSB1c2VcbiAgICAgICAgICAgIC8vIGVuc3VyZVRlbnNvciB0byBnZXQvY3JlYXRlIHRoZSBNTFRlbnNvci4gSW4gd2hpY2ggY2FzZSwgd2UgZG9uJ3QgbmVlZCB0byBjb3B5IHRoZSBkYXRhIGlmIGEgbmV3IHRlbnNvclxuICAgICAgICAgICAgLy8gaGFzIGJlZW4gY3JlYXRlZC5cbiAgICAgICAgICAgIGNvbnN0IG1sVGVuc29yID0gYXdhaXQgZW5zdXJlVGVuc29yKHNlc3Npb25JZCwgZGF0YU9mZnNldCwgZGF0YVR5cGUsIGRpbXMsIGZhbHNlKTtcblxuICAgICAgICAgICAgLy8gZG8gbm90IHJlbGVhc2UgdGhlIHRlbnNvciByaWdodCBub3cuIGl0IHdpbGwgYmUgcmVsZWFzZWQgd2hlbiB1c2VyIGNhbGxzIHRlbnNvci5kaXNwb3NlKCkuXG4gICAgICAgICAgICBrZWVwT3V0cHV0VGVuc29yID0gdHJ1ZTtcblxuICAgICAgICAgICAgb3V0cHV0LnB1c2goW1xuICAgICAgICAgICAgICB0eXBlLFxuICAgICAgICAgICAgICBkaW1zLFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbWxUZW5zb3IsXG4gICAgICAgICAgICAgICAgZG93bmxvYWQ6IHdhc20ud2Vibm5DcmVhdGVNTFRlbnNvckRvd25sb2FkZXIhKGRhdGFPZmZzZXQsIHR5cGUpLFxuICAgICAgICAgICAgICAgIGRpc3Bvc2U6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgIHdhc20ud2Vibm5SZWxlYXNlVGVuc29ySWQhKGRhdGFPZmZzZXQpO1xuICAgICAgICAgICAgICAgICAgd2FzbS5fT3J0UmVsZWFzZVRlbnNvcih0ZW5zb3IpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICdtbC10ZW5zb3InLFxuICAgICAgICAgICAgXSk7XG4gICAgICAgICAgfSBlbHNlIGlmIChwcmVmZXJyZWRMb2NhdGlvbiA9PT0gJ21sLXRlbnNvci1jcHUtb3V0cHV0JyAmJiBzaXplID4gMCkge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IHdhc20ud2Vibm5DcmVhdGVNTFRlbnNvckRvd25sb2FkZXIhKGRhdGFPZmZzZXQsIHR5cGUgYXMgVGVuc29yLk1MVGVuc29yRGF0YVR5cGVzKSgpO1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBvdXRwdXQubGVuZ3RoO1xuICAgICAgICAgICAgLy8gRGVsYXkgdGhlIGRhdGEgZG93bmxvYWQgYW5kIHJlbGVhc2luZyB0aGUgdGVuc29yIHVudGlsIHdlIGNhbiB3YWl0IGZvciBhbGwgb3V0cHV0IHRlbnNvcnMgdG8gYmUgZG93bmxvYWRlZC5cbiAgICAgICAgICAgIGtlZXBPdXRwdXRUZW5zb3IgPSB0cnVlO1xuICAgICAgICAgICAgb3V0cHV0UHJvbWlzZXMucHVzaChcbiAgICAgICAgICAgICAgKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQ6IFtudW1iZXIsIFRlbnNvci5EYXRhVHlwZV0gPSBbaW5kZXgsIGF3YWl0IGRhdGFdO1xuICAgICAgICAgICAgICAgIHdhc20ud2Vibm5SZWxlYXNlVGVuc29ySWQhKGRhdGFPZmZzZXQpO1xuICAgICAgICAgICAgICAgIHdhc20uX09ydFJlbGVhc2VUZW5zb3IodGVuc29yKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICB9KSgpLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIG91dHB1dC5wdXNoKFt0eXBlLCBkaW1zLCBbXSwgJ2NwdSddKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgdHlwZWRBcnJheUNvbnN0cnVjdG9yID0gdGVuc29yVHlwZVRvVHlwZWRBcnJheUNvbnN0cnVjdG9yKHR5cGUpO1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IG5ldyB0eXBlZEFycmF5Q29uc3RydWN0b3Ioc2l6ZSk7XG4gICAgICAgICAgICBuZXcgVWludDhBcnJheShkYXRhLmJ1ZmZlciwgZGF0YS5ieXRlT2Zmc2V0LCBkYXRhLmJ5dGVMZW5ndGgpLnNldChcbiAgICAgICAgICAgICAgd2FzbS5IRUFQVTguc3ViYXJyYXkoZGF0YU9mZnNldCwgZGF0YU9mZnNldCArIGRhdGEuYnl0ZUxlbmd0aCksXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgb3V0cHV0LnB1c2goW3R5cGUsIGRpbXMsIGRhdGEsICdjcHUnXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICB3YXNtLnN0YWNrUmVzdG9yZShiZWZvcmVHZXRUZW5zb3JEYXRhU3RhY2spO1xuICAgICAgICBpZiAodHlwZSA9PT0gJ3N0cmluZycgJiYgZGF0YU9mZnNldCkge1xuICAgICAgICAgIHdhc20uX2ZyZWUoZGF0YU9mZnNldCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFrZWVwT3V0cHV0VGVuc29yKSB7XG4gICAgICAgICAgd2FzbS5fT3J0UmVsZWFzZVRlbnNvcih0ZW5zb3IpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGlvQmluZGluZ1N0YXRlICYmICFlbmFibGVHcmFwaENhcHR1cmUpIHtcbiAgICAgIGlmICh3YXNtLl9PcnRDbGVhckJvdW5kT3V0cHV0cyhpb0JpbmRpbmdTdGF0ZS5oYW5kbGUpICE9PSAwKSB7XG4gICAgICAgIGNoZWNrTGFzdEVycm9yKFwiQ2FuJ3QgY2xlYXIgYm91bmQgb3V0cHV0cy5cIik7XG4gICAgICB9XG4gICAgICBhY3RpdmVTZXNzaW9ucy5zZXQoc2Vzc2lvbklkLCBbXG4gICAgICAgIHNlc3Npb25IYW5kbGUsXG4gICAgICAgIGlucHV0TmFtZXNVVEY4RW5jb2RlZCxcbiAgICAgICAgb3V0cHV0TmFtZXNVVEY4RW5jb2RlZCxcbiAgICAgICAgaW9CaW5kaW5nU3RhdGUsXG4gICAgICAgIGVuYWJsZUdyYXBoQ2FwdHVyZSxcbiAgICAgICAgZmFsc2UsXG4gICAgICBdKTtcbiAgICB9XG4gICAgLy8gV2FpdCBmb3IgYWxsIG91dHB1dCB0ZW5zb3IgZGF0YSB0byBiZSBkb3dubG9hZGVkLlxuICAgIGZvciAoY29uc3QgW2luZGV4LCBkYXRhXSBvZiBhd2FpdCBQcm9taXNlLmFsbChvdXRwdXRQcm9taXNlcykpIHtcbiAgICAgIG91dHB1dFtpbmRleF1bMl0gPSBkYXRhO1xuICAgIH1cbiAgICBUUkFDRV9FVkVOVF9FTkQoJ3dhc20gUHJvY2Vzc091dHB1dFRlbnNvcicpO1xuICAgIHJldHVybiBvdXRwdXQ7XG4gIH0gZmluYWxseSB7XG4gICAgd2FzbS53ZWJubk9uUnVuRW5kPy4oc2Vzc2lvbkhhbmRsZSk7XG5cbiAgICB3YXNtLnN0YWNrUmVzdG9yZShiZWZvcmVSdW5TdGFjayk7XG5cbiAgICBpZiAoIUJVSUxEX0RFRlMuRElTQUJMRV9XRUJHUFUpIHtcbiAgICAgIGlucHV0VGVuc29ycy5mb3JFYWNoKCh0KSA9PiB7XG4gICAgICAgIGlmICh0ICYmIHRbM10gPT09ICdncHUtYnVmZmVyJykge1xuICAgICAgICAgIHdhc20ud2ViZ3B1VW5yZWdpc3RlckJ1ZmZlciEodFsyXS5ncHVCdWZmZXIpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIG91dHB1dFRlbnNvcnMuZm9yRWFjaCgodCkgPT4ge1xuICAgICAgICBpZiAodCAmJiB0WzNdID09PSAnZ3B1LWJ1ZmZlcicpIHtcbiAgICAgICAgICB3YXNtLndlYmdwdVVucmVnaXN0ZXJCdWZmZXIhKHRbMl0uZ3B1QnVmZmVyKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIGlucHV0VGVuc29ySGFuZGxlcy5mb3JFYWNoKCh2KSA9PiB3YXNtLl9PcnRSZWxlYXNlVGVuc29yKHYpKTtcbiAgICBvdXRwdXRUZW5zb3JIYW5kbGVzLmZvckVhY2goKHYpID0+IHdhc20uX09ydFJlbGVhc2VUZW5zb3IodikpO1xuICAgIGlucHV0T3V0cHV0QWxsb2NzLmZvckVhY2goKHApID0+IHdhc20uX2ZyZWUocCkpO1xuXG4gICAgaWYgKHJ1bk9wdGlvbnNIYW5kbGUgIT09IDApIHtcbiAgICAgIHdhc20uX09ydFJlbGVhc2VSdW5PcHRpb25zKHJ1bk9wdGlvbnNIYW5kbGUpO1xuICAgIH1cbiAgICBydW5PcHRpb25zQWxsb2NzLmZvckVhY2goKHApID0+IHdhc20uX2ZyZWUocCkpO1xuICB9XG59O1xuXG4vKipcbiAqIGVuZCBwcm9maWxpbmdcbiAqL1xuZXhwb3J0IGNvbnN0IGVuZFByb2ZpbGluZyA9IChzZXNzaW9uSWQ6IG51bWJlcik6IHZvaWQgPT4ge1xuICBjb25zdCB3YXNtID0gZ2V0SW5zdGFuY2UoKTtcbiAgY29uc3Qgc2Vzc2lvbiA9IGFjdGl2ZVNlc3Npb25zLmdldChzZXNzaW9uSWQpO1xuICBpZiAoIXNlc3Npb24pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2ludmFsaWQgc2Vzc2lvbiBpZCcpO1xuICB9XG4gIGNvbnN0IHNlc3Npb25IYW5kbGUgPSBzZXNzaW9uWzBdO1xuXG4gIC8vIHByb2ZpbGUgZmlsZSBuYW1lIGlzIG5vdCB1c2VkIHlldCwgYnV0IGl0IG11c3QgYmUgZnJlZWQuXG4gIGNvbnN0IHByb2ZpbGVGaWxlTmFtZSA9IHdhc20uX09ydEVuZFByb2ZpbGluZyhzZXNzaW9uSGFuZGxlKTtcbiAgaWYgKHByb2ZpbGVGaWxlTmFtZSA9PT0gMCkge1xuICAgIGNoZWNrTGFzdEVycm9yKFwiQ2FuJ3QgZ2V0IGFuIHByb2ZpbGUgZmlsZSBuYW1lLlwiKTtcbiAgfVxuICB3YXNtLl9PcnRGcmVlKHByb2ZpbGVGaWxlTmFtZSk7XG59O1xuXG5leHBvcnQgY29uc3QgZXh0cmFjdFRyYW5zZmVyYWJsZUJ1ZmZlcnMgPSAodGVuc29yczogcmVhZG9ubHkgU2VyaWFsaXphYmxlVGVuc29yTWV0YWRhdGFbXSk6IEFycmF5QnVmZmVyTGlrZVtdID0+IHtcbiAgY29uc3QgYnVmZmVyczogQXJyYXlCdWZmZXJMaWtlW10gPSBbXTtcbiAgZm9yIChjb25zdCB0ZW5zb3Igb2YgdGVuc29ycykge1xuICAgIGNvbnN0IGRhdGEgPSB0ZW5zb3JbMl07XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGRhdGEpICYmICdidWZmZXInIGluIGRhdGEpIHtcbiAgICAgIGJ1ZmZlcnMucHVzaChkYXRhLmJ1ZmZlcik7XG4gICAgfVxuICB9XG4gIHJldHVybiBidWZmZXJzO1xufTtcbiIsICIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cblxuaW1wb3J0IHsgZW52LCBJbmZlcmVuY2VTZXNzaW9uIH0gZnJvbSAnb25ueHJ1bnRpbWUtY29tbW9uJztcblxuaW1wb3J0IHtcbiAgT3J0V2FzbU1lc3NhZ2UsXG4gIFNlcmlhbGl6YWJsZUludGVybmFsQnVmZmVyLFxuICBTZXJpYWxpemFibGVTZXNzaW9uTWV0YWRhdGEsXG4gIFNlcmlhbGl6YWJsZVRlbnNvck1ldGFkYXRhLFxuICBUZW5zb3JNZXRhZGF0YSxcbn0gZnJvbSAnLi9wcm94eS1tZXNzYWdlcyc7XG5pbXBvcnQgKiBhcyBjb3JlIGZyb20gJy4vd2FzbS1jb3JlLWltcGwnO1xuaW1wb3J0IHsgaW5pdGlhbGl6ZVdlYkFzc2VtYmx5IH0gZnJvbSAnLi93YXNtLWZhY3RvcnknO1xuaW1wb3J0IHtcbiAgaW1wb3J0UHJveHlXb3JrZXIsXG4gIGluZmVyV2FzbVBhdGhQcmVmaXhGcm9tU2NyaXB0U3JjLFxuICBpc0VzbUltcG9ydE1ldGFVcmxIYXJkY29kZWRBc0ZpbGVVcmksXG59IGZyb20gJy4vd2FzbS11dGlscy1pbXBvcnQnO1xuXG5jb25zdCBpc1Byb3h5ID0gKCk6IGJvb2xlYW4gPT4gISFlbnYud2FzbS5wcm94eSAmJiB0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnO1xubGV0IHByb3h5V29ya2VyOiBXb3JrZXIgfCB1bmRlZmluZWQ7XG5sZXQgaW5pdGlhbGl6aW5nID0gZmFsc2U7XG5sZXQgaW5pdGlhbGl6ZWQgPSBmYWxzZTtcbmxldCBhYm9ydGVkID0gZmFsc2U7XG5sZXQgdGVtcG9yYXJ5T2JqZWN0VXJsOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbnR5cGUgUHJvbWlzZUNhbGxiYWNrczxUID0gdm9pZD4gPSBbcmVzb2x2ZTogKHJlc3VsdDogVCkgPT4gdm9pZCwgcmVqZWN0OiAocmVhc29uOiB1bmtub3duKSA9PiB2b2lkXTtcbmxldCBpbml0V2FzbUNhbGxiYWNrczogUHJvbWlzZUNhbGxiYWNrcztcbmNvbnN0IHF1ZXVlZENhbGxiYWNrczogTWFwPE9ydFdhc21NZXNzYWdlWyd0eXBlJ10sIEFycmF5PFByb21pc2VDYWxsYmFja3M8dW5rbm93bj4+PiA9IG5ldyBNYXAoKTtcblxuY29uc3QgZW5xdWV1ZUNhbGxiYWNrcyA9ICh0eXBlOiBPcnRXYXNtTWVzc2FnZVsndHlwZSddLCBjYWxsYmFja3M6IFByb21pc2VDYWxsYmFja3M8dW5rbm93bj4pOiB2b2lkID0+IHtcbiAgY29uc3QgcXVldWUgPSBxdWV1ZWRDYWxsYmFja3MuZ2V0KHR5cGUpO1xuICBpZiAocXVldWUpIHtcbiAgICBxdWV1ZS5wdXNoKGNhbGxiYWNrcyk7XG4gIH0gZWxzZSB7XG4gICAgcXVldWVkQ2FsbGJhY2tzLnNldCh0eXBlLCBbY2FsbGJhY2tzXSk7XG4gIH1cbn07XG5cbmNvbnN0IGVuc3VyZVdvcmtlciA9ICgpOiB2b2lkID0+IHtcbiAgaWYgKGluaXRpYWxpemluZyB8fCAhaW5pdGlhbGl6ZWQgfHwgYWJvcnRlZCB8fCAhcHJveHlXb3JrZXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3dvcmtlciBub3QgcmVhZHknKTtcbiAgfVxufTtcblxuY29uc3Qgb25Qcm94eVdvcmtlck1lc3NhZ2UgPSAoZXY6IE1lc3NhZ2VFdmVudDxPcnRXYXNtTWVzc2FnZT4pOiB2b2lkID0+IHtcbiAgc3dpdGNoIChldi5kYXRhLnR5cGUpIHtcbiAgICBjYXNlICdpbml0LXdhc20nOlxuICAgICAgaW5pdGlhbGl6aW5nID0gZmFsc2U7XG4gICAgICBpZiAoZXYuZGF0YS5lcnIpIHtcbiAgICAgICAgYWJvcnRlZCA9IHRydWU7XG4gICAgICAgIGluaXRXYXNtQ2FsbGJhY2tzWzFdKGV2LmRhdGEuZXJyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgaW5pdFdhc21DYWxsYmFja3NbMF0oKTtcbiAgICAgIH1cbiAgICAgIGlmICh0ZW1wb3JhcnlPYmplY3RVcmwpIHtcbiAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTCh0ZW1wb3JhcnlPYmplY3RVcmwpO1xuICAgICAgICB0ZW1wb3JhcnlPYmplY3RVcmwgPSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdpbml0LWVwJzpcbiAgICBjYXNlICdjb3B5LWZyb20nOlxuICAgIGNhc2UgJ2NyZWF0ZSc6XG4gICAgY2FzZSAncmVsZWFzZSc6XG4gICAgY2FzZSAncnVuJzpcbiAgICBjYXNlICdlbmQtcHJvZmlsaW5nJzoge1xuICAgICAgY29uc3QgY2FsbGJhY2tzID0gcXVldWVkQ2FsbGJhY2tzLmdldChldi5kYXRhLnR5cGUpITtcbiAgICAgIGlmIChldi5kYXRhLmVycikge1xuICAgICAgICBjYWxsYmFja3Muc2hpZnQoKSFbMV0oZXYuZGF0YS5lcnIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2FsbGJhY2tzLnNoaWZ0KCkhWzBdKGV2LmRhdGEub3V0ISk7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgZGVmYXVsdDpcbiAgfVxufTtcblxuZXhwb3J0IGNvbnN0IGluaXRpYWxpemVXZWJBc3NlbWJseUFuZE9ydFJ1bnRpbWUgPSBhc3luYyAoKTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gIGlmIChpbml0aWFsaXplZCkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoaW5pdGlhbGl6aW5nKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwibXVsdGlwbGUgY2FsbHMgdG8gJ2luaXRXYXNtKCknIGRldGVjdGVkLlwiKTtcbiAgfVxuICBpZiAoYWJvcnRlZCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcInByZXZpb3VzIGNhbGwgdG8gJ2luaXRXYXNtKCknIGZhaWxlZC5cIik7XG4gIH1cblxuICBpbml0aWFsaXppbmcgPSB0cnVlO1xuXG4gIGlmICghQlVJTERfREVGUy5ESVNBQkxFX1dBU01fUFJPWFkgJiYgaXNQcm94eSgpKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHByb3h5V29ya2VyPy50ZXJtaW5hdGUoKTtcblxuICAgICAgdm9pZCBpbXBvcnRQcm94eVdvcmtlcigpLnRoZW4oKFtvYmplY3RVcmwsIHdvcmtlcl0pID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBwcm94eVdvcmtlciA9IHdvcmtlcjtcbiAgICAgICAgICBwcm94eVdvcmtlci5vbmVycm9yID0gKGV2OiBFcnJvckV2ZW50KSA9PiByZWplY3QoZXYpO1xuICAgICAgICAgIHByb3h5V29ya2VyLm9ubWVzc2FnZSA9IG9uUHJveHlXb3JrZXJNZXNzYWdlO1xuICAgICAgICAgIGluaXRXYXNtQ2FsbGJhY2tzID0gW3Jlc29sdmUsIHJlamVjdF07XG4gICAgICAgICAgY29uc3QgbWVzc2FnZTogT3J0V2FzbU1lc3NhZ2UgPSB7IHR5cGU6ICdpbml0LXdhc20nLCBpbjogZW52IH07XG5cbiAgICAgICAgICAvLyBpZiB0aGUgcHJveHkgd29ya2VyIGlzIGxvYWRlZCBmcm9tIGEgYmxvYiBVUkwsIHdlIG5lZWQgdG8gbWFrZSBzdXJlIHRoZSBwYXRoIGluZm9ybWF0aW9uIGlzIG5vdCBsb3N0LlxuICAgICAgICAgIC8vXG4gICAgICAgICAgLy8gd2hlbiBgZW52Lndhc20ud2FzbVBhdGhzYCBpcyBub3Qgc2V0LCB3ZSBuZWVkIHRvIHBhc3MgdGhlIHBhdGggaW5mb3JtYXRpb24gdG8gdGhlIHdvcmtlci5cbiAgICAgICAgICAvL1xuICAgICAgICAgIGlmICghQlVJTERfREVGUy5FTkFCTEVfQlVORExFX1dBU01fSlMgJiYgIW1lc3NhZ2UuaW4hLndhc20ud2FzbVBhdGhzICYmIG9iamVjdFVybCkge1xuICAgICAgICAgICAgLy8gZm9yIGEgYnVpbGQgbm90IGJ1bmRsZWQgdGhlIHdhc20gSlMsIHdlIG5lZWQgdG8gcGFzcyB0aGUgcGF0aCBwcmVmaXggdG8gdGhlIHdvcmtlci5cbiAgICAgICAgICAgIC8vIHRoZSBwYXRoIHByZWZpeCB3aWxsIGJlIHVzZWQgdG8gcmVzb2x2ZSB0aGUgcGF0aCB0byBib3RoIHRoZSB3YXNtIEpTIGFuZCB0aGUgd2FzbSBmaWxlLlxuICAgICAgICAgICAgY29uc3QgaW5mZXJyZWRXYXNtUGF0aFByZWZpeCA9IGluZmVyV2FzbVBhdGhQcmVmaXhGcm9tU2NyaXB0U3JjKCk7XG4gICAgICAgICAgICBpZiAoaW5mZXJyZWRXYXNtUGF0aFByZWZpeCkge1xuICAgICAgICAgICAgICBtZXNzYWdlLmluIS53YXNtLndhc21QYXRocyA9IGluZmVycmVkV2FzbVBhdGhQcmVmaXg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgQlVJTERfREVGUy5JU19FU00gJiZcbiAgICAgICAgICAgIEJVSUxEX0RFRlMuRU5BQkxFX0JVTkRMRV9XQVNNX0pTICYmXG4gICAgICAgICAgICAhbWVzc2FnZS5pbiEud2FzbS53YXNtUGF0aHMgJiZcbiAgICAgICAgICAgIChvYmplY3RVcmwgfHwgaXNFc21JbXBvcnRNZXRhVXJsSGFyZGNvZGVkQXNGaWxlVXJpKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgLy8gZm9yIGEgYnVpbGQgYnVuZGxlZCB0aGUgd2FzbSBKUywgaWYgZWl0aGVyIG9mIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9ucyBpcyBtZXQ6XG4gICAgICAgICAgICAvLyAtIHRoZSBwcm94eSB3b3JrZXIgaXMgbG9hZGVkIGZyb20gYSBibG9iIFVSTFxuICAgICAgICAgICAgLy8gLSBgaW1wb3J0Lm1ldGEudXJsYCBpcyBhIGZpbGUgVVJMLCBpdCBtZWFucyBpdCBpcyBvdmVyd3JpdHRlbiBieSB0aGUgYnVuZGxlci5cbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAvLyBpbiBlaXRoZXIgY2FzZSwgdGhlIHBhdGggaW5mb3JtYXRpb24gaXMgbG9zdCwgd2UgbmVlZCB0byBwYXNzIHRoZSBwYXRoIG9mIHRoZSAud2FzbSBmaWxlIHRvIHRoZSB3b3JrZXIuXG4gICAgICAgICAgICAvLyB3ZSBuZWVkIHRvIHVzZSB0aGUgYnVuZGxlciBwcmVmZXJyZWQgVVJMIGZvcm1hdDpcbiAgICAgICAgICAgIC8vIG5ldyBVUkwoJ2ZpbGVuYW1lJywgaW1wb3J0Lm1ldGEudXJsKVxuICAgICAgICAgICAgLy8gc28gdGhhdCB0aGUgYnVuZGxlciBjYW4gaGFuZGxlIHRoZSBmaWxlIHVzaW5nIGNvcnJlc3BvbmRpbmcgbG9hZGVycy5cbiAgICAgICAgICAgIG1lc3NhZ2UuaW4hLndhc20ud2FzbVBhdGhzID0ge1xuICAgICAgICAgICAgICB3YXNtOiAhQlVJTERfREVGUy5ESVNBQkxFX0pTRVBcbiAgICAgICAgICAgICAgICA/IG5ldyBVUkwoJ29ydC13YXNtLXNpbWQtdGhyZWFkZWQuanNlcC53YXNtJywgQlVJTERfREVGUy5FU01fSU1QT1JUX01FVEFfVVJMKS5ocmVmXG4gICAgICAgICAgICAgICAgOiBCVUlMRF9ERUZTLkVOQUJMRV9KU1BJXG4gICAgICAgICAgICAgICAgICA/IG5ldyBVUkwoJ29ydC13YXNtLXNpbWQtdGhyZWFkZWQuanNwaS53YXNtJywgQlVJTERfREVGUy5FU01fSU1QT1JUX01FVEFfVVJMKS5ocmVmXG4gICAgICAgICAgICAgICAgICA6ICFCVUlMRF9ERUZTLkRJU0FCTEVfV0VCR1BVXG4gICAgICAgICAgICAgICAgICAgID8gbmV3IFVSTCgnb3J0LXdhc20tc2ltZC10aHJlYWRlZC5hc3luY2lmeS53YXNtJywgQlVJTERfREVGUy5FU01fSU1QT1JUX01FVEFfVVJMKS5ocmVmXG4gICAgICAgICAgICAgICAgICAgIDogbmV3IFVSTCgnb3J0LXdhc20tc2ltZC10aHJlYWRlZC53YXNtJywgQlVJTERfREVGUy5FU01fSU1QT1JUX01FVEFfVVJMKS5ocmVmLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcHJveHlXb3JrZXIucG9zdE1lc3NhZ2UobWVzc2FnZSk7XG4gICAgICAgICAgdGVtcG9yYXJ5T2JqZWN0VXJsID0gb2JqZWN0VXJsO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgICB9LCByZWplY3QpO1xuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBpbml0aWFsaXplV2ViQXNzZW1ibHkoZW52Lndhc20pO1xuICAgICAgYXdhaXQgY29yZS5pbml0UnVudGltZShlbnYpO1xuICAgICAgaW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGFib3J0ZWQgPSB0cnVlO1xuICAgICAgdGhyb3cgZTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgaW5pdGlhbGl6aW5nID0gZmFsc2U7XG4gICAgfVxuICB9XG59O1xuXG5leHBvcnQgY29uc3QgaW5pdGlhbGl6ZU9ydEVwID0gYXN5bmMgKGVwTmFtZTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gIGlmICghQlVJTERfREVGUy5ESVNBQkxFX1dBU01fUFJPWFkgJiYgaXNQcm94eSgpKSB7XG4gICAgZW5zdXJlV29ya2VyKCk7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGVucXVldWVDYWxsYmFja3MoJ2luaXQtZXAnLCBbcmVzb2x2ZSwgcmVqZWN0XSk7XG4gICAgICBjb25zdCBtZXNzYWdlOiBPcnRXYXNtTWVzc2FnZSA9IHsgdHlwZTogJ2luaXQtZXAnLCBpbjogeyBlcE5hbWUsIGVudiB9IH07XG4gICAgICBwcm94eVdvcmtlciEucG9zdE1lc3NhZ2UobWVzc2FnZSk7XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgYXdhaXQgY29yZS5pbml0RXAoZW52LCBlcE5hbWUpO1xuICB9XG59O1xuXG5leHBvcnQgY29uc3QgY29weUZyb21FeHRlcm5hbEJ1ZmZlciA9IGFzeW5jIChidWZmZXI6IFVpbnQ4QXJyYXkpOiBQcm9taXNlPFNlcmlhbGl6YWJsZUludGVybmFsQnVmZmVyPiA9PiB7XG4gIGlmICghQlVJTERfREVGUy5ESVNBQkxFX1dBU01fUFJPWFkgJiYgaXNQcm94eSgpKSB7XG4gICAgZW5zdXJlV29ya2VyKCk7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPFNlcmlhbGl6YWJsZUludGVybmFsQnVmZmVyPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBlbnF1ZXVlQ2FsbGJhY2tzKCdjb3B5LWZyb20nLCBbcmVzb2x2ZSwgcmVqZWN0XSk7XG4gICAgICBjb25zdCBtZXNzYWdlOiBPcnRXYXNtTWVzc2FnZSA9IHsgdHlwZTogJ2NvcHktZnJvbScsIGluOiB7IGJ1ZmZlciB9IH07XG4gICAgICBwcm94eVdvcmtlciEucG9zdE1lc3NhZ2UobWVzc2FnZSwgW2J1ZmZlci5idWZmZXJdKTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gY29yZS5jb3B5RnJvbUV4dGVybmFsQnVmZmVyKGJ1ZmZlcik7XG4gIH1cbn07XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVTZXNzaW9uID0gYXN5bmMgKFxuICBtb2RlbDogU2VyaWFsaXphYmxlSW50ZXJuYWxCdWZmZXIgfCBVaW50OEFycmF5LFxuICBvcHRpb25zPzogSW5mZXJlbmNlU2Vzc2lvbi5TZXNzaW9uT3B0aW9ucyxcbik6IFByb21pc2U8U2VyaWFsaXphYmxlU2Vzc2lvbk1ldGFkYXRhPiA9PiB7XG4gIGlmICghQlVJTERfREVGUy5ESVNBQkxFX1dBU01fUFJPWFkgJiYgaXNQcm94eSgpKSB7XG4gICAgLy8gY2hlY2sgdW5zdXBwb3J0ZWQgb3B0aW9uc1xuICAgIGlmIChvcHRpb25zPy5wcmVmZXJyZWRPdXRwdXRMb2NhdGlvbikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdzZXNzaW9uIG9wdGlvbiBcInByZWZlcnJlZE91dHB1dExvY2F0aW9uXCIgaXMgbm90IHN1cHBvcnRlZCBmb3IgcHJveHkuJyk7XG4gICAgfVxuICAgIGVuc3VyZVdvcmtlcigpO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZTxTZXJpYWxpemFibGVTZXNzaW9uTWV0YWRhdGE+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGVucXVldWVDYWxsYmFja3MoJ2NyZWF0ZScsIFtyZXNvbHZlLCByZWplY3RdKTtcbiAgICAgIGNvbnN0IG1lc3NhZ2U6IE9ydFdhc21NZXNzYWdlID0geyB0eXBlOiAnY3JlYXRlJywgaW46IHsgbW9kZWwsIG9wdGlvbnM6IHsgLi4ub3B0aW9ucyB9IH0gfTtcbiAgICAgIGNvbnN0IHRyYW5zZmVyYWJsZTogVHJhbnNmZXJhYmxlW10gPSBbXTtcbiAgICAgIGlmIChtb2RlbCBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkpIHtcbiAgICAgICAgdHJhbnNmZXJhYmxlLnB1c2gobW9kZWwuYnVmZmVyKTtcbiAgICAgIH1cbiAgICAgIHByb3h5V29ya2VyIS5wb3N0TWVzc2FnZShtZXNzYWdlLCB0cmFuc2ZlcmFibGUpO1xuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBjb3JlLmNyZWF0ZVNlc3Npb24obW9kZWwsIG9wdGlvbnMpO1xuICB9XG59O1xuXG5leHBvcnQgY29uc3QgcmVsZWFzZVNlc3Npb24gPSBhc3luYyAoc2Vzc2lvbklkOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgaWYgKCFCVUlMRF9ERUZTLkRJU0FCTEVfV0FTTV9QUk9YWSAmJiBpc1Byb3h5KCkpIHtcbiAgICBlbnN1cmVXb3JrZXIoKTtcbiAgICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgZW5xdWV1ZUNhbGxiYWNrcygncmVsZWFzZScsIFtyZXNvbHZlLCByZWplY3RdKTtcbiAgICAgIGNvbnN0IG1lc3NhZ2U6IE9ydFdhc21NZXNzYWdlID0geyB0eXBlOiAncmVsZWFzZScsIGluOiBzZXNzaW9uSWQgfTtcbiAgICAgIHByb3h5V29ya2VyIS5wb3N0TWVzc2FnZShtZXNzYWdlKTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBjb3JlLnJlbGVhc2VTZXNzaW9uKHNlc3Npb25JZCk7XG4gIH1cbn07XG5cbmV4cG9ydCBjb25zdCBydW4gPSBhc3luYyAoXG4gIHNlc3Npb25JZDogbnVtYmVyLFxuICBpbnB1dEluZGljZXM6IG51bWJlcltdLFxuICBpbnB1dHM6IFRlbnNvck1ldGFkYXRhW10sXG4gIG91dHB1dEluZGljZXM6IG51bWJlcltdLFxuICBvdXRwdXRzOiBBcnJheTxUZW5zb3JNZXRhZGF0YSB8IG51bGw+LFxuICBvcHRpb25zOiBJbmZlcmVuY2VTZXNzaW9uLlJ1bk9wdGlvbnMsXG4pOiBQcm9taXNlPFRlbnNvck1ldGFkYXRhW10+ID0+IHtcbiAgaWYgKCFCVUlMRF9ERUZTLkRJU0FCTEVfV0FTTV9QUk9YWSAmJiBpc1Byb3h5KCkpIHtcbiAgICAvLyBjaGVjayBpbnB1dHMgbG9jYXRpb25cbiAgICBpZiAoaW5wdXRzLnNvbWUoKHQpID0+IHRbM10gIT09ICdjcHUnKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdpbnB1dCB0ZW5zb3Igb24gR1BVIGlzIG5vdCBzdXBwb3J0ZWQgZm9yIHByb3h5LicpO1xuICAgIH1cbiAgICAvLyBjaGVjayBvdXRwdXRzIGxvY2F0aW9uXG4gICAgaWYgKG91dHB1dHMuc29tZSgodCkgPT4gdCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigncHJlLWFsbG9jYXRlZCBvdXRwdXQgdGVuc29yIGlzIG5vdCBzdXBwb3J0ZWQgZm9yIHByb3h5LicpO1xuICAgIH1cbiAgICBlbnN1cmVXb3JrZXIoKTtcbiAgICByZXR1cm4gbmV3IFByb21pc2U8U2VyaWFsaXphYmxlVGVuc29yTWV0YWRhdGFbXT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgZW5xdWV1ZUNhbGxiYWNrcygncnVuJywgW3Jlc29sdmUsIHJlamVjdF0pO1xuICAgICAgY29uc3Qgc2VyaWFsaXphYmxlSW5wdXRzID0gaW5wdXRzIGFzIFNlcmlhbGl6YWJsZVRlbnNvck1ldGFkYXRhW107IC8vIGV2ZXJ5IGlucHV0IGlzIG9uIENQVS5cbiAgICAgIGNvbnN0IG1lc3NhZ2U6IE9ydFdhc21NZXNzYWdlID0ge1xuICAgICAgICB0eXBlOiAncnVuJyxcbiAgICAgICAgaW46IHsgc2Vzc2lvbklkLCBpbnB1dEluZGljZXMsIGlucHV0czogc2VyaWFsaXphYmxlSW5wdXRzLCBvdXRwdXRJbmRpY2VzLCBvcHRpb25zIH0sXG4gICAgICB9O1xuICAgICAgcHJveHlXb3JrZXIhLnBvc3RNZXNzYWdlKG1lc3NhZ2UsIGNvcmUuZXh0cmFjdFRyYW5zZmVyYWJsZUJ1ZmZlcnMoc2VyaWFsaXphYmxlSW5wdXRzKSk7XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGNvcmUucnVuKHNlc3Npb25JZCwgaW5wdXRJbmRpY2VzLCBpbnB1dHMsIG91dHB1dEluZGljZXMsIG91dHB1dHMsIG9wdGlvbnMpO1xuICB9XG59O1xuXG5leHBvcnQgY29uc3QgZW5kUHJvZmlsaW5nID0gYXN5bmMgKHNlc3Npb25JZDogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gIGlmICghQlVJTERfREVGUy5ESVNBQkxFX1dBU01fUFJPWFkgJiYgaXNQcm94eSgpKSB7XG4gICAgZW5zdXJlV29ya2VyKCk7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGVucXVldWVDYWxsYmFja3MoJ2VuZC1wcm9maWxpbmcnLCBbcmVzb2x2ZSwgcmVqZWN0XSk7XG4gICAgICBjb25zdCBtZXNzYWdlOiBPcnRXYXNtTWVzc2FnZSA9IHsgdHlwZTogJ2VuZC1wcm9maWxpbmcnLCBpbjogc2Vzc2lvbklkIH07XG4gICAgICBwcm94eVdvcmtlciEucG9zdE1lc3NhZ2UobWVzc2FnZSk7XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgY29yZS5lbmRQcm9maWxpbmcoc2Vzc2lvbklkKTtcbiAgfVxufTtcbiIsICIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cblxuaW1wb3J0IHtcbiAgSW5mZXJlbmNlU2Vzc2lvbixcbiAgSW5mZXJlbmNlU2Vzc2lvbkhhbmRsZXIsXG4gIFNlc3Npb25IYW5kbGVyLFxuICBUZW5zb3IsXG4gIFRSQUNFX0ZVTkNfQkVHSU4sXG4gIFRSQUNFX0ZVTkNfRU5ELFxufSBmcm9tICdvbm54cnVudGltZS1jb21tb24nO1xuXG5pbXBvcnQgeyBTZXJpYWxpemFibGVJbnRlcm5hbEJ1ZmZlciwgVGVuc29yTWV0YWRhdGEgfSBmcm9tICcuL3Byb3h5LW1lc3NhZ2VzJztcbmltcG9ydCB7IGNvcHlGcm9tRXh0ZXJuYWxCdWZmZXIsIGNyZWF0ZVNlc3Npb24sIGVuZFByb2ZpbGluZywgcmVsZWFzZVNlc3Npb24sIHJ1biB9IGZyb20gJy4vcHJveHktd3JhcHBlcic7XG5pbXBvcnQgeyBpc0dwdUJ1ZmZlclN1cHBvcnRlZFR5cGUsIGlzTUxUZW5zb3JTdXBwb3J0ZWRUeXBlIH0gZnJvbSAnLi93YXNtLWNvbW1vbic7XG5pbXBvcnQgeyBpc05vZGUgfSBmcm9tICcuL3dhc20tdXRpbHMtZW52JztcbmltcG9ydCB7IGxvYWRGaWxlIH0gZnJvbSAnLi93YXNtLXV0aWxzLWxvYWQtZmlsZSc7XG5cbmV4cG9ydCBjb25zdCBlbmNvZGVUZW5zb3JNZXRhZGF0YSA9ICh0ZW5zb3I6IFRlbnNvciwgZ2V0TmFtZTogKCkgPT4gc3RyaW5nKTogVGVuc29yTWV0YWRhdGEgPT4ge1xuICBzd2l0Y2ggKHRlbnNvci5sb2NhdGlvbikge1xuICAgIGNhc2UgJ2NwdSc6XG4gICAgICByZXR1cm4gW3RlbnNvci50eXBlLCB0ZW5zb3IuZGltcywgdGVuc29yLmRhdGEsICdjcHUnXTtcbiAgICBjYXNlICdncHUtYnVmZmVyJzpcbiAgICAgIHJldHVybiBbdGVuc29yLnR5cGUsIHRlbnNvci5kaW1zLCB7IGdwdUJ1ZmZlcjogdGVuc29yLmdwdUJ1ZmZlciB9LCAnZ3B1LWJ1ZmZlciddO1xuICAgIGNhc2UgJ21sLXRlbnNvcic6XG4gICAgICByZXR1cm4gW3RlbnNvci50eXBlLCB0ZW5zb3IuZGltcywgeyBtbFRlbnNvcjogdGVuc29yLm1sVGVuc29yIH0sICdtbC10ZW5zb3InXTtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIGRhdGEgbG9jYXRpb246ICR7dGVuc29yLmxvY2F0aW9ufSBmb3IgJHtnZXROYW1lKCl9YCk7XG4gIH1cbn07XG5cbmV4cG9ydCBjb25zdCBkZWNvZGVUZW5zb3JNZXRhZGF0YSA9ICh0ZW5zb3I6IFRlbnNvck1ldGFkYXRhKTogVGVuc29yID0+IHtcbiAgc3dpdGNoICh0ZW5zb3JbM10pIHtcbiAgICBjYXNlICdjcHUnOlxuICAgICAgcmV0dXJuIG5ldyBUZW5zb3IodGVuc29yWzBdLCB0ZW5zb3JbMl0sIHRlbnNvclsxXSk7XG4gICAgY2FzZSAnZ3B1LWJ1ZmZlcic6IHtcbiAgICAgIGNvbnN0IGRhdGFUeXBlID0gdGVuc29yWzBdO1xuICAgICAgaWYgKCFpc0dwdUJ1ZmZlclN1cHBvcnRlZFR5cGUoZGF0YVR5cGUpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgbm90IHN1cHBvcnRlZCBkYXRhIHR5cGU6ICR7ZGF0YVR5cGV9IGZvciBkZXNlcmlhbGl6aW5nIEdQVSB0ZW5zb3JgKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHsgZ3B1QnVmZmVyLCBkb3dubG9hZCwgZGlzcG9zZSB9ID0gdGVuc29yWzJdO1xuICAgICAgcmV0dXJuIFRlbnNvci5mcm9tR3B1QnVmZmVyKGdwdUJ1ZmZlciwgeyBkYXRhVHlwZSwgZGltczogdGVuc29yWzFdLCBkb3dubG9hZCwgZGlzcG9zZSB9KTtcbiAgICB9XG4gICAgY2FzZSAnbWwtdGVuc29yJzoge1xuICAgICAgY29uc3QgZGF0YVR5cGUgPSB0ZW5zb3JbMF07XG4gICAgICBpZiAoIWlzTUxUZW5zb3JTdXBwb3J0ZWRUeXBlKGRhdGFUeXBlKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYG5vdCBzdXBwb3J0ZWQgZGF0YSB0eXBlOiAke2RhdGFUeXBlfSBmb3IgZGVzZXJpYWxpemluZyBNTFRlbnNvciB0ZW5zb3JgKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHsgbWxUZW5zb3IsIGRvd25sb2FkLCBkaXNwb3NlIH0gPSB0ZW5zb3JbMl07XG4gICAgICByZXR1cm4gVGVuc29yLmZyb21NTFRlbnNvcihtbFRlbnNvciwgeyBkYXRhVHlwZSwgZGltczogdGVuc29yWzFdLCBkb3dubG9hZCwgZGlzcG9zZSB9KTtcbiAgICB9XG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCBkYXRhIGxvY2F0aW9uOiAke3RlbnNvclszXX1gKTtcbiAgfVxufTtcblxuZXhwb3J0IGNsYXNzIE9ubnhydW50aW1lV2ViQXNzZW1ibHlTZXNzaW9uSGFuZGxlciBpbXBsZW1lbnRzIEluZmVyZW5jZVNlc3Npb25IYW5kbGVyIHtcbiAgcHJpdmF0ZSBzZXNzaW9uSWQ6IG51bWJlcjtcblxuICBpbnB1dE5hbWVzOiByZWFkb25seSBzdHJpbmdbXTtcbiAgb3V0cHV0TmFtZXM6IHJlYWRvbmx5IHN0cmluZ1tdO1xuICBpbnB1dE1ldGFkYXRhOiByZWFkb25seSBJbmZlcmVuY2VTZXNzaW9uLlZhbHVlTWV0YWRhdGFbXTtcbiAgb3V0cHV0TWV0YWRhdGE6IHJlYWRvbmx5IEluZmVyZW5jZVNlc3Npb24uVmFsdWVNZXRhZGF0YVtdO1xuXG4gIGFzeW5jIGZldGNoTW9kZWxBbmRDb3B5VG9XYXNtTWVtb3J5KHBhdGg6IHN0cmluZyk6IFByb21pc2U8U2VyaWFsaXphYmxlSW50ZXJuYWxCdWZmZXI+IHtcbiAgICAvLyBmZXRjaCBtb2RlbCBmcm9tIHVybCBhbmQgbW92ZSB0byB3YXNtIGhlYXAuXG4gICAgcmV0dXJuIGNvcHlGcm9tRXh0ZXJuYWxCdWZmZXIoYXdhaXQgbG9hZEZpbGUocGF0aCkpO1xuICB9XG5cbiAgYXN5bmMgbG9hZE1vZGVsKHBhdGhPckJ1ZmZlcjogc3RyaW5nIHwgVWludDhBcnJheSwgb3B0aW9ucz86IEluZmVyZW5jZVNlc3Npb24uU2Vzc2lvbk9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBUUkFDRV9GVU5DX0JFR0lOKCk7XG4gICAgbGV0IG1vZGVsOiBQYXJhbWV0ZXJzPHR5cGVvZiBjcmVhdGVTZXNzaW9uPlswXTtcblxuICAgIGlmICh0eXBlb2YgcGF0aE9yQnVmZmVyID09PSAnc3RyaW5nJykge1xuICAgICAgaWYgKGlzTm9kZSkge1xuICAgICAgICAvLyBub2RlXG4gICAgICAgIG1vZGVsID0gYXdhaXQgbG9hZEZpbGUocGF0aE9yQnVmZmVyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGJyb3dzZXJcbiAgICAgICAgLy8gZmV0Y2ggbW9kZWwgYW5kIGNvcHkgdG8gd2FzbSBoZWFwLlxuICAgICAgICBtb2RlbCA9IGF3YWl0IHRoaXMuZmV0Y2hNb2RlbEFuZENvcHlUb1dhc21NZW1vcnkocGF0aE9yQnVmZmVyKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbW9kZWwgPSBwYXRoT3JCdWZmZXI7XG4gICAgfVxuXG4gICAgW3RoaXMuc2Vzc2lvbklkLCB0aGlzLmlucHV0TmFtZXMsIHRoaXMub3V0cHV0TmFtZXMsIHRoaXMuaW5wdXRNZXRhZGF0YSwgdGhpcy5vdXRwdXRNZXRhZGF0YV0gPSBhd2FpdCBjcmVhdGVTZXNzaW9uKFxuICAgICAgbW9kZWwsXG4gICAgICBvcHRpb25zLFxuICAgICk7XG4gICAgVFJBQ0VfRlVOQ19FTkQoKTtcbiAgfVxuXG4gIGFzeW5jIGRpc3Bvc2UoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIHJlbGVhc2VTZXNzaW9uKHRoaXMuc2Vzc2lvbklkKTtcbiAgfVxuXG4gIGFzeW5jIHJ1bihcbiAgICBmZWVkczogU2Vzc2lvbkhhbmRsZXIuRmVlZHNUeXBlLFxuICAgIGZldGNoZXM6IFNlc3Npb25IYW5kbGVyLkZldGNoZXNUeXBlLFxuICAgIG9wdGlvbnM6IEluZmVyZW5jZVNlc3Npb24uUnVuT3B0aW9ucyxcbiAgKTogUHJvbWlzZTxTZXNzaW9uSGFuZGxlci5SZXR1cm5UeXBlPiB7XG4gICAgVFJBQ0VfRlVOQ19CRUdJTigpO1xuICAgIGNvbnN0IGlucHV0QXJyYXk6IFRlbnNvcltdID0gW107XG4gICAgY29uc3QgaW5wdXRJbmRpY2VzOiBudW1iZXJbXSA9IFtdO1xuICAgIE9iamVjdC5lbnRyaWVzKGZlZWRzKS5mb3JFYWNoKChrdnApID0+IHtcbiAgICAgIGNvbnN0IG5hbWUgPSBrdnBbMF07XG4gICAgICBjb25zdCB0ZW5zb3IgPSBrdnBbMV07XG4gICAgICBjb25zdCBpbmRleCA9IHRoaXMuaW5wdXROYW1lcy5pbmRleE9mKG5hbWUpO1xuICAgICAgaWYgKGluZGV4ID09PSAtMSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgaW5wdXQgJyR7bmFtZX0nYCk7XG4gICAgICB9XG4gICAgICBpbnB1dEFycmF5LnB1c2godGVuc29yKTtcbiAgICAgIGlucHV0SW5kaWNlcy5wdXNoKGluZGV4KTtcbiAgICB9KTtcblxuICAgIGNvbnN0IG91dHB1dEFycmF5OiBBcnJheTxUZW5zb3IgfCBudWxsPiA9IFtdO1xuICAgIGNvbnN0IG91dHB1dEluZGljZXM6IG51bWJlcltdID0gW107XG4gICAgT2JqZWN0LmVudHJpZXMoZmV0Y2hlcykuZm9yRWFjaCgoa3ZwKSA9PiB7XG4gICAgICBjb25zdCBuYW1lID0ga3ZwWzBdO1xuICAgICAgY29uc3QgdGVuc29yID0ga3ZwWzFdO1xuICAgICAgY29uc3QgaW5kZXggPSB0aGlzLm91dHB1dE5hbWVzLmluZGV4T2YobmFtZSk7XG4gICAgICBpZiAoaW5kZXggPT09IC0xKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCBvdXRwdXQgJyR7bmFtZX0nYCk7XG4gICAgICB9XG4gICAgICBvdXRwdXRBcnJheS5wdXNoKHRlbnNvcik7XG4gICAgICBvdXRwdXRJbmRpY2VzLnB1c2goaW5kZXgpO1xuICAgIH0pO1xuXG4gICAgY29uc3QgaW5wdXRzID0gaW5wdXRBcnJheS5tYXAoKHQsIGkpID0+XG4gICAgICBlbmNvZGVUZW5zb3JNZXRhZGF0YSh0LCAoKSA9PiBgaW5wdXQgXCIke3RoaXMuaW5wdXROYW1lc1tpbnB1dEluZGljZXNbaV1dfVwiYCksXG4gICAgKTtcbiAgICBjb25zdCBvdXRwdXRzID0gb3V0cHV0QXJyYXkubWFwKCh0LCBpKSA9PlxuICAgICAgdCA/IGVuY29kZVRlbnNvck1ldGFkYXRhKHQsICgpID0+IGBvdXRwdXQgXCIke3RoaXMub3V0cHV0TmFtZXNbb3V0cHV0SW5kaWNlc1tpXV19XCJgKSA6IG51bGwsXG4gICAgKTtcblxuICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBydW4odGhpcy5zZXNzaW9uSWQsIGlucHV0SW5kaWNlcywgaW5wdXRzLCBvdXRwdXRJbmRpY2VzLCBvdXRwdXRzLCBvcHRpb25zKTtcblxuICAgIGNvbnN0IHJlc3VsdE1hcDogU2Vzc2lvbkhhbmRsZXIuUmV0dXJuVHlwZSA9IHt9O1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmVzdWx0cy5sZW5ndGg7IGkrKykge1xuICAgICAgcmVzdWx0TWFwW3RoaXMub3V0cHV0TmFtZXNbb3V0cHV0SW5kaWNlc1tpXV1dID0gb3V0cHV0QXJyYXlbaV0gPz8gZGVjb2RlVGVuc29yTWV0YWRhdGEocmVzdWx0c1tpXSk7XG4gICAgfVxuICAgIFRSQUNFX0ZVTkNfRU5EKCk7XG4gICAgcmV0dXJuIHJlc3VsdE1hcDtcbiAgfVxuXG4gIHN0YXJ0UHJvZmlsaW5nKCk6IHZvaWQge1xuICAgIC8vIFRPRE86IGltcGxlbWVudCBwcm9maWxpbmdcbiAgfVxuXG4gIGVuZFByb2ZpbGluZygpOiB2b2lkIHtcbiAgICB2b2lkIGVuZFByb2ZpbGluZyh0aGlzLnNlc3Npb25JZCk7XG4gIH1cbn1cbiIsICIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cblxuaW1wb3J0IHsgQmFja2VuZCwgZW52LCBJbmZlcmVuY2VTZXNzaW9uLCBJbmZlcmVuY2VTZXNzaW9uSGFuZGxlciB9IGZyb20gJ29ubnhydW50aW1lLWNvbW1vbic7XG5cbmltcG9ydCB7IGluaXRpYWxpemVPcnRFcCwgaW5pdGlhbGl6ZVdlYkFzc2VtYmx5QW5kT3J0UnVudGltZSB9IGZyb20gJy4vd2FzbS9wcm94eS13cmFwcGVyJztcbmltcG9ydCB7IE9ubnhydW50aW1lV2ViQXNzZW1ibHlTZXNzaW9uSGFuZGxlciB9IGZyb20gJy4vd2FzbS9zZXNzaW9uLWhhbmRsZXItaW5mZXJlbmNlJztcblxuLyoqXG4gKiBUaGlzIGZ1bmN0aW9uIGluaXRpYWxpemVzIGFsbCBmbGFncyBmb3IgV2ViQXNzZW1ibHkuXG4gKlxuICogVGhvc2UgZmxhZ3MgYXJlIGFjY2Vzc2libGUgZnJvbSBgb3J0LmVudi53YXNtYC4gVXNlcnMgYXJlIGFsbG93IHRvIHNldCB0aG9zZSBmbGFncyBiZWZvcmUgdGhlIGZpcnN0IGluZmVyZW5jZSBzZXNzaW9uXG4gKiBiZWluZyBjcmVhdGVkLCB0byBvdmVycmlkZSBkZWZhdWx0IHZhbHVlLlxuICovXG5leHBvcnQgY29uc3QgaW5pdGlhbGl6ZUZsYWdzID0gKCk6IHZvaWQgPT4ge1xuICBpZiAodHlwZW9mIGVudi53YXNtLmluaXRUaW1lb3V0ICE9PSAnbnVtYmVyJyB8fCBlbnYud2FzbS5pbml0VGltZW91dCA8IDApIHtcbiAgICBlbnYud2FzbS5pbml0VGltZW91dCA9IDA7XG4gIH1cblxuICBjb25zdCBzaW1kID0gZW52Lndhc20uc2ltZDtcbiAgaWYgKHR5cGVvZiBzaW1kICE9PSAnYm9vbGVhbicgJiYgc2ltZCAhPT0gdW5kZWZpbmVkICYmIHNpbWQgIT09ICdmaXhlZCcgJiYgc2ltZCAhPT0gJ3JlbGF4ZWQnKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLndhcm4oXG4gICAgICBgUHJvcGVydHkgXCJlbnYud2FzbS5zaW1kXCIgaXMgc2V0IHRvIHVua25vd24gdmFsdWUgXCIke3NpbWR9XCIuIFJlc2V0IGl0IHRvIFxcYGZhbHNlXFxgIGFuZCBpZ25vcmUgU0lNRCBmZWF0dXJlIGNoZWNraW5nLmAsXG4gICAgKTtcbiAgICBlbnYud2FzbS5zaW1kID0gZmFsc2U7XG4gIH1cblxuICBpZiAodHlwZW9mIGVudi53YXNtLnByb3h5ICE9PSAnYm9vbGVhbicpIHtcbiAgICBlbnYud2FzbS5wcm94eSA9IGZhbHNlO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBlbnYud2FzbS50cmFjZSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgZW52Lndhc20udHJhY2UgPSBmYWxzZTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgZW52Lndhc20ubnVtVGhyZWFkcyAhPT0gJ251bWJlcicgfHwgIU51bWJlci5pc0ludGVnZXIoZW52Lndhc20ubnVtVGhyZWFkcykgfHwgZW52Lndhc20ubnVtVGhyZWFkcyA8PSAwKSB7XG4gICAgLy8gVGhlIGZvbGxvd2luZyBsb2dpYyBvbmx5IGFwcGxpZXMgd2hlbiBgb3J0LmVudi53YXNtLm51bVRocmVhZHNgIGlzIG5vdCBzZXQgYnkgdXNlci4gV2Ugd2lsbCBhbHdheXMgaG9ub3IgdXNlcidzXG4gICAgLy8gc2V0dGluZyBpZiBpdCBpcyBwcm92aWRlZC5cblxuICAgIC8vIEJyb3dzZXI6IHdoZW4gY3Jvc3NPcmlnaW5Jc29sYXRlZCBpcyBmYWxzZSwgU2hhcmVkQXJyYXlCdWZmZXIgaXMgbm90IGF2YWlsYWJsZSBzbyBXZWJBc3NlbWJseSB0aHJlYWRzIHdpbGwgbm90XG4gICAgLy8gd29yay4gSW4gdGhpcyBjYXNlLCB3ZSB3aWxsIHNldCBudW1UaHJlYWRzIHRvIDEuXG4gICAgLy9cbiAgICAvLyBUaGVyZSBpcyBhbiBleGNlcHRpb246IHdoZW4gdGhlIGJyb3dzZXIgaXMgY29uZmlndXJlZCB0byBmb3JjZS1lbmFibGUgU2hhcmVkQXJyYXlCdWZmZXIgKGUuZy4gQ2hyb211aW0gd2l0aFxuICAgIC8vIC0tZW5hYmxlLWZlYXR1cmVzPVNoYXJlZEFycmF5QnVmZmVyKSwgaXQgaXMgcG9zc2libGUgdGhhdCBgc2VsZi5jcm9zc09yaWdpbklzb2xhdGVkYCBpcyBmYWxzZSBhbmRcbiAgICAvLyBTaGFyZWRBcnJheUJ1ZmZlciBpcyBhdmFpbGFibGUgYXQgdGhlIHNhbWUgdGltZS4gVGhpcyBpcyB1c3VhbGx5IGZvciB0ZXN0aW5nLiBJbiB0aGlzIGNhc2UsICB3ZSB3aWxsIHN0aWxsIHNldFxuICAgIC8vIG51bVRocmVhZHMgdG8gMSBoZXJlLiBJZiB3ZSB3YW50IHRvIGVuYWJsZSBtdWx0aS10aHJlYWRpbmcgaW4gdGVzdCwgd2Ugc2hvdWxkIHNldCBgb3J0LmVudi53YXNtLm51bVRocmVhZHNgIHRvIGFcbiAgICAvLyB2YWx1ZSBncmVhdGVyIHRoYW4gMS5cbiAgICBpZiAodHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnICYmICFzZWxmLmNyb3NzT3JpZ2luSXNvbGF0ZWQpIHtcbiAgICAgIGVudi53YXNtLm51bVRocmVhZHMgPSAxO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBudW1DcHVMb2dpY2FsQ29yZXMgPVxuICAgICAgICB0eXBlb2YgbmF2aWdhdG9yID09PSAndW5kZWZpbmVkJyA/IHJlcXVpcmUoJ25vZGU6b3MnKS5jcHVzKCkubGVuZ3RoIDogbmF2aWdhdG9yLmhhcmR3YXJlQ29uY3VycmVuY3k7XG4gICAgICBlbnYud2FzbS5udW1UaHJlYWRzID0gTWF0aC5taW4oNCwgTWF0aC5jZWlsKChudW1DcHVMb2dpY2FsQ29yZXMgfHwgMSkgLyAyKSk7XG4gICAgfVxuICB9XG59O1xuXG5leHBvcnQgY2xhc3MgT25ueHJ1bnRpbWVXZWJBc3NlbWJseUJhY2tlbmQgaW1wbGVtZW50cyBCYWNrZW5kIHtcbiAgLyoqXG4gICAqIFRoaXMgZnVuY3Rpb24gaW5pdGlhbGl6ZXMgdGhlIFdlYkFzc2VtYmx5IGJhY2tlbmQuXG4gICAqXG4gICAqIFRoaXMgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgb25seSBvbmNlIGZvciBlYWNoIGJhY2tlbmQgbmFtZS4gSXQgd2lsbCBiZSBjYWxsZWQgdGhlIGZpcnN0IHRpbWUgd2hlblxuICAgKiBgb3J0LkluZmVyZW5jZVNlc3Npb24uY3JlYXRlKClgIGlzIGNhbGxlZCB3aXRoIGEgcmVnaXN0ZXJlZCBiYWNrZW5kIG5hbWUuXG4gICAqXG4gICAqIEBwYXJhbSBiYWNrZW5kTmFtZSAtIHRoZSByZWdpc3RlcmVkIGJhY2tlbmQgbmFtZS5cbiAgICovXG4gIGFzeW5jIGluaXQoYmFja2VuZE5hbWU6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIC8vIHBvcHVsYXRlIHdhc20gZmxhZ3NcbiAgICBpbml0aWFsaXplRmxhZ3MoKTtcblxuICAgIC8vIGluaXQgd2FzbVxuICAgIGF3YWl0IGluaXRpYWxpemVXZWJBc3NlbWJseUFuZE9ydFJ1bnRpbWUoKTtcblxuICAgIC8vIHBlcmZvcm1lIEVQIHNwZWNpZmljIGluaXRpYWxpemF0aW9uXG4gICAgYXdhaXQgaW5pdGlhbGl6ZU9ydEVwKGJhY2tlbmROYW1lKTtcbiAgfVxuICBjcmVhdGVJbmZlcmVuY2VTZXNzaW9uSGFuZGxlcihcbiAgICBwYXRoOiBzdHJpbmcsXG4gICAgb3B0aW9ucz86IEluZmVyZW5jZVNlc3Npb24uU2Vzc2lvbk9wdGlvbnMsXG4gICk6IFByb21pc2U8SW5mZXJlbmNlU2Vzc2lvbkhhbmRsZXI+O1xuICBjcmVhdGVJbmZlcmVuY2VTZXNzaW9uSGFuZGxlcihcbiAgICBidWZmZXI6IFVpbnQ4QXJyYXksXG4gICAgb3B0aW9ucz86IEluZmVyZW5jZVNlc3Npb24uU2Vzc2lvbk9wdGlvbnMsXG4gICk6IFByb21pc2U8SW5mZXJlbmNlU2Vzc2lvbkhhbmRsZXI+O1xuICBhc3luYyBjcmVhdGVJbmZlcmVuY2VTZXNzaW9uSGFuZGxlcihcbiAgICBwYXRoT3JCdWZmZXI6IHN0cmluZyB8IFVpbnQ4QXJyYXksXG4gICAgb3B0aW9ucz86IEluZmVyZW5jZVNlc3Npb24uU2Vzc2lvbk9wdGlvbnMsXG4gICk6IFByb21pc2U8SW5mZXJlbmNlU2Vzc2lvbkhhbmRsZXI+IHtcbiAgICBjb25zdCBoYW5kbGVyID0gbmV3IE9ubnhydW50aW1lV2ViQXNzZW1ibHlTZXNzaW9uSGFuZGxlcigpO1xuICAgIGF3YWl0IGhhbmRsZXIubG9hZE1vZGVsKHBhdGhPckJ1ZmZlciwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIGhhbmRsZXI7XG4gIH1cbn1cblxuZXhwb3J0IGNvbnN0IHdhc21CYWNrZW5kID0gbmV3IE9ubnhydW50aW1lV2ViQXNzZW1ibHlCYWNrZW5kKCk7XG4iLCAiLy8gQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG5cbi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby12YXItcmVxdWlyZXMsIEB0eXBlc2NyaXB0LWVzbGludC9uby1yZXF1aXJlLWltcG9ydHMgKi9cblxuLy8gV2UgdXNlIFwicmVxdWlyZVwiIGluc3RlYWQgb2YgXCJpbXBvcnRcIiBoZXJlIGJlY2F1c2UgaW1wb3J0IHN0YXRlbWVudCBtdXN0IGJlIHB1dCBpbiB0b3AgbGV2ZWwuIE91ciBjdXJyZW50IGNvZGUgZG9lc1xuLy8gbm90IGFsbG93IGJ1bmRsZXIgdG8gdHJlZS1zaGFraW5nIGNvZGUgYXMgZXhwZWN0ZWQgYmVjYXVzZSBzb21lIGNvZGVzIGFyZSB0cmVhdGVkIGFzIGhhdmluZyBzaWRlIGVmZmVjdHMuXG4vLyBTbyB3ZSBpbXBvcnQgY29kZSBpbnNpZGUgdGhlIGlmLWNsYXVzZSB0byBhbGxvdyBidW5kbGVyIHJlbW92ZSB0aGUgY29kZSBzYWZlbHkuXG5cbmV4cG9ydCAqIGZyb20gJ29ubnhydW50aW1lLWNvbW1vbic7XG5pbXBvcnQgKiBhcyBvcnQgZnJvbSAnb25ueHJ1bnRpbWUtY29tbW9uJztcbmV4cG9ydCBkZWZhdWx0IG9ydDtcblxuaW1wb3J0IHsgcmVnaXN0ZXJCYWNrZW5kLCBlbnYgfSBmcm9tICdvbm54cnVudGltZS1jb21tb24nO1xuaW1wb3J0IHsgdmVyc2lvbiB9IGZyb20gJy4vdmVyc2lvbic7XG5cbmlmICghQlVJTERfREVGUy5ESVNBQkxFX1dFQkdMKSB7XG4gIGNvbnN0IG9ubnhqc0JhY2tlbmQgPSByZXF1aXJlKCcuL2JhY2tlbmQtb25ueGpzJykub25ueGpzQmFja2VuZDtcbiAgcmVnaXN0ZXJCYWNrZW5kKCd3ZWJnbCcsIG9ubnhqc0JhY2tlbmQsIC0xMCk7XG59XG5cbmlmICghQlVJTERfREVGUy5ESVNBQkxFX0pTRVAgJiYgIUJVSUxEX0RFRlMuRElTQUJMRV9XRUJHUFUpIHtcbiAgdGhyb3cgbmV3IEVycm9yKFxuICAgICdUaGUgY3VycmVudCBidWlsZCBpcyBzcGVjaWZpZWQgdG8gZW5hYmxlIGJvdGggSlNFUCBhbmQgV2ViR1BVIEVQLiBUaGlzIGlzIG5vdCBhIHZhbGlkIGNvbmZpZ3VyYXRpb24uICcgK1xuICAgICAgJ0pTRVAgYW5kIFdlYkdQVSBFUHMgY2Fubm90IGJlIGVuYWJsZWQgYXQgdGhlIHNhbWUgdGltZS4nLFxuICApO1xufVxuXG5pZiAoIUJVSUxEX0RFRlMuRElTQUJMRV9XRUJOTiAmJiBCVUlMRF9ERUZTLkRJU0FCTEVfSlNFUCAmJiBCVUlMRF9ERUZTLkRJU0FCTEVfV0VCR1BVKSB7XG4gIHRocm93IG5ldyBFcnJvcihcbiAgICAnVGhlIGN1cnJlbnQgYnVpbGQgaXMgc3BlY2lmaWVkIHRvIGVuYWJsZSBXZWJOTiBFUCB3aXRob3V0IEpTRVAgb3IgV2ViR1BVIEVQLiBUaGlzIGlzIG5vdCBhIHZhbGlkIGNvbmZpZ3VyYXRpb24uICcgK1xuICAgICAgJ1dlYk5OIEVQIHJlcXVpcmVzIGVpdGhlciBKU0VQIG9yIFdlYkdQVSBFUCB0byBiZSBlbmFibGVkLicsXG4gICk7XG59XG5cbmlmICghQlVJTERfREVGUy5ESVNBQkxFX1dBU00pIHtcbiAgY29uc3Qgd2FzbUJhY2tlbmQgPSByZXF1aXJlKCcuL2JhY2tlbmQtd2FzbScpLndhc21CYWNrZW5kO1xuICBpZiAoIUJVSUxEX0RFRlMuRElTQUJMRV9KU0VQIHx8ICFCVUlMRF9ERUZTLkRJU0FCTEVfV0VCR1BVKSB7XG4gICAgcmVnaXN0ZXJCYWNrZW5kKCd3ZWJncHUnLCB3YXNtQmFja2VuZCwgNSk7XG4gIH1cbiAgaWYgKCFCVUlMRF9ERUZTLkRJU0FCTEVfV0VCTk4pIHtcbiAgICByZWdpc3RlckJhY2tlbmQoJ3dlYm5uJywgd2FzbUJhY2tlbmQsIDUpO1xuICB9XG4gIHJlZ2lzdGVyQmFja2VuZCgnY3B1Jywgd2FzbUJhY2tlbmQsIDEwKTtcbiAgcmVnaXN0ZXJCYWNrZW5kKCd3YXNtJywgd2FzbUJhY2tlbmQsIDEwKTtcbn1cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGVudi52ZXJzaW9ucywgJ3dlYicsIHsgdmFsdWU6IHZlcnNpb24sIGVudW1lcmFibGU6IHRydWUgfSk7XG4iLCAiLy8gQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG5cbi8vIFRoaXMgZmlsZSBpcyBnZW5lcmF0ZWQgYnkgL2pzL3NjcmlwdHMvdXBkYXRlLXZlcnNpb24udHNcbi8vIERvIG5vdCBtb2RpZnkgZmlsZSBjb250ZW50IG1hbnVhbGx5LlxuXG5leHBvcnQgY29uc3QgdmVyc2lvbiA9ICcxLjI2LjAnO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxNQWdCTSxVQUNBLDBCQVlPLGlCQXdDUCxnQ0F3Q087QUE3R2I7OztBQWdCQSxNQUFNLFdBQXFDLG9CQUFJLElBQUc7QUFDbEQsTUFBTSwyQkFBcUMsQ0FBQTtBQVlwQyxNQUFNLGtCQUFrQixDQUFDLE1BQWMsU0FBa0IsYUFBMEI7QUFDeEYsWUFBSSxXQUFXLE9BQU8sUUFBUSxTQUFTLGNBQWMsT0FBTyxRQUFRLGtDQUFrQyxZQUFZO0FBQ2hILGdCQUFNLGlCQUFpQixTQUFTLElBQUksSUFBSTtBQUN4QyxjQUFJLG1CQUFtQixRQUFXO0FBQ2hDLHFCQUFTLElBQUksTUFBTSxFQUFFLFNBQVMsU0FBUSxDQUFFO3FCQUMvQixlQUFlLFdBQVcsVUFBVTtBQUU3QztxQkFD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IiwgImVudiIsICJGbG9hdDE2QXJyYXkiLCAiVGVuc29yIiwgIlRlbnNvciIsICJJbmZlcmVuY2VTZXNzaW9uIiwgIkluZmVyZW5jZVNlc3Npb24iLCAiVGVuc29yIiwgImVudiIsICJlbnYiLCAid2FzbSIsICJ3YXNtIiwgIndhc20iLCAibG9jYXRpb24iLCAidGVuc29yIiwgImVudiIsICJtbENvbnRleHRJbmRleCIsICJ3YXNtIiwgImVudiIsICJ3YXNtIiwgImxvY2F0aW9uIiwgImluZGV4IiwgInRlbnNvciIsICJlcnJvckNvZGUiLCAiaSIsICJpbml0aWFsaXppbmciLCAiaW5pdGlhbGl6ZWQiLCAiYWJvcnRlZCIsICJjb3B5RnJvbUV4dGVybmFsQnVmZmVyIiwgImNyZWF0ZVNlc3Npb24iLCAicmVsZWFzZVNlc3Npb24iLCAicnVuIiwgImVuZFByb2ZpbGluZyIsICJlbnYiLCAiVGVuc29yIiwgImNvcHlGcm9tRXh0ZXJuYWxCdWZmZXIiLCAiY3JlYXRlU2Vzc2lvbiIsICJyZWxlYXNlU2Vzc2lvbiIsICJydW4iLCAiZW5kUHJvZmlsaW5nIiwgImVudiIsICJJbmZlcmVuY2VTZXNzaW9uIiwgIlRlbnNvciIsICJlbnYiLCAidmVyc2lvbiIsICJ3YXNtQmFja2VuZCIsICJlbnYiLCAidmVyc2lvbiJdCn0K
