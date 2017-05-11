var geid = function (i) { return document.getElementById(i); };
var ce = function (i) { return document.createElement(i); };
var print = console.log;
var range = function (i) {
    if (i === undefined)
        throw 'input to range() is undefined';
    var arr = [];
    for (var k = 0; k < i; k++)
        arr.push(k);
    return arr;
};
var choice = function (i) { return Math.floor(Math.random() * i); };
var make = (function () {
    var make = function (populator) {
        var c = function () { this.__init__.apply(this, arguments); };
        if (typeof populator === 'function')
            populator(c.prototype);
        else
            c.prototype = populator;
        return c;
    };
    var make_new = function (new_populator) {
        var nc = make(new_populator);
        nc.prototype.__proto__ = this.prototype;
        nc.prototype.super = this.prototype;
        return nc;
    };
    Function.prototype.make = make_new;
    return make;
})();
var board = geid('board');
var buttons = geid('buttons');
var RandomColorGenerator = make(function (p) {
    var c2str = function (c) { return ("rgb(" + c[0] + "," + c[1] + "," + c[2] + ")"); };
    p.resample = function () {
        while (1) {
            var c = [choice(100) + 60, choice(80) + 60, choice(120) + 60];
            var brightness = c[0] * 0.3 + c[1] * .58 + c[2] * 0.12;
            if (brightness > 100 && brightness < 150)
                break; // reject colors that are too dark
        }
        this.c = c;
    };
    p.__init__ = function () { this.resample(); };
    p.light = function () { return c2str(this.c); };
    p.dark = function () { return c2str(this.c.map(function (n) { return Math.floor(n * 0.89); })); };
});
var randomcolor = new RandomColorGenerator();
var Box = make(function (p) {
    p.__init__ = function (parent) {
        this.elem = ce('div');
        if (parent)
            parent.appendChild(this.elem);
        this.text = '';
        this.classes = ['box-base'];
    };
    p.render = function () {
        this.elem.className = this.classes.join(' ');
        this.elem.innerHTML = this.text;
    };
    p.onclick = function (f) {
        var _this = this;
        var g = function () { return f(_this); };
        this.elem.addEventListener('click', g);
    };
});
var Button = Box.make(function (p) {
    p.__init__ = function () {
        this.super.__init__(buttons);
        this.classes = this.classes.concat(['button-base', 'shadow-base']);
    };
});
var Brick = Box.make(function (p) {
    p.__init__ = function () {
        this.super.__init__(board); // this.elem created
        this.elem2 = ce('div');
        this.elem3 = ce('div');
        this.elem.className = 'brick-base-outer';
        this.elem3.className = 'brick-base-inner';
        this.elem2.appendChild(this.elem3);
        this.elem.appendChild(this.elem2);
        this.mode = 'empty';
        this.number = 0;
    };
    p.set_mode = function (mode) {
        this.mode = mode;
    };
    p.set_number = function (number) {
        this.number = number;
    };
    p.render = function () {
        var classes = [this.mode, 'brick-base']
            .concat(this.classes)
            .concat([(this.mode == 'empty' || this.mode == 'displaying' ? '' : 'shadow-base')]);
        this.elem2.className = classes.join(' ');
        this.elem2.style.color = (this.mode == 'revealed-wrong' ?
            randomcolor.light() : '');
        if (this.number !== 0 && this.mode !== 'covered') {
            this.elem3.innerHTML = this.number.toString();
        }
        else {
            this.elem3.innerHTML = '';
        }
    };
});
var StateMachine = make(function (p) {
    p.__init__ = function () {
        var _this = this;
        this.level = 2;
        this.state = 'idle';
        this.state_counter = 1;
        var num_of_bricks = 36;
        this.bricks =
            range(num_of_bricks).map(function (i) {
                var b = new Brick();
                b.index = i;
                b.onclick(function (b) { return _this.brick_click(b); });
                return b;
            });
        this.btn_start = new Button();
        this.btn_start.onclick(function (b) { return _this.btn_start_click(b); });
        this.render();
    };
    p.clear_board = function () {
        this.bricks.map(function (b) {
            b.set_mode('empty');
            b.set_number(0);
        });
    };
    p.calc_observation_time = function () {
        return (this.level - 1) * 0.7;
    };
    p.init_board = function () {
        var _this = this;
        this.clear_board();
        range(this.level).map(function (i) {
            //loop i from 0 to level-1
            while (1) {
                var b = _this.bricks[choice(_this.bricks.length)];
                if (b.number == 0) {
                    // if block have not been assigned anything
                    b.set_mode('displaying');
                    b.set_number(i + 1);
                    break;
                }
            }
        });
        this.state = 'displaying';
        this.state_counter = 1;
        this.timeout_handle = setTimeout(function () { return _this.cover_all(); }, Math.floor(1000 * this.calc_observation_time()));
    };
    p.cover_all = function () {
        if (this.state == 'displaying') {
            clearTimeout(this.timeout_handle);
            this.bricks
                .filter(function (b) { return b.number !== 0 && b.mode !== 'revealed'; })
                .map(function (b) { b.set_mode('covered'); });
            this.state = 'waiting';
            this.render();
        }
    };
    p.reveal_all = function () {
        this.bricks
            .filter(function (b) { return b.mode == 'covered'; })
            .map(function (b) { b.set_mode('revealed-wrong'); });
    };
    p.brick_click = function (brick) {
        switch (this.state) {
            case 'displaying':
                {
                    if (brick.number == this.state_counter) {
                        this.state_counter++;
                        brick.set_mode('revealed');
                        this.cover_all();
                        this.render();
                    }
                }
                break;
            case 'waiting':
                {
                    if (brick.number !== 0 && brick.mode == 'covered') {
                        //brick is valid with number assigned && covered
                        brick.set_mode('revealed');
                        if (brick.number === this.state_counter) {
                            // pressing the right brick
                            if (this.level === this.state_counter) {
                                //winning
                                this.state = 'won';
                                if (this.level >= 35) {
                                    this.state = 'won_fin';
                                }
                            }
                            else {
                                this.state_counter++;
                            }
                        }
                        else {
                            this.state = 'fail';
                            brick.set_mode('revealed-wrong');
                            this.reveal_all();
                        }
                        this.render();
                    }
                    else {
                    }
                }
                break;
            default: break;
        }
    };
    p.btn_start_click = function (btn) {
        switch (this.state) {
            case 'won':
                this.level++;
            case 'fail':
            case 'idle':
                this.init_board();
                break;
            case 'won_fin':
                {
                    this.state = 'idle';
                    randomcolor.resample();
                    this.level = 2;
                    this.clear_board();
                }
                break;
            case 'displaying': break;
            default:
                this.init_board();
                break;
        }
        this.render();
    };
    p.render = function (btn) {
        // state application
        this.btn_start.text = {
            idle: 'Start',
            won: 'Next Level',
            won_fin: 'Congratulations! Click to Restart',
            fail: 'Try Again'
        }[this.state] || 'Restart';
        this.btn_start.render();
        document.body.style.backgroundColor = randomcolor.light();
        geid('author').style.color = randomcolor.dark();
        this.bricks.map(function (b) { b.render(); });
    };
});
var sm = new StateMachine();
