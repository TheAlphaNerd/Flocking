// Periodically trigger a function that causes the scope area to shake.
var synth = flock.synth({
    synthDef: {
        ugen: "flock.ugen.triggerCallback",
        trigger: {
            ugen: "flock.ugen.impulse",
            freq: 0.75,
            phase: 0.5
        },
        options: {
            callback: {
                func: function () {
                    $("#gfx").css("border", "2px solid #666").toggleClass("shake");
                }
            }
        }
    }
});
