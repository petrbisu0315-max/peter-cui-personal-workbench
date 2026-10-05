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
  float dusk=clamp(uNight,0.,1.);
  float floorY=.36;
  // Quiet bedroom walls: a soft paint finish, with no panel joints or ceiling light slots.
  vec3 wall=mix(vec3(.83,.795,.735),vec3(.92,.89,.835),smoothstep(floorY,1.,p.y));
  wall+=(fbm(p*vec2(8.,11.))-.5)*.012;
  float daylight=exp(-length((p-vec2(.83,.69))*vec2(1.7,.8))*3.);
  wall+=vec3(.07,.068,.05)*daylight;
  vec3 evening=wall*vec3(.68,.65,.61);
  evening+=vec3(.12,.075,.032)*exp(-length((p-vec2(.59,.56))*vec2(1.4,.9))*3.);
  vec3 color=mix(wall,evening,dusk);

  // A domestic window on the right, behind gathered linen and a translucent inner curtain.
  float opening=rect(p,vec2(.77,.365),vec2(1.12,.94),.003);
  vec3 skyDay=mix(vec3(.80,.85,.79),vec3(.88,.925,.92),smoothstep(.39,.94,p.y));
  vec3 skyNight=mix(vec3(.30,.38,.42),vec3(.34,.44,.50),smoothstep(.39,.94,p.y));
  float canopy=1.-smoothstep(.40,.64,p.y+.095*fbm(p*vec2(22.,5.)));
  vec3 outside=mix(skyDay,skyNight,dusk);
  outside=mix(outside,mix(vec3(.62,.70,.59),vec3(.25,.33,.31),dusk),canopy*.38);
  // Sheer fabric diffuses the view, rather than presenting a crisp scenic photograph.
  float folds=.5+.5*sin(p.x*180.+.5*sin(p.y*3.));
  vec3 sheer=mix(vec3(.96,.945,.88),vec3(.62,.64,.61),dusk);
  vec3 view=mix(outside,sheer,.32+folds*.12);
  float mullion=band(p.x,.934,.940,.0012)+band(p.y,.641,.647,.0012);
  view=mix(view,mix(vec3(.79,.78,.71),vec3(.46,.48,.46),dusk),clamp(mullion,0.,1.)*.65);
  color=mix(color,view,opening);
  float recess=band(p.x,.754,.769,.002)*band(p.y,.365,.94,.003);
  color=mix(color,mix(vec3(.77,.75,.68),vec3(.47,.47,.43),dusk),recess);
  float sill=rect(p,vec2(.757,.358),vec2(1.13,.369),.002);
  color=mix(color,mix(vec3(.87,.85,.78),vec3(.57,.56,.50),dusk),sill);

  // Uneven folds and a soft hem keep the curtain from looking like architectural slats.
  float edge=.782+.009*sin(p.y*3.7)+.002*sin(p.y*18.);
  float outerCurtain=band(p.x,.718,edge,.003)+band(p.x,1.035,1.18,.005);
  float hem=.365+.004*sin(p.x*110.);
  outerCurtain*=band(p.y,hem,.938,.004);
  float fold=.5+.5*sin(p.x*205.+.8*sin(p.x*37.)+p.y*.65);
  float thread=noise(p*vec2(1300.,780.));
  vec3 fabric=vec3(.83,.795,.72)+fold*.065+(thread-.5)*.008;
  fabric*=mix(vec3(1.),vec3(.69,.68,.65),dusk);
  color=mix(color,fabric,clamp(outerCurtain,0.,1.));
  color-=vec3(.035)*exp(-abs(p.x-.714)*160.)*band(p.y,.37,.925,.01);
  float rail=rect(p,vec2(.71,.942),vec2(1.18,.946),.0012);
  color=mix(color,mix(vec3(.66,.62,.54),vec3(.42,.41,.37),dusk),rail*.65);

  // Soft pale-wood floor, lit from the right. No stone tile grid or mirror-like reflection.
  float near=clamp((floorY-p.y)/floorY,0.,1.);
  vec3 floorColor=mix(vec3(.76,.695,.585),vec3(.68,.615,.515),near);
  float perspective=max(.56-p.y,.16);
  float grain=noise(vec2((p.x-.4)/perspective*145.,p.y*4.));
  floorColor+=(grain-.5)*.006;
  float lightPool=rect(vec2(p.x-p.y*.73,p.y),vec2(.37,.055),vec2(.94,floorY+.05),.058);
  floorColor=mix(floorColor,vec3(.91,.865,.755),lightPool*.42);
  vec3 floorEvening=floorColor*vec3(.69,.66,.62)+vec3(.055,.031,.01)*exp(-length((p-vec2(.64,.24))*vec2(2.,1.))*3.);
  floorColor=mix(floorColor,floorEvening,dusk);
  color=mix(color,floorColor,1.-smoothstep(floorY-.003,floorY+.003,p.y));
  // A modest painted skirting is the only wall/floor edge.
  float trim=band(p.y,floorY+.002,floorY+.009,.002)*(1.-opening);
  color=mix(color,mix(vec3(.83,.80,.74),vec3(.55,.53,.49),dusk),trim*.5);
  return color;
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
