var geid = (i)=>document.getElementById(i)
var ce = (i)=>document.createElement(i)
var print = console.log
var range = (i)=>{
  if(i === undefined) throw 'input to range() is undefined'
  var arr=[];
  for(var k=0;k<i;k++)
  arr.push(k);
  return arr;
}
var choice = (i)=>Math.floor(Math.random() * i)

var board = geid('board')
var buttons = geid('buttons')

var make_randomcolor = ()=>{
  var self = {}

  self.resample = ()=>{
    while(1){
      var c = [choice(100)+60,choice(80)+60,choice(120)+60]
      var brightness = c[0]*0.3+c[1]*.58+c[2]*0.12
      if(brightness>100&&brightness<150)break; // reject colors that are too dark
    }
    self.c = c
  }

  var to_string = (c)=>`rgb(${c[0]},${c[1]},${c[2]})`
  self.light = ()=>to_string(self.c)
  self.dark = ()=>to_string(self.c.map(n=>Math.floor(n*0.89)))

  self.resample()
  return self
}

var randomcolor = make_randomcolor()

var make_button = ()=>{
  var self = {}
  self.elem = ce('div')
  buttons.appendChild(self.elem)

  self.text = ''
  self.elem.className = 'button-base box-base shadow-base'

  self.onclick = (f)=>{
    var g = ()=>f(self)
    self.elem.addEventListener('click',g)
  }

  self.render = ()=>{
    self.elem.innerHTML = self.text
  }

  self.render()
  return self
}

var make_brick = ()=>{
  var self = {}

  // create the brick and add to board
  self.elem = ce('div')
  self.elem2 = ce('div')
  self.elem3 = ce('div')
  self.elem.className = 'brick-base-outer'
  self.elem3.className = 'brick-base-inner'

  self.elem2.appendChild(self.elem3)
  self.elem.appendChild(self.elem2)
  board.appendChild(self.elem)

  self.set_mode = (mode)=>{
    // mode could be one of
    // empty, displaying, covered, revealed
    self.mode = mode
  }

  self.set_number = (number)=>{
    self.number = number
  }

  self.render = ()=>{
    // use mode string as class string.
    self.elem2.className = self.mode +' brick-base box-base ' +
    (self.mode=='empty'||self.mode=='displaying'?'':'shadow-base')

    self.elem2.style.color = (self.mode=='revealed-wrong'?randomcolor.light():'')

    if(self.number!==0 && self.mode!=='covered'){
      self.elem3.innerHTML = self.number.toString()
    }else{
      self.elem3.innerHTML = ' '
    }
  }

  self.onclick = (f)=>{
    var g = ()=>f(self)
    self.elem.addEventListener('click',g)
  }

  self.set_mode('empty')
  self.set_number(0)
  return self
}

var make_state_machine = (num_of_bricks)=>{
  var self = {}

  self.level = 2
  self.state = 'idle'
  self.state_counter = 1

  self.bricks = []

  for(i of range(num_of_bricks)){
    var b = make_brick()
    b.index = i
    b.onclick((brick)=>{
      self.brick_click(brick)
    })
    self.bricks.push(b)
  }

  self.btn_start = make_button()
  self.btn_start.onclick((btn)=>{
    self.btn_start_click(btn)
  })

  ///////////////////////

  self.clear_board = ()=>{
    self.bricks.map(b=>{
      b.set_mode('empty')
      b.set_number(0)
    })
    self.render()
  }

  self.calc_observation_time = ()=>{
    return (self.level+1) * 0.7
  }

  self.init_board = ()=>{
    self.clear_board()
    for(i of range(self.level)){
      var k = 1 + i
      //loop k from 1 to level
      while(1){
        var index = choice(self.bricks.length)
        var b = self.bricks[index]
        if(b.number==0){
          // if block have not been assigned b4
          b.set_mode('displaying')
          b.set_number(k)
          break
        }
      }
    }

    self.state = 'displaying'
    self.state_counter = 1

    self.render()
    self.timeout_handle = setTimeout(self.cover_all, Math.floor(1000 * self.calc_observation_time()))
  }

  self.cover_all = ()=>{
    if(self.state=='displaying'){
      clearTimeout(self.timeout_handle)
      
      self.bricks.map(b=>{
        if(b.number!==0&&b.mode!=='revealed')b.set_mode('covered');
      })
      self.state = 'waiting'
      self.render()
    }
  }

  self.reveal_all = ()=>{
    self.bricks.map(b=>{
      if(b.mode=='covered'){
        b.set_mode('revealed-wrong')
      }
    })
  }

  self.brick_click = (brick)=>{
    switch(self.state){
      case 'displaying':
      if(brick.number==self.state_counter){ // if clicking on the starting number
        self.state_counter++
        brick.set_mode('revealed')
        self.cover_all()
      }
      break;
      case 'waiting':
      if(brick.number!==0 && brick.mode=='covered'){
        //brick is valid with number assigned && covered
        brick.set_mode('revealed')

        if(brick.number === self.state_counter){
          // pressing the right brick
          if(self.level === self.state_counter){
            //winning
            self.state = 'won'
            if(self.level>=35){
              self.state = 'won_fin'
            }
          }else{
            self.state_counter++;
          }
        }else{
          self.state = 'fail'
          brick.set_mode('revealed-wrong')
          self.reveal_all()
        }
        self.render()
      }else{
        //do nothing
      }
      break;
      default: break;
    }
  }

  self.btn_start_click = (btn)=>{
    switch(self.state){
      case 'won':
      self.level++;
      case 'fail':
      case 'idle':
      self.init_board()
      break;

      case 'won_fin':
      self.state = 'idle'
      randomcolor.resample()
      self.level = 2
      self.clear_board()
      break;

      case 'displaying':
      break;

      default:
      self.init_board()
      break;
    }
  }

  self.render = ()=>{
    // state application

    self.btn_start.text = {
      idle:'Start',
      won:'Next Level',
      won_fin:'Congratulations! Click to Restart',
      fail:'Try Again'
    }[self.state] || 'Restart'

    document.body.style.backgroundColor = randomcolor.light()
    geid('author').style.color = randomcolor.dark()

    self.bricks.map(b=>{
      b.render()
    })

    self.btn_start.render()
  }

  self.render()
  return self
}

var make_app = ()=>{
  var self = {}

  const num_of_bricks = 36

  self.init = ()=>{
    // create the state machine
    self.state_machine = make_state_machine(num_of_bricks)
  }

  self.init()
  return self
}

var app = make_app()
