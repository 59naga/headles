
Events.endofscript=function(){
  const version='headles 0.0.4';
  var camera=new Camera(innerWidth>innerHeight? innerHeight: innerWidth);
  var bitmap=new Bitmap(32);
  var tool=new EventEmitter;
  var timer=new Timer(500);
  var log=new Array(JSON.stringify(bitmap));
  var events=new Events(window);
  events.on('touch',function(event){
    timer.start();
    tool.cache={};

    var stroke=events.on('stroke',function(event){
      timer.stop();
      tool.emit('stroke',event);
    });
    var release=events.on('release',function(event){
      timer.stop();
      tool.emit('release',event);

      events.off(stroke);
      events.off(release);
    });
  });
  timer.on('tick',function(){console.log(this.i)});
  tool.on('stroke',function(event){
    if(tool.disabled==null){
      if(timer.i==0){
        tool.emit('pencil',event);
      }
    }
  });
  tool.on('release',function(event){
    if(tool.disabled==null){
      if(timer.i==0){
        console.log('pencil');
        tool.emit('pencil',event);
        tool.once('pencil_then',function(){
          tool.emit('log');
        })
      }
      if(timer.i==1){
        console.log('palette');
        tool.emit('palette',event);
      }
      if(timer.i==2){
        console.log('log_undo');
        tool.emit('log_undo',event);
      }
      if(timer.i>=3){
        console.log('save');
        tool.emit('save',event);
      }
    }
  });

  events.once('load',function(){
    document.body.appendChild(camera.canvas);

    var pencil=new Sound('http://jsrun.it/assets/v/R/Z/5/vRZ5m.wav');
    tool.on('pencil',function(){
      pencil.play();
    });
    tool.on('pencil',function(event){
      var eventX=event.clientX;
      var eventY=event.clientY;
      if(event.changedTouches){
        eventX=event.changedTouches[0].clientX;
        eventY=event.changedTouches[0].clientY;
      }
      eventX+=camera.x;
      eventY+=camera.y;

      var canvas=camera.canvas;
      var scale=canvas.width/bitmap.length;
      var x=Math.floor(eventX/scale);
      var y=Math.floor(eventY/scale);
      var previous=tool.cache.previous;
      if(previous){
        bitmap.line(previous.x,previous.y,x,y);
      }
      else{
        bitmap.paint(x,y);
      }
      tool.cache.previous={x:x,y:y};

      tool.emit('pencil_then');
    });
    tool.on('pencil_then',function(event){
      camera.projection(bitmap);
    })

    var palette=new Sound('http://jsrun.it/assets/w/E/W/p/wEWpv.wav');
    tool.on('palette',function(){
      palette.play();
    });
    tool.on('palette',function(event){
      var canvas=document.createElement('canvas');
          canvas.width=canvas.height=32;
      var ctx=canvas.getContext('2d');
      var image=ctx.createImageData(canvas.width,canvas.height);
      var i=0;
      for(var y=0;y<canvas.height;y++){
        for(var x=0;x<canvas.width;x++){
          var r,g,b;r=g=b=255;

          var size=canvas.width/2;
          var hue=Math.round(360*(y+1)/canvas.height);
          //red
          if(60<=hue){
            if(hue<120){
              r=r-(255*(hue-60)/60);
            }
            else if(hue<240){
              r=0;
            }
            if(240<=hue&&hue<300){
              r=r*(hue-240)/60;
            }
          }
          //green
          if(hue<60){
            g=g*hue/60;
          }
          if(180<=hue){
            if(hue<240){
              g=g-255*(hue-180)/60;
            }
            else{
              g=0;
            }
          }
          //blue
          if(hue<120){
            b=0;
          }
          else{
            if(hue<180){
              b=b*(hue-120)/60;
            }
            if(300<hue){
              b=b-(255*(hue-300)/60);
            }
          }
          if(x<size){
            var saturation=x/size;
            r=r+(255-r)*(1-saturation);
            g=g+(255-g)*(1-saturation);
            b=b+(255-b)*(1-saturation);
          }
          if(size<x){
            var value=(size-(x-size))/size;
            r=r*value;
            g=g*value;
            b=b*value;
          }

          image.data[i]=r;
          image.data[i+1]=g;
          image.data[i+2]=b;
          image.data[i+3]=255;
          i+=4;
        }
      }
      ctx.putImageData(image,0,0);

      var projector=camera.canvas;
      var ctx=projector.getContext("2d");
      ctx.imageSmoothingEnabled=false;
      ctx.mozImageSmoothingEnabled=false;
      ctx.webkitImageSmoothingEnabled=false;
      ctx.drawImage(canvas,0,0,projector.width,projector.height);

      tool.disabled=true;
      events.once('release',function(event){
        var eventX=event.clientX;
        var eventY=event.clientY;
        if(event.changedTouches){
          eventX=event.changedTouches[0].clientX;
          eventY=event.changedTouches[0].clientY;
        }
        eventX+=camera.x;
        eventY+=camera.y;

        var i=(eventX+projector.width*eventY)*4;
        var image=ctx.getImageData(0,0,projector.width,projector.height);
        var rgba=[image.data[i],image.data[i+1],image.data[i+2],image.data[i+3]];
        var colorcode='rgba('+rgba.join(',')+')';
        bitmap.palette.color(colorcode,bitmap.palette.using+1);

        camera.projection(bitmap);
        tool.emit('palette_then');
      });
    });
    tool.on('palette_then',function(){
      tool.emit('log');
      setTimeout(function(){
        tool.disabled=null;
      },100);
    });

    tool.on('log',function(event){
      log.unshift(JSON.stringify(bitmap));
    });
    tool.on('log_undo',function(event){
      if(log.length){
        bitmap=JSON.parse(log.shift());
        bitmap.__proto__=Bitmap.prototype;
        bitmap.palette.__proto__=Palette.prototype;

        camera.projection(bitmap);
      }
    });

    tool.on('save',function(event){
      var image=camera.develop(bitmap);
      history.pushState(null,null,image.toDataURL('image/png'));
    });

    tool.emit('palette');
    console.log(version);
  });
}

function Events(target){
  this.target=target;
  this.alias={
    move:'scroll',
    touch:'mousedown',
    stroke:'mousemove',
    release:'mouseup',
  }
  if(document.createTouch){
    this.alias.move='touchmove';
    this.alias.touch='touchstart';
    this.alias.stroke='touchmove';
    this.alias.release='touchend';
  }
}
  Events.prototype=new EventEmitter;
  Events.prototype.on=function(name,fnc){
    var manager=this.manager(name,fnc);
    this.target.addEventListener(manager.alias,manager.emitter,false);
    this.addListener(manager.name,manager.fnc);
    return manager;
  }
  Events.prototype.off=function(manager){
    this.target.removeEventListener(manager.alias,manager.emitter);
    this.removeListener(manager.name,manager.fnc);
  }
  Events.prototype.once=function(name,fnc){
    var alias=this.alias[name]||name;
    var self=this;
    self.target.addEventListener(alias,function once(event){
      self.target.removeEventListener(alias,once);
      fnc.call(self.target,event);
    },false);
  }
  Events.prototype.manager=function(name,fnc){
    return new EventsManager(this,name,fnc);
  };
  function EventsManager(events,name,fnc){
    this.alias=events.alias[name]||name;
    this.name=name;
    this.fnc=fnc;
    this.emitter=function(event){
      events.emit(name,event);
    }
  }

function Timer(interval){
  this.interval=interval||500;
}
  Timer.prototype=new EventEmitter;
  Timer.prototype.start=function(){
    this.enable=true;
    this.i=-1;
    this.begin=Date.now();
    this.now=Date.now();
    this.progress=0;
    this.emit('start');

    var self=this;
    nextFrame();
    function nextFrame(){
      self.now=Date.now();
      self.progress=self.now-self.begin;
      var i=Math.floor(self.progress/self.interval);
      if(i!=self.i){
        self.i=i;
        self.emit('tick');
        self.emit('tick_'+i);
      }
      self.emit('progress');

      if(self.enable){
        requestAnimationFrame(nextFrame);
      }
    }
  }
  Timer.prototype.stop=function(){
    this.enable=false;
    this.emit('stop');
  }

function Camera(size){
  this.canvas=document.createElement('canvas');
  this.canvas.width=this.canvas.height=size;
  this.canvas.setAttribute('style','position:absolute;left:0;top:0');
  this.x=0;
  this.y=0;
}
  Camera.prototype.develop=function(bitmap){
    var image=document.createElement('canvas');
        image.width=image.height=bitmap.length;
    var ctx=image.getContext('2d');
    for(var x=0;x<bitmap.length;x++){
      for(var y=0;y<bitmap.length;y++){
        var color=bitmap[x][y];
        ctx.fillStyle=bitmap.palette[color];
        ctx.fillRect(x,y,1,1);
      }
    }
    return image;
  }
  Camera.prototype.projection=function(bitmap){
    var canvas=this.canvas;
    var image=this.develop(bitmap);

    var ctx=canvas.getContext('2d');
    ctx.imageSmoothingEnabled=false;
    ctx.mozImageSmoothingEnabled=false;
    ctx.webkitImageSmoothingEnabled=false;

    var size=canvas.width;
    var x=this.x;
    var y=this.y;
    ctx.fillStyle=bitmap.palette[bitmap.palette.using];
    ctx.clearRect(0,0,size,size);
    ctx.drawImage(image,x,y,size,size);

    var sight=size/bitmap.length;
    var x=canvas.width/2;
    var y=canvas.height/2;
    ctx.fillStyle=bitmap.palette[bitmap.palette.using];
    ctx.fillRect(x-sight/2,y,sight,1);
    ctx.fillRect(x,y-sight/2,1,sight);

    return ctx;
  }

function Bitmap(length){
  this.length=length;
  this.palette=new Palette(16);
  var color=this.palette[0];
  for(var x=0;x<length;x++){
    this[x]=[];
    for(var y=0;y<length;y++){
      this[x][y]=0;
    }
  }
}
  Bitmap.prototype=new Array;
  Bitmap.prototype.paint=function(x,y){
    if(this[x]&&this[x][y]!=null){
      this[x][y]=this.palette.using;
    }
  }
  Bitmap.prototype.line=function(beginX,beginY,endX,endY){
    var x=beginX;
    var y=beginY;
    do{
      this.paint(x,y);
      x+= x==endX? 0: x<endX? 1: -1;
      y+= y==endY? 0: y<endY? 1: -1;
    }
    while(x!=endX||y!=endY);
  }
//colorcode collection
function Palette(number){
  this.length=number;
  this.using=0;
  for(var i=0;i<number;i++){
    this[i]="black";
  }
}
  Palette.prototype=new Array;
  Palette.prototype.color=function(value,use){
    var use=use|| this.using;
    this[use]=value|| this[use];
    this.using=use;
    return this[use];
  }
  Palette.prototype.getReversal=function(use){
    var reversal=[255,255,255];
    var use=use|| this.using;
    var color=this[use];
    var canvas=document.createElement('canvas');
    var context=canvas.getContext('2d');
    context.fillStyle=color;
    context.fillRect(0,0,1,1);
    var pixel=context.getImageData(0,0,1,1).data;
    reversal.map(function(value){
      return value-Array.prototype.shift.call(pixel);
    })
    reversal='rgb('+reversal.join(',')+')';
    return reversal;
  }

//pcm作り過ぎ注意
function Sound(url){
  if(location.href.indexOf('file')===0){return;}
  this.pcm=new ("undefined"==typeof AudioContext?webkitAudioContext:AudioContext);

  var xhr=new XMLHttpRequest();
  xhr.open('GET',url,true);
  xhr.responseType='arraybuffer';
  var self=this;
  xhr.onload=function(){
    self.pcm.decodeAudioData(xhr.response,function(buffer){
      self.source=buffer;

      self.loaded=true;
      self.onload&&self.onload();
    });
  }
  xhr.send();
}
  Sound.prototype.play=function(){
    if(this.source&&this.cooltime==null){
      var source=this.pcm.createBufferSource();
      source.buffer=this.source;
      source.connect(this.pcm.destination);
      source.noteOn(0);

      var self=this;
      this.cooltime=true;
      setTimeout(function(){self.cooltime=null;},100);
    }
  }

Events.endofscript();