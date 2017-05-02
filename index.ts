var geid = (i)=>document.getElementById(i)
var ce = (i)=>document.createElement(i)
var print = console.log
var range = (i)=>{
  if(i === undefined) throw 'input to range() is undefined'
  var arr=[];
  for(var k=0;k<i;k++)arr.push(k);
  return arr;
}
var choice = (i)=>Math.floor(Math.random() * i)

var make = (()=>{
  var make = function(populator){
    var c = function(){this.__init__(this,arguments)}
    if(typeof populator==='function')populator(c.prototype)
    else c.prototype = populator
    return c
  }
  var make_new = function(new_populator){
    var nc = make(new_populator)
    nc.prototype.__proto__ = this.prototype
    nc.prototype.super = this.prototype
    return nc
  }
  Function.prototype.make = make_new
  return make
})()

var board = geid('board')
var buttons = geid('buttons')

var RandomColorGenerator = make(p=>{
  var c2str = (c)=>`rgb(${c[0]},${c[1]},${c[2]})`
  p.resample = function(){
    while(1){
      var c = [choice(100)+60,choice(80)+60,choice(120)+60]
      var brightness = c[0]*0.3+c[1]*.58+c[2]*0.12
      if(brightness>100&&brightness<150)break; // reject colors that are too dark
    }
    this.c = c
  }
  p.__init__ = function(){this.resample()}
  p.light = function(){return c2str(this.c)}
  p.dark = function(){return c2str(this.c.map(n=>Math.floor(n*0.89)))}
})

var randomcolor = new RandomColorGenerator()

var Box = make(p=>{
  p.__init__ = function(parent){
    this.elem = ce('div')
    if(parent)parent.appendChild(this.elem)
    this.text = ''
    this.classes = ['box-base']
  }
  p.render = function(){
    this.elem.className = this.classes.join(' ')
    this.elem.innerHTML = this.text
  }
  p.onclick = function(f){
    var g = ()=>f(this)
    this.elem.addEventListener('click',g)
  }
})

var Button = Box.make(p=>{
  p.__init__ = function(){
    this.super.__init__(buttons)
    this.classes = this.classes.concat(['button-base','shadow-base'])
  }
})

var Brick = Box.make(p=>{
  p.__init__ = function(){
    this.super.__init__(board) // this.elem created

    this.elem2 = ce('div')
    this.elem3 = ce('div')
    this.elem.className = 'brick-base-outer'
    this.elem3.className = 'brick-base-inner'

    this.elem2.appendChild(this.elem3)
    this.elem.appendChild(this.elem2)

    this.mode = 'empty'
    this.number = 0
  }
  p.set_mode = function(mode){
    this.mode = mode
  }
  p.set_number = function(number){
    this.number = number
  }
  p.render = function(){
    var classes = [this.mode,'brick-base']
    .concat(this.classes)
    .concat(
      [(this.mode=='empty'||this.mode=='displaying'?'':'shadow-base')]
    )

    this.elem2.className = classes.join(' ')
    this.elem2.style.color = (this.mode=='revealed-wrong'?
    randomcolor.light():'')
    if(this.number!==0 && this.mode!=='covered'){
      this.elem3.innerHTML = this.number.toString()
    }else{
      this.elem3.innerHTML = ''
    }
  }
})

var StateMachine = make(p=>{
  p.__init__ = function(){
    this.level = 2
    this.state = 'idle'
    this.state_counter = 1

    const num_of_bricks = 36

    this.bricks =
    range(num_of_bricks).map(i=>{
      var b = new Brick()
      b.index = i
      b.onclick(b=>this.brick_click(b))
      return b
    })

    this.btn_start = new Button()
    this.btn_start.onclick(b=>this.btn_start_click(b))

    this.render()
  }

  p.clear_board = function(){
    this.bricks.map(b=>{
      b.set_mode('empty')
      b.set_number(0)
    })
  }

  p.calc_observation_time = function(){
    return (this.level-1) * 0.7
  }

  p.init_board = function(){
    this.clear_board()
    range(this.level).map(i=>{
      //loop i from 0 to level-1
      while(1){
        var b = this.bricks[choice(this.bricks.length)]
        if(b.number==0){
          // if block have not been assigned anything
          b.set_mode('displaying')
          b.set_number(i+1)
          break
        }
      }
    })

    this.state = 'displaying'
    this.state_counter = 1

    this.timeout_handle = setTimeout(
      ()=>this.cover_all(),
      Math.floor(1000 * this.calc_observation_time())
    )
  }

  p.cover_all = function(){
    if(this.state=='displaying'){
      clearTimeout(this.timeout_handle)

      this.bricks
      .filter(b=>b.number!==0&&b.mode!=='revealed')
      .map(b=>{b.set_mode('covered')})

      this.state = 'waiting'
      this.render()
    }
  }

  p.reveal_all = function(){
    this.bricks
    .filter(b=>b.mode=='covered')
    .map(b=>{b.set_mode('revealed-wrong')})
  }

  p.brick_click = function(brick){
    switch(this.state){
      case 'displaying':{
        if(brick.number==this.state_counter){ // if clicking on the starting number
          this.state_counter++
          brick.set_mode('revealed')
          this.cover_all()
          this.render()
        }
      }
      break;
      case 'waiting':{
        if(brick.number!==0 && brick.mode=='covered'){
          //brick is valid with number assigned && covered
          brick.set_mode('revealed')

          if(brick.number === this.state_counter){
            // pressing the right brick
            if(this.level === this.state_counter){
              //winning
              this.state = 'won'
              if(this.level>=35){
                this.state = 'won_fin'
              }
            }else{
              this.state_counter++;
            }
          }else{
            this.state = 'fail'
            brick.set_mode('revealed-wrong')
            this.reveal_all()
          }
          this.render()
        }else{
          //do nothing
        }
      }
      break;
      default: break;
    }
  }

  p.btn_start_click = function(btn){
    switch(this.state){
      case 'won':
      this.level++;

      case 'fail':
      case 'idle':
      this.init_board()
      break;

      case 'won_fin':{
        this.state = 'idle'
        randomcolor.resample()
        this.level = 2
        this.clear_board()
      }
      break;

      case 'displaying': break;

      default:
      this.init_board();break;
    }
    this.render()
  }

  p.render = function(btn){
    // state application

    this.btn_start.text = {
      idle:'Start',
      won:'Next Level',
      won_fin:'Congratulations! Click to Restart',
      fail:'Try Again'
    }[this.state] || 'Restart'
    this.btn_start.render()

    document.body.style.backgroundColor = randomcolor.light()
    geid('author').style.color = randomcolor.dark()

    this.bricks.map(b=>{b.render()})
  }
})

var sm = new StateMachine()
