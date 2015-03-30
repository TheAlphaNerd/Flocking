/*
 * Flocking UI Components
 *   Copyright 2014, Colin Clark
 *
 * Dual licensed under the MIT and GPL Version 2 licenses.
 */

/*global require*/

var fluid = fluid || require("infusion"),
    flock = fluid.registerNamespace("flock");

(function () {
    "use strict";

    var $ = fluid.registerNamespace("jQuery");

    fluid.defaults("flock.ui.toggleButton", {
        gradeNames: ["fluid.viewRelayComponent", "autoInit"],

        selfRender: false,

        model: {
            isEnabled: false
        },

        invokers: {
            toggle: {
                funcName: "flock.ui.toggleButton.toggleModelState",
                args: ["{that}.model", "{that}.applier"]
            },

            enable: {
                func: "{that}.applier.requestChange", //"{that}.events.onEnabled.fire"
                args: ["isEnabled", true]
            },

            disable: {
                func: "{that}.applier.requestChange", //"{that}.events.onDisabled.fire"
                args: ["isEnabled", false]
            },

            refreshView: {
                funcName: "flock.ui.toggleButton.refreshView",
                args: ["{that}.model.isEnabled", "{that}.events.onEnabled.fire", "{that}.events.onDisabled.fire"]
            }
        },

        events: {
            onEnabled: null,
            onDisabled: null
        },

        listeners: {
            onCreate: [
                {
                    funcName: "flock.ui.toggleButton.render",
                    args: ["{that}"]
                },

                {
                    "this": "{that}.container",
                    method: "click",
                    args: "{that}.toggle"
                },
                {
                    func: "{that}.refreshView"
                }
            ],

            onEnabled: [
                {
                    "this": "{that}.container",
                    method: "addClass",
                    args: ["{that}.options.styles.enabled"]
                },
                {
                    "this": "{that}.container",
                    method: "removeClass",
                    args: ["{that}.options.styles.disabled"]
                },
                {
                    "this": "{that}.container",
                    method: "html",
                    args: "{that}.options.strings.enabled"
                }
            ],

            onDisabled: [
                {
                    "this": "{that}.container",
                    method: "addClass",
                    args: ["{that}.options.styles.disabled"]
                },
                {
                    "this": "{that}.container",
                    method: "removeClass",
                    args: ["{that}.options.styles.enabled"]
                },
                {
                    "this": "{that}.container",
                    method: "html",
                    args: "{that}.options.strings.disabled"
                }
            ]
        },

        modelListeners: {
            "isEnabled": {
                func: "{that}.refreshView"
            }
        },

        strings: {
            enabled: "On",
            disabled: "Off",
        },

        markup: {
            button: "<button>%label</button>"
        },

        styles: {
            enabled: "on",
            disabled: "off"
        }
    });

    flock.ui.toggleButton.render = function (that) {
        if (!that.options.selfRender) {
            return;
        }

        // TODO: This is all very shady.
        var renderedMarkup = fluid.stringTemplate(that.options.markup.button, {
            label: that.options.strings.disabled
        });

        var button = $(renderedMarkup);
        that.container.append(button);
        that.container = button;
    };

    flock.ui.toggleButton.toggleModelState = function (model, applier) {
        applier.requestChange("isEnabled", !model.isEnabled);
    };

    flock.ui.toggleButton.refreshView = function (isEnabled, onEnabled, onDisabled) {
        if (isEnabled) {
            onEnabled();
        } else {
            onDisabled();
        }
    };


    /***************
     * Play Button *
     ***************/

    fluid.defaults("flock.ui.playButton", {
        gradeNames: ["flock.ui.toggleButton", "autoInit"],

        invokers: {
            play: {
                func: "{that}.enable"
            },

            pause: {
                func: "{that}.disable"
            }
        },

        events: {
            onPlay: "{that}.events.onEnabled",
            onPause: "{that}.events.onDisabled"
        },

        strings: {
            enabled: "Pause",
            disabled: "Play"
        },

        styles: {
            enabled: "playing",
            disabled: "paused"
        }
    });

    fluid.defaults("flock.ui.enviroPlayButton", {
        gradeNames: ["flock.ui.playButton", "autoInit"],

        listeners: {
            onEnabled: {
                funcName: "flock.enviro.shared.play",
                priority: "last"
            },
            onDisabled: {
                funcName: "flock.enviro.shared.reset",
                priority: "first"
            }
        }
    });

}());
