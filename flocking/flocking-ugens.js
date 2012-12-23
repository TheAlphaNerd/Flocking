/*
* Flocking Unit Generators
* http://github.com/colinbdclark/flocking
*
* Copyright 2011, Colin Clark
* Dual licensed under the MIT and GPL Version 2 licenses.
*/

/*global Float32Array, window, Mike, jQuery*/
/*jslint white: true, vars: true, undef: true, newcap: true, regexp: true, browser: true,
    forin: true, nomen: true, bitwise: true, maxerr: 100, indent: 4 */

var flock = flock || {};

(function ($) {
    "use strict";

    /*************
     * Utilities *
     *************/
    
    flock.aliasUGen = function (sourcePath, aliasName, inputDefaults, defaultOptions) {
        var root = flock.get(undefined, sourcePath);
        flock.set(root, aliasName, function (inputs, output, options) {
            options = $.extend(true, {}, defaultOptions, options);
            return root(inputs, output, options);
        });
        flock.defaults(sourcePath + "." + aliasName, inputDefaults);
    };
    
    flock.aliasUGens = function (sourcePath, aliasesSpec) {
        var aliasName,
            settings;
            
        for (aliasName in aliasesSpec) {
            settings = aliasesSpec[aliasName];
            flock.aliasUGen(sourcePath, aliasName, {inputs: settings.inputDefaults}, settings.options);
        }
    };
    
    flock.krMul = function (numSamps, output, mulInput, addInput) {
        var mul = mulInput.output[0],
            i;
        for (i = 0; i < numSamps; i++) {
            output[i] = output[i] * mul;
        }
    };
    
    flock.mul = function (numSamps, output, mulInput, addInput) {
        var mul = mulInput.output,
            i;
        for (i = 0; i < numSamps; i++) {
            output[i] = output[i] * mul[i];
        }
    };
    
    flock.krAdd = function (numSamps, output, mulInput, addInput) {
        var add = addInput.output[0],
            i;
        for (i = 0; i < numSamps; i++) {
            output[i] = output[i] + add;
        }
    };
    
    flock.add = function (numSamps, output, mulInput, addInput) {
        var add = addInput.output,
            i;
        for (i = 0; i < numSamps; i++) {
            output[i] = output[i] + add[i];
        }
    };
    
    flock.krMulAdd = function (numSamps, output, mulInput, addInput) {
        var mul = mulInput.output[0],
            add = addInput.output,
            i;
        for (i = 0; i < numSamps; i++) {
            output[i] = output[i] * mul + add[i];
        }
    };
    
    flock.mulKrAdd = function (numSamps, output, mulInput, addInput) {
        var mul = mulInput.output,
            add = addInput.output[0],
            i;
        for (i = 0; i < numSamps; i++) {
            output[i] = output[i] * mul[i] + add;
        }
    };
    
    flock.krMulKrAdd = function (numSamps, output, mulInput, addInput) {
        var mul = mulInput.output[0],
            add = addInput.output[0],
            i;
        for (i = 0; i < numSamps; i++) {
            output[i] = output[i] * mul + add;
        }
    };
    
    flock.mulAdd = function (numSamps, output, mulInput, addInput) {
        var mul = mulInput.output,
            add = addInput.output,
            i;
        for (i = 0; i < numSamps; i++) {
            output[i] = output[i] * mul[i] + add[i];
        }
    };
    
    flock.onMulAddInputChanged = function (that) {
        var mul = that.inputs.mul,
            add = that.inputs.add,
            fn;
        
        // If we have no mul or add inputs, bail immediately.
        if (!mul && !add) {
            that.mulAdd = flock.identity;
            return;
        }
    
        if (!mul) { // Only add.
            fn = add.rate !== flock.rates.AUDIO ? flock.krAdd : flock.add;
        } else if (!add) { // Only mul.
            fn = mul.rate !== flock.rates.AUDIO ? flock.krMul : flock.mul;
        } else { // Both mul and add.
            fn = mul.rate !== flock.rates.AUDIO ? 
                (add.rate !== flock.rates.AUDIO ? flock.krMulKrAdd : flock.krMulAdd) :
                (add.rate !== flock.rates.AUDIO ? flock.mulKrAdd : flock.mulAdd);
        }
        
        that.mulAdd = function (numSamps) {
            fn(numSamps, that.output, mul, add);
        };
    };
    
    /*******************
     * Unit Generators *
     *******************/
     
    flock.ugen = function (inputs, output, options) {
        options = options || {};
    
        var that = {
            rate: options.rate || flock.rates.AUDIO,
            inputs: inputs,
            output: output,
            options: options,
            model: {}
        };
        
        that.options.audioSettings = that.options.audioSettings || flock.enviro.shared.audioSettings;
        that.model.sampleRate = options.sampleRate || that.options.audioSettings.rates[that.rate];
        
        that.get = function (path) {
            return flock.input.get(that.inputs, path);
        };

        /**
         * Sets the value of the input at the specified path.
         *
         * @param {String} path the inputs's path relative to this ugen
         * @param {Number || UGenDef} val a scalar value (for Value ugens) or a UGenDef object
         * @return {UGen} the newly-created UGen that was set at the specified path
         */
        that.set = function (path, val, swap) {
            return flock.input.set(that.inputs, path, val, that, function (ugenDef) {
                return flock.parse.ugenDef(ugenDef, that.options.audioSettings.rates);
            });
        };
        
        /**
         * Gets or sets the named unit generator input.
         *
         * @param {String} path the input path
         * @param {UGenDef} val [optional] a scalar value, ugenDef, or array of ugenDefs that will be assigned to the specified input name
         * @return {Number|UGen} a scalar value in the case of a value ugen, otherwise the ugen itself
         */
        that.input = function (path, val) {
            return !path ? undefined : typeof (path) === "string" ?
                arguments.length < 2 ? that.get(path) : that.set(path, val) :
                flock.isIterable(path) ? that.get(path) : that.set(path, val);
        };
    
        that.onInputChanged = flock.identity; // No-op base implementation.
        return that;
    };
    

    flock.ugen.value = function (inputs, output, options) {
        var that = flock.ugen(inputs, output, options);
        that.output[0] = that.model.value = inputs.value;
        return that;
    };
    
    flock.defaults("flock.ugen.value", {
        rate: "constant"
    });


    flock.ugen.sum = function (inputs, output, options) {
        var that = flock.ugen(inputs, output, options);
        
        that.sumGen = function (numSamps) {
            var sources = that.inputs.sources,
                out = that.output,
                i,
                sourceIdx,
                sum;
                
            for (i = 0; i < numSamps; i++) {
                sum = 0;
                for (sourceIdx = 0; sourceIdx < sources.length; sourceIdx++) {
                    sum += sources[sourceIdx].output[i];
                }
                out[i] = sum;
            }
        };
        
        that.onInputChanged = function () {
            if (typeof (that.inputs.sources.length) === "number") {
                // We have an array of sources that need to be summed.
                that.gen = that.sumGen;
            } else {
                that.output = that.inputs.sources.output;
                that.gen = flock.identity;
            }
        };
        
        that.onInputChanged();
        return that;
    };
    
    flock.defaults("flock.ugen.sum", {
        rate: "audio"
    });
    
    
    /***************
     * Oscillators *
     ***************/
     
    flock.ugen.osc = function (inputs, output, options) {
        var that = flock.ugen(inputs, output, options);
        that.model.phase = 0.0;

        that.gen = function (numSamps) {
            var m = that.model,
                inputs = that.inputs,
                freq = inputs.freq.output,
                phaseOffset = inputs.phase.output,
                table = inputs.table,
                tableLen = m.tableLen,
                tableIncHz = m.tableIncHz,
                tableIncRad = m.tableIncRad,
                output = that.output,
                phase = m.phase,
                phaseInc = m.phaseInc,
                freqInc = m.freqInc,
                i,
                j,
                k,
                idx;

            for (i = 0, j = 0, k = 0; i < numSamps; i++, j += phaseInc, k += freqInc) {
                idx = Math.round(phase + phaseOffset[j] * tableIncRad);
                if (idx >= tableLen) {
                    idx -= tableLen;
                } else if (idx < 0) {
                    idx += tableLen;
                }
                output[i] = table[idx];
                phase += freq[k] * tableIncHz;
                if (phase >= tableLen) {
                    phase -= tableLen;
                } else if (phase < 0) {
                    phase += tableLen;
                }
            }

            m.phase = phase;
            that.mulAdd(numSamps);
        };

        that.onInputChanged = function () {
            flock.ugen.osc.onInputChanged(that);
            
            // Precalculate table-related values.
            var m = that.model;
            m.tableLen = that.inputs.table.length;
            m.tableIncHz = m.tableLen / m.sampleRate;
            m.tableIncRad =  m.tableLen / flock.TWOPI;
        };
    
        that.onInputChanged();
        return that;
    };

    flock.ugen.osc.onInputChanged = function (that) {
        var m = that.model,
            inputs = that.inputs;
        
        m.freqInc = inputs.freq.rate === flock.rates.AUDIO ? 1 : 0;
        m.phaseInc = inputs.phase.rate === flock.rates.AUDIO ? 1 : 0;
        
        flock.onMulAddInputChanged(that);
    };
    
    flock.defaults("flock.ugen.osc", {
        rate: "audio",
        inputs: {
            freq: 440.0,
            phase: 0.0
        }
    });

    flock.ugen.osc.define = function (name, tableFillFn) {
        var lastSegIdx = name.lastIndexOf("."),
            namespace = name.substring(0, lastSegIdx),
            oscName = name.substring(lastSegIdx + 1),
            namespaceObj = flock.get(undefined, namespace);
        
        namespaceObj[oscName] = function (inputs, output, options) {
            var defaultSettings = flock.defaults("flock.audioSettings"),
                size = (options && options.tableSize) || defaultSettings.tableSize,
                scale = flock.TWOPI / size;
            inputs.table = tableFillFn(size, scale);
            return flock.ugen.osc(inputs, output, options);
        };
        
        flock.defaults(name, flock.defaults("flock.ugen.osc"));
    };
    
    
    flock.ugen.osc.define("flock.ugen.sinOsc", function (size, scale) {
        return flock.generate(size, function (i) {
            return Math.sin(i * scale);
        });
    });

    flock.ugen.osc.fourierTable = function (size, scale, numHarms, phase, amps) {
        phase *= flock.TWOPI;
        
        return flock.generate(size, function (i) {
            var harm,
                amp,
                w,
                val = 0.0;
                
            for (harm = 0; harm < numHarms; harm++) {
                amp = amps ? amps[harm] : 1.0;
                w = (harm + 1) * (i * scale);
                val += amp * Math.cos(w + phase);
            }
            
            return val;
        });
    };
    
    flock.ugen.osc.normalizedFourierTable = function (size, scale, numHarms, phase, ampGenFn) {
        var amps = flock.generate(numHarms, function (harm) {
            return ampGenFn(harm + 1); // Indexed harmonics from 1 instead of 0.
        });
        
        var table = flock.ugen.osc.fourierTable(size, scale, numHarms, phase, amps);
        return flock.normalize(table);
    };
    
    flock.ugen.osc.define("flock.ugen.triOsc", function (size, scale) {
        return flock.ugen.osc.normalizedFourierTable(size, scale, 1000, 1.0, function (harm) {
            // Only odd harmonics with amplitudes decreasing by the inverse square of the harmonic number
            return harm % 2 === 0 ? 0.0 : 1.0 / (harm * harm);
        });
    });
    
    flock.ugen.osc.define("flock.ugen.sawOsc", function (size, scale) {
        return flock.ugen.osc.normalizedFourierTable(size, scale, 10, -0.25, function (harm) {
            // All harmonics with amplitudes decreasing by the inverse of the harmonic number
            return 1.0 / harm;
        });
    });
    
    flock.ugen.osc.define("flock.ugen.squareOsc", function (size, scale) {
        return flock.ugen.osc.normalizedFourierTable(size, scale, 10, -0.25, function (harm) {
            // Only odd harmonics with amplitudes decreasing by the inverse of the harmonic number
            return harm % 2 === 0 ? 0.0 : 1.0 / harm;
        });
    });


    flock.ugen.sin = function (inputs, output, options) {
        var that = flock.ugen(inputs, output, options);
        that.model.phase = 0.0;
    
        that.gen = function (numSamps) {
            var m = that.model,
                freq = that.inputs.freq.output,
                phaseOffset = that.inputs.phase.output,
                freqInc = m.freqInc,
                phaseInc = m.phaseInc,
                out = that.output,
                phase = m.phase,
                sampleRate = m.sampleRate,
                i,
                j,
                k;

            for (i = 0, j = 0, k = 0; i < numSamps; i++, j += phaseInc, k += freqInc) {
                out[i] = Math.sin(phase + phaseOffset[j]);
                phase += freq[k] / sampleRate * flock.TWOPI;
            }

            m.phase = phase;
            that.mulAdd(numSamps);
        };
    
        that.onInputChanged = function () {
            flock.ugen.osc.onInputChanged(that);
        };
    
        that.onInputChanged();
        return that;
    };
    
    flock.defaults("flock.ugen.sin", flock.defaults("flock.ugen.osc"));

    
    flock.ugen.lfSaw = function (inputs, output, options) {
        var that = flock.ugen(inputs, output, options);
        that.model.scale = 2 * (1 / options.sampleRate);
        
        that.gen = function (numSamps) {
            var m = that.model,
                freq = that.inputs.freq.output,
                freqInc = m.freqInc,
                out = that.output,
                scale = m.scale,
                phaseOffset = that.inputs.phase.output[0], // Phase is control rate
                phase = m.phase, // TODO: Prime synth graph on instantiation.
                i,
                j;

            for (i = 0, j = 0; i < numSamps; i++, j += freqInc) {
                out[i] = phase + phaseOffset;
                phase += freq[j] * scale;
                if (phase >= 1.0) { 
                    phase -= 2.0;
                } else if (phase <= -1.0) {
                    phase += 2.0;
                }
            }

            m.phase = phase;
            that.mulAdd(numSamps);
        };
        
        that.onInputChanged = function () {
            var m = that.model;
            m.freqInc = that.inputs.freq.rate === flock.rates.AUDIO ? 1 : 0;
            m.phase = 0.0;
            flock.onMulAddInputChanged(that);
        };
        
        that.onInputChanged();
        return that;
    };
    
    flock.defaults("flock.ugen.lfSaw", {
        rate: "audio",
        inputs: {
            phase: 0.0
        }
    });
    
    
    flock.ugen.lfPulse = function (inputs, output, options) {
        var that = flock.ugen(inputs, output, options);
        that.model.scale = 1 / options.sampleRate;
        
        that.gen = function (numSamps) {
            var inputs = that.inputs,
                m = that.model,
                freq = inputs.freq.output,
                freqInc = m.freqInc,
                width = inputs.width.output[0], // TODO: Are we handling width correctly here?
                out = that.output,
                scale = m.scale,
                phase = m.phase !== undefined ? m.phase : inputs.phase.output[0], // TODO: Unnecessary if we knew the synth graph had been primed.
                i,
                j;

            for (i = 0, j = 0; i < numSamps; i++, j += freqInc) {
                if (phase >= 1.0) {
                    phase -= 1.0;
                    out[i] = width < 0.5 ? 1.0 : -1.0;
                } else {
                    out[i] = phase < width ? 1.0 : -1.0;
                }
                phase += freq[j] * scale;
            }

            m.phase = phase;
            that.mulAdd(numSamps);
        };
        
        that.onInputChanged = function () {
            that.model.freqInc = that.inputs.freq.rate === flock.rates.AUDIO ? 1 : 0;
            flock.onMulAddInputChanged(that);
        };
        
        that.onInputChanged();
        return that;
    };
    
    flock.defaults("flock.ugen.lfPulse", {
        rate: "audio",
        inputs: {
            phase: 0.0,
            width: 0.5
        }
    });
    
        
    flock.ugen.impulse = function (inputs, output, options) {
        var that = flock.ugen(inputs, output, options);
        
        that.gen = function (numSamps) {
            var inputs = that.inputs,
                m = that.model,
                out = that.output,
                freq = inputs.freq.output,
                freqInc = m.freqInc,
                phaseOffset = inputs.phase.output[0],
                phase = m.phase,
                scale = m.scale,
                i,
                j,
                val;
            
            phase += phaseOffset;
            
            for (i = 0, j = 0; i < numSamps; i++, j += freqInc) {
                if (phase >= 1.0) {
                    phase -= 1.0;
                    val = 1.0;
                } else {
                    val = 0.0;
                }
                out[i] = val;
                phase += freq[j] * scale;
            }
            
            m.phase = phase - phaseOffset;
            that.mulAdd(numSamps);
        };
        
        that.onInputChanged = function () {
            var m = that.model;
            m.phase = 0.0;
            m.freqInc = that.inputs.freq.rate === "audio" ? 1 : 0;
            flock.onMulAddInputChanged(that);
        };
        
        that.init = function () {
            that.model.scale = 1.0 / that.model.sampleRate;
            that.onInputChanged();
        };

        that.init();
        return that;
    };
    
    flock.defaults("flock.ugen.impulse", {
        rate: "audio",
        inputs: {
            freq: 440,
            phase: 0.0
        }
    });
    
    // TODO: Resolve with other buffer-related code and move up to core.
    // TODO: Use a real event system.
    flock.buffer = {
        listeners: {},
        
        addListener: function (id, ugen) {
            if (!ugen.onBufferReady) {
                return;
            }
            
            var listeners = flock.buffer.listeners[id];
            if (!listeners) {
                listeners = flock.buffer.listeners[id] = [];
            }
            listeners.push(ugen);
        },
        
        fireOnce: function (id, buffer) {
            var listeners = flock.buffer.listeners[id],
                i,
                ugen;
                
            if (!listeners) {
                return;
            }
            
            // Fire onBufferReady() on each ugen listener.
            for (i = 0; i < listeners.length; i++) {
                ugen = listeners[i];
                ugen.onBufferReady(buffer, id);
            }
            
            // Clear all listeners.
            flock.buffer.listeners[name] = [];
        }
    };
    
    flock.buffer.fireReady = function (ugen, id, buffer, name, chan) {
        ugen.buffer = buffer ? buffer[chan] : ugen.buffer;
        ugen.model.name = name;
        flock.buffer.fireOnce(id, buffer);
    };
    
    flock.buffer.resolveBufferId = function (ugen, id, chan) {
        var buffer = flock.enviro.shared.buffers[id]; // TODO: Direct reference to shared environment.
        flock.buffer.addListener(id, ugen);
        if (buffer) {
            // Buffer has already been loaded.
            flock.buffer.fireReady(ugen, id, buffer, id, chan);
        }
    };
    
    // TODO: Should this be done earlier (during ugen parsing)?
    // TODO: Factor this into a ugen mixin.
    flock.buffer.resolveBufferDef = function (ugen) {
        var m = ugen.model,
            inputs = ugen.inputs,
            bufDef = m.bufDef = inputs.buffer,
            chan = inputs.channel ? inputs.channel.output[0] : 0,
            buf;

        if (typeof (bufDef) === "string") {
            flock.buffer.resolveBufferId(ugen, bufDef, chan);
        } else {
            flock.buffer.addListener(bufDef.id, ugen);
            flock.parse.bufferForDef(bufDef, function (buffer, name) {
                flock.buffer.fireReady(ugen, bufDef.id, buffer, name, chan)
            });
        }
    };
    
    /****************
     * Buffer UGens *
     ****************/
     
    flock.ugen.playBuffer = function (inputs, output, options) {
        var that = flock.ugen(inputs, output, options);
        that.model = {
            idx: 0,
            channel: undefined
        };
        
        // Start with a zeroed buffer, since the buffer input may be loaded asynchronously.
        that.buffer = new Float32Array(that.output.length); 
        
        // Optimized gen function for constant regular-speed playback.
        that.crRegularSpeedGen = function (numSamps) {
            var m = that.model,
                out = that.output,
                chan = that.inputs.channel.output[0],
                source = that.buffer,
                bufIdx = m.idx,
                bufLen = source.length,
                loop = that.inputs.loop.output[0],
                i;
            
            // If the channel has changed, update the buffer we're reading from.
            if (m.channel !== chan) {
                m.channel = chan;
                that.buffer = source = flock.enviro.shared.buffers[m.name][chan];
            }
            
            for (i = 0; i < numSamps; i++) {
                if (bufIdx >= bufLen) {
                    if (loop > 0) {
                        bufIdx = 0;
                    } else {
                        out[i] = 0.0;
                        continue;
                    }
                }
                out[i] = source[bufIdx];
                bufIdx++;
            }
            
            m.idx = bufIdx;
        };
        
        that.krSpeedGen = function (numSamps) {
            var m = that.model,
                out = that.output,
                chan = that.inputs.channel.output[0],
                speedInc = that.inputs.speed.output[0],
                source = that.buffer,
                bufIdx = m.idx,
                bufLen = source.length,
                loop = that.inputs.loop.output[0],
                i;
            
            // If the channel has changed, update the buffer we're reading from.
            if (m.channel !== chan) {
                m.channel = chan;
                that.buffer = source = flock.enviro.shared.buffers[m.name][chan];
            }
            
            for (i = 0; i < numSamps; i++) {
                if (bufIdx >= bufLen) {
                    if (loop > 0) {
                        bufIdx = 0;
                    } else {
                        out[i] = 0.0;
                        continue;
                    }
                }
                
                out[i] = source[Math.round(bufIdx)];
                bufIdx += speedInc;
            }
            
            m.idx = bufIdx;
        };
        
        that.onBufferReady = function () {
            that.model.idx = 0;
        };
        
        that.onInputChanged = function (inputName) {
            var m = that.model,
                inputs = that.inputs;
            
            if (m.bufDef !== that.inputs.buffer || inputName === "buffer") {
                flock.buffer.resolveBufferDef(that);
            }
            
            // TODO: Optimize for non-regular speed constant rate input.
            that.gen = (inputs.speed.rate === flock.rates.CONSTANT && inputs.speed.output[0] === 1.0) ?
                that.crRegularSpeedGen : that.krSpeedGen;
            
            flock.onMulAddInputChanged(that);
        };
        
        that.onInputChanged();
        return that;
    };
    
    flock.defaults("flock.ugen.playBuffer", {
        rate: "audio",
        inputs: {
            channel: 0,
            loop: 0.0,
            speed: 1.0
        }
    });
    
    /**
     * Outputs the duration of the specified buffer. Runs at either constant or control rate.
     * Use control rate only when the underlying buffer may change dynamically.
     *
     * Inputs:
     *  buffer: a bufDef object specifying the buffer to track
     */
    flock.ugen.bufferDuration = function (inputs, output, options) {
        var that = flock.ugen(inputs, output, options);
        
        that.krGen = function (numSamps) {
            var i;
            for (i = 0; i < numSamps; i++) {
                out[i] = that.model.value = that.buffer.length / that.model.sampleRate;
            }
        };
        
        that.onInputChanged = function (inputName) {
            if (that.model.bufDef !== that.inputs.buffer || inputName === "buffer") {
                flock.buffer.resolveBufferDef(that);
            }
        };
        
        that.onBufferReady = function (buffer) {
            that.output[0] = that.model.value = buffer.length / that.model.sampleRate;
        };
        
        that.init = function () {
            var r = that.rate;
            that.gen = (r === flock.rates.CONTROL || r === flock.rates.AUDIO) ? that.krGen : undefined;
            that.output[0] = that.model.value = 0.0;
            that.onInputChanged();
        };
        
        that.init();
        return that;
    };

    flock.defaults("flock.ugen.bufferDuration", {
        rate: "constant",
        inputs: {}
    });
    
    
    /**
     * Constant-rate unit generator that outputs the environment's current sample rate.
     */
    flock.ugen.sampleRate = function (inputs, output, options) {
        var that = flock.ugen(inputs, output, options);
        that.output[0] = that.model.sampleRate;
        return that;
    };
    
    flock.defaults("flock.ugen.sampleRate", {
        rate: "constant",
        inputs: {}
    });
    
    
    /*********
     * Noise *
     *********/
    
    flock.ugen.dust = function (inputs, output, options) {
        var that = flock.ugen(inputs, output, options);
        that.model.density = 0.0;
        that.model.scale = 0.0;
        that.model.threshold = 0.0;
        that.model.sampleDur = 1.0 / that.model.sampleRate;
    
        that.gen = function (numSamps) {
            var m = that.model,
                density = inputs.density.output[0], // Density is kr.
                threshold, 
                scale,
                val,
                i;
            
            if (density !== m.density) {
                m.density = density;
                threshold = m.threshold = density * m.sampleDur;
                scale = m.scale = threshold > 0.0 ? 1.0 / threshold : 0.0;
            } else {
                threshold = m.threshold;
                scale = m.scale;
            }
        
            for (i = 0; i < numSamps; i++) {
                val = Math.random();
                output[i] = (val < threshold) ? val * scale : 0.0;
            }
        
            that.mulAdd(numSamps);
        };
        
        that.onInputChanged = function () {
            flock.onMulAddInputChanged(that);
        };
        
        that.onInputChanged();
        return that;
    };
    
    flock.defaults("flock.ugen.dust", {
        rate: "audio",
        inputs: {
            density: 1.0
        }
    });
    
    
    flock.ugen.whiteNoise = function (inputs, output, options) {
        var that = flock.ugen(inputs, output, options);
        
        that.gen = function (numSamps) {
            var out = that.output,
                i;
        
            for (i = 0; i < numSamps; i++) {
                out[i] = Math.random();
            }
            
            that.mulAdd(numSamps);
        };
        
        that.onInputChanged = function () {
            flock.onMulAddInputChanged(that);
        };
        
        that.onInputChanged();
        return that;
    };

    flock.defaults("flock.ugen.whiteNoise", {
        rate: "audio"
    });
    

    flock.ugen.lfNoise = function (inputs, output, options) {
        var that = flock.ugen(inputs, output, options);
        that.model.counter = 0;
        that.model.level = 0;
        that.model.end = Math.random();
    
        that.gen = function (numSamps) {
            var m = that.model,
                freq = inputs.freq.output[0], // Freq is kr.
                remain = numSamps,
                out = that.output,
                currSamp = 0,
                sampsForLevel,
                i;
            
            freq = freq > 0.001 ? freq : 0.001;
            do {
                if (m.counter <= 0) {
                    m.counter = m.sampleRate / freq;
                    m.counter = m.counter > 1 ? m.counter : 1;
                    if (that.options.interpolation === "linear") {
                        m.start = m.value = m.end;
                        m.end = Math.random();
                        m.ramp = m.ramp = (m.end - m.start) / m.counter;
                    } else {
                        m.start = m.value = Math.random();
                        m.ramp = 0;
                    }
                }
                sampsForLevel = remain < m.counter ? remain : m.counter;
                remain -= sampsForLevel;
                m.counter -= sampsForLevel;
                for (i = 0; i < sampsForLevel; i++) {
                    out[currSamp] = m.value;
                    m.value += m.ramp;
                    currSamp++;
                }

            } while (remain);
        
            that.mulAdd(numSamps);
        };
        
        that.onInputChanged = function () {
            flock.onMulAddInputChanged(that);
        };
        
        that.onInputChanged();
        return that;
    };
    
    flock.defaults("flock.ugen.lfNoise", {
        rate: "audio",
        inputs: {
            freq: 440
        }
    });


    /**************************************
     * Envelopes and Amplitude Processors *
     **************************************/
     
    flock.ugen.line = function (inputs, output, options) {
        var that = flock.ugen(inputs, output, options);

        that.gen = function (numSamps) {
            var m = that.model,
                stepSize = m.stepSize,
                numSteps = m.numSteps,
                numLevelVals = numSteps >= numSamps ? numSamps : numSteps,
                numEndVals = numSamps - numLevelVals,
                level = m.level,
                out = that.output,
                i;
        
            for (i = 0; i < numLevelVals; i++) {
                out[i] = level;
                numSteps--;
                level += stepSize;
            }
        
            // TODO: Implement a more efficient gen algorithm when the line has finished.
            if (numEndVals > 0) {
                for (i = 0; i < numEndVals; i++) {
                    out[i] = level;
                }
            }
        
            m.level = level;
            m.numSteps = numSteps;
        
            that.mulAdd(numSamps);
        };
    
        that.onInputChanged = function () {
            var m = that.model;
            
            // Any change in input value will restart the line.
            m.start = that.inputs.start.output[0];
            m.end = that.inputs.end.output[0];
            m.numSteps = Math.round(that.inputs.duration.output[0] * m.sampleRate); // Duration is seconds.
            if (m.numSteps === 0) {
                m.stepSize = 0.0;
                m.level = m.end;
            } else {
                m.stepSize = (m.end - m.start) / m.numSteps;
                m.level = m.start;
            }
            
            flock.onMulAddInputChanged(that);
        };
    
        that.onInputChanged();
        return that;
    };
    
    flock.defaults("flock.ugen.line", {
        rate: "control",
        inputs: {
            start: 0.0,
            end: 1.0,
            duration: 1.0
        }
    });
    

    flock.ugen.xLine = function (inputs, output, options) {
        var that = flock.ugen(inputs, output, options);

        that.gen = function (numSamps) {
            var m = that.model,
                multiplier = m.multiplier,
                numSteps = m.numSteps,
                numLevelVals = numSteps >= numSamps ? numSamps : numSteps,
                numEndVals = numSamps - numLevelVals,
                level = m.level,
                out = that.output,
                i;
        
            for (i = 0; i < numLevelVals; i++) {
                out[i] = level;
                numSteps--;
                level *= multiplier;
            }
        
            // TODO: Implement a more efficient gen algorithm when the line has finished.
            if (numEndVals > 0) {
                for (i = 0; i < numEndVals; i++) {
                    out[i] = level;
                }
            }
        
            m.level = level;
            m.numSteps = numSteps;
        
            that.mulAdd(numSamps);
        };
    
        that.onInputChanged = function () {
            var m = that.model;
            
            flock.onMulAddInputChanged(that);
            
            // Any change in input value will restart the line.
            m.start = that.inputs.start.output[0];
            if (m.start === 0.0) {
                m.start = Number.MIN_VALUE; // Guard against divide by zero by using the smallest possible number.
            }
            
            m.end = that.inputs.end.output[0];
            m.numSteps = Math.round(that.inputs.duration.output[0] * m.sampleRate);
            m.multiplier = Math.pow(m.end / m.start, 1.0 / m.numSteps);
            m.level = m.start;
        };
    
        that.onInputChanged();
        return that;
    };
    
    flock.defaults("flock.ugen.xLine", {
        rate: "control",
        inputs: {
            start: 0.0,
            end: 1.0,
            duration: 1.0
        }
    });

    /**
     * Loops through a linear ramp from start to end, incrementing the output by step.
     * Equivalent to SuperCollider's Phasor unit generator.
     *
     * Inputs:
     *  start: the value to start ramping from
     *  end: the value to ramp to
     *  step: the value to increment per sample
     *  reset: the value to return to when the loop is reset by a trigger signal
     *  trigger: a trigger signal that, when it cross the zero line, will reset the loop back to the reset point
     */
    flock.ugen.loop = function (inputs, output, options) {
        var that = flock.ugen(inputs, output, options);
        
        that.gen = function (numSamps) {
            var m = that.model,
                inputs = that.inputs,
                out = that.output,
                step = inputs.step.output,
                trig = inputs.trigger.output[0],
                i,
                j;
            
            if ((trig > 0.0 && m.prevTrig <= 0.0)) {
                m.value = inputs.reset.output[0];
            }
            m.prevTrig = trig;
            
            // TODO: Add sample priming to the ugen graph to remove this conditional.
            if (m.value === undefined) {
                m.value = inputs.start.output[0];
            }
            
            for (i = 0, j = 0; i < numSamps; i++, j += m.stepInc) {
                if (m.value >= inputs.end.output[0]) {
                    m.value = inputs.start.output[0];
                }
                
                m.value += step[j];
                out[i] = m.value;
            }
            
            that.mulAdd(numSamps);
        };
        
        that.onInputChanged = function () {
            // TODO: Utility function for calculating strides.
            that.model.trigInc = that.inputs.trigger.rate === "audio" ? 1 : 0;
            that.model.stepInc = that.inputs.step.rate === "audio" ? 1 : 0;
            flock.onMulAddInputChanged(that);
        };
        
        that.onInputChanged();
        
        return that;
    };
    
    flock.defaults("flock.ugen.loop", {
        rate: "control",
        inputs: {
            start: 0.0,
            end: 1.0,
            reset: 0.0,
            step: 0.1,
            trigger: 0.0
        }
    });
    
    flock.ugen.env = {};
    
    // TODO: Better names for these inputs; harmonize them with flock.ugen.line
    flock.ugen.env.simpleASR = function (inputs, output, options) {
        var that = flock.ugen(inputs, output, options);
        
        that.gen = function (numSamps) {
            var m = that.model,
                out = that.output,
                prevGate = m.previousGate,
                gate = that.inputs.gate.output[0],
                level = m.level,
                stage = m.stage,
                currentStep = stage.currentStep,
                stepInc = stage.stepInc,
                numSteps = stage.numSteps,
                targetLevel = m.targetLevel,
                stepsNeedRecalc = false,
                stageTime,
                i;
                
            // Recalculate the step state if necessary.
            if (prevGate <= 0 && gate > 0) {
                // Starting a new attack stage.
                targetLevel = that.inputs.sustain.output[0];
                stageTime = that.inputs.attack.output[0];
                stepsNeedRecalc = true;
            } else if (gate <= 0 && currentStep >= numSteps) {
                // Starting a new release stage.
                targetLevel = that.inputs.start.output[0];
                stageTime = that.inputs.release.output[0];
                stepsNeedRecalc = true;
            }
            
            // TODO: Can we get rid of this extra branch without introducing code duplication?
            if (stepsNeedRecalc) {
                numSteps = Math.round(stageTime * m.sampleRate);
                stepInc = (targetLevel - level) / numSteps;
                currentStep = 0;
            }
            
            // Output the the envelope's sample data.
            for (i = 0; i < numSamps; i++) {
                out[i] = level;
                currentStep++;
                // Hold the last value if the stage is complete, otherwise increment.
                level = currentStep < numSteps ? 
                    level + stepInc : currentStep === numSteps ? 
                    targetLevel : level;
            }
            
            // Store instance state.
            m.level = level;
            m.targetLevel = targetLevel;
            m.previousGate = gate;
            stage.currentStep = currentStep;
            stage.stepInc = stepInc;
            stage.numSteps = numSteps;
        };
        
        that.init = function () {
            var m = that.model;
            
            that.onInputChanged();
            
            // Set default model state.
            m.stage = {
                currentStep: 0,
                stepInc: 0,
                numSteps: 0
            };
            m.previousGate = 0.0;
            m.level = that.inputs.start.output[0];
            m.targetLevel = that.inputs.sustain.output[0];
        };

        that.init();
        return that;
    };
    
    flock.defaults("flock.ugen.env.simpleASR", {
        rate: "control",
        inputs: {
            start: 0.0,
            attack: 0.01,
            sustain: 1.0,
            release: 1.0,
            gate: 0.0
        }
    });
    
    flock.ugen.amplitude = function (inputs, output, options) {
        var that = flock.ugen(inputs, output, options);
        that.model.previousValue = 0.0;
        
        that.gen = function (numSamps) {
            var m = that.model,
                source = that.inputs.source.output,
                out = that.output,
                prevAtt = m.attackTime,
                nextAtt = that.inputs.attack.output[0],
                prevRel = m.releaseTime,
                nextRel = that.inputs.release.output[0],
                prevVal = m.previousValue,
                attCoef = m.attackCoef,
                relCoef = m.releaseCoef,
                i,
                val,
                coef;
                
                // Convert 60 dB attack and release times to coefficients if they've changed.
            if (nextAtt !== prevAtt) {
                m.attackTime = nextAtt;
                attCoef = m.attackCoef =
                    nextAtt === 0.0 ? 0.0 : Math.exp(flock.LOG1 / (nextAtt * m.sampleRate));
            }
                
            if (nextRel !== prevRel) {
                m.releaseTime = nextRel;
                relCoef = m.releaseCoef =
                    (nextRel === 0.0) ? 0.0 : Math.exp(flock.LOG1 / (nextRel * m.sampleRate));
            }
            
            for (i = 0; i < numSamps; i++) {
                val = Math.abs(source[i]);
                coef = val < prevVal ? relCoef : attCoef;
                out[i] = prevVal = val + (prevVal - val) * coef;
            }
            
            m.previousValue = prevVal;
            
            that.mulAdd(numSamps);
        };
        
        that.onInputChanged = function () {
            flock.onMulAddInputChanged(that);
        };
        
        that.onInputChanged();
        return that;
    };
    
    flock.defaults("flock.ugen.amplitude", {
        rate: "audio",
        inputs: {
            attack: 0.01,
            release: 0.01
        }
    });
    
    flock.ugen.normalize = function (inputs, output, options) {
        var that = flock.ugen(inputs, output, options);
        
        that.gen = function () {
            var max = that.inputs.max.output[0], // Max is kr.
                source = that.inputs.source.output,
                i;
            
            // Note, this normalizes the source input ugen's output buffer directly in place.
            that.output = flock.normalize(source, max);
        };
        
        that.onInputChanged();
        return that;
    };
    
    flock.defaults("flock.ugen.normalize", {
        rate: "audio",
        inputs: {
            max: 1.0
        }
    });
    
    
    /*******************
     * Bus-Level UGens *
     *******************/
     
    flock.ugen.out = function (inputs, output, options) {
        var that = flock.ugen(inputs, output, options);
    
        that.gen = function (numSamps) {
            var sources = that.inputs.sources,
                buses = flock.enviro.shared.buses, // TODO: Hardcoded reference to shared enviroment.
                bufStart = that.inputs.bus.output[0],
                expand = that.inputs.expand.output[0],
                i,
                j,
                source,
                rate,
                bus,
                inc,
                outIdx,
                k;
            
            if (typeof (sources.length) !== "number") {
                sources = [sources];
            }
            
            for (i = 0; i < expand; i++) {
                for (j = 0; j < sources.length; j++) {
                    source = sources[j];
                    rate = source.rate;
                    bus = buses[bufStart + i + j];
                    inc = rate === flock.rates.AUDIO ? 1 : 0;
                    outIdx = 0;
                    
                    for (k = 0; k < numSamps; k++, outIdx += inc) {
                        // TODO: Support control rate interpolation.
                        bus[k] = bus[k] + source.output[outIdx];
                    }
                }
            }
        };
    
        that.onInputChanged();
        return that;
    };
    
    flock.defaults("flock.ugen.out", {
        rate: "audio",
        inputs: {
            bus: 0,
            expand: 1
        }
    });
    
    // TODO: fix naming.
    flock.ugen["in"] = function (inputs, output, options) {
        var that = flock.ugen(inputs, output, options);
        
        that.singleBusGen = function () {
            // TODO: Hardcoded reference to shared enviroment.
            that.output = flock.enviro.shared.buses[that.inputs.bus.output[0]];
        };
        
        that.multiBusGen = function (numSamps) {
            var busesInput = that.inputs.bus,
                enviroBuses = flock.enviro.shared.buses, // TODO: Hardcoded reference to shared enviroment.
                out = that.output,
                i,
                j,
                busIdx;
            
            for (i = 0; i < numSamps; i++) {
                out[i] = 0; // Clear previous output values before summing a new set.
                for (j = 0; j < busesInput.length; j++) {
                    busIdx = busesInput[j].output[0];
                    out[i] += enviroBuses[busIdx][i];
                }
            }
        };
        
        that.onInputChanged = function () {
            that.gen = flock.isIterable(that.inputs.bus) ? that.multiBusGen : that.singleBusGen;
            flock.onMulAddInputChanged(that);
        };
        
        that.onInputChanged();
        return that;
    };
    
    flock.defaults("flock.ugen.in", {
        rate: "audio",
        inputs: {
            bus: 0
        }
    });
    
    
    flock.ugen.audioIn = function (inputs, output, options) {
        var that = flock.ugen(inputs, output, options);
        
        that.gen = function (numSamps) {
            var out = that.output,
                m = that.model,
                idx = m.idx,
                inputBuffer = m.inputBuffer,
                i;
            
            for (i = 0; i < numSamps; i++) {
                if (idx >= inputBuffer.length) {
                    inputBuffer = m.inputBuffers.shift() || [];
                    idx = 0;
                }
                
                out[i] = idx < inputBuffer.length ? inputBuffer[idx++] : 0.0;
            }
            
            m.idx = idx;
            m.inputBuffer = inputBuffer;
            
            that.mulAdd(numSamps);
        };
        
        that.onAudioData = function (data) {
            that.model.inputBuffers.push(data);
        };
        
        that.setDevice = function (deviceIdx) {
            deviceIdx = deviceIdx !== undefined ? deviceIdx : that.inputs.device.output[0];
            that.mike.setMicrophone(deviceIdx);
        };
        
        that.init = function () {
            var m = that.model,
                mikeOpts = that.options.mike || {};

            // TOOD: Options merging! This is absurd!
            mikeOpts.settings = mikeOpts.settings || {};
            mikeOpts.settings.sampleRate = String(mikeOpts.settings.sampleRate || flock.enviro.shared.audioSettings.rates.audio);
            
            // Setup and listen to Mike.js.
            that.mike = new Mike(mikeOpts);
            
            that.mike.on("ready", function () {
                that.setDevice();
            });
            
            that.mike.on("microphonechange", function () {
                this.start();
            });
            
            that.mike.on("data", that.onAudioData);
            
            // Initialize the model before audio has started flowing from the device.
            m.inputBuffers = [];
            m.inputBuffer = [];
            m.idx = 0;
        };
        
        that.onInputChanged = function (inputName) {
            if (inputName === "device") {
                that.setDevice();
                return;
            }
            flock.onMulAddInputChanged(that);
        };
        
        that.onInputChanged();
        that.init();
        
        return that;
    };
    
    flock.defaults("flock.ugen.audioIn", {
        rate: "audio",
        inputs: {
            device: 0
        }
    });
    
    
    /***********************
     * DOM-dependent UGens *
     ***********************/
     
    flock.ugen.scope = function (inputs, output, options) {
        var that = flock.ugen(inputs, output, options),
            fps = options.fps || 60; // TODO: Real options merging!
        
        that.model.spf = Math.round(that.model.sampleRate / fps);
        that.model.bufIdx = 0;
        
        // Setup the scopeView widget. 
        that.model.scope = that.options.styles || {
            scaleY: 0.75,
            strokeColor: "#777777",
            strokeWidth: 3
        }; // TODO: Options merging!
        
        that.model.scope.values = new Float32Array(that.model.spf);
        that.scopeView = flock.gfx.scopeView(that.options.canvas, that.model.scope);
        
        that.gen = function (numSamps) {
            var m = that.model,
                spf = m.spf,
                bufIdx = m.bufIdx,
                buf = m.scope.values,
                i;
            
            for (i = 0; i < numSamps; i++) {
                buf[bufIdx] = that.inputs.source.output[i];
                if (bufIdx < spf) {
                    bufIdx += 1;
                } else {
                    bufIdx = 0;
                    that.scopeView.refreshView();
                }
            }
            m.bufIdx = bufIdx;
        };
        
        that.onInputChanged = function () {
            // Pass the "source" input directly back as the output from this ugen.
            that.output = that.inputs.source.output;
        };
        
        that.onInputChanged();
        that.scopeView.refreshView();
        return that;
    };
    
    flock.defaults("flock.ugen.scope", {
        rate: "audio"
    });
    
    
    flock.ugen.mouse = {};
    
    /**
     * Tracks the mouse's position along the specified axis within the boundaries the whole screen.
     * This unit generator will generate a signal between 0.0 and 1.0 based on the position of the mouse;
     * use the mul and add inputs to scale this value to an appropriate control signal.
     */
    flock.ugen.mouse.cursor = function (inputs, output, options) {
        var that = flock.ugen(inputs, output, options);
        that.options.axis = that.options && that.options.axis ? that.options.axis : "x"; // By default, track the mouse along the x axis.
        
        /**
         * Generates a control rate signal between 0.0 and 1.0 by tracking the mouse's position along the specified axis.
         *
         * @param numSamps the number of samples to generate
         */
        that.exponentialGen = function (numSamps) {
            var m = that.model,
                scaledMouse = m.mousePosition / m.size,
                movingAvg = m.movingAvg,
                lag = that.inputs.lag.output[0],
                add = that.inputs.add.output[0],
                mul = that.inputs.mul.output[0],
                lagCoef = m.lagCoef,
                out = that.output,
                pow = Math.pow,
                i,
                max;
            
            if (lag !== lagCoef) {
                lagCoef = lag === 0 ? 0.0 : Math.exp(flock.LOG001 / (lag * m.sampleRate));
                m.lagCoef = lagCoef;
            }
            
            for (i = 0; i < numSamps; i++) {
                max = mul + add;
                scaledMouse = pow(max  / add, scaledMouse) * add;
                movingAvg = scaledMouse + lagCoef * (movingAvg - scaledMouse); // 1-pole filter averages mouse values.
                out[i] = movingAvg;
            }
            
            m.movingAvg = movingAvg;
        };
        
        that.linearGen = function (numSamps) {
            var m = that.model,
                scaledMouse = m.mousePosition / m.size,
                movingAvg = m.movingAvg,
                lag = that.inputs.lag.output[0],
                add = that.inputs.add.output[0],
                mul = that.inputs.mul.output[0],
                lagCoef = m.lagCoef,
                out = that.output,
                i;
            
            if (lag !== lagCoef) {
                lagCoef = lag === 0 ? 0.0 : Math.exp(flock.LOG001 / (lag * m.sampleRate));
                m.lagCoef = lagCoef;
            }
            
            for (i = 0; i < numSamps; i++) {
                movingAvg = scaledMouse + lagCoef * (movingAvg - scaledMouse);
                out[i] = movingAvg * mul + add;
            }
            
            m.movingAvg = movingAvg;
        };
        
        that.noInterpolationGen = function (numSamps) {
            var m = that.model,
                scaledMouse = m.mousePosition / m.size,
                add = that.inputs.add.output[0],
                mul = that.inputs.mul.output[0],
                out = that.output,
                i;
                
            for (i = 0; i < numSamps; i++) {
                out[i] = scaledMouse * mul + add;
            }
        };
        
        that.moveListener = function (e) {
            var m = that.model,
                pos = e[m.eventProp],
                off;
            
            if (pos === undefined) {
                off = $(e.target).offset();
                e.offsetX = e.clientX - off.left;
                e.offsetY = e.clientY - off.top;
                pos = e[m.eventProp];
            }
            m.mousePosition = m.isWithinTarget ? pos : 0.0;
        };
        
        that.overListener = function (e) {
            that.model.isWithinTarget = true;
        };
        
        that.outListener = function (e) {
            var m = that.model;
            m.isWithinTarget = false;
            m.mousePosition = 0.0;
        };
        
        that.downListener = function (e) {
            that.model.isMouseDown = true;
        };
        
        that.upListener = function (e) {
            var m = that.model;
            m.isMouseDown = false;
            m.mousePosition = 0;
        };
        
        that.moveWhileDownListener = function (e) {
            if (that.model.isMouseDown) {
                that.moveListener(e);
            }
        };
        
        that.bindEvents = function () {
            var m = that.model,
                target = m.target,
                moveListener = that.moveListener;
                
            if (that.options.onlyOnMouseDown) {
                target.mousedown(that.downListener);
                target.mouseup(that.upListener);
                moveListener = that.moveWhileDownListener;
            }
            
            target.mouseover(that.overListener);
            target.mouseout(that.outListener);
            target.mousemove(moveListener);
        };
        
        that.onInputChanged = function () {
            flock.onMulAddInputChanged(that);
            
            var interp = that.options.interpolation;
            that.gen = interp === "none" ? that.noInterpolationGen : interp === "exponential" ? that.exponentialGen : that.linearGen;
            that.model.exponential = interp === "exponential";
        };
        
        that.init = function () {
            var m = that.model,
                options = that.options,
                axis = options.axis,
                target = $(options.target || window);

            if (axis === "x" || axis === "width" || axis === "horizontal") {
                m.eventProp = "offsetX";
                m.size = target.width();
            } else {
                m.eventProp = "offsetY";
                m.size = target.height();
            }
            
            m.mousePosition = 0;
            m.movingAvg = 0;
            m.target = target;
            
            that.bindEvents();
            that.onInputChanged();
        };
        
        that.init();
        return that;
    };
    
    flock.defaults("flock.ugen.mouse.cursor", {
        rate: "control",
        inputs: {
            lag: 0.5,
            add: 0.0,
            mul: 1.0
        }
    });
    
    
    flock.ugen.mouse.click = function (inputs, output, options) {
        var that = flock.ugen(inputs, output, options);
        
        that.gen = function (numSamps) {
            var out = that.output,
                m = that.model,
                i;
                
            for (i = 0; i < numSamps; i++) {
                out[i] = m.value;
                that.mulAdd(numSamps);
            }
        };
        
        that.mouseDownListener = function (e) {
            that.model.value = 1.0;
        };
        
        that.mouseUpListener = function (e) {
            that.model.value = 0.0;
        };
        
        that.init = function () {
            var m = that.model;
            m.target = typeof (that.options.target) === "string" ? 
                document.querySelector(that.options.target) : that.options.target || window;
            m.value = 0.0;
            m.target.addEventListener("mousedown", that.mouseDownListener, false);
            m.target.addEventListener("mouseup", that.mouseUpListener, false);
            
            that.onInputChanged();
        };
        
        that.onInputChanged = function () {
            flock.onMulAddInputChanged(that);
        };
        
        that.init();
        return that;
    };
    
    flock.defaults("flock.ugen.mouse.click", {
        rate: "control"
    });
    
    
    /***********
     * Filters *
     ***********/
    
    flock.ugen.filter = {};
     
    flock.ugen.filter.butter = function (inputs, output, options) {
        var that = flock.ugen(inputs, output, options);
        
        that.gen = function (numSamps) {
            var m = that.model,
                inputs = that.inputs,
                out = that.output,
                co = m.coeffs,
                freq = inputs.freq.output[0],
                bw = inputs.bandwidth.output[0],
                source = inputs.source.output,
                i,
                w;
            
            if (m.prevBW !== bw || m.prevFreq !== freq) {
                that.calcCoefficients(m, freq, bw);
            }

            for (i = 0; i < numSamps; i++) {
                w = source[i] - co.b1 * m.d0 - co.b2 * m.d1;
                out[i] = co.a0 * w + co.a1 * m.d0 + co.a2 * m.d1;
                m.d1 = m.d0;
                m.d0 = w;
            }
            
            m.prevBW = bw;
            m.prevFreq = freq;
        };
        
        
        that.onInputChanged = function () {
            that.calcCoefficients = that.options.coefficientCalculator ||
                flock.ugen.filter.butter.coefficients[that.options.type];
        };
        
        that.init = function () {
            that.model.d0 = 0.0;
            that.model.d1 = 0.0;
            that.model.coeffs = {};
            that.onInputChanged();
        };
        
        that.init();
        return that;
    };
    
    flock.defaults("flock.ugen.filter.butter", {
        inputs: {
            freq: 440,
            bandwidth: 110
        }
    });
    
    flock.ugen.filter.butter.types = {
        "hp": {
            inputDefaults: {
                freq: 10000,
                bandwidth: 0
            },
            options: {type: "highPass"}
        },
        "lp": {
            inputDefaults: {
                freq: 440,
                bandwidth: 0
            },
            options: {type: "lowPass"}
        },
        "bp": {
            inputDefaults: {
                freq: 440,
                bandwidth: 110
            },
            options: {type: "bandPass"}
        },
        "br": {
            inputDefaults: {
                freq: 10000,
                bandwidth: 5000
            },
            options: {type: "bandReject"}
        }
    };
    
    // Provide cover methods for instantiating the different types of butterworth filters.
    flock.aliasUGens("flock.ugen.filter.butter", flock.ugen.filter.butter.types);
    
    flock.ugen.filter.butter.coefficients = {
        lowPass: function (model, freq) {
            var co = model.coeffs,
                lambdaSquared,
                rootTwoLambda;
            co.lambda = 1 / Math.tan(Math.PI * freq / model.sampleRate);
            lambdaSquared = co.lambda * co.lambda;
            rootTwoLambda = flock.ROOT2 * co.lambda;
            co.a0 = 1 / (1 + rootTwoLambda + lambdaSquared);
            co.a1 = 2 * co.a0;
            co.a2 = co.a0;
            co.b1 = 2 * (1 - lambdaSquared) * co.a0;
            co.b2 = (1 - rootTwoLambda + lambdaSquared) * co.a0;
        },
        
        highPass: function (model, freq) {
            var co = model.coeffs,
                lambdaSquared,
                rootTwoLambda;
            co.lambda = Math.tan(Math.PI * freq / model.sampleRate);
            lambdaSquared = co.lambda * co.lambda;
            rootTwoLambda = flock.ROOT2 * co.lambda;
            co.a0 = 1 / (1 + rootTwoLambda + lambdaSquared);
            co.a1 = -2 * co.a0;
            co.a2 = co.a0;
            co.b1 = 2 * (lambdaSquared - 1) * co.a0;
            co.b2 = (1 - rootTwoLambda + lambdaSquared) * co.a0;
        },
        
        bandPass: function (model, freq, bw) {
            var co = model.coeffs;
            co.lambda = 1 / Math.tan(Math.PI * bw / model.sampleRate);
            co.theta = 2 * Math.cos(flock.TWOPI * freq / model.sampleRate);
            co.a0 = 1 / (1 + co.lambda);
            co.a1 = 0;
            co.a2 = -co.a0;
            co.b1 = -(co.lambda * co.theta * co.a0);
            co.b2 = co.a0 * (co.lambda - 1);
        },
        
        bandReject: function (model, freq, bw) {
            var co = model.coeffs;
            co.lambda = Math.tan(Math.PI * bw / model.sampleRate);
            co.theta = 2 * Math.cos(flock.TWOPI * freq / model.sampleRate);
            co.a0 = 1 / (1 + co.lambda);
            co.a1 = -co.theta * co.a0;
            co.a2 = co.a0;
            co.b1 = co.a1;
            co.b2 = (1 - co.lambda) * co.a0;
        }
    };
    
    
    flock.ugen.delay = function (inputs, output, options) {
        var that = flock.ugen(inputs, output, options);
        that.model.pos = 0;
        
        that.gen = function (numSamps) {
            var m = that.model,
                inputs = that.inputs,
                out = that.output,
                source = inputs.source.output,
                time = inputs.time.output[0],
                delayBuffer = that.delayBuffer,
                i;
            
            if (time !== m.time) {
                m.time = time;
                m.delaySamps = time * that.model.sampleRate;
            }
            
            for (i = 0; i < numSamps; i++) {
                if (m.pos >= m.delaySamps) {
                    m.pos = 0;
                }
                out[i] = delayBuffer[m.pos];
                delayBuffer[m.pos] = source[i];
                m.pos++;
            }
            
            that.mulAdd(numSamps);
        };
        
        that.onInputChanged = function (inputName) {
            flock.onMulAddInputChanged(that);
            
            if (!inputName || inputName === "maxTime") {
                var delayBufferLength = that.model.sampleRate * that.inputs.maxTime.output[0];
                that.delayBuffer = new Float32Array(delayBufferLength);
            }
        };
        
        that.onInputChanged();
        return that;
    };
    
    flock.defaults("flock.ugen.delay", {
        rate: "audio",
        inputs: {
            maxTime: 1.0,
            time: 1.0
        }
    });
    
    
    flock.ugen.decay = function (inputs, output, options) {
        var that = flock.ugen(inputs, output, options);
        $.extend(that.model, {
            time: 0,
            lastSamp: 0,
            coeff: 0
        });
        
        that.gen = function (numSamps) {
            var m = that.model,
                inputs = that.inputs,
                out = that.output,
                source = inputs.source.output,
                time = inputs.time.output[0],
                i;

            if (time !== m.time) {
                m.time = time;
                m.coeff = time === 0.0 ? 0.0 : Math.exp(flock.LOG001 / (time * that.model.sampleRate));
            }
            
            // TODO: Optimize this conditional.
            if (m.coeff === 0.0) {
                for (i = 0; i < numSamps; i++) {
                    out[i] = source[i];
                }
            } else {
                for (i = 0; i < numSamps; i++) {
                    m.lastSamp = source[i] + m.coeff * m.lastSamp;
                    out[i] = m.lastSamp;
                }
            }
            
            that.mulAdd(numSamps);
        };
          
        that.onInputChanged = function () {
            flock.onMulAddInputChanged(that);
        };
           
        that.onInputChanged();
        return that;
    };
    
    flock.defaults("flock.ugen.decay", {
        rate: "audio",
        inputs: {
            time: 1.0
        }
    });

    /****************************
     * Granular Synthesis UGens *
     ****************************/
     
    /**
     * Triggers grains from an audio buffer.
     *
     * Inputs: 
     *   - dur: the duration of each grain
     *   - trigger: a trigger signal that, when it move to a positive number, will start a grain
     *   - buffer: a bufferDef object describing the buffer to granulate
     *   - centerPos: the postion within the sound buffer when the grain will reach maximum amplitude
     *   - amp: the peak amplitude of the grain
     *   - (rate)
     *
     * Options:
     *   - (interpolation)
     */
    flock.ugen.triggerGrains = function (inputs, output, options) {
        var that = flock.ugen(inputs, output, options);
        $.extend(true, that.model, {
            activeGrains: [],
            freeGrains: [],
            env: null,
        });

        that.gen = function (numSamps) {
            var m = that.model,
                inputs = that.inputs,
                out = that.output,
                buf = that.buffer,
                dur = inputs.dur.output[0],
                centerPos = inputs.centerPos.output[0] * m.sampleRate,
                ampScale = inputs.amp.output[0],
                trigger = inputs.trigger.output[0],
                i,
                j,
                grain,
                samp,
                amp;
        
            // Update the grain envelope if the grain duration input has changed.
            // TODO: What happens when this changes while older grains are still sounding?
            if (dur !== m.dur) {
                m.dur = dur > m.maxDur ? m.maxDur : dur;
                m.numGrainSamps = Math.round(m.sampleRate * m.dur);
                m.grainCenter = Math.round(m.numGrainSamps / 2);
                for (i = 0; i < m.numGrainSamps; i++) {
                    m.env[i] = Math.sin(Math.PI * i / m.numGrainSamps);
                }
            }
            
            if (trigger > 0.0 && m.prevTrigger <= 0.0) {
                grain = m.freeGrains.pop();
                grain.sampIdx = 0;
                grain.envIdx = 0;
                // TODO: Support negative indexing of the buffer.
                grain.readPos = centerPos >= m.grainCenter ? Math.round(centerPos - m.grainCenter) : 0;
                m.activeGrains.push(grain);
            }
            m.prevTrigger = trigger;
            
            for (i = 0; i < m.activeGrains.length; i++) {
                grain = m.activeGrains[i];
                for (j = 0; j < Math.min(m.numGrainSamps - grain.sampIdx, numSamps); j++) {
                    samp = buf[grain.readPos];
                    grain.readPos = ++grain.readPos % that.buffer.length;
                    grain.sampIdx++;
                    amp = m.env[grain.envIdx] * ampScale;
                    grain.envIdx++;
                    out[j] += samp * amp;
                }
            }

            // TODO: More efficient grain management strategy.
            m.activeGrains = m.activeGrains.filter(function (grain) {
                if (grain.sampIdx >= m.numGrainSamps) {
                    m.freeGrains.push(grain);
                    return false;
                }
                
                return true;
            });
            
            that.mulAdd(numSamps);
        };
        
        that.onInputChanged = function (inputName) {
            if (that.model.bufDef !== that.inputs.buffer || inputName === "buffer") {
                flock.buffer.resolveBufferDef(that);
            }
            flock.onMulAddInputChanged(that);
        };
        
        that.preallocateGrains = function () {
            var m = that.model,
                i;
            
            m.maxNumGrains = that.options.maxNumGrains || 512;
            for (i = 0; i < m.maxNumGrains; i++) {
                m.freeGrains.push({
                    sampIdx: 0,
                    envIdx: 0,
                    readPos: 0
                });
            }
        };
        
        that.init = function () {
            // Allocates a buffer for the grain envelope and preallocates a pool of grains.
            var m = that.model,
                maxGrainLength;
            
            m.maxDur = that.options.maxDur || 30;
            maxGrainLength = Math.round(m.maxDur * m.sampleRate);
            m.env = new Float32Array(maxGrainLength);
            
            that.preallocateGrains();
            that.onInputChanged();
        };
        
        that.init();
        return that;
    };

    flock.defaults("flock.ugen.triggerGrains", {
        rate: "audio",
        inputs: {
            centerPos: 0,
            channel: 0,
            amp: 1.0,
            dur: 0.1
        }
    });
}(jQuery));
