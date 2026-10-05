precision highp float;
varying vec2 vUv;
uniform vec4 uWeights;
uniform float uTime;
uniform float uNight;
uniform float uAspect;
uniform vec2 uView;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+1.), f.x), f.y);
}
float fbm(vec2 p) {
  float value=0., strength=.5;
  for(int i=0;i<4;i++) {
    value+=strength*noise(p);
    p=mat2(1.6,-1.2,1.2,1.6)*p+9.7;
    strength*=.5;
  }
  return value;
}
float band(float x,float a,float b,float feather) {
  return smoothstep(a-feather,a+feather,x)*(1.-smoothstep(b-feather,b+feather,x));
}
float rect(vec2 p,vec2 lo,vec2 hi,float feather) {
  return band(p.x,lo.x,hi.x,feather)*band(p.y,lo.y,hi.y,feather);
}

vec3 interior(vec2 p) {
  float n=fbm(p*7.);
  vec3 wall=mix(vec3(.82,.81,.77),vec3(.90,.885,.85),p.y);
  wall+=(n-.5)*.024;
  wall-=vec3(.08,.075,.065)*exp(-abs(p.x-.84)*28.);
  // Recessed timber joinery on the right; detail remains behind the foreground room.
  float recess=smoothstep(.85,.86,p.x);
  vec3 oak=vec3(.50,.47,.40)+(noise(vec2(p.x*220.,p.y*2.))-.5)*.04;
  oak-=.09*pow(1.-abs(sin((p.x-.856)*110.)),14.);
  wall=mix(wall,oak,recess*.7);
  float seam=exp(-abs(p.y-.3)*260.);
  wall-=seam*.06;
  // A deep full-height opening, sheer curtain and thin mullions.
  float opening=rect(p,vec2(-.44,.302),vec2(.18,1.3),.002);
  vec3 view=mix(vec3(.68,.75,.73),vec3(.93,.955,.92),smoothstep(.30,1.,p.y));
  view+=.035*fbm(p*vec2(19.,4.));
  float trees=1.-smoothstep(.38,.55,p.y+fbm(vec2(p.x*18.,p.y*4.))*.07);
  view=mix(view,vec3(.61,.66,.58),trees*.25);
  float curtain=rect(p,vec2(-.12,.30),vec2(.09,1.2),.006);
  view=mix(view,vec3(.91,.91,.85),curtain*(.55+.07*sin(p.x*270.)));
  wall=mix(wall,view,opening);
  wall=mix(wall,vec3(.40,.42,.39),opening*exp(-abs(p.x+.18)*550.)*.6);
  wall-=exp(-abs(p.x-.188)*240.)*.10*step(.30,p.y);
  // Sunlit reveals provide depth without reinstating a bounded wall/floor model.
  float reveal=band(p.x,.19,.215,.002)*step(.3,p.y);
  wall=mix(wall,vec3(.94,.91,.84),reveal*.7);
  float floorMask=1.-smoothstep(.298,.303,p.y);
  vec3 floorColor=mix(vec3(.67,.65,.60),vec3(.80,.78,.71),smoothstep(0.,.30,p.y));
  floorColor+=(fbm(p*vec2(16.,75.))-.5)*.015;
  float lightPatch=rect(vec2(p.x+p.y*.78,p.y),vec2(-.05,.035),vec2(.43,.298),.018);
  float panes=1.-.25*exp(-abs(p.x+p.y*.78-.19)*120.);
  floorColor=mix(floorColor,vec3(.94,.91,.80),lightPatch*panes*.6);
  vec3 day=mix(wall,floorColor,floorMask);
  // Evening has a blue exterior and a low, warm interior wash, not a black filter.
  vec3 evening=day*vec3(.51,.49,.45);
  evening+=vec3(.12,.084,.035)*exp(-length((p-vec2(.73,.48))*vec2(1.4,1.))*3.);
  evening=mix(evening,view*vec3(.35,.44,.54),opening*.65);
  return mix(day,evening,uNight);
}

vec3 sky(vec2 p,float horizon,vec3 zenith,vec3 haze) {
  float altitude=clamp((p.y-horizon)/(1.-horizon),0.,1.);
  vec3 c=mix(haze,zenith,pow(altitude,.65));
  float clouds=fbm(vec2(p.x*3.5+uTime*.006,p.y*9.));
  float thin=smoothstep(.50,.77,clouds)*smoothstep(horizon+.045,horizon+.3,p.y);
  c=mix(c,vec3(.96,.951,.92),thin*.3);
  return c;
}

vec3 aurora(vec2 p) {
  vec3 c=mix(vec3(.08,.14,.18),vec3(.025,.055,.09),smoothstep(.25,1.,p.y));
  float milky=fbm(vec2(p.x*4.-p.y*2.,p.y*6.));
  c+=vec3(.09,.095,.12)*pow(milky,3.);
  // Two translucent curtains, with folded vertical filaments rather than solid waves.
  for(int i=0;i<2;i++) {
    float offset=float(i)*1.7;
    float x=p.x+offset;
    float crest=.64+.12*sin(x*3.8+uTime*.09)+.042*sin(x*12.-uTime*.055);
    float height=p.y-crest;
    float folds=fbm(vec2(x*18.+uTime*.05,height*1.4));
    float filament=.5+.5*noise(vec2(x*370.+folds*24.,offset));
    float foot=exp(-abs(height)*80.);
    float curtain=exp(-max(height,0.)*11.)*smoothstep(-.02,.025,height);
    float strength=(foot*.34+curtain*.40)*(.3+.7*folds)*filament;
    strength*=smoothstep(.05,.20,p.y)*(1.-smoothstep(.90,1.05,p.y));
    vec3 light=mix(vec3(.24,.70,.48),vec3(.33,.32,.57),smoothstep(.025,.23,height));
    c+=light*strength*(i==0?1.:.55);
  }
  vec2 starUv=p*vec2(370.,210.);
  vec2 cell=floor(starUv);
  float rnd=hash(cell);
  vec2 center=vec2(hash(cell+5.),hash(cell+17.))*.6+.2;
  float star=1.-smoothstep(.025,.115,length(fract(starUv)-center));
  c+=vec3(.74,.82,.88)*star*step(.982,rnd)*smoothstep(.30,.5,p.y)*(.35+.65*hash(cell+12.));
  float ridge=.15+.028*fbm(vec2(p.x*6.,2.))+.007*sin(p.x*43.);
  c=mix(c,vec3(.022,.049,.063),1.-smoothstep(ridge,ridge+.006,p.y));
  c*=mix(1.,.83,uNight);
  return c;
}

vec3 meadow(vec2 p) {
  float horizon=.45;
  vec3 c=sky(p,horizon,vec3(.62,.73,.76),vec3(.89,.865,.76));
  float sun=exp(-length((p-vec2(.22,.60))*vec2(1.,1.1))*6.);
  c+=vec3(.12,.08,.018)*sun;
  // Distant ridges and fields use progressively richer tones as they approach.
  for(int i=0;i<5;i++) {
    float k=float(i);
    float hill=horizon-k*.047+(fbm(vec2(p.x*(2.3+k*.6)+k*9.,k*2.))-.4)*(.075+k*.015);
    float mask=1.-smoothstep(hill-.004-k*.001,hill+.006,p.y);
    float depth=clamp((hill-p.y)*2.5,0.,1.);
    vec3 distant=mix(vec3(.63,.68,.62),vec3(.40,.46,.30),k/4.);
    vec2 ground=vec2(p.x/(.3+max(hill-p.y,0.)),1./(.17+max(hill-p.y,0.)));
    float fieldNoise=fbm(ground*vec2(12.,6.));
    float cloudShade=fbm(p*vec2(6.,13.)+vec2(2.,uTime*.006));
    vec3 field=mix(distant*vec3(.88,.95,.83),distant*vec3(1.13,1.09,.93),fieldNoise);
    field*=.91+.18*cloudShade;
    float detail=noise(p*vec2(800.,140.)/(.35+max(hill-p.y,0.)));
    field+=(detail-.5)*(.018+k*.009)*(1.-smoothstep(hill-.15,hill-.01,p.y));
    field-=depth*.035;
    c=mix(c,field,mask);
  }
  // Small, irregular seed heads only at the near edge; no decorative floating particles.
  float near=1.-smoothstep(.0,.20,p.y);
  float grass=noise(vec2(p.x*1200.+sin(uTime*.22+p.x*16.)*1.4,p.y*68.));
  c+=vec3(.14,.12,.058)*(grass-.5)*near;
  vec3 evening=c*vec3(.42,.46,.52)+vec3(.032,.016,0.)*sun;
  return mix(c,evening,uNight);
}

vec3 coast(vec2 p) {
  float horizon=.49;
  vec3 c=sky(p,horizon,vec3(.66,.78,.81),vec3(.90,.91,.86));
  float distanceToHorizon=max(horizon-p.y,.001);
  if(p.y<horizon) {
    float depth=clamp(distanceToHorizon/.49,0.,1.);
    vec3 water=mix(vec3(.54,.68,.70),vec3(.235,.405,.445),pow(depth,.6));
    // Perspective-compressed bands: narrow at the horizon, broad at the near edge.
    float z=1./(distanceToHorizon+.035);
    vec2 q=vec2((p.x-.5)*z*1.7,z);
    float swell=sin(q.y*4.1+uTime*.20+fbm(q*.30)*5.);
    float small=fbm(q*vec2(3.,4.)+vec2(uTime*.025,-uTime*.045));
    float ridge=pow(max(swell*.5+.5,0.),10.);
    water+=(small-.48)*.11;
    water+=vec3(.13,.20,.20)*ridge*(.25+small*.7)*depth;
    float reflection=exp(-pow((p.x-.23)/(distanceToHorizon*.43+.018),2.));
    float glitter=smoothstep(.64,.85,small+ridge*.18);
    water+=vec3(.39,.34,.23)*reflection*glitter*(.4+depth);
    float haze=exp(-distanceToHorizon*45.);
    water=mix(water,vec3(.81,.855,.835),haze*.6);
    c=water;
  }
  float sunGlow=exp(-length((p-vec2(.23,.58))*vec2(1.,1.6))*9.);
  c+=vec3(.09,.066,.015)*sunGlow;
  vec3 evening=c*vec3(.36,.45,.54);
  return mix(c,evening,uNight);
}

void main() {
  // Preserve vertical proportions on mobile; restrained view offset adds depth when orbiting.
  vec2 p=vec2((vUv.x-.5)*max(uAspect/1.65,.78)+.5,vUv.y);
  p+=uView;
  vec3 color=vec3(0.);
  if(uWeights.x>.001) color+=interior(p)*uWeights.x;
  if(uWeights.y>.001) color+=aurora(p)*uWeights.y;
  if(uWeights.z>.001) color+=meadow(p)*uWeights.z;
  if(uWeights.w>.001) color+=coast(p)*uWeights.w;
  float vignette=1.-.09*pow(length((vUv-.5)*vec2(1.25,1.)),1.5);
  color*=vignette;
  color+=(hash(gl_FragCoord.xy)-.5)/255.;
  gl_FragColor=vec4(clamp(color,0.,1.),1.);
}
