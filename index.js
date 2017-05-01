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

var make_button = ()=>{
  var self = {}
  self.elem = ce('div')
  buttons.appendChild(self.elem)

  self.text = ''
  self.elem.className = 'button-base box-base'

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
    self.elem2.className = self.mode +' brick-base box-base'

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

  self.set_level = (level)=>{
    self.level = level
    self.init_board()
  }

  self.clear_board = ()=>{
    self.bricks.map(b=>{
      b.set_mode('empty')
      b.set_number(0)
    })
    self.render()
  }

  self.calc_observation_time = ()=>{
    return 0.5 + Math.sqrt(self.level)/2
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
    setTimeout(self.cover_all, Math.floor(1000 * self.calc_observation_time()))
  }

  self.cover_all = ()=>{
    self.bricks.map(b=>{
      if(b.number)b.set_mode('covered');
    })
    self.state = 'waiting'
    self.render()
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
      case 'waiting':
      if(brick.number!=0){
        //brick is valid with number assigned
        brick.set_mode('revealed')

        if(brick.number === self.state_counter){
          // pressing the right brick
          if(self.level === self.state_counter){
            //winning
            self.state = 'won'
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
      fail:'Try Again'
    }[self.state] || 'Restart'

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
